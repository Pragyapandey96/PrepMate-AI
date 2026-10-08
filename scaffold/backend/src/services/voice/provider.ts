// Swappable voice provider interface. Two implementations ship:
// - GeminiLiveProvider: real-time audio via @google/genai Live API
// - WebSpeechProvider: browser-side fallback (backend just orchestrates text)

import type { WebSocket } from 'ws';

export interface VoiceProvider {
  /** Called when a new client WS connects for a session. */
  attach(clientWs: WebSocket, ctx: VoiceContext): Promise<void>;
}

export interface VoiceContext {
  sessionId: string;
  systemPrompt: string;
  questionsPlanned: number;
  transcript: { speaker: 'ai' | 'user'; text: string }[];
  resume: any;
  jd: any;
  onTranscript: (turn: { speaker: 'ai' | 'user'; text: string }) => void | Promise<void>;
}
