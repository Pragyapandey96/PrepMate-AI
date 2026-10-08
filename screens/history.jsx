function HistoryScreen({ setRoute }) {
  const I = window.Icon;
  const d = window.DEMO_DATA;
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Interview history</h1>
          <p className="page-subtitle">All your previous PrepMate interviews.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setRoute('configure')}><I.Plus className="icon"/> New interview</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th><th>Role</th><th>Type</th><th>Difficulty</th>
              <th style={{ textAlign: 'right' }}>Score</th><th></th>
            </tr>
          </thead>
          <tbody>
            {d.history.map(row => (
              <tr key={row.id}>
                <td className="mono muted" style={{ fontSize: 12.5 }}>{row.date}</td>
                <td style={{ fontWeight: 500 }}>{row.role}</td>
                <td><span className="badge">{row.type}</span></td>
                <td><span className="badge">{row.difficulty}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <span className={'badge ' + (row.score >= 80 ? 'success' : row.score >= 70 ? 'accent' : 'warning')}>{row.score}</span>
                </td>
                <td style={{ textAlign: 'right', width: 120 }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setRoute('report')}>Open <I.ArrowRight className="icon"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
Object.assign(window, { HistoryScreen });
