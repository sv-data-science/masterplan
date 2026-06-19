'use client';
import { useState, useCallback } from 'react';
import { getRandomQuestions, TriviaQuestion } from '@/lib/trivia';

const QUESTIONS_PER_GAME = 10;

type Phase = 'start' | 'question' | 'result';

function scoreEmoji(score: number, total: number) {
  const pct = score / total;
  if (pct === 1) return '🏆';
  if (pct >= 0.8) return '🔥';
  if (pct >= 0.6) return '😊';
  if (pct >= 0.4) return '😅';
  return '😬';
}

function scoreMessage(score: number, total: number) {
  const pct = score / total;
  if (pct === 1) return 'Perfect score! You\'re a true World Cup expert!';
  if (pct >= 0.8) return 'Excellent! You really know your football history.';
  if (pct >= 0.6) return 'Solid effort! You know your World Cup facts.';
  if (pct >= 0.4) return 'Not bad! Brush up on your WC history.';
  return 'Keep studying — the World Cup has a rich history to explore!';
}

export default function TriviaPage() {
  const [phase, setPhase] = useState<Phase>('start');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  const startGame = useCallback(() => {
    const qs = getRandomQuestions(QUESTIONS_PER_GAME);
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setAnswers(new Array(QUESTIONS_PER_GAME).fill(null));
    setPhase('question');
  }, []);

  const pick = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === questions[current].answer;
    if (correct) setScore(s => s + 1);
    setAnswers(prev => {
      const next = [...prev];
      next[current] = idx;
      return next;
    });
  };

  const next = () => {
    if (current + 1 >= questions.length) {
      setPhase('result');
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
    }
  };

  const q = questions[current];

  if (phase === 'start') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center space-y-6">
          <div>
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-3xl font-bold text-white mb-2">World Cup Trivia</h1>
            <p className="text-gray-400">
              Test your knowledge of FIFA World Cup history — winners, records, mascots, legendary players and moments.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-[#21262d] rounded-lg p-3">
              <div className="text-2xl font-bold text-green-400">{QUESTIONS_PER_GAME}</div>
              <div className="text-gray-500 mt-0.5">Questions</div>
            </div>
            <div className="bg-[#21262d] rounded-lg p-3">
              <div className="text-2xl font-bold text-green-400">4</div>
              <div className="text-gray-500 mt-0.5">Options each</div>
            </div>
            <div className="bg-[#21262d] rounded-lg p-3">
              <div className="text-2xl font-bold text-green-400">40+</div>
              <div className="text-gray-500 mt-0.5">Question bank</div>
            </div>
          </div>

          <p className="text-xs text-gray-600">Questions are randomly selected each game.</p>

          <button onClick={startGame} className="btn-primary py-3 px-8 text-lg w-full">
            Start Quiz ⚽
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="card p-8 text-center">
          <div className="text-6xl mb-3">{scoreEmoji(score, questions.length)}</div>
          <h2 className="text-3xl font-bold text-white mb-1">
            {score} / {questions.length}
          </h2>
          <p className="text-gray-400 mb-6">{scoreMessage(score, questions.length)}</p>
          <button onClick={startGame} className="btn-primary py-2.5 px-6">
            Play Again
          </button>
        </div>

        <div className="card divide-y divide-[#30363d]">
          <div className="px-4 py-2 text-xs text-gray-500 uppercase font-medium">Review</div>
          {questions.map((q, i) => {
            const userAns = answers[i];
            const correct = userAns === q.answer;
            return (
              <div key={q.id} className="px-4 py-3 space-y-1">
                <div className="flex items-start gap-2">
                  <span className="text-sm shrink-0 mt-0.5">{correct ? '✅' : '❌'}</span>
                  <p className="text-sm text-white">{q.question}</p>
                </div>
                {!correct && userAns !== null && (
                  <p className="text-xs text-red-400 pl-6">Your answer: {q.options[userAns]}</p>
                )}
                <p className="text-xs text-green-400 pl-6">
                  ✓ {q.options[q.answer]}
                </p>
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
  const progress = ((current) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-500">Question {current + 1} of {questions.length}</span>
        <span className="text-green-400 font-medium">{score} correct</span>
      </div>
      <div className="h-1.5 bg-[#30363d] rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question card */}
      <div className="card p-6">
        <p className="text-lg font-semibold text-white leading-snug mb-6">{q.question}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {q.options.map((opt, idx) => {
            let cls = 'w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ';
            if (!isAnswered) {
              cls += 'border-[#30363d] text-gray-300 hover:border-green-600 hover:text-white hover:bg-green-900/20 cursor-pointer';
            } else if (idx === q.answer) {
              cls += 'border-green-500 bg-green-900/30 text-green-300';
            } else if (idx === selected) {
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

        {/* Fact reveal */}
        {isAnswered && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${selected === q.answer ? 'bg-green-900/20 border border-green-800/40 text-green-300' : 'bg-red-900/20 border border-red-800/40 text-red-300'}`}>
            <span className="font-medium">{selected === q.answer ? '✓ Correct! ' : '✗ Wrong. '}</span>
            <span className="text-gray-300">{q.fact}</span>
          </div>
        )}
      </div>

      {isAnswered && (
        <button onClick={next} className="btn-primary w-full py-2.5">
          {current + 1 >= questions.length ? 'See Results' : 'Next Question →'}
        </button>
      )}
    </div>
  );
}
