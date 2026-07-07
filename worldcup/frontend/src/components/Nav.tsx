'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import { KitSVG } from '@/components/KitSVG';
import { DEFAULT_KIT, KitConfig } from '@/types';

export function Nav() {
  const { user, token, setUser, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (token && !user) {
      authApi.me().then(r => setUser(r.data)).catch(() => logout());
    }
  }, [token]);

  // Close drawer on navigation
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const baseLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/trivia', label: '🧠 Trivia' },
    { href: '/memes', label: '😂 Memes' },
    { href: '/history', label: '📖 WC History' },
    { href: '/brackets', label: '🏆 Bracket' },
    { href: '/road-to-final', label: '🌐 Road to Final', badge: 'New' },
    { href: '/scores', label: '📊 Score Matrix', badge: 'New' },
    { href: '/matches', label: 'Matches' },
    { href: '/groups', label: 'Groups' },
    { href: '/top-scorers', label: 'Top Scorers' },
  ];
  const links = user
    ? [
        { href: '/', label: 'Dashboard' },
        { href: '/leaderboard', label: 'Leaderboard' },
        { href: '/trivia', label: '🧠 Trivia' },
        { href: '/memes', label: '😂 Memes' },
        { href: '/kit', label: '🎽 My Uniform' },
        { href: '/history', label: '📖 WC History' },
        { href: '/brackets', label: '🏆 Bracket' },
        { href: '/road-to-final', label: '🌐 Road to Final', badge: 'New' },
        { href: '/scores', label: '📊 Score Matrix', badge: 'New' },
        { href: '/profile', label: '👤 Profile' },
        { href: '/my-predictions', label: 'My Picks' },
        { href: '/top-scorers', label: 'Top Scorers' },
        { href: '/matches', label: 'Matches' },
        { href: '/groups', label: 'Groups' },
      ]
    : baseLinks;

  const kitProps = user?.kit
    ? { ...DEFAULT_KIT, ...(user.kit as KitConfig), jersey: { ...DEFAULT_KIT.jersey, ...((user.kit as KitConfig)?.jersey) }, shorts: { ...DEFAULT_KIT.shorts, ...((user.kit as KitConfig)?.shorts) }, socks: { ...DEFAULT_KIT.socks, ...((user.kit as KitConfig)?.socks) } }
    : DEFAULT_KIT;

  return (
    <header className="border-b border-[#30363d] bg-[#161b22] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-white shrink-0">
          <span className="text-2xl">⚽</span>
          <span className="hidden sm:inline text-green-400">WC 2026</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto">
          {links.map(l => (
            <Link key={l.href} href={l.href} className={`relative px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${pathname === l.href ? 'bg-green-600/20 text-green-400' : 'text-gray-400 hover:text-white hover:bg-[#21262d]'}`}>
              {l.label}
              {'badge' in l && l.badge && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-black text-[9px] font-bold px-1 py-px rounded leading-none">
                  {l.badge}
                </span>
              )}
            </Link>
          ))}
          {user?.is_admin && (
            <Link href="/admin" className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${pathname === '/admin' ? 'bg-yellow-600/20 text-yellow-400' : 'text-yellow-600 hover:text-yellow-400 hover:bg-[#21262d]'}`}>
              Admin
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {user ? (
            <>
              <Link href="/kit" className="hidden md:block shrink-0" title="Edit my uniform">
                <KitSVG kit={kitProps} width={22} />
              </Link>
              <span className="text-sm text-gray-400 hidden md:inline">{user.display_name}</span>
              <button
                onClick={() => { logout(); router.push('/'); }}
                className="btn-secondary text-sm py-1.5 hidden md:block"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary text-sm py-1.5 hidden md:block">Login</Link>
              <Link href="/register" className="btn-primary text-sm py-1.5 hidden md:block">Sign up</Link>
            </>
          )}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-[#21262d] transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen
              ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="3" x2="17" y2="17"/><line x1="17" y1="3" x2="3" y2="17"/></svg>
              : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="5" x2="18" y2="5"/><line x1="2" y1="10" x2="18" y2="10"/><line x1="2" y1="15" x2="18" y2="15"/></svg>
            }
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#30363d] bg-[#161b22] shadow-xl">
          <nav className="max-w-6xl mx-auto px-3 py-3 flex flex-col gap-0.5">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${pathname === l.href ? 'bg-green-600/20 text-green-400' : 'text-gray-300 hover:text-white hover:bg-[#21262d]'}`}
              >
                {l.label}
                {'badge' in l && l.badge && (
                  <span className="bg-green-500 text-black text-[9px] font-bold px-1 py-px rounded leading-none">
                    {l.badge}
                  </span>
                )}
              </Link>
            ))}
            {user?.is_admin && (
              <Link href="/admin" className={`px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${pathname === '/admin' ? 'bg-yellow-600/20 text-yellow-400' : 'text-yellow-600 hover:text-yellow-400 hover:bg-[#21262d]'}`}>
                Admin
              </Link>
            )}

            {/* Auth row at bottom of drawer */}
            <div className="mt-2 pt-2 border-t border-[#30363d]">
              {user ? (
                <div className="flex items-center gap-3 px-3 py-2">
                  <KitSVG kit={kitProps} width={24} />
                  <span className="text-sm text-gray-300 flex-1">{user.display_name}</span>
                  <button
                    onClick={() => { logout(); router.push('/'); }}
                    className="btn-secondary text-sm py-1.5"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 px-3 py-2">
                  <Link href="/login" className="btn-secondary text-sm py-1.5 flex-1 text-center">Login</Link>
                  <Link href="/register" className="btn-primary text-sm py-1.5 flex-1 text-center">Sign up</Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
