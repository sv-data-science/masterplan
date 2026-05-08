'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Package, Star, Heart, Wrench, Trophy, Calendar } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import XPBar from '@/components/gamification/XPBar';
import { usersApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => usersApi.profile(username).then(r => r.data),
    retry: false,
  });

  if (isLoading) return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-48 card mb-8" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({length:4}).map((_,i) => <div key={i} className="card h-24" />)}
        </div>
      </div>
    </AppShell>
  );

  if (error || !user) return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
        <p className="text-white/50">This profile is private or doesn&apos;t exist.</p>
      </div>
    </AppShell>
  );

  const stats = user.stats;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="card p-8 mb-8">
          <div className="flex items-start gap-6 flex-wrap">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-lego-red to-lego-orange flex items-center justify-center text-4xl font-black text-white flex-shrink-0">
              {user.display_name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-white">{user.display_name}</h1>
                {user.collector_archetype && (
                  <span className="badge bg-lego-yellow/20 text-lego-yellow border border-lego-yellow/30">
                    {user.collector_archetype}
                  </span>
                )}
              </div>
              <p className="text-white/50 text-sm mt-0.5">@{user.username}</p>
              {user.bio && <p className="text-white/70 text-sm mt-2 leading-relaxed">{user.bio}</p>}
              <div className="flex items-center gap-2 mt-2 text-xs text-white/30">
                <Calendar size={12} />
                Collecting since {new Date(user.created_at).getFullYear()}
              </div>
              <div className="mt-4 max-w-sm">
                <XPBar xp={user.xp} level={user.level} />
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Package, label: 'Sets', value: formatNumber(stats.total_sets), color: 'text-lego-blue' },
              { icon: Star, label: 'Minifigs', value: formatNumber(stats.total_minifigs), color: 'text-lego-yellow' },
              { icon: Wrench, label: 'MOCs', value: formatNumber(stats.mocs_count), color: 'text-purple-400' },
              { icon: Trophy, label: 'Est. Value', value: formatCurrency(stats.total_value), color: 'text-green-400' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="card p-5 text-center">
                <Icon size={20} className={`mx-auto mb-2 ${color}`} />
                <div className="text-xl font-black text-white">{value}</div>
                <div className="text-xs text-white/50">{label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="card p-6 text-center text-white/30 text-sm">
          <Package size={24} className="mx-auto mb-2 opacity-30" />
          Public collection showcase coming soon
        </div>
      </div>
    </AppShell>
  );
}
