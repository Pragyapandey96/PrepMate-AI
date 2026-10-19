import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { LiveAudioSession } from '../services/live-audio';

type Turn = { speaker: 'ai' | 'user'; text: string };
type Mode = 'live' | 'text';
type Status = 'connecting' | 'connected' | 'listening' | 'ai-speaking' | 'thinking' | 'answering' | 'error' | 'ending' | 'ended';

export function Interview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('live');
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [interim, setInterim] = useState<Turn | null>(null);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<Status>('connecting');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<LiveAudioSession | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);
  const endingRef = useRef(false);
  const serverErrorRef = useRef('');
  const endAckRef = useRef<(() => void) | null>(null);
  const limitCompletionPendingRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    serverErrorRef.current = '';
    const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = encodeURIComponent(localStorage.getItem('pm.token') || '');
    const ws = new WebSocket(`${scheme}//${location.host}/ws/voice?sessionId=${encodeURIComponent(id || '')}&mode=${mode}&token=${token}`);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onmessage = (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.type === 'error') {
        serverErrorRef.current = msg.message || 'The interview could not continue.';
        audioRef.current?.stopMicrophone();
        setError(serverErrorRef.current);
        setStatus('error');
      } else if (msg.type === 'ready') {
        setConnected(true);
        setError('');
        if (mode === 'text') {
          startedRef.current = true;
          setStarted(true);
          setStatus('thinking');
          ws.send(JSON.stringify({ type: 'start' }));
        } else {
          setStatus('connected');
        }
      } else if (msg.type === 'question') {
        setTranscript((turns) => [...turns, { speaker: 'ai', text: msg.text }]);
        setStatus('answering');
      } else if (msg.type === 'audio') {
        try { audioRef.current?.play(msg.data, msg.mimeType); }
        catch (error) {
          console.error('[voice] browser failed to play Gemini PCM', error);
          setError('Gemini returned audio that could not be played. You can end the interview and keep the saved transcript.');
          setStatus('error');
        }
      } else if (msg.type === 'interim') {
        setInterim({ speaker: msg.speaker, text: msg.text });
        if (msg.speaker === 'ai' && mode === 'live') setStatus('ai-speaking');
      } else if (msg.type === 'transcript') {
        setTranscript((turns) => [...turns, { speaker: msg.speaker, text: msg.text }]);
        setInterim(null);
      } else if (msg.type === 'state') {
        if (msg.state === 'listening' && mode === 'live' && !audioRef.current?.isPlaying) setStatus('listening');
        if (msg.state === 'listening' && mode === 'text') setStatus('thinking');
      } else if (msg.type === 'audio-interrupted') {
        audioRef.current?.stopPlayback();
        setStatus('listening');
      } else if (msg.type === 'limit-reached') {
        audioRef.current?.stopMicrophone();
        setStatus('ai-speaking');
      } else if (msg.type === 'limit-complete') {
        limitCompletionPendingRef.current = true;
        if (!audioRef.current?.isPlaying) void endInterview();
      } else if (msg.type === 'ended') {
        endAckRef.current?.();
        endAckRef.current = null;
      }
    };
    ws.onopen = () => { if (!disposed) setStatus('connecting'); };
    ws.addEventListener('open', () => console.info('[voice] interview websocket connected', { mode }));
    ws.onerror = () => {
      if (!disposed) {
        const message = 'Could not connect to the interview service. Check your connection and try again.';
        setError(previous => previous || message);
        setStatus('error');
      }
    };
    ws.onclose = (event) => {
      console.info('[voice] interview websocket disconnected', { code: event.code, reason: event.reason || 'none' });
      if (wsRef.current === ws) setConnected(false);
      if (!disposed && !endingRef.current) {
        audioRef.current?.stopMicrophone();
        const message = startedRef.current
          ? 'The live connection closed. Your saved transcript is available; end the interview to generate its report.'
          : 'The interview connection closed before it started. Check your login or choose the text interview.';
        setError(previous => previous || serverErrorRef.current || message);
        setStatus('error');
      }
    };

    return () => {
      disposed = true;
      if (wsRef.current === ws) wsRef.current = null;
      const audio = audioRef.current;
      audioRef.current = null;
      if (audio) void audio.close().catch(() => undefined);
      ws.close();
    };
  }, [id, mode]);

  useEffect(() => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    transcriptEndRef.current?.scrollIntoView({ behavior });
  }, [transcript, interim]);

  async function startLiveInterview() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || startedRef.current) return;
    setError('');
    setStatus('connecting');
    try {
      const audio = await LiveAudioSession.open(
        ws,
        () => setStatus('ai-speaking'),
        () => {
          audioRef.current?.resumeMicrophoneAfterResponse();
          if (limitCompletionPendingRef.current) void endInterview();
          else if (startedRef.current && !endingRef.current) setStatus('listening');
        },
        () => setStatus('thinking'),
      );
      if (wsRef.current !== ws || ws.readyState !== WebSocket.OPEN) {
        await audio.close();
        return;
      }
      audioRef.current = audio;
      startedRef.current = true;
      setStarted(true);
      setStatus('listening');
      ws.send(JSON.stringify({ type: 'start' }));
      console.info('[voice] live microphone capture started');
    } catch (cause) {
      const denied = cause instanceof DOMException && (cause.name === 'NotAllowedError' || cause.name === 'PermissionDeniedError');
      setError(denied
        ? 'Microphone permission was denied. Allow microphone access in your browser, or switch to the text interview.'
        : 'Could not start microphone audio. Check that a microphone is available, or switch to the text interview.');
      setStatus('error');
    }
  }

  function toggleMute() {
    const next = !muted;
    audioRef.current?.setMuted(next);
    setMuted(next);
    if (mode === 'live' && startedRef.current && !audioRef.current?.isPlaying) setStatus(next ? 'connected' : 'listening');
  }

  function submitAnswer(event: FormEvent) {
    event.preventDefault();
    const text = answer.trim();
    const ws = wsRef.current;
    if (!text || !ws || ws.readyState !== WebSocket.OPEN || status !== 'answering') return;
    setTranscript((turns) => [...turns, { speaker: 'user', text }]);
    setAnswer('');
    setError('');
    setStatus('thinking');
    ws.send(JSON.stringify({ type: 'answer', text }));
  }

  async function endInterview() {
    if (endingRef.current) return;
    endingRef.current = true;
    limitCompletionPendingRef.current = false;
    setStatus('ending');
    audioRef.current?.stopMicrophone();
    console.info('[voice] live microphone capture stopped', { reason: 'interview ended' });
    const ws = wsRef.current;
    if (mode === 'live' && ws?.readyState === WebSocket.OPEN) {
      const acknowledged = new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, 1500);
        endAckRef.current = () => { window.clearTimeout(timeout); resolve(); };
      });
      ws.send(JSON.stringify({ type: 'end' }));
      await acknowledged;
    }
    ws?.close();
    try {
      await api.endInterview(id!);
      setStatus('ended');
      navigate(`/report/${id}`);
    } catch (cause) {
      endingRef.current = false;
      setError(cause instanceof Error ? cause.message : 'Could not save the interview result.');
      setStatus('error');
    }
  }

  const statusLabel: Record<Status, string> = {
    connecting: 'Connecting', connected: 'Connected', listening: 'Listening', 'ai-speaking': 'AI Speaking',
    thinking: 'Thinking', answering: 'Your turn', error: 'Error', ending: 'Ending', ended: 'Ended',
  };

  const lastQuestion = [...transcript].reverse().find(turn => turn.speaker === 'ai');
  return <div className="pm-interview-page">
    <header className="pm-interview-header"><Link to="/dashboard" className="pm-brand"><span className="pm-brand-mark">✦</span><span>PrepMate AI <small>STUDIO</small></span></Link><span className="pm-status-pill" aria-live="polite">● {statusLabel[status]}</span><span className="pm-status-pill">{mode === 'live' ? 'Live voice' : 'Text interview'}</span></header>
    <main className="pm-interview-shell"><div className="pm-interview-grid"><section className="pm-interview-main">
      <div className="pm-card pm-voice-card" data-state={status} data-mode={mode} aria-live="polite"><div className="pm-voice-indicator">{mode === 'live' ? '♩' : '✎'}</div><div className="pm-audio-wave" aria-hidden="true">{Array.from({ length: 13 }, (_, index) => <i key={index} />)}</div><p>{connected ? (status === 'listening' ? 'Listening to your response…' : status === 'ai-speaking' ? 'Your interviewer is speaking…' : status === 'thinking' ? 'Preparing the next question…' : 'Interview session connected') : 'Connecting to your interview session…'}</p></div>
      <div className="pm-card pm-question-card"><span className="pm-eyebrow">AI interviewer prompt</span><span className="pm-status-pill" style={{float:'right'}}>{statusLabel[status]}</span>{lastQuestion ? <h1>{lastQuestion.text}</h1> : <h1>{connected ? 'Your interview is ready.' : 'Connecting to your interview…'}</h1>}{interim && <div className="pm-turn ai"><span className="pm-turn-label">{interim.speaker === 'ai' ? 'Interviewer' : 'You'} · live transcript</span><p>{interim.text}…</p></div>}{!lastQuestion && mode === 'live' && <p className="pm-muted">Start the voice session when you are ready.</p>}
        {error && <div role="alert" className="pm-alert">{error}</div>}
        {mode === 'text' && <form onSubmit={submitAnswer} className="pm-answer-form"><label>Your answer<textarea value={answer} onChange={event => setAnswer(event.target.value)} disabled={!connected || status !== 'answering'} placeholder={status === 'thinking' ? 'Preparing the next question…' : 'Type your answer here'} rows={3}/></label><button className="pm-button pm-button-primary" type="submit" disabled={!connected || status !== 'answering' || !answer.trim()}>Send answer</button></form>}
      </div>
      <div className="pm-control-bar">{mode === 'live' && !started && <button className="pm-button pm-button-primary" onClick={startLiveInterview} disabled={!connected || status === 'error'}>Start voice interview</button>}{mode === 'live' && started && <button onClick={toggleMute} disabled={status === 'ending' || status === 'ended'}>{muted ? 'Unmute microphone' : 'Mute microphone'}</button>}{mode === 'live' && started && status === 'listening' && <button className="pm-button pm-button-primary" onClick={() => { if (audioRef.current?.finishCandidateTurn('button clicked')) setStatus('thinking'); }}>Done answering</button>}{mode === 'live' && !started && <button onClick={() => { setTranscript([]); setInterim(null); setError(''); setMode('text'); }}>Switch to text</button>}{mode === 'text' && !started && <button onClick={() => { setTranscript([]); setInterim(null); setError(''); setMode('live'); }}>Switch to voice</button>}{status !== 'ending' && status !== 'ended' && <button className="pm-end-button" onClick={endInterview}>End interview</button>}</div>
    </section><aside className="pm-card pm-transcript"><div className="pm-panel-head"><h2 className="pm-card-title">Transcript</h2><span className="pm-eyebrow">{transcript.length} turns</span></div>{transcript.length ? transcript.map((turn,index)=><article key={`${index}-${turn.speaker}`} className={`pm-turn ${turn.speaker === 'ai' ? 'ai' : 'user'}`}><span className="pm-turn-label">{turn.speaker === 'ai' ? 'AI interviewer' : 'You'}</span><p>{turn.text}</p></article>) : <p className="pm-page-subtitle">Your conversation will appear here as you practice.</p>}{interim && <div ref={transcriptEndRef}/>}</aside></div></main>
  </div>;
}
