function JDScreen({ setRoute }) {
  const I = window.Icon;
  const jd = window.DEMO_DATA.jd;
  const resume = window.DEMO_DATA.resume;
  const [analyzed, setAnalyzed] = React.useState(true);
  const [text, setText] = React.useState(jd.summary + '\n\nRequirements:\n- ' + jd.required.join('\n- '));

  const matched = jd.required.filter(sk =>
    resume.skills.some(rs => rs.toLowerCase().includes(sk.toLowerCase().split(' ')[0]) || sk.toLowerCase().includes(rs.toLowerCase()))
  );
  const missing = jd.required.filter(sk => !matched.includes(sk));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Job description</h1>
          <p className="page-subtitle">Paste the role you're preparing for. PrepMate will match it to your resume.</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setRoute('resume')}><I.ArrowLeft className="icon" /> Back</button>
          <button className="btn btn-primary" onClick={() => setRoute('configure')}>Continue <I.ArrowRight className="icon" /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 className="card-title">Paste job description</h3>
            <div className="segmented">
              <button className="active">Paste</button>
              <button>Upload file</button>
              <button>URL</button>
            </div>
          </div>
          <textarea
            className="textarea"
            rows="14"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste the job description here..."
          />
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <span className="tiny">{text.length} characters</span>
            <button className="btn btn-primary btn-sm" onClick={() => setAnalyzed(true)}>
              <I.Sparkle className="icon" /> Analyze
            </button>
          </div>
        </div>

        {analyzed && (
          <div className="col">
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{jd.title}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{jd.company} · {jd.location} · {jd.experience}</div>
                </div>
                <span className="badge success"><I.Check className="icon" style={{ width: 12, height: 12 }} /> Analyzed</span>
              </div>
              <hr className="divider" />
              <div className="label" style={{ marginBottom: 6 }}>Required skills</div>
              <div style={{ marginBottom: 12 }}>
                {jd.required.map(s => (
                  <span key={s} className={'chip ' + (matched.includes(s) ? 'accent' : '')} style={!matched.includes(s) ? { borderStyle: 'dashed' } : {}}>
                    {matched.includes(s) && <I.Check style={{ width: 11, height: 11, marginRight: 4, color: 'var(--accent-text)' }} />}
                    {s}
                  </span>
                ))}
              </div>
              <div className="label" style={{ marginBottom: 6 }}>Nice to have</div>
              <div>
                {jd.preferred.map(s => <span key={s} className="chip">{s}</span>)}
              </div>
            </div>

            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 10 }}>Resume ↔ Role match</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div className="tiny" style={{ marginBottom: 4 }}>Match score</div>
                  <div className="mono" style={{ fontSize: 28, fontWeight: 500, color: 'var(--success)' }}>
                    {Math.round(matched.length / jd.required.length * 100)}<span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>%</span>
                  </div>
                </div>
                <div>
                  <div className="tiny" style={{ marginBottom: 4 }}>Gaps to address</div>
                  <div className="mono" style={{ fontSize: 28, fontWeight: 500, color: missing.length ? 'var(--warning)' : 'var(--success)' }}>
                    {missing.length}
                  </div>
                </div>
              </div>
              {missing.length > 0 && (
                <div style={{ marginTop: 10, padding: 10, background: 'var(--warning-subtle)', borderRadius: 8, fontSize: 12.5, color: 'var(--warning)' }}>
                  Focus areas: {missing.join(', ')}. PrepMate will probe these in the interview.
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 10 }}>Responsibilities</h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {jd.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { JDScreen });
