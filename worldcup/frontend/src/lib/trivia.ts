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

  // WC FINALS
  {
    id: 41,
    question: 'Which stadium is the only one in history to have hosted two separate World Cup Finals?',
    options: ['Maracanã', 'Estadio Azteca', 'Luzhniki', 'Wembley'],
    answer: 1,
    fact: 'The Azteca in Mexico City hosted the 1970 final (Brazil 4–1 Italy) and the 1986 final (Argentina 3–2 West Germany).',
  },
  {
    id: 42,
    question: "Who scored the winning goal in Spain's 2010 World Cup Final victory over the Netherlands?",
    options: ['David Villa', 'Fernando Torres', 'Andrés Iniesta', 'Xavi'],
    answer: 2,
    fact: "Iniesta struck in the 116th minute of extra time. It remains Spain's only World Cup title.",
  },
  {
    id: 43,
    question: "The 1994 World Cup Final ended 0–0 and went to penalties. Who missed Italy's decisive spot kick?",
    options: ['Franco Baresi', 'Daniele Massaro', 'Roberto Baggio', 'Demetrio Albertini'],
    answer: 2,
    fact: "Baggio's miss over the bar handed Brazil the title 3–2 on penalties — one of football's most iconic images.",
  },
  {
    id: 44,
    question: 'Which country has appeared in the most World Cup Finals (8 times)?',
    options: ['Brazil', 'Italy', 'Germany', 'Argentina'],
    answer: 2,
    fact: 'Germany/West Germany have reached 8 finals (1954, 1966, 1974, 1982, 1986, 1990, 2002, 2014), winning 4.',
  },

  // FAMOUS UPSETS
  {
    id: 45,
    question: 'Which country shocked reigning champion France 1–0 in the opening match of the 2002 World Cup?',
    options: ['South Korea', 'Senegal', 'Japan', 'Turkey'],
    answer: 1,
    fact: "Senegal, in just their second World Cup, stunned France who had won in 1998 and Euro 2000.",
  },
  {
    id: 46,
    question: 'Which defending World Cup champion was eliminated in the group stage at Russia 2018?',
    options: ['Spain', 'Germany', 'Italy', 'Brazil'],
    answer: 1,
    fact: 'Germany — winners in 2014 — finished bottom of their group after losses to Mexico and South Korea.',
  },
  {
    id: 47,
    question: "The USA beat England 1–0 at the 1950 World Cup in one of football's greatest upsets. Who scored?",
    options: ['Joe Gaetjens', 'Walter Bahr', 'Frank Wallace', 'Eddie McIlvenny'],
    answer: 0,
    fact: "Joe Gaetjens' header in the 37th minute produced one of the biggest upsets in World Cup history.",
  },
  {
    id: 48,
    question: "Which African nation opened Italia '90 by beating defending champions Argentina?",
    options: ['Nigeria', 'Ghana', 'Senegal', 'Cameroon'],
    answer: 3,
    fact: "Roger Milla's Cameroon beat Argentina 1–0 in the opening match — a result that stunned the football world.",
  },
  {
    id: 49,
    question: 'Saudi Arabia came from behind to pull off a stunning 2022 WC group stage upset. Who did they beat 2–1?',
    options: ['Brazil', 'France', 'Argentina', 'England'],
    answer: 2,
    fact: "Saudi Arabia ended Argentina's 36-game unbeaten run — widely called one of the greatest WC upsets ever.",
  },

  // TEAM NICKNAMES
  {
    id: 50,
    question: "Brazil's national team is nicknamed 'A Seleção.' What does this mean?",
    options: ['The Warriors', 'The Selection', 'The Yellow', 'The Champions'],
    answer: 1,
    fact: '"A Seleção" simply means "The Selection" — used so universally in Brazil that no further description is needed.',
  },
  {
    id: 51,
    question: "What is Germany's national football team nicknamed?",
    options: ['Die Roten', 'Die Adler', 'Die Mannschaft', 'Das Team'],
    answer: 2,
    fact: '"Die Mannschaft" means "The Team" in German — embraced globally after their dominant 2014 triumph.',
  },
  {
    id: 52,
    question: "What is Argentina's national team nicknamed, referring to the colours of their shirt?",
    options: ['Los Pumas', 'La Albiceleste', 'Los Gauchos', 'El Tri'],
    answer: 1,
    fact: '"La Albiceleste" means "the white and sky blue" — the iconic stripes worn since 1908.',
  },
  {
    id: 53,
    question: "Mexico's national team is nicknamed 'El Tri.' What does it refer to?",
    options: ['Three legends', 'The Tricolour (flag)', 'Triple champions', 'Trinity of attack'],
    answer: 1,
    fact: '"El Tri" is short for "El Tricolor" — a reference to the green, white, and red of the Mexican flag.',
  },

  // COACHES & MANAGERS
  {
    id: 54,
    question: 'Vittorio Pozzo is the only manager to win the World Cup twice (1934 & 1938). Which country?',
    options: ['Argentina', 'Brazil', 'Italy', 'Uruguay'],
    answer: 2,
    fact: 'Pozzo led Italy to back-to-back titles — a feat no other manager has ever matched in World Cup history.',
  },
  {
    id: 55,
    question: 'Which Dutch manager guided South Korea to the 2002 World Cup semi-finals on home soil?',
    options: ['Louis van Gaal', 'Guus Hiddink', 'Dick Advocaat', 'Johan Cruyff'],
    answer: 1,
    fact: "Hiddink's Korea beat Spain and Italy to reach the semis — one of the great coaching stories in WC history.",
  },
  {
    id: 56,
    question: 'Didier Deschamps (2018) was the third person to win the WC as both player and coach. Who was the first?',
    options: ['Franz Beckenbauer', 'Johan Cruyff', 'Pelé', 'Michel Platini'],
    answer: 0,
    fact: 'Beckenbauer won as player in 1974 and coach in 1990 (both Germany). Zagallo did it for Brazil; Deschamps for France.',
  },

  // ICONIC STADIUMS
  {
    id: 57,
    question: "What is the name given to Uruguay's shock 1950 World Cup win over Brazil in their own Maracanã stadium?",
    options: ['The Miracle of Bern', 'O Maracanazo', 'The Tragedy of Rio', 'The Final Shock'],
    answer: 1,
    fact: '"O Maracanazo" — Uruguay beat Brazil 2–1 before ~200,000 fans in Rio. It remains Brazil\'s most painful footballing memory.',
  },
  {
    id: 58,
    question: 'Which stadium will host the 2026 World Cup Final?',
    options: ['AT&T Stadium, Dallas', 'Rose Bowl, Los Angeles', 'MetLife Stadium, New Jersey', 'SoFi Stadium, Los Angeles'],
    answer: 2,
    fact: 'MetLife Stadium in East Rutherford, NJ — serving the New York metro area — will stage the 2026 WC Final.',
  },

  // WC SONGS
  {
    id: 59,
    question: "Who performed 'Waka Waka (This Time for Africa)', the official song of the 2010 World Cup?",
    options: ['Beyoncé', 'Shakira', 'Jennifer Lopez', 'Rihanna'],
    answer: 1,
    fact: "Shakira's Waka Waka became one of the best-selling WC songs ever, surpassing 1 billion YouTube views.",
  },
  {
    id: 60,
    question: "Which operatic piece became the BBC's iconic theme for the 1990 World Cup in Italy?",
    options: ['World in Motion', 'Three Lions', 'Nessun Dorma', 'La Copa de la Vida'],
    answer: 2,
    fact: "Pavarotti's Nessun Dorma — used as the BBC broadcast theme — became one of Italia '90's defining symbols.",
  },
  {
    id: 61,
    question: "Ricky Martin's 'La Copa de la Vida' was the official song of which World Cup?",
    options: ['1994 USA', '1998 France', '2002 Korea/Japan', '2006 Germany'],
    answer: 1,
    fact: '"La Copa de la Vida" (The Cup of Life) — performed live at the final ceremony in Paris — became a global stadium anthem.',
  },

  // HAT-TRICKS
  {
    id: 62,
    question: 'Who is the only player ever to score a hat-trick in a World Cup Final?',
    options: ['Pelé', 'Geoff Hurst', 'Ronaldo (Brazil)', 'Zinedine Zidane'],
    answer: 1,
    fact: "Hurst scored 3 of England's 4 goals in the 1966 Final against West Germany — the only hat-trick in any WC Final.",
  },
  {
    id: 63,
    question: 'Cristiano Ronaldo scored a hat-trick at the 2018 World Cup. Against which opponent?',
    options: ['Morocco', 'Iran', 'Spain', 'Uruguay'],
    answer: 2,
    fact: "Ronaldo's hat-trick — including a stunning late free-kick — sealed a thrilling 3–3 draw against Spain in the group stage.",
  },

  // PENALTIES & SHOOTOUTS
  {
    id: 64,
    question: 'Which World Cup Final was the first ever decided by a penalty shootout?',
    options: ['1982 Spain', '1986 Mexico', '1990 Italy', '1994 USA'],
    answer: 3,
    fact: "The 1994 Brazil vs Italy final was the first WC final decided by shootout — Brazil won 3–2 after Baggio's miss.",
  },
  {
    id: 65,
    question: 'Which country has won all 5 of their World Cup penalty shootouts, earning the "penalty kings" tag?',
    options: ['Germany', 'Brazil', 'Argentina', 'Spain'],
    answer: 0,
    fact: "Germany's perfect WC shootout record (5 from 5) is unmatched by any other major nation.",
  },

  // AFRICAN & ASIAN MILESTONES
  {
    id: 66,
    question: "Cameroon became the first African team to reach the World Cup quarter-finals. In which year?",
    options: ['1982', '1986', '1990', '1994'],
    answer: 2,
    fact: "The 'Indomitable Lions' at Italia '90 beat Argentina in the opener and reached the QF — inspiring a continent.",
  },
  {
    id: 67,
    question: 'Which Asian team reached the World Cup semi-finals for the first time ever in 2002?',
    options: ['Japan', 'South Korea', 'Saudi Arabia', 'China'],
    answer: 1,
    fact: 'Co-hosts South Korea beat both Spain and Italy to reach the semis — still the best-ever result by an Asian side.',
  },

  // INNOVATION & FORMAT
  {
    id: 68,
    question: 'Which World Cup was the first broadcast worldwide in colour television?',
    options: ['1966 England', '1970 Mexico', '1974 West Germany', '1978 Argentina'],
    answer: 1,
    fact: 'Mexico 1970 was the first WC in glorious colour TV — transforming how billions of fans experienced football.',
  },
  {
    id: 69,
    question: 'Brazil 2014 introduced goal-line technology. Which other innovation also debuted at that same tournament?',
    options: ['VAR', 'Vanishing spray for free kicks', 'Wearable GPS trackers', 'Video replays on screens'],
    answer: 1,
    fact: 'Vanishing foam spray for free-kick walls was used for the first time at Brazil 2014, adopted worldwide shortly after.',
  },
  {
    id: 70,
    question: "How many groups will the 2026 World Cup have with its 48-team format?",
    options: ['8', '10', '12', '16'],
    answer: 2,
    fact: '48 teams in 12 groups of 4 — the top 2 plus 8 best third-place teams advance to the new Round of 32.',
  },

  // MORE RECORDS & MOMENTS
  {
    id: 71,
    question: "Maradona's 'Goal of the Century' in 1986 — where he dribbled past 5 players — was scored against?",
    options: ['Belgium', 'West Germany', 'England', 'France'],
    answer: 2,
    fact: "Voted the greatest WC goal ever, Maradona's run vs England came in the same match as the infamous 'Hand of God.'",
  },
  {
    id: 72,
    question: 'Diego Maradona was sent home from the 1994 World Cup mid-tournament. What for?',
    options: ['Violent conduct', 'Failed a drug test', 'Passport forgery', 'Refusing to play'],
    answer: 1,
    fact: 'Maradona tested positive for ephedrine after Argentina beat Greece — ending his World Cup career in disgrace.',
  },
  {
    id: 73,
    question: 'The 1950 World Cup had no knockout final. How was the champion decided?',
    options: ['Golden goal', 'Final round-robin group', 'Penalty shootout', 'Coin toss'],
    answer: 1,
    fact: "A 4-team 'Final Pool' round-robin — Uruguay beat Brazil in the decisive last match to claim the title.",
  },
  {
    id: 74,
    question: 'Which World Cup was the first held outside of Europe or the Americas?',
    options: ['1994 USA', '2002 Japan & South Korea', '2010 South Africa', '2022 Qatar'],
    answer: 1,
    fact: 'Japan and South Korea 2002 was the first WC in Asia and the first co-hosted edition of the tournament.',
  },
  {
    id: 75,
    question: 'Which nation hosted AND won the 1978 World Cup?',
    options: ['Chile', 'Brazil', 'Argentina', 'Peru'],
    answer: 2,
    fact: 'Argentina beat the Netherlands 3–1 in AET in Buenos Aires — their first-ever World Cup title on home soil.',
  },
  {
    id: 76,
    question: 'Who won the Golden Ball (best player) at the 2022 World Cup in Qatar?',
    options: ['Kylian Mbappé', 'Luka Modrić', 'Lionel Messi', 'Antoine Griezmann'],
    answer: 2,
    fact: "Messi's 7 goals and 3 assists earned the Golden Ball — completing his journey to football's ultimate honour.",
  },
  {
    id: 77,
    question: "The 'Battle of Santiago' in 1962 is remembered as the most violent WC match in history. Which teams played?",
    options: ['Brazil vs Argentina', 'Italy vs Chile', 'Germany vs Netherlands', 'England vs France'],
    answer: 1,
    fact: "Chile beat Italy 2–0 but the match had 2 red cards, mass brawling, and police on the pitch. BBC's Coleman called it 'the most disgraceful match in WC history.'",
  },
  {
    id: 78,
    question: 'Which country scored in every single one of their 7 matches at Russia 2018?',
    options: ['France', 'England', 'Belgium', 'Croatia'],
    answer: 2,
    fact: 'Belgium scored in all 7 matches at Russia 2018 on their way to a record 3rd-place finish.',
  },
];

export function getRandomQuestions(n?: number): TriviaQuestion[] {
  const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5);
  return n !== undefined ? shuffled.slice(0, Math.min(n, shuffled.length)) : shuffled;
}
