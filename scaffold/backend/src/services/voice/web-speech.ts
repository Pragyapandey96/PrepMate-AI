// Fallback voice provider — the browser does STT+TTS locally, and the
// backend just supplies question text via the same WebSocket.

import type { WebSocket } from 'ws';
import type { VoiceProvider, VoiceContext } from './provider.js';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export class WebSpeechProvider implements VoiceProvider {
  async attach(clientWs: WebSocket, ctx: VoiceContext): Promise<void> {
    const transcript: { speaker: 'ai' | 'user'; text: string }[] = [];

    const askNext = async () => {
      const model = process.env.GEMINI_EVAL_MODEL || 'gemini-3.5-flash-lite';
      const convo = transcript.map(t => `${t.speaker.toUpperCase()}: ${t.text}`).join('\n');
      const prompt = `${ctx.systemPrompt}\n\nConversation so far:\n${convo}\n\nAsk the next question. Respond with ONLY the question text.`;
      const resp = await ai.models.generateContent({ model, contents: prompt });
      const question = (resp.text || '').trim();
      transcript.push({ speaker: 'ai', text: question });
      await ctx.onTranscript({ speaker: 'ai', text: question });
      clientWs.send(JSON.stringify({ type: 'question', text: question }));
    };

    clientWs.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'start') await askNext();
        else if (msg.type === 'answer') {
          transcript.push({ speaker: 'user', text: msg.text });
          await ctx.onTranscript({ speaker: 'user', text: msg.text });
          await askNext();
        }
      } catch (e) {
        console.error('web-speech provider error', e);
        if (clientWs.readyState === clientWs.OPEN) {
          clientWs.send(JSON.stringify({ type: 'error', message: 'The AI interviewer could not generate a question. Check the Gemini configuration and try again.' }));
        }
      }
    });

    clientWs.send(JSON.stringify({ type: 'ready', mode: 'web-speech', sessionId: ctx.sessionId }));
  }
}
