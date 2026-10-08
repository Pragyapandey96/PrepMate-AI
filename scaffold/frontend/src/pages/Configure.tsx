import { useState } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

const TYPES = ['HR', 'Technical', 'Behavioral', 'Mixed'] as const;
const DIFFS = ['Easy', 'Medium', 'Hard'] as const;

export function Configure() {
  const [type, setType] = useState<typeof TYPES[number]>('Mixed');
  const [difficulty, setDifficulty] = useState<typeof DIFFS[number]>('Medium');
  const [n, setN] = useState(10);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();
  const hasResume = Boolean(localStorage.getItem('pm.resumeId'));
  const hasJD = Boolean(localStorage.getItem('pm.jdId'));

  async function start() {
    setError(''); setStarting(true);
    try {
      const iv = await api.createInterview({
        resumeId: localStorage.getItem('pm.resumeId'),
        jdId: localStorage.getItem('pm.jdId'),
        type, difficulty, questionsPlanned: n,
      });
      navigate(`/interview/${iv._id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to start interview.'); }
    finally { setStarting(false); }
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold">Configure interview</h1>
      {(!hasResume || !hasJD) && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Before you start, add your own materials: {!hasResume && <a className="underline" href="/resume">upload a resume</a>}{!hasResume && !hasJD && ' and '}{!hasJD && <a className="underline" href="/jd">analyze a job description</a>}.</div>}

      <section className="mt-6 bg-white border rounded-lg p-4">
        <div className="text-xs text-neutral-500 mb-2">Type</div>
        <div className="grid grid-cols-4 gap-2">
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`p-2 border rounded-md text-sm ${type === t ? 'border-accent bg-accent-subtle text-accent-text' : 'border-neutral-200'}`}>
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 bg-white border rounded-lg p-4">
        <div className="text-xs text-neutral-500 mb-2">Difficulty</div>
        <div className="grid grid-cols-3 gap-2">
          {DIFFS.map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              className={`p-2 border rounded-md text-sm ${difficulty === d ? 'border-accent bg-accent-subtle text-accent-text' : 'border-neutral-200'}`}>
              {d}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 bg-white border rounded-lg p-4">
        <div className="text-xs text-neutral-500 mb-2">Questions</div>
        <div className="flex gap-2">
          {[5, 10, 15, 20].map(x => (
            <button key={x} onClick={() => setN(x)}
              className={`px-3 py-1.5 border rounded-md text-sm ${n === x ? 'border-accent bg-accent-subtle text-accent-text' : 'border-neutral-200'}`}>
              {x}
            </button>
          ))}
        </div>
      </section>

      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      <button disabled={starting || !hasResume || !hasJD} onClick={start} className="mt-6 px-4 py-2 bg-accent text-white rounded-md disabled:opacity-50">{starting ? 'Starting…' : 'Start voice interview'}</button>
    </div>
  );
}
