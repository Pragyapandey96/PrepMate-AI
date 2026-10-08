import { useState } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

export function JobDescription() {
  const [text, setText] = useState('');
  const [analyzed, setAnalyzed] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function analyze() {
    setLoading(true);
    try {
      const r = await api.analyzeJD(text);
      setAnalyzed(r);
      localStorage.setItem('pm.jdId', r.id);
    } finally { setLoading(false); }
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold">Job description</h1>
      <p className="text-neutral-500 mt-1">Paste the JD; we'll extract role, required skills, and responsibilities.</p>

      <textarea className="w-full mt-4 p-3 border border-neutral-300 rounded-lg font-sans text-sm min-h-[240px]"
                value={text} onChange={e => setText(e.target.value)}
                placeholder="Paste the job description..." />
      <button onClick={analyze} disabled={loading || text.length < 50}
              className="mt-3 px-3 py-1.5 bg-accent text-white rounded-md text-sm disabled:opacity-50">
        {loading ? 'Analyzing…' : 'Analyze'}
      </button>

      {analyzed && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 mt-4">
          <div className="font-medium">{analyzed.title}</div>
          <div className="text-xs text-neutral-500 mt-3">Required</div>
          <div>{analyzed.required?.map((s: string) => <span key={s} className="chip">{s}</span>)}</div>
          <button onClick={() => navigate('/configure')} className="mt-4 px-3 py-1.5 bg-accent text-white rounded-md text-sm">
            Configure interview →
          </button>
        </div>
      )}
    </div>
  );
}
