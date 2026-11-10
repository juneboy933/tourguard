'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { api } from '../lib/api';

type User = { name: string; email: string; role: string };
const links = [{ href: '/', label: 'Overview', icon: '⌂' }, { href: '/incidents', label: 'Incidents', icon: '!' }, { href: '/tours', label: 'Tours & guests', icon: '◈' }];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const [user, setUser] = useState<User | null>(null); const [checked, setChecked] = useState(false); const [email, setEmail] = useState('admin@tourguard.local'); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  useEffect(() => { void api('/auth/me').then(async (response) => { if (response.ok) setUser((await response.json()).user); setChecked(true); }); }, []);
  async function login(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); const response = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); if (!response.ok) { setError('The email or password is not valid.'); return; } setUser((await response.json()).user); setPassword(''); }
  async function logout() { await api('/auth/logout', { method: 'POST' }); setUser(null); router.push('/'); }
  if (!checked) return <main className="login-card"><p className="eyebrow">TourGuard</p><p>Loading secure workspace…</p></main>;
  if (!user) return <main className="login-card"><div className="brand"><div className="brand-mark">✓</div><div><span className="brand-name">TOURGUARD</span><span className="brand-subtitle">Safety operations</span></div></div><h1 style={{ marginTop: 32 }}>Welcome back</h1><p style={{ color: 'var(--muted)', lineHeight: 1.5 }}>Sign in to monitor tour reports and coordinate a calm response.</p>{error && <p className="notice" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>{error}</p>}<form onSubmit={login}><label className="field">Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label><label className="field">Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required /></label><button className="button" type="submit">Sign in securely</button></form></main>;
  const title = pathname === '/incidents' ? 'Incident desk' : pathname === '/tours' ? 'Tours & guests' : 'Operations overview';
  return <div className="app-shell"><aside className="sidebar"><Link className="brand" href="/"><div className="brand-mark">✓</div><div><span className="brand-name">TOURGUARD</span><span className="brand-subtitle">Safety operations</span></div></Link><nav className="nav-group"><div className="nav-label">Workspace</div>{links.map((link) => <Link className={`nav-link ${pathname === link.href ? 'active' : ''}`} href={link.href} key={link.href}><b>{link.icon}</b><span>{link.label}</span></Link>)}</nav><div className="sidebar-footer">Reports are handled with care. Every action is recorded for a clear operational history.</div></aside><div className="main-area"><header className="topbar"><div><p className="eyebrow">Operator workspace</p><h1>{title}</h1></div><div className="operator-chip"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><span>{user.name} · {user.role}</span><button className="button secondary" onClick={() => void logout()}>Sign out</button></div></header>{children}</div></div>;
}
