'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '@/lib/api';
import { KitSVG } from '@/components/KitSVG';
import { DEFAULT_KIT, KitConfig } from '@/types';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getLang, saveLang, TriviaLang } from '@/lib/trivia_utils';
import { useAuthStore } from '@/store/auth';

const t = {
  en: {
    notFound: 'Player not found',
    back: '← Back',
    onLeaderboard: 'on leaderboard',
    predStats: 'Prediction Stats',
    totalPts: 'Total Points', predictions: 'Predictions',
    triviaStats: '🧠 Trivia Stats',
    bestScore: 'Best Score', runningPct: 'Running %', gamesPlayed: 'Games Played',
    noTrivia: 'No trivia games yet',
    isYou: 'This is your profile',
    editProfile: 'Edit your profile →',
  },
  es: {
    notFound: 'Jugador no encontrado',
    back: '← Volver',
    onLeaderboard: 'en el ranking',
    predStats: 'Estadísticas de predicciones',
    totalPts: 'Puntos totales', predictions: 'Predicciones',
    triviaStats: '🧠 Estadísticas de trivia',
    bestScore: 'Mejor puntuación', runningPct: 'Porcentaje acum.', gamesPlayed: 'Partidas jugadas',
    noTrivia: 'Aún no hay partidas de trivia',
    isYou: 'Este es tu perfil',
    editProfile: 'Editar tu perfil →',
  },
};

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: me } = useAuthStore();
  const [lang, setLang] = useState<TriviaLang>('en');

  useEffect(() => { setLang(getLang()); }, []);
  const switchLang = (l: TriviaLang) => { setLang(l); saveLang(l); };
  const tx = t[lang];
  const isMe = me?.username?.toLowerCase() === username?.toLowerCase();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => profileApi.get(username).then(r => r.data),
    staleTime: 60_000,
    retry: false,
  });

  const langToggle = (
    <div className="flex gap-2">
      <button onClick={() => switchLang('en')} className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${lang === 'en' ? 'border-green-500 bg-green-900/20 text-green-300' : 'border-[#30363d] text-gray-500 hover:border-gray-400'}`}>🇺🇸 EN</button>
      <button onClick={() => switchLang('es')} className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${lang === 'es' ? 'border-green-500 bg-green-900/20 text-green-300' : 'border-[#30363d] text-gray-500 hover:border-gray-400'}`}>🇪🇸 ES</button>
    </div>
  );

  if (isLoading) {
    return <div className="text-center py-20 text-gray-500">Loading…</div>;
  }

  if (isError || !profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-10 text-center space-y-3">
          <div className="text-4xl">🔍</div>
          <p className="text-white font-bold">{tx.notFound}</p>
          <Link href="/leaderboard" className="text-green-400 hover:underline text-sm">{tx.back}</Link>
        </div>
      </div>
    );
  }

  const kit: KitConfig = {
    ...DEFAULT_KIT,
    ...(profile.kit as KitConfig),
    jersey: { ...DEFAULT_KIT.jersey, ...((profile.kit as KitConfig)?.jersey) },
    shorts: { ...DEFAULT_KIT.shorts, ...((profile.kit as KitConfig)?.shorts) },
    socks: { ...DEFAULT_KIT.socks, ...((profile.kit as KitConfig)?.socks) },
  };

  const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100) : 0;
  const bestPct = profile.best_score != null ? pct(profile.best_score, profile.best_total) : null;
  const livePct = profile.live_total > 0 ? pct(profile.live_score, profile.live_total) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Hero */}
      <div className="card p-6">
        <div className="flex items-center gap-6">
          <div className="shrink-0">
            <KitSVG kit={kit} width={80} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-white">{profile.display_name}</h1>
                <p className="text-gray-500 text-sm">@{profile.username}</p>
              </div>
              {langToggle}
            </div>
            {profile.rank && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm font-bold ${profile.rank <= 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                  #{profile.rank}
                </span>
                <span className="text-gray-500 text-sm">{tx.onLeaderboard}</span>
                <span className="text-white font-bold text-sm">· {profile.total_points} pts</span>
              </div>
            )}
          </div>
        </div>
        {isMe && (
          <div className="mt-4 pt-4 border-t border-[#30363d] flex items-center justify-between">
            <span className="text-xs text-gray-500">{tx.isYou}</span>
            <Link href="/profile" className="text-xs text-green-400 hover:underline">{tx.editProfile}</Link>
          </div>
        )}
      </div>

      {/* Prediction stats */}
      <div className="card p-5">
        <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-4">{tx.predStats}</h2>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-white">{profile.total_points}</div>
            <div className="text-xs text-gray-500 mt-0.5">{tx.totalPts}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-300">{profile.predictions_made}</div>
            <div className="text-xs text-gray-500 mt-0.5">{tx.predictions}</div>
          </div>
        </div>
      </div>

      {/* Trivia stats */}
      <div className="card p-5">
        <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-4">{tx.triviaStats}</h2>
        {profile.games_played === 0 ? (
          <p className="text-sm text-gray-500 text-center py-2">{tx.noTrivia}</p>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={`text-2xl font-bold ${bestPct != null ? (bestPct >= 80 ? 'text-green-400' : bestPct >= 60 ? 'text-yellow-400' : 'text-red-400') : 'text-gray-500'}`}>
                {bestPct != null ? `${bestPct}%` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{tx.bestScore}</div>
              {profile.best_score != null && (
                <div className="text-xs text-gray-600">{profile.best_score}/{profile.best_total}</div>
              )}
            </div>
            <div>
              <div className={`text-2xl font-bold ${livePct != null ? (livePct >= 80 ? 'text-green-400' : livePct >= 60 ? 'text-yellow-400' : 'text-red-400') : 'text-gray-500'}`}>
                {livePct != null ? `${livePct}%` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{tx.runningPct}</div>
              {profile.live_total > 0 && (
                <div className="text-xs text-gray-600">{profile.live_score}/{profile.live_total} Q</div>
              )}
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{profile.games_played}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tx.gamesPlayed}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
