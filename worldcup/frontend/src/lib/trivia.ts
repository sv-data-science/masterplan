export interface TriviaQuestion {
  id: number;
  question: string;
  options: string[];
  answer: number; // 0-indexed
  fact: string;   // shown after answering
}

export const ALL_QUESTIONS: TriviaQuestion[] = [
  // WINNERS & HISTORY
  {
    id: 1,
    question: 'How many times has Brazil won the FIFA World Cup?',
    options: ['3', '4', '5', '6'],
    answer: 2,
    fact: 'Brazil won in 1958, 1962, 1970, 1994, and 2002 — the most of any nation.',
  },
  {
    id: 2,
    question: 'Which country hosted the very first FIFA World Cup in 1930?',
    options: ['Argentina', 'Brazil', 'Italy', 'Uruguay'],
    answer: 3,
    fact: 'Uruguay also won that first tournament, beating Argentina 4–2 in the final.',
  },
  {
    id: 3,
    question: 'Which country won back-to-back World Cups in 1934 and 1938?',
    options: ['Brazil', 'Argentina', 'Germany', 'Italy'],
    answer: 3,
    fact: 'Italy under Vittorio Pozzo remains the only manager to win the World Cup twice.',
  },
  {
    id: 4,
    question: 'In which year did England win their only World Cup title?',
    options: ['1962', '1966', '1970', '1974'],
    answer: 1,
    fact: 'England beat West Germany 4–2 at Wembley. Geoff Hurst scored a hat-trick.',
  },
  {
    id: 5,
    question: 'How many World Cup titles has Italy won?',
    options: ['2', '3', '4', '5'],
    answer: 2,
    fact: 'Italy won in 1934, 1938, 1982, and 2006 — their last title.',
  },
  {
    id: 6,
    question: 'Which country has qualified for every single FIFA World Cup since the first in 1930?',
    options: ['Germany', 'Italy', 'Argentina', 'Brazil'],
    answer: 3,
    fact: 'Brazil is the only nation to have participated in all editions of the World Cup.',
  },
  {
    id: 7,
    question: 'What year did France win their first FIFA World Cup?',
    options: ['1994', '1998', '2002', '2006'],
    answer: 1,
    fact: 'France beat Brazil 3–0 in the Paris final, with Zidane scoring two headers.',
  },
  {
    id: 8,
    question: 'Which country won the inaugural FIFA World Cup in 1930?',
    options: ['Argentina', 'Brazil', 'USA', 'Uruguay'],
    answer: 3,
    fact: 'Hosts Uruguay beat Argentina 4–2 in the final in Montevideo.',
  },

  // TOP SCORERS & RECORDS
  {
    id: 9,
    question: 'Who is the all-time top scorer in World Cup history with 16 goals?',
    options: ['Pelé', 'Ronaldo (Brazil)', 'Miroslav Klose', 'Gerd Müller'],
    answer: 2,
    fact: 'Klose scored 16 goals across four World Cups (2002–2014) for Germany.',
  },
  {
    id: 10,
    question: 'What single-tournament scoring record did Just Fontaine set at the 1958 World Cup?',
    options: ['10 goals', '11 goals', '12 goals', '13 goals'],
    answer: 3,
    fact: 'Playing for France, Fontaine scored 13 goals in just 6 matches — a record that still stands.',
  },
  {
    id: 11,
    question: 'Who scored the fastest goal in World Cup history — in just 11 seconds?',
    options: ['Clint Dempsey', 'Hakan Şükür', 'Bryan Ruiz', 'Oleg Salenko'],
    answer: 1,
    fact: 'Şükür scored for Turkey against South Korea in the 2002 third-place match.',
  },
  {
    id: 12,
    question: 'Who scored the most goals in a single World Cup match, netting 5 against Cameroon in 1994?',
    options: ['Gerd Müller', 'Just Fontaine', 'Oleg Salenko', 'Miroslav Klose'],
    answer: 2,
    fact: 'Salenko scored 5 for Russia vs Cameroon in 1994 — still a record for one match.',
  },
  {
    id: 13,
    question: 'Who won the Golden Boot at the 2018 World Cup in Russia?',
    options: ['Antoine Griezmann', 'Cristiano Ronaldo', 'Romelu Lukaku', 'Harry Kane'],
    answer: 3,
    fact: 'Kane scored 6 goals for England including two hat-tricks — the most of any player at Russia 2018.',
  },
  {
    id: 14,
    question: 'Which World Cup produced the highest average goals per match (5.38 goals/game)?',
    options: ['1930 Uruguay', '1954 Switzerland', '1970 Mexico', '1982 Spain'],
    answer: 1,
    fact: '1954 had legendary high scorers: Hungary beat West Germany 8–3 in the group stage.',
  },
  {
    id: 15,
    question: 'Who was the oldest player to score a goal in World Cup history, doing so at age 42?',
    options: ['Essam El-Hadary', 'Roger Milla', 'Lothar Matthäus', 'Peter Shilton'],
    answer: 1,
    fact: 'Milla came out of retirement to play for Cameroon at both 1990 and 1994 World Cups.',
  },
  {
    id: 16,
    question: 'Which player has appeared in the most World Cup matches ever (25)?',
    options: ['Miroslav Klose', 'Cafu', 'Paolo Maldini', 'Lothar Matthäus'],
    answer: 3,
    fact: 'Matthäus played in 5 World Cups for West Germany/Germany between 1982 and 1998.',
  },
  {
    id: 17,
    question: 'Who is the youngest player ever to score a goal in the World Cup?',
    options: ['Michael Owen', 'Pelé', 'Cesc Fàbregas', 'Wayne Rooney'],
    answer: 1,
    fact: 'Pelé scored in the 1958 World Cup at just 17 years and 239 days old.',
  },
  {
    id: 18,
    question: 'How many goals did Ronaldo (Brazil) score at the 2002 World Cup, including 2 in the final?',
    options: ['6', '7', '8', '9'],
    answer: 2,
    fact: "Ronaldo's 8 goals made him Golden Boot winner. He scored both in the 2–0 final win over Germany.",
  },

  // MEMORABLE MOMENTS
  {
    id: 19,
    question: "Who scored the infamous 'Hand of God' goal against England at the 1986 World Cup?",
    options: ['Pelé', 'Diego Maradona', 'Ronaldo', 'Ronaldinho'],
    answer: 1,
    fact: "In the same match, Maradona also scored the 'Goal of the Century,' voted the greatest WC goal ever.",
  },
  {
    id: 20,
    question: 'Which country beat Germany 7–1 in the 2014 World Cup semi-final (the "Mineirazo")?',
    options: ['Argentina', 'France', 'Netherlands', 'Brazil'],
    answer: 3,
    fact: 'The match in Belo Horizonte is considered one of the biggest shocks in football history.',
  },
  {
    id: 21,
    question: 'Who scored the winning goal for Germany in the 2014 World Cup Final, in extra time?',
    options: ['Thomas Müller', 'Mesut Özil', 'Bastian Schweinsteiger', 'Mario Götze'],
    answer: 3,
    fact: 'Götze, a substitute, scored in the 113th minute to beat Argentina 1–0.',
  },
  {
    id: 22,
    question: 'Who was sent off for headbutting Marco Materazzi in the 2006 World Cup Final?',
    options: ['Patrick Vieira', 'Thierry Henry', 'Zinedine Zidane', 'Franck Ribéry'],
    answer: 2,
    fact: 'In his final professional match, Zidane was red-carded — yet still won the Golden Ball that tournament.',
  },
  {
    id: 23,
    question: 'Which African team reached the World Cup semi-finals for the first time ever at Qatar 2022?',
    options: ['Senegal', 'Ghana', 'Nigeria', 'Morocco'],
    answer: 3,
    fact: 'Morocco beat Spain and Portugal on the way before losing to France in the semi-finals.',
  },
  {
    id: 24,
    question: 'Which player scored a hat-trick in the 2022 World Cup Final, yet still ended on the losing side?',
    options: ['Antoine Griezmann', 'Ousmane Dembélé', 'Olivier Giroud', 'Kylian Mbappé'],
    answer: 3,
    fact: "Mbappé's hat-trick made France the first team since 1966 to score 3 WC final goals and lose.",
  },
  {
    id: 25,
    question: 'Which World Cup was the first to use VAR (Video Assistant Referee)?',
    options: ['2014 Brazil', '2018 Russia', '2022 Qatar', '2010 South Africa'],
    answer: 1,
    fact: 'VAR debuted at Russia 2018 and led to a record number of penalties being awarded.',
  },
  {
    id: 26,
    question: 'Which team had the record biggest win in World Cup history, beating El Salvador 10–1?',
    options: ['Hungary', 'Yugoslavia', 'Germany', 'Brazil'],
    answer: 0,
    fact: 'Hungary beat El Salvador 10–1 at the 1982 World Cup in Spain.',
  },

  // HOST COUNTRIES
  {
    id: 27,
    question: 'In which country was the 2010 World Cup held?',
    options: ['South Africa', 'Brazil', 'Germany', 'Japan'],
    answer: 0,
    fact: 'South Africa 2010 was the first World Cup hosted on the African continent.',
  },
  {
    id: 28,
    question: 'The 2026 FIFA World Cup will be co-hosted by which three countries?',
    options: ['USA, Mexico & Brazil', 'USA, Canada & Mexico', 'Mexico, Canada & Colombia', 'USA, Canada & Argentina'],
    answer: 1,
    fact: 'With 16 host cities across three nations, 2026 is the first ever tri-host World Cup.',
  },
  {
    id: 29,
    question: 'Which World Cup was the first to be held in Asia?',
    options: ['1998 France', '2002 Japan & South Korea', '2006 Germany', '2010 South Africa'],
    answer: 1,
    fact: 'Japan and South Korea co-hosted in 2002 — also the first ever co-hosted World Cup.',
  },
  {
    id: 30,
    question: 'How many teams will compete in the 2026 FIFA World Cup, up from 32?',
    options: ['36', '40', '48', '64'],
    answer: 2,
    fact: 'The 48-team format adds a new Round of 32 and gives more nations a chance to qualify.',
  },

  // TROPHIES
  {
    id: 31,
    question: 'What was the original World Cup trophy called, awarded from 1930 to 1970?',
    options: ['Henri Delaunay Trophy', 'Jules Rimet Trophy', 'FIFA World Cup', 'Coupe du Monde'],
    answer: 1,
    fact: 'Brazil won it permanently in 1970 after their third title. The original was later stolen and never recovered.',
  },
  {
    id: 32,
    question: 'In what year was the current FIFA World Cup trophy first awarded?',
    options: ['1966', '1970', '1974', '1982'],
    answer: 2,
    fact: 'Made of 18-carat gold with a malachite base, the current trophy was designed by Italian artist Silvio Gazzaniga.',
  },

  // MASCOTS
  {
    id: 33,
    question: 'What was the name of the first-ever FIFA World Cup mascot, introduced at England 1966?',
    options: ['Striker', 'World Cup Willie', 'Footix', 'Goleo'],
    answer: 1,
    fact: 'World Cup Willie was a lion wearing a Union Jack shirt — the pioneer of all WC mascots.',
  },
  {
    id: 34,
    question: 'What was the mascot of the 1998 World Cup in France?',
    options: ['Ciao', 'Footix', 'Pique', 'Naranjito'],
    answer: 1,
    fact: "Footix was a blue rooster — France's national symbol (the Gallic rooster) wearing a football kit.",
  },
  {
    id: 35,
    question: 'What animal was Fuleco, the mascot of the 2014 World Cup in Brazil?',
    options: ['Toucan', 'Jaguar', 'Three-banded armadillo', 'Tree frog'],
    answer: 2,
    fact: 'Fuleco represented an endangered species native to Brazil, raising awareness for conservation.',
  },
  {
    id: 36,
    question: 'What was the mascot of the 2010 World Cup in South Africa?',
    options: ['Fuleco', 'Zakumi', 'Footix', 'Goleo'],
    answer: 1,
    fact: '"Za" stands for South Africa and "kumi" means "ten" in several African languages.',
  },
  {
    id: 37,
    question: 'What was the mascot of the 2018 World Cup in Russia?',
    options: ['Zabivaka', 'Goleo VI', 'Striker', 'Ciao'],
    answer: 0,
    fact: '"Zabivaka" means "one who scores goals" in Russian — a friendly wolf in football kit.',
  },
  {
    id: 38,
    question: "What was the mascot of the 2022 World Cup in Qatar?",
    options: ['Goleo VI', 'Zabivaka', "La'eeb", 'Tazuni'],
    answer: 2,
    fact: "La'eeb means 'super-skilled player' in Arabic and was depicted as a ghost-like flowing figure.",
  },
  {
    id: 39,
    question: 'What was the mascot for the 1994 World Cup in the USA?',
    options: ['Striker', 'Ciao', 'Pique', 'Naranjito'],
    answer: 0,
    fact: 'Striker was a dog in a USA soccer shirt — one of the first WC mascots designed by a Hollywood studio.',
  },
  {
    id: 40,
    question: 'Naranjito, the mascot of the 1982 World Cup in Spain, was dressed as what fruit?',
    options: ['Lemon', 'Orange', 'Watermelon', 'Tomato'],
    answer: 1,
    fact: '"Naranja" means orange in Spanish. Naranjito wore a Spain jersey and was hugely popular.',
  },
];

export function getRandomQuestions(n = 10): TriviaQuestion[] {
  const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}
