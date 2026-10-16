import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const capabilities = [
  ['01', 'AI mock interviews', 'Practice with adaptive questions shaped around your interview track and difficulty.'],
  ['02', 'Live voice practice', 'Build confidence speaking your answers aloud in a realistic interview flow.'],
  ['03', 'Actionable feedback', 'Review your transcript, performance scores, strengths, and areas to improve.'],
  ['04', 'Progress over time', 'Use your interview history and score trends to see where your practice is paying off.'],
];

export function Landing() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('.pm-landing .pm-reveal');
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -24px 0px', threshold: 0.12 });

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return <div className="pm-landing">
    <header className="pm-landing-header">
      <Link to="/" className="pm-brand"><span className="pm-brand-mark">✦</span><span>PrepMate AI</span></Link>
      <nav><a href="#capabilities">Features</a><a href="#method">Methodology</a><Link to="/login">Sign in</Link><Link to="/signup" className="pm-button pm-button-primary">Launch app</Link></nav>
    </header>
    <main>
      <section className="pm-hero pm-container">
        <div className="pm-hero-copy"><span className="pm-eyebrow">A more thoughtful way to prepare</span><h1>Your next interview<br/><em>starts here.</em></h1><p>Practice high-stakes interviews with an AI interviewer, then turn each session into clear, useful feedback.</p><div className="pm-hero-actions"><Link to="/signup" className="pm-button pm-button-primary">Start practicing →</Link><a href="#capabilities" className="pm-button pm-button-light">Explore features</a></div><div className="pm-social-proof"><span className="pm-proof-dots">● ● ●</span> Built for focused, repeatable interview practice</div></div>
        <div className="pm-hero-visual"><div className="pm-sim-card"><div className="pm-sim-top"><span><i/> Live simulation</span><span className="pm-pill">Voice ready</span></div><div className="pm-sim-center"><div className="pm-mic">♩</div><div className="pm-wave" aria-hidden="true">▂ ▄ ▆ ▇ ▅ ▃ ▅ ▇ ▆ ▄ ▂</div><strong>Take a moment to think.</strong><p>Your practice session is ready when you are.</p></div><div className="pm-sim-bottom"><span>YOUR PRACTICE<br/><b>One question at a time</b></span><span>YOUR FEEDBACK<br/><b>Clear next steps</b></span></div></div><span className="pm-orbit pm-orbit-one"/><span className="pm-orbit pm-orbit-two"/></div>
      </section>
      <section className="pm-section pm-container" id="capabilities"><div className="pm-section-heading pm-reveal"><span className="pm-eyebrow">Capabilities</span><h2>Every practice session has a purpose.</h2><p>Prepare with a clear structure, realistic practice, and feedback you can use.</p></div><div className="pm-capability-grid">{capabilities.map(([n,title,desc])=><article className="pm-capability-card pm-reveal" key={n}><span className="pm-capability-icon">{n}</span><h3>{title}</h3><p>{desc}</p></article>)}</div></section>
      <section className="pm-method" id="method"><div className="pm-container"><div className="pm-section-heading pm-reveal"><span className="pm-eyebrow">The method</span><h2>Three steps to mastery.</h2><p>A thoughtful practice loop, from choosing a focus to reviewing your progress.</p></div><div className="pm-step-grid"><article className="pm-reveal"><span>STEP 01</span><h3>Choose your focus</h3><p>Set up your interview with the resume and job description you want to practice for.</p></article><article className="pm-reveal"><span>STEP 02</span><h3>Practice live</h3><p>Work through a voice or text interview at a difficulty that feels right for you.</p></article><article className="pm-reveal"><span>STEP 03</span><h3>Review and refine</h3><p>Read your report, revisit your history, and choose what to strengthen next.</p></article></div></div></section>
      <section className="pm-closing pm-container pm-reveal"><span className="pm-eyebrow">Preparation over chance</span><h2>Your dream role<br/>won’t wait.</h2><p>Build genuine conversational confidence with focused, repeatable practice.</p><Link to="/signup" className="pm-button pm-button-primary">Create your free account →</Link></section>
    </main>
    <footer className="pm-landing-footer"><Link to="/" className="pm-brand"><span className="pm-brand-mark">✦</span><span>PrepMate AI</span></Link><p>Interview practice, made more intentional.</p><span>© 2025 PrepMate AI Technologies Inc.</span></footer>
  </div>;
}
