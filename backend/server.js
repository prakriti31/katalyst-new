require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const calendarRoutes = require('./routes/calendar');
const authRoutes = require('./routes/auth');

const app = express();

// CORS: allow frontend origin and credentials
app.use(cors({
  origin: 'http://localhost:5173', // Vite frontend
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

// Auth / OAuth routes
app.use('/auth', authRoutes);

// Calendar endpoints (calls MCP or Google Calendar if signed in)
app.use('/api/calendar', calendarRoutes);

// Summarize endpoint
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post('/api/summarize', async (req, res) => {
  try {
    const { meeting } = req.body;
    if (!meeting) return res.status(400).json({ error: 'meeting required' });

    if (!OPENAI_API_KEY) {
      const mock = `Summary (mock): "${meeting.title}" — ${meeting.attendees?.length || 0} attendee(s). Duration ${(new Date(meeting.end) - new Date(meeting.start)) / 60000} minutes. Notes: ${meeting.description ? meeting.description.slice(0, 120) : 'No description.'}`;
      return res.json({ summary: mock, source: 'mock' });
    }

    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    const prompt = `Summarize the following meeting in 3 concise bullet points and a one-sentence action item:

Title: ${meeting.title}
Start: ${meeting.start}
End: ${meeting.end}
Attendees: ${meeting.attendees ? meeting.attendees.join(', ') : 'none'}
Description: ${meeting.description || 'none'}

Provide bullets and one action.`;

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
