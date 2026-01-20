/**
 * Character States Module
 *
 * Defines character states derived from equipped items and provides
 * detection functions for state-aware calculations.
 */

// Inventory item interface (matches character-store structure)
interface InventoryItem {
    id: number;
    itemId: string;
    equipped: boolean;
    item?: {
        category?: string;
        slot?: string;
        type?: string;
        properties?: string[];
    };
}

/**
 * Character states that affect calculations
 */
export type CharacterStateType =
    | 'unarmored'       // No armor equipped (chest slot)
    | 'light_armored'   // Light armor equipped
    | 'medium_armored'  // Medium armor equipped
    | 'heavy_armored'   // Heavy armor equipped
    | 'shielded'        // Shield in off_hand
    | 'dual_wielding'   // Weapon in both hands
    | 'one_handed'      // Single weapon, no shield
    | 'two_handed';     // Two-handed weapon equipped

/**
 * Detects all active character states from inventory
 */
export function getCharacterStates(inventory: InventoryItem[]): CharacterStateType[] {
    const states: CharacterStateType[] = [];
    const equipped = inventory.filter(i => i.equipped && i.item);

    // Armor detection
    const chestArmor = equipped.find(
        i => i.item?.slot === 'chest' && i.item?.category === 'armor'
    );

    if (chestArmor && chestArmor.item) {
        const armorType = getArmorType(chestArmor.item.type);
        if (armorType === 'light') states.push('light_armored');
        else if (armorType === 'medium') states.push('medium_armored');
        else if (armorType === 'heavy') states.push('heavy_armored');
    } else {
        states.push('unarmored');
    }

    // Shield detection
    const shield = equipped.find(
        i => i.item?.slot === 'off_hand' && i.item?.category === 'armor'
    );
    if (shield) {
        states.push('shielded');
    }

    // Weapon hand detection
    const mainHandWeapon = equipped.find(
        i => i.item?.slot === 'main_hand' && i.item?.category === 'weapon'
    );
    const offHandWeapon = equipped.find(
        i => i.item?.slot === 'off_hand' && i.item?.category === 'weapon'
    );
    const twoHandedWeapon = equipped.find(
        i => i.item?.slot === 'two_handed' && i.item?.category === 'weapon'
    );

    if (twoHandedWeapon) {
        states.push('two_handed');
    } else if (mainHandWeapon && offHandWeapon) {
        states.push('dual_wielding');
    } else if (mainHandWeapon && !offHandWeapon && !shield) {
        states.push('one_handed');
    }

    return states;
}

/**
 * Checks if a specific state is active
 */
export function hasState(states: CharacterStateType[], state: CharacterStateType): boolean {
    return states.includes(state);
}

/**
 * Convenience function: Check if character is unarmored
 */
export function isUnarmored(inventory: InventoryItem[]): boolean {
    const states = getCharacterStates(inventory);
    return hasState(states, 'unarmored');
}

/**
 * Parses armor type string to determine category
 */
function getArmorType(typeString?: string): 'none' | 'light' | 'medium' | 'heavy' {
    if (!typeString) return 'none';

    const lower = typeString.toLowerCase();
    if (lower.includes('light')) return 'light';
    if (lower.includes('medium')) return 'medium';
    if (lower.includes('heavy')) return 'heavy';

    return 'none';
}

/**
 * Gets the armor weight category from inventory
 */
export function getEquippedArmorType(inventory: InventoryItem[]): 'none' | 'light' | 'medium' | 'heavy' {
    const chestArmor = inventory.find(
        i => i.equipped && i.item?.slot === 'chest' && i.item?.category === 'armor'
    );

    if (!chestArmor) return 'none';
    return getArmorType(chestArmor.item?.type);
}
