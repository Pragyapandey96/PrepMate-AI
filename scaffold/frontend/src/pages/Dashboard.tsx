import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

type DashboardData = { total: number; avg: number; bestTechnical: number; avgCommunication: number; recent: any[]; trend: { date: string; score: number }[] };

function ScoreChart({ points }: { points: DashboardData['trend'] }) {
  if (points.length < 2) return <div className="h-48 grid place-items-center text-sm text-neutral-400">Complete at least two interviews to see your score trend.</div>;
  const w = 680, h = 190, pad = 28;
  const x = (i: number) => pad + i * (w - 2 * pad) / (points.length - 1);
  const y = (n: number) => pad + (100 - n) * (h - 2 * pad) / 100;
  const line = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.score)}`).join(' ');
  return <div className="w-full overflow-hidden"><svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48" role="img" aria-label="Interview scores over time"><path d={`M ${pad} ${y(100)} H ${w-pad} M ${pad} ${y(50)} H ${w-pad} M ${pad} ${y(0)} H ${w-pad}`} stroke="#e5e7eb" strokeDasharray="4 5" fill="none"/><path d={line} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{points.map((p,i)=><g key={`${p.date}-${i}`}><circle cx={x(i)} cy={y(p.score)} r="5" fill="var(--accent)"/><text x={x(i)} y={y(p.score)-10} textAnchor="middle" fontSize="11" fill="#4b5563">{p.score}</text></g>)}</svg><div className="flex justify-between text-xs text-neutral-400 px-4">{points.map((p,i)=><span key={`${p.date}-${i}`}>{new Date(p.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span>)}</div></div>;
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData>({ total: 0, avg: 0, bestTechnical: 0, avgCommunication: 0, recent: [], trend: [] });
  const [error, setError] = useState('');
  useEffect(() => { api.getDashboard().then(setData).catch(e => setError(e.message)); }, []);
  const cards = [{ label: 'Evaluated interviews', value: data.total }, { label: 'Average score', value: data.total ? `${data.avg}/100` : '—' }, { label: 'Best technical', value: data.bestTechnical ? `${data.bestTechnical}/100` : '—' }, { label: 'Average communication', value: data.avgCommunication ? `${data.avgCommunication}/100` : '—' }];
  return <div className="p-8 max-w-6xl"><div className="flex items-start justify-between"><div><h1 className="text-2xl font-semibold">Dashboard</h1><p className="text-neutral-500 mt-1">Your interview practice and progress, based on completed AI evaluations.</p></div><Link to="/configure" className="px-3 py-2 rounded-md bg-accent text-white text-sm">Start interview</Link></div>
    {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">{cards.map(c=><section key={c.label} className="bg-white border rounded-lg p-4"><div className="text-xs text-neutral-500">{c.label}</div><div className="mono text-2xl font-medium mt-2">{c.value}</div></section>)}</div>
    <section className="bg-white border rounded-lg p-5 mt-4"><div className="flex justify-between items-center"><div><h2 className="font-medium">Progress report</h2><p className="text-xs text-neutral-500 mt-1">Overall score from each evaluated interview</p></div><Link className="text-sm text-accent-text hover:underline" to="/history">All interviews →</Link></div><div className="mt-4"><ScoreChart points={data.trend}/></div></section>
    <section className="bg-white border rounded-lg p-5 mt-4"><div className="flex justify-between items-center mb-3"><h2 className="font-medium">Recent interviews</h2><Link to="/history" className="text-sm text-accent-text hover:underline">History →</Link></div>{data.recent.length ? <div className="divide-y">{data.recent.map(i=><div key={i._id} className="py-3 flex items-center gap-4 text-sm"><div className="text-xs text-neutral-500 w-24">{new Date(i.createdAt).toLocaleDateString()}</div><div className="flex-1">{i.jdId?.title || 'Interview'} <span className="text-xs text-neutral-400">· {i.type}</span></div><span className="mono">{i.overallScore}/100</span><Link to={`/report/${i._id}`} className="text-accent-text">Report</Link></div>)}</div>:<div className="py-8 text-center text-sm text-neutral-400">Finish an interview to see your actual progress here.</div>}</section>
  </div>;
}
