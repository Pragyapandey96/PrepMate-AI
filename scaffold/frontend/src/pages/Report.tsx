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
  if (error) return <div className="pm-content-page"><div role="alert" className="pm-alert">This report could not be loaded.</div><Link to="/history" className="pm-inline-link">Back to history →</Link></div>;
  if (!data) return <div className="pm-content-page"><div className="pm-card pm-report-state"><span className="pm-eyebrow">Interview report</span><h1 className="pm-page-title">Loading report…</h1></div></div>;
  if (data.status === 'failed') return <div className="pm-content-page"><section className="pm-card pm-report-state"><span className="pm-eyebrow">Interview report</span><h1 className="pm-page-title">Report unavailable.</h1><p className="pm-page-subtitle">The evaluation could not be completed. Your interview remains in history.</p><Link to="/history" className="pm-button pm-button-primary">Back to history →</Link></section></div>;
  if (data.status !== 'evaluated') return <div className="pm-content-page"><section className="pm-card pm-report-state"><span className="pm-eyebrow">Evaluation in progress</span><h1 className="pm-page-title">Preparing your report…</h1><p className="pm-page-subtitle">The AI is analyzing your answers. This page will update automatically.</p></section></div>;
  const ev = data.evaluation || {};
  return <div className="pm-content-page pm-report-page" data-evaluated="true">
    <div className="pm-page-topline"><div className="pm-page-heading"><span className="pm-eyebrow">Performance review</span><h1 className="pm-page-title">Interview report.</h1><p className="pm-page-subtitle">{data.jd?.title || 'Interview'} · {data.type} · {data.difficulty} · {new Date(data.createdAt).toLocaleDateString()}</p></div><Link to="/history" className="pm-inline-link">Interview history →</Link></div>
    <div className="pm-report-overview"><section className="pm-card pm-report-score-card"><span className="pm-metric-label">Overall performance</span><div className="pm-report-score"><strong>{ev.overallScore ?? data.overallScore}</strong><span className="pm-muted">/ 100</span></div><span className="pm-status-pill">Completed evaluation</span></section><section className="pm-card pm-report-breakdown"><h2 className="pm-card-title">Performance breakdown</h2>{Object.entries(ev.scores || {}).map(([key,value])=><div key={key} className="pm-score-row"><div><span className="pm-score-name">{key.replace(/([A-Z])/g,' $1')}</span><span className="pm-score-value">{String(value)}/100</span></div><div className="pm-progress"><span style={{width:`${Math.max(0,Math.min(100,Number(value)))}%`}}/></div></div>)}</section></div>
    <div className="pm-report-columns"><section className="pm-card pm-report-list"><span className="pm-eyebrow">What went well</span><h2 className="pm-card-title">Strengths</h2>{ev.strengths?.length ? <ul>{ev.strengths.map((s:string,i:number)=><li key={i}>{s}</li>)}</ul> : <p className="pm-page-subtitle">No strengths were returned for this session.</p>}</section><section className="pm-card pm-report-list"><span className="pm-eyebrow">Next steps</span><h2 className="pm-card-title">Areas to improve</h2>{ev.weaknesses?.length ? <ul>{ev.weaknesses.map((s:string,i:number)=><li key={i}>{s}</li>)}</ul> : <p className="pm-page-subtitle">No improvement areas were returned for this session.</p>}</section></div>
    {ev.recommendations?.length > 0 && <section className="pm-card pm-report-section"><span className="pm-eyebrow">Keep building</span><h2 className="pm-card-title">Personalized practice plan</h2><div className="pm-recommendations">{ev.recommendations.map((r:any,i:number)=><article key={i}><div><strong>{r.title}</strong><span>{r.area}</span></div><span className="pm-status-pill">{r.priority} priority</span></article>)}</div></section>}
    {ev.questions?.length > 0 && <section className="pm-card pm-report-section"><span className="pm-eyebrow">Detailed feedback</span><h2 className="pm-card-title">Question by question</h2><div className="pm-question-feedback">{ev.questions.map((q:any,i:number)=><article key={i}><div className="pm-feedback-heading"><span>Q{i+1}</span><div><h3>{q.q}</h3><span className="pm-status-pill">Score {q.score}/100</span></div></div><div className="pm-feedback-grid"><p><b>Your answer</b><span>{q.a}</span></p><p><b>What worked</b><span>{q.good}</span></p><p><b>What was missing</b><span>{q.missing}</span></p><p><b>Suggested answer</b><span>{q.better}</span></p></div></article>)}</div></section>}
  </div>;
}
