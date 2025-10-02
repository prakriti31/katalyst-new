/**
 * backend/routes/calendar.js
 *
 * Serve real Google Calendar events ONLY. If the user is not authenticated
 * (no tokens in session) this endpoint returns 401 with a clear message.
 *
 * Frontend should call /auth/google to start the OAuth flow.
 */
const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

function createOAuthClientFromSession(req) {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/oauth2callback';

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  // Pull tokens from session
  if (!req.session || !req.session.tokens) {
    return null;
  }
  oauth2Client.setCredentials(req.session.tokens);
  return oauth2Client;
}

async function callGoogleCalendar(req, { timeMin, timeMax, limit = 10 }) {
  const oauth2Client = createOAuthClientFromSession(req);
  if (!oauth2Client) throw { code: 401, message: 'not_authenticated' };

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const resp = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    maxResults: limit,
    singleEvents: true,
    orderBy: 'startTime'
  });

  const items = resp.data.items || [];
  const events = items.map(e => {
    const start = e.start?.dateTime || e.start?.date || null;
    const end = e.end?.dateTime || e.end?.date || null;
    const attendees = (e.attendees || []).map(a => a.email).filter(Boolean);
    return {
      id: e.id,
      title: e.summary || 'No title',
      start,
      end,
      durationMinutes: start && end ? Math.round((new Date(end) - new Date(start)) / 60000) : 0,
      attendees,
      description: e.description || '',
      calendarId: e.organizer?.email || 'primary'
    };
  });

  return { events };
}

router.get('/events', async (req, res) => {
  try {
    const direction = req.query.direction === 'past' ? 'past' : 'upcoming';
    const limit = parseInt(req.query.limit || '10', 10);
    const now = new Date().toISOString();

    let timeMin, timeMax;
    if (direction === 'past') {
      timeMax = now;
      timeMin = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    } else {
      timeMin = now;
      timeMax = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();
    }

    // MUST use Google Calendar — no fallback to mock data
    const data = await callGoogleCalendar(req, { timeMin, timeMax, limit });
    const events = (data.events || []).slice(0, limit);

    // sort (Google already orders by startTime for upcoming; keep consistent)
    events.sort((a, b) => direction === 'past' ? new Date(b.start) - new Date(a.start) : new Date(a.start) - new Date(b.start));
    res.json({ events });
  } catch (err) {
    console.error('calendar error', err?.message || err);
    if (err && err.code === 401) {
      return res.status(401).json({ error: 'not_authenticated', message: 'Connect Google Calendar' });
    }
    res.status(500).json({ error: 'events_fetch_failed', details: err?.message || String(err) });
  }
});

module.exports = router;
