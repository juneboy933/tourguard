'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardShell } from '../../components/dashboard-shell';
import { api } from '../../lib/api';

type Event = { id: string; eventType: string; actorType: string; createdAt: string };
type Incident = { reference: string; status: string; summary: string; createdAt: string; tour: { reference: string; name: string; status: string }; reportedGuestMembership?: { guest: { name: string; phone: string } }; reporterGuestMembership?: { guest: { name: string; phone: string } }; reporterUser?: { name: string; role: string }; events: Event[] };

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>(); const [incident, setIncident] = useState<Incident | null>(null);
  useEffect(() => { void api(`/incidents/${params.id}`).then(async (response) => { if (response.ok) setIncident(await response.json()); }); }, [params.id]);
  return <DashboardShell><main className="content"><Link href="/incidents" style={{ color: 'var(--teal)', fontSize: 13, fontWeight: 700 }}>← Back to incident desk</Link>{incident ? <><div className="intro" style={{ marginTop: 24 }}><div><p className="eyebrow">{incident.reference}</p><h2>{incident.summary}</h2><p>{incident.tour.name} · {incident.tour.reference}</p></div><span className={`status ${incident.status}`}>{incident.status}</span></div><div className="two-column"><section className="panel"><div className="panel-header"><h3>Report context</h3></div><div className="panel-body"><p><strong>Missing guest</strong><br />{incident.reportedGuestMembership?.guest.name ?? 'Not specified'}</p><p><strong>Reported by</strong><br />{incident.reporterUser ? `${incident.reporterUser.name} (guide)` : incident.reporterGuestMembership ? `${incident.reporterGuestMembership.guest.name} (guest)` : 'Unknown reporter'}</p><p><strong>Tour status</strong><br />{incident.tour.status}</p><p><strong>Received</strong><br />{new Date(incident.createdAt).toLocaleString()}</p></div></section><section className="panel"><div className="panel-header"><h3>Incident history</h3></div><div className="panel-body">{incident.events.map((event) => <div className="incident-row" key={event.id}><div><div className="incident-title">{event.eventType.replaceAll('_', ' ')}</div><div className="incident-meta">By {event.actorType.toLowerCase()} · {new Date(event.createdAt).toLocaleString()}</div></div></div>)}</div></section></div></> : <div className="panel" style={{ marginTop: 24 }}><div className="empty">Loading incident history…</div></div>}</main></DashboardShell>;
}
