'use client';

import { useEffect, useState, type FormEvent } from 'react';

type Incident = {
  id: string;
  reference: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
  summary: string;
  createdAt: string;
  version: number;
  tour: { reference: string; name: string };
  reportedGuestMembership?: { guest: { name: string } };
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

function csrfToken() {
  return document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('tourguard_csrf='))?.split('=').slice(1).join('=') ?? '';
}

export default function HomePage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('admin@tourguard.local');
  const [password, setPassword] = useState('');
  const [signedIn, setSignedIn] = useState(false);

  async function loadIncidents() {
    const response = await fetch(`${apiBase}/incidents`, { credentials: 'include' });
    if (response.ok) { setIncidents(await response.json()); setSignedIn(true); }
    else setMessage('Sign in as an operator to view incidents.');
  }

  useEffect(() => { void loadIncidents(); }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`${apiBase}/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (response.ok) { setPassword(''); setMessage('Signed in.'); await loadIncidents(); }
    else setMessage('Invalid credentials.');
  }

  async function transition(action: 'acknowledge' | 'dismiss' | 'resolve') {
    if (!selected) return;
    const body = action === 'resolve' ? { notes: 'Resolved by operator', expectedVersion: selected.version } : { expectedVersion: selected.version };
    const response = await fetch(`${apiBase}/incidents/${selected.id}/${action}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() }, body: JSON.stringify(body) });
    if (response.ok) { setMessage(`Incident ${action === 'dismiss' ? 'dismissed' : `${action}d`}.`); setSelected(null); await loadIncidents(); }
    else setMessage('The incident could not be updated. Refresh and try again.');
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, sans-serif', color: '#18212f' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid #d8dee8', paddingBottom: 20 }}>
        <div><p style={{ color: '#4568a8', fontWeight: 700, letterSpacing: 1 }}>TOURGUARD</p><h1 style={{ margin: 0 }}>Incident desk</h1></div>
        <button onClick={() => void loadIncidents()} style={{ padding: '9px 14px', border: '1px solid #b8c2d1', borderRadius: 6, background: 'white' }}>Refresh</button>
      </header>
      {message && <p role="status" style={{ background: '#f1f5fb', padding: 12, borderRadius: 6 }}>{message}</p>}
      {!signedIn && <form onSubmit={login} style={{ maxWidth: 420, display: 'grid', gap: 10, marginTop: 28, padding: 20, border: '1px solid #d8dee8', borderRadius: 8 }}><h2>Operator sign in</h2><label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required style={{ display: 'block', width: '100%', padding: 9, marginTop: 4 }} /></label><label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required style={{ display: 'block', width: '100%', padding: 9, marginTop: 4 }} /></label><button type="submit" style={{ padding: 10 }}>Sign in</button></form>}
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)', gap: 24, marginTop: 28 }}>
        <div><h2>Reports</h2>{incidents.length === 0 ? <p>No incidents available.</p> : <div style={{ display: 'grid', gap: 10 }}>{incidents.map((incident) => <button key={incident.id} onClick={() => setSelected(incident)} style={{ textAlign: 'left', padding: 16, border: selected?.id === incident.id ? '2px solid #4568a8' : '1px solid #d8dee8', borderRadius: 8, background: 'white' }}><strong>{incident.reference}</strong><span style={{ marginLeft: 12, fontSize: 12, color: '#526071' }}>{incident.status}</span><div style={{ marginTop: 6 }}>{incident.summary}</div><small>{incident.tour.reference} · {new Date(incident.createdAt).toLocaleString()}</small></button>)}</div>}</div>
        <aside style={{ border: '1px solid #d8dee8', borderRadius: 8, padding: 20, minHeight: 220 }}><h2>Details</h2>{selected ? <><p><strong>{selected.reference}</strong> · {selected.status}</p><p>{selected.summary}</p><p>Tour: {selected.tour.name} ({selected.tour.reference})</p><p>Guest: {selected.reportedGuestMembership?.guest.name ?? 'Not specified'}</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{selected.status === 'OPEN' && <><button onClick={() => void transition('acknowledge')}>Acknowledge</button><button onClick={() => void transition('dismiss')}>Dismiss</button></>}{selected.status === 'ACKNOWLEDGED' && <button onClick={() => void transition('resolve')}>Resolve</button>}</div></> : <p>Select an incident to inspect its status and available actions.</p>}</aside>
      </section>
    </main>
  );
}
