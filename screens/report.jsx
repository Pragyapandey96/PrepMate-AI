function ReportScreen({ report, variant, setRoute }) {
  const I = window.Icon;
  const r = report || window.DEMO_DATA.sampleReport;
  const [openQ, setOpenQ] = React.useState(0);
  const scoreLabels = [
    { key: 'technical', label: 'Technical Knowledge' },
    { key: 'communication', label: 'Communication' },
    { key: 'problemSolving', label: 'Problem Solving' },
    { key: 'relevance', label: 'Answer Relevance' },
    { key: 'resumeKnowledge', label: 'Resume Knowledge' },
    { key: 'jobFit', label: 'Job Fit' },
    { key: 'completeness', label: 'Completeness' },
    { key: 'confidence', label: 'Confidence & Clarity' },
  ];

  const radarChart = () => {
    const size = 260, cx = size/2, cy = size/2, R = 92;
    const axes = scoreLabels.slice(0, 6); // 6-axis radar reads best
    const angleFor = (i) => -Math.PI/2 + i * (2*Math.PI / axes.length);
    const pointFor = (i, val) => {
      const a = angleFor(i);
      const rad = R * (val / 100);
      return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
    };
    const rings = [0.25, 0.5, 0.75, 1];
    const ringPath = (frac) => axes.map((_, i) => {
      const a = angleFor(i);
      const [x, y] = [cx + R * frac * Math.cos(a), cy + R * frac * Math.sin(a)];
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ') + ' Z';
    const dataPath = axes.map((ax, i) => {
      const [x, y] = pointFor(i, r.scores[ax.key] || 0);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ') + ' Z';

    return (
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: 280 }}>
        {rings.map(f => (
          <path key={f} d={ringPath(f)} fill="none" stroke="var(--border)" strokeWidth="1" />
        ))}
        {axes.map((_, i) => {
          const a = angleFor(i);
          const x2 = cx + R * Math.cos(a), y2 = cy + R * Math.sin(a);
          return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="var(--border)" strokeWidth="1" />;
        })}
        <path d={dataPath} fill="var(--accent)" fillOpacity="0.18" stroke="var(--accent)" strokeWidth="1.5" />
        {axes.map((ax, i) => {
          const [x, y] = pointFor(i, r.scores[ax.key] || 0);
          return <circle key={ax.key} cx={x} cy={y} r="3" fill="var(--accent)" />;
        })}
        {axes.map((ax, i) => {
          const a = angleFor(i);
          const lx = cx + (R + 22) * Math.cos(a);
          const ly = cy + (R + 22) * Math.sin(a);
          return (
            <text key={'l'+ax.key} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="10.5" fill="var(--text-secondary)">
              {ax.label.split(' ')[0]}
            </text>
          );
        })}
      </svg>
    );
  };

  const sparkHistory = () => {
    const scores = [64, 68, 71, 76, 82, r.overallScore];
    const h = 48, w = 180;
    const max = 100, min = 50;
    const xs = scores.map((_, i) => (i * (w-8) / (scores.length - 1)) + 4);
    const ys = scores.map(s => 4 + (h-8) * (1 - (s - min) / (max - min)));
    const path = xs.map((x, i) => `${i===0?'M':'L'} ${x} ${ys[i]}`).join(' ');
    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h }}>
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r={i === xs.length - 1 ? 3 : 2}
                  fill={i === xs.length - 1 ? 'var(--accent)' : 'var(--bg-elevated)'}
                  stroke="var(--accent)" strokeWidth={i === xs.length - 1 ? 0 : 1.5} />
        ))}
      </svg>
    );
  };

  // ===== Variant B: compact scorecard =====
  if (variant === 'compact') {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Interview report</h1>
            <p className="page-subtitle">{r.role} · {r.type} · {r.difficulty} · {r.date} · {r.durationMin} min</p>
          </div>
          <div className="row">
            <button className="btn" onClick={() => setRoute('history')}>All reports</button>
            <button className="btn"><I.Download className="icon" /> Export PDF</button>
            <button className="btn btn-primary" onClick={() => setRoute('configure')}><I.Play className="icon" /> Retry</button>
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', gap: 32, alignItems: 'center' }}>
            <div>
              <div className="score-big-label">Overall</div>
              <div className="score-big-value">{r.overallScore}<span className="out-of"> / 100</span></div>
              <div className="badge success" style={{ marginTop: 8 }}>
                <I.Check className="icon" style={{ width: 12, height: 12 }}/> Above target
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {scoreLabels.map(s => (
                <div key={s.key}>
                  <div className="tiny" style={{ marginBottom: 2 }}>{s.label}</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 500 }}>{r.scores[s.key]}</div>
                  <div className="score-cell-bar"><div className="score-cell-bar-fill" style={{ width: r.scores[s.key] + '%' }}/></div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="tiny" style={{ marginBottom: 4 }}>Last 6 interviews</div>
              {sparkHistory()}
              <div className="mono tiny" style={{ marginTop: 4 }}>+{r.overallScore - 64} vs first</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 10, color: 'var(--success)' }}>Strengths</h3>
            {r.strengths.map((s, i) => (
              <div key={i} className="row" style={{ padding: '6px 0', alignItems: 'flex-start' }}>
                <I.Check style={{ width: 14, height: 14, color: 'var(--success)', marginTop: 3, flex: 'none' }}/>
                <span style={{ fontSize: 13.5 }}>{s}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 10, color: 'var(--warning)' }}>To improve</h3>
            {r.weaknesses.map((w, i) => (
              <div key={i} className="row" style={{ padding: '6px 0', alignItems: 'flex-start' }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--warning-subtle)', color: 'var(--warning)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, marginTop: 3, flex: 'none' }}>!</div>
                <span style={{ fontSize: 13.5 }}>{w}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Personalized practice plan</h3>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {r.recommendations.map((rec, i) => (
              <div key={i} className="row" style={{ padding: '10px 0', borderTop: i > 0 ? '1px solid var(--border)' : '' }}>
                <div className="mono tiny" style={{ minWidth: 24 }}>0{i+1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{rec.title}</div>
                  <div className="tiny">{rec.area}</div>
                </div>
                <span className={'badge ' + (rec.priority === 'High' ? 'danger' : rec.priority === 'Medium' ? 'warning' : '')}>{rec.priority}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===== Variant A: detailed =====
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Interview report</h1>
          <p className="page-subtitle">{r.role} · {r.type} · {r.difficulty} · {r.date} · {r.durationMin} min · {r.questionsAsked} questions</p>
        </div>
        <div className="row">
          <button className="btn"><I.Download className="icon" /> Export PDF</button>
          <button className="btn btn-primary" onClick={() => setRoute('configure')}><I.Play className="icon" /> Practice again</button>
        </div>
      </div>

      <div className="report-hero">
        <div className="score-big">
          <div>
            <div className="score-big-label">Overall performance</div>
            <div className="score-big-value">{r.overallScore}<span className="out-of"> / 100</span></div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className="badge success"><I.Check className="icon" style={{ width: 12, height: 12 }}/> Above target</span>
            <span className="badge">+{r.overallScore - 64} vs first attempt</span>
          </div>
        </div>
        <div className="score-big" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="radar-wrap" style={{ flex: '0 0 260px' }}>{radarChart()}</div>
            <div style={{ flex: 1, alignSelf: 'center' }}>
              <div className="tiny" style={{ marginBottom: 8 }}>Score breakdown</div>
              {scoreLabels.slice(0, 6).map(s => (
                <div key={s.key} className="row" style={{ padding: '3px 0', gap: 8 }}>
                  <span style={{ fontSize: 12, flex: 1 }}>{s.label}</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 500, minWidth: 24, textAlign: 'right' }}>{r.scores[s.key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="score-grid" style={{ marginBottom: 16 }}>
        {scoreLabels.map(s => (
          <div key={s.key} className="score-cell">
            <div className="score-cell-label">{s.label}</div>
            <div className="score-cell-value">{r.scores[s.key]}<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>/100</span></div>
            <div className="score-cell-bar"><div className="score-cell-bar-fill" style={{ width: r.scores[s.key] + '%' }}/></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 12 }}>What you did well</h3>
          {r.strengths.map((s, i) => (
            <div key={i} className="row" style={{ padding: '8px 0', borderTop: i > 0 ? '1px solid var(--border)' : '', alignItems: 'flex-start' }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--success-subtle)', color: 'var(--success)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                <I.Check style={{ width: 12, height: 12 }}/>
              </div>
              <span style={{ fontSize: 13.5, lineHeight: 1.55 }}>{s}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 12 }}>What to work on</h3>
          {r.weaknesses.map((w, i) => (
            <div key={i} className="row" style={{ padding: '8px 0', borderTop: i > 0 ? '1px solid var(--border)' : '', alignItems: 'flex-start' }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--warning-subtle)', color: 'var(--warning)', display: 'grid', placeItems: 'center', flex: 'none', fontSize: 12, fontWeight: 700 }}>!</div>
              <span style={{ fontSize: 13.5, lineHeight: 1.55 }}>{w}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3 className="card-title">Personalized improvement plan</h3>
          <span className="tiny">Based on this interview's weaknesses</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {r.recommendations.map((rec, i) => (
            <div key={i} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <span className={'badge ' + (rec.priority === 'High' ? 'danger' : rec.priority === 'Medium' ? 'warning' : '')}>Priority {i+1} · {rec.priority}</span>
                <span className="tiny mono">{rec.area}</span>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{rec.title}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Question-by-question analysis</h3>
          <span className="tiny">{r.questions.length} questions · click to expand</span>
        </div>
        {r.questions.map((q, i) => (
          <div key={i} className="q-item">
            <div className="q-head" onClick={() => setOpenQ(openQ === i ? -1 : i)}>
              <div className="q-num">Q{i+1}</div>
              <div className="q-text">{q.q}</div>
              <div className="q-score">
                <span className={'badge ' + (q.score >= 80 ? 'success' : q.score >= 65 ? 'accent' : 'warning')}>{q.score}</span>
              </div>
            </div>
            {openQ === i && (
              <div className="q-body">
                <div>
                  <div className="q-fb-label">Your answer</div>
                  <div className="q-answer">{q.a}</div>
                </div>
                <div>
                  <div className="q-fb-label" style={{ color: 'var(--success)' }}>What was good</div>
                  <div>{q.good}</div>
                </div>
                <div>
                  <div className="q-fb-label" style={{ color: 'var(--warning)' }}>What was missing</div>
                  <div>{q.missing}</div>
                </div>
                <div>
                  <div className="q-fb-label" style={{ color: 'var(--accent-text)' }}>Suggested better answer</div>
                  <div style={{ padding: '10px 12px', background: 'var(--accent-subtle)', borderLeft: '2px solid var(--accent)', borderRadius: '0 6px 6px 0', color: 'var(--text)' }}>{q.better}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ReportScreen });
