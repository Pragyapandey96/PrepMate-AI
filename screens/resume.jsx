function ResumeScreen({ setRoute }) {
  const I = window.Icon;
  const r = window.DEMO_DATA.resume;
  const [uploaded, setUploaded] = React.useState(true); // pre-filled for demo

  if (!uploaded) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Resume</h1>
            <p className="page-subtitle">Upload your resume so the AI can personalize your interview.</p>
          </div>
        </div>
        <div className="card" style={{ padding: 48, textAlign: 'center', borderStyle: 'dashed' }}>
          <I.Upload className="icon" style={{ width: 32, height: 32, color: 'var(--text-tertiary)', margin: '0 auto 12px' }}/>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Drop your resume here</div>
          <div className="muted" style={{ marginBottom: 20 }}>PDF or DOCX · max 5 MB</div>
          <button className="btn btn-primary" onClick={() => setUploaded(true)}>Choose file</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Resume</h1>
          <p className="page-subtitle">Parsed from {r.filename}. Edit anything the AI got wrong.</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setUploaded(false)}><I.Upload className="icon" /> Replace</button>
          <button className="btn btn-primary" onClick={() => setRoute('jd')}>Continue <I.ArrowRight className="icon" /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div className="col">
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{r.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>{r.headline} · {r.location}</div>
              </div>
              <span className="badge success"><I.Check className="icon" style={{ width: 12, height: 12 }} /> Parsed</span>
            </div>
            <hr className="divider" />
            <div className="label" style={{ marginBottom: 8 }}>Skills detected</div>
            <div>
              {r.skills.map(s => <span key={s} className="chip accent">{s}</span>)}
              <span className="chip"><I.Plus className="icon" style={{ width: 10, height: 10, marginRight: 3 }}/> Add</span>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Experience</h3>
            {r.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: i < r.experience.length - 1 ? 16 : 0 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 500 }}>{e.role} · <span className="muted" style={{ fontWeight: 400 }}>{e.company}</span></div>
                  <div className="mono tiny">{e.dates}</div>
                </div>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 13 }}>
                  {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Projects</h3>
            {r.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: i < r.projects.length - 1 ? 12 : 0 }}>
                <div style={{ fontWeight: 500 }}>{p.name} <span className="muted mono" style={{ fontSize: 12, fontWeight: 400 }}>· {p.stack}</span></div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{p.blurb}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col">
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Education</h3>
            {r.education.map((e, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 500 }}>{e.school}</div>
                <div className="muted" style={{ fontSize: 13 }}>{e.degree}</div>
                <div className="mono tiny">{e.dates} · {e.detail}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 8 }}>Certifications</h3>
            {r.certifications.map(c => (
              <div key={c} className="row" style={{ padding: '6px 0' }}>
                <I.Check className="icon" style={{ color: 'var(--success)', width: 14, height: 14 }} />
                <span style={{ fontSize: 13 }}>{c}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ background: 'var(--accent-subtle)', borderColor: 'var(--accent-border)' }}>
            <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <I.Sparkle className="icon" style={{ color: 'var(--accent-text)', marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 500, color: 'var(--accent-text)', fontSize: 13 }}>Ready to personalize</div>
                <div style={{ fontSize: 12.5, color: 'var(--accent-text)', marginTop: 4, lineHeight: 1.5 }}>
                  Add your target job description next — PrepMate will match your skills against the role and tailor every question.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ResumeScreen });
