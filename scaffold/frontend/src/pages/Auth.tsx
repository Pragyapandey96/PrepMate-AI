import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export function Auth({ mode, onAuthenticated }: { mode: 'login' | 'signup'; onAuthenticated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const result = mode === 'signup' ? await api.signup({ name, email, password }) : await api.login({ email, password });
      localStorage.setItem('pm.token', result.token);
      localStorage.setItem('pm.user', JSON.stringify(result.user));
      localStorage.removeItem('pm.resumeId'); localStorage.removeItem('pm.jdId');
      onAuthenticated(); navigate('/', { replace: true });
    } catch (e) { setError(e instanceof Error ? e.message.replace(/^API \d+:\s*/, '') : 'Unable to authenticate.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen grid place-items-center px-4 py-10">
    <form onSubmit={submit} className="w-full max-w-md bg-white border border-neutral-200 rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-8"><div className="w-9 h-9 rounded-lg bg-accent text-white grid place-items-center font-bold">PM</div><span className="font-semibold">PrepMate AI</span></div>
      <h1 className="text-2xl font-semibold">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
      <p className="text-sm text-neutral-500 mt-2">{mode === 'signup' ? 'Track your interview practice and get feedback.' : 'Sign in to continue your interview practice.'}</p>
      {mode === 'signup' && <label className="block text-sm mt-6">Name<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 p-2.5 border rounded-md" autoComplete="name" /></label>}
      <label className="block text-sm mt-5">Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-2.5 border rounded-md" autoComplete="email" /></label>
      <label className="block text-sm mt-4">Password<input required minLength={mode === 'signup' ? 8 : 1} type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 p-2.5 border rounded-md" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />{mode === 'signup' && <span className="text-xs text-neutral-500">At least 8 characters</span>}</label>
      {error && <p role="alert" className="text-sm text-red-600 mt-4">{error}</p>}
      <button disabled={busy} className="w-full mt-6 p-2.5 bg-accent text-white rounded-md disabled:opacity-60">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      <p className="text-sm text-center text-neutral-500 mt-5">{mode === 'signup' ? 'Already have an account?' : 'New to PrepMate?'} <Link className="text-accent-text hover:underline" to={mode === 'signup' ? '/login' : '/signup'}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</Link></p>
    </form>
  </main>;
}
