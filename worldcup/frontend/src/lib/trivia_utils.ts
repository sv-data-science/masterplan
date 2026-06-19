import { TriviaQuestion } from './trivia';

const SEEN_KEY = 'trivia_seen_ids';
const LANG_KEY = 'trivia_lang';

export type TriviaLang = 'en' | 'es';

export function getLang(): TriviaLang {
  try {
    return localStorage.getItem(LANG_KEY) === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

export function saveLang(lang: TriviaLang) {
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
}

function getSeenIds(): Set<number> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function markSeen(ids: number[]) {
  try {
    const seen = getSeenIds();
    ids.forEach(id => seen.add(id));
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)));
  } catch {}
}

function resetSeen() {
  try { localStorage.removeItem(SEEN_KEY); } catch {}
}

export function unseenCount(pool: TriviaQuestion[]): number {
  const seen = getSeenIds();
  return pool.filter(q => !seen.has(q.id)).length;
}

/** Returns a shuffled set of unseen questions, resetting the seen pool when fewer than 10 remain. */
export function getQuestionsForQuiz(pool: TriviaQuestion[]): TriviaQuestion[] {
  const seen = getSeenIds();
  let candidates = pool.filter(q => !seen.has(q.id));

  if (candidates.length < 10) {
    resetSeen();
    candidates = pool;
  }

  return [...candidates].sort(() => Math.random() - 0.5);
}
