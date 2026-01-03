
export const XP_TABLE: Record<number, number> = {
    1: 300,
    2: 900,
    3: 2700,
    4: 6500,
    5: 14000,
    6: 23000,
    7: 34000,
    8: 48000,
    9: 64000,
    10: 85000,
    11: 100000,
    12: 120000,
    13: 140000,
    14: 165000,
    15: 195000,
    16: 225000,
    17: 265000,
    18: 305000,
    19: 355000,
    20: 355000 // Cap
};

export function calculateProficiencyBonus(level: number): number {
    return Math.ceil(level / 4) + 1;
}

export function getXpProgress(xp: number, level: number) {
    // XP needed to REACH next level. 
    // Example: Lvl 1 ends at 299. Lvl 2 starts at 300.
    // Actually standard table is:
    // Lvl 1: 0 XP
    // Lvl 2: 300 XP
    // Lvl 3: 900 XP

    // So if I am Lvl 1 (0 XP), I need 300 to reach Lvl 2.
    // If I am Lvl 2 (300 XP), I need 900 to reach Lvl 3.

    const nextLevel = level + 1;
    const targetXp = XP_TABLE[level] || XP_TABLE[20]; // Map key 1 = 300 (which is target for Lvl 1)

    // Wait, typical table:
    // 1 -> 300
    // 2 -> 900
    // So my map key should be CURRENT LEVEL -> TARGET XP

    return {
        current: xp,
        target: targetXp
    };
}

export function getLevelFromXp(xp: number): number {
    // 5e XP Table Standard
    // 1: 0
    // 2: 300
    // 3: 900
    // ...
    // My table keys are "Level I am currently at" -> "XP for NEXT level"
    // 1: 300 (Need 300 to be Lvl 2)
    // 2: 900 (Need 900 to be Lvl 3)

    // So to find "Correct Level" from XP:
    // If XP < 300 -> Level 1
    // If XP >= 300 && XP < 900 -> Level 2

    // Let's iterate.
    let level = 1;
    // We check if we have enough XP to reach the next level.
    // XP_TABLE[1] is 300.
    while (XP_TABLE[level] && xp >= XP_TABLE[level]) {
        if (level >= 20) break; // Hard cap at level 20
        level++;
    }
    return level;
}

// Spell slot tables have been moved to the database (class_progression table).
// Use app/actions/getClassProgression to fetch them.

// Deprecated local tables removed.

