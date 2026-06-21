'use client';
import { useState, useEffect, useRef } from 'react';
import { ALL_QUESTIONS, TriviaQuestion } from '@/lib/trivia';
import { ALL_QUESTIONS_ES } from '@/lib/trivia_es';
import { getLang, saveLang, getQuestionsForQuiz, markSeen, unseenCount, TriviaLang } from '@/lib/trivia_utils';
import { useAuthStore } from '@/store/auth';
import { api, triviaApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

const TIMER_SECONDS = 15;

type Phase = 'start' | 'question' | 'result';

function scoreEmoji(score: number, total: number) {
  const pct = score / total;
  if (pct === 1) return '🏆';
  if (pct >= 0.8) return '🔥';
  if (pct >= 0.6) return '😊';
  if (pct >= 0.4) return '😅';
  return '😬';
}

function scoreMessage(score: number, total: number, lang: TriviaLang) {
  const pct = score / total;
  if (lang === 'es') {
    if (pct === 1) return '¡Puntuación perfecta! ¡Eres un verdadero experto del Mundial!';
    if (pct >= 0.8) return '¡Excelente! Realmente conoces la historia del fútbol.';
    if (pct >= 0.6) return '¡Buen esfuerzo! Conoces los datos del Mundial.';
    if (pct >= 0.4) return 'No está mal. Repasa la historia del Mundial.';
    return '¡Sigue estudiando! El Mundial tiene una historia rica por explorar.';
  }
  if (pct === 1) return "Perfect score! You're a true World Cup expert!";
  if (pct >= 0.8) return 'Excellent! You really know your football history.';
  if (pct >= 0.6) return 'Solid effort! You know your World Cup facts.';
  if (pct >= 0.4) return 'Not bad! Brush up on your WC history.';
  return 'Keep studying — the World Cup has a rich history to explore!';
}

function TriviaLeaderboard({ refreshKey }: { refreshKey: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['trivia-leaderboard', refreshKey],
    queryFn: () => api.get('/trivia/leaderboard').then(r => r.data),
    staleTime: 30_000,
  });

  if (isLoading) return <div className="text-center py-4 text-gray-500 text-sm">Loading leaderboard…</div>;
  if (!data?.length) return <div className="text-center py-4 text-gray-600 text-sm">No scores yet — be the first!</div>;

  return (
    <div className="divide-y divide-[#30363d]">
      {data.map((row: any) => (
        <div key={row.username} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <span className="w-6 text-center font-bold text-gray-500 shrink-0">
            {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
          </span>
          <Link href={`/profile/${row.username}`} className="flex-1 text-white font-medium hover:text-green-400 transition-colors truncate">{row.display_name}</Link>
          <span className="text-green-400 font-bold">
            {row.best_score}<span className="text-gray-500 font-normal">/{row.best_total}</span>
          </span>
          <span className="text-gray-600 text-xs hidden sm:inline">
            {row.games_played} game{row.games_played !== 1 ? 's' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TriviaPage() {
  const { user } = useAuthStore();
  const [phase, setPhase] = useState<Phase>('start');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lbRefreshKey, setLbRefreshKey] = useState(0);
  const [lang, setLangState] = useState<TriviaLang>('en');
  const [remainingEn, setRemainingEn] = useState(0);
  const [remainingEs, setRemainingEs] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(TIMER_SECONDS);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setLangState(getLang());
    setRemainingEn(unseenCount(ALL_QUESTIONS));
    setRemainingEs(unseenCount(ALL_QUESTIONS_ES));
  }, []);

  const { data: myStats, refetch: refetchStats } = useQuery({
    queryKey: ['trivia-my-stats'],
    queryFn: () => triviaApi.myStats().then(r => r.data),
    enabled: !!user && phase === 'start',
    staleTime: 10_000,
  });

  // Timer: starts fresh on each new question, stops when answered
  useEffect(() => {
    if (phase !== 'question' || selected !== null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(TIMER_SECONDS);
    setTimedOut(false);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setTimedOut(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current, phase]);

  // When timed out, record as skipped and auto-advance after 1.5s
  useEffect(() => {
    if (!timedOut) return;
    setSelected(-1);
    setAnswers(prev => {
      const next = [...prev];
      next[current] = -1;
      return next;
    });
    const t = setTimeout(() => {
      if (current + 1 >= questions.length) {
        markSeen(questions.map(q => q.id));
        setPhase('result');
      } else {
        setCurrent(c => c + 1);
        setSelected(null);
        setTimedOut(false);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [timedOut]);

  const switchLang = (l: TriviaLang) => {
    setLangState(l);
    saveLang(l);
    setRemainingEn(unseenCount(ALL_QUESTIONS));
    setRemainingEs(unseenCount(ALL_QUESTIONS_ES));
  };

  const startGame = (overrideLang?: TriviaLang) => {
    const activeLang = overrideLang ?? lang;
    const pool = activeLang === 'es' && ALL_QUESTIONS_ES.length > 0 ? ALL_QUESTIONS_ES : ALL_QUESTIONS;
    const qs = getQuestionsForQuiz(pool).slice(0, 10);
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setTimedOut(false);
    setScore(0);
    setAnswers(new Array(qs.length).fill(null));
    setSubmitted(false);
    setPhase('question');
  };

  const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100) : 0;
  const accuracyColor = (p: number) =>
    p >= 80 ? 'text-green-400' : p >= 60 ? 'text-yellow-400' : 'text-red-400';
  const accuracyBarColor = (p: number) =>
    p >= 80 ? 'bg-green-500' : p >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  const timerColor = timeLeft > 10 ? 'text-green-400' : timeLeft > 5 ? 'text-yellow-400' : 'text-red-400';
  const timerBarColor = timeLeft > 10 ? 'bg-green-500' : timeLeft > 5 ? 'bg-yellow-500' : 'bg-red-500';

  const pick = (idx: number) => {
    if (selected !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(idx);
    const correct = idx === questions[current].answer;
    const newScore = score + (correct ? 1 : 0);
    const answered = current + 1;
    if (correct) setScore(newScore);
    if (user) triviaApi.saveLive(newScore, answered).catch(() => {});
    setAnswers(prev => {
      const next = [...prev];
      next[current] = idx;
      return next;
    });
  };

  const next = () => {
    if (current + 1 >= questions.length) {
      markSeen(questions.map(q => q.id));
      setPhase('result');
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setTimedOut(false);
    }
  };

  const submitScore = async () => {
    setSubmitting(true);
    try {
      await api.post('/trivia/score', { score, total: questions.length });
      setSubmitted(true);
      setLbRefreshKey(k => k + 1);
    } catch {
      // score display still works even if save fails
    } finally {
      setSubmitting(false);
    }
  };

  const goToStart = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (phase === 'question' && questions.length > 0) {
      const answeredCount = current + (selected !== null ? 1 : 0);
      if (answeredCount > 0) {
        if (user) triviaApi.submitScore(score, answeredCount).catch(() => {});
        if (user) triviaApi.saveLive(score, answeredCount).catch(() => {});
      }
      markSeen(questions.slice(0, answeredCount).map(q => q.id));
    }
    setRemainingEn(unseenCount(ALL_QUESTIONS));
    setRemainingEs(unseenCount(ALL_QUESTIONS_ES));
    setPhase('start');
    if (user) refetchStats();
  };

  const q = questions[current];

  if (phase === 'start') {
    const bestPct = myStats?.best_score != null ? pct(myStats.best_score, myStats.best_total) : null;
    const livePct = myStats?.live_total > 0 ? pct(myStats.live_score, myStats.live_total) : null;
    const remaining = lang === 'es' ? remainingEs : remainingEn;
    const totalPool = lang === 'es' ? ALL_QUESTIONS_ES.length : ALL_QUESTIONS.length;

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="card p-8 text-center space-y-6">
          <div>
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {lang === 'es' ? 'Trivia del Mundial' : 'World Cup Trivia'}
            </h1>
            <p className="text-gray-400">
              {lang === 'es'
                ? 'Pon a prueba tu conocimiento — campeones, récords, mascotas y momentos épicos.'
                : 'Test your knowledge — winners, records, mascots, legendary moments.'}
            </p>
          </div>

          {/* Language selector */}
          <div className="flex justify-center gap-2">
            <button
              onClick={() => switchLang('en')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${lang === 'en' ? 'border-green-500 bg-green-900/20 text-green-300' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
            >
              🇺🇸 English
            </button>
            <button
              onClick={() => switchLang('es')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${lang === 'es' ? 'border-green-500 bg-green-900/20 text-green-300' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
            >
              🇪🇸 Español
            </button>
          </div>

          <p className="text-xs text-gray-600">
            {lang === 'es'
              ? `10 preguntas por partida · ${remaining} nuevas de ${totalPool} en total · ⏱ 15 seg`
              : `10 questions per game · ${remaining} new of ${totalPool} total · ⏱ 15 sec each`}
          </p>

          {user && myStats && myStats.games_played > 0 && (
            <div className="bg-[#0d1117] rounded-xl p-4 text-left space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest">
                {lang === 'es' ? 'Tus estadísticas' : 'Your Stats'}
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className={`text-2xl font-bold ${bestPct != null ? accuracyColor(bestPct) : 'text-gray-500'}`}>
                    {bestPct != null ? `${bestPct}%` : '—'}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{lang === 'es' ? 'Mejor precisión' : 'Best accuracy'}</div>
                  {myStats.best_score != null && (
                    <div className="text-xs text-gray-600">{myStats.best_score}/{myStats.best_total}</div>
                  )}
                </div>
                <div>
                  <div className={`text-2xl font-bold ${livePct != null ? accuracyColor(livePct) : 'text-gray-500'}`}>
                    {livePct != null ? `${livePct}%` : '—'}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{lang === 'es' ? 'Puntuación en vivo' : 'Live score'}</div>
                  {myStats.live_total > 0 && (
                    <div className="text-xs text-gray-600">{myStats.live_score}/{myStats.live_total} Q</div>
                  )}
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{myStats.games_played}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{lang === 'es' ? 'Partidas jugadas' : 'Games played'}</div>
                </div>
              </div>
              {livePct != null && (
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{lang === 'es' ? 'Precisión acumulada' : 'Running accuracy'}</span>
                    <span className={accuracyColor(livePct)}>{livePct}%</span>
                  </div>
                  <div className="w-full bg-[#30363d] rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${accuracyBarColor(livePct)}`} style={{ width: `${livePct}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          <button onClick={() => startGame(lang)} className="btn-primary py-3 px-8 text-lg w-full">
            {myStats?.games_played > 0
              ? (lang === 'es' ? 'Jugar de nuevo ⚽' : 'Play Again ⚽')
              : (lang === 'es' ? 'Comenzar quiz ⚽' : 'Start Quiz ⚽')}
          </button>
        </div>

        <div className="card">
          <div className="px-4 py-3 border-b border-[#30363d]">
            <h2 className="font-semibold text-white text-sm">🏅 Trivia Leaderboard</h2>
          </div>
          <TriviaLeaderboard refreshKey={lbRefreshKey} />
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const reviewLabel = lang === 'es' ? 'Repaso' : 'Review';
    const yourAnswer = lang === 'es' ? 'Tu respuesta' : 'Your answer';

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="card p-8 text-center">
          <div className="text-6xl mb-3">{scoreEmoji(score, questions.length)}</div>
          <h2 className="text-3xl font-bold text-white mb-1">
            {score} / {questions.length}
          </h2>
          <p className="text-gray-400 mb-6">{scoreMessage(score, questions.length, lang)}</p>

          {user && !submitted && (
            <button onClick={submitScore} disabled={submitting} className="btn-primary py-2.5 px-6 mb-3 w-full">
              {submitting
                ? (lang === 'es' ? '⏳ Guardando…' : '⏳ Saving…')
                : (lang === 'es' ? '📊 Guardar puntuación' : '📊 Save my score to leaderboard')}
            </button>
          )}
          {submitted && (
            <p className="text-green-400 text-sm mb-3">
              {lang === 'es' ? '✓ ¡Puntuación guardada!' : '✓ Score saved to leaderboard!'}
            </p>
          )}
          {!user && (
            <p className="text-gray-500 text-xs mb-3">
              <a href="/login" className="text-green-400 hover:underline">{lang === 'es' ? 'Inicia sesión' : 'Log in'}</a>
              {lang === 'es' ? ' para guardar tu puntuación.' : ' to save your score to the leaderboard.'}
            </p>
          )}

          <div className="flex gap-2">
            <button onClick={() => startGame(lang)} className="btn-primary flex-1 py-2.5">
              {lang === 'es' ? 'Jugar de nuevo' : 'Play Again'}
            </button>
            <button onClick={goToStart} className="btn-secondary flex-1 py-2.5">
              ← {lang === 'es' ? 'Volver' : 'Back'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="px-4 py-3 border-b border-[#30363d]">
            <h2 className="font-semibold text-white text-sm">🏅 Trivia Leaderboard</h2>
          </div>
          <TriviaLeaderboard refreshKey={lbRefreshKey} />
        </div>

        <div className="card divide-y divide-[#30363d]">
          <div className="px-4 py-2 text-xs text-gray-500 uppercase font-medium">{reviewLabel}</div>
          {questions.map((q, i) => {
            const userAns = answers[i];
            const correct = userAns === q.answer;
            const timedOutQ = userAns === -1;
            return (
              <div key={q.id} className="px-4 py-3 space-y-1">
                <div className="flex items-start gap-2">
                  <span className="text-sm shrink-0 mt-0.5">{correct ? '✅' : timedOutQ ? '⏱' : '❌'}</span>
                  <p className="text-sm text-white">{q.question}</p>
                </div>
                {timedOutQ && (
                  <p className="text-xs text-yellow-600 pl-6">{lang === 'es' ? 'Tiempo agotado' : 'Timed out'}</p>
                )}
                {!correct && !timedOutQ && userAns !== null && (
                  <p className="text-xs text-red-400 pl-6">{yourAnswer}: {q.options[userAns]}</p>
                )}
                <p className="text-xs text-green-400 pl-6">✓ {q.options[q.answer]}</p>
                <p className="text-xs text-gray-500 pl-6">{q.fact}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // question phase
  const isAnswered = selected !== null;
  const progress = (current / questions.length) * 100;
  const answered = current + (isAnswered ? 1 : 0);
  const livePctNow = pct(score, answered);
  const questionLabel = lang === 'es'
    ? `Pregunta ${current + 1} de ${questions.length}`
    : `Question ${current + 1} of ${questions.length}`;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header row: question counter, live score, timer */}
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-500">{questionLabel}</span>
        <div className="flex items-center gap-3">
          {answered > 0 && (
            <span className={`font-semibold ${accuracyColor(livePctNow)}`}>
              {score}/{answered} · {livePctNow}%
            </span>
          )}
          {/* Countdown */}
          {!isAnswered && (
            <span className={`font-bold text-base w-7 text-center ${timerColor}`}>
              {timeLeft}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar (question progress) */}
      <div className="h-1.5 bg-[#30363d] rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Timer bar */}
      {!isAnswered && (
        <div className="h-1 bg-[#30363d] rounded-full overflow-hidden -mt-2">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${timerBarColor}`}
            style={{ width: `${(timeLeft / TIMER_SECONDS) * 100}%` }}
          />
        </div>
      )}

      {/* Accuracy bar (when answered) */}
      {isAnswered && answered > 0 && (
        <div className="h-1 bg-[#30363d] rounded-full overflow-hidden -mt-2">
          <div
            className={`h-full rounded-full transition-all duration-300 ${accuracyBarColor(livePctNow)}`}
            style={{ width: `${livePctNow}%` }}
          />
        </div>
      )}

      <div className="card p-6">
        <p className="text-lg font-semibold text-white leading-snug mb-6">{q.question}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {q.options.map((opt, idx) => {
            let cls = 'w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ';
            if (!isAnswered) {
              cls += 'border-[#30363d] text-gray-300 hover:border-green-600 hover:text-white hover:bg-green-900/20 cursor-pointer';
            } else if (idx === q.answer) {
              cls += 'border-green-500 bg-green-900/30 text-green-300';
            } else if (idx === selected && selected !== -1) {
              cls += 'border-red-500 bg-red-900/20 text-red-400';
            } else {
              cls += 'border-[#30363d] text-gray-600 opacity-60';
            }
            return (
              <button key={idx} className={cls} onClick={() => pick(idx)} disabled={isAnswered}>
                <span className="mr-2 text-xs opacity-60">{String.fromCharCode(65 + idx)}.</span>
                {opt}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            timedOut || selected === -1
              ? 'bg-yellow-900/20 border border-yellow-800/40 text-yellow-300'
              : selected === q.answer
              ? 'bg-green-900/20 border border-green-800/40 text-green-300'
              : 'bg-red-900/20 border border-red-800/40 text-red-300'
          }`}>
            <span className="font-medium">
              {timedOut || selected === -1
                ? (lang === 'es' ? '⏱ ¡Tiempo! ' : '⏱ Time\'s up! ')
                : selected === q.answer
                ? (lang === 'es' ? '✓ ¡Correcto! ' : '✓ Correct! ')
                : (lang === 'es' ? '✗ Incorrecto. ' : '✗ Wrong. ')}
            </span>
            <span className="text-gray-300">{q.fact}</span>
          </div>
        )}
      </div>

      {isAnswered && !timedOut && selected !== -1 && (
        <button onClick={next} className="btn-primary w-full py-2.5">
          {current + 1 >= questions.length
            ? (lang === 'es' ? 'Ver resultados' : 'See Results')
            : (lang === 'es' ? 'Siguiente pregunta →' : 'Next Question →')}
        </button>
      )}
      <button
        onClick={goToStart}
        className="w-full py-2.5 rounded-lg font-medium bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-colors text-sm"
      >
        {lang === 'es' ? '✕ Salir' : '✕ Exit'}
      </button>
    </div>
  );
}
