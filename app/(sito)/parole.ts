import { effectOf } from "@/app/lib/easter";

/**
 * The words of a player's page, and of the header and footer around it.
 * Italian everywhere; Neapolitan on the page of whoever has the
 * "napoletano" easter egg (Davide Rapacciuolo), so the whole page speaks it.
 * Imports nothing server-only: the nav and the footer read it too.
 */
export const ITALIANO = {
  /** For the page's lang attribute, and to hand a client component the words by name. */
  lang: "it" as Lingua,
  skip: "salta al contenuto",
  nav: {
    label: "Sezioni",
    home: "LPM, Lega Pauper Milano: home",
    classifica: "classifica",
    statistiche: "statistiche",
    regole: "regole",
    mazzo: "il mio mazzo",
    open: "Apri il menu",
    close: "Chiudi il menu",
  },
  footer: {
    eyebrow: "ogni giovedì",
    when: ["Ci vediamo giovedì,", "alle 20.30."],
    where: "Casa dei Giochi, via Sant'Uguzzone 8, Milano. Porta il mazzo, le bustine protettive e la voglia di mescolare.",
    discord: "discord della lega",
    rules: "come funziona",
    privacy: "privacy",
    light: "tema chiaro",
    dark: "tema scuro",
  },
  months: ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"],
  player: {
    back: "← la classifica",
    season: (name: string) => `stagione ${name.toLowerCase()}`,
    rank: "posizione",
    points: "punti",
    record: "vinte · perse · patte",
    winPct: "match vinti",
    played: (n: number, of: number) => `${n} ${n === 1 ? "tappa giocata" : "tappe giocate"} su ${of} finora.`,
  },
  tappe: {
    label: "storico",
    title: "Le sue tappe",
    asideStart: "Le più recenti in alto.",
    asideEnd: "= 9 punti o più. Le tappe scartate (oltre le migliori 8) sono in grigio: non contano per la classifica.",
    none: "Ancora nessuna tappa. Il primo giovedì è sempre il più bello.",
    cols: ["tappa", "piazzamento", "punti"],
    place: (rank: number) => `${rank}° posto`,
    prize: "9 punti o più",
    dropped: "scartata",
  },
  decks: {
    label: "mazzi",
    title: "Cosa ha giocato",
    within: (season?: string) => (season ? `nella ${season}` : "in tutte le stagioni"),
    aside: (first: string, within: string) => `Gli archetipi giocati da ${first} ${within}.`,
    none: (within: string) => `Nessun mazzo conosciuto ${within}.`,
    count: "tappe",
    matrix: "matrice dei risultati",
    matrixLabel: (name: string) => `Matchup di ${name}`,
  },
  seasons: { label: "Stagione", all: "tutte le stagioni" },
  bars: { archetype: "archetipo" },
  matrix: {
    total: "totale",
    describe: (record: string, pct: number) => `${record} nei match, ${pct}% di vittorie`,
    inTotal: (what: string) => `in totale: ${what}`,
    noMatch: "nessun match",
    against: (name: string, what: string) => `contro ${name}: ${what}`,
    never: "mai",
    bad: "sfavorevole",
    good: "favorevole",
    mirror: "Sulla diagonale i mirror.",
  },
  faceOff: {
    label: "confronto",
    title: "Testa a testa",
    aside: (first: string) =>
      `Scegli un avversario e guarda come è andata contro ${first} in questa stagione. Partite vinte, perse e patte.`,
    who: "contro chi?",
    search: "cerca un avversario",
    nobody: "Nessuno con questo nome in classifica.",
    usual: "i soliti noti",
    versus: "contro",
    won: "vinte",
    lost: "perse",
    drawn: "patte",
    ahead: (name: string) => `Finora la spunta ${name}.`,
    behind: (name: string) => `Finora la spunta ${name}. Si rimescola e si riprova.`,
    even: "Pari e patta: serve la bella.",
    matches: (n: number) => (n === 1 ? "Un match in tutto." : `${n} match in tutto.`),
    never: "Mai seduti allo stesso tavolo. Per ora.",
    again: "scegli un altro avversario",
  },
};

export type Lingua = "it" | "nap";

export type Parole = typeof ITALIANO;

export const NAPOLETANO: Parole = {
  lang: "nap",
  skip: "zompa ô cuntenuto",
  nav: {
    label: "Seziune",
    home: "LPM, Lega Pauper Milano: 'a casa",
    classifica: "'a classifica",
    statistiche: "'e nummere",
    regole: "'e regole",
    mazzo: "'o mazzo mio",
    open: "Arape 'o menù",
    close: "Chiure 'o menù",
  },
  footer: {
    eyebrow: "ogne gioveddì",
    when: ["Ce vedimmo gioveddì,", "â ll'otto e mmeza."],
    where: "Casa dei Giochi, via Sant'Uguzzone 8, Milano. Puorte 'o mazzo, 'e bbustine e 'a voglia 'e mmescà.",
    discord: "'o discord d'a lega",
    rules: "comme funziona",
    privacy: "privacy",
    light: "fa' juorno",
    dark: "fa' notte",
  },
  months: ["jen", "fre", "mar", "abb", "mag", "giu", "lug", "aùs", "set", "ott", "nov", "dic"],
  player: {
    back: "← 'a classifica",
    season: (name: string) => `staggione ${name.toLowerCase()}`,
    rank: "addò sta",
    points: "punte",
    record: "vinciute · perze · patte",
    winPct: "match vinciute",
    played: (n: number, of: number) => `${n} ${n === 1 ? "tappa jucata" : "tappe jucate"} 'ncopp'a ${of}, fin'a mo.`,
  },
  tappe: {
    label: "'a storia",
    title: "'E tappe soje",
    asideStart: "'E cchiù frische stanno 'ncoppa.",
    asideEnd: "= 9 punte o cchiù. 'E tappe jettate (chelle fore d'e meglio 8) stanno 'n grigio: nun contano pe' 'a classifica.",
    none: "Ancora manco na tappa. 'O primmo gioveddì è sempe 'o cchiù bello.",
    cols: ["tappa", "comm'è gghiuta", "punte"],
    place: (rank: number) => `${rank}° posto`,
    prize: "9 punte o cchiù",
    dropped: "jettata",
  },
  decks: {
    label: "'e mazze",
    title: "Che ha jucato",
    within: (season?: string) => (season ? `dint'â ${season}` : "'n tutte 'e staggione"),
    aside: (first: string, within: string) => `Ll'archetipe ca ${first} ha jucato ${within}.`,
    none: (within: string) => `Nisciuno mazzo canusciuto ${within}.`,
    count: "tappe",
    matrix: "'a matrice d'e risultate",
    matrixLabel: (name: string) => `'E matchup 'e ${name}`,
  },
  seasons: { label: "Staggione", all: "tutte 'e staggione" },
  bars: { archetype: "archetipo" },
  matrix: {
    total: "'o totale",
    describe: (record: string, pct: number) => `${record} dint'e match, ${pct}% 'e vittorie`,
    inTotal: (what: string) => `'n tutto: ${what}`,
    noMatch: "manco nu match",
    against: (name: string, what: string) => `contr'a ${name}: ${what}`,
    never: "maje",
    bad: "va malamente",
    good: "va bbuono",
    mirror: "'Ncopp'a diagonale 'e mirror.",
  },
  faceOff: {
    label: "'o cunfronto",
    title: "Capa a capa",
    aside: (first: string) =>
      `Sciglie n'avversario e vide comm'è gghiuta contr'a ${first} 'n chesta staggione. Partite vinciute, perze e patte.`,
    who: "contr'a chi?",
    search: "cerca n'avversario",
    nobody: "Nisciuno cu stu nomme 'n classifica.",
    usual: "'e solite canusciute",
    versus: "contr'a",
    won: "vinciute",
    lost: "perze",
    drawn: "patte",
    ahead: (name: string) => `Pe' mo vence ${name}.`,
    behind: (name: string) => `Pe' mo vence ${name}. Se mmesca 'o mazzo e se torna a pruvà.`,
    even: "Pare e patte: ce vo' 'a bella.",
    matches: (n: number) => (n === 1 ? "Nu match sulo." : `${n} match 'n tutto.`),
    never: "Maje assettate â stessa tavula. Pe' mo.",
    again: "sciglie n'atu avversario",
  },
};

/** The words in a language, by its name: what a client component is handed, as functions can't cross. */
export const paroleIn = (lang: Lingua): Parole => (lang === "nap" ? NAPOLETANO : ITALIANO);

/** The words for a player's page. */
export const paroleFor = (playerId: number | string): Parole =>
  effectOf(playerId) === "napoletano" ? NAPOLETANO : ITALIANO;

/** The words for the page at this path: a player's own, or Italian. */
export function paroleAt(path: string): Parole {
  const player = /^\/giocatori\/(\d+)\/?$/.exec(path)?.[1];
  return player ? paroleFor(player) : ITALIANO;
}
