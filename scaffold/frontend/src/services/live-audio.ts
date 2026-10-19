const GEMINI_INPUT_RATE = 16_000;
const GEMINI_OUTPUT_RATE = 24_000;
const SPEECH_RMS_THRESHOLD = 0.006;
const SPEECH_END_SILENCE_MS = 1_400;

class Pcm16Resampler {
  private position = 0;
  private carry = new Float32Array(0);

  constructor(private readonly inputRate: number) {}

  process(input: Float32Array): Int16Array {
    if (!input.length || !this.inputRate) return new Int16Array(0);
    const samples = new Float32Array(this.carry.length + input.length);
    samples.set(this.carry);
    samples.set(input, this.carry.length);

    const step = this.inputRate / GEMINI_INPUT_RATE;
    const output: number[] = [];
    while (this.position + 1 < samples.length) {
      const left = Math.floor(this.position);
      const fraction = this.position - left;
      const sample = samples[left] + (samples[left + 1] - samples[left]) * fraction;
      const clamped = Math.max(-1, Math.min(1, sample));
      output.push(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff);
      this.position += step;
    }

    const consumed = Math.min(Math.floor(this.position), samples.length - 1);
    this.carry = samples.slice(consumed);
    this.position -= consumed;
    return Int16Array.from(output);
  }
}

export class LiveAudioSession {
  private readonly stream: MediaStream;
  private readonly context: AudioContext;
  private readonly processor: ScriptProcessorNode;
  private readonly source: MediaStreamAudioSourceNode;
  private readonly resampler: Pcm16Resampler;
  private readonly scheduled = new Set<AudioBufferSourceNode>();
  private nextPlaybackTime = 0;
  private playbackEndTimer: number | undefined;
  private muted = false;
  private microphoneStopped = false;
  private closed = false;
  private playedChunks = 0;
  private lastPlaybackLogAt = 0;
  private capturedChunks = 0;
  private lastCaptureLogAt = 0;
  private speechStartedAt = 0;
  private lastSpeechAt = 0;
  private awaitingResponse = false;
  private hasCandidateSpeech = false;
  private activityOpen = false;

  private constructor(
    stream: MediaStream,
    context: AudioContext,
    processor: ScriptProcessorNode,
    source: MediaStreamAudioSourceNode,
    private readonly socket: WebSocket,
    private readonly onPlaybackStart: () => void,
    private readonly onPlaybackEnd: () => void,
    private readonly onCandidateTurnComplete: () => void,
  ) {
    this.stream = stream;
    this.context = context;
    this.processor = processor;
    this.source = source;
    this.resampler = new Pcm16Resampler(context.sampleRate);
    processor.onaudioprocess = (event) => {
      event.outputBuffer.getChannelData(0).fill(0);
      if (socket.readyState !== WebSocket.OPEN) return;
      // Keep sending silence while muted so Gemini's voice-activity detector can
      // still recognize the end of an utterance.
      const input = event.inputBuffer.getChannelData(0);
      if (this.awaitingResponse) return;
      let energy = 0;
      for (let i = 0; i < input.length; i += 1) energy += input[i] * input[i];
      const rms = Math.sqrt(energy / input.length);
      const now = Date.now();
      if (!this.muted && rms >= SPEECH_RMS_THRESHOLD) {
        this.speechStartedAt ||= now;
        this.lastSpeechAt = now;
        this.hasCandidateSpeech = true;
      } else if (this.hasCandidateSpeech && now - this.lastSpeechAt >= SPEECH_END_SILENCE_MS) {
        this.finishCandidateTurn('silence detected');
        return;
      }
      const pcm = this.resampler.process(this.muted ? new Float32Array(input.length) : input);
      if (!pcm.length) return;
      // Keep streaming the full response window so quiet syllables and the
      // beginning of an answer are not clipped by a local level threshold.
      this.sendPcm(pcm);
    };
    source.connect(processor);
    processor.connect(context.destination);
  }

  private sendPcm(pcm: Int16Array) {
    if (!pcm.length || this.socket.readyState !== WebSocket.OPEN) return;
      try {
        this.socket.send(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength));
        this.capturedChunks += 1;
        const now = Date.now();
        if (this.capturedChunks === 1 || now - this.lastCaptureLogAt >= 5_000) {
          console.info('[voice] microphone audio sent to backend', {
            chunks: this.capturedChunks,
            bytes: pcm.byteLength,
            sampleRate: GEMINI_INPUT_RATE,
            muted: this.muted,
          });
          this.lastCaptureLogAt = now;
        }
      } catch (error) {
        console.error('[voice] failed to send microphone audio to backend', error);
      }
  }

  static async open(
    socket: WebSocket,
    onPlaybackStart: () => void,
    onPlaybackEnd: () => void,
    onCandidateTurnComplete: () => void,
  ): Promise<LiveAudioSession> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    let context: AudioContext | undefined;
    try {
      context = new AudioContext();
      await context.resume();
      const source = context.createMediaStreamSource(stream);
      // 1024 frames produce ~21–23 ms chunks at common 44.1/48 kHz device rates.
      const processor = context.createScriptProcessor(1024, 1, 1);
      return new LiveAudioSession(stream, context, processor, source, socket, onPlaybackStart, onPlaybackEnd, onCandidateTurnComplete);
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      if (context && context.state !== 'closed') await context.close().catch(() => undefined);
      throw error;
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  get isPlaying() {
    return this.scheduled.size > 0;
  }

  resumeMicrophoneAfterResponse() {
    this.awaitingResponse = false;
    this.speechStartedAt = 0;
    this.lastSpeechAt = 0;
    this.hasCandidateSpeech = false;
    if (!this.activityOpen && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'audio-start' }));
      this.activityOpen = true;
    }
    console.info('[voice] microphone resumed after AI playback; Gemini activity open');
  }

  finishCandidateTurn(reason = 'candidate requested') {
    if (this.awaitingResponse || !this.activityOpen || this.socket.readyState !== WebSocket.OPEN) return false;
    this.awaitingResponse = true;
    this.activityOpen = false;
    this.speechStartedAt = 0;
    this.lastSpeechAt = 0;
    this.hasCandidateSpeech = false;
    console.info('[voice] candidate turn complete; signaling audio end', { reason });
        this.socket.send(JSON.stringify({ type: 'audio-end' }));
    this.onCandidateTurnComplete();
    return true;
  }

  play(base64: string, mimeType: string) {
    if (this.context.state === 'suspended') {
      console.warn('[voice] audio context was suspended before playback; resuming it');
      void this.context.resume().catch((error) => console.error('[voice] could not resume audio context', error));
    }
    const binary = atob(base64);
    if (!binary.length || binary.length % 2 !== 0) throw new Error('Malformed PCM audio');
    const view = new DataView(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i += 1) view.setUint8(i, binary.charCodeAt(i));
    const rate = Number(mimeType.match(/rate=(\d+)/)?.[1] || GEMINI_OUTPUT_RATE);
    if (!Number.isFinite(rate) || rate < 8_000 || rate > 192_000) throw new Error('Invalid PCM sample rate');
    const samples = binary.length / 2;
    const buffer = this.context.createBuffer(1, samples, rate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples; i += 1) channel[i] = view.getInt16(i * 2, true) / 0x8000;

    if (this.playbackEndTimer !== undefined) {
      window.clearTimeout(this.playbackEndTimer);
      this.playbackEndTimer = undefined;
    }
    if (!this.scheduled.size) this.onPlaybackStart();
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    const startsAt = Math.max(this.nextPlaybackTime, this.context.currentTime);
    this.nextPlaybackTime = startsAt + buffer.duration;
    this.scheduled.add(source);
    this.playedChunks += 1;
    const now = Date.now();
    if (this.playedChunks === 1 || now - this.lastPlaybackLogAt >= 5_000) {
      console.info('[voice] Gemini PCM queued for playback', {
        chunks: this.playedChunks,
        sampleRate: rate,
        queuedSources: this.scheduled.size,
      });
      this.lastPlaybackLogAt = now;
    }
    source.onended = () => {
      this.scheduled.delete(source);
      if (!this.scheduled.size) {
        // Gemini audio arrives as separate messages. Wait briefly for the next
        // chunk before declaring playback complete and reopening the mic.
        this.playbackEndTimer = window.setTimeout(() => {
          this.playbackEndTimer = undefined;
          if (this.scheduled.size) return;
          this.nextPlaybackTime = this.context.currentTime;
          this.onPlaybackEnd();
        }, 300);
      }
    };
    source.start(startsAt);
  }

  stopPlayback() {
    if (this.playbackEndTimer !== undefined) {
      window.clearTimeout(this.playbackEndTimer);
      this.playbackEndTimer = undefined;
    }
    for (const source of this.scheduled) {
      try { source.stop(); } catch { /* it may already have ended */ }
      source.disconnect();
    }
    this.scheduled.clear();
    this.nextPlaybackTime = this.context.currentTime;
    this.onPlaybackEnd();
  }

  stopMicrophone() {
    if (this.microphoneStopped) return;
    this.microphoneStopped = true;
    this.processor.onaudioprocess = null;
    this.source.disconnect();
    this.processor.disconnect();
    this.stream.getTracks().forEach((track) => track.stop());
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.stopMicrophone();
    this.stopPlayback();
    if (this.context.state !== 'closed') await this.context.close();
  }
}
