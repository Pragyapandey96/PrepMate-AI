import { useState } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

export function ResumeUpload() {
  const [result, setResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  async function onFile(file: File) {
    setUploading(true);
    try {
      const r = await api.uploadResume(file);
      setResult(r);
      localStorage.setItem('pm.resumeId', r.id);
    } finally { setUploading(false); }
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold">Upload resume</h1>
      <p className="text-neutral-500 mt-1">PDF or DOCX, up to 5 MB.</p>

      <div className="bg-white border-2 border-dashed border-neutral-300 rounded-lg p-10 mt-6 text-center">
        <input type="file" accept=".pdf,.docx" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
        {uploading && <div className="mt-3 text-sm text-neutral-500">Parsing…</div>}
      </div>

      {result && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 mt-4">
          <div className="font-medium">{result.extracted.name || 'Parsed resume'}</div>
          <div className="text-sm text-neutral-500">{result.extracted.headline}</div>
          <div className="mt-3">
            {result.extracted.skills?.map((s: string) => (
              <span key={s} className="inline-block px-2 py-0.5 bg-accent-subtle text-accent-text rounded-full text-xs mr-1 mb-1">{s}</span>
            ))}
          </div>
          <button onClick={() => navigate('/jd')} className="mt-4 px-3 py-1.5 bg-accent text-white rounded-md text-sm">
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}
