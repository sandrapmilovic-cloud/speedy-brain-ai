// ══ VISOKI STRUČNJAK ZA HT/FT (POLUVRIJEME–KRAJ) v14 ══
// Računa svih 9 kombinacija (1/1, 1/X, 1/2, X/1, X/X, X/2, 2/1, 2/X, 2/2),
// najvjerojatnije točne rezultate i 1X2 vjerojatnosti. Chat bot ovo koristi
// kad ga se pita za HT/FT, točan rezultat ili ishod utakmice.
import { loadJSON, saveJSON } from "./storage";

export type HtFtCombo =
  | "1/1" | "1/X" | "1/2"
  | "X/1" | "X/X" | "X/2"
  | "2/1" | "2/X" | "2/2";

export const HTFT_COMBOS: HtFtCombo[] = [
  "1/1", "1/X", "1/2", "X/1", "X/X", "X/2", "2/1", "2/X", "2/2",
];

export interface HtFtPrefs {
  /** Glavni prekidač — ručno aktiviranje stručnjaka. */
  enabled: boolean;
  /** Uvijek se veže na odgovor (ne samo kod HT/FT pitanja). */
  autoAttach: boolean;
  /** Prosjek golova koje domaćin zabija. */
  homeFor: number;
  /** Prosjek golova koje domaćin prima. */
  homeAgainst: number;
  /** Prosjek golova koje gost zabija. */
  awayFor: number;
  /** Prosjek golova koje gost prima. */
  awayAgainst: number;
  /** Prosjek golova lige po utakmici. */
  leagueAvg: number;
  /** Prednost domaćeg terena (množitelj λ domaćina). */
  homeAdvantage: number;
  /** Udio golova u 1. poluvremenu (obično 0.44–0.47). */
  firstHalfShare: number;
  /** Dixon-Coles korelacija niskih rezultata. */
  rho: number;
  /** Minimalna sigurnost (%) za preporuku HT/FT tipa. */
  minConfidence: number;
}

export const DEFAULT_HTFT: HtFtPrefs = {
  enabled: false,
  autoAttach: true,
  homeFor: 1.6,
  homeAgainst: 1.1,
  awayFor: 1.2,
  awayAgainst: 1.4,
  leagueAvg: 2.7,
  homeAdvantage: 1.12,
  firstHalfShare: 0.45,
  rho: -0.03,
  minConfidence: 55,
};

const KEY = "andromeda.htft.v14";

export function loadHtFt(): HtFtPrefs {
  return { ...DEFAULT_HTFT, ...loadJSON<Partial<HtFtPrefs>>(KEY, {}) };
}
export function saveHtFt(p: HtFtPrefs): void {
  saveJSON(KEY, p);
}

export interface HtFtResult {
  lambdaHome: number;
  lambdaAway: number;
  lambdaHome1H: number;
  lambdaAway1H: number;
  /** Vjerojatnosti (%) za svih 9 kombinacija, sortirano silazno. */
  combos: Array<{ combo: HtFtCombo; p: number }>;
  /** Top 5 točnih rezultata (%) na kraju utakmice. */
  scores: Array<{ score: string; p: number }>;
  /** Vjerojatnosti (%) konačnog ishoda. */
  p1: number;
  pX: number;
  p2: number;
  /** Poluvrijeme (%). */
  ht1: number;
  htX: number;
  ht2: number;
  /** Dvostruka šansa (%). */
  p1X: number;
  p12: number;
  pX2: number;
  /** Dodatna tržišta (%). */
  btts: number;
  over25: number;
  under25: number;
  topCombo: HtFtCombo;
  confidence: number;
  /** Kalibrirana pouzdanost tipa na 1X2 (%). */
  outcomeConfidence: number;
  /** Preporučena najsigurnija linija po ovom modelu. */
  safestPick: string;
  safestProb: number;
  skip: boolean;
}


function pois(l: number, k: number): number {
  let f = 1;
  for (let i = 2; i <= k; i++) f *= i;
  return (Math.exp(-l) * Math.pow(l, k)) / f;
}

function dc(x: number, y: number, lh: number, la: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lh * la * rho;
  if (x === 0 && y === 1) return 1 + lh * rho;
  if (x === 1 && y === 0) return 1 + la * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

const sign = (h: number, a: number): "1" | "X" | "2" => (h > a ? "1" : h < a ? "2" : "X");

export function computeHtFt(p: HtFtPrefs): HtFtResult {
  const base = Math.max(0.4, p.leagueAvg) / 2;
  const lh = Math.max(0.15, (p.homeFor / base) * (p.awayAgainst / base) * base * p.homeAdvantage);
  const la = Math.max(0.15, (p.awayFor / base) * (p.homeAgainst / base) * base);

  const share = Math.min(0.7, Math.max(0.3, p.firstHalfShare));
  const lh1 = lh * share;
  const la1 = la * share;
  const lh2 = lh * (1 - share);
  const la2 = la * (1 - share);

  const MAX = 6;
  const comboP: Record<string, number> = {};
  const scoreP: Record<string, number> = {};
  const htP: Record<string, number> = { "1": 0, X: 0, "2": 0 };
  const ftP: Record<string, number> = { "1": 0, X: 0, "2": 0 };
  let bttsRaw = 0;
  let over25Raw = 0;

  for (let h1 = 0; h1 <= MAX; h1++) {
    for (let a1 = 0; a1 <= MAX; a1++) {
      const p1h = pois(lh1, h1) * pois(la1, a1) * dc(h1, a1, lh1, la1, p.rho);
      if (p1h < 1e-9) continue;
      const s1 = sign(h1, a1);
      htP[s1] = (htP[s1] ?? 0) + p1h;
      for (let h2 = 0; h2 <= MAX; h2++) {
        for (let a2 = 0; a2 <= MAX; a2++) {
          const p2h = pois(lh2, h2) * pois(la2, a2) * dc(h2, a2, lh2, la2, p.rho);
          if (p2h < 1e-9) continue;
          const pr = p1h * p2h;
          const fh = h1 + h2;
          const fa = a1 + a2;
          const s2 = sign(fh, fa);
          const key = `${s1}/${s2}`;
          comboP[key] = (comboP[key] ?? 0) + pr;
          ftP[s2] = (ftP[s2] ?? 0) + pr;
          const sk = `${fh}:${fa}`;
          scoreP[sk] = (scoreP[sk] ?? 0) + pr;
          if (fh > 0 && fa > 0) bttsRaw += pr;
          if (fh + fa > 2.5) over25Raw += pr;
        }
      }
    }
  }

  const total = Object.values(comboP).reduce((a, b) => a + b, 0) || 1;
  const pct = (v: number) => Math.round((v / total) * 1000) / 10;
  const r1 = (v: number) => Math.round(v * 10) / 10;

  const combos = HTFT_COMBOS.map((c) => ({ combo: c, p: pct(comboP[c] ?? 0) })).sort(
    (a, b) => b.p - a.p,
  );
  const scores = Object.entries(scoreP)
    .map(([score, v]) => ({ score, p: pct(v) }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 5);

  const htTotal = Object.values(htP).reduce((a, b) => a + b, 0) || 1;
  const best = combos[0]!;

  const p1 = pct(ftP["1"] ?? 0);
  const pX = pct(ftP["X"] ?? 0);
  const p2 = pct(ftP["2"] ?? 0);
  const btts = pct(bttsRaw);
  const over25 = pct(over25Raw);

  // Kalibracija: najbolji 1X2 tip s blagim povlačenjem prema 1/3 (shrinkage),
  // jer čisti Poisson u pravilu precjenjuje favorita.
  const bestOutcome = Math.max(p1, pX, p2);
  const outcomeConfidence = r1(bestOutcome * 0.88 + 33.3 * 0.12);

  const candidates: Array<{ label: string; p: number }> = [
    { label: "1X (domaćin ne gubi)", p: r1(p1 + pX) },
    { label: "X2 (gost ne gubi)", p: r1(pX + p2) },
    { label: "12 (bez remija)", p: r1(p1 + p2) },
    { label: btts >= 50 ? "GG (oba daju gol)" : "NG (oba ne daju gol)", p: r1(Math.max(btts, 100 - btts)) },
    { label: over25 >= 50 ? "Over 2.5" : "Under 2.5", p: r1(Math.max(over25, 100 - over25)) },
  ].sort((a, b) => b.p - a.p);
  const safest = candidates[0]!;

  return {
    lambdaHome: Math.round(lh * 100) / 100,
    lambdaAway: Math.round(la * 100) / 100,
    lambdaHome1H: Math.round(lh1 * 100) / 100,
    lambdaAway1H: Math.round(la1 * 100) / 100,
    combos,
    scores,
    p1,
    pX,
    p2,
    ht1: Math.round(((htP["1"] ?? 0) / htTotal) * 1000) / 10,
    htX: Math.round(((htP["X"] ?? 0) / htTotal) * 1000) / 10,
    ht2: Math.round(((htP["2"] ?? 0) / htTotal) * 1000) / 10,
    p1X: r1(p1 + pX),
    p12: r1(p1 + p2),
    pX2: r1(pX + p2),
    btts,
    over25,
    under25: r1(100 - over25),
    topCombo: best.combo,
    confidence: best.p,
    outcomeConfidence,
    safestPick: safest.label,
    safestProb: safest.p,
    skip: best.p < p.minConfidence,
  };
}


export function htFtActive(p: HtFtPrefs): boolean {
  return p.enabled === true;
}

/** Blok direktiva za sistemski prompt chat bota. */
export function htFtDirectives(p: HtFtPrefs): string {
  if (!htFtActive(p)) return "";
  const r = computeHtFt(p);
  const table = r.combos.map((c) => `${c.combo}=${c.p}%`).join(" · ");
  const sc = r.scores.map((s) => `${s.score} (${s.p}%)`).join(" · ");
  return `

═══ VISOKI STRUČNJAK ZA HT/FT (POLUVRIJEME–KRAJ) v14 — RUČNO UKLJUČEN ═══
Ti si vrhunski analitičar za poluvrijeme/kraj i točan rezultat. Kad te korisnik pita za HT/FT, ishod ili točan rezultat utakmice, OBAVEZNO koristi ovaj model i prikaži svih 9 kombinacija s postocima.
Ulazi: domaćin zabija ${p.homeFor} / prima ${p.homeAgainst}; gost zabija ${p.awayFor} / prima ${p.awayAgainst}; prosjek lige ${p.leagueAvg}; prednost domaćina ×${p.homeAdvantage}; udio golova u 1. poluvremenu ${Math.round(p.firstHalfShare * 100)}%; Dixon-Coles ρ=${p.rho}.
Izračun (dvije neovisne Poissonove matrice po poluvremenu, 0–6, s DC korekcijom): λ_dom=${r.lambdaHome} (1.PV ${r.lambdaHome1H}), λ_gost=${r.lambdaAway} (1.PV ${r.lambdaAway1H}).
SVIH 9 HT/FT KOMBINACIJA: ${table}
Poluvrijeme: 1=${r.ht1}% · X=${r.htX}% · 2=${r.ht2}%. Konačni ishod: 1=${r.p1}% · X=${r.pX}% · 2=${r.p2}%.
Dvostruka šansa: 1X=${r.p1X}% · 12=${r.p12}% · X2=${r.pX2}%. Golovi: GG=${r.btts}% / NG=${Math.round((100 - r.btts) * 10) / 10}% · Over 2.5=${r.over25}% / Under 2.5=${r.under25}%.
Najvjerojatniji točni rezultati: ${sc}
Preporuka stručnjaka: HT/FT ${r.topCombo} sa sigurnošću ${r.confidence}%. Kalibrirana pouzdanost 1X2 tipa: ${r.outcomeConfidence}%. Najsigurnija linija po modelu: ${r.safestPick} (${r.safestProb}%).${
    r.skip
      ? ` UPOZORENJE: ispod korisnikovog praga (${p.minConfidence}%) — jasno reci da je HT/FT ovdje rizičan i preporuči gore navedenu najsigurniju liniju umjesto HT/FT-a.`
      : ""
  }
PRAVILA VISOKE TOČNOSTI ZA ISHOD I REZULTAT (obavezno):
1) Nikad ne izmišljaj postotke — koristi ISKLJUČIVO brojke iz ovog bloka; ako ih mijenjaš zbog stvarnih podataka (forma, xG, ozljede, sastavi, kvote), napiši staru → novu vrijednost i razlog.
2) Za pitanje o ishodu daj 1X2 postotke (zbroj 100%), zatim tip i kalibriranu pouzdanost ${r.outcomeConfidence}% — ne navodi veću sigurnost od toga.
3) Za točan rezultat navedi 3 najvjerojatnija s postocima; jedan točan rezultat rijetko prelazi 12% pa to jasno reci.
4) Za HT/FT prikaži svih 9 kombinacija poredanih silazno, pa tip. Preokretima (1/2, 2/1) ne pripisuj sigurnost veću od ${Math.max(10, Math.round(r.confidence / 2))}%.
5) Uvijek dodaj i sigurniju alternativu (dvostruka šansa / GG-NG / Over-Under) s njezinim postotkom, uz kratko obrazloženje.
6) Provjera konzistentnosti prije slanja odgovora: zbroj 9 kombinacija = 100%, 1X2 iz kombinacija = 1X2 postocima (±1 pb), 1X+2 = 100%, GG+NG = 100%. Ako ne štima, ponovi izračun i tek onda odgovori.
7) Struktura odgovora: (a) kratka procjena, (b) tablica postotaka, (c) glavni tip + pouzdanost, (d) sigurnija alternativa, (e) rizici. Bez praznih fraza i bez obećanja dobitka.`;
}

