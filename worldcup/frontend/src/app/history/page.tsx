'use client';
import { useState } from 'react';
import { WC_EDITIONS, WCEdition } from '@/lib/wc_history';

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
        <span className="text-2xl">{ed.hostFlag.split('').slice(0, 4).join('')}</span>
        <div>
          <div className="font-bold text-white text-sm">{ed.year}</div>
          <div className="text-xs text-gray-500">{ed.host}</div>
        </div>
        <div className="ml-auto text-right">
          <span className="text-lg">{ed.championFlag.split('').slice(0, 4).join('')}</span>
        </div>
      </div>
    </button>
  );
}

export default function WCHistoryPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2022);
  const edition = WC_EDITIONS.find(e => e.year === selectedYear) ?? WC_EDITIONS[WC_EDITIONS.length - 1];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="card p-6 bg-gradient-to-br from-blue-900/20 to-[#161b22] border-blue-800/30">
        <h1 className="text-2xl font-bold text-white mb-1">📖 World Cup History</h1>
        <p className="text-gray-400 text-sm">22 tournaments · 1930–2022 · The complete story</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Year selector */}
        <div className="card p-4 space-y-2 lg:max-h-[80vh] lg:overflow-y-auto">
          <h2 className="text-xs text-gray-500 uppercase font-medium tracking-widest mb-3">Select Tournament</h2>
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
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Champion</div>
                <div className="text-4xl">{edition.championFlag}</div>
                <div className="text-white font-bold mt-1">{edition.champion}</div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-[#0d1117] rounded-xl">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-2 text-center">Final</div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-2xl">{edition.championFlag}</div>
                  <div className="text-sm font-semibold text-white mt-1">{edition.champion}</div>
                </div>
                <div className="text-2xl font-black text-green-400">{edition.finalScore}</div>
                <div className="text-center">
                  <div className="text-2xl">{edition.runnerUpFlag}</div>
                  <div className="text-sm font-semibold text-white mt-1">{edition.runnerUp}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="card p-5">
            <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">Tournament Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Teams" value={edition.teams} />
              <StatCard label="Matches" value={edition.matches} />
              <StatCard label="Goals" value={edition.goals} />
              <StatCard label="Attendance" value={edition.attendance} />
            </div>
          </div>

          {/* Awards */}
          <div className="card p-5">
            <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">Awards</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-[#0d1117] rounded-lg p-3">
                <span className="text-2xl">🥾</span>
                <div>
                  <div className="text-xs text-gray-500">Golden Boot</div>
                  <div className="font-semibold text-white text-sm">{edition.topScorer}</div>
                  <div className="text-xs text-green-400">{edition.topScorerGoals} goals · {edition.topScorerCountry}</div>
                </div>
              </div>
              {edition.goldenBall && (
                <div className="flex items-center gap-3 bg-[#0d1117] rounded-lg p-3">
                  <span className="text-2xl">🏅</span>
                  <div>
                    <div className="text-xs text-gray-500">Golden Ball (Best Player)</div>
                    <div className="font-semibold text-white text-sm">{edition.goldenBall}</div>
                  </div>
                </div>
              )}
              {edition.goldenGlove && (
                <div className="flex items-center gap-3 bg-[#0d1117] rounded-lg p-3">
                  <span className="text-2xl">🧤</span>
                  <div>
                    <div className="text-xs text-gray-500">Golden Glove (Best Keeper)</div>
                    <div className="font-semibold text-white text-sm">{edition.goldenGlove}</div>
                  </div>
                </div>
              )}
              {edition.mascot && (
                <div className="flex items-center gap-3 bg-[#0d1117] rounded-lg p-3">
                  <span className="text-2xl">🎭</span>
                  <div>
                    <div className="text-xs text-gray-500">Mascot</div>
                    <div className="font-semibold text-white text-sm">{edition.mascot}</div>
                  </div>
                </div>
              )}
              {edition.ball && (
                <div className="flex items-center gap-3 bg-[#0d1117] rounded-lg p-3">
                  <span className="text-2xl">⚽</span>
                  <div>
                    <div className="text-xs text-gray-500">Official Ball</div>
                    <div className="font-semibold text-white text-sm">{edition.ball}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fun facts */}
          <div className="card p-5">
            <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">Fun Facts & Story</h3>
            <ul className="space-y-3">
              {edition.funFacts.map((fact, i) => (
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
