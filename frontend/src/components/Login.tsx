import React, { useState } from 'react';

export default function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const token = btoa(`${email}|${name}|${Date.now()}`);
    onLogin(token);
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white shadow rounded">
      <h2 className="text-xl font-semibold mb-4">Mock Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-700">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border rounded p-2" required />
        </div>
        <div>
          <label className="block text-sm text-slate-700">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full border rounded p-2" required />
        </div>
        <div className="flex justify-end">
          <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit">Sign In</button>
        </div>
      </form>
    </div>
  );
}
