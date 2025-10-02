import { useEffect, useState } from "react";
import axios from "axios";

interface Meeting {
  id: string;
  title: string;
  start: string;
  end: string;
}

interface Event {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface TimelineData {
  pastMeetings: Meeting[];
  pastEvents: Event[];
  upcomingEvents: Event[];
  upcomingMeetings: Meeting[];
}

export default function TimelinePage() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get("http://localhost:4000/timeline", { withCredentials: true })
      .then((res) => setData(res.data))
      .catch(() => setError("Please authenticate with Google first."));
  }, []);

  if (error) return <p>{error}</p>;
  if (!data) return <p>Loading...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Timeline</h1>

      <section>
        <h2 className="text-xl font-semibold">Past Meetings</h2>
        <ul className="mt-2 space-y-2">
          {data.pastMeetings.map((m) => (
            <li key={m.id} className="p-3 bg-gray-200 rounded">
              <strong>{m.title}</strong> ({m.start} → {m.end})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Past Events</h2>
        <ul className="mt-2 space-y-2">
          {data.pastEvents.map((e) => (
            <li key={e.id} className="p-3 bg-gray-200 rounded">
              <strong>{e.summary || "No Title"}</strong> (
              {e.start.dateTime || e.start.date} → {e.end.dateTime || e.end.date})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Upcoming Events</h2>
        <ul className="mt-2 space-y-2">
          {data.upcomingEvents.map((e) => (
            <li key={e.id} className="p-3 bg-green-100 rounded">
              <strong>{e.summary || "No Title"}</strong> (
              {e.start.dateTime || e.start.date} → {e.end.dateTime || e.end.date})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Upcoming Meetings</h2>
        <ul className="mt-2 space-y-2">
          {data.upcomingMeetings.map((m) => (
            <li key={m.id} className="p-3 bg-green-100 rounded">
              <strong>{m.title}</strong> ({m.start} → {m.end})
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
