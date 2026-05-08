'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Package, Heart, Trophy, TrendingUp, Star, Zap, ArrowRight } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import XPBar from '@/components/gamification/XPBar';
import { useAuthStore } from '@/store/auth';
import { collectionApi, leaderboardApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data: stats } = useQuery({
    queryKey: ['collection-stats'],
    queryFn: () => collectionApi.stats().then(r => r.data),
    enabled: !!user,
  });

  if (!user) return null;

  const statCards = [
    { label: 'Sets Owned', value: formatNumber(stats?.total_sets ?? 0), icon: Package, color: 'text-lego-blue', bg: 'bg-lego-blue/10' },
    { label: 'Minifigures', value: formatNumber(stats?.total_minifigs ?? 0), icon: Star, color: 'text-lego-yellow', bg: 'bg-lego-yellow/10' },
    { label: 'Wishlist Items', value: formatNumber(stats?.wishlist_count ?? 0), icon: Heart, color: 'text-lego-red', bg: 'bg-lego-red/10' },
    { label: 'Est. Value', value: formatCurrency(stats?.total_value ?? 0), icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
  ];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome header */}
        <div className="card p-6 mb-8 bg-gradient-to-r from-lego-red/20 to-lego-orange/10 border-lego-red/30">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">
                Welcome back, {user.display_name}! 👋
              </h1>
              <p className="text-white/60">
                {user.collector_archetype
                  ? `You're a <span class="text-lego-yellow">${user.collector_archetype}</span>`
                  : 'Your collection is growing — keep building!'}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-lego-yellow/20 border border-lego-yellow/30 rounded-xl px-4 py-2">
              <Zap size={16} className="text-lego-yellow" />
              <span className="text-lego-yellow font-bold">Level {user.level}</span>
            </div>
          </div>
          <div className="mt-4 max-w-md">
            <XPBar xp={user.xp} level={user.level} />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card p-5">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={20} className={color} />
              </div>
              <div className="text-2xl font-black text-white">{value}</div>
              <div className="text-sm text-white/50 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            { href: '/catalog', icon: Package, title: 'Browse Catalog', desc: 'Discover new sets to add', color: 'lego-blue' },
            { href: '/collection', icon: Trophy, title: 'My Collection', desc: 'View and manage your sets', color: 'lego-red' },
            { href: '/mocs', icon: Star, title: 'Share a MOC', desc: 'Show off your creations', color: 'lego-yellow' },
          ].map(({ href, icon: Icon, title, desc }) => (
            <Link key={href} href={href} className="card-hover p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon size={24} className="text-white" />
              </div>
              <div>
                <div className="font-semibold text-white">{title}</div>
                <div className="text-sm text-white/50">{desc}</div>
              </div>
              <ArrowRight size={16} className="text-white/30 ml-auto" />
            </Link>
          ))}
        </div>

        {/* Recent collection & achievements row */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="font-bold text-white mb-4">Collection Progress</h2>
            {stats ? (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">Complete sets</span>
                    <span className="text-white">{stats.collection_complete_pct?.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-lego-blue to-lego-green rounded-full" style={{ width: `${stats.collection_complete_pct}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-lego-red">{stats.retired_owned}</div>
                    <div className="text-xs text-white/50">Retired sets</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-purple-400">{stats.rare_items}</div>
                    <div className="text-xs text-white/50">Rare items</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p>Add sets to see your stats</p>
                <Link href="/catalog" className="btn-primary text-sm mt-3 inline-block">Browse Catalog</Link>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-white mb-4">Getting Started</h2>
            <div className="space-y-3">
              {[
                { done: !!user, label: 'Create your account' },
                { done: (stats?.total_sets ?? 0) > 0, label: 'Add your first set' },
                { done: (stats?.wishlist_count ?? 0) > 0, label: 'Add a set to your wishlist' },
                { done: false, label: 'Share your first MOC' },
                { done: false, label: 'Follow another collector' },
              ].map(({ done, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-500 border-green-500' : 'border-white/30'}`}>
                    {done && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className={`text-sm ${done ? 'text-white/40 line-through' : 'text-white/80'}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
