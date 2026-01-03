export const MAX_LEVEL = 20;

// Currency conversion rates (value in GP)
export const CURRENCY_VALUES = {
    cp: 0.01,   // 1 CP = 0.01 GP (100 CP = 1 GP)
    sp: 0.1,    // 1 SP = 0.1 GP (10 SP = 1 GP)
    ep: 0.5,    // 1 EP = 0.5 GP (2 EP = 1 GP)
    gp: 1,      // 1 GP = 1 GP
    pp: 10,     // 1 PP = 10 GP
} as const;

export type CurrencyType = keyof typeof CURRENCY_VALUES;

// Character alignments (9 standard D&D alignments)
export const ALIGNMENTS = [
    "Lawful Good",
    "Neutral Good",
    "Chaotic Good",
    "Lawful Neutral",
    "Neutral",
    "Chaotic Neutral",
    "Lawful Evil",
    "Neutral Evil",
    "Chaotic Evil",
] as const;

export type Alignment = typeof ALIGNMENTS[number];
