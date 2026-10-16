import { Link, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { clearInterviewSetupDraft } from '../services/interview-setup';

const items = [
  { path: '/dashboard', label: 'Overview' },
  { path: '/resume?flow=interview', label: 'Start interview' },
  { path: '/history', label: 'Interview history' },
];

export function Shell() {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('pm.user') || '{}'); } catch { return {}; } })();
  async function logout() {
    try { await api.logout(); } catch { /* Clear local credentials even when offline. */ }
    localStorage.removeItem('pm.token'); localStorage.removeItem('pm.user');
    localStorage.removeItem('pm.resumeId'); localStorage.removeItem('pm.jdId');
    clearInterviewSetupDraft();
    navigate('/login', { replace: true });
  }
  return (
    <div className="pm-app-shell">
      <header className="pm-app-header">
        <Link to="/dashboard" className="pm-brand"><span className="pm-brand-mark">✦</span><span>PrepMate AI <small>STUDIO</small></span></Link>
        <nav className="pm-app-nav">{items.map(it => <NavLink key={it.path} to={it.path} end={it.path === '/dashboard'} className={({ isActive }) => isActive ? 'active' : ''}>{it.label}</NavLink>)}</nav>
        <div className="pm-app-user"><span>{user.name || 'Account'}</span><button onClick={logout}>Log out</button></div>
      </header>
      <main className="pm-app-main">
        <Outlet />
      </main>
    </div>
  );
}
