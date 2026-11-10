'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardShell } from './components/dashboard-shell';
import { api } from './lib/api';

type Incident = { id: string; reference: string; status: string; summary: string; createdAt: string; tour: { reference: string; name: string } };
type Tour = { id: string; reference: string; name: string; status: string; _count: { guests: number } };

export default function HomePage() {
  const [incidents, setIncidents] = useState<Incident[]>([]); const [tours, setTours] = useState<Tour[]>([]);
  useEffect(() => { void Promise.all([api('/incidents'), api('/tours')]).then(async ([incidentResponse, tourResponse]) => { if (incidentResponse.ok) setIncidents(await incidentResponse.json()); if (tourResponse.ok) setTours(await tourResponse.json()); }); }, []);
  const open = incidents.filter((incident) => incident.status === 'OPEN').length;
  const activeTours = tours.filter((tour) => tour.status === 'ACTIVE').length;
  return <DashboardShell><main className="content"><div className="intro"><div><h2>Good to see you</h2><p>A clear view of today’s reports and tours.</p></div><Link className="button" href="/incidents">Review incidents</Link></div><div className="stat-grid"><div className="stat-card"><div className="stat-label">Open incidents</div><div className="stat-value">{open}</div><div className="stat-note">Needs operator attention</div></div><div className="stat-card"><div className="stat-label">Active tours</div><div className="stat-value">{activeTours}</div><div className="stat-note">Currently in progress</div></div><div className="stat-card"><div className="stat-label">Total reports</div><div className="stat-value">{incidents.length}</div><div className="stat-note">Across your workspace</div></div><div className="stat-card"><div className="stat-label">Response posture</div><div className="stat-value">Calm</div><div className="stat-note">One clear next step at a time</div></div></div><div className="two-column"><section className="panel"><div className="panel-header"><h3>Recent reports</h3><Link href="/incidents" style={{ color: 'var(--teal)', fontSize: 13, fontWeight: 700 }}>View all</Link></div><div className="panel-body">{incidents.slice(0, 5).map((incident) => <div className="incident-row" key={incident.id}><div><div className="incident-title">{incident.reference} · {incident.summary}</div><div className="incident-meta">{incident.tour.reference} · {new Date(incident.createdAt).toLocaleString()}</div></div><span className={`status ${incident.status}`}>{incident.status}</span></div>)}{incidents.length === 0 && <div className="empty">No reports yet. Your workspace is clear.</div>}</div></section><section className="panel"><div className="panel-header"><h3>Safety rhythm</h3></div><div className="panel-body"><div className="notice">Reports are received by SMS, checked against the active tour, and placed here for an operator decision.</div><div style={{ marginTop: 24 }}><h3 style={{ color: 'var(--navy)' }}>A simple flow</h3><p style={{ color: 'var(--muted)', lineHeight: 1.6, fontSize: 14 }}>Receive → review → acknowledge → resolve. Every transition stays visible in the incident history.</p></div></div></section></div></main></DashboardShell>;
}
