import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  const endAckRef = useRef<(() => void) | null>(null);
  const limitCompletionPendingRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = encodeURIComponent(localStorage.getItem('pm.token') || '');
    const ws = new WebSocket(`${scheme}//${location.host}/ws/voice?sessionId=${encodeURIComponent(id || '')}&mode=${mode}&token=${token}`);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onmessage = (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.type === 'error') {
        audioRef.current?.stopMicrophone();
        setError(msg.message || 'The interview could not continue.');
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
        catch { setError('Gemini returned audio that could not be played. You can end the interview and keep the saved transcript.'); setStatus('error'); }
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
    ws.onerror = () => {
      if (!disposed) {
        setError('Could not connect to the interview service. Check your connection and try again.');
        setStatus('error');
      }
    };
    ws.onclose = () => {
      if (wsRef.current === ws) setConnected(false);
      if (!disposed && !endingRef.current) {
        audioRef.current?.stopMicrophone();
        setError(startedRef.current
          ? 'The live connection closed. Your saved transcript is available; end the interview to generate its report.'
          : 'The interview connection closed before it started. Check your login or choose the text interview.');
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
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          if (limitCompletionPendingRef.current) void endInterview();
          else if (startedRef.current && !endingRef.current) setStatus('listening');
        },
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

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <header className="min-h-14 border-b bg-white flex items-center px-6 py-3 gap-4">
        <div className="font-semibold">PrepMate AI · {mode === 'live' ? 'Live Voice Interview' : 'Text Interview'}</div>
        <div className="ml-auto flex items-center gap-2 text-xs mono uppercase text-neutral-500">
          <span className={`w-2 h-2 rounded-full ${status === 'listening' || status === 'connected' || status === 'answering' ? 'bg-emerald-500' : status === 'ai-speaking' || status === 'thinking' ? 'bg-accent' : status === 'error' ? 'bg-red-500' : 'bg-neutral-400'}`} />
          {statusLabel[status]}
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full py-10 px-6 flex-1">
        {mode === 'live' && <div className="mb-8 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">Your microphone audio streams securely through the authenticated backend to Gemini Live. Gemini’s audio and transcript return through the same session.</div>}
        {!connected && !error && <p className="text-sm text-neutral-500">Connecting to your interview…</p>}
        {transcript.map((turn, index) => (
          <div key={`${index}-${turn.speaker}`} className="mb-6 flex gap-4">
            <div className="w-24 shrink-0 text-xs uppercase text-neutral-400 mono pt-1">{turn.speaker === 'ai' ? 'AI Interviewer' : 'You'}</div>
            <div className={`flex-1 whitespace-pre-wrap text-[16px] leading-relaxed ${turn.speaker === 'user' ? 'text-neutral-600' : ''}`}>{turn.text}</div>
          </div>
        ))}
        {interim && <div className="mb-6 flex gap-4"><div className="w-24 shrink-0 text-xs uppercase text-neutral-400 mono pt-1">{interim.speaker === 'ai' ? 'AI Interviewer' : 'You'}</div><div className="flex-1 text-neutral-400 italic">{interim.text}…</div></div>}
        <div ref={transcriptEndRef} />
        {error && <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      </main>

      <div className="sticky bottom-0 border-t bg-white px-4 py-4">
        {mode === 'text' && <form onSubmit={submitAnswer} className="max-w-3xl mx-auto mb-3 flex items-end gap-3">
          <label className="flex-1 text-sm text-neutral-600">Your answer
            <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={!connected || status !== 'answering'} placeholder={status === 'thinking' ? 'Gemini is preparing the next question…' : 'Type your answer here'} rows={3} className="mt-1 block w-full resize-y rounded-md border border-neutral-300 p-3 text-neutral-900 outline-none focus:border-indigo-500 disabled:bg-neutral-100" />
          </label>
          <button type="submit" disabled={!connected || status !== 'answering' || !answer.trim()} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">Send answer</button>
        </form>}
        <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-3">
          {mode === 'live' && !started && <button onClick={startLiveInterview} disabled={!connected || status === 'error'} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">Start Live Voice Interview</button>}
          {mode === 'live' && started && <button onClick={toggleMute} disabled={status === 'ending' || status === 'ended'} className="rounded-md border px-4 py-2 text-sm">{muted ? 'Unmute' : 'Mute'}</button>}
          {mode === 'live' && !started && <button onClick={() => { setTranscript([]); setInterim(null); setError(''); setMode('text'); }} className="rounded-md border px-4 py-2 text-sm">Use text interview</button>}
          {mode === 'text' && !started && <button onClick={() => { setTranscript([]); setInterim(null); setError(''); setMode('live'); }} className="rounded-md border px-4 py-2 text-sm">Try Live Voice Interview</button>}
          {status !== 'ending' && status !== 'ended' && <button onClick={endInterview} className="rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50">End interview</button>}
        </div>
      </div>
    </div>
  );
}
