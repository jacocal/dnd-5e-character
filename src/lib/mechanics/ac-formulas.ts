/**
 * AC Formulas Module
 *
 * Defines alternative AC calculation formulas for class features like
 * Unarmored Defense. Handles formula selection and calculation.
 */

import { CharacterStateType } from './character-states';

/**
 * Ability scores object for formula calculations
 */
interface AbilityScores {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
}

/**
 * Helper to calculate ability modifier
 */
function getModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

/**
 * Class feature that provides an alternative AC formula
 */
export interface AcFormulaDefinition {
    featureName: string;
    classId: string;
    formula: (abilities: AbilityScores, dexMod: number) => number;
    condition: (states: CharacterStateType[]) => boolean;
    description: string;
}

/**
 * Registry of all AC formula overrides
 *
 * D&D 5e rules: Characters can only benefit from one AC calculation method at a time.
 * When multiple methods apply, the character chooses the best one.
 */
export const AC_FORMULAS: AcFormulaDefinition[] = [
    // Barbarian Unarmored Defense: 10 + DEX + CON
    {
        featureName: 'Unarmored Defense',
        classId: 'barbarian',
        formula: (abilities, dexMod) => 10 + dexMod + getModifier(abilities.con),
        condition: (states) => states.includes('unarmored'),
        description: 'AC = 10 + DEX modifier + CON modifier when not wearing armor'
    },
    // Monk Unarmored Defense: 10 + DEX + WIS
    {
        featureName: 'Unarmored Defense',
        classId: 'monk',
        formula: (abilities, dexMod) => 10 + dexMod + getModifier(abilities.wis),
        condition: (states) => states.includes('unarmored'),
        description: 'AC = 10 + DEX modifier + WIS modifier when not wearing armor'
    },
    // Sorcerer Draconic Resilience: 13 + DEX (Draconic Bloodline subclass)
    {
        featureName: 'Draconic Resilience',
        classId: 'sorcerer',
        formula: (_, dexMod) => 13 + dexMod,
        condition: (states) => states.includes('unarmored'),
        description: 'AC = 13 + DEX modifier when not wearing armor (Draconic Bloodline)'
    },
];

/**
 * Class feature extracted from progression data
 */
interface ClassFeature {
    name: string;
    description?: string;
}

/**
 * Gets all applicable AC formulas for the character's class features and states
 */
export function getApplicableAcFormulas(
    classFeatures: ClassFeature[],
    states: CharacterStateType[],
    classIds: string[]
): AcFormulaDefinition[] {
    return AC_FORMULAS.filter(formula => {
        // Check if character has the class for this formula
        const hasClass = classIds.includes(formula.classId);
        if (!hasClass) return false;

        // Check if character has the feature
        const hasFeature = classFeatures.some(
            f => f.name.toLowerCase() === formula.featureName.toLowerCase()
        );
        if (!hasFeature) return false;

        // Check if condition is met (e.g., unarmored)
        return formula.condition(states);
    });
}

/**
 * Calculates the best AC from applicable formulas
 *
 * Per D&D 5e rules: "If you have multiple ways to calculate your Armor Class,
 * you can benefit from only one at a time."
 *
 * This function returns the highest AC among all applicable formulas.
 */
export function calculateBestAc(
    formulas: AcFormulaDefinition[],
    abilities: AbilityScores,
    dexMod: number
): { value: number; source: string } {
    if (formulas.length === 0) {
        // Default: 10 + DEX (standard unarmored)
        return {
            value: 10 + dexMod,
            source: 'Unarmored (Base)'
        };
    }

    let bestAc = 0;
    let bestSource = '';

    for (const formula of formulas) {
        const ac = formula.formula(abilities, dexMod);
        if (ac > bestAc) {
            bestAc = ac;
            bestSource = `${formula.featureName} (${formula.classId})`;
        }
    }

    return {
        value: bestAc,
        source: bestSource
    };
}
