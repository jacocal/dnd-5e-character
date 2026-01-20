/**
 * Multiclass Spell Slot Calculation Engine
 * 
 * Implements the 5e multiclass spell slot calculation algorithm per PRD:
 * - Full casters (Wizard, Sorcerer, Bard, Cleric, Druid): 1.0x level
 * - Half casters (Paladin, Ranger): 0.5x level, round DOWN
 * - Artificer: 0.5x level, round UP (special rule)
 * - Third casters (Arcane Trickster, Eldritch Knight): 0.33x level, round DOWN
 * - Pact Magic (Warlock): Separate slot pool, recovers on short rest
 * - Non-casters: 0x contribution
 */

export type SpellcastingType = "full" | "half" | "artificer" | "third" | "pact" | "none";

export interface CharacterClassEntry {
    classId: string;
    level: number;
    subclassId?: string | null;
    // Resolved spellcasting type (subclass override or class default)
    spellcastingType: SpellcastingType;
}

export interface SpellSlotConfig {
    spellcasting: {
        casterLevel: number;
        slots: Record<number, number>; // { 1: 4, 2: 3, ... }
    };
    pactMagic: {
        warlockLevel: number;
        slotLevel: number;
        count: number;
    } | null;
}

// Multiclass Spell Slot Table (PHB p.165)
// Key = Effective Caster Level, Value = slots per spell level
const MULTICLASS_SLOT_TABLE: Record<number, Record<number, number>> = {
    1: { 1: 2 },
    2: { 1: 3 },
    3: { 1: 4, 2: 2 },
    4: { 1: 4, 2: 3 },
    5: { 1: 4, 2: 3, 3: 2 },
    6: { 1: 4, 2: 3, 3: 3 },
    7: { 1: 4, 2: 3, 3: 3, 4: 1 },
    8: { 1: 4, 2: 3, 3: 3, 4: 2 },
    9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
    10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
    11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
    12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
    13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
    14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
    15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
    16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
    17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
    18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
    19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
    20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
};

// Warlock Pact Magic Table (PHB p.106)
// Key = Warlock Level, Value = { count: slots, level: slot level }
const PACT_MAGIC_TABLE: Record<number, { count: number; level: number }> = {
    1: { count: 1, level: 1 },
    2: { count: 2, level: 1 },
    3: { count: 2, level: 2 },
    4: { count: 2, level: 2 },
    5: { count: 2, level: 3 },
    6: { count: 2, level: 3 },
    7: { count: 2, level: 4 },
    8: { count: 2, level: 4 },
    9: { count: 2, level: 5 },
    10: { count: 2, level: 5 },
    11: { count: 3, level: 5 },
    12: { count: 3, level: 5 },
    13: { count: 3, level: 5 },
    14: { count: 3, level: 5 },
    15: { count: 3, level: 5 },
    16: { count: 3, level: 5 },
    17: { count: 4, level: 5 },
    18: { count: 4, level: 5 },
    19: { count: 4, level: 5 },
    20: { count: 4, level: 5 },
};

/**
 * Calculate the Effective Caster Level (ECL) for multiclass spell slot determination.
 * 
 * @param classes - Array of character class entries with resolved spellcasting types
 * @returns The total effective caster level
 */
export function calculateEffectiveCasterLevel(classes: CharacterClassEntry[]): number {
    let ecl = 0;

    for (const cls of classes) {
        switch (cls.spellcastingType) {
            case "full":
                ecl += cls.level;
                break;
            case "half":
                ecl += Math.floor(cls.level / 2);
                break;
            case "artificer":
                ecl += Math.ceil(cls.level / 2);
                break;
            case "third":
                ecl += Math.floor(cls.level / 3);
                break;
            case "pact":
            case "none":
                // These don't contribute to standard spell slots
                break;
        }
    }

    return ecl;
}

/**
 * Get spell slots from the multiclass table for a given effective caster level.
 * 
 * @param ecl - Effective Caster Level
 * @returns Record of spell level to slot count
 */
export function getSpellSlotsForLevel(ecl: number): Record<number, number> {
    if (ecl <= 0) return {};
    if (ecl > 20) ecl = 20;
    return { ...MULTICLASS_SLOT_TABLE[ecl] };
}

/**
 * Get Warlock Pact Magic slots for a given warlock level.
 * 
 * @param warlockLevel - Total warlock class levels
 * @returns Pact magic configuration or null if no warlock levels
 */
export function getPactMagicSlots(warlockLevel: number): SpellSlotConfig["pactMagic"] {
    if (warlockLevel <= 0) return null;
    if (warlockLevel > 20) warlockLevel = 20;

    const pactInfo = PACT_MAGIC_TABLE[warlockLevel];
    return {
        warlockLevel,
        slotLevel: pactInfo.level,
        count: pactInfo.count,
    };
}

/**
 * Main function: Calculate all spell slots for a multiclass character.
 * 
 * This handles:
 * - Standard spellcasting slots based on ECL
 * - Warlock Pact Magic slots (separate pool)
 * - Subclass spellcasting type overrides (e.g., Arcane Trickster)
 * 
 * @param classes - Array of character class entries with resolved spellcasting types
 * @returns Complete spell slot configuration
 */
export function calculateSpellSlots(classes: CharacterClassEntry[]): SpellSlotConfig {
    // Calculate Effective Caster Level for standard slots
    const ecl = calculateEffectiveCasterLevel(classes);

    // Get standard spell slots
    const slots = getSpellSlotsForLevel(ecl);

    // Calculate Warlock levels for Pact Magic
    const warlockLevel = classes
        .filter(c => c.spellcastingType === "pact")
        .reduce((sum, c) => sum + c.level, 0);

    const pactMagic = getPactMagicSlots(warlockLevel);

    return {
        spellcasting: {
            casterLevel: ecl,
            slots,
        },
        pactMagic,
    };
}

/**
 * Helper: Resolve the effective spellcasting type for a class entry.
 * Subclass type overrides class type when present.
 * 
 * @param classType - Base class spellcasting type
 * @param subclassType - Optional subclass spellcasting type override
 * @returns Resolved spellcasting type
 */
export function resolveSpellcastingType(
    classType: SpellcastingType | null | undefined,
    subclassType: SpellcastingType | null | undefined
): SpellcastingType {
    // Subclass overrides class (e.g., Fighter with Eldritch Knight)
    if (subclassType) {
        return subclassType;
    }
    return classType || "none";
}
