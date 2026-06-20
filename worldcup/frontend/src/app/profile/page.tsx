'use client';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { triviaApi, leaderboardApi } from '@/lib/api';
import { KitSVG } from '@/components/KitSVG';
import { DEFAULT_KIT, KitConfig, LeaderboardEntry } from '@/types';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getLang, saveLang, TriviaLang } from '@/lib/trivia_utils';

const t = {
  en: {
    signIn: 'Sign in to view your profile',
    login: 'Log in', signUp: 'Sign up',
    predStats: 'Prediction Stats',
    totalPts: 'Total Points', exactScores: 'Exact Scores',
    correctOutcomes: 'Correct Outcomes', predictions: 'Predictions',
    editUniform: '🎽 Edit Uniform',
    onLeaderboard: 'on leaderboard',
    triviaStats: '🧠 Trivia Stats',
    play: 'Play →',
    noTrivia: 'No trivia games yet —',
    takeQuiz: 'take the quiz!',
    bestScore: 'Best Score', runningPct: 'Running %', gamesPlayed: 'Games Played',
    comingSoon: 'Coming Soon',
    favWC: 'Favorite World Cup edition',
    favNat: 'Favorite national team',
    favPlayer: 'All-time favorite player',
    publicProfile: 'Public profile — let others see your stats',
    viewPublic: '🔗 View public profile',
  },
  es: {
    signIn: 'Inicia sesión para ver tu perfil',
    login: 'Iniciar sesión', signUp: 'Registrarse',
    predStats: 'Estadísticas de predicciones',
    totalPts: 'Puntos totales', exactScores: 'Marcadores exactos',
    correctOutcomes: 'Resultados correctos', predictions: 'Predicciones',
    editUniform: '🎽 Editar uniforme',
    onLeaderboard: 'en el ranking',
    triviaStats: '🧠 Estadísticas de trivia',
    play: 'Jugar →',
    noTrivia: 'Aún no hay partidas de trivia —',
    takeQuiz: '¡haz el quiz!',
    bestScore: 'Mejor puntuación', runningPct: 'Porcentaje acum.', gamesPlayed: 'Partidas jugadas',
    comingSoon: 'Próximamente',
    favWC: 'Mundial favorito',
    favNat: 'Selección nacional favorita',
    favPlayer: 'Jugador favorito de todos los tiempos',
    publicProfile: 'Perfil público — otros jugadores podrán ver tus estadísticas',
    viewPublic: '🔗 Ver perfil público',
  },
};

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [lang, setLang] = useState<TriviaLang>('en');

  useEffect(() => { setLang(getLang()); }, []);

  const switchLang = (l: TriviaLang) => { setLang(l); saveLang(l); };
  const tx = t[lang];

  const { data: triviaStats } = useQuery({
    queryKey: ['trivia-my-stats'],
    queryFn: () => triviaApi.myStats().then(r => r.data),
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: () => leaderboardApi.get().then(r => r.data),
    staleTime: 60_000,
  });

  const langToggle = (
    <div className="flex gap-2">
      <button onClick={() => switchLang('en')} className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${lang === 'en' ? 'border-green-500 bg-green-900/20 text-green-300' : 'border-[#30363d] text-gray-500 hover:border-gray-400'}`}>🇺🇸 EN</button>
      <button onClick={() => switchLang('es')} className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${lang === 'es' ? 'border-green-500 bg-green-900/20 text-green-300' : 'border-[#30363d] text-gray-500 hover:border-gray-400'}`}>🇪🇸 ES</button>
    </div>
  );

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-10 text-center space-y-4">
          <div className="text-5xl">👤</div>
          <h1 className="text-2xl font-bold text-white">{tx.signIn}</h1>
          <div className="flex justify-center gap-3">
            <Link href="/login" className="btn-secondary">{tx.login}</Link>
            <Link href="/register" className="btn-primary">{tx.signUp}</Link>
          </div>
        </div>
      </div>
    );
  }

  const kit: KitConfig = {
    ...DEFAULT_KIT,
    ...(user.kit as KitConfig),
    jersey: { ...DEFAULT_KIT.jersey, ...((user.kit as KitConfig)?.jersey) },
    shorts: { ...DEFAULT_KIT.shorts, ...((user.kit as KitConfig)?.shorts) },
    socks: { ...DEFAULT_KIT.socks, ...((user.kit as KitConfig)?.socks) },
  };

  const myRank = leaderboard?.find(e => e.user_id === user.id);
  const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100) : 0;
  const bestPct = triviaStats?.best_score != null ? pct(triviaStats.best_score, triviaStats.best_total) : null;
  const livePct = triviaStats?.live_total > 0 ? pct(triviaStats.live_score, triviaStats.live_total) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Profile hero */}
      <div className="card p-6">
        <div className="flex items-center gap-6">
          <div className="shrink-0">
            <KitSVG kit={kit} width={80} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-white">{user.display_name}</h1>
                <p className="text-gray-500 text-sm">@{user.username}</p>
              </div>
              {langToggle}
            </div>
            {myRank && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm font-bold ${myRank.rank <= 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                  #{myRank.rank}
                </span>
                <span className="text-gray-500 text-sm">{tx.onLeaderboard}</span>
                <span className="text-white font-bold text-sm">· {myRank.total_points} pts</span>
              </div>
            )}
          </div>
          <Link href="/kit" className="btn-secondary text-xs py-1.5 shrink-0">
            {tx.editUniform}
          </Link>
        </div>
        <div className="mt-4 pt-4 border-t border-[#30363d] flex items-center justify-between">
          <Link href={`/profile/${user.username}`} className="text-sm text-green-400 hover:underline">
            {tx.viewPublic}
          </Link>
        </div>
      </div>

      {/* Prediction stats */}
      {myRank && (
        <div className="card p-5">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-4">{tx.predStats}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{myRank.total_points}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tx.totalPts}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{myRank.exact_scores ?? '—'}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tx.exactScores}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">{myRank.correct_outcomes ?? '—'}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tx.correctOutcomes}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-300">{myRank.predictions_made ?? (myRank as any).predictions ?? 0}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tx.predictions}</div>
            </div>
          </div>
        </div>
      )}

      {/* Trivia stats */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest">{tx.triviaStats}</h2>
          <Link href="/trivia" className="text-xs text-green-400 hover:underline">{tx.play}</Link>
        </div>
        {!triviaStats || triviaStats.games_played === 0 ? (
          <p className="text-sm text-gray-500 text-center py-2">
            {tx.noTrivia} <Link href="/trivia" className="text-green-400 hover:underline">{tx.takeQuiz}</Link>
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={`text-2xl font-bold ${bestPct != null ? (bestPct >= 80 ? 'text-green-400' : bestPct >= 60 ? 'text-yellow-400' : 'text-red-400') : 'text-gray-500'}`}>
                {bestPct != null ? `${bestPct}%` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{tx.bestScore}</div>
              {triviaStats.best_score != null && (
                <div className="text-xs text-gray-600">{triviaStats.best_score}/{triviaStats.best_total}</div>
              )}
            </div>
            <div>
              <div className={`text-2xl font-bold ${livePct != null ? (livePct >= 80 ? 'text-green-400' : livePct >= 60 ? 'text-yellow-400' : 'text-red-400') : 'text-gray-500'}`}>
                {livePct != null ? `${livePct}%` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{tx.runningPct}</div>
              {triviaStats.live_total > 0 && (
                <div className="text-xs text-gray-600">{triviaStats.live_score}/{triviaStats.live_total} Q</div>
              )}
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{triviaStats.games_played}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tx.gamesPlayed}</div>
            </div>
          </div>
        )}
      </div>

      {/* Coming soon */}
      <div className="card p-5 border-dashed border-[#30363d]">
        <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3">{tx.comingSoon}</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2"><span>⭐</span> {tx.favWC}</div>
          <div className="flex items-center gap-2"><span>🏆</span> {tx.favNat}</div>
          <div className="flex items-center gap-2"><span>⚽</span> {tx.favPlayer}</div>
          <div className="flex items-center gap-2"><span>👥</span> {tx.publicProfile}</div>
        </div>
      </div>
    </div>
  );
}
