// Minimal inline icon set (no external icon lib).
const Icon = {
  Home: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 9.5 10 3l7 6.5V17a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1V9.5Z"/></svg>,
  File: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 2h6l4 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/><path d="M12 2v4h4"/></svg>,
  Briefcase: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="6" width="14" height="11" rx="1.5"/><path d="M7 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M3 11h14"/></svg>,
  Mic: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="7" y="2" width="6" height="10" rx="3"/><path d="M4 10a6 6 0 0 0 12 0"/><path d="M10 16v2"/></svg>,
  MicOff: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 3l14 14"/><path d="M7 5a3 3 0 0 1 6 0v4M7 9v1a3 3 0 0 0 4.6 2.5"/><path d="M4 10a6 6 0 0 0 10 4.3"/><path d="M10 16v2"/></svg>,
  Chart: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 17h14"/><path d="M6 14V9M10 14V5M14 14v-7"/></svg>,
  Play: (p) => <svg viewBox="0 0 20 20" fill="currentColor" {...p}><path d="M6 4v12l10-6L6 4Z"/></svg>,
  Plus: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M10 4v12M4 10h12"/></svg>,
  Check: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 10.5 8 14.5 16 6"/></svg>,
  ArrowRight: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 10h12M11 5l5 5-5 5"/></svg>,
  ArrowLeft: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 10H4M9 5l-5 5 5 5"/></svg>,
  X: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M5 5l10 10M15 5 5 15"/></svg>,
  Upload: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 3v10"/><path d="M6 7l4-4 4 4"/><path d="M4 15v2h12v-2"/></svg>,
  History: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10a7 7 0 1 0 2-4.9M3 4v3h3"/><path d="M10 6v4l3 2"/></svg>,
  Settings: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4"/></svg>,
  Download: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 3v10"/><path d="M6 9l4 4 4-4"/><path d="M4 15v2h12v-2"/></svg>,
  Volume: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 8v4h3l4 3V5L7 8H4Z"/><path d="M14 8a3 3 0 0 1 0 4"/></svg>,
  Sparkle: (p) => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 3v3M10 14v3M3 10h3M14 10h3M5.5 5.5l2 2M12.5 12.5l2 2M5.5 14.5l2-2M12.5 7.5l2-2"/></svg>,
};
window.Icon = Icon;
