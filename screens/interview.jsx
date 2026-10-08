// Live voice interview screen. Real STT + TTS + LLM loop.
// Supports 3 layouts: 'transcript' (default), 'split', 'focus'.

function InterviewScreen({ config, layout, setRoute, setLastReport }) {
  const I = window.Icon;
  const resume = window.DEMO_DATA.resume;
  const jd = window.DEMO_DATA.jd;

  const [status, setStatus] = React.useState('starting'); // starting | speaking | listening | thinking | ended
  const [transcript, setTranscript] = React.useState([]); // {speaker, text, id}
  const [interim, setInterim] = React.useState('');
  const [muted, setMuted] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [showEndModal, setShowEndModal] = React.useState(false);
  const [generatingReport, setGeneratingReport] = React.useState(false);
  const [error, setError] = React.useState(null);

  const questionsAskedRef = React.useRef(0);
  const startedRef = React.useRef(false);
  const transcriptRef = React.useRef([]);
  transcriptRef.current = transcript;

  // Elapsed timer
  React.useEffect(() => {
    const iv = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // Set up voice handlers once
  React.useEffect(() => {
    window.Voice.on({
      onSpeakStart: () => setStatus('speaking'),
      onSpeakEnd: () => { /* handled after speak resolves */ },
      onListenStart: () => { setStatus('listening'); setInterim(''); },
      onListenEnd: () => {},
      onInterim: ({ final, interim: iText }) => setInterim((final + ' ' + iText).trim()),
      onError: (e) => {
        // Suppress noisy no-speech errors (they happen on silence)
        if (e.code === 'no-speech' || e.code === 'aborted') return;
        setError(e.message || String(e.code));
      },
    });
  }, []);

  // Main interview loop — kicks off once
  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    runInterview();
    // eslint-disable-next-line
  }, []);

  async function askAndListen(questionText) {
    setStatus('speaking');
    setTranscript(t => [...t, { speaker: 'ai', text: questionText, id: crypto.randomUUID() }]);
    await window.Voice.speak(questionText);
    if (window.__interviewEnded) return '';

    // Now listen for the answer
    setInterim('');
    setStatus('listening');

    // If STT isn't supported, skip listening entirely
    if (!window.Voice.isSupported().stt) {
      await new Promise(r => setTimeout(r, 800));
      return '(speech recognition not available in this browser — answer skipped)';
    }

    return await new Promise((resolve) => {
      let resolved = false;
      let silenceTimer = null;
      let maxTimer = null;
      let lastInterim = '';

      const finish = (text) => {
        if (resolved) return;
        resolved = true;
        if (silenceTimer) clearTimeout(silenceTimer);
        if (maxTimer) clearTimeout(maxTimer);
        // Detach handlers so they don't fire for the next round
        window.Voice.on({ onInterim: null, onFinal: null });
        resolve(text || '');
      };

      window.Voice.on({
        onInterim: ({ final, interim: iText }) => {
          const combined = (final + ' ' + iText).trim();
          setInterim(combined);
          // Restart silence timer whenever we hear new speech
          if (combined && combined !== lastInterim) {
            lastInterim = combined;
            if (silenceTimer) clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => window.Voice.stopListening(), 2200);
          }
        },
        onFinal: (finalText) => finish(finalText),
      });

      // Overall max answer time: 90s
      maxTimer = setTimeout(() => window.Voice.stopListening(), 90000);
      window.Voice.startListening();
    });
  }

  async function runInterview() {
    try {
      // 1. Opener
      const opener = await window.LLM.generateOpener({
        resume, jd, config, questionsAsked: 0, questionsTotal: config.questions,
      });
      const answer1 = await askAndListen(opener);
      setInterim('');
      if (answer1 && answer1.trim()) {
        setTranscript(t => [...t, { speaker: 'user', text: answer1, id: crypto.randomUUID() }]);
      }
      questionsAskedRef.current = 1;

      // 2. Loop
      while (questionsAskedRef.current < config.questions && startedRef.current !== 'ended') {
        if (window.__interviewEnded) break;
        setStatus('thinking');
        const nextQ = await window.LLM.generateNext(
          { resume, jd, config, questionsAsked: questionsAskedRef.current, questionsTotal: config.questions },
          transcriptRef.current
        );
        if (window.__interviewEnded) break;
        const ans = await askAndListen(nextQ);
        setInterim('');
        if (ans && ans.trim()) {
          setTranscript(t => [...t, { speaker: 'user', text: ans, id: crypto.randomUUID() }]);
        }
        questionsAskedRef.current += 1;
      }

      // 3. Closing
      if (!window.__interviewEnded) {
        setStatus('speaking');
        const closing = await window.LLM.generateClosing({ resume, jd, config });
        setTranscript(t => [...t, { speaker: 'ai', text: closing, id: crypto.randomUUID() }]);
        await window.Voice.speak(closing);
      }
      await endInterview();
    } catch (e) {
      console.error(e);
      setError('Interview failed: ' + (e.message || e));
    }
  }

  async function endInterview() {
    window.__interviewEnded = true;
    window.Voice.stopSpeaking();
    window.Voice.stopListening();
    setStatus('ended');
    setGeneratingReport(true);

    // Generate evaluation
    let evaluation = null;
    try {
      evaluation = await window.LLM.evaluate(
        { resume, jd, config },
        transcriptRef.current
      );
    } catch (_) {}

    const report = evaluation || window.DEMO_DATA.sampleReport;
    // Enrich with meta
    report.date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    report.role = jd.title;
    report.type = config.type;
    report.difficulty = config.difficulty;
    report.durationMin = Math.max(1, Math.round(elapsed / 60));
    report.questionsAsked = questionsAskedRef.current;
    setLastReport(report);
    setGeneratingReport(false);
    setRoute('report');
  }

  function handleEnd() {
    setShowEndModal(false);
    endInterview();
  }
  function toggleMute() {
    setMuted(m => {
      const nv = !m;
      if (nv) window.Voice.stopListening();
      return nv;
    });
  }

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  };

  const statusLabel = {
    starting: 'Connecting',
    speaking: 'Speaking',
    listening: 'Listening',
    thinking: 'Thinking',
    ended: 'Ended',
  }[status];

  const dockAndTop = (
    <>
      {/* Dock */}
      <div className="interview-dock">
        <div className="row" style={{ gap: 10 }}>
          <div className={'wave' + (status === 'listening' ? '' : ' idle')}>
            {[1,2,3,4,5,6,7].map(i => <div key={i} className="wave-bar" style={{ height: 6 }}/>)}
          </div>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {statusLabel}
          </span>
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--border)' }}/>
        <button className={'dock-mic' + (status === 'listening' ? ' recording' : '') + (muted ? ' muted' : '')} onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? <I.MicOff /> : <I.Mic />}
        </button>
        <button className="btn btn-danger" onClick={() => setShowEndModal(true)}>End interview</button>
      </div>

      {showEndModal && (
        <div className="overlay" onClick={() => setShowEndModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>End interview now?</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              You've answered {Math.floor(transcript.filter(t=>t.speaker==='user').length)} of {config.questions} questions.
              PrepMate will still generate a report based on what you've said so far.
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowEndModal(false)}>Keep going</button>
              <button className="btn btn-danger" style={{ background: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' }} onClick={handleEnd}>End & get report</button>
            </div>
          </div>
        </div>
      )}

      {generatingReport && (
        <div className="overlay">
          <div className="modal" style={{ textAlign: 'center' }}>
            <div className="wave" style={{ justifyContent: 'center', margin: '4px auto 12px' }}>
              {[1,2,3,4,5,6,7].map(i => <div key={i} className="wave-bar"/>)}
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Generating your report</div>
            <div className="muted" style={{ fontSize: 13 }}>Analyzing your answers against the role — this takes a few seconds.</div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', padding: '8px 14px', background: 'var(--danger-subtle)', color: 'var(--danger)', borderRadius: 999, fontSize: 12.5, zIndex: 50 }}>
          {error}
        </div>
      )}
    </>
  );

  // ===== FOCUS layout =====
  if (layout === 'focus') {
    const lastAi = [...transcript].reverse().find(t => t.speaker === 'ai');
    const lastUser = [...transcript].reverse().find(t => t.speaker === 'user');
    const caption = status === 'listening' && interim
      ? { text: interim, who: 'user' }
      : status === 'listening'
        ? { text: lastAi?.text || '…', who: 'ai', hint: 'Your turn — start speaking' }
        : { text: lastAi?.text || 'Connecting…', who: 'ai' };
    return (
      <div className="focus-mode">
        <div className="focus-status">
          <span className={'dot ' + (status === 'listening' ? 'live' : status === 'speaking' ? 'speaking' : '')} />
          {statusLabel} · Q {Math.min(questionsAskedRef.current || 1, config.questions)}/{config.questions} · {fmtTime(elapsed)}
        </div>
        <div>
          <div className={'focus-caption' + (caption.who === 'user' ? ' user' : '')}>
            {caption.text}
          </div>
          {caption.hint && <div className="tiny" style={{ textAlign: 'center', marginTop: 24 }}>{caption.hint}</div>}
        </div>
        {dockAndTop}
      </div>
    );
  }

  // ===== Header bar shared by transcript + split =====
  const header = (
    <div className="interview-topbar">
      <div className="sidebar-brand" style={{ padding: 0 }}>
        <div className="sidebar-brand-mark">PM</div>
        <div>PrepMate AI</div>
      </div>
      <div style={{ width: 1, height: 20, background: 'var(--border)' }}/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap' }}>{jd.title}</div>
        <div className="tiny" style={{ whiteSpace: 'nowrap' }}>{config.type} · {config.difficulty} · with AI Interviewer</div>
      </div>
      <div className="spacer" />
      <div className="row">
        <span className="badge">
          Q <span className="mono">{Math.min(questionsAskedRef.current || 1, config.questions)}</span> / <span className="mono">{config.questions}</span>
        </span>
        <span className="badge mono">{fmtTime(elapsed)}</span>
        <span className="badge">
          <span className={'dot ' + (status === 'listening' ? 'live' : status === 'speaking' ? 'speaking' : status === 'thinking' ? 'warn' : 'off')} />
          {statusLabel}
        </span>
      </div>
    </div>
  );

  // ===== SPLIT layout =====
  if (layout === 'split') {
    return (
      <div className="interview-shell">
        {header}
        <div className="split-shell">
          <div className="split-transcript">
            <TranscriptStream transcript={transcript} interim={interim} status={status} />
          </div>
          <aside className="split-side">
            <div>
              <div className="tiny" style={{ marginBottom: 8 }}>Interviewer</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>AI Interviewer</div>
              <div className="row" style={{ marginTop: 6 }}>
                <span className={'dot ' + (status === 'listening' ? 'live' : status === 'speaking' ? 'speaking' : status === 'thinking' ? 'warn' : 'off')} />
                <span className="tiny">{statusLabel}</span>
              </div>
            </div>
            <div>
              <div className="tiny" style={{ marginBottom: 8 }}>Audio</div>
              <div className="wave" style={{ height: 40 }}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => <div key={i} className="wave-bar" style={{ animation: status === 'listening' || status === 'speaking' ? undefined : 'none', height: 4, opacity: status === 'listening' || status === 'speaking' ? 1 : 0.3 }}/>)}
              </div>
            </div>
            <div>
              <div className="tiny" style={{ marginBottom: 8 }}>Progress</div>
              <div className="progress" style={{ height: 6 }}>
                <div className="progress-fill" style={{ width: `${Math.min(100, (questionsAskedRef.current / config.questions) * 100)}%` }}/>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                <span className="tiny">Q {Math.min(questionsAskedRef.current || 1, config.questions)}/{config.questions}</span>
                <span className="tiny mono">{fmtTime(elapsed)}</span>
              </div>
            </div>
            <hr className="divider" style={{ margin: '4px 0' }}/>
            <div>
              <div className="tiny" style={{ marginBottom: 8 }}>Context</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Personalizing based on {resume.name.split(' ')[0]}'s resume and the {jd.title} role at {jd.company}.
              </div>
            </div>
          </aside>
        </div>
        {dockAndTop}
      </div>
    );
  }

  // ===== TRANSCRIPT (default) layout =====
  return (
    <div className="interview-shell">
      {header}
      <div className="transcript-wrap">
        <TranscriptStream transcript={transcript} interim={interim} status={status} />
      </div>
      {dockAndTop}
    </div>
  );
}

function TranscriptStream({ transcript, interim, status }) {
  const endRef = React.useRef(null);
  React.useEffect(() => {
    // Scroll the window (not scrollIntoView, which can break things at app root)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, [transcript.length, interim]);

  return (
    <>
      {transcript.map(t => (
        <div key={t.id} className={'turn ' + t.speaker}>
          <div className="turn-label">
            {t.speaker === 'ai' ? 'AI Interviewer' : 'You'}
          </div>
          <div className="turn-body">{t.text}</div>
        </div>
      ))}
      {status === 'listening' && interim && (
        <div className="turn user interim">
          <div className="turn-label">You</div>
          <div className="turn-body">{interim}<span style={{ opacity: 0.4 }}> …</span></div>
        </div>
      )}
      {status === 'thinking' && (
        <div className="turn ai">
          <div className="turn-label">AI Interviewer</div>
          <div className="turn-body muted"><em>thinking…</em></div>
        </div>
      )}
      <div ref={endRef} />
    </>
  );
}

Object.assign(window, { InterviewScreen });
