// App shell — sidebar + topbar. Used by all non-interview screens.

function Sidebar({ route, setRoute }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: 'Home' },
    { id: 'resume', label: 'Resume', icon: 'File' },
    { id: 'jd', label: 'Job description', icon: 'Briefcase' },
    { id: 'configure', label: 'New interview', icon: 'Plus' },
    { id: 'history', label: 'History', icon: 'History' },
    { id: 'report', label: 'Latest report', icon: 'Chart' },
  ];
  const I = window.Icon;
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">PM</div>
        <div>PrepMate AI</div>
      </div>

      <div className="sidebar-section">Workspace</div>
      {items.slice(0, 3).map(it => {
        const Ico = I[it.icon];
        return (
          <div key={it.id} className={'sidebar-item' + (route === it.id ? ' active' : '')} onClick={() => setRoute(it.id)}>
            <Ico className="icon" />
            <span>{it.label}</span>
          </div>
        );
      })}

      <div className="sidebar-section">Interview</div>
      {items.slice(3).map(it => {
        const Ico = I[it.icon];
        return (
          <div key={it.id} className={'sidebar-item' + (route === it.id ? ' active' : '')} onClick={() => setRoute(it.id)}>
            <Ico className="icon" />
            <span>{it.label}</span>
          </div>
        );
      })}

      <div className="sidebar-user">
        <div className="avatar">{window.DEMO_DATA.candidate.initials}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {window.DEMO_DATA.candidate.name}
          </div>
          <div className="tiny" style={{ fontSize: 11 }}>Free plan</div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumbs = [], actions = null }) {
  return (
    <div className="topbar">
      <div className="topbar-crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span style={{ color: i === crumbs.length - 1 ? 'var(--text)' : undefined }}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="topbar-actions">{actions}</div>
    </div>
  );
}

function Shell({ route, setRoute, children, crumbs, actions }) {
  return (
    <div className="app-shell">
      <Sidebar route={route} setRoute={setRoute} />
      <div className="main">
        <Topbar crumbs={crumbs} actions={actions} />
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, Shell });
