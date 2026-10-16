import { useRef, useState } from 'react';
import { api, ApiError } from '../services/api';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { readInterviewSetupDraft, saveInterviewSetupDraft } from '../services/interview-setup';

const TYPES = ['HR', 'Technical', 'Behavioral', 'Mixed'] as const;
const DIFFS = ['Easy', 'Medium', 'Hard'] as const;
const QUESTIONS = [5, 10, 15, 20] as const;

export function Configure() {
  const [searchParams] = useSearchParams();
  const interviewFlow = searchParams.get('flow') === 'interview';
  const draft = readInterviewSetupDraft();
  const [type, setType] = useState<typeof TYPES[number]>(draft.interviewType || 'Mixed');
  const [difficulty, setDifficulty] = useState<typeof DIFFS[number]>(draft.difficulty || 'Medium');
  const [n, setN] = useState<typeof QUESTIONS[number]>(draft.questionsPlanned || 10);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [compatibility, setCompatibility] = useState<any>(null);
  const startInFlight = useRef(false);
  const navigate = useNavigate();
  const hasResume = Boolean(localStorage.getItem('pm.resumeId'));
  const hasJD = Boolean(localStorage.getItem('pm.jdId'));
  const resumePath = interviewFlow ? '/resume?flow=interview' : '/resume';
  const jobDescriptionPath = interviewFlow ? '/jd?flow=interview' : '/jd';

  async function start() {
    if (startInFlight.current) return;
    if (!hasResume || !hasJD) {
      setError('Upload a resume and analyze a job description before starting an interview.');
      return;
    }
    startInFlight.current = true;
    setError(''); setStarting(true);
    try {
      const iv = await api.createInterview({
        resumeId: localStorage.getItem('pm.resumeId'),
        jdId: localStorage.getItem('pm.jdId'),
        type, difficulty, questionsPlanned: n,
      });
      navigate(`/interview/${iv._id}`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && e.body?.compatibility) {
        setCompatibility(e.body.compatibility);
        setError(e.body.message || 'Your resume does not appear to match this job description. Please review your materials and try again.');
      } else setError(e instanceof Error ? e.message : 'Unable to check resume compatibility.');
    }
    finally { startInFlight.current = false; setStarting(false); }
  }

  return <div className="pm-setup-page">
    <div className="pm-dashboard-hero"><div><span className="pm-eyebrow">{interviewFlow ? 'Interview setup　/　03 of 3' : 'Simulation config　/　Step 3 of 3'}</span><h1>Review and start.</h1><p>Confirm your materials and choose a practice format.</p></div><span className="pm-pill">● Session setup</span></div>
    {(!hasResume || !hasJD) && <div className="pm-alert">Before you start, add your own materials: {!hasResume && <Link to={resumePath}>upload a resume</Link>}{!hasResume && !hasJD && ' and '}{!hasJD && <Link to={jobDescriptionPath}>add a job description</Link>}.</div>}
    {compatibility && <section className="pm-card" role={compatibility.matches ? 'status' : 'alert'} style={{marginBottom:20}}>
      <h2>{compatibility.matches ? `Resume fit: ${compatibility.matchScore}/100` : 'Resume and job description may not be a match'}</h2>
      <p>{compatibility.explanation}</p>
      {compatibility.matchedSkills?.length > 0 && <p><strong>Relevant skills found:</strong> {compatibility.matchedSkills.join(', ')}</p>}
      {compatibility.missingSkills?.length > 0 && <p><strong>Important requirements not demonstrated in the resume:</strong> {compatibility.missingSkills.join(', ')}</p>}
      <small>This is an AI estimate for interview preparation, not an objective hiring decision.</small>
      {!compatibility.matches && <p>Review your inputs: <Link to={resumePath}>upload a different resume</Link> or <Link to={jobDescriptionPath}>edit the job description</Link>.</p>}
    </section>}
    <div className="pm-setup-grid">
      <div>
        <section className="pm-card pm-form-section"><div className="pm-form-title"><span>01</span><div><h2>Select interview track</h2><p>Pick a supported track for your practice session.</p></div></div>
          <div className="pm-option-grid">{TYPES.map(t => <button key={t} onClick={() => { setType(t); saveInterviewSetupDraft({ interviewType: t }); }} className={`pm-choice ${type === t ? 'selected' : ''}`}><strong>{t === 'Technical' ? 'Technical interview' : t === 'Behavioral' ? 'Behavioral' : t === 'HR' ? 'HR conversation' : 'Mixed practice'}</strong><span>{t === 'Technical' ? 'Technical questions and problem solving' : t === 'Behavioral' ? 'Experience and situational questions' : t === 'HR' ? 'Motivation and career conversations' : 'A balanced practice session'}</span></button>)}</div>
        </section>
        <section className="pm-card pm-form-section"><div className="pm-form-title"><span>02</span><div><h2>Choose difficulty</h2><p>Set the level of challenge for your session.</p></div></div><div className="pm-option-grid pm-difficulty-grid">{DIFFS.map(d => <button key={d} onClick={() => { setDifficulty(d); saveInterviewSetupDraft({ difficulty: d }); }} className={`pm-choice ${difficulty === d ? 'selected' : ''}`}><strong>{d}</strong><span>{d === 'Easy' ? 'Build the fundamentals' : d === 'Medium' ? 'Practice at a steady pace' : 'Push into tougher questions'}</span></button>)}</div></section>
        <section className="pm-card pm-form-section"><div className="pm-form-title"><span>03</span><div><h2>Session length</h2><p>Choose how many questions you want to practice.</p></div></div><div className="pm-option-grid pm-question-grid">{QUESTIONS.map(x => <button key={x} onClick={() => { setN(x); saveInterviewSetupDraft({ questionsPlanned: x }); }} className={`pm-choice ${n === x ? 'selected' : ''}`}><strong>{x} questions</strong><span>Planned interview questions</span></button>)}</div></section>
      </div>
      <aside className="pm-card pm-setup-aside"><span className="pm-eyebrow">Session plan</span><h2 className="pm-card-title" style={{marginTop:8}}>Review your materials</h2><dl><div><dt>Resume</dt><dd>{hasResume ? `${draft.resumeFormat || 'Uploaded'} resume ready` : 'Not selected'}</dd></div><div><dt>Job description</dt><dd>{hasJD ? draft.jobTitle || 'Analyzed and ready' : 'Not selected'}</dd></div></dl>{draft.jobDescriptionText && <p className="pm-page-subtitle">{draft.jobDescriptionText.trim().slice(0, 180)}{draft.jobDescriptionText.trim().length > 180 ? '…' : ''}</p>}<div className="pm-setup-note">Review or replace either material before you start.</div><div className="pm-jd-actions"><Link to={resumePath}>Review resume</Link><Link to={jobDescriptionPath}>Review job description</Link></div><h2 className="pm-card-title" style={{marginTop:20}}>Interview configuration</h2><dl><div><dt>Interview track</dt><dd>{type}</dd></div><div><dt>Difficulty</dt><dd>{difficulty}</dd></div><div><dt>Questions</dt><dd>{n}</dd></div><div><dt>Mode</dt><dd>Voice or text</dd></div></dl>{error && <p role="alert" className="pm-auth-error">{error}</p>}<button disabled={starting || !hasResume || !hasJD} onClick={start} className="pm-button pm-button-primary" style={{width:'100%'}}>{starting ? 'Starting…' : 'Start Interview →'}</button><Link to="/dashboard" className="pm-setup-back">Back to overview</Link></aside>
    </div>
  </div>;
}
