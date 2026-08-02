export type PmfChoice = "very" | "somewhat" | "not";

export type Answers = {
  /** Furthest step reached, so a returning client lands where they stopped. */
  _step?: number;
  pmf?: PmfChoice;
  pmf_why?: string;
  selling_points?: string[];
  main_benefit?: string;
  improve?: string;
  nps?: number;
  virtues?: Record<string, number>;
  am_advice?: string;
  am_shines?: string;
  anything_else?: string;
};

export const PMF_OPTIONS: { value: PmfChoice; label: string }[] = [
  { value: "very", label: "Very disappointed" },
  { value: "somewhat", label: "Somewhat disappointed" },
  { value: "not", label: "Not disappointed" },
];

/**
 * Aristotle's golden mean: each virtue sits between a deficiency and an excess,
 * so the centre of every scale is the good answer, not the highest score.
 * Worded in plain agency language rather than Nicomachean Greek.
 */
export const VIRTUES: { key: string; name: string; low: string; high: string }[] = [
  { key: "courage", name: "Courage", low: "Plays it too safe", high: "Reckless with your brand" },
  { key: "temperance", name: "Temperance", low: "Never rides a trend", high: "Chases every trend, no discipline" },
  { key: "generosity", name: "Generosity", low: "Hard to reach, does the minimum", high: "Always on, no boundaries" },
  { key: "ambition", name: "Ambition", low: "Thinks too small", high: "Grand ideas, shaky execution" },
  { key: "self_regard", name: "Self-regard", low: "Undersells their own worth", high: "Makes the work about themselves" },
  { key: "composure", name: "Composure", low: "Too unbothered when things go wrong", high: "Gets rattled or defensive" },
  { key: "truthfulness", name: "Truthfulness", low: "Undersells the work", high: "Overpromises" },
  { key: "humour", name: "Humour", low: "All business, very dry", high: "All jokes, hard to take seriously" },
  { key: "friendliness", name: "Friendliness", low: "Cold, purely transactional", high: "Agrees with everything" },
  { key: "accountability", name: "Accountability", low: "Shrugs off mistakes", high: "Over-apologises for small things" },
];

/** 0 = dead centre = balanced. ±2 = extreme. Rendered as 100 → 0. */
export function balanceScore(position: number): number {
  return Math.round((1 - Math.abs(position) / 2) * 100);
}

export const STEP_COUNT = 9;
