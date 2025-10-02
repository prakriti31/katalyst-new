// frontend/src/App.tsx
import React, { useEffect, useState } from 'react';
import MeetingsList from './components/MeetingsList';
import { authStatus } from './api';

export default function App() {
  const [googleStatus, setGoogleStatus] = useState<{ loggedIn: boolean; user?: { email?: string; name?: string } | null } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  async function check() {
    try {
      setCheckingStatus(true);
      const s = await authStatus();
      setGoogleStatus(s);
    } catch (err) {
      setGoogleStatus({ loggedIn: false, user: null });
    } finally {
      setCheckingStatus(false);
    }
  }

  useEffect(() => {
    check();
    // re-check on focus (useful after OAuth redirect)
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, []);

  async function handleLogout() {
    try {
      await fetch('http://localhost:4000/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      // ignore
    }
    // refresh status
    check();
  }

  return (
    <div>
      <header className="p-4 bg-white shadow">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-lg font-semibold">Katalyst — Google Calendar (Realtime only)</div>

          <div className="flex items-center space-x-3">
            {checkingStatus ? (
              <div className="text-sm text-slate-600">Checking connection…</div>
            ) : googleStatus?.loggedIn ? (
              <>
                <div className="text-sm text-slate-600">
                  Connected: <span className="font-medium">{googleStatus.user?.email || googleStatus.user?.name}</span>
                </div>
                <button onClick={handleLogout} className="px-3 py-1 border rounded">Disconnect</button>
              </>
            ) : (
              <a
                href="http://localhost:4000/auth/google"
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Sign in with Google
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="py-6">
        <MeetingsList />
      </main>

      <footer className="p-4 text-center text-sm text-slate-500">
        Realtime calendar only — demo/mock data disabled.
      </footer>
    </div>
  );
}
