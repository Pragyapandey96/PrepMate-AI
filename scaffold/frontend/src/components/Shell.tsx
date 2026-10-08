import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const items = [
  { path: '/', label: 'Dashboard' },
  { path: '/resume', label: 'Resume' },
  { path: '/jd', label: 'Job description' },
  { path: '/configure', label: 'New interview' },
  { path: '/history', label: 'Interview history' },
];

export function Shell() {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('pm.user') || '{}'); } catch { return {}; } })();
  async function logout() {
    try { await api.logout(); } catch { /* Clear local credentials even when offline. */ }
    localStorage.removeItem('pm.token'); localStorage.removeItem('pm.user');
    localStorage.removeItem('pm.resumeId'); localStorage.removeItem('pm.jdId');
    navigate('/login', { replace: true });
  }
  return (
    <div className="min-h-screen grid grid-cols-[248px_1fr]">
      <aside className="border-r border-neutral-200 bg-white p-4 sticky top-0 h-screen flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 pb-5">
          <div className="w-6 h-6 rounded bg-accent text-white grid place-items-center text-[10px] font-bold mono">PM</div>
          <div className="font-semibold">PrepMate AI</div>
        </div>
        {items.map(it => (
          <NavLink key={it.path} to={it.path} end={it.path === '/'}
            className={({ isActive }) => `px-2 py-1.5 rounded-md text-sm transition ${isActive ? 'bg-accent-subtle text-accent-text font-medium' : 'text-neutral-600 hover:bg-neutral-100'}`}>
            {it.label}
          </NavLink>
        ))}
      </aside>
      <main>
        <div className="h-14 border-b border-neutral-200 flex items-center justify-between px-8 bg-[var(--bg)] sticky top-0 z-10">
          <div className="text-sm text-neutral-500">{user.name ? `Hello, ${user.name}` : 'PrepMate AI'}</div>
          <div className="flex items-center gap-3"><button onClick={logout} className="text-sm text-neutral-600 hover:text-red-600">Log out</button><button className="text-sm px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover"
                  onClick={() => navigate('/configure')}>
            Start interview
          </button></div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
