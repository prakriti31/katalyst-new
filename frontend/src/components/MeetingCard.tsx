import React from 'react';
import { Meeting } from '../api';

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function MeetingCard({ meeting, onSummarize, summarizing }: { meeting: Meeting; onSummarize?: (m: Meeting)=>void; summarizing?: boolean }) {
  return (
    <div className="border rounded p-4 bg-white shadow-sm">
      <div className="flex justify-between">
        <div>
          <h3 className="font-semibold text-lg">{meeting.title}</h3>
          <div className="text-sm text-slate-600">{fmtTime(meeting.start)} — {fmtTime(meeting.end)} • {meeting.durationMinutes}m</div>
        </div>
        <div className="text-sm text-slate-500">{meeting.calendarId || 'primary'}</div>
      </div>
      <div className="mt-2 text-sm text-slate-700">{meeting.description || <span className="text-slate-400">No description</span>}</div>
      <div className="mt-3 text-sm text-slate-600">
        Attendees: {meeting.attendees?.length ? meeting.attendees.join(', ') : 'None'}
      </div>
      {onSummarize && (
        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => onSummarize(meeting)} className="px-3 py-1 bg-indigo-600 text-white rounded" disabled={summarizing}>
            {summarizing ? 'Summarizing...' : 'Summarize'}
          </button>
        </div>
      )}
    </div>
  );
}
