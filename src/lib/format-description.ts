/**
 * Formatting utilities for descriptions, modifiers, and game mechanic text
 */

export interface Modifier {
    type: string;
    target: string;
    value: number | string;
    condition?: string;
    max?: number;
}

export interface Duration {
    type: 'instant' | 'concentration' | 'timed' | 'permanent' | 'special';
    value?: number;
    unit?: string;
}

export interface Components {
    v?: boolean;
    s?: boolean;
    m?: boolean;
    material_description?: string;
}

export interface Item {
    description?: string;
    isMagical?: boolean;
    shownEffect?: string;
    trueEffect?: string;
    [key: string]: any;
}

/**
 * Convert a modifier to a human-readable string
 */
export function formatModifier(modifier: Modifier): string {
    const { type, target, value, condition, max } = modifier;

    // Format the target label
    const targetLabel = formatTarget(target);

    switch (type) {
        case 'bonus':
            return `+${value} to ${targetLabel}`;

        case 'set':
            return `Set ${targetLabel} to ${value}`;

        case 'override':
            return `Override ${targetLabel} to ${value}`;

        case 'ability_increase':
            const maxCap = max ? ` (max ${max})` : '';
            const abilityTarget = target.toUpperCase();
            return `+${value} to ${abilityTarget}${maxCap}`;

        case 'ability_point_grant':
            return `+${value} Ability Score Increase point${Number(value) !== 1 ? 's' : ''}`;

        case 'skill_proficiency':
            return `Proficiency in ${targetLabel}`;

        case 'expertise':
            return `Expertise in ${targetLabel}`;

        case 'saving_throw_proficiency':
            return `${target.toUpperCase()} saving throw proficiency`;

        case 'armor_proficiency':
            return `${targetLabel} proficiency`;

        case 'weapon_proficiency':
            return `${targetLabel} proficiency`;

        case 'language':
            return `Speak ${targetLabel}`;

        default:
            // Fallback for unknown types
            if (condition) {
                return `${type}: ${value} to ${targetLabel} (${condition})`;
            }
            return `${type}: ${value} to ${targetLabel}`;
    }
}

/**
 * Convert multiple modifiers to human-readable strings
 */
export function formatModifiers(modifiers: Modifier[]): string[] {
    if (!modifiers || modifiers.length === 0) return [];
    return modifiers.map(formatModifier);
}

/**
 * Format a target string to be more readable
 */
function formatTarget(target: string): string {
    // Handle ability scores
    const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    if (abilities.includes(target.toLowerCase())) {
        return target.toUpperCase() + ' score';
    }

    // Handle common targets
    const targetMap: Record<string, string> = {
        ac: 'AC',
        hp: 'HP',
        speed: 'Speed',
        initiative: 'Initiative',
        // Skills
        acrobatics: 'Acrobatics',
        'animal handling': 'Animal Handling',
        arcana: 'Arcana',
        athletics: 'Athletics',
        deception: 'Deception',
        history: 'History',
        insight: ' Insight',
        intimidation: 'Intimidation',
        investigation: 'Investigation',
        medicine: 'Medicine',
        nature: 'Nature',
        perception: 'Perception',
        performance: 'Performance',
        persuasion: 'Persuasion',
        religion: 'Religion',
        'sleight of hand': 'Sleight of Hand',
        stealth: 'Stealth',
        survival: 'Survival',
        // Armor types
        'light armor': 'Light Armor',
        'medium armor': 'Medium Armor',
        'heavy armor': 'Heavy Armor',
        shields: 'Shields',
        // Weapon types
        'simple weapons': 'Simple Weapons',
        'martial weapons': 'Martial Weapons',
    };

    return targetMap[target.toLowerCase()] || capitalizeWords(target);
}

/**
 * Capitalize each word in a string
 */
function capitalizeWords(str: string): string {
    return str
        .split(/[\s_-]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Format a duration object to human-readable string
 */
export function formatDuration(duration: Duration | string | null | undefined): string {
    if (!duration) return '';
    if (typeof duration === 'string') return duration;

    switch (duration.type) {
        case 'instant':
            return 'Instantaneous';

        case 'concentration':
            if (duration.value && duration.unit) {
                return `Concentration, up to ${duration.value} ${duration.unit}${duration.value > 1 ? 's' : ''}`;
            }
            return 'Concentration';

        case 'timed':
            if (duration.value && duration.unit) {
                return `${duration.value} ${duration.unit}${duration.value > 1 ? 's' : ''}`;
            }
            return 'Timed';

        case 'permanent':
            return 'Until Dispelled';

        case 'special':
            return 'Special';

        default:
            return duration.type || '';
    }
}

/**
 * Format spell components to human-readable string
 */
export function formatComponents(components: Components): string {
    if (!components) return '';

    const parts: string[] = [];

    if (components.v) parts.push('V');
    if (components.s) parts.push('S');
    if (components.m) {
        if (components.material_description) {
            parts.push(`M (${components.material_description})`);
        } else {
            parts.push('M');
        }
    }

    return parts.join(', ');
}

/**
 * Format item cost to human-readable string
 */
export function formatCost(costAmount: number | null | undefined, costCurrency: string = 'gp'): string {
    if (costAmount === null || costAmount === undefined || costAmount === 0) {
        return '—';
    }
    return `${costAmount} ${costCurrency}`;
}

/**
 * Get the appropriate description for an item based on its identification status
 * Handles normal items, magical items, and cursed items
 */
export function getItemDescription(item: Item, isIdentified: boolean, isCursedRevealed: boolean = false): string {
    // Normal items always show description
    if (!item.isMagical) {
        return item.description || '';
    }

    // Cursed items that have been revealed (equipped)
    if (item.isCursed && isCursedRevealed) {
        return item.trueEffect || item.description || '';
    }

    // Magical items - show effect based on identification
    if (isIdentified) {
        return item.trueEffect || item.description || '';
    } else {
        return item.shownEffect || item.description || '';
    }
}

/**
 * Get tooltips for spell component abbreviations
 */
export function getComponentTooltip(component: 'V' | 'S' | 'M'): string {
    const tooltips = {
        V: 'Verbal: The spell requires speaking specific words or sounds',
        S: 'Somatic: The spell requires specific gestures or movements',
        M: 'Material: The spell requires specific components or materials',
    };
    return tooltips[component];
}

/**
 * Get full school name from abbreviation
 */
export function getSchoolName(abbreviation: string): string {
    const schools: Record<string, string> = {
        ABI: 'Abjuration',
        CON: 'Conjuration',
        DIV: 'Divination',
        ENC: 'Enchantment',
        EVO: 'Evocation',
        ILL: 'Illusion',
        NEC: 'Necromancy',
        TRA: 'Transmutation',
    };

    const upperAbbr = abbreviation.toUpperCase();
    return schools[upperAbbr] || abbreviation;
}

/**
 * Get description for a school of magic
 */
export function getSchoolDescription(school: string): string {
    const descriptions: Record<string, string> = {
        Abjuration: 'Spells that protect, block, or banish',
        Conjuration: 'Spells that create objects or summon creatures',
        Divination: 'Spells that reveal information',
        Enchantment: 'Spells that affect minds and influence behavior',
        Evocation: 'Spells that create powerful elemental effects',
        Illusion: 'Spells that deceive the senses',
        Necromancy: 'Spells that manipulate life energy',
        Transmutation: 'Spells that change properties of creatures or objects',
    };

    return descriptions[school] || '';
}
