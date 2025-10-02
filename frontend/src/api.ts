// frontend/src/api.ts
import axios from 'axios';

const BASE = import.meta.env.DEV ? 'http://localhost:4000' : '';

export type Meeting = {
  id: string;
  title: string;
  start: string;
  end: string;
  durationMinutes: number;
  attendees: string[];
  description?: string;
  calendarId?: string;
};

const AX = axios.create({
  baseURL: BASE,
  withCredentials: true // IMPORTANT: include session cookie
});

export async function authStatus() {
  const resp = await AX.get('/auth/status');
  return resp.data as { loggedIn: boolean; user?: { email?: string; name?: string; picture?: string } | null };
}

export async function fetchEvents(direction: 'past' | 'upcoming', limit = 5) {
  try {
    const resp = await AX.get<{ events: Meeting[] }>(`/api/calendar/events`, {
      params: { direction, limit }
    });
    return resp.data.events;
  } catch (err: any) {
    // rethrow in a shape frontend can inspect
    const status = err?.response?.status || 500;
    const data = err?.response?.data || {};
    const e: any = new Error(data?.message || 'Failed to fetch events');
    e.status = status;
    e.body = data;
    throw e;
  }
}

export async function summarizeMeeting(meeting: Meeting) {
  const resp = await AX.post(`/api/summarize`, { meeting });
  return resp.data;
}
