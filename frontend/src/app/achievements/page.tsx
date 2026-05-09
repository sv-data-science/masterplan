'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Lock } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Achievement } from '@/types';
import { cn } from '@/lib/utils';

const RARITY_STYLES: Record<string, string> = {
  bronze: 'from-orange-900/40 to-orange-800/20 border-orange-600/40',
  silver: 'from-slate-700/40 to-slate-600/20 border-slate-400/40',
  gold: 'from-yellow-900/40 to-yellow-800/20 border-yellow-500/40',
  platinum: 'from-purple-900/40 to-purple-800/20 border-purple-500/40',
};

const RARITY_TEXT: Record<string, string> = {
  bronze: 'text-orange-400',
  silver: 'text-slate-300',
  gold: 'text-yellow-400',
  platinum: 'text-purple-400',
};

export default function AchievementsPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data: achievements, isLoading } = useQuery({
    queryKey: ['my-achievements'],
    queryFn: () => usersApi.myAchievements().then((r) => r.data as Achievement[]),
    enabled: !!user,
  });

  if (!user) return null;

  const unlockedCount = achievements?.filter((a) => a.unlocked).length ?? 0;
  const totalCount = achievements?.length ?? 0;
  const totalXp = achievements?.filter((a) => a.unlocked).reduce((sum, a) => sum + (a.xp_reward || 0), 0) ?? 0;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <Trophy size={48} className="text-lego-yellow mx-auto mb-4" />
          <h1 className="text-4xl font-black text-white">Achievements</h1>
          <p className="text-white/50 mt-2">
            {unlockedCount} of {totalCount} unlocked · {totalXp.toLocaleString()} XP earned from achievements
          </p>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="card animate-pulse h-32" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements?.map((a) => (
              <div
                key={a.id}
                className={cn(
                  'card p-5 flex items-start gap-4 bg-gradient-to-br border',
                  a.unlocked ? RARITY_STYLES[a.rarity] : 'opacity-60'
                )}
              >
                <div
                  className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0',
                    a.unlocked ? 'bg-white/10' : 'bg-white/5'
                  )}
                >
                  {a.unlocked ? a.icon : <Lock size={20} className="text-white/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-white">{a.name}</h3>
                    <span className={cn('text-[10px] uppercase font-bold', RARITY_TEXT[a.rarity])}>
                      {a.rarity}
                    </span>
                  </div>
                  <p className="text-sm text-white/60 leading-snug">{a.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-lego-yellow font-medium">+{a.xp_reward} XP</span>
                    {a.unlocked && a.unlocked_at && (
                      <span className="text-white/40">
                        Unlocked {new Date(a.unlocked_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
