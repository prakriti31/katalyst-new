// frontend/src/components/MeetingsList.tsx
import React, { useEffect, useState } from 'react';
import { fetchAllEvents, fetchEvents, Meeting } from '../api';
import MeetingCard from './MeetingCard';
import Loading from './Loading';

export default function MeetingsList() {
  const [upcoming, setUpcoming] = useState<Meeting[] | null>(null);
  const [past, setPast] = useState<Meeting[] | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Meeting[] | null>(null);
  const [pastEvents, setPastEvents] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needAuth, setNeedAuth] = useState(false);
  const [summaries, setSummaries] = useState<Record<string,string>>({});
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setNeedAuth(false);
      setUpcoming(null);
      setPast(null);
      setUpcomingEvents(null);
      setPastEvents(null);

      const data = await fetchAllEvents();
      // Meetings (with attendees)
      setUpcoming(data.upcomingMeetings as any);
      setPast(data.pastMeetings as any);
      // All events
      setUpcomingEvents(data.upcomingEvents as any);
      setPastEvents(data.pastEvents as any);
    } catch (err: any) {
      // If backend returned not_authenticated, show connect flow
      if (err?.status === 401 || (err?.body && err.body?.error === 'not_authenticated')) {
        setNeedAuth(true);
        setError(null);
        setUpcoming([]);
        setPast([]);
        return;
      }
      console.error(err);
      setError(err?.message || 'Failed to fetch events');
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSummarize(meeting: Meeting) {
    try {
      setSummarizingId(meeting.id);
      // Call summarize via backend (backend will decide mock/openai)
      const resp = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting }),
        credentials: 'include'
      });

      const data = await resp.json();
      setSummaries(prev => ({ ...prev, [meeting.id]: data.summary || 'No summary' }));
    } catch (err:any) {
      console.error(err);
      setSummaries(prev => ({ ...prev, [meeting.id]: 'Summary failed' }));
    } finally {
      setSummarizingId(null);
    }
  }

  if (needAuth) {
    return (
      <div className="p-6 container mx-auto">
        <h2 className="text-xl font-semibold mb-3">Connect your Google Calendar</h2>
        <p className="mb-4 text-slate-600">This app now uses real calendar events only. Please connect your Google account to continue.</p>
        <a href="http://localhost:4000/auth/google" className="px-4 py-2 bg-blue-600 text-white rounded">Connect Google Calendar</a>
      </div>
    );
  }

  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!upcoming || !past || !upcomingEvents || !pastEvents) return <Loading message="Loading events..." />;

  return (
    <div className="p-6 container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div>
          <button onClick={() => { setUpcoming(null); setPast(null); load(); }} className="px-3 py-1 border rounded">Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">Upcoming Meetings</h2>
          <div className="space-y-4">
            {upcoming.map(m => <MeetingCard key={m.id} meeting={m} />)}
            {upcoming.length === 0 && <div className="text-slate-500">No upcoming meetings.</div>}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Upcoming Events</h2>
          <div className="space-y-4">
            {upcomingEvents.map((m:any) => <MeetingCard key={(m.id||m.start)+m.title} meeting={m} />)}
            {upcomingEvents.length === 0 && <div className="text-slate-500">No upcoming events.</div>}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Past Meetings</h2>
          <div className="space-y-4">
            {past.map(m => (
              <div key={m.id}>
                <MeetingCard meeting={m} onSummarize={handleSummarize} summarizing={summarizingId === m.id} />
                {summaries[m.id] && <div className="mt-2 p-3 bg-slate-50 border rounded text-sm whitespace-pre-wrap">{summaries[m.id]}</div>}
              </div>
            ))}
            {past.length === 0 && <div className="text-slate-500">No past meetings.</div>}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Past Events</h2>
          <div className="space-y-4">
            {pastEvents.map((m:any) => <MeetingCard key={(m.id||m.start)+m.title} meeting={m} />)}
            {pastEvents.length === 0 && <div className="text-slate-500">No past events.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
