function fmtIso(d) { return new Date(d).toISOString(); }

function generateSampleEvents() {
  const now = Date.now();
  const events = [];

  for (let i = 5; i >= 1; i--) {
    const start = new Date(now - i * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000); // 9am
    const end = new Date(start.getTime() + 45 * 60 * 1000);
    events.push({
      id: `past-${i}`,
      title: `Past meeting ${i}`,
      start: fmtIso(start),
      end: fmtIso(end),
      attendees: [`alice${i}@example.com`, `bob${i}@example.com`],
      description: `This is a demo past meeting number ${i}. Discussed demo items and tasks.`
    });
  }

  for (let i = 1; i <= 6; i++) {
    const start = new Date(now + i * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000); // 2pm
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    events.push({
      id: `upcoming-${i}`,
      title: `Upcoming sync ${i}`,
      start: fmtIso(start),
      end: fmtIso(end),
      attendees: [`pm${i}@example.com`, `engineer${i}@example.com`],
      description: `Planned follow-up and next steps for feature ${i}.`
    });
  }

  events.sort((a, b) => new Date(a.start) - new Date(b.start));
  return events;
}

module.exports = { generateSampleEvents };
