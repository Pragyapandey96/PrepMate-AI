import { GoogleGenAI, Modality } from '@google/genai';
import type { LiveServerMessage, Session } from '@google/genai';
import type { RawData, WebSocket } from 'ws';
import type { VoiceProvider, VoiceContext } from './provider.js';

const SAMPLE_RATE = 16_000;
const MAX_AUDIO_FRAME_BYTES = 128 * 1024;

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
  const err = error as { status?: number; code?: number | string; message?: string } | null;
  const status = Number(err?.status || err?.code);
  const message = err?.message || '';
  if (status === 429 || /resource.?exhausted|rate.?limit/i.test(message)) {
    return 'Gemini is temporarily rate limited. Please wait a moment and try again.';
  }
  if (status === 400 || /invalid.?argument|unsupported model/i.test(message)) {
    return 'The configured Gemini Live model rejected this session. Check GEMINI_LIVE_MODEL.';
  }
  return 'Gemini Live disconnected. Check your connection and try again.';
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
    let writeQueue = Promise.resolve();
    let inboundQueue = Promise.resolve();
    let finalization: Promise<void> | undefined;

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
        try { session?.sendRealtimeInput({ audioStreamEnd: true }); } catch { /* connection may already be gone */ }
        session?.close();
        if (notifyClient) safeSend(clientWs, { type: 'ended' });
      })();
      return finalization;
    };

    const handleServerMessage = (message: LiveServerMessage) => {
      const content = message.serverContent;
      if (!content) return;

      if (content.interrupted) safeSend(clientWs, { type: 'audio-interrupted' });

      for (const part of content.modelTurn?.parts || []) {
        const audio = part.inlineData;
        if (audio?.data && audio.mimeType?.startsWith('audio/pcm')) {
          const data = typeof audio.data === 'string' ? audio.data : Buffer.from(audio.data).toString('base64');
          safeSend(clientWs, { type: 'audio', data, mimeType: audio.mimeType });
        }
      }

      const interimInput = content.interimInputTranscription?.text?.trim();
      if (interimInput) safeSend(clientWs, { type: 'interim', speaker: 'user', text: interimInput });

      const inputText = content.inputTranscription?.text?.trim();
      if (inputText && content.inputTranscription?.finished === false) {
        safeSend(clientWs, { type: 'interim', speaker: 'user', text: inputText });
      } else if (inputText) {
        answerCount += 1;
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
      session = await this.ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `${ctx.systemPrompt}\n\nConduct this as a spoken interview. Ask exactly one concise question at a time and wait for the candidate's spoken answer. Ask relevant follow-ups. Do not coach or evaluate during the interview. Respect the planned limit of ${ctx.questionsPlanned} questions; after the final answer, close warmly without another question.`,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
        callbacks: {
          onmessage: handleServerMessage,
          onerror: (event) => {
            safeSend(clientWs, { type: 'error', message: liveErrorMessage((event as any).error || event) });
            if (clientWs.readyState === clientWs.OPEN) clientWs.close(1011, 'gemini_live_error');
          },
          onclose: () => {
            if (!ending) {
              safeSend(clientWs, { type: 'error', message: 'Gemini Live disconnected. Your saved transcript is still available.' });
              if (clientWs.readyState === clientWs.OPEN) clientWs.close(1011, 'gemini_live_disconnected');
            }
          },
        },
      });
    } catch (error) {
      safeSend(clientWs, { type: 'error', message: liveErrorMessage(error) });
      clientWs.close(1011, 'gemini_live_unavailable');
      return;
    }

    if (clientWs.readyState !== clientWs.OPEN) {
      session.close();
      return;
    }

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
          } catch {
            safeSend(clientWs, { type: 'error', message: 'Microphone audio could not be sent to Gemini. Check your connection.' });
          }
          return;
        }

        let message: { type?: string };
        try { message = JSON.parse(rawBytes(data).toString('utf8')); }
        catch { safeSend(clientWs, { type: 'error', message: 'Received an invalid interview control message.' }); return; }

        if (message.type === 'start' && !started) {
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
