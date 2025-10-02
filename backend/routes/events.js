import express from "express";
import { google } from "googleapis";

const router = express.Router();

function getCalendarClient(accessToken) {
  return google.calendar({
    version: "v3",
    auth: accessToken,
  });
}

router.get("/upcoming", async (req, res) => {
  if (!req.isAuthenticated() || !req.user.accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const calendar = getCalendarClient(req.user.accessToken);
    const now = new Date();
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    res.json(response.data.items || []);
  } catch (err) {
    console.error("Upcoming events error", err);
    res.status(500).json({ error: "Failed to fetch upcoming events" });
  }
});

router.get("/past", async (req, res) => {
  if (!req.isAuthenticated() || !req.user.accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const calendar = getCalendarClient(req.user.accessToken);
    const now = new Date();
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMax: now.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    res.json(response.data.items || []);
  } catch (err) {
    console.error("Past events error", err);
    res.status(500).json({ error: "Failed to fetch past events" });
  }
});

router.get("/upcoming-meetings", async (req, res) => {
  if (!req.isAuthenticated() || !req.user.accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const calendar = getCalendarClient(req.user.accessToken);
    const now = new Date();
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    const meetings = (response.data.items || []).filter(
      (event) => event.hangoutLink
    );
    res.json(meetings);
  } catch (err) {
    console.error("Upcoming meetings error", err);
    res.status(500).json({ error: "Failed to fetch upcoming meetings" });
  }
});

router.get("/past-meetings", async (req, res) => {
  if (!req.isAuthenticated() || !req.user.accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const calendar = getCalendarClient(req.user.accessToken);
    const now = new Date();
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMax: now.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    const meetings = (response.data.items || []).filter(
      (event) => event.hangoutLink
    );
    res.json(meetings);
  } catch (err) {
    console.error("Past meetings error", err);
    res.status(500).json({ error: "Failed to fetch past meetings" });
  }
});

export default router;
