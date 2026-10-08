// Web Speech API wrappers — real STT + TTS, browser-side.
// Exposed on window.Voice.

(function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  const state = {
    recognition: null,
    voice: null,
    voiceReadyPromise: null,
    isSpeaking: false,
    isListening: false,
    // Callbacks
    onInterim: null,
    onFinal: null,
    onListenStart: null,
    onListenEnd: null,
    onSpeakStart: null,
    onSpeakEnd: null,
    onError: null,
  };

  function pickVoice() {
    if (!synth) return null;
    const voices = synth.getVoices();
    if (!voices.length) return null;
    // Prefer natural-sounding English voices
    const prefs = [
      /Google US English/i,
      /Microsoft Aria/i,
      /Microsoft Jenny/i,
      /Samantha/i,
      /Google UK English Female/i,
      /en-US/i,
      /en-GB/i,
      /en/i,
    ];
    for (const p of prefs) {
      const v = voices.find(v => p.test(v.name) || p.test(v.lang));
      if (v) return v;
    }
    return voices[0];
  }

  function ensureVoice() {
    if (state.voice) return Promise.resolve(state.voice);
    if (state.voiceReadyPromise) return state.voiceReadyPromise;
    state.voiceReadyPromise = new Promise((resolve) => {
      const tryPick = () => {
        const v = pickVoice();
        if (v) { state.voice = v; resolve(v); return true; }
        return false;
      };
      if (tryPick()) return;
      synth.addEventListener('voiceschanged', () => tryPick());
      // Fallback timer in case voiceschanged never fires
      setTimeout(() => { tryPick(); if (!state.voice) resolve(null); }, 1500);
    });
    return state.voiceReadyPromise;
  }

  async function speak(text) {
    if (!synth) throw new Error('speechSynthesis not supported');
    if (!text) return;
    // Cancel any in-flight speech (barge-in support)
    try { synth.cancel(); } catch (_) {}
    await ensureVoice();
    return new Promise((resolve) => {
      const utter = new SpeechSynthesisUtterance(text);
      if (state.voice) utter.voice = state.voice;
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.volume = 1.0;
      utter.onstart = () => {
        state.isSpeaking = true;
        state.onSpeakStart && state.onSpeakStart(text);
      };
      utter.onend = () => {
        state.isSpeaking = false;
        state.onSpeakEnd && state.onSpeakEnd(text);
        resolve();
      };
      utter.onerror = (e) => {
        state.isSpeaking = false;
        state.onSpeakEnd && state.onSpeakEnd(text);
        resolve();
      };
      synth.speak(utter);
    });
  }

  function stopSpeaking() {
    try { synth && synth.cancel(); } catch (_) {}
    state.isSpeaking = false;
  }

  function startListening() {
    if (!SR) {
      state.onError && state.onError({ code: 'no-stt', message: 'Speech recognition not supported in this browser. Try Chrome or Edge.' });
      return;
    }
    if (state.isListening) return;
    // Stop TTS if the user starts talking (barge-in)
    if (state.isSpeaking) stopSpeaking();

    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    let finalBuf = '';
    let interimBuf = '';

    rec.onstart = () => {
      state.isListening = true;
      state.onListenStart && state.onListenStart();
    };
    rec.onresult = (e) => {
      interimBuf = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript;
        if (r.isFinal) finalBuf += t + ' ';
        else interimBuf += t;
      }
      state.onInterim && state.onInterim({ final: finalBuf.trim(), interim: interimBuf.trim() });
    };
    rec.onerror = (e) => {
      state.onError && state.onError({ code: e.error, message: e.error });
    };
    rec.onend = () => {
      state.isListening = false;
      const full = (finalBuf + ' ' + interimBuf).trim();
      state.onListenEnd && state.onListenEnd();
      state.onFinal && state.onFinal(full);
      state.recognition = null;
    };
    state.recognition = rec;
    try { rec.start(); }
    catch (err) { state.onError && state.onError({ code: 'start-fail', message: err.message }); }
  }

  function stopListening() {
    if (state.recognition) {
      try { state.recognition.stop(); } catch (_) {}
    }
  }

  function on(events) {
    Object.assign(state, events);
  }

  function isSupported() {
    return { stt: !!SR, tts: !!synth };
  }

  window.Voice = {
    speak, stopSpeaking,
    startListening, stopListening,
    on, isSupported,
    get isSpeaking() { return state.isSpeaking; },
    get isListening() { return state.isListening; },
  };
})();
