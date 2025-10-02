require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const calendarRoutes = require('./routes/calendar');
const authRoutes = require('./routes/auth');
const { google } = require('googleapis');
const { listEvents } = require('./services/googleCalendar');

const app = express();

const TOKEN_PATH = path.resolve(process.cwd(), 'tokens.json');
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// CORS: allow frontend origin and credentials
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', // Vite frontend
  credentials: true
}));

app.use(bodyParser.json());

// Simple in-memory session store for dev. DO NOT use in production.
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // dev only (http)
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.get('/', (req, res) => res.json({ ok: true, name: 'Katalyst MCP Demo Backend' }));

// Auth / OAuth routes (legacy or additional auth-specific routes)
app.use('/auth', authRoutes);

// Calendar endpoints (calls MCP or Google Calendar if signed in)
app.use('/api/calendar', calendarRoutes);

// ---------- Google OAuth helpers & endpoints ----------

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/oauth2callback`;

function createOAuthClient() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in env');
  }
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

// 1) Generate auth URL (open in browser to start OAuth)
app.get('/auth/url', (req, res) => {
  try {
    const oauth2Client = createOAuthClient();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.events.readonly',
        'openid',
        'email',
        'profile'
      ],
      prompt: 'consent'
    });
    res.json({ url });
  } catch (err) {
    console.error('/auth/url error', err);
    res.status(500).json({ error: 'failed_to_generate_auth_url', details: err.message || err });
  }
});

// Convenience redirect endpoint for frontend links
app.get('/auth/google', (req, res) => {
  try {
    const oauth2Client = createOAuthClient();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.events.readonly',
        'openid',
        'email',
        'profile'
      ],
      prompt: 'consent'
    });
    res.redirect(url);
  } catch (err) {
    console.error('/auth/google error', err);
    res.status(500).type('text/plain').send('Failed to initiate Google OAuth');
  }
});

// 2) OAuth2 callback — exchange code for tokens, save tokens, and return JSON with all four categories
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ error: 'missing_code' });
  }

  let oauth2Client;
  try {
    oauth2Client = createOAuthClient();
  } catch (err) {
    console.error('OAuth client creation failed:', err);
    return res.status(500).type('text/plain').send('Server misconfiguration: missing Google client credentials');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Save tokens to session and file (file only for dev convenience)
    req.session.tokens = tokens;
    try {
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      console.log('Saved tokens to', TOKEN_PATH);
    } catch (fsErr) {
      console.warn('Could not write tokens to file:', fsErr.message || fsErr);
    }

    // Return full JSON categories so caller immediately sees four arrays
    const nowIso = new Date().toISOString();
    const pastMin = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
    const futureMax = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

    // Redirect to the frontend with an auth flag; frontend will fetch all categories
    return res.redirect(`${FRONTEND_ORIGIN}/?authed=1`);
  } catch (err) {
    console.error('Error exchanging code or fetching events:', err);
    // If code already used or expired you'll often see invalid_grant here
    res.status(500).json({ error: 'oauth_exchange_failed', details: err.message || String(err) });
  }
});

// 3) Logout / clear session & token file (dev)
app.get('/auth/logout', (req, res) => {
  try {
    req.session.destroy(err => {
      if (err) console.warn('Session destroy error:', err);
    });
    if (fs.existsSync(TOKEN_PATH)) {
      try { fs.unlinkSync(TOKEN_PATH); } catch (e) { /* ignore */ }
    }
    res.json({ ok: true, message: 'logged_out' });
  } catch (err) {
    console.error('Logout error', err);
    res.status(500).json({ error: 'logout_failed' });
  }
});

// ---------- Summarize endpoint (kept, small improvements) ----------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post('/api/summarize', async (req, res) => {
  try {
    const { meeting } = req.body;
    if (!meeting) return res.status(400).json({ error: 'meeting required' });

    if (!OPENAI_API_KEY) {
      const mock = `Summary (mock): "${meeting.title}" — ${meeting.attendees?.length || 0} attendee(s). Duration ${(new Date(meeting.end) - new Date(meeting.start)) / 60000} minutes. Notes: ${meeting.description ? meeting.description.slice(0, 120) : 'No description.'}`;
      return res.json({ summary: mock, source: 'mock' });
    }

    // Use official OpenAI JS client
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    const prompt = `Summarize the following meeting in 3 concise bullet points and a one-sentence action item:

Title: ${meeting.title}
Start: ${meeting.start}
End: ${meeting.end}
Attendees: ${meeting.attendees ? meeting.attendees.join(', ') : 'none'}
Description: ${meeting.description || 'none'}

Provide bullets and one action.`;

    // Chat completion - depending on your openai package version, this should work:
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300
    });

    const text = completion.choices?.[0]?.message?.content || 'No summary returned';
    res.json({ summary: text, source: 'openai' });
  } catch (err) {
    console.error('summarize error', err?.message || err);
    res.status(500).json({ error: 'summary_failed', details: err?.message || err });
  }
});

// Start server
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
