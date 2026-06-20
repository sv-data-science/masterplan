'use client';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { triviaApi, leaderboardApi, authApi } from '@/lib/api';
import { KitSVG } from '@/components/KitSVG';
import { DEFAULT_KIT, KitConfig, LeaderboardEntry } from '@/types';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getLang, saveLang, TriviaLang } from '@/lib/trivia_utils';
import { WC_EDITIONS } from '@/lib/wc_history';
import { NATIONAL_TEAMS, formatTeam } from '@/lib/national_teams';

const tx = {
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
    favorites: '❤️ Favorites',
    favWC: 'Favorite World Cup',
    favTeam: 'Favorite National Team',
    favPlayer: 'All-time Favorite Player',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    saving: 'Saving…',
    notSet: 'Not set',
    selectYear: 'Select a year…',
    selectTeam: 'Type or pick a team…',
    playerHint: 'e.g. Pelé, Maradona, Messi…',
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
    favorites: '❤️ Favoritos',
    favWC: 'Mundial favorito',
    favTeam: 'Selección nacional favorita',
    favPlayer: 'Jugador favorito de todos los tiempos',
    edit: 'Editar',
    save: 'Guardar',
    cancel: 'Cancelar',
    saving: 'Guardando…',
    notSet: 'No especificado',
    selectYear: 'Selecciona un año…',
    selectTeam: 'Escribe o elige un equipo…',
    playerHint: 'ej. Pelé, Maradona, Messi…',
    viewPublic: '🔗 Ver perfil público',
  },
};

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [lang, setLang] = useState<TriviaLang>('en');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [favWcYear, setFavWcYear] = useState<string>('');
  const [favTeam, setFavTeam] = useState('');
  const [favPlayer, setFavPlayer] = useState('');

  useEffect(() => { setLang(getLang()); }, []);
  useEffect(() => {
    if (user) {
      setFavWcYear(user.fav_wc_year ? String(user.fav_wc_year) : '');
      setFavTeam(user.fav_national_team ?? '');
      setFavPlayer(user.fav_player ?? '');
    }
  }, [user]);

  const switchLang = (l: TriviaLang) => { setLang(l); saveLang(l); };
  const tx_ = tx[lang];

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

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-10 text-center space-y-4">
          <div className="text-5xl">👤</div>
          <h1 className="text-2xl font-bold text-white">{tx_.signIn}</h1>
          <div className="flex justify-center gap-3">
            <Link href="/login" className="btn-secondary">{tx_.login}</Link>
            <Link href="/register" className="btn-primary">{tx_.signUp}</Link>
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

  const langToggle = (
    <div className="flex gap-2">
      <button onClick={() => switchLang('en')} className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${lang === 'en' ? 'border-green-500 bg-green-900/20 text-green-300' : 'border-[#30363d] text-gray-500 hover:border-gray-400'}`}>🇺🇸 EN</button>
      <button onClick={() => switchLang('es')} className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${lang === 'es' ? 'border-green-500 bg-green-900/20 text-green-300' : 'border-[#30363d] text-gray-500 hover:border-gray-400'}`}>🇪🇸 ES</button>
    </div>
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authApi.updatePreferences({
        fav_wc_year: favWcYear ? parseInt(favWcYear) : null,
        fav_national_team: favTeam.trim() || null,
        fav_player: favPlayer.trim() || null,
      });
      setUser(res.data);
      setEditing(false);
    } catch {
      // keep form open on error
    } finally {
      setSaving(false);
    }
  };

  const favWcEdition = WC_EDITIONS.find(e => e.year === user.fav_wc_year);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Profile hero */}
      <div className="card p-6">
        <div className="flex items-center gap-6">
          <div className="shrink-0"><KitSVG kit={kit} width={80} /></div>
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
                <span className={`text-sm font-bold ${myRank.rank <= 3 ? 'text-yellow-400' : 'text-green-400'}`}>#{myRank.rank}</span>
                <span className="text-gray-500 text-sm">{tx_.onLeaderboard}</span>
                <span className="text-white font-bold text-sm">· {myRank.total_points} pts</span>
              </div>
            )}
          </div>
          <Link href="/kit" className="btn-secondary text-xs py-1.5 shrink-0">{tx_.editUniform}</Link>
        </div>
        <div className="mt-4 pt-4 border-t border-[#30363d]">
          <Link href={`/profile/${user.username}`} className="text-sm text-green-400 hover:underline">{tx_.viewPublic}</Link>
        </div>
      </div>

      {/* Favorites */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest">{tx_.favorites}</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-xs text-green-400 hover:underline border border-[#30363d] rounded px-2 py-1 hover:border-green-600 transition-colors">{tx_.edit}</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setFavWcYear(user.fav_wc_year ? String(user.fav_wc_year) : ''); setFavTeam(user.fav_national_team ?? ''); setFavPlayer(user.fav_player ?? ''); }} className="text-xs text-gray-400 hover:text-white border border-[#30363d] rounded px-2 py-1 transition-colors">{tx_.cancel}</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1 px-3">{saving ? tx_.saving : tx_.save}</button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="space-y-3">
            <FavRow icon="🏆" label={tx_.favWC} value={favWcEdition ? `${favWcEdition.year} ${favWcEdition.hostFlag} ${favWcEdition.host}` : null} notSet={tx_.notSet} />
            <FavRow icon="🌍" label={tx_.favTeam} value={user.fav_national_team || null} notSet={tx_.notSet} />
            <FavRow icon="⭐" label={tx_.favPlayer} value={user.fav_player || null} notSet={tx_.notSet} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Favorite WC */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">🏆 {tx_.favWC}</label>
              <select
                value={favWcYear}
                onChange={e => setFavWcYear(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
              >
                <option value="">{tx_.selectYear}</option>
                {[...WC_EDITIONS].reverse().map(ed => (
                  <option key={ed.year} value={ed.year}>
                    {ed.year} — {ed.host} · {ed.champion} {ed.championFlag}
                  </option>
                ))}
              </select>
            </div>

            {/* Favorite National Team */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">🌍 {tx_.favTeam}</label>
              <input
                list="team-suggestions"
                value={favTeam}
                onChange={e => setFavTeam(e.target.value)}
                placeholder={tx_.selectTeam}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none placeholder-gray-600"
              />
              <datalist id="team-suggestions">
                {NATIONAL_TEAMS.map(t => (
                  <option key={t.name} value={formatTeam(t)} />
                ))}
              </datalist>
            </div>

            {/* Favorite Player */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">⭐ {tx_.favPlayer}</label>
              <input
                type="text"
                value={favPlayer}
                onChange={e => setFavPlayer(e.target.value)}
                placeholder={tx_.playerHint}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none placeholder-gray-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* Prediction stats */}
      {myRank && (
        <div className="card p-5">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-4">{tx_.predStats}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{myRank.total_points}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tx_.totalPts}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{myRank.exact_scores ?? '—'}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tx_.exactScores}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">{myRank.correct_outcomes ?? '—'}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tx_.correctOutcomes}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-300">{myRank.predictions_made ?? (myRank as any).predictions ?? 0}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tx_.predictions}</div>
            </div>
          </div>
        </div>
      )}

      {/* Trivia stats */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest">{tx_.triviaStats}</h2>
          <Link href="/trivia" className="text-xs text-green-400 hover:underline">{tx_.play}</Link>
        </div>
        {!triviaStats || triviaStats.games_played === 0 ? (
          <p className="text-sm text-gray-500 text-center py-2">
            {tx_.noTrivia} <Link href="/trivia" className="text-green-400 hover:underline">{tx_.takeQuiz}</Link>
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={`text-2xl font-bold ${bestPct != null ? (bestPct >= 80 ? 'text-green-400' : bestPct >= 60 ? 'text-yellow-400' : 'text-red-400') : 'text-gray-500'}`}>
                {bestPct != null ? `${bestPct}%` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{tx_.bestScore}</div>
              {triviaStats.best_score != null && <div className="text-xs text-gray-600">{triviaStats.best_score}/{triviaStats.best_total}</div>}
            </div>
            <div>
              <div className={`text-2xl font-bold ${livePct != null ? (livePct >= 80 ? 'text-green-400' : livePct >= 60 ? 'text-yellow-400' : 'text-red-400') : 'text-gray-500'}`}>
                {livePct != null ? `${livePct}%` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{tx_.runningPct}</div>
              {triviaStats.live_total > 0 && <div className="text-xs text-gray-600">{triviaStats.live_score}/{triviaStats.live_total} Q</div>}
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{triviaStats.games_played}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tx_.gamesPlayed}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FavRow({ icon, label, value, notSet }: { icon: string; label: string; value: string | null; notSet: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`text-sm font-medium mt-0.5 ${value ? 'text-white' : 'text-gray-600'}`}>
          {value ?? notSet}
        </div>
      </div>
    </div>
  );
}
