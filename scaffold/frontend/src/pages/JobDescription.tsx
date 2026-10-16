import { useState } from 'react';
import { api } from '../services/api';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { readInterviewSetupDraft, saveInterviewSetupDraft } from '../services/interview-setup';

export function JobDescription() {
  const [searchParams] = useSearchParams();
  const interviewFlow = searchParams.get('flow') === 'interview';
  const savedDraft = readInterviewSetupDraft();
  const hasResume = Boolean(localStorage.getItem('pm.resumeId'));
  const [text, setText] = useState(savedDraft.jobDescriptionText);
  const [analyzed, setAnalyzed] = useState<any>(() => {
    const jdId = localStorage.getItem('pm.jdId');
    return jdId && savedDraft.jobTitle ? { id: jdId, title: savedDraft.jobTitle } : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const resumePath = interviewFlow ? '/resume?flow=interview' : '/resume';
  const configurePath = interviewFlow ? '/configure?flow=interview' : '/configure';

  function updateText(value: string) {
    setText(value);
    if (value !== text) {
      localStorage.removeItem('pm.jdId');
      setAnalyzed(null);
    }
    saveInterviewSetupDraft({ jobDescriptionText: value, jobTitle: undefined });
  }

  async function analyze() {
    if (loading) return;
    if (!text.trim()) {
      setError('Enter a job description before analyzing it.');
      return;
    }
    if (text.trim().length < 50) {
      setError('Enter at least 50 characters in the job description.');
      return;
    }
    if (interviewFlow && !hasResume) {
      setError('Upload a resume before adding a job description.');
      return;
    }
    setLoading(true); setError('');
    try {
      const r = await api.analyzeJD(text.trim());
      setAnalyzed(r);
      localStorage.setItem('pm.jdId', r.id);
      saveInterviewSetupDraft({ jobDescriptionText: text, jobTitle: r.title });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to analyze this job description.'); }
    finally { setLoading(false); }
  }

  return <div className="pm-content-page"><div className="pm-page-heading"><span className="pm-eyebrow">{interviewFlow ? 'Interview setup　/　02 of 3' : 'Your materials　/　02'}</span><h1 className="pm-page-title">Choose a role to target.</h1><p className="pm-page-subtitle">Paste a job description to extract its role and skills for your interview practice.</p></div>
    {interviewFlow && !hasResume && <div role="alert" className="pm-alert">Upload a resume first to continue this interview setup. <Link to={resumePath}>Go to resume upload →</Link></div>}
    <section className="pm-card pm-jd-card"><label htmlFor="job-description" className="pm-jd-label">Job description text</label><textarea id="job-description" required aria-describedby="job-description-help" value={text} onChange={e => updateText(e.target.value)} placeholder="Paste the job description here…"/><div className="pm-jd-actions"><span id="job-description-help">{text.trim() ? `${text.trim().length} characters · at least 50 required` : 'Job description is required · at least 50 characters required'}</span><button onClick={analyze} disabled={loading || Boolean(analyzed) || text.trim().length < 50 || (interviewFlow && !hasResume)} className="pm-button pm-button-primary">{loading ? 'Analyzing…' : analyzed ? 'Job description analyzed' : 'Analyze job description →'}</button></div></section>
    {error && <p role="alert" className="pm-auth-error">{error}</p>}
    {analyzed && <section className="pm-card pm-material-result"><div className="pm-panel-head"><div><span className="pm-eyebrow">Analysis complete</span><h2 className="pm-card-title" style={{marginTop:7}}>{analyzed.title}</h2></div><span className="pm-status-pill">Ready</span></div>{analyzed.required?.length > 0 && <><h3 className="pm-material-subhead">Required skills</h3><div className="pm-skill-list">{analyzed.required.map((skill:string)=><span key={skill}>{skill}</span>)}</div></>}{interviewFlow && <Link to={resumePath} className="pm-setup-back">Review uploaded resume</Link>}<button onClick={() => navigate(configurePath)} className="pm-button pm-button-primary" disabled={interviewFlow && !hasResume}>{interviewFlow ? 'Review and start interview →' : 'Configure interview →'}</button></section>}
    {interviewFlow && <Link to={resumePath} className="pm-setup-back">← Back to resume</Link>}
  </div>;
}
