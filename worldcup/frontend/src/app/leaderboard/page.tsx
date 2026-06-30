'use client';
import { useQuery } from '@tanstack/react-query';
import { leaderboardApi } from '@/lib/api';
import { LeaderboardEntry, DEFAULT_KIT, KitConfig } from '@/types';
import { useAuthStore } from '@/store/auth';
import { KitSVG } from '@/components/KitSVG';
import Link from 'next/link';

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const { data: entries = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: () => leaderboardApi.get().then(r => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const icon = (r: number) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <div className="text-sm text-gray-500">{entries.length} players</div>
      </div>

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-yellow-700/50 bg-yellow-900/15">
        <span className="text-xl shrink-0">⚙️</span>
        <div>
          <p className="text-sm font-semibold text-yellow-300">Round of 32 scores under review</p>
          <p className="text-xs text-gray-400 mt-0.5">Points shown are from the <strong className="text-white">group phase only</strong>. R32 points will be added once scoring is verified.</p>
        </div>
      </div>
      {isLoading && <div className="text-center py-12 text-gray-500">Loading…</div>}
      {!isLoading && entries.length === 0 && (
        <div className="card p-8 text-center text-gray-500">
          <div className="text-4xl mb-2">🏆</div>
          <p>No predictions yet. Be the first!</p>
        </div>
      )}
      {entries.length > 0 && (
        <div className="card divide-y divide-[#30363d]">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-gray-500 font-medium uppercase">
            <div className="col-span-1">#</div>
            <div className="col-span-6">Player</div>
            <div className="col-span-2 text-center">Pts <span className="normal-case text-yellow-600">(GS)</span></div>
            <div className="col-span-3 text-center">Predictions</div>
          </div>
          {entries.map(e => {
            const isMe = e.user_id === user?.id;
            return (
              <div key={e.user_id} className={`grid grid-cols-12 gap-2 px-4 py-3 items-center ${isMe ? 'bg-green-900/10' : 'hover:bg-[#1c2128]'}`}>
                <div className={`col-span-1 font-bold text-sm ${e.rank === 1 ? 'text-yellow-400' : e.rank === 2 ? 'text-gray-300' : e.rank === 3 ? 'text-orange-400' : 'text-gray-500'}`}>
                  {icon(e.rank)}
                </div>
                <div className="col-span-6 flex items-center gap-2">
                  <div className="shrink-0">
                    <KitSVG kit={{ ...DEFAULT_KIT, ...(e.kit as KitConfig), jersey: { ...DEFAULT_KIT.jersey, ...((e.kit as KitConfig)?.jersey) }, shorts: { ...DEFAULT_KIT.shorts, ...((e.kit as KitConfig)?.shorts) }, socks: { ...DEFAULT_KIT.socks, ...((e.kit as KitConfig)?.socks) } }} width={26} />
                  </div>
                  <Link href={`/profile/${e.username}`} className="min-w-0 hover:opacity-80">
                    <p className={`font-semibold text-sm ${isMe ? 'text-green-400' : 'text-white'}`}>
                      {e.display_name}{isMe && <span className="ml-1 text-xs text-green-600">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-500">@{e.username}</p>
                  </Link>
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-xl font-bold">{e.total_points}</span>
                  <p className="text-[10px] text-yellow-600/80 leading-tight">+R32 soon</p>
                </div>
                <div className="col-span-3 text-center text-sm text-gray-500">
                  {(e as any).predictions ?? e.predictions_made ?? '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
