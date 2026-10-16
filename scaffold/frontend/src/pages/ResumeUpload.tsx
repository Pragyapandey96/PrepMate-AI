import { ChangeEvent, useState } from 'react';
import { api } from '../services/api';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { clearInterviewSetupDraft, readInterviewSetupDraft, saveInterviewSetupDraft } from '../services/interview-setup';

export function ResumeUpload() {
  const [result, setResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const interviewFlow = searchParams.get('flow') === 'interview';
  const hasSavedResume = Boolean(localStorage.getItem('pm.resumeId'));
  const jobDescriptionPath = interviewFlow ? '/jd?flow=interview' : '/jd';

  function continueToJobDescription() {
    if (!localStorage.getItem('pm.resumeId')) {
      setError('Upload a resume before continuing.');
      return;
    }
    navigate(jobDescriptionPath);
  }

  async function onFile(file: File) {
    if (uploading) return;
    const extension = file.name.toLowerCase().split('.').pop();
    const format = extension === 'pdf' ? 'PDF' : extension === 'docx' ? 'DOCX' : null;
    if (!format) {
      setError('Choose a PDF or DOCX resume.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Your resume must be 5 MB or smaller.');
      return;
    }
    const expectedMime = format === 'PDF'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (file.type && file.type !== expectedMime) {
      setError('The selected file type does not match its extension. Choose a PDF or DOCX resume.');
      return;
    }

    setUploading(true); setError('');
    try {
      const r = await api.uploadResume(file);
      localStorage.setItem('pm.resumeId', r.id);
      localStorage.removeItem('pm.jdId');
      clearInterviewSetupDraft();
      saveInterviewSetupDraft({ jobDescriptionText: '', resumeFormat: format });
      setResult({ ...r, filename: file.name });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to process this resume.'); }
    finally { setUploading(false); }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (file) void onFile(file);
    event.currentTarget.value = '';
  }

  const savedResumeFormat = readInterviewSetupDraft().resumeFormat;
  return <div className="pm-content-page"><div className="pm-page-heading"><span className="pm-eyebrow">{interviewFlow ? 'Interview setup　/　01 of 3' : 'Your materials　/　01'}</span><h1 className="pm-page-title">Add your resume.</h1><p className="pm-page-subtitle">Upload a resume so your practice can reflect your experience and skills.</p></div>
    <section className="pm-card pm-upload-card"><div className="pm-upload-icon">↑</div><h2>Upload a resume</h2><p>Choose a PDF or DOCX file, up to 5 MB.</p><label className="pm-button pm-button-primary pm-file-button">{uploading ? 'Uploading…' : 'Choose a file'}<input type="file" accept=".pdf,.docx" disabled={uploading} onChange={handleFileChange}/></label><span className="pm-upload-help">PDF or DOCX · Maximum file size 5 MB</span></section>
    {uploading && <div className="pm-alert">Parsing your resume…</div>}{error && <p role="alert" className="pm-auth-error">{error}</p>}
    {result && <section className="pm-card pm-material-result"><div className="pm-panel-head"><div><span className="pm-eyebrow">Resume analyzed</span><h2 className="pm-card-title" style={{marginTop:7}}>{result.extracted.name || 'Parsed resume'}</h2><p className="pm-page-subtitle">{result.extracted.headline}</p><p className="pm-page-subtitle">{result.filename}</p></div><span className="pm-status-pill">Ready</span></div>{result.extracted.skills?.length > 0 && <div className="pm-skill-list">{result.extracted.skills.map((s:string)=><span key={s}>{s}</span>)}</div>}<button onClick={continueToJobDescription} className="pm-button pm-button-primary">Continue to job description →</button></section>}
    {!result && hasSavedResume && <section className="pm-card pm-material-result"><div className="pm-panel-head"><div><span className="pm-eyebrow">Resume already uploaded</span><h2 className="pm-card-title" style={{marginTop:7}}>Your saved resume is ready</h2><p className="pm-page-subtitle">{savedResumeFormat ? `${savedResumeFormat} resume` : 'Saved resume'} · ready to use in your interview</p></div><span className="pm-status-pill">Ready</span></div><button onClick={continueToJobDescription} className="pm-button pm-button-primary">Continue to job description →</button></section>}
    {interviewFlow && <Link to="/dashboard" className="pm-setup-back">Back to overview</Link>}
  </div>;
}
