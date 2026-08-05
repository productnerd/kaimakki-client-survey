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
  values?: Record<string, number>;
  /** Optional free text per value group, keyed by group key. */
  value_notes?: Record<string, string>;
  virtues?: Record<string, number>;
  am_advice?: string;
  am_shines?: string;
  anything_else?: string;
};

export const ACCOUNT_MANAGERS = ["Gos", "Maria"];

/**
 * The fixed copy every client sees before their personal welcome note. Shared
 * with the admin form so the "what comes before this" preview stays honest.
 */
export const welcomeHeading = (name: string) => `Hi ${name}, got five minutes?`;

export const WELCOME_INTRO = [
  "It's August \u2600\ufe0f You're hopefully horizontal somewhere with a cold brew or bubbly \ud83e\udd42 in hand.",
  "We have been at this together for a while now, so we would like to know how we can be better for you.",
];

export const PMF_MIN = 1;
export const PMF_MAX = 7;
/** Top two points count as "very disappointed" for the 40% product-market-fit benchmark. */
export const PMF_VERY_FROM = 6;

/**
 * The company values, each rated through statements a client can actually
 * judge. Grouped so the value reads as an overline over its statements.
 */
export const VALUE_GROUPS: {
  key: string;
  value: string;
  items: { key: string; name: string; statement: string }[];
}[] = [
  {
    key: "freedom",
    value: "Freedom with ownership",
    items: [
      { key: "reliability", name: "Reliability", statement: "They delivered what they promised, when they promised, and came back to me quickly when I needed them." },
      { key: "ownership", name: "Ownership", statement: "I never felt I had to chase them." },
    ],
  },
  {
    key: "ethics",
    value: "Ethics above profit",
    items: [
      { key: "integrity", name: "Moral integrity", statement: "They advised what was right for us, even when it earned them less." },
      { key: "trust", name: "Trust", statement: "They have earned my trust, and my brand's trust, throughout the collaboration." },
    ],
  },
  {
    key: "craft",
    value: "Craft over content",
    items: [
      { key: "creativity", name: "Creativity", statement: "They challenged us with ideas we hadn't considered, rather than only the easy or predictable ones." },
      { key: "meraki", name: "Meraki", statement: "The final result exceeded my expectations." },
    ],
  },
  {
    key: "empathy",
    value: "Empathy without ego",
    items: [
      { key: "respect", name: "Respect & psychological safety", statement: "I felt respected and listened to, and safe to be transparent and honest with them." },
      { key: "humanity", name: "Humanity", statement: "It felt like a human relationship, not a business transaction." },
    ],
  },
];

export const VALUE_ITEMS = VALUE_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ ...i, value: g.value })),
);

export const VALUE_MIN = 1;
export const VALUE_MAX = 10;

/**
 * Aristotle's golden mean: each virtue sits between a deficiency and an excess,
 * so the centre of every scale is the good answer, not the highest score.
 * Worded in plain agency language rather than Nicomachean Greek.
 */
export const VIRTUES: { key: string; name: string; low: string; mid: string; high: string }[] = [
  { key: "courage", name: "Courage", low: "Plays it too safe", mid: "Takes real swings, picks the moment", high: "Reckless with your brand" },
  { key: "temperance", name: "Temperance", low: "Never rides a trend", mid: "Rides the trends that fit you", high: "Chases every trend, no discipline" },
  { key: "generosity", name: "Generosity", low: "Hard to reach, does the minimum", mid: "Gives you plenty, sustainably", high: "Always on, no boundaries" },
  { key: "ambition", name: "Ambition", low: "Thinks too small", mid: "Big ideas that can actually land", high: "Grand ideas, shaky execution" },
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
