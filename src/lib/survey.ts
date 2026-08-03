export type Answers = {
  /** Furthest step reached, so a returning client lands where they stopped. */
  _step?: number;
  /** Disappointment if Kaimakki went away, 1 (not at all) to 7 (very). */
  pmf?: number;
  pmf_why?: string;
  selling_points?: string[];
  caveat?: string;
  main_benefit?: string;
  improve?: string;
  nps?: number;
  virtues?: Record<string, number>;
  am_advice?: string;
  am_shines?: string;
  anything_else?: string;
};

export const ACCOUNT_MANAGERS = ["Gos", "Maria"];

export const PMF_MIN = 1;
export const PMF_MAX = 7;
/** Top two points count as "very disappointed" for the 40% product-market-fit benchmark. */
export const PMF_VERY_FROM = 6;

/**
 * Aristotle's golden mean: each virtue sits between a deficiency and an excess,
 * so the centre of every scale is the good answer, not the highest score.
 * Worded in plain agency language rather than Nicomachean Greek.
 */
export const VIRTUES: { key: string; name: string; low: string; mid: string; high: string }[] = [
  { key: "courage", name: "Courage", low: "Plays it too safe", mid: "Takes real swings, picks the moment", high: "Reckless with your brand" },
  { key: "temperance", name: "Temperance", low: "Never rides a trend", mid: "Rides the trends that fit you", high: "Chases every trend, no discipline" },
  { key: "generosity", name: "Generosity", low: "Hard to reach, does the minimum", mid: "Gives you plenty, sustainably", high: "Always on, no boundaries" },
  { key: "ambition", name: "Ambition", low: "Thinks too small", mid: "Big ideas they can actually land", high: "Grand ideas, shaky execution" },
  { key: "self_regard", name: "Self-regard", low: "Undersells their own worth", mid: "Confident, keeps it about you", high: "Makes the work about themselves" },
  { key: "composure", name: "Composure", low: "Too unbothered when things go wrong", mid: "Steady, and takes it seriously", high: "Gets rattled or defensive" },
  { key: "truthfulness", name: "Truthfulness", low: "Undersells the work", mid: "Tells you straight, promises what lands", high: "Overpromises" },
  { key: "humour", name: "Humour", low: "All business, very dry", mid: "Light to work with, still serious", high: "All jokes, hard to take seriously" },
  { key: "friendliness", name: "Friendliness", low: "Cold, purely transactional", mid: "Warm, and still pushes back", high: "Agrees with everything" },
  { key: "accountability", name: "Accountability", low: "Shrugs off mistakes", mid: "Owns it, fixes it, moves on", high: "Over-apologises for small things" },
];

/** Seven-point virtue scale: 0 is the mean, ±3 the extremes. */
export const VIRTUE_EXTENT = 3;

/** 0 = dead centre = balanced. ±3 = extreme. Rendered as 100 → 0. */
export function balanceScore(position: number): number {
  return Math.round((1 - Math.abs(position) / VIRTUE_EXTENT) * 100);
}
