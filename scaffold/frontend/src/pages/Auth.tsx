import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { clearInterviewSetupDraft } from '../services/interview-setup';

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
      clearInterviewSetupDraft();
      onAuthenticated(); navigate('/dashboard', { replace: true, state: { animateProgress: true } });
    } catch (e) { setError(e instanceof Error ? e.message.replace(/^API \d+:\s*/, '') : 'Unable to authenticate.'); }
    finally { setBusy(false); }
  }
  return <div className="pm-auth-page">
    <header className="pm-auth-header"><Link to="/" className="pm-brand"><span className="pm-brand-mark">✦</span><span>PrepMate AI</span></Link><span>{mode === 'signup' ? 'Already have an account?' : "Don't have an account?"} <Link to={mode === 'signup' ? '/login' : '/signup'}>{mode === 'signup' ? 'Log in' : 'Sign up'}</Link></span></header>
    <main className="pm-auth-main">
      <form onSubmit={submit} className="pm-auth-card">
        <h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
        <p>{mode === 'signup' ? 'Start preparing for interviews with AI in under a minute.' : 'Log in to your PrepMate account to continue practicing.'}</p>
        {mode === 'signup' && <label>Full name<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Your name" /></label>}
        <label>{mode === 'signup' ? 'Email address' : 'Work or personal email'}<input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" /></label>
        <label>Password<input required minLength={mode === 'signup' ? 8 : 1} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'} /></label>
        {mode === 'signup' && <small>Use 8 or more characters.</small>}
        {error && <p role="alert" className="pm-auth-error">{error}</p>}
        <button disabled={busy} className="pm-button pm-button-primary pm-auth-submit">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account →' : 'Log in →'}</button>
        <div className="pm-auth-switch">{mode === 'signup' ? 'Already have an account?' : "Don't have an account?"} <Link to={mode === 'signup' ? '/login' : '/signup'}>{mode === 'signup' ? 'Log in' : 'Sign up'}</Link></div>
      </form>
    </main>
    <footer className="pm-auth-footer"><span>© 2025 PrepMate AI Technologies Inc.</span><span>Privacy　 Terms　 Support</span></footer>
  </div>;
}
