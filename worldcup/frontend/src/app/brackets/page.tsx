'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '@/lib/api';
import { Match } from '@/types';
import { MatchCard } from '@/components/MatchCard';

const ROUNDS = [
  { key: 'r32',   label: 'Round of 32',    short: 'R32',      count: 16 },
  { key: 'r16',   label: 'Round of 16',    short: 'R16',      count: 8  },
  { key: 'qf',    label: 'Quarter-finals', short: 'QF',       count: 4  },
  { key: 'sf',    label: 'Semi-finals',    short: 'SF',       count: 2  },
  { key: '3rd',   label: '3rd Place',      short: '3rd',      count: 1  },
  { key: 'final', label: 'Final',          short: 'Final',    count: 1  },
];

function PlaceholderCard({ index }: { index: number }) {
  return (
    <div className="card p-4 opacity-30">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 bg-[#30363d] rounded w-24" />
        <div className="h-3 bg-[#30363d] rounded w-12" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-right space-y-1">
          <div className="text-2xl">🏳️</div>
          <div className="h-3 bg-[#30363d] rounded w-20 ml-auto" />
          <div className="text-xs text-gray-600">TBD</div>
        </div>
        <div className="text-gray-700 font-bold text-xl">vs</div>
        <div className="flex-1 text-left space-y-1">
          <div className="text-2xl">🏳️</div>
          <div className="h-3 bg-[#30363d] rounded w-20" />
          <div className="text-xs text-gray-600">TBD</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-[#30363d]">
        <div className="h-8 bg-[#30363d] rounded" />
      </div>
    </div>
  );
}

export default function BracketsPage() {
  const [activeRound, setActiveRound] = useState('r32');
  const active = ROUNDS.find(r => r.key === activeRound)!;

  const { data: matches = [], isLoading } = useQuery<Match[]>({
    queryKey: ['brackets', activeRound],
    queryFn: () => matchesApi.list({ stage: activeRound }).then(r => r.data),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <h1 className="text-2xl font-bold text-white">🏆 Knockout Bracket</h1>
        <span className="text-xs text-gray-500 sm:ml-2">WC 2026 · same scoring: 3/2/1/0 pts</span>
      </div>

      {/* Round tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {ROUNDS.map(r => (
          <button
            key={r.key}
            onClick={() => setActiveRound(r.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors border shrink-0 ${
              activeRound === r.key
                ? 'bg-green-600 border-green-600 text-white'
                : 'border-[#30363d] text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            <span className="hidden sm:inline">{r.label}</span>
            <span className="sm:hidden">{r.short}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      )}

      {!isLoading && matches.length === 0 && (
        <div className="space-y-6">
          <div className="text-center py-8 bg-[#161b22] rounded-xl border border-[#30363d]">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-white font-semibold">Group Stage in Progress</p>
            <p className="text-gray-400 text-sm mt-1">
              The {active.label} bracket will open once the group stage concludes.
            </p>
            <p className="text-gray-600 text-xs mt-1">
              {active.count} match{active.count > 1 ? 'es' : ''} · predictions open before each kick-off
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {Array.from({ length: Math.min(active.count, 8) }).map((_, i) => (
              <PlaceholderCard key={i} index={i} />
            ))}
          </div>
          {active.count > 8 && (
            <p className="text-center text-gray-600 text-xs">
              + {active.count - 8} more matches
            </p>
          )}
        </div>
      )}

      {matches.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {matches
            .sort((a, b) => a.match_number - b.match_number)
            .map(m => (
              <MatchCard
                key={m.id}
                match={m}
                queryKey={['brackets', activeRound]}
                label={`${active.short} · Match ${m.match_number}`}
              />
            ))}
        </div>
      )}
    </div>
  );
}
