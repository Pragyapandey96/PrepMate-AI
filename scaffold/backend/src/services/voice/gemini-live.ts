import { GoogleGenAI, Modality } from '@google/genai';
import type { LiveServerMessage, Session } from '@google/genai';
import type { RawData, WebSocket } from 'ws';
import type { VoiceProvider, VoiceContext } from './provider.js';

const SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;
const MAX_AUDIO_FRAME_BYTES = 128 * 1024;
const AUDIO_DIAGNOSTIC_INTERVAL_MS = 5_000;

function safeSend(ws: WebSocket, message: Record<string, unknown>) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

function rawBytes(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  return Buffer.from(data);
}

function mergeTranscript(current: string, incoming: string): string {
  const text = incoming.trim();
  if (!text) return current;
  if (!current) return text;
  if (text.startsWith(current)) return text;
  if (current.endsWith(text)) return current;
  return `${current} ${text}`;
}

function liveErrorMessage(error: unknown): string {
  const event = error as { error?: unknown; status?: number; code?: number | string; message?: string } | null;
  const nested = event?.error as { status?: number; code?: number | string; message?: string } | undefined;
  const err = nested || event;
  const status = Number(err?.status || err?.code);
  const message = [err?.message, event?.message].filter(Boolean).join(' ');
  if (status === 429 || /resource.?exhausted|rate.?limit/i.test(message)) {
    return 'Gemini is temporarily rate limited. Please wait a moment and try again.';
  }
  if (status === 401 || status === 403 || /unauthenticated|permission.?denied|api.?key/i.test(message)) {
    return 'Gemini Live rejected the API credentials. Check GEMINI_API_KEY and confirm Live API access is enabled.';
  }
  if (status === 404 || /model.*not found|not supported for.*live/i.test(message)) {
    return 'The configured Gemini Live model is unavailable to this API key. Check GEMINI_LIVE_MODEL.';
  }
  if (status === 400 || /invalid.?argument|unsupported model/i.test(message)) {
    return 'The configured Gemini Live model rejected this session. Check GEMINI_LIVE_MODEL.';
  }
  if (/timeout/i.test(message)) {
    return 'Gemini Live did not finish connecting in time. Check backend network access and try again.';
  }
  return 'Gemini Live could not connect. Check backend network access, GEMINI_API_KEY permissions, and GEMINI_LIVE_MODEL.';
}

function diagnosticError(error: unknown) {
  const value = error as { name?: string; message?: string; status?: number; code?: string | number } | null;
  return {
    name: value?.name || 'Error',
    status: value?.status,
    code: value?.code,
    message: (value?.message || 'unknown error').replace(/([?&]key=)[^&\s]+/gi, '$1[redacted]'),
  };
}

export class GeminiLiveProvider implements VoiceProvider {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini Live is not configured');
    this.ai = new GoogleGenAI({ apiKey });
  }

  async attach(clientWs: WebSocket, ctx: VoiceContext): Promise<void> {
    const model = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
    let session: Session | undefined;
    let started = false;
    let ending = false;
    let endedByQuestionLimit = false;
    let answerCount = ctx.transcript.filter(turn => turn.speaker === 'user').length;
    let outputTranscript = '';
    let outputTranscriptFinal = false;
    let transcriptTimer: ReturnType<typeof setTimeout> | undefined;
    let connectionTimer: ReturnType<typeof setTimeout> | undefined;
    let failureReported = false;
    let rejectConnecting: ((error: unknown) => void) | undefined;
    let writeQueue = Promise.resolve();
    let inboundQueue = Promise.resolve();
    let finalization: Promise<void> | undefined;
    let inboundAudioFrames = 0;
    let inboundAudioBytes = 0;
    let lastInboundAudioLogAt = 0;
    let outboundAudioChunks = 0;
    let outboundAudioBytes = 0;
    let lastOutboundAudioLogAt = 0;
    let lastInputTranscriptionLogAt = 0;

    const logAudioProgress = (direction: 'input-forwarded' | 'output-received', bytes: number) => {
      const now = Date.now();
      if (direction === 'input-forwarded') {
        inboundAudioFrames += 1;
        inboundAudioBytes += bytes;
        if (inboundAudioFrames === 1 || now - lastInboundAudioLogAt >= AUDIO_DIAGNOSTIC_INTERVAL_MS) {
          console.info('[voice] microphone PCM forwarded to Gemini Live', {
            sessionId: ctx.sessionId,
            frames: inboundAudioFrames,
            bytes: inboundAudioBytes,
            sampleRate: SAMPLE_RATE,
            format: 'signed PCM16 little-endian mono',
          });
          lastInboundAudioLogAt = now;
        }
      } else {
        outboundAudioChunks += 1;
        outboundAudioBytes += bytes;
        if (outboundAudioChunks === 1 || now - lastOutboundAudioLogAt >= AUDIO_DIAGNOSTIC_INTERVAL_MS) {
          console.info('[voice] Gemini Live audio forwarded to browser', {
            sessionId: ctx.sessionId,
            chunks: outboundAudioChunks,
            bytes: outboundAudioBytes,
            sampleRate: OUTPUT_SAMPLE_RATE,
            format: 'signed PCM16 little-endian mono',
          });
          lastOutboundAudioLogAt = now;
        }
      }
    };

    const persist = (speaker: 'ai' | 'user', text: string): Promise<void> => {
      const normalized = text.trim();
      if (!normalized) return Promise.resolve();
      writeQueue = writeQueue.then(async () => {
        await ctx.onTranscript({ speaker, text: normalized });
      });
      return writeQueue;
    };

    const flushAiTranscript = async () => {
      if (transcriptTimer) clearTimeout(transcriptTimer);
      transcriptTimer = undefined;
      const text = outputTranscript.trim();
      outputTranscript = '';
      outputTranscriptFinal = false;
      if (!text) return;
      await persist('ai', text);
      safeSend(clientWs, { type: 'transcript', speaker: 'ai', text, final: true });
    };

    const endLiveSession = async (notifyClient: boolean) => {
      if (finalization) return finalization;
      ending = true;
      finalization = (async () => {
        if (transcriptTimer) clearTimeout(transcriptTimer);
        await flushAiTranscript();
        await writeQueue;
        try {
          if (session) {
            console.info('[voice] ending microphone stream', { sessionId: ctx.sessionId, inboundAudioFrames });
            session.sendRealtimeInput({ audioStreamEnd: true });
          }
        } catch (error) {
          console.warn('[voice] could not signal microphone stream end', {
            sessionId: ctx.sessionId,
            ...diagnosticError(error),
          });
        }
        session?.close();
        if (notifyClient) safeSend(clientWs, { type: 'ended' });
      })();
      return finalization;
    };

    const reportConnectionFailure = (error: unknown) => {
      if (failureReported) return;
      failureReported = true;
      console.error('[voice] Gemini Live connection error', { sessionId: ctx.sessionId, ...diagnosticError(error) });
      safeSend(clientWs, { type: 'error', message: liveErrorMessage(error) });
      if (clientWs.readyState === clientWs.OPEN) clientWs.close(1011, 'gemini_live_connection_failed');
      if (!session) rejectConnecting?.(error);
    };

    const handleServerMessage = (message: LiveServerMessage) => {
      if (message.setupComplete) {
        console.info('[voice] Gemini Live setup complete', { sessionId: ctx.sessionId, model });
      }
      if (message.goAway) {
        console.warn('[voice] Gemini Live requested session shutdown', { sessionId: ctx.sessionId, timeLeft: message.goAway.timeLeft });
      }
      const content = message.serverContent;
      if (!content) return;

      if (content.interrupted) {
        console.info('[voice] Gemini Live interrupted its response', { sessionId: ctx.sessionId });
        safeSend(clientWs, { type: 'audio-interrupted' });
      }

      for (const part of content.modelTurn?.parts || []) {
        const audio = part.inlineData;
        if (audio?.data) {
          const mimeType = audio.mimeType || `audio/pcm;rate=${OUTPUT_SAMPLE_RATE}`;
          if (!mimeType.startsWith('audio/pcm')) {
            console.warn('[voice] Gemini Live returned unsupported audio format', { sessionId: ctx.sessionId, mimeType });
            continue;
          }
          const data = typeof audio.data === 'string' ? audio.data : Buffer.from(audio.data).toString('base64');
          logAudioProgress('output-received', Math.floor(data.length * 3 / 4));
          safeSend(clientWs, { type: 'audio', data, mimeType });
        }
      }

      const interimInput = content.interimInputTranscription?.text?.trim();
      if (interimInput) {
        const now = Date.now();
        if (now - lastInputTranscriptionLogAt >= AUDIO_DIAGNOSTIC_INTERVAL_MS) {
          console.info('[voice] Gemini Live interim user transcription', {
            sessionId: ctx.sessionId,
            characters: interimInput.length,
          });
          lastInputTranscriptionLogAt = now;
        }
        safeSend(clientWs, { type: 'interim', speaker: 'user', text: interimInput });
      }

      const inputText = content.inputTranscription?.text?.trim();
      if (inputText && content.inputTranscription?.finished === false) {
        safeSend(clientWs, { type: 'interim', speaker: 'user', text: inputText });
      } else if (inputText) {
        answerCount += 1;
        console.info('[voice] Gemini Live finalized user transcription', {
          sessionId: ctx.sessionId,
          characters: inputText.length,
          answerCount,
        });
        void persist('user', inputText).then(() => {
          safeSend(clientWs, { type: 'transcript', speaker: 'user', text: inputText, final: true });
        }).catch(() => safeSend(clientWs, { type: 'error', message: 'Your answer could not be saved. End this interview and try again.' }));

        if (answerCount >= ctx.questionsPlanned && !endedByQuestionLimit && session) {
          endedByQuestionLimit = true;
          safeSend(clientWs, { type: 'limit-reached' });
          try {
            session.sendClientContent({
              turns: [{ role: 'user', parts: [{ text: 'That was the final planned answer. Give a brief, warm closing statement and do not ask another question.' }] }],
              turnComplete: true,
            });
          } catch {
            safeSend(clientWs, { type: 'error', message: 'The interview limit was reached, but Gemini could not finish the closing response. End the interview to save your report.' });
          }
        }
      }

      const outputText = content.outputTranscription?.text;
      if (outputText) {
        console.info('[voice] Gemini Live output transcription received', {
          sessionId: ctx.sessionId,
          characters: outputText.length,
          finished: Boolean(content.outputTranscription?.finished),
        });
        outputTranscript = mergeTranscript(outputTranscript, outputText);
        outputTranscriptFinal = outputTranscriptFinal || Boolean(content.outputTranscription?.finished);
        safeSend(clientWs, { type: 'interim', speaker: 'ai', text: outputTranscript });
        if (outputTranscriptFinal) {
          void flushAiTranscript().catch(() => safeSend(clientWs, { type: 'error', message: 'The AI transcript could not be saved.' }));
        } else {
          if (transcriptTimer) clearTimeout(transcriptTimer);
          transcriptTimer = setTimeout(() => {
            void flushAiTranscript().catch(() => safeSend(clientWs, { type: 'error', message: 'The AI transcript could not be saved.' }));
          }, 700);
        }
      }

      if (content.turnComplete) {
        console.info('[voice] Gemini Live turn complete', {
          sessionId: ctx.sessionId,
          generationComplete: Boolean(content.generationComplete),
          waitingForInput: Boolean(content.waitingForInput),
        });
        safeSend(clientWs, { type: 'state', state: 'listening' });
        if (endedByQuestionLimit) {
          if (transcriptTimer) clearTimeout(transcriptTimer);
          transcriptTimer = setTimeout(() => {
            void flushAiTranscript().then(() => safeSend(clientWs, { type: 'limit-complete' }))
              .catch(() => safeSend(clientWs, { type: 'error', message: 'The final transcript could not be saved.' }));
          }, 700);
        } else if (outputTranscript && !transcriptTimer) {
          transcriptTimer = setTimeout(() => {
            void flushAiTranscript().catch(() => safeSend(clientWs, { type: 'error', message: 'The AI transcript could not be saved.' }));
          }, 700);
        }
      }
    };

    try {
      console.info('[voice] connecting to Gemini Live', {
        sessionId: ctx.sessionId,
        model,
        inputSampleRate: SAMPLE_RATE,
        outputSampleRate: OUTPUT_SAMPLE_RATE,
        automaticActivityDetection: false,
      });
      const connecting = this.ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `${ctx.systemPrompt}\n\nConduct this interview entirely in English. Understand and transcribe the candidate's answers as English, and speak every question and response in clear, natural English. Do not switch languages. Listen carefully to each complete answer. Do not jump straight to a new planned topic: when an answer includes an experience, decision, claim, or result, ask a concise, specific probing follow-up about a concrete detail they mentioned. If an answer is vague or incomplete, ask a clarifying follow-up. Ask exactly one question at a time and wait for the spoken answer. Do not coach or evaluate during the interview. The limit of ${ctx.questionsPlanned} counts all candidate responses, including responses to follow-ups; use those available question slots to probe meaningfully and cover the planned topics. When the limit is reached, close warmly without another question.`,
          inputAudioTranscription: { languageCodes: ['en-US'] },
          outputAudioTranscription: { languageCodes: ['en-US'] },
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: true,
            },
          },
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
        callbacks: {
          onmessage: handleServerMessage,
          onerror: (event) => {
            reportConnectionFailure(event);
          },
          onclose: (event) => {
            if (!ending) {
              reportConnectionFailure(event);
            }
          },
        },
      });
      // A failed provider websocket can emit error/close without rejecting connect().
      // Bound setup time and close a late session if the browser has already left.
      void connecting.then((lateSession) => {
        if (failureReported || clientWs.readyState !== clientWs.OPEN) lateSession.close();
      }).catch(() => undefined);
      session = await Promise.race([
        connecting,
        new Promise<Session>((_, reject) => { rejectConnecting = reject; }),
        new Promise<Session>((_, reject) => {
          connectionTimer = setTimeout(() => {
            const timeout = new Error('Gemini Live connection timeout');
            (timeout as Error & { code: string }).code = 'LIVE_CONNECT_TIMEOUT';
            reject(timeout);
          }, Number(process.env.GEMINI_LIVE_CONNECT_TIMEOUT_MS || 20_000));
        }),
      ]);
    } catch (error) {
      reportConnectionFailure(error);
      return;
    } finally {
      if (connectionTimer) clearTimeout(connectionTimer);
    }

    if (clientWs.readyState !== clientWs.OPEN) {
      session.close();
      return;
    }

    console.info('[voice] Gemini Live session connected', { sessionId: ctx.sessionId, model });
    safeSend(clientWs, { type: 'ready', mode: 'live', model, sessionId: ctx.sessionId });

    clientWs.on('message', (data, isBinary) => {
      inboundQueue = inboundQueue.then(async () => {
        if (ending) return;
        if (isBinary) {
          if (!started || endedByQuestionLimit) return;
          const bytes = rawBytes(data);
          if (bytes.byteLength === 0 || bytes.byteLength > MAX_AUDIO_FRAME_BYTES || bytes.byteLength % 2 !== 0) {
            safeSend(clientWs, { type: 'error', message: 'Received an invalid microphone audio frame. Restart the interview and try again.' });
            return;
          }
          try {
            session?.sendRealtimeInput({
              audio: { data: bytes.toString('base64'), mimeType: `audio/pcm;rate=${SAMPLE_RATE}` },
            });
            logAudioProgress('input-forwarded', bytes.byteLength);
          } catch (error) {
            console.error('[voice] failed to forward microphone PCM to Gemini Live', {
              sessionId: ctx.sessionId,
              bytes: bytes.byteLength,
              ...diagnosticError(error),
            });
            safeSend(clientWs, { type: 'error', message: 'Microphone audio could not be sent to Gemini. Check your connection.' });
          }
          return;
        }

        let message: { type?: string };
        try { message = JSON.parse(rawBytes(data).toString('utf8')); }
        catch { safeSend(clientWs, { type: 'error', message: 'Received an invalid interview control message.' }); return; }

        if (message.type === 'audio-start') {
          if (!started || endedByQuestionLimit) return;
          try {
            console.info('[voice] candidate speech started; opening Gemini activity', { sessionId: ctx.sessionId });
            session?.sendRealtimeInput({ activityStart: {} });
          } catch (error) {
            console.error('[voice] failed to signal candidate speech start', {
              sessionId: ctx.sessionId,
              ...diagnosticError(error),
            });
            safeSend(clientWs, { type: 'error', message: 'The interview could not start processing your answer. Please try again.' });
          }
        } else if (message.type === 'audio-end') {
          if (!started || endedByQuestionLimit) return;
          try {
            console.info('[voice] candidate turn complete; ending Gemini activity', {
              sessionId: ctx.sessionId,
              inboundAudioFrames,
            });
            session?.sendRealtimeInput({ activityEnd: {} });
          } catch (error) {
            console.error('[voice] failed to signal candidate turn completion', {
              sessionId: ctx.sessionId,
              ...diagnosticError(error),
            });
            safeSend(clientWs, { type: 'error', message: 'The interview could not finish processing your answer. Please try again.' });
          }
        } else if (message.type === 'start' && !started) {
          started = true;
          safeSend(clientWs, { type: 'state', state: 'listening' });
          if (answerCount >= ctx.questionsPlanned) {
            endedByQuestionLimit = true;
            safeSend(clientWs, { type: 'limit-reached' });
            session?.sendClientContent({
              turns: [{ role: 'user', parts: [{ text: 'This interview already contains all planned answers. Give a brief, warm closing statement and do not ask another question.' }] }],
              turnComplete: true,
            });
            return;
          }
          if (ctx.transcript.length) {
            session?.sendClientContent({
              turns: ctx.transcript.map(turn => ({ role: turn.speaker === 'ai' ? 'model' as const : 'user' as const, parts: [{ text: turn.text }] })),
              turnComplete: ctx.transcript.at(-1)?.speaker === 'user',
            });
          } else {
            session?.sendClientContent({
              turns: [{ role: 'user', parts: [{ text: 'Begin the interview now with a short introduction and your first question.' }] }],
              turnComplete: true,
            });
          }
        } else if (message.type === 'end') {
          await endLiveSession(true);
        }
      }).catch(() => safeSend(clientWs, { type: 'error', message: 'The live interview could not process that message.' }));
    });

    clientWs.on('close', () => {
      void endLiveSession(false).catch(() => undefined);
    });
    clientWs.on('error', () => {
      void endLiveSession(false).catch(() => undefined);
    });
  }
}
