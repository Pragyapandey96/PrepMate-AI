function ConfigureScreen({ setRoute, config, setConfig, layout }) {
  const I = window.Icon;
  const [micStatus, setMicStatus] = React.useState('unchecked'); // unchecked | granted | denied
  const [micLevel, setMicLevel] = React.useState(0);
  const rafRef = React.useRef(null);
  const streamRef = React.useRef(null);

  async function testMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const src = ac.createMediaStreamSource(stream);
      const analyzer = ac.createAnalyser();
      analyzer.fftSize = 256;
      src.connect(analyzer);
      const data = new Uint8Array(analyzer.frequencyBinCount);
      const tick = () => {
        analyzer.getByteFrequencyData(data);
        const avg = data.reduce((a,b) => a+b, 0) / data.length;
        setMicLevel(Math.min(100, avg * 1.6));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      setMicStatus('granted');
    } catch (e) {
      setMicStatus('denied');
    }
  }
  React.useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }));
  const types = [
    { id: 'HR', title: 'HR', desc: 'Motivation, culture fit, career goals.' },
    { id: 'Technical', title: 'Technical', desc: 'Engineering, system design, deep dives.' },
    { id: 'Behavioral', title: 'Behavioral', desc: 'STAR-friendly situational questions.' },
    { id: 'Mixed', title: 'Mixed', desc: 'A blend of all three — most realistic.' },
  ];
  const diffs = [
    { id: 'Easy', title: 'Easy', desc: 'Broad recall & warm-ups.' },
    { id: 'Medium', title: 'Medium', desc: 'Applied reasoning & tradeoffs.' },
    { id: 'Hard', title: 'Hard', desc: 'Deep system design & edge cases.' },
  ];

  const canStart = micStatus === 'granted';
  const voiceSupport = window.Voice.isSupported();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configure interview</h1>
          <p className="page-subtitle">Set the type, difficulty, and length. Then run a quick mic check.</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setRoute('jd')}><I.ArrowLeft className="icon" /> Back</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div className="col">
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 className="card-title">Interview type</h3>
              <span className="tiny mono">{config.type}</span>
            </div>
            <div className="choice-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {types.map(t => (
                <div key={t.id} className={'choice' + (config.type === t.id ? ' selected' : '')} onClick={() => set('type', t.id)}>
                  <div className="choice-radio" />
                  <div>
                    <div className="choice-title">{t.title}</div>
                    <div className="choice-desc">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 className="card-title">Difficulty</h3>
              <span className="tiny mono">{config.difficulty}</span>
            </div>
            <div className="choice-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {diffs.map(d => (
                <div key={d.id} className={'choice' + (config.difficulty === d.id ? ' selected' : '')} onClick={() => set('difficulty', d.id)}>
                  <div className="choice-radio" />
                  <div>
                    <div className="choice-title">{d.title}</div>
                    <div className="choice-desc">{d.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>Length</h3>
                <div className="tiny" style={{ marginTop: 4 }}>Estimated duration: ~{Math.round(config.questions * 2)} min</div>
              </div>
              <div className="segmented">
                {[5, 8, 10, 15].map(n => (
                  <button key={n} className={config.questions === n ? 'active' : ''} onClick={() => set('questions', n)}>{n} Qs</button>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Screen layout</h3>
            <div className="choice-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {[
                { id: 'transcript', title: 'Transcript', desc: 'Big centered transcript, minimal chrome.' },
                { id: 'split', title: 'Split', desc: 'Transcript + live status side panel.' },
                { id: 'focus', title: 'Focus', desc: 'Teleprompter caption. No distractions.' },
              ].map(v => (
                <div key={v.id} className={'choice' + (layout === v.id ? ' selected' : '')} onClick={() => window.__setLayout && window.__setLayout(v.id)}>
                  <div className="choice-radio" />
                  <div>
                    <div className="choice-title">{v.title}</div>
                    <div className="choice-desc">{v.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="tiny" style={{ marginTop: 8 }}>You can also switch this from the Tweaks panel at any time.</div>
          </div>
        </div>

        <div className="col">
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Mic check</h3>
            {micStatus === 'unchecked' && (
              <>
                <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                  We'll ask for microphone access. Nothing is recorded until the interview starts.
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={testMic}>
                  <I.Mic className="icon" /> Test microphone
                </button>
              </>
            )}
            {micStatus === 'granted' && (
              <>
                <div className="row" style={{ marginBottom: 10 }}>
                  <span className="dot live" />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Microphone active</span>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div className="progress-fill" style={{ width: micLevel + '%', background: micLevel > 20 ? 'var(--success)' : 'var(--accent)' }}/>
                </div>
                <div className="tiny" style={{ marginTop: 8 }}>Say "testing, one two three" — you should see the bar move.</div>
              </>
            )}
            {micStatus === 'denied' && (
              <div style={{ padding: 12, background: 'var(--danger-subtle)', color: 'var(--danger)', borderRadius: 8, fontSize: 13 }}>
                Microphone access was denied. Enable it in your browser settings and reload.
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Voice support</h3>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
              <span>Speech-to-text</span>
              <span className={'badge ' + (voiceSupport.stt ? 'success' : 'danger')}>{voiceSupport.stt ? 'Available' : 'Not supported'}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
              <span>Text-to-speech</span>
              <span className={'badge ' + (voiceSupport.tts ? 'success' : 'danger')}>{voiceSupport.tts ? 'Available' : 'Not supported'}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
              <span>LLM</span>
              <span className="badge success">Connected</span>
            </div>
            {!voiceSupport.stt && (
              <div style={{ marginTop: 8, padding: 10, background: 'var(--warning-subtle)', color: 'var(--warning)', borderRadius: 8, fontSize: 12 }}>
                Speech recognition isn't supported here. Try Chrome or Edge for full voice.
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 10 }}>Interview summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: 13 }}>
              <span className="muted">Role</span><span>{window.DEMO_DATA.jd.title}</span>
              <span className="muted">Type</span><span>{config.type}</span>
              <span className="muted">Difficulty</span><span>{config.difficulty}</span>
              <span className="muted">Questions</span><span>{config.questions}</span>
              <span className="muted">Layout</span><span style={{ textTransform: 'capitalize' }}>{layout}</span>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={!canStart} onClick={() => setRoute('interview')}>
            <I.Play className="icon" /> Start voice interview
          </button>
          {!canStart && <div className="tiny" style={{ textAlign: 'center' }}>Complete the mic check first.</div>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ConfigureScreen });
