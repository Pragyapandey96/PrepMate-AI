// Thin API client. All requests go through Vite's /api proxy.

const token = () => localStorage.getItem('pm.token') || '';

async function json<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token()}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
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
    const res = await fetch('/api/resume/upload', {
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
