/**
 * backend/routes/auth.js
 *
 * OAuth flow using googleapis (no Passport). Stores tokens and user info
 * in the express session (req.session.tokens, req.session.user).
 *
 * IMPORTANT: Make sure your Google Cloud OAuth redirect URI matches:
 *   http://localhost:4000/auth/oauth2callback
 *
 * Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and SESSION_SECRET to backend/.env
 */
const express = require('express');
const { google } = require('googleapis');

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/oauth2callback';

// Scopes: read-only calendar + basic profile/email
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

function createOAuthClient() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

// 1) Redirect to Google consent screen
router.get('/google', (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).send('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in env.');
  }

  const oauth2Client = createOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // request refresh token
    prompt: 'consent',
    scope: SCOPES
  });

  res.redirect(authUrl);
});

// 2) OAuth2 callback
router.get('/oauth2callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code from Google');

    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    // store tokens in session (dev only)
    req.session.tokens = tokens;

    // fetch basic userinfo
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const userinfo = await oauth2.userinfo.get();

    req.session.user = {
      email: userinfo.data.email,
      name: userinfo.data.name,
      picture: userinfo.data.picture
    };

    // redirect back to frontend
    res.redirect('http://localhost:5173');
  } catch (err) {
    console.error('oauth callback error', err);
    res.status(500).send('OAuth callback error');
  }
});

// Status route (useful for UI)
router.get('/status', (req, res) => {
  try {
    const loggedIn = !!(req.session && req.session.tokens);
    res.json({
      loggedIn,
      user: req.session.user || null
    });
  } catch (err) {
    res.json({ loggedIn: false, user: null });
  }
});

// Logout: destroy session
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

module.exports = router;
