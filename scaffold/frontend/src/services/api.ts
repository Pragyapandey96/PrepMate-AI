
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/$/, '');

// Empty base URL keeps local development working with Vite's proxy.


const token = () => localStorage.getItem('pm.token') || '';

export class ApiError extends Error {
  constructor(public status: number, public body: any, message: string) { super(message); }
}

async function json<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token()}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = { error: text }; }
    throw new ApiError(res.status, body, body.message || body.error || `API ${res.status}`);
  }
  return res.json();
}

export const api = {
  signup: (payload: { name: string; email: string; password: string }) => json<{ token: string; user: { id: string; name: string; email: string } }>('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) => json<{ token: string; user: { id: string; name: string; email: string } }>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => json<{ user: { id: string; name: string; email: string } }>('/auth/me'),
  logout: () => json<{ message: string }>('/auth/logout', { method: 'POST' }),
  uploadResume: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_BASE_URL}/api/resume/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
      body: fd,
    });
    if (!res.ok) throw new Error(`resume upload failed: ${res.status}`);
    return res.json();
  },
  analyzeJD: (text: string) => json<any>('/job-description/analyze', { method: 'POST', body: JSON.stringify({ text }) }),
  createInterview: (payload: any) => json<any>('/interviews', { method: 'POST', body: JSON.stringify(payload) }),
  endInterview: (id: string) => json<any>(`/interviews/${id}/end`, { method: 'POST' }),
  getReport: (id: string) => json<any>(`/interviews/${id}/report`),
  getDashboard: () => json<any>('/dashboard'),
  listInterviews: () => json<any[]>('/interviews'),
  getInterview: (id: string) => json<any>(`/interviews/${id}`),
};
