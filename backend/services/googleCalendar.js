const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

function createOAuthClient() {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/oauth2callback';

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  }

  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

function readTokensFromFileIfPresent() {
  try {
    const tokenPath = path.resolve(process.cwd(), 'tokens.json');
    if (fs.existsSync(tokenPath)) {
      const raw = fs.readFileSync(tokenPath, 'utf8');
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (_) {
    // ignore file read/parse errors and fall through to unauthenticated
  }
  return null;
}

async function getAuthedCalendar(req) {
  // Prefer session tokens; fall back to tokens.json for CLI/desktop flows
  let tokens = (req.session && req.session.tokens) || readTokensFromFileIfPresent();

  if (!tokens) {
    const err = new Error('Not authenticated with Google');
    err.statusCode = 401;
    throw err;
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials(tokens);

  // Automatic refresh handling: listen for new tokens and persist in session
  oauth2Client.on('tokens', (newTokens) => {
    // Update in-memory session if available
    if (req.session) {
      req.session.tokens = {
        ...(req.session.tokens || {}),
        ...newTokens
      };
    }
    // Also persist to tokens.json (dev convenience) when refreshed
    try {
      const tokenPath = path.resolve(process.cwd(), 'tokens.json');
      const merged = { ...(tokens || {}), ...newTokens };
      fs.writeFileSync(tokenPath, JSON.stringify(merged, null, 2));
      tokens = merged;
    } catch (_) {
      // ignore fs errors silently
    }
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

function normalizeEvent(googleEvent) {
  const start = googleEvent.start?.dateTime || googleEvent.start?.date || null;
  const end = googleEvent.end?.dateTime || googleEvent.end?.date || null;
  const attendees = (googleEvent.attendees || [])
    .map(a => a.email)
    .filter(Boolean);

  return {
    title: googleEvent.summary || '',
    start,
    end,
    attendees,
    description: googleEvent.description || ''
  };
}

async function listEvents(req, { timeMin, timeMax, maxResults = 100, requireAttendees = false }) {
  const calendar = await getAuthedCalendar(req);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    maxResults,
    singleEvents: true,
    orderBy: 'startTime'
  });

  let items = response.data.items || [];
  if (requireAttendees) {
    items = items.filter(e => Array.isArray(e.attendees) && e.attendees.length > 0);
  }

  return items.map(normalizeEvent);
}

module.exports = {
  listEvents
};



