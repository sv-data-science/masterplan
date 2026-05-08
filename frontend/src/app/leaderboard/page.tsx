'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Star, Package, Zap } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { leaderboardApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const CATEGORIES = [
  { value: 'xp', label: 'Top XP', icon: Zap },
  { value: 'collection_size', label: 'Most Sets', icon: Package },
];

export default function LeaderboardPage() {
  const [category, setCategory] = useState('xp');

  const { data: entries, isLoading } = useQuery({
    queryKey: ['leaderboard', category],
    queryFn: () => leaderboardApi.global(category).then(r => r.data),
  });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <Trophy size={48} className="text-lego-yellow mx-auto mb-4" />
          <h1 className="text-4xl font-black text-white">Leaderboard</h1>
          <p className="text-white/50 mt-2">The world&apos;s top LEGO collectors</p>
        </div>

        <div className="flex gap-2 justify-center mb-8">
          {CATEGORIES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={cn('btn-secondary flex items-center gap-2 px-5 py-2.5', category === value && 'bg-lego-yellow/20 border-lego-yellow/50 text-lego-yellow')}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-white/5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-8 h-8 bg-white/10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-white/10 rounded w-1/3" />
                    <div className="h-3 bg-white/5 rounded w-1/4" />
                  </div>
                  <div className="h-4 bg-white/10 rounded w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {entries?.map((entry: any) => (
                <div key={entry.user.id} className={cn('flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors', entry.rank <= 3 && 'bg-white/5')}>
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0',
                    entry.rank === 1 ? 'bg-yellow-500/30 text-yellow-400' :
                    entry.rank === 2 ? 'bg-slate-400/20 text-slate-300' :
                    entry.rank === 3 ? 'bg-orange-700/30 text-orange-400' : 'bg-white/5 text-white/40'
                  )}>
                    {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank-1] : entry.rank}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lego-red to-lego-orange flex items-center justify-center font-bold text-white flex-shrink-0">
                    {entry.user.display_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${entry.user.username}`} className="font-semibold text-white hover:text-lego-yellow transition-colors">
                      {entry.user.display_name}
                    </Link>
                    <div className="text-xs text-white/40">@{entry.user.username} · Level {entry.user.level}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">{entry.score.toLocaleString()}</div>
                    <div className="text-xs text-white/40">{category === 'xp' ? 'XP' : 'sets'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
