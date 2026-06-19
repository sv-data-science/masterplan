'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useEffect } from 'react';
import { authApi } from '@/lib/api';
import { KitSVG } from '@/components/KitSVG';
import { DEFAULT_KIT, KitConfig } from '@/types';

export function Nav() {
  const { user, token, setUser, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (token && !user) {
      authApi.me().then(r => setUser(r.data)).catch(() => logout());
    }
  }, [token]);

  const baseLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/trivia', label: '🧠 Trivia', badge: 'New' },
    { href: '/matches', label: 'Matches' },
    { href: '/groups', label: 'Groups' },
    { href: '/top-scorers', label: 'Top Scorers' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ];
  const links = user
    ? [
        { href: '/', label: 'Dashboard' },
        { href: '/trivia', label: '🧠 Trivia', badge: 'New' },
        { href: '/kit', label: '🎽 My Uniform' },
        { href: '/my-predictions', label: 'My Picks' },
        { href: '/matches', label: 'Matches' },
        { href: '/groups', label: 'Groups' },
        { href: '/top-scorers', label: 'Top Scorers' },
        { href: '/leaderboard', label: 'Leaderboard' },
      ]
    : baseLinks;

  return (
    <header className="border-b border-[#30363d] bg-[#161b22] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-white shrink-0">
          <span className="text-2xl">⚽</span>
          <span className="hidden sm:inline text-green-400">WC 2026</span>
        </Link>
        <nav className="flex items-center gap-1 flex-1">
          {links.map(l => (
            <Link key={l.href} href={l.href} className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname === l.href ? 'bg-green-600/20 text-green-400' : 'text-gray-400 hover:text-white hover:bg-[#21262d]'}`}>
              {l.label}
              {'badge' in l && l.badge && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-black text-[9px] font-bold px-1 py-px rounded leading-none">
                  {l.badge}
                </span>
              )}
            </Link>
          ))}
          {user?.is_admin && (
            <Link href="/admin" className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname === '/admin' ? 'bg-yellow-600/20 text-yellow-400' : 'text-yellow-600 hover:text-yellow-400 hover:bg-[#21262d]'}`}>
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <Link href="/kit" className="hidden sm:block shrink-0" title="Edit my uniform">
                <KitSVG kit={{ ...DEFAULT_KIT, ...(user.kit as KitConfig), jersey: { ...DEFAULT_KIT.jersey, ...((user.kit as KitConfig)?.jersey) }, shorts: { ...DEFAULT_KIT.shorts, ...((user.kit as KitConfig)?.shorts) }, socks: { ...DEFAULT_KIT.socks, ...((user.kit as KitConfig)?.socks) } }} width={22} />
              </Link>
              <span className="text-sm text-gray-400 hidden sm:inline">{user.display_name}</span>
              <button onClick={() => { logout(); router.push('/'); }} className="btn-secondary text-sm py-1.5">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary text-sm py-1.5">Login</Link>
              <Link href="/register" className="btn-primary text-sm py-1.5">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
