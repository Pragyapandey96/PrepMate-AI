function Dashboard({ setRoute }) {
  const I = window.Icon;
  const d = window.DEMO_DATA;
  const scores = d.history.map(h => h.score).reverse();
  const avg = Math.round(scores.reduce((a,b)=>a+b,0) / scores.length);

  const trendChart = () => {
    const w = 640, h = 160, pad = 24;
    const max = 100, min = 40;
    const xs = scores.map((_, i) => pad + (i * (w - pad*2) / (scores.length - 1)));
    const ys = scores.map(s => pad + (h - pad*2) * (1 - (s - min) / (max - min)));
    const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
    const area = `${path} L ${xs[xs.length-1].toFixed(1)} ${h - pad} L ${xs[0].toFixed(1)} ${h - pad} Z`;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 160 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map(v => {
          const y = pad + (h - pad*2) * (1 - (v - min) / (max - min));
          if (v < min) return null;
          return <line key={v} x1={pad} x2={w-pad} y1={y} y2={y} stroke="var(--border)" strokeDasharray="2 3" />;
        })}
        <path d={area} fill="url(#trendFill)" />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        {xs.map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={ys[i]} r="3" fill="var(--bg-elevated)" stroke="var(--accent)" strokeWidth="1.5" />
          </g>
        ))}
        {xs.map((x, i) => (
          <text key={'lb'+i} x={x} y={h - 4} textAnchor="middle" fontSize="10" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">
            {d.history[d.history.length - 1 - i].date.split(',')[0]}
          </text>
        ))}
      </svg>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {d.candidate.name.split(' ')[0]}</h1>
          <p className="page-subtitle">You have completed {d.history.length} interviews. Your average score is {avg}.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setRoute('configure')}>
          <I.Plus className="icon" /> Start new interview
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">Total interviews</div>
          <div className="stat-value">{d.history.length}</div>
          <div className="stat-delta">+2 vs last month</div>
        </div>
        <div className="stat">
          <div className="stat-label">Average score</div>
          <div className="stat-value">{avg}<span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}> / 100</span></div>
          <div className="stat-delta">+6 vs last month</div>
        </div>
        <div className="stat">
          <div className="stat-label">Best technical</div>
          <div className="stat-value">88</div>
          <div className="stat-delta flat">— unchanged</div>
        </div>
        <div className="stat">
          <div className="stat-label">Communication</div>
          <div className="stat-value">74</div>
          <div className="stat-delta down">−3 vs last month</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Score trend</h3>
            <div className="segmented">
              <button className="active">Last 5</button>
              <button>30d</button>
              <button>All</button>
            </div>
          </div>
          {trendChart()}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Skills coverage</h3>
          </div>
          {[
            { name: 'REST APIs', pct: 92 },
            { name: 'System design', pct: 78 },
            { name: 'SQL / databases', pct: 64 },
            { name: 'Behavioral (STAR)', pct: 58 },
            { name: 'Communication', pct: 74 },
          ].map(s => (
            <div key={s.name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6, gap: 8 }}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                <span className="mono muted" style={{ flex: 'none' }}>{s.pct}</span>
              </div>
              <div className="progress" style={{ height: 4 }}><div className="progress-fill" style={{ width: s.pct + '%' }}/></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h3 className="card-title">Recent interviews</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => setRoute('history')}>
            View all <I.ArrowRight className="icon" />
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Role</th>
              <th>Type</th>
              <th>Difficulty</th>
              <th style={{ textAlign: 'right' }}>Score</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {d.history.map(row => (
              <tr key={row.id}>
                <td className="mono muted" style={{ fontSize: 12.5 }}>{row.date}</td>
                <td style={{ fontWeight: 500 }}>{row.role}</td>
                <td><span className="badge">{row.type}</span></td>
                <td><span className="badge">{row.difficulty}</span></td>
                <td style={{ textAlign: 'right' }} className="mono">
                  <span className={'badge ' + (row.score >= 80 ? 'success' : row.score >= 70 ? 'accent' : 'warning')}>
                    {row.score}
                  </span>
                </td>
                <td style={{ textAlign: 'right', width: 100 }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setRoute('report')}>Open <I.ArrowRight className="icon" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
