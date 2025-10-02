const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/oauth2callback';

// Scopes for read-only calendar access and email/profile info
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
    access_type: 'offline', // important to get a refresh token
    prompt: 'consent',
    scope: SCOPES
  });

  // Redirect the user to Google consent screen
  res.redirect(authUrl);
});

// 2) OAuth2 callback
router.get('/oauth2callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');

    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    // store tokens in session (for dev). This ties the calendar calls to this browser session.
    req.session.tokens = tokens;

    // We can also fetch userinfo to know which email is connected (optional)
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const userinfo = await oauth2.userinfo.get();

    req.session.user = {
      email: userinfo.data.email,
      name: userinfo.data.name
    };

    // Redirect back to the frontend app home
    res.redirect('http://localhost:5173');
  } catch (err) {
    console.error('oauth callback error', err);
    res.status(500).send('OAuth callback error');
  }
});

// 3) Optional: endpoint to see session status
router.get('/status', (req, res) => {
  res.json({
    loggedIn: !!req.session.tokens,
    user: req.session.user || null
  });
});

// 4) Logout: destroy session
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

module.exports = router;
