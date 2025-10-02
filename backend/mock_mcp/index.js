const sampleEvents = require('./sampleEvents');

module.exports = {
  listEvents: ({ timeMin, timeMax, limit = 10 }) => {
    const tmMin = timeMin ? new Date(timeMin) : new Date(Date.now() - 365 * 24 * 3600 * 1000);
    const tmMax = timeMax ? new Date(timeMax) : new Date(Date.now() + 365 * 24 * 3600 * 1000);
    const all = sampleEvents.generateSampleEvents();
    const filtered = all.filter(ev => {
      const s = new Date(ev.start);
      return s >= tmMin && s <= tmMax;
    });
    return { events: filtered.slice(0, limit) };
  }
};
