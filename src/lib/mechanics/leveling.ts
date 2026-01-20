import { MAX_LEVEL } from "@/lib/constants";

export interface ClassLevel {
    classId: string;
    level: number;
}

export function calculateTotalLevel(classes: ClassLevel[]): number {
    return classes.reduce((sum, c) => sum + c.level, 0);
}

export function calculateProficiencyBonus(totalLevel: number): number {
    if (totalLevel <= 0) return 2;
    return Math.ceil(1 + totalLevel / 4);
}

export const XP_TABLE: Record<number, number> = {
    1: 0,
    2: 300,
    3: 900,
    4: 2700,
    5: 6500,
    6: 14000,
    7: 23000,
    8: 34000,
    9: 48000,
    10: 64000,
    11: 85000,
    12: 100000,
    13: 120000,
    14: 140000,
    15: 165000,
    16: 195000,
    17: 225000,
    18: 265000,
    19: 305000,
    20: 355000
};

export function getXpForLevel(level: number): number {
    return XP_TABLE[level] || 0;
}

/**
 * Check if character can level up ONCE (to the next level only).
 * Returns true only if XP meets the requirement for exactly the next level.
 */
export function canLevelUp(currentClasses: ClassLevel[], currentXp: number): boolean {
    const total = calculateTotalLevel(currentClasses);
    if (total >= MAX_LEVEL) return false;
    const requiredXp = getXpForLevel(total + 1);
    return currentXp >= requiredXp;
}

/**
 * Get how many levels the character COULD level up (for display purposes).
 * This shows potential levels but leveling happens one at a time.
 */
export function getPotentialLevels(currentClasses: ClassLevel[], currentXp: number): number {
    const currentTotal = calculateTotalLevel(currentClasses);
    let potential = 0;
    for (let lvl = currentTotal + 1; lvl <= MAX_LEVEL; lvl++) {
        if (currentXp >= getXpForLevel(lvl)) {
            potential++;
        } else {
            break;
        }
    }
    return potential;
}
