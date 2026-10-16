import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export function History() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { api.listInterviews().then(setItems).catch(e => setError(e.message)); }, []);
  return <div className="pm-content-page"><div className="pm-page-topline"><div className="pm-page-heading"><span className="pm-eyebrow">Your practice archive</span><h1 className="pm-page-title">Interview history.</h1><p className="pm-page-subtitle">Review saved sessions and open completed AI reports.</p></div><Link to="/resume?flow=interview" className="pm-button pm-button-primary">New interview →</Link></div>
    {error && <div role="alert" className="pm-alert">We couldn’t load your interview history. {error}</div>}
    <section className="pm-card pm-history-card"><div className="pm-panel-head"><div><h2 className="pm-card-title">All sessions</h2><p className="pm-page-subtitle">{items.length} {items.length === 1 ? 'session' : 'sessions'}</p></div></div><div className="overflow-x-auto"><table className="pm-table"><thead><tr><th>Session date</th><th>Role</th><th>Interview track</th><th>Difficulty</th><th>Status</th><th>Report</th></tr></thead><tbody>
      {items.map(i => <tr key={i._id}><td>{new Date(i.createdAt).toLocaleDateString()}</td><td><strong>{i.jdId?.title || 'Interview'}</strong></td><td>{i.type}</td><td>{i.difficulty}</td><td><span className="pm-status-pill">{i.status.replace('_', ' ')}</span></td><td>{i.status === 'evaluated' ? <Link to={`/report/${i._id}`}>View report · {i.overallScore}</Link> : <span className="pm-muted">Not ready</span>}</td></tr>)}
      {!items.length && <tr><td colSpan={6} className="pm-empty-cell">No interviews recorded yet. Start a practice session to see it here.</td></tr>}
    </tbody></table></div></section>
  </div>;
}
