import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export function History() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { api.listInterviews().then(setItems).catch(e => setError(e.message)); }, []);
  return <div className="p-8 max-w-5xl"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold">Interview history</h1><p className="text-neutral-500 mt-1">Your saved practice sessions and AI reports.</p></div><Link to="/configure" className="px-3 py-2 rounded-md bg-accent text-white text-sm">New interview</Link></div>
    {error && <p role="alert" className="mt-5 text-sm text-red-600">{error}</p>}
    <div className="bg-white border rounded-lg mt-6 overflow-x-auto"><table className="w-full text-sm"><thead className="text-xs text-neutral-500 border-b"><tr><th className="text-left p-3">Date</th><th className="text-left">Role</th><th className="text-left">Type</th><th className="text-left">Status</th><th className="text-right p-3">Score / report</th></tr></thead><tbody>
      {items.map(i => <tr key={i._id} className="border-b last:border-0"><td className="p-3 text-neutral-500">{new Date(i.createdAt).toLocaleDateString()}</td><td>{i.jdId?.title || 'Interview'}</td><td>{i.type} · {i.difficulty}</td><td className="capitalize">{i.status.replace('_', ' ')}</td><td className="text-right p-3">{i.status === 'evaluated' ? <Link className="text-accent-text hover:underline" to={`/report/${i._id}`}>View report · {i.overallScore}</Link> : '—'}</td></tr>)}
      {!items.length && <tr><td colSpan={5} className="p-10 text-center text-neutral-400">No interviews recorded yet.</td></tr>}
    </tbody></table></div></div>;
}
