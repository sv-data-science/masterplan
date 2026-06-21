'use client';
import { useState, useEffect } from 'react';
import { WC_EDITIONS, WCEdition } from '@/lib/wc_history';
import { getLang, saveLang, TriviaLang } from '@/lib/trivia_utils';

const tx = {
  en: {
    title: '📖 World Cup History',
    subtitle: '22 tournaments · 1930–2022 · The complete story',
    select: 'Select Tournament',
    champion: 'Champion',
    runnerUp: 'Runner-up',
    thirdPlace: '3rd Place',
    final: 'Final',
    stars: '⭐ Stars of the Tournament',
    stats: 'Tournament Stats',
    teams: 'Teams', matches: 'Matches', goals: 'Goals', attendance: 'Attendance',
    awards: 'Awards',
    boot: 'Golden Boot',
    ball: 'Golden Ball (Best Player)',
    glove: 'Golden Glove (Best Keeper)',
    mascot: 'Mascot',
    officialBall: 'Official Ball',
    facts: 'Fun Facts & Story',
    goals_label: 'goals',
    venues: 'Host Cities & Stadiums',
    results: 'Tournament Results',
  },
  es: {
    title: '📖 Historia del Mundial',
    subtitle: '22 torneos · 1930–2022 · La historia completa',
    select: 'Seleccionar torneo',
    champion: 'Campeón',
    runnerUp: 'Subcampeón',
    thirdPlace: '3.er puesto',
    final: 'Final',
    stars: '⭐ Estrellas del torneo',
    stats: 'Estadísticas del torneo',
    teams: 'Equipos', matches: 'Partidos', goals: 'Goles', attendance: 'Asistencia',
    awards: 'Premios',
    boot: 'Bota de Oro',
    ball: 'Balón de Oro (Mejor jugador)',
    glove: 'Guante de Oro (Mejor portero)',
    mascot: 'Mascota',
    officialBall: 'Balón oficial',
    facts: 'Curiosidades e historia',
    goals_label: 'goles',
    venues: 'Ciudades y estadios anfitriones',
    results: 'Resultados del torneo',
  },
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function EditionCard({ ed, selected, onClick }: { ed: WCEdition; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
        selected
          ? 'border-green-500 bg-green-900/20'
          : 'border-[#30363d] bg-[#161b22] hover:border-green-700/50 hover:bg-green-900/10'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{ed.hostFlag}</span>
        <div>
          <div className="font-bold text-white text-sm">{ed.year}</div>
          <div className="text-xs text-gray-500">{ed.host}</div>
        </div>
        <div className="ml-auto text-right">
          <span className="text-lg">{ed.championFlag}</span>
        </div>
      </div>
    </button>
  );
}

export default function WCHistoryPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2022);
  const [lang, setLang] = useState<TriviaLang>('en');

  useEffect(() => { setLang(getLang()); }, []);
  const switchLang = (l: TriviaLang) => { setLang(l); saveLang(l); };
  const l = tx[lang];

  const edition = WC_EDITIONS.find(e => e.year === selectedYear) ?? WC_EDITIONS[WC_EDITIONS.length - 1];
  const funFacts = lang === 'es' && edition.funFactsEs?.length ? edition.funFactsEs : edition.funFacts;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="card p-6 bg-gradient-to-br from-blue-900/20 to-[#161b22] border-blue-800/30">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{l.title}</h1>
            <p className="text-gray-400 text-sm">{l.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => switchLang('en')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${lang === 'en' ? 'border-green-500 bg-green-900/20 text-green-300' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}>🇺🇸 English</button>
            <button onClick={() => switchLang('es')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${lang === 'es' ? 'border-green-500 bg-green-900/20 text-green-300' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}>🇪🇸 Español</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Year selector */}
        <div className="card p-4 space-y-2 lg:max-h-[80vh] lg:overflow-y-auto">
          <h2 className="text-xs text-gray-500 uppercase font-medium tracking-widest mb-3">{l.select}</h2>
          {[...WC_EDITIONS].reverse().map(ed => (
            <EditionCard
              key={ed.year}
              ed={ed}
              selected={selectedYear === ed.year}
              onClick={() => setSelectedYear(ed.year)}
            />
          ))}
        </div>

        {/* Main detail panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Hero */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-5xl font-black text-white">{edition.year}</div>
                <div className="text-lg text-gray-400 mt-1">
                  {edition.hostFlag} {edition.host}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">{l.champion}</div>
                <div className="text-4xl">{edition.championFlag}</div>
                <div className="text-white font-bold mt-1">{edition.champion}</div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-[#0d1117] rounded-xl space-y-3">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-2 text-center">{l.final}</div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-2xl">{edition.championFlag}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{l.champion}</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{edition.champion}</div>
                </div>
                <div className="text-2xl font-black text-green-400">{edition.finalScore}</div>
                <div className="text-center">
                  <div className="text-2xl">{edition.runnerUpFlag}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{l.runnerUp}</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{edition.runnerUp}</div>
                </div>
              </div>
              {edition.thirdPlace && (
                <div className="border-t border-[#21262d] pt-3 flex items-center justify-center gap-2 text-sm">
                  <span className="text-gray-500 text-xs">{l.thirdPlace}:</span>
                  <span>{edition.thirdPlaceFlag}</span>
                  <span className="text-gray-300 font-medium">{edition.thirdPlace}</span>
                  {edition.thirdPlaceScore && (
                    <span className="text-gray-600 text-xs">({edition.thirdPlaceScore})</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stars of the tournament */}
          {edition.stars?.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3">{l.stars}</h3>
              <div className="flex flex-wrap gap-2">
                {edition.stars.map((star, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded-full px-3 py-1.5 text-sm text-gray-200">
                    {star}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="card p-5">
            <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">{l.stats}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label={l.teams} value={edition.teams} />
              <StatCard label={l.matches} value={edition.matches} />
              <StatCard label={l.goals} value={edition.goals} />
              <StatCard label={l.attendance} value={edition.attendance} />
            </div>
          </div>

          {/* Venues */}
          {edition.venues && edition.venues.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">{l.venues}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {edition.venues.map((v, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-[#0d1117] rounded-lg px-3 py-2.5">
                    <span className="text-gray-500 text-base mt-0.5 shrink-0">🏟️</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{v.stadium}</div>
                      <div className="text-xs text-gray-500">{v.city}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tournament Results by Round */}
          {edition.rounds && edition.rounds.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">{l.results}</h3>
              <div className="space-y-4">
                {edition.rounds.map((round, ri) => (
                  <div key={ri}>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{round.name}</div>
                    <div className="space-y-1">
                      {round.matches.map((m, mi) => (
                        <div key={mi} className="flex items-center gap-2 bg-[#0d1117] rounded-lg px-3 py-2 text-sm">
                          <span className="flex-1 text-right text-gray-300 font-medium text-xs">{m.home}</span>
                          <span className="shrink-0 font-bold text-green-400 text-xs w-14 text-center">{m.score}</span>
                          <span className="flex-1 text-gray-300 font-medium text-xs">{m.away}</span>
                          {m.note && <span className="text-xs text-gray-600 italic ml-1 hidden sm:inline">— {m.note}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Awards */}
          <div className="card p-5">
            <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">{l.awards}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-[#0d1117] rounded-lg p-3">
                <span className="text-2xl">🥾</span>
                <div>
                  <div className="text-xs text-gray-500">{l.boot}</div>
                  <div className="font-semibold text-white text-sm">{edition.topScorer}</div>
                  <div className="text-xs text-green-400">{edition.topScorerGoals} {l.goals_label} · {edition.topScorerCountry}</div>
                </div>
              </div>
              {edition.goldenBall && (
                <div className="flex items-center gap-3 bg-[#0d1117] rounded-lg p-3">
                  <span className="text-2xl">🏅</span>
                  <div>
                    <div className="text-xs text-gray-500">{l.ball}</div>
                    <div className="font-semibold text-white text-sm">{edition.goldenBall}</div>
                  </div>
                </div>
              )}
              {edition.goldenGlove && (
                <div className="flex items-center gap-3 bg-[#0d1117] rounded-lg p-3">
                  <span className="text-2xl">🧤</span>
                  <div>
                    <div className="text-xs text-gray-500">{l.glove}</div>
                    <div className="font-semibold text-white text-sm">{edition.goldenGlove}</div>
                  </div>
                </div>
              )}
              {edition.mascot && (
                <div className="flex items-center gap-3 bg-[#0d1117] rounded-lg p-3">
                  <span className="text-2xl">🎭</span>
                  <div>
                    <div className="text-xs text-gray-500">{l.mascot}</div>
                    <div className="font-semibold text-white text-sm">{edition.mascot}</div>
                  </div>
                </div>
              )}
              {edition.ball && (
                <div className="flex items-center gap-3 bg-[#0d1117] rounded-lg p-3">
                  <span className="text-2xl">⚽</span>
                  <div>
                    <div className="text-xs text-gray-500">{l.officialBall}</div>
                    <div className="font-semibold text-white text-sm">{edition.ball}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fun facts */}
          <div className="card p-5">
            <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">{l.facts}</h3>
            <ul className="space-y-3">
              {funFacts.map((fact, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="text-green-500 shrink-0 mt-0.5">✦</span>
                  <span className="text-gray-300">{fact}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
