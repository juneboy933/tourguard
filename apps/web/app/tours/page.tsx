'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '../components/dashboard-shell';
import { api } from '../lib/api';

type Tour = { id: string; reference: string; name: string; destination?: string; status: string; startsAt: string; _count: { guests: number } };

export default function ToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  useEffect(() => { void api('/tours').then(async (response) => { if (response.ok) setTours(await response.json()); }); }, []);
  return <DashboardShell><main className="content"><div className="intro"><div><h2>Tours & guests</h2><p>Keep the operating context close to every report.</p></div><button className="button secondary" onClick={() => window.location.reload()}>Refresh tours</button></div><section className="panel"><div className="panel-header"><h3>Your tours</h3><span style={{ color: 'var(--muted)', fontSize: 13 }}>{tours.length} tours</span></div><div className="table-wrap"><table><thead><tr><th>Tour</th><th>Destination</th><th>Guests</th><th>Start</th><th>Status</th></tr></thead><tbody>{tours.map((tour) => <tr key={tour.id}><td><strong>{tour.reference}</strong><br /><span style={{ color: 'var(--muted)' }}>{tour.name}</span></td><td>{tour.destination ?? '—'}</td><td>{tour._count.guests}</td><td>{new Date(tour.startsAt).toLocaleDateString()}</td><td><span className={`status ${tour.status}`}>{tour.status}</span></td></tr>)}</tbody></table>{tours.length === 0 && <div className="empty">No tours have been created yet.</div>}</div></section></main></DashboardShell>;
}
