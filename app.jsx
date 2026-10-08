// PrepMate AI — main app orchestrator.

const { useState, useEffect, useMemo } = React;

const ACCENT_PRESETS = {
  cyan:   { accent: 'oklch(0.68 0.13 210)', hover: 'oklch(0.62 0.14 210)', subtle: 'oklch(0.96 0.03 210)', border: 'oklch(0.82 0.08 210)', text: 'oklch(0.42 0.14 210)' },
  violet: { accent: 'oklch(0.6 0.2 285)',   hover: 'oklch(0.54 0.22 285)', subtle: 'oklch(0.96 0.03 285)', border: 'oklch(0.82 0.08 285)', text: 'oklch(0.4 0.2 285)' },
  green:  { accent: 'oklch(0.62 0.14 155)', hover: 'oklch(0.56 0.16 155)', subtle: 'oklch(0.96 0.04 155)', border: 'oklch(0.82 0.08 155)', text: 'oklch(0.38 0.15 155)' },
  amber:  { accent: 'oklch(0.72 0.16 65)',  hover: 'oklch(0.66 0.17 65)',  subtle: 'oklch(0.96 0.05 75)',  border: 'oklch(0.85 0.1 75)',   text: 'oklch(0.45 0.14 65)' },
};

function applyAccent(name) {
  const p = ACCENT_PRESETS[name] || ACCENT_PRESETS.cyan;
  const root = document.documentElement;
  root.style.setProperty('--accent', p.accent);
  root.style.setProperty('--accent-hover', p.hover);
  root.style.setProperty('--accent-subtle', p.subtle);
  root.style.setProperty('--accent-border', p.border);
  root.style.setProperty('--accent-text', p.text);
}

function App() {
  // Persist route
  const [route, setRouteRaw] = useState(() => localStorage.getItem('pm.route') || 'dashboard');
  const setRoute = (r) => {
    setRouteRaw(r);
    localStorage.setItem('pm.route', r);
    // Reset interview-ended flag whenever we enter/exit interview
    if (r === 'interview') window.__interviewEnded = false;
  };

  const [config, setConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pm.config')) || defaultConfig(); }
    catch { return defaultConfig(); }
  });
  useEffect(() => { localStorage.setItem('pm.config', JSON.stringify(config)); }, [config]);

  const [tweaks, setTweaks] = window.useTweaks(TWEAK_DEFAULTS);

  // Apply theme + accent
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme);
    applyAccent(tweaks.accent);
  }, [tweaks.theme, tweaks.accent]);

  // Expose layout setter for the Configure screen
  useEffect(() => {
    window.__setLayout = (v) => setTweaks({ interviewLayout: v });
  }, [setTweaks]);

  const [lastReport, setLastReport] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pm.report')) || window.DEMO_DATA.sampleReport; }
    catch { return window.DEMO_DATA.sampleReport; }
  });
  useEffect(() => {
    if (lastReport) localStorage.setItem('pm.report', JSON.stringify(lastReport));
  }, [lastReport]);

  const crumbsByRoute = {
    dashboard: ['PrepMate AI', 'Dashboard'],
    resume: ['PrepMate AI', 'Resume'],
    jd: ['PrepMate AI', 'Job description'],
    configure: ['PrepMate AI', 'New interview'],
    history: ['PrepMate AI', 'History'],
    report: ['PrepMate AI', 'Report'],
    interview: ['PrepMate AI', 'Live interview'],
  };

  // Interview is fullscreen, no shell
  if (route === 'interview') {
    return (
      <>
        <window.InterviewScreen
          config={config}
          layout={tweaks.interviewLayout}
          setRoute={setRoute}
          setLastReport={setLastReport}
        />
        <TweaksUI tweaks={tweaks} setTweaks={setTweaks} />
      </>
    );
  }

  let body;
  switch (route) {
    case 'resume':    body = <window.ResumeScreen setRoute={setRoute} />; break;
    case 'jd':        body = <window.JDScreen setRoute={setRoute} />; break;
    case 'configure': body = <window.ConfigureScreen setRoute={setRoute} config={config} setConfig={setConfig} layout={tweaks.interviewLayout} />; break;
    case 'history':   body = <window.HistoryScreen setRoute={setRoute} />; break;
    case 'report':    body = <window.ReportScreen report={lastReport} variant={tweaks.reportLayout} setRoute={setRoute} />; break;
    default:          body = <window.Dashboard setRoute={setRoute} />;
  }

  return (
    <>
      <window.Shell
        route={route}
        setRoute={setRoute}
        crumbs={crumbsByRoute[route] || []}
        actions={
          <>
            <span className="badge"><span className="dot live"/> Voice ready</span>
            {route !== 'configure' && route !== 'interview' && (
              <button className="btn btn-primary btn-sm" onClick={() => setRoute('configure')}>
                <window.Icon.Play className="icon"/> Start interview
              </button>
            )}
          </>
        }
      >
        {body}
      </window.Shell>
      <TweaksUI tweaks={tweaks} setTweaks={setTweaks} />
    </>
  );
}

// Map accent hex → preset name so TweakColor value is a real color
const ACCENT_HEX = { cyan: '#0ea5c7', violet: '#7c3aed', green: '#059669', amber: '#d97706' };
const ACCENT_FROM_HEX = Object.fromEntries(Object.entries(ACCENT_HEX).map(([k, v]) => [v.toLowerCase(), k]));

function TweaksUI({ tweaks, setTweaks }) {
  const accentHex = ACCENT_HEX[tweaks.accent] || ACCENT_HEX.cyan;
  return (
    <window.TweaksPanel>
      <window.TweakSection label="Appearance">
        <window.TweakRadio
          label="Theme"
          value={tweaks.theme}
          onChange={(v) => setTweaks({ theme: v })}
          options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
        />
        <window.TweakColor
          label="Accent"
          value={accentHex}
          onChange={(v) => {
            const name = ACCENT_FROM_HEX[String(v).toLowerCase()] || 'cyan';
            setTweaks({ accent: name });
          }}
          options={Object.values(ACCENT_HEX)}
        />
      </window.TweakSection>

      <window.TweakSection label="Interview screen">
        <window.TweakSelect
          label="Layout"
          value={tweaks.interviewLayout}
          onChange={(v) => setTweaks({ interviewLayout: v })}
          options={[
            { value: 'transcript', label: 'Transcript-forward' },
            { value: 'split',      label: 'Split — status side' },
            { value: 'focus',      label: 'Focus — teleprompter' },
          ]}
        />
      </window.TweakSection>

      <window.TweakSection label="Report screen">
        <window.TweakRadio
          label="Layout"
          value={tweaks.reportLayout}
          onChange={(v) => setTweaks({ reportLayout: v })}
          options={[
            { value: 'detailed', label: 'Detailed' },
            { value: 'compact',  label: 'Compact' },
          ]}
        />
      </window.TweakSection>

      <window.TweakSuggestionBar suggestions={[
        "Switch the interview to the split layout",
        "Try dark mode with the violet accent",
        "Show me the compact report",
        "Retry the interview with Hard difficulty",
      ]}/>
    </window.TweaksPanel>
  );
}

function defaultConfig() {
  return { type: 'Mixed', difficulty: 'Medium', questions: 5 };
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "cyan",
  "interviewLayout": "transcript",
  "reportLayout": "detailed"
}/*EDITMODE-END*/;

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
