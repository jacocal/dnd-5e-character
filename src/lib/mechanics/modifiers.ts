// Modifier Types - Extended for enhanced mechanics
export type ModifierType =
    | 'bonus'
    | 'set'
    | 'override'
    | 'proficiency'
    | 'language'
    | 'expertise'
    | 'skill_proficiency'
    // New modifier types
    | 'ability_increase'
    | 'ability_point_grant'  // Grants points to ability point pool (e.g., ASI feat)
    | 'saving_throw_proficiency'
    | 'armor_proficiency'
    | 'weapon_proficiency';

export interface Modifier {
    type: ModifierType;
    target: string;
    value: number | boolean | string;
    condition?: string;
    max?: number; // Maximum cap for ability_increase modifiers (e.g., 20)
}

export interface ModifierSource {
    id: string;
    name: string;
    modifiers: Modifier[];
}

// Constants
export const MAX_ATTUNED_ITEMS = 3;

/**
 * Calculates the final value of a stat by applying all modifiers.
 * Order of operations:
 * 1. Base value
 * 2. 'set' modifiers (highest wins)
 * 3. 'bonus' and 'ability_increase' modifiers (additive)
 * 4. Apply max caps from modifiers
 */
export function calculateStatWithModifiers(baseValue: number, statName: string, sources: ModifierSource[]): number {
    let finalValue = baseValue;
    const bonuses: number[] = [];
    let overrideValue: number | null = null;
    let minMaxCap: number | null = null; // Track the lowest max cap from all modifiers

    for (const source of sources) {
        for (const mod of source.modifiers) {
            if (mod.target.toLowerCase() !== statName.toLowerCase()) continue;

            // TODO: Handle conditions (e.g., "while wearing heavy armor")
            if (mod.condition) continue;

            if (mod.type === 'set' || mod.type === 'override') {
                const val = typeof mod.value === 'number' ? mod.value : parseInt(String(mod.value), 10);
                if (!isNaN(val)) {
                    // "Set" means "At least this much" - take highest override
                    if (overrideValue === null || val > overrideValue) {
                        overrideValue = val;
                    }
                }
            } else if (mod.type === 'bonus' || mod.type === 'ability_increase') {
                const val = typeof mod.value === 'number' ? mod.value : parseInt(String(mod.value), 10);
                if (!isNaN(val)) {
                    bonuses.push(val);
                }

                // Track max cap from ability_increase modifiers
                if (mod.type === 'ability_increase' && mod.max !== undefined) {
                    if (minMaxCap === null || mod.max < minMaxCap) {
                        minMaxCap = mod.max;
                    }
                }
            }
        }
    }

    // Apply override if present
    if (overrideValue !== null) {
        finalValue = overrideValue;
    }

    // Apply bonuses
    finalValue = finalValue + bonuses.reduce((a, b) => a + b, 0);

    // Apply max cap if present
    if (minMaxCap !== null) {
        finalValue = Math.min(finalValue, minMaxCap);
    }

    return finalValue;
}

/**
 * Checks if a skill/stat has proficiency granted via modifiers.
 */
export function getProficiencyModifiers(statName: string, sources: ModifierSource[]): boolean {
    for (const source of sources) {
        for (const mod of source.modifiers) {
            if (mod.type === 'skill_proficiency' && mod.target.toLowerCase() === statName.toLowerCase() && mod.value === true) {
                return true;
            }
            if (mod.type === 'proficiency' && mod.target.toLowerCase() === statName.toLowerCase()) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Checks if character has saving throw proficiency via modifiers.
 */
export function getSavingThrowProficiency(ability: string, sources: ModifierSource[]): boolean {
    for (const source of sources) {
        for (const mod of source.modifiers) {
            if (mod.type === 'saving_throw_proficiency' &&
                mod.target.toLowerCase() === ability.toLowerCase() &&
                mod.value === true) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Checks if character has armor proficiency via modifiers.
 * @param armorType - 'light', 'medium', 'heavy', or 'shields'
 */
export function getArmorProficiency(armorType: string, sources: ModifierSource[]): boolean {
    for (const source of sources) {
        for (const mod of source.modifiers) {
            if (mod.type === 'armor_proficiency' &&
                mod.target.toLowerCase() === armorType.toLowerCase() &&
                mod.value === true) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Checks if character has weapon proficiency via modifiers.
 * @param weaponIdOrCategory - A weapon ID (e.g., 'longsword') or category ('simple', 'martial')
 */
export function getWeaponProficiency(weaponIdOrCategory: string, sources: ModifierSource[]): boolean {
    const target = weaponIdOrCategory.toLowerCase();

    for (const source of sources) {
        for (const mod of source.modifiers) {
            if (mod.type === 'weapon_proficiency' && mod.value === true) {
                const modTarget = mod.target.toLowerCase();
                // Direct match (specific weapon or category)
                if (modTarget === target) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Gets all languages granted via modifiers.
 */
export function getLanguageModifiers(sources: ModifierSource[]): string[] {
    const languages: string[] = [];

    for (const source of sources) {
        for (const mod of source.modifiers) {
            if (mod.type === 'language' && mod.value === true) {
                languages.push(mod.target);
            }
        }
    }

    return languages;
}

/**
 * Checks if a skill has expertise via modifiers.
 */
export function getExpertiseModifiers(skillName: string, sources: ModifierSource[]): boolean {
    for (const source of sources) {
        for (const mod of source.modifiers) {
            if (mod.type === 'expertise' &&
                mod.target.toLowerCase() === skillName.toLowerCase() &&
                mod.value === true) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Gets the total HP bonus per level from all sources.
 * Used for feats like Tough (+2/level) and traits like Dwarven Toughness (+1/level).
 * Target should be 'hp_per_level'.
 */
export function getHpPerLevelBonus(sources: ModifierSource[]): number {
    let totalBonus = 0;

    for (const source of sources) {
        for (const mod of source.modifiers) {
            if (mod.type === 'bonus' && mod.target.toLowerCase() === 'hp_per_level') {
                const val = typeof mod.value === 'number' ? mod.value : parseInt(String(mod.value), 10);
                if (!isNaN(val)) {
                    totalBonus += val;
                }
            }
        }
    }

    return totalBonus;
}

/**
 * Gets the total flat HP max bonus from all sources.
 * Used for features like Boon of Fortitude (+40 HP).
 * Target should be 'hp_max'.
 */
export function getHpMaxBonus(sources: ModifierSource[]): number {
    let totalBonus = 0;

    for (const source of sources) {
        for (const mod of source.modifiers) {
            if (mod.type === 'bonus' && mod.target.toLowerCase() === 'hp_max') {
                const val = typeof mod.value === 'number' ? mod.value : parseInt(String(mod.value), 10);
                if (!isNaN(val)) {
                    totalBonus += val;
                }
            }
        }
    }

    return totalBonus;
}

/**
 * Calculates the effective maximum HP including all modifiers.
 * Formula: baseHpMax + (level × hpPerLevelBonus) + flatHpMaxBonus
 */
export function calculateEffectiveMaxHp(
    baseHpMax: number,
    level: number,
    sources: ModifierSource[]
): number {
    const hpPerLevel = getHpPerLevelBonus(sources);
    const flatBonus = getHpMaxBonus(sources);

    return baseHpMax + (level * hpPerLevel) + flatBonus;
}
