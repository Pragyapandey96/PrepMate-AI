import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

type DashboardData = { total: number; avg: number; bestTechnical: number; avgCommunication: number; recent: any[]; trend: { date: string; score: number }[] };

function ScoreChart({ points, loading, error }: { points: DashboardData['trend']; loading: boolean; error: string }) {
  if (loading) return <div className="h-48 grid place-items-center text-sm text-neutral-400" role="status">Loading your score trend…</div>;
  if (error) return <div className="h-48 grid place-items-center text-sm text-neutral-400" role="status">Your score trend is unavailable.</div>;
  if (points.length < 2) return <div className="h-48 grid place-items-center text-sm text-neutral-400">Complete at least two interviews to see your score trend.</div>;
  const w = 680, h = 190, pad = 28;
  const x = (i: number) => pad + i * (w - 2 * pad) / (points.length - 1);
  const y = (n: number) => pad + (100 - n) * (h - 2 * pad) / 100;
  const line = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.score)}`).join(' ');
  return <div className="w-full overflow-hidden"><svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48 pm-score-chart" role="img" aria-label="Interview scores over time"><path d={`M ${pad} ${y(100)} H ${w-pad} M ${pad} ${y(50)} H ${w-pad} M ${pad} ${y(0)} H ${w-pad}`} stroke="#e5e7eb" strokeDasharray="4 5" fill="none"/><path d={line} pathLength={1} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{points.map((p,i)=><g key={`${p.date}-${i}`}><circle cx={x(i)} cy={y(p.score)} r="5" fill="var(--accent)"/><text x={x(i)} y={y(p.score)-10} textAnchor="middle" fontSize="11" fill="#4b5563">{p.score}</text></g>)}</svg><div className="flex justify-between text-xs text-neutral-400 px-4">{points.map((p,i)=><span key={`${p.date}-${i}`}>{new Date(p.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span>)}</div></div>;
}

export function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationState = location.state;
  const animateProgressOnEntry = typeof navigationState === 'object'
    && navigationState !== null
    && 'animateProgress' in navigationState
    && navigationState.animateProgress === true;
  const [data, setData] = useState<DashboardData>({ total: 0, avg: 0, bestTechnical: 0, avgCommunication: 0, recent: [], trend: [] });
  const [dataLoaded, setDataLoaded] = useState(false);
  const [animateProgress, setAnimateProgress] = useState(false);
  const [error, setError] = useState('');
  const firstName = (() => { try { return JSON.parse(localStorage.getItem('pm.user') || '{}').name?.split(' ')[0] || ''; } catch { return ''; } })();

  useEffect(() => {
    if (animateProgressOnEntry) {
      navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });
    }
  }, [animateProgressOnEntry, location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    api.getDashboard()
      .then((result) => {
        setData(result);
        setDataLoaded(true);
        setAnimateProgress(animateProgressOnEntry);
      })
      .catch((e) => setError(e.message));
  }, []);
  const cards = [{ label: 'Evaluated interviews', value: data.total }, { label: 'Average score', value: data.total ? `${data.avg}/100` : '—' }, { label: 'Best technical', value: data.bestTechnical ? `${data.bestTechnical}/100` : '—' }, { label: 'Average communication', value: data.avgCommunication ? `${data.avgCommunication}/100` : '—' }];
  return <div className="pm-dashboard" data-loaded={dataLoaded} data-animate-progress={animateProgress}><section className="pm-dashboard-hero"><div><span className="pm-eyebrow">Your practice space</span><h1>Welcome back{firstName ? `, ${firstName}` : ''}.</h1><p>Review your interviews, see your score trend, and choose what to practice next.</p></div><Link to="/resume?flow=interview" className="pm-button pm-button-primary">Start new interview →</Link></section>
    {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
    <div className="pm-stat-grid">{cards.map((c,i)=><section key={c.label} className="pm-card pm-stat-card"><div className="pm-metric-label">{c.label}</div><div className="pm-metric-value">{c.value}</div><div className="pm-stat-foot">{i === 0 ? 'Saved evaluations' : 'Based on completed interviews'}</div></section>)}</div>
    <div className="pm-dashboard-columns"><section className="pm-card pm-panel"><div className="pm-panel-head"><div><h2 className="pm-card-title">Your progress</h2><p className="pm-page-subtitle">Overall score from each evaluated interview.</p></div><Link to="/history">View history →</Link></div><div className="mt-4"><ScoreChart points={data.trend} loading={!dataLoaded && !error} error={error}/></div></section>
      <section className="pm-card pm-panel"><div className="pm-panel-head"><div><h2 className="pm-card-title">Quick start</h2><p className="pm-page-subtitle">Prepare your next practice session.</p></div></div><div className="pm-quick-links"><Link to="/resume?flow=interview"><strong>Configure an interview</strong><span>Choose materials, track, difficulty, and question count</span></Link><Link to="/resume"><strong>Upload a resume</strong><span>Add your experience to guide practice</span></Link><Link to="/jd"><strong>Analyze a job description</strong><span>Tailor questions to a role</span></Link></div></section></div>
    <section className="pm-card pm-activity"><div className="pm-panel pm-panel-head"><div><h2 className="pm-card-title">Recent activity</h2><p className="pm-page-subtitle">Your saved interview practice sessions.</p></div><Link to="/history">Full history →</Link></div>{data.recent.length ? <div className="overflow-x-auto"><table className="pm-table"><thead><tr><th>Session</th><th>Date</th><th>Track</th><th>Score</th><th>Report</th></tr></thead><tbody>{data.recent.map(i=><tr key={i._id}><td><strong>{i.jdId?.title || 'Interview'}</strong></td><td>{new Date(i.createdAt).toLocaleDateString()}</td><td><span className="pm-status-pill">{i.type}</span></td><td className="mono">{i.overallScore}/100</td><td><Link to={`/report/${i._id}`}>View report →</Link></td></tr>)}</tbody></table></div>:<div className="py-8 text-center text-sm text-neutral-400">Finish an interview to see your progress here.</div>}</section>
  </div>;
}
