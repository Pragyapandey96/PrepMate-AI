// Browser-side voice helpers. Used as the fallback path when the backend
// runs the `web-speech` provider — the real Gemini Live path streams audio
// directly through the WebSocket connection instead.

export interface VoiceHandlers {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  onError?: (err: string) => void;
}

export class BrowserVoice {
  private handlers: VoiceHandlers = {};
  private recognition: any = null;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    if ('speechSynthesis' in window) {
      const pick = () => {
        const vs = window.speechSynthesis.getVoices();
        this.voice = vs.find(v => /Google US English|Microsoft Aria|Samantha|en-US/.test(v.name + v.lang)) || vs[0];
      };
      pick();
      window.speechSynthesis.addEventListener('voiceschanged', pick);
    }
  }

  on(h: VoiceHandlers) { this.handlers = { ...this.handlers, ...h }; }

  speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) { resolve(); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) u.voice = this.voice;
      u.onstart = () => this.handlers.onSpeakStart?.();
      u.onend = () => { this.handlers.onSpeakEnd?.(); resolve(); };
      u.onerror = () => { this.handlers.onSpeakEnd?.(); resolve(); };
      window.speechSynthesis.speak(u);
    });
  }

  startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { this.handlers.onError?.('Speech recognition not supported'); return; }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    let finalBuf = '';
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalBuf += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      this.handlers.onInterim?.((finalBuf + interim).trim());
    };
    rec.onend = () => this.handlers.onFinal?.(finalBuf.trim());
    rec.onerror = (e: any) => this.handlers.onError?.(e.error);
    rec.start();
    this.recognition = rec;
  }

  stopListening() { this.recognition?.stop(); this.recognition = null; }
  stopSpeaking() { window.speechSynthesis?.cancel(); }
}

export const voice = new BrowserVoice();
