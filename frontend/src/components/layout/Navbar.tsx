'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Search, Package, Heart, Trophy, Users, Wrench, User, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

const navLinks = [
  { href: '/catalog', label: 'Catalog', icon: Package },
  { href: '/collection', label: 'Collection', icon: Package },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/mocs', label: 'MOCs', icon: Wrench },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/community', label: 'Community', icon: Users },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-lego-darker/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-lego-red rounded-lg flex items-center justify-center font-black text-white text-sm group-hover:bg-red-500 transition-colors">
              BV
            </div>
            <span className="font-black text-xl text-white hidden sm:block">
              Brick<span className="text-lego-yellow">Vault</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                )}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Link href="/search" className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Search size={18} />
            </Link>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-lego-red to-lego-orange flex items-center justify-center text-xs font-bold text-white">
                    {user.display_name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-white hidden sm:block">{user.display_name}</span>
                  <ChevronDown size={14} className="text-white/60" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 card py-1 shadow-xl shadow-black/50">
                    <Link href={`/profile/${user.username}`} className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10">
                      <User size={14} /> Profile
                    </Link>
                    <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10">
                      Settings
                    </Link>
                    <div className="border-t border-white/10 my-1" />
                    <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/10">
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="btn-secondary text-sm py-1.5 px-3">Sign In</Link>
                <Link href="/register" className="btn-primary text-sm py-1.5 px-3 hidden sm:block">Join Free</Link>
              </div>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-white/60 hover:text-white">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-lego-darker/95 px-4 py-4">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-colors',
                pathname === href ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon size={16} /> {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
