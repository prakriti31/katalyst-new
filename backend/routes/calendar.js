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
const { listEvents } = require('../services/googleCalendar');
const { google } = require('googleapis');

function buildWindow({ direction }) {
  const nowIso = new Date().toISOString();
  if (direction === 'past') {
    // Limit to last 365 days to avoid massive responses
    const oneYearAgoIso = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
    return { timeMin: oneYearAgoIso, timeMax: nowIso };
  }
  // Upcoming: next 365 days
  const oneYearAheadIso = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  return { timeMin: nowIso, timeMax: oneYearAheadIso };
}

function ok(json) {
  return json;
}

function handleError(res, err, fallbackCode = 500, fallbackMessage = 'calendar_error') {
  const status = err?.statusCode || err?.code || fallbackCode;
  if (status === 401) {
    return res.status(401).json({ error: 'not_authenticated', message: 'Connect Google Calendar' });
  }
  const details = err?.message || String(err);
  return res.status(status >= 400 && status < 600 ? status : fallbackCode).json({ error: fallbackMessage, details });
}

// GET /api/calendar/upcoming-meetings
router.get('/upcoming-meetings', async (req, res) => {
  try {
    const { timeMin, timeMax } = buildWindow({ direction: 'upcoming' });
    const events = await listEvents(req, { timeMin, timeMax, maxResults: 250, requireAttendees: true });
    res.json(ok(events));
  } catch (err) {
    handleError(res, err, 500, 'upcoming_meetings_failed');
  }
});

// GET /api/calendar/upcoming-events
router.get('/upcoming-events', async (req, res) => {
  try {
    const { timeMin, timeMax } = buildWindow({ direction: 'upcoming' });
    const events = await listEvents(req, { timeMin, timeMax, maxResults: 250, requireAttendees: false });
    res.json(ok(events));
  } catch (err) {
    handleError(res, err, 500, 'upcoming_events_failed');
  }
});

// GET /api/calendar/past-meetings
router.get('/past-meetings', async (req, res) => {
  try {
    const { timeMin, timeMax } = buildWindow({ direction: 'past' });
    const events = await listEvents(req, { timeMin, timeMax, maxResults: 250, requireAttendees: true });
    res.json(ok(events));
  } catch (err) {
    handleError(res, err, 500, 'past_meetings_failed');
  }
});

// GET /api/calendar/past-events
router.get('/past-events', async (req, res) => {
  try {
    const { timeMin, timeMax } = buildWindow({ direction: 'past' });
    const events = await listEvents(req, { timeMin, timeMax, maxResults: 250, requireAttendees: false });
    res.json(ok(events));
  } catch (err) {
    handleError(res, err, 500, 'past_events_failed');
  }
});

module.exports = router;

/**
 * GET /api/calendar/all-events
 *
 * Aggregates events into four categories using Google Calendar via `googleapis`:
 * - upcomingMeetings: events starting now or later that include attendees
 * - upcomingEvents:   events starting now or later (all events)
 * - pastMeetings:     events that ended before now and include attendees
 * - pastEvents:       events that ended before now (all events)
 *
 * Uses session tokens (preferred) or tokens.json fallback and auto-refresh.
 * Returns 401 if not authenticated.
 */
router.get('/all-events', async (req, res) => {
  const nowIso = new Date().toISOString();

  function windowFor(direction) {
    if (direction === 'past') {
      const oneYearAgoIso = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
      return { timeMin: oneYearAgoIso, timeMax: nowIso };
    }
    const oneYearAheadIso = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
    return { timeMin: nowIso, timeMax: oneYearAheadIso };
  }

  try {
    const upcomingWindow = windowFor('upcoming');
    const pastWindow = windowFor('past');

    // Fetch in parallel for performance
    const [
      upcomingMeetings,
      upcomingEvents,
      pastMeetings,
      pastEvents
    ] = await Promise.all([
      listEvents(req, { ...upcomingWindow, maxResults: 250, requireAttendees: true }),
      listEvents(req, { ...upcomingWindow, maxResults: 250, requireAttendees: false }),
      listEvents(req, { ...pastWindow, maxResults: 250, requireAttendees: true }),
      listEvents(req, { ...pastWindow, maxResults: 250, requireAttendees: false })
    ]);

    return res.json({
      upcomingMeetings,
      upcomingEvents,
      pastMeetings,
      pastEvents
    });
  } catch (err) {
    const status = err?.statusCode || err?.code || 500;
    if (status === 401) {
      return res.status(401).json({ error: 'not_authenticated', message: 'Connect Google Calendar' });
    }
    return res.status(500).json({ error: 'all_events_failed', details: err?.message || String(err) });
  }
});
