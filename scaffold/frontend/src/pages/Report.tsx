import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';

export function Report() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const result = await api.getReport(id!);
        if (cancelled) return;
        setData(result); setError('');
        if (result.status === 'ended' || result.status === 'in_progress' || result.status === 'created') timer = window.setTimeout(poll, 2000);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load this report.'); }
    };
    poll();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [id]);
  if (error) return <div className="p-8"><p role="alert" className="text-red-600">This report could not be loaded.</p><Link to="/history" className="text-accent-text">Back to history</Link></div>;
  if (!data) return <div className="p-8 text-neutral-500">Loading report…</div>;
  if (data.status === 'failed') return <div className="p-8"><h1 className="text-2xl font-semibold">AI report unavailable</h1><p className="mt-2 text-neutral-500">The evaluation could not be completed. Your interview remains in history.</p><Link to="/history" className="inline-block mt-4 text-accent-text">Back to history</Link></div>;
  if (data.status !== 'evaluated') return <div className="p-8"><h1 className="text-2xl font-semibold">Preparing your report…</h1><p className="mt-2 text-neutral-500">The AI is analyzing your answers. This page will update automatically.</p></div>;
  const ev = data.evaluation || {};
  return <div className="p-8 max-w-5xl">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Interview report</h1><p className="text-neutral-500 mt-1">{data.jd?.title || 'Interview'} · {data.type} · {data.difficulty} · {new Date(data.createdAt).toLocaleDateString()}</p></div><Link to="/history" className="text-sm text-accent-text">Interview history →</Link></div>
    <div className="grid md:grid-cols-[1fr_2fr] gap-4 mt-6"><section className="bg-white border rounded-lg p-6"><div className="text-sm text-neutral-500">Overall performance</div><div className="mono text-6xl font-medium mt-2">{ev.overallScore ?? data.overallScore}<span className="text-2xl text-neutral-400">/100</span></div></section><section className="bg-white border rounded-lg p-5"><h2 className="font-medium mb-3">Performance breakdown</h2>{Object.entries(ev.scores || {}).map(([key, value])=><div key={key} className="mb-3"><div className="flex justify-between text-sm"><span className="capitalize">{key.replace(/([A-Z])/g,' $1')}</span><span className="mono">{String(value)}/100</span></div><div className="h-1.5 bg-neutral-100 rounded mt-1"><div className="h-full bg-accent rounded" style={{width:`${Math.max(0,Math.min(100,Number(value)))}%`}}/></div></div>)}</section></div>
    <div className="grid md:grid-cols-2 gap-4 mt-4"><section className="bg-white border rounded-lg p-5"><h2 className="font-medium text-emerald-700 mb-3">Strengths</h2><ul className="text-sm list-disc pl-5 space-y-2">{(ev.strengths || []).map((s:string,i:number)=><li key={i}>{s}</li>)}</ul></section><section className="bg-white border rounded-lg p-5"><h2 className="font-medium text-amber-700 mb-3">Areas to improve</h2><ul className="text-sm list-disc pl-5 space-y-2">{(ev.weaknesses || []).map((s:string,i:number)=><li key={i}>{s}</li>)}</ul></section></div>
    {ev.recommendations?.length > 0 && <section className="bg-white border rounded-lg p-5 mt-4"><h2 className="font-medium mb-3">Personalized practice plan</h2><div className="divide-y">{ev.recommendations.map((r:any,i:number)=><div key={i} className="py-3 flex justify-between gap-4"><div><div className="text-sm font-medium">{r.title}</div><div className="text-xs text-neutral-500 mt-1">{r.area}</div></div><span className="text-xs text-neutral-500">{r.priority} priority</span></div>)}</div></section>}
    {ev.questions?.length > 0 && <section className="bg-white border rounded-lg p-5 mt-4"><h2 className="font-medium mb-3">Question by question feedback</h2><div className="space-y-4">{ev.questions.map((q:any,i:number)=><article key={i} className="border-t pt-4"><div className="flex gap-3"><span className="mono text-xs text-neutral-400">Q{i+1}</span><div className="flex-1"><h3 className="text-sm font-medium">{q.q}</h3><p className="text-xs text-neutral-500 mt-2">Score: {q.score}/100</p><div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm"><p><b>Your answer</b><br/><span className="text-neutral-600">{q.a}</span></p><p><b>What worked</b><br/><span className="text-neutral-600">{q.good}</span></p><p><b>What was missing</b><br/><span className="text-neutral-600">{q.missing}</span></p><p><b>Suggested answer</b><br/><span className="text-neutral-600">{q.better}</span></p></div></div></div></article>)}</div></section>}
  </div>;
}
