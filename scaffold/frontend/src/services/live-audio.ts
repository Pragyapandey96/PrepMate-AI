const GEMINI_INPUT_RATE = 16_000;
const GEMINI_OUTPUT_RATE = 24_000;

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
  private muted = false;
  private microphoneStopped = false;
  private closed = false;

  private constructor(
    stream: MediaStream,
    context: AudioContext,
    processor: ScriptProcessorNode,
    source: MediaStreamAudioSourceNode,
    private readonly socket: WebSocket,
    private readonly onPlaybackStart: () => void,
    private readonly onPlaybackEnd: () => void,
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
      const pcm = this.resampler.process(this.muted ? new Float32Array(input.length) : input);
      if (!pcm.length) return;
      socket.send(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength));
    };
    source.connect(processor);
    processor.connect(context.destination);
  }

  static async open(
    socket: WebSocket,
    onPlaybackStart: () => void,
    onPlaybackEnd: () => void,
  ): Promise<LiveAudioSession> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    try {
      const context = new AudioContext();
      await context.resume();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(2048, 1, 1);
      return new LiveAudioSession(stream, context, processor, source, socket, onPlaybackStart, onPlaybackEnd);
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      throw error;
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  get isPlaying() {
    return this.scheduled.size > 0;
  }

  play(base64: string, mimeType: string) {
    const binary = atob(base64);
    if (!binary.length || binary.length % 2 !== 0) throw new Error('Malformed PCM audio');
    const view = new DataView(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i += 1) view.setUint8(i, binary.charCodeAt(i));
    const rate = Number(mimeType.match(/rate=(\d+)/)?.[1] || GEMINI_OUTPUT_RATE);
    const samples = binary.length / 2;
    const buffer = this.context.createBuffer(1, samples, rate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples; i += 1) channel[i] = view.getInt16(i * 2, true) / 0x8000;

    if (!this.scheduled.size) this.onPlaybackStart();
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    const startsAt = Math.max(this.nextPlaybackTime, this.context.currentTime);
    this.nextPlaybackTime = startsAt + buffer.duration;
    this.scheduled.add(source);
    source.onended = () => {
      this.scheduled.delete(source);
      if (!this.scheduled.size) {
        this.nextPlaybackTime = this.context.currentTime;
        this.onPlaybackEnd();
      }
    };
    source.start(startsAt);
  }

  stopPlayback() {
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
