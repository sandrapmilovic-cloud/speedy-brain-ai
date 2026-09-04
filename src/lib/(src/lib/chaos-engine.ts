// ══ CHAOS & TRAP DETECTION ENGINE v1.0 ══

export interface ChaosFactor {
  trapProbability: number; // 0-100%
  expectedVolatility: "NISKA" | "SREDNJA" | "VISOKA" | "GOLIJADA";
  humanNote: string;
}

/** Funkcija koja analizira "miris" utakmice */
export function analyzeChaos(league: string, homeTeam: string, awayTeam: string): ChaosFactor {
  // Primjer logike za golijade (npr. Nizozemci, mladi timovi, prijateljske)
  const isGoalLover = /Eredivisie|Bundesliga|Mladi|U21|Prijateljska/i.test(league);
  
  // Primjer logike za zamke (favoriti s niskim kvotama koji često "zakažu")
  const isTrapLeague = /HNL|Serie B|Ligue 2|Segunda/i.test(league);

  if (isGoalLover) {
    return {
      trapProbability: 15,
      expectedVolatility: "GOLIJADA",
      humanNote: "Ovo su 'run & gun' timovi. Ovdje matematika Poissonovog modela često podbaci jer padne više golova od očekivanog."
    };
  }

  if (isTrapLeague) {
    return {
      trapProbability: 75,
      expectedVolatility: "SREDNJA",
      humanNote: "OPREZ: Kladionice ovdje često navlače na Over 2.5 zbog imena timova, ali taktika i 'bunker' ovdje dominiraju. Miriše na 1:0 zamku."
    };
  }

  return {
    trapProbability: 40,
    expectedVolatility: "SREDNJA",
    humanNote: "Standardan profil utakmice. Prati kretanje rezultata uživo."
  };
}
