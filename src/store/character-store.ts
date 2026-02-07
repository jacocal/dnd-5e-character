import { create } from 'zustand';
import {
    updateCharacterVitality, performLongRest, updateCharacterProficiencies,
    toggleSpellPrepared, toggleItemEquippedState, updateItemQuantity,
    learnSpell, addItemToInventory, levelUpClass, getClassProgression,
    setCharacterSubclass
} from "../../app/actions";
import { calculateProficiencyBonus, calculateTotalLevel } from "../lib/mechanics/leveling";
import {
    calculateStatWithModifiers,
    getProficiencyModifiers,
    getArmorProficiency,
    getWeaponProficiency,
    getSavingThrowProficiency,
    calculateEffectiveMaxHp,
    ModifierSource,
    MAX_ATTUNED_ITEMS
} from "../lib/mechanics/modifiers";
import { getCharacterStates, hasState } from "../lib/mechanics/character-states";
import { getApplicableAcFormulas, calculateBestAc } from "../lib/mechanics/ac-formulas";

interface CharacterState {
    characterId: number | null;
    hpCurrent: number;
    hpMax: number;
    tempHp: number;

    // Ability Scores
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;

    // Currency
    cp: number;
    sp: number;
    ep: number;
    gp: number;
    pp: number;

    // Meta
    classes: any[];
    background: any | null;
    raceEntry: any | null; // Added Race Entry
    alignment: string | null;

    // New Vitals
    hitDiceCurrent: number;
    hitDiceMax: number;
    deathSaveSuccess: number;
    deathSaveFailure: number;
    inspiration: boolean;
    exhaustion: number;

    // Combat Stats
    armorClass: number | null;
    speed: number;
    initiativeBonus: number;
    // Calculated (Read-only from DB perspective, but store holds it)
    proficiencyBonus: number; // For simpler access

    // Actions
    setHp: (hp: number) => void;
    takeDamage: (amount: number) => void;
    heal: (amount: number) => void;
    setTempHp: (amount: number) => void;

    // Condition Actions
    toggleInspiration: () => void;
    setExhaustion: (level: number) => void;

    // Currency Actions
    setCurrency: (type: 'cp' | 'sp' | 'ep' | 'gp' | 'pp', amount: number) => void;

    // Death Save Actions
    setDeathSaves: (success: number, failure: number) => void;

    // Rest Actions
    spendHitDie: () => void;
    longRest: () => Promise<void>;
    shortRest: () => Promise<void>;

    // Combat Stat Actions
    setArmorClass: (ac: number | null) => void;
    setSpeed: (speed: number) => void;
    setInitiativeBonus: (bonus: number) => void;
    setAbilityScore: (ability: string, value: number) => void;

    // Proficiency Actions
    proficiencies: any;
    setProficiencies: (data: any) => void;
    toggleSkill: (skillName: string) => void;
    toggleSavingThrow: (ability: string) => void;

    // Phase 3: Progression & Magic
    level: number;
    xp: number;
    usedSpellSlots: Record<string, number>;
    maxSpellSlots: Record<string, number>;
    progressionFeatures: { asi: boolean };

    // Pact Magic (Warlock) - Separate slot pool that recovers on short rest
    usedPactSlots: number;
    maxPactSlots: { count: number; level: number } | null;
    effectiveCasterLevel: number;

    // Class Resources (Rage, Ki, Wild Shape, etc.)
    resources: Array<{
        id: string;
        name: string;
        maxUses: number;
        usedUses: number;
        rechargeOn: 'short' | 'long';
        onUse?: Array<{ type: string; mode: string; formula: string; duration?: string }>; // Hydrated from DB
    }>;

    // Active Resource Effects (e.g. Max HP boost from Wild Shape)
    resourceModifiers: Array<{
        id: string;
        name: string;
        sourceResourceId: string;
        modifiers: any[];
        duration?: string;
    }>;

    setLevel: (level: number) => void;
    levelUp: (classId: string, hpGain?: number, characterIdOverride?: number) => Promise<void>;
    setXp: (xp: number) => void;
    consumeSpellSlot: (level: number) => void;
    restoreSpellSlot: (level: number) => void;
    resetSpellSlots: () => void;

    // Pact Slot Actions
    consumePactSlot: () => void;
    restorePactSlot: () => void;

    // Class Resource Actions
    setResources: (resources: any[]) => void;
    useResource: (resourceId: string) => void;
    clearResourceModifiers: (duration: 'short_rest' | 'long_rest') => void;
    removeResourceModifier: (modId: string) => void;
    restoreResource: (resourceId: string, amount?: number) => void;
    restoreAllResources: (rechargeType: 'short' | 'long') => void;

    // Ability Point Pool (ASI points to distribute)
    abilityPointPool: number;
    grantAbilityPoints: (amount: number) => Promise<void>;
    spendAbilityPoints: (distribution: { stat: string; amount: number }[]) => Promise<{ success: boolean; error?: string }>;


    // Phase 3: Spells & Inventory
    spells: any[];
    inventory: any[];
    // concentratingOn removed, derived from spells
    setSpells: (spells: any[]) => void;
    setInventory: (inventory: any[]) => void;
    setConcentrating: (spellId: string | null) => void;
    toggleSpellPrepared: (spellId: string, isPrepared: boolean) => void;
    toggleSpellRitual: (spellId: string, isRitual: boolean) => void;

    toggleItemEquipped: (inventoryId: number) => void;
    updateItemQuantity: (inventoryId: number, quantity: number) => void;
    addSpell: (spell: any) => Promise<void>;
    removeSpell: (spellId: string) => Promise<void>;
    addItem: (item: any, quantity?: number) => Promise<void>;
    createCustomItem: (data: any) => Promise<void>;
    useItem: (inventoryId: number) => Promise<void>;

    // Attunement Actions
    attuneItem: (inventoryId: number) => { success: boolean; error?: string };
    unattuneItem: (inventoryId: number) => void;
    getAttunedCount: () => number;

    // Magic Item Identification Actions
    identifyItem: (inventoryId: number) => void;
    getItemDisplayName: (inventoryEntry: any) => string;
    getItemDisplayEffect: (inventoryEntry: any) => string;
    isItemCursedRevealed: (inventoryEntry: any) => boolean;

    // Computed
    getEncumbrance: () => { current: number; max: number };
    getAbilityScore: (stat: string) => number;
    getArmorClass: () => { value: number; isProficient: boolean };
    getEffectiveMaxHp: () => number;
    isProficient: (item: any) => boolean;
    canCastSpells: () => boolean;
    getSavingThrowModifier: (stat: string) => number;
    getSpellcastingStats: (classId: string) => { ability: string, saveDC: number, attackBonus: number, modifier: number } | null;
    // getSkillModifier: (skill: string) => number; // Future

    // Phase 5: Features & Traits
    feats: any[];
    traits: any[];
    subclass: string | null;
    classFeatures: any[]; // Hydrated from server based on level/subclass

    addFeat: (feat: { name: string, description: string }) => Promise<void>;
    removeFeat: (index: number) => Promise<void>;
    addTrait: (trait: { name: string, description: string }) => Promise<void>;
    removeTrait: (index: number) => Promise<void>;
    setSubclass: (classId: string, subclassId: string | null) => Promise<void>;
    setClassFeatures: (features: any[]) => void;
    setBackground: (background: any) => void; // New Action
    setAlignment: (alignment: string | null) => void;

    // Manual Proficiencies
    manualProficiencies: Record<string, string[]>; // { armor: [], weapons: [], tools: [] }
    addManualProficiency: (type: 'armor' | 'weapons' | 'tools', value: string) => Promise<void>;
    removeManualProficiency: (type: 'armor' | 'weapons' | 'tools', value: string) => Promise<void>;
    setManualProficiencies: (data: any) => void;

    // Phase 3: Details (Bio, Conditions, Languages)
    size: string;
    appearance: string;
    backstory: string;
    languages: any[]; // Array of { id, name }
    conditions: any[]; // Array of { id, name, duration }
    darkvision: number | null;

    setSize: (size: string) => void;
    setAppearance: (text: string) => void;
    setBackstory: (text: string) => void;
    setConditions: (conditions: any[]) => void;
    toggleCondition: (condition: any) => Promise<void>;
    setLanguages: (languages: any[]) => void;
    addLanguage: (languageId: string) => Promise<void>;
    removeLanguage: (languageId: string) => Promise<void>;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
    characterId: null,
    hpCurrent: 0,
    hpMax: 0,
    tempHp: 0,

    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    cp: 0,
    sp: 0,
    ep: 0,
    gp: 0,
    pp: 0,
    // Features
    feats: [],
    traits: [],
    subclass: null,
    classFeatures: [],
    classes: [],
    background: null,
    raceEntry: null,
    alignment: null,
    resourceModifiers: [],

    // Phase 3 Details
    size: "Medium",
    appearance: "",
    backstory: "",
    languages: [],
    conditions: [],
    darkvision: null,

    setSize: (size) => {
        set({ size });
        const { characterId } = get();
        if (characterId) updateCharacterVitality(characterId, { size });
    },
    setAppearance: (appearance) => {
        set({ appearance });
        const { characterId } = get();
        if (characterId) updateCharacterVitality(characterId, { appearance });
    },
    setBackstory: (backstory) => {
        set({ backstory });
        const { characterId } = get();
        if (characterId) updateCharacterVitality(characterId, { backstory });
    },
    setConditions: (conditions) => set({ conditions }),
    setLanguages: (languages) => set({ languages }),

    // ... (existing actions)

    addSpell: async (spell) => {
        const state = get();
        if (!state.characterId) return;

        // Optimistic check to avoid duplicate generic validtion 
        if (state.spells.some(s => s.spellId === spell.id)) return;

        // Optimistic Update
        const newSpell = {
            spellId: spell.id,
            characterId: state.characterId,
            prepared: false, // Default
            level: spell.level,
            spell: spell // We need the nested spell object for display
        };

        set({ spells: [...state.spells, newSpell] });

        try {
            const { learnSpell } = await import("../../app/actions");
            const result = await learnSpell(state.characterId, spell.id);
            if (!result.success) {
                // Revert on failure
                set((prev) => ({
                    spells: prev.spells.filter(s => s.spellId !== spell.id)
                }));
                console.error("Failed to learn spell:", result.error);
            }
        } catch (e) {
            // Revert
            set((prev) => ({
                spells: prev.spells.filter(s => s.spellId !== spell.id)
            }));
        }
    },

    addItem: async (item, quantity = 1) => {
        const state = get();
        if (!state.characterId) return;

        // Check for existing item to stack
        const existingItem = state.inventory.find(i => i.itemId === item.id);

        if (existingItem) {
            // Optimistic Stack
            state.updateItemQuantity(existingItem.id, existingItem.quantity + quantity);
        } else {
            // Optimistic Add New
            const tempId = Date.now();
            const newItem = {
                id: tempId,
                characterId: state.characterId,
                itemId: item.id,
                quantity: quantity,
                equipped: false,
                item: item
            };
            set({ inventory: [...state.inventory, newItem] });
        }

        const { addItemToInventory } = await import("../../app/actions");
        await addItemToInventory(state.characterId, item.id, quantity);
    },

    createCustomItem: async (data: any) => {
        const state = get();
        if (!state.characterId) return;

        // Optimistic update difficult for custom items without ID, relying on server response
        const { createCustomItem } = await import("../../app/actions");

        // We could optimistically add a temporary item, but revalidation is fast. 
        // Let's just await.
        await createCustomItem(state.characterId, data);
    },

    removeSpell: async (spellId) => {
        const state = get();
        if (!state.characterId) return;

        // Optimistic
        const newSpells = state.spells.filter(s => s.spellId !== spellId);
        set({ spells: newSpells });

        const { removeSpell } = await import("../../app/actions");
        await removeSpell(state.characterId, spellId);
    },

    useItem: async (inventoryId) => {
        const state = get();
        if (!state.characterId) return;

        const item = state.inventory.find(i => i.id === inventoryId);
        if (!item || item.quantity <= 0) return;

        const newQuantity = item.quantity - 1;

        // Use existing update logic which handles <= 0 deletion locally + server sync
        state.updateItemQuantity(inventoryId, newQuantity);
    },

    // ===== ATTUNEMENT ACTIONS =====

    getAttunedCount: () => {
        const state = get();
        return state.inventory.filter(i => i.isAttuned).length;
    },

    attuneItem: (inventoryId) => {
        const state = get();
        const itemEntry = state.inventory.find(i => i.id === inventoryId);

        if (!itemEntry || !itemEntry.item) {
            return { success: false, error: 'Item not found' };
        }

        if (!itemEntry.item.requiresAttunement) {
            return { success: false, error: 'Item does not require attunement' };
        }

        if (itemEntry.isAttuned) {
            return { success: false, error: 'Item is already attuned' };
        }

        const attunedCount = state.inventory.filter(i => i.isAttuned).length;
        if (attunedCount >= MAX_ATTUNED_ITEMS) {
            return { success: false, error: `Maximum attunement reached (${MAX_ATTUNED_ITEMS}/${MAX_ATTUNED_ITEMS})` };
        }

        // Optimistic update
        const newInventory = state.inventory.map(i =>
            i.id === inventoryId ? { ...i, isAttuned: true } : i
        );
        set({ inventory: newInventory });

        // Sync to server
        if (state.characterId) {
            import("../../app/actions").then(({ attuneItem }) => {
                attuneItem(state.characterId!, inventoryId, true);
            });
        }

        return { success: true };
    },

    unattuneItem: (inventoryId) => {
        const state = get();
        const itemEntry = state.inventory.find(i => i.id === inventoryId);

        if (!itemEntry) return;

        // Optimistic update
        const newInventory = state.inventory.map(i =>
            i.id === inventoryId ? { ...i, isAttuned: false } : i
        );
        set({ inventory: newInventory });

        // Sync to server
        if (state.characterId) {
            import("../../app/actions").then(({ attuneItem }) => {
                attuneItem(state.characterId!, inventoryId, false);
            });
        }
    },

    // ===== MAGIC ITEM IDENTIFICATION ACTIONS =====

    identifyItem: (inventoryId) => {
        const state = get();
        const itemEntry = state.inventory.find(i => i.id === inventoryId);

        if (!itemEntry || !itemEntry.item?.isMagical || itemEntry.isIdentified) return;

        // Optimistic update
        const newInventory = state.inventory.map(i =>
            i.id === inventoryId ? { ...i, isIdentified: true } : i
        );
        set({ inventory: newInventory });

        // Sync to server
        if (state.characterId) {
            import("../../app/actions").then(({ identifyItem }) => {
                identifyItem(state.characterId!, inventoryId);
            });
        }
    },

    getItemDisplayName: (inventoryEntry) => {
        if (!inventoryEntry || !inventoryEntry.item) return 'Unknown Item';
        const item = inventoryEntry.item;

        // Non-magical items show normally
        if (!item.isMagical) return item.name;

        // Unidentified magical items show the fake name
        if (!inventoryEntry.isIdentified) return item.name;

        // Identified items: show true_name if available, otherwise name
        // If cursed and equipped, always show true_name
        if (item.isCursed && inventoryEntry.equipped && item.trueName) {
            return item.trueName;
        }

        return item.trueName || item.name;
    },

    getItemDisplayEffect: (inventoryEntry) => {
        if (!inventoryEntry || !inventoryEntry.item) return '';
        const item = inventoryEntry.item;

        // Non-magical items show description
        if (!item.isMagical) return item.description || '';

        // Unidentified items show shown_effect or generic description
        if (!inventoryEntry.isIdentified) {
            return item.shownEffect || item.description || '';
        }

        // If cursed and equipped, show true_effect
        if (item.isCursed && inventoryEntry.equipped && item.trueEffect) {
            return item.trueEffect;
        }

        // Identified: show true_effect if available
        return item.trueEffect || item.description || '';
    },

    isItemCursedRevealed: (inventoryEntry) => {
        if (!inventoryEntry || !inventoryEntry.item) return false;
        const item = inventoryEntry.item;

        // A cursed item is revealed when it's equipped OR identified
        return item.isCursed && (inventoryEntry.equipped || inventoryEntry.isIdentified);
    },

    // ... (rest of implementation)
    // ... existing initial state ...
    hitDiceCurrent: 0,
    hitDiceMax: 0,
    deathSaveSuccess: 0,
    deathSaveFailure: 0,
    inspiration: false,
    exhaustion: 0,
    armorClass: null,
    speed: 30,
    initiativeBonus: 0,
    proficiencyBonus: 2,
    proficiencies: {},
    spells: [],
    inventory: [],

    setSpells: (spells) => set({ spells }),
    setInventory: (inventory) => set({ inventory }),
    setConcentrating: (spellId) => set((state) => {
        // Find currently concentrating spell for clearing logic
        const currentConcentrating = state.spells.find(s => s.isConcentrating);

        // Optimistic Update
        const newSpells = state.spells.map(s => {
            if (s.spellId === spellId) return { ...s, isConcentrating: true }; // Set target
            if (s.isConcentrating) return { ...s, isConcentrating: false }; // Clear others
            return s;
        });

        // Server Sync
        if (state.characterId) {
            import("../../app/actions").then(({ toggleSpellConcentration }) => {
                if (spellId) {
                    // Setting a new spell to concentration
                    toggleSpellConcentration(state.characterId!, spellId, true);
                } else if (currentConcentrating) {
                    // Clearing existing concentration
                    toggleSpellConcentration(state.characterId!, currentConcentrating.spellId, false);
                }
            });
        }

        return { spells: newSpells };
    }),


    toggleSpellPrepared: (spellId, isPrepared) => set((state) => {
        const newPrepared = !isPrepared;

        // Optimistic Update if possible
        const newSpells = state.spells.map(s =>
            s.spellId === spellId ? { ...s, prepared: newPrepared } : s
        );

        if (state.characterId) {
            toggleSpellPrepared(state.characterId, spellId, newPrepared);
        }

        // Even if we didn't find it in local state to map over, we return the mapped array (which would be identical)
        // effectively doing nothing locally but triggering the server action.
        // But if state.spells was empty, newSpells is empty.
        // We rely on server revalidation for the UI update in fallback case.
        return { spells: newSpells };
    }),

    toggleSpellRitual: (spellId, isRitual) => set((state) => {
        const newRitual = !isRitual;

        // Optimistic Update
        const newSpells = state.spells.map(s =>
            s.spellId === spellId ? { ...s, isRitual: newRitual } : s
        );

        if (state.characterId) {
            import("../../app/actions").then(({ toggleSpellRitual }) => {
                state.characterId && toggleSpellRitual(state.characterId, spellId, newRitual);
            });
        }
        return { spells: newSpells };
    }),

    toggleItemEquipped: (inventoryId) => set((state) => {
        const itemEntry = state.inventory.find(i => i.id === inventoryId);
        if (!itemEntry || !itemEntry.item) return {};

        const isEquipping = !itemEntry.equipped;

        // Logic Engine: Constraints
        const itemsToUnequip: number[] = [];

        if (isEquipping) {
            // 1. Attunement Check
            if (itemEntry.item.requiresAttunement) {
                const attestedCount = state.inventory.filter(i => i.equipped && i.item?.requiresAttunement).length;
                if (attestedCount >= 3) {
                    // Fail silently or maybe return validation error in future?
                    // For now, simple console warn and abort
                    console.warn("Attunement limit reached!");
                    return {};
                }
            }

            // 2. Slot Management & Handedness
            const newSlot = itemEntry.item.slot;
            if (newSlot) {
                // Find conflicting items
                const conflicting = state.inventory.filter(i => i.equipped && i.item?.slot === newSlot && i.id !== inventoryId);
                itemsToUnequip.push(...conflicting.map(i => i.id));

                // Handedness Special Cases
                if (newSlot === 'two_handed') {
                    // Unequip Main Hand AND Off Hand
                    const hands = state.inventory.filter(i => i.equipped && (i.item?.slot === 'main_hand' || i.item?.slot === 'off_hand'));
                    itemsToUnequip.push(...hands.map(i => i.id));
                } else if (newSlot === 'main_hand') {
                    // Unequip Two Handed
                    const twoHanded = state.inventory.filter(i => i.equipped && i.item?.slot === 'two_handed');
                    itemsToUnequip.push(...twoHanded.map(i => i.id));
                } else if (newSlot === 'off_hand') {
                    // Unequip Two Handed
                    const twoHanded = state.inventory.filter(i => i.equipped && i.item?.slot === 'two_handed');
                    itemsToUnequip.push(...twoHanded.map(i => i.id));
                }
            }
        }

        // Apply Updates
        const newInventory = state.inventory.map(i => {
            if (i.id === inventoryId) return { ...i, equipped: isEquipping };
            if (itemsToUnequip.includes(i.id)) return { ...i, equipped: false };
            return i;
        });

        // Sync to Server
        if (state.characterId) {
            import("../../app/actions").then(({ toggleItemEquippedState }) => {
                toggleItemEquippedState(state.characterId!, inventoryId, isEquipping); // Target
                itemsToUnequip.forEach(id => toggleItemEquippedState(state.characterId!, id, false)); // Side effects
            });
        }

        return { inventory: newInventory };
    }),

    updateItemQuantity: (inventoryId, quantity) => set((state) => {
        let newInventory;
        if (quantity <= 0) {
            newInventory = state.inventory.filter(i => i.id !== inventoryId);
        } else {
            newInventory = state.inventory.map(i =>
                i.id === inventoryId ? { ...i, quantity } : i
            );
        }

        if (state.characterId) {
            updateItemQuantity(state.characterId, inventoryId, quantity);
        }

        return { inventory: newInventory };
    }),

    setHp: (hp) => {
        const state = get();
        const effectiveMaxHp = state.getEffectiveMaxHp();
        const newHp = Math.min(effectiveMaxHp, Math.max(0, hp));
        if (state.characterId) {
            updateCharacterVitality(state.characterId, { hpCurrent: newHp });
        }
        set({ hpCurrent: newHp });
    },

    takeDamage: (amount) => set((state) => {
        let remainingDamage = amount;
        let newTempHp = state.tempHp;

        if (newTempHp > 0) {
            if (newTempHp >= remainingDamage) {
                newTempHp -= remainingDamage;
                remainingDamage = 0;
            } else {
                remainingDamage -= newTempHp;
                newTempHp = 0;
            }
        }

        const newHp = Math.max(0, state.hpCurrent - remainingDamage);

        if (state.characterId) {
            updateCharacterVitality(state.characterId, {
                hpCurrent: newHp,
                tempHp: newTempHp
            });
        }

        return {
            tempHp: newTempHp,
            hpCurrent: newHp
        };
    }),

    heal: (amount) => {
        const state = get();
        const effectiveMaxHp = state.getEffectiveMaxHp();
        const newHp = Math.min(effectiveMaxHp, state.hpCurrent + amount);
        const newSuccess = state.hpCurrent === 0 && newHp > 0 ? 0 : state.deathSaveSuccess;
        const newFailure = state.hpCurrent === 0 && newHp > 0 ? 0 : state.deathSaveFailure;

        if (state.characterId) {
            updateCharacterVitality(state.characterId, {
                hpCurrent: newHp,
                deathSaveSuccess: newSuccess,
                deathSaveFailure: newFailure
            });
        }
        set({
            hpCurrent: newHp,
            deathSaveSuccess: newSuccess,
            deathSaveFailure: newFailure
        });
    },

    setTempHp: (amount) => set((state) => {
        if (state.characterId) {
            updateCharacterVitality(state.characterId, { tempHp: amount });
        }
        return { tempHp: amount };
    }),

    toggleInspiration: () => set((state) => {
        const newVal = !state.inspiration;
        if (state.characterId) {
            updateCharacterVitality(state.characterId, { inspiration: newVal });
        }
        return { inspiration: newVal };
    }),

    setExhaustion: (level) => set((state) => {
        const newLevel = Math.max(0, Math.min(6, level));
        if (state.characterId) {
            updateCharacterVitality(state.characterId, { exhaustion: newLevel });
        }
        return { exhaustion: newLevel };
    }),

    setCurrency: (type, amount) => set((state) => {
        const val = Math.max(0, amount);
        if (state.characterId) {
            updateCharacterVitality(state.characterId, { [type]: val });
        }
        return { [type]: val } as Partial<CharacterState>;
    }),

    setDeathSaves: (success, failure) => set((state) => {
        if (state.characterId) {
            updateCharacterVitality(state.characterId, {
                deathSaveSuccess: success,
                deathSaveFailure: failure
            });
        }
        return { deathSaveSuccess: success, deathSaveFailure: failure };
    }),

    spendHitDie: () => set((state) => {
        if (state.hitDiceCurrent > 0) {
            const newVal = state.hitDiceCurrent - 1;
            if (state.characterId) {
                updateCharacterVitality(state.characterId, { hitDiceCurrent: newVal });
            }
            return { hitDiceCurrent: newVal };
        }
        return state;
    }),

    longRest: async () => {
        const state = get();
        if (state.characterId) {
            const result = await performLongRest(state.characterId);
            if (result.success) {
                // Ensure client-side cleanup of resources and modifiers
                state.restoreAllResources('long'); // This clears modifiers and refreshes logic

                // Get effective max HP including modifiers (now cleaned up)
                const effectiveMaxHp = state.getEffectiveMaxHp();
                // Optimistic update for HP/vitals - server has already done the DB work
                set({
                    hpCurrent: effectiveMaxHp,
                    tempHp: 0,
                    hitDiceCurrent: state.hitDiceMax, // 2024 ruleset: recover ALL hit dice on long rest
                    exhaustion: Math.max(0, state.exhaustion - 1),
                    deathSaveSuccess: 0,
                    deathSaveFailure: 0,
                    usedSpellSlots: {}, // Reset slots
                });
                // Class resources are now restored server-side in performLongRest
                // The revalidatePath will refetch the page with correct values
            }
        }
    },

    shortRest: async () => {
        const state = get();
        if (state.characterId) {
            const { performShortRest } = await import("../../app/actions");
            const result = await performShortRest(state.characterId);
            if (result.success) {
                // Short Rest: Only reset Pact Magic slots (Warlock), NOT standard spell slots
                if (state.maxPactSlots) {
                    set({ usedPactSlots: 0 });
                    // Persist to server (already done in performShortRest but keep for optimistic update)
                    updateCharacterVitality(state.characterId, { usedPactSlots: 0 });
                }
                // Class resources are now restored server-side in performShortRest
                // The revalidatePath will refetch the page with correct values
            }
        }
    },


    setArmorClass: (ac) => set((state) => {
        if (state.characterId) {
            updateCharacterVitality(state.characterId, { armorClass: ac });
        }
        return { armorClass: ac };
    }),

    setSpeed: (speed) => set((state) => {
        if (state.characterId) {
            updateCharacterVitality(state.characterId, { speed: speed });
        }
        return { speed: speed };
    }),

    setInitiativeBonus: (bonus) => set((state) => {
        if (state.characterId) {
            updateCharacterVitality(state.characterId, { initiativeBonus: bonus });
        }
        return { initiativeBonus: bonus };
    }),

    setAbilityScore: (ability, value) => set((state) => {
        const allowed = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        if (!allowed.includes(ability)) return {};

        if (state.characterId) {
            updateCharacterVitality(state.characterId, { [ability]: value });
        }
        return { [ability]: value };
    }),

    setProficiencies: (data) => set({ proficiencies: data || {} }),

    toggleSkill: (skillName) => set((state) => {
        const currentSkills = state.proficiencies?.skills || {};
        const currentValue = currentSkills[skillName];

        let nextValue: boolean | "expertise" | undefined;

        if (!currentValue) {
            // Not proficient -> Proficient
            nextValue = true;
        } else if (currentValue === true) {
            // Proficient -> Expertise
            nextValue = "expertise";
        } else {
            // Expertise -> Not proficient
            nextValue = undefined;
        }

        const newProficiencies = {
            ...state.proficiencies,
            skills: {
                ...currentSkills,
                [skillName]: nextValue
            }
        };

        // Clean up undefined key
        if (nextValue === undefined) {
            delete newProficiencies.skills[skillName];
        }

        if (state.characterId) {
            updateCharacterProficiencies(state.characterId, newProficiencies);
        }

        return { proficiencies: newProficiencies };
    }),

    toggleSavingThrow: (ability) => set((state) => {
        const currentSavingThrows = state.proficiencies?.savingThrows || {};
        const currentValue = currentSavingThrows[ability.toLowerCase()];

        // Simple toggle: undefined -> true -> undefined
        const nextValue = currentValue ? undefined : true;

        const newProficiencies = {
            ...state.proficiencies,
            savingThrows: {
                ...currentSavingThrows,
                [ability.toLowerCase()]: nextValue
            }
        };

        // Clean up undefined key
        if (nextValue === undefined) {
            delete newProficiencies.savingThrows[ability.toLowerCase()];
        }

        if (state.characterId) {
            updateCharacterProficiencies(state.characterId, newProficiencies);
        }

        return { proficiencies: newProficiencies };
    }),

    // Phase 3 Implementations
    level: 1,
    xp: 0,
    usedSpellSlots: {},
    maxSpellSlots: {},
    progressionFeatures: { asi: false },

    // Pact Magic (Warlock)
    usedPactSlots: 0,
    maxPactSlots: null,
    effectiveCasterLevel: 0,

    // Class Resources
    resources: [],

    setResources: (resources) => set({ resources }),

    useResource: (resourceId) => set((state) => {
        const newResources = state.resources.map(r => {
            if (r.id === resourceId && r.usedUses < r.maxUses) {
                return { ...r, usedUses: r.usedUses + 1 };
            }
            return r;
        });

        // Logic Engine: Check for onUse effects
        const resource = newResources.find(r => r.id === resourceId);
        const originalResource = state.resources.find(r => r.id === resourceId);
        const stateUpdates: Partial<CharacterState> = {};

        // Only trigger if we actually consumed a use
        if (resource && originalResource && resource.usedUses > originalResource.usedUses) {
            if (resource.onUse) {
                resource.onUse.forEach(effect => {
                    if (effect.type === 'grant_hp') {
                        // Parse formula: simple eval for 'level'
                        // e.g. "3 * level", "10", "1d10 + level"
                        // For safety, we'll just handle basic math and 'level' var for now.
                        // Warning: `eval` or strict parsing needed. For MVP: simple replacement.
                        let formula = effect.formula.toLowerCase().replace(/level/g, state.level.toString());
                        // Basic sanitization
                        formula = formula.replace(/[^0-9+\-*/().]/g, '');
                        let amount = 0;
                        try {

                            amount = Math.floor(new Function('return ' + formula)());
                        } catch (e) {
                            console.error("Error evaluating HP formula:", formula, e);
                        }

                        if (amount > 0) {
                            if (effect.mode === 'temporary') {
                                // Temp HP Rule: Take higher
                                const newTemp = Math.max(state.tempHp, amount);
                                stateUpdates.tempHp = newTemp;
                                // Update server
                                if (state.characterId) {
                                    updateCharacterVitality(state.characterId, { tempHp: newTemp });
                                }
                            } else if (effect.mode === 'bonus') {
                                // Bonus HP (Healable)
                                // 0. Remove existing modifier from same source (prevent stacking / allow refresh)
                                const existingIndex = (state.resourceModifiers || []).findIndex(m => m.sourceResourceId === resourceId);
                                const baseMods = (state.resourceModifiers || []).filter(m => m.sourceResourceId !== resourceId);

                                // 1. Add modifier to resourceModifiers
                                const modId = `${resourceId}-${Date.now()}`;
                                const newMod = {
                                    id: modId,
                                    name: resource.name,
                                    sourceResourceId: resourceId,
                                    duration: effect.duration,
                                    modifiers: [{
                                        type: 'bonus',
                                        target: 'hp_max',
                                        value: amount
                                    }]
                                };
                                const newMods = [...baseMods, newMod];
                                stateUpdates.resourceModifiers = newMods;

                                // 2. Heal the character by that amount (Effectively adding current HP)
                                // CRITICAL: We must clamp to the new Effective Max HP to prevent overhealing (e.g. 17/17 + 6 -> 23/17)
                                // We need to calculate the new effective Max HP with these new modifiers.

                                const sources = [
                                    ...state.inventory.filter(i => i.equipped && i.item && (!i.item.requiresAttunement || i.isAttuned)).map(i => ({ id: i.itemId, name: i.item.name, modifiers: i.item.modifiers || [] })),
                                    ...state.feats.map(f => ({ id: f.id, name: f.name, modifiers: f.modifiers || [] })),
                                    ...state.traits.map(t => ({ id: t.id, name: t.name, modifiers: t.modifiers || [] })),
                                    ...(state.background ? [{ id: state.background.id, name: state.background.name, modifiers: state.background.modifiers || [] }] : []),
                                    ...(state.raceEntry ? [{ id: state.raceEntry.id, name: state.raceEntry.name, modifiers: state.raceEntry.modifiers || [] }] : []),
                                    ...newMods.map(m => ({ id: m.id, name: m.name, modifiers: m.modifiers || [] }))
                                ];

                                // Calculate new effective max HP
                                const newEffectiveMax = calculateEffectiveMaxHp(state.hpMax, state.level, sources);

                                // Calculate new current HP: Base + Mod, but clamped to New Max
                                // If "Healable" means we heal for the amount:
                                const potentialHp = state.hpCurrent + amount;
                                const newHpCurrent = Math.min(potentialHp, newEffectiveMax);

                                stateUpdates.hpCurrent = newHpCurrent;

                                if (state.characterId) {
                                    import("../../app/actions").then(({ updateCharacterVitality }) => {
                                        updateCharacterVitality(state.characterId!, {
                                            hpCurrent: newHpCurrent,
                                            resourceModifiers: newMods
                                        });
                                    });
                                }
                            }
                        }
                    }
                });
            } else {
                console.log("[useResource] No onUse effects found on resource object.");
            }
        }

        // Persist usage to server
        if (state.characterId) {
            import("../../app/actions").then(({ updateCharacterResource }) => {
                if (resource) {
                    updateCharacterResource(state.characterId!, resourceId, resource.usedUses);
                }
            });
        }

        return { resources: newResources, ...stateUpdates };
    }),

    restoreResource: (resourceId, amount = 1) => set((state) => {
        const newResources = state.resources.map(r => {
            if (r.id === resourceId) {
                return { ...r, usedUses: Math.max(0, r.usedUses - amount) };
            }
            return r;
        });

        // Persist to server
        if (state.characterId) {
            import("../../app/actions").then(({ updateCharacterResource }) => {
                const resource = newResources.find(r => r.id === resourceId);
                if (resource) {
                    updateCharacterResource(state.characterId!, resourceId, resource.usedUses);
                }
            });
        }

        return { resources: newResources };
    }),

    restoreAllResources: (rechargeType) => set((state) => {
        const newResources = state.resources.map(r => {
            // Determine if this resource should be restored based on rest type:
            // - Long rest: restores ALL resources (both 'short' and 'long' recharge types)
            // - Short rest: restores ONLY 'short' recharge type resources
            const shouldRestore =
                rechargeType === 'long' || // Long rest restores everything
                (rechargeType === 'short' && r.rechargeOn === 'short'); // Short rest only restores short-rest resources

            if (shouldRestore) {
                return { ...r, usedUses: 0 };
            }
            return r;
        });

        // Clear expired resource modifiers
        const currentMods = state.resourceModifiers || [];
        const newMods = currentMods.filter(m => {
            if (!m.duration) return true;
            if (rechargeType === 'long') return false;
            if (rechargeType === 'short' && m.duration === 'short_rest') return false;
            return true;
        });

        // Persist all restored resources and modifiers to server
        if (state.characterId) {
            import("../../app/actions").then(({ updateCharacterResources, updateCharacterVitality }) => {
                const usedMap = Object.fromEntries(newResources.map(r => [r.id, r.usedUses]));
                updateCharacterResources(state.characterId!, usedMap);
                updateCharacterVitality(state.characterId!, { resourceModifiers: newMods });
            });
        }

        return { resources: newResources, resourceModifiers: newMods };
    }),

    clearResourceModifiers: (duration) => set((state) => {
        const newMods = state.resourceModifiers.filter(m => m.duration !== duration);
        return { resourceModifiers: newMods };
    }),

    removeResourceModifier: (modId: string) => set((state) => {
        const currentMods = state.resourceModifiers || [];
        const newMods = currentMods.filter(m => m.id !== modId);

        // When removing a Bonus HP modifier, Max HP drops.
        // We generally clamp Current HP to the new Max if it exceeds it.
        // We will let the `heal` function or next calc handle effective max, but we should likely clamp here explicitly if needed.
        // However, updating state.resourceModifiers immediately changes getEffectiveMaxHp().
        // Does it update hpCurrent? No. 
        // We should clamp hpCurrent to new effective max.

        // Need to calculate new effective max *without* this modifier.
        const sources = [
            ...state.inventory.filter(i => i.equipped && i.item && (!i.item.requiresAttunement || i.isAttuned)).map(i => ({ id: i.itemId, name: i.item.name, modifiers: i.item.modifiers || [] })),
            ...state.feats.map(f => ({ id: f.id, name: f.name, modifiers: f.modifiers || [] })),
            ...state.traits.map(t => ({ id: t.id, name: t.name, modifiers: t.modifiers || [] })),
            ...(state.background ? [{ id: state.background.id, name: state.background.name, modifiers: state.background.modifiers || [] }] : []),
            ...(state.raceEntry ? [{ id: state.raceEntry.id, name: state.raceEntry.name, modifiers: state.raceEntry.modifiers || [] }] : []),
            ...newMods.map(m => ({ id: m.id, name: m.name, modifiers: m.modifiers || [] }))
        ];

        // Calculate new effective max HP using the imported helper
        const newMax = calculateEffectiveMaxHp(state.hpMax, state.level, sources);
        const newHpCurrent = Math.min(state.hpCurrent, newMax);

        // Persist updates
        if (state.characterId) {
            import("../../app/actions").then(({ updateCharacterVitality }) => {
                updateCharacterVitality(state.characterId!, {
                    resourceModifiers: newMods,
                    hpCurrent: newHpCurrent
                });
            });
        }

        return { resourceModifiers: newMods, hpCurrent: newHpCurrent };
    }),

    // Ability Point Pool
    abilityPointPool: 0,

    grantAbilityPoints: async (amount) => {
        const state = get();
        const newPool = state.abilityPointPool + amount;
        set({ abilityPointPool: newPool });

        if (state.characterId) {
            await updateCharacterVitality(state.characterId, { abilityPointPool: newPool });
        }
    },

    spendAbilityPoints: async (distribution) => {
        const state = get();
        const totalSpent = distribution.reduce((sum, d) => sum + d.amount, 0);

        // Validation: Can't spend more than available
        if (totalSpent > state.abilityPointPool) {
            return { success: false, error: 'Not enough ability points' };
        }

        // Validation: Check caps and update ability scores
        const updates: Record<string, number> = {};
        const abilityStats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

        for (const { stat, amount } of distribution) {
            const statLower = stat.toLowerCase();
            if (!abilityStats.includes(statLower)) {
                return { success: false, error: `Invalid ability: ${stat}` };
            }

            const currentValue = (state as any)[statLower] || 10;
            const newValue = currentValue + amount;

            // Check cap (20 for normal, 30 for Epic Boons - simplified to 20 for now)
            const MAX_ABILITY_SCORE = 20;
            if (newValue > MAX_ABILITY_SCORE) {
                return { success: false, error: `${stat} would exceed maximum of ${MAX_ABILITY_SCORE}` };
            }

            updates[statLower] = newValue;
        }

        // Apply updates
        const newPool = state.abilityPointPool - totalSpent;
        set({
            ...updates,
            abilityPointPool: newPool
        });

        // Persist to server
        if (state.characterId) {
            await updateCharacterVitality(state.characterId, {
                ...updates,
                abilityPointPool: newPool
            });
        }

        return { success: true };
    },

    setLevel: (level) => {

        const state = get();
        // Manual override of level
        const safeLevel = Math.max(1, Math.min(20, level));

        if (state.characterId) {
            updateCharacterVitality(state.characterId, { level: safeLevel });
        }

        set({ level: safeLevel });
    },

    levelUp: async (classId: string, hpGain?: number, characterIdOverride?: number) => {
        const state = get();
        const targetId = characterIdOverride ?? state.characterId;
        console.log(`[Store] levelUp called. Class: ${classId}, HP: ${hpGain}, CharID: ${targetId}`);

        if (targetId) {
            console.log(`[Store] Calling server action levelUpClass...`);
            const result = await levelUpClass(targetId, classId, hpGain);
            console.log(`[Store] levelUpClass result:`, result);

            if (!result.success) {
                console.error(`[Store] levelUpClass failed: ${result.error}`);
                return;
            }

            // Update local class levels
            const cls = state.classes.find(c => c.classId === classId);
            const nextLvl = cls ? cls.level + 1 : 1;

            const newClasses = cls
                ? state.classes.map(c => c.classId === classId ? { ...c, level: nextLvl } : c)
                : [...state.classes, { classId, level: 1 }];

            const newTotal = calculateTotalLevel(newClasses);

            // Calculate hp_per_level bonus from feats/traits
            // Import dynamically to avoid circular dependencies
            const { getHpPerLevelBonus } = await import("../lib/mechanics/modifiers");

            // Collect modifier sources
            const sources: ModifierSource[] = [
                ...state.inventory
                    .filter(i => i.equipped && i.item && (!i.item.requiresAttunement || i.isAttuned))
                    .map(i => ({ id: i.itemId, name: i.item.name, modifiers: i.item.modifiers || [] })),
                ...state.feats.map(f => ({ id: f.id, name: f.name, modifiers: f.modifiers || [] })),
                ...state.traits.map(t => ({ id: t.id, name: t.name, modifiers: t.modifiers || [] })),
            ];
            if (state.background) {
                sources.push({ id: state.background.id, name: state.background.name, modifiers: state.background.modifiers || [] });
            }
            if (state.raceEntry) {
                sources.push({ id: state.raceEntry.id, name: state.raceEntry.name, modifiers: state.raceEntry.modifiers || [] });
            }

            const hpPerLevelBonus = getHpPerLevelBonus(sources);

            // Update state including HP if hpGain was provided
            // hpMax (DB) should only store the base gain (Roll + CON) because getEffectiveMaxHp adds the per-level bonus dynamically
            // hpCurrent should increase by the TOTAL gain (Roll + CON + PerLevelBonus)

            const safeGain = Number(hpGain) || 0;
            const safeBonus = Number(hpPerLevelBonus) || 0;
            const totalHpGain = safeGain + safeBonus;

            console.log("Final LevelUp Calc:", { safeGain, safeBonus, totalHpGain, oldCurrent: state.hpCurrent, newCurrent: state.hpCurrent + totalHpGain });

            const hpUpdate = (safeGain > 0 || safeBonus > 0) ? {
                hpCurrent: state.hpCurrent + totalHpGain,
                hpMax: state.hpMax + safeGain, // Only add base gain to storage
                hitDiceMax: state.hitDiceMax + 1,
                hitDiceCurrent: state.hitDiceCurrent + 1,
            } : {};

            set({
                classes: newClasses,
                level: newTotal,
                proficiencyBonus: calculateProficiencyBonus(newTotal),
                ...hpUpdate,
            });

            // Sync with server
            const { updateCharacterVitality } = await import("@/app/actions");
            await updateCharacterVitality(targetId, {
                classes: newClasses,
                level: newTotal,
                proficiencyBonus: calculateProficiencyBonus(newTotal),
                ...hpUpdate,
            });
        }
    },

    setXp: (xp) => {
        const state = get();
        // Legacy: Just update XP, don't trigger leveling
        const safeXp = Math.max(0, xp);

        if (state.characterId) {
            updateCharacterVitality(state.characterId, { xp: safeXp });
        }

        set({ xp: safeXp });
    },

    consumeSpellSlot: (slotLevel) => set((state) => {
        const current = state.usedSpellSlots[slotLevel] || 0;
        const newSlots = { ...state.usedSpellSlots, [slotLevel]: current + 1 };

        if (state.characterId) {
            updateCharacterVitality(state.characterId, { usedSpellSlots: newSlots });
        }
        return { usedSpellSlots: newSlots };
    }),

    restoreSpellSlot: (slotLevel) => set((state) => {
        const current = state.usedSpellSlots[slotLevel] || 0;
        if (current <= 0) return {}; // Do nothing if 0

        const newSlots = { ...state.usedSpellSlots, [slotLevel]: current - 1 };

        if (state.characterId) {
            updateCharacterVitality(state.characterId, { usedSpellSlots: newSlots });
        }
        return { usedSpellSlots: newSlots };
    }),

    resetSpellSlots: () => set((state) => {
        if (state.characterId) {
            updateCharacterVitality(state.characterId, { usedSpellSlots: {} });
        }
        return { usedSpellSlots: {} };
    }),

    // Pact Slot Actions (Warlock Pact Magic)
    consumePactSlot: () => set((state) => {
        if (!state.maxPactSlots) return {};
        const newUsed = Math.min(state.usedPactSlots + 1, state.maxPactSlots.count);
        if (state.characterId) {
            updateCharacterVitality(state.characterId, { usedPactSlots: newUsed });
        }
        return { usedPactSlots: newUsed };
    }),

    restorePactSlot: () => set((state) => {
        if (!state.maxPactSlots || state.usedPactSlots <= 0) return {};
        const newUsed = state.usedPactSlots - 1;
        if (state.characterId) {
            updateCharacterVitality(state.characterId, { usedPactSlots: newUsed });
        }
        return { usedPactSlots: newUsed };
    }),

    getEncumbrance: () => {
        const state = get();
        const current = state.inventory.reduce((total, entry) => {
            const weight = entry.item?.weightAmount || 0;
            if (entry.item?.fixedWeight) {
                return total + weight; // Add weight once regardless of quantity
            }
            return total + (weight * entry.quantity);
        }, 0);
        const max = state.getAbilityScore('str') * 15;
        return { current, max };
    },

    getAbilityScore: (stat) => {
        const state = get();
        // Layer 0: Base
        const base = (state as any)[stat] || 10;

        // Collect Sources - only include items that don't require attunement OR are attuned
        const sources: ModifierSource[] = [
            ...state.inventory
                .filter(i => i.equipped && i.item && (!i.item.requiresAttunement || i.isAttuned))
                .map(i => ({ id: i.itemId, name: i.item.name, modifiers: i.item.modifiers || [] })),
            ...state.feats.map(f => ({ id: f.id, name: f.name, modifiers: f.modifiers || [] })),
            ...state.traits.map(t => ({ id: t.id, name: t.name, modifiers: t.modifiers || [] })),
        ];

        if (state.background) {
            sources.push({ id: state.background.id, name: state.background.name, modifiers: state.background.modifiers || [] });
        }
        if (state.raceEntry) {
            sources.push({ id: state.raceEntry.id, name: state.raceEntry.name, modifiers: state.raceEntry.modifiers || [] });
        }

        // Use Modifiers Engine
        return calculateStatWithModifiers(base, stat, sources);
    },

    getArmorClass: () => {
        const state = get();
        const dex = state.getAbilityScore('dex');
        const dexMod = Math.floor((dex - 10) / 2);

        // Detect character states from inventory
        const characterStates = getCharacterStates(state.inventory);

        // Find Armor
        const armor = state.inventory.find(i => i.equipped && i.item?.category === 'armor' && i.item?.slot === 'chest');
        const shield = state.inventory.find(i => i.equipped && i.item?.category === 'armor' && i.item?.slot === 'off_hand');

        // Collect Modifiers using Engine - only include items that don't require attunement OR are attuned
        const sources: ModifierSource[] = [
            ...state.inventory
                .filter(i => i.equipped && i.item && (!i.item.requiresAttunement || i.isAttuned))
                .map(i => ({ id: i.itemId, name: i.item.name, modifiers: i.item.modifiers || [] })),
            ...state.feats.map(f => ({ id: f.id, name: f.name, modifiers: f.modifiers || [] })),
            ...state.traits.map(t => ({ id: t.id, name: t.name, modifiers: t.modifiers || [] })),
            // Add Resource Modifiers (Bonus HP)
            ...(state.resourceModifiers || []).map(m => ({ id: m.id, name: m.name, modifiers: m.modifiers || [] })),
        ];
        if (state.background) {
            sources.push({ id: state.background.id, name: state.background.name, modifiers: state.background.modifiers || [] });
        }

        // Use calculateStatWithModifiers to get generic bonuses (target='ac')
        // We start with 0 as base for BONUS calculation, then add to calculated Armor Base.
        const extraBonuses = calculateStatWithModifiers(0, 'ac', sources);

        let baseAC = 10 + dexMod; // Default Unarmored
        let isProficient = true; // Default to proficient (unarmored)

        if (armor && armor.item) {
            // When wearing armor, use standard armor AC calculation
            const itemAC = armor.item.armorClass || 11;
            const typeLower = armor.item.type.toLowerCase();

            if (typeLower.includes("medium")) {
                baseAC = itemAC + Math.min(dexMod, 2);
            } else if (typeLower.includes("heavy")) {
                baseAC = itemAC;
            } else {
                baseAC = itemAC + dexMod;
            }

            // Check armor proficiency
            isProficient = state.isProficient(armor.item);
        } else if (hasState(characterStates, 'unarmored')) {
            // When unarmored, check for AC formula overrides (Unarmored Defense, etc.)
            const abilities = {
                str: state.getAbilityScore('str'),
                dex: state.getAbilityScore('dex'),
                con: state.getAbilityScore('con'),
                int: state.getAbilityScore('int'),
                wis: state.getAbilityScore('wis'),
                cha: state.getAbilityScore('cha'),
            };

            // Collect class features from progression
            const classFeatures = state.classFeatures || [];
            const classIds = state.classes.map((c: any) => c.classId);

            // Get applicable AC formulas based on features and states
            const formulas = getApplicableAcFormulas(classFeatures, characterStates, classIds);

            if (formulas.length > 0) {
                // Per D&D 5e: choose the best AC formula
                const best = calculateBestAc(formulas, abilities, dexMod);
                baseAC = best.value;
            }
            // If no formulas match, use default 10 + DEX (already set above)
        }

        if (shield && shield.item) {
            baseAC += (shield.item.armorClass || 2);
            // Also check shield proficiency
            if (isProficient && !state.isProficient(shield.item)) {
                isProficient = false;
            }
        }

        return { value: baseAC + extraBonuses, isProficient };
    },

    getEffectiveMaxHp: () => {
        const state = get();

        // Collect all modifier sources
        const sources: ModifierSource[] = [
            ...state.inventory
                .filter(i => i.equipped && i.item && (!i.item.requiresAttunement || i.isAttuned))
                .map(i => ({ id: i.itemId, name: i.item.name, modifiers: i.item.modifiers || [] })),
            ...state.feats.map(f => ({ id: f.id, name: f.name, modifiers: f.modifiers || [] })),
            ...state.traits.map(t => ({ id: t.id, name: t.name, modifiers: t.modifiers || [] })),
            // Add Resource Modifiers (Bonus HP)
            ...(state.resourceModifiers || []).map(m => ({ id: m.id, name: m.name, modifiers: m.modifiers || [] })),
        ];

        if (state.background) {
            sources.push({ id: state.background.id, name: state.background.name, modifiers: state.background.modifiers || [] });
        }
        if (state.raceEntry) {
            sources.push({ id: state.raceEntry.id, name: state.raceEntry.name, modifiers: state.raceEntry.modifiers || [] });
        }

        // DEBUG LOGGING
        const hpModSources = sources.filter(s => s.modifiers.some(m => m.type === 'bonus' && m.target === 'hp_max'));
        if (hpModSources.length > 0) {
            console.log("[getEffectiveMaxHp] Found Bonus HP modifiers:", hpModSources);
        }

        const effectiveMax = calculateEffectiveMaxHp(state.hpMax, state.level, sources);
        // console.log("[getEffectiveMaxHp] Result:", { base: state.hpMax, level: state.level, result: effectiveMax });
        return effectiveMax;
    },

    isProficient: (item) => {
        const state = get();
        if (!item) return false;

        const typeLower = item.type.toLowerCase();
        const nameLower = item.name.toLowerCase();

        // 1. Collect all proficiencies
        const classProfs = state.classes.flatMap(cEntry => cEntry.class?.proficiencies || {});

        // Flatten into sets
        const armorProfs = new Set<string>();
        const weaponProfs = new Set<string>();

        // Merge Manual Profs
        if (state.manualProficiencies) {
            state.manualProficiencies.armor?.forEach((p: string) => armorProfs.add(p.toLowerCase()));
            state.manualProficiencies.weapons?.forEach((p: string) => weaponProfs.add(p.toLowerCase()));
        }

        classProfs.forEach((p: any) => {
            if (p.armor) p.armor.forEach((a: string) => armorProfs.add(a.toLowerCase()));
            if (p.weapons) p.weapons.forEach((w: string) => weaponProfs.add(w.toLowerCase()));
        });

        // Add Feat/Trait/Custom proficiencies if present (Structure pending, assuming flattened string lists in future)
        // For now, relying on class profs.

        // 2. Armor Check
        if (item.category === 'armor') {
            // Check direct name
            if (armorProfs.has(nameLower)) return true;
            if (armorProfs.has('all armor')) return true;

            // Check Tags (e.g. "armor:light", "armor:shield")
            if (item.tags) {
                for (const tag of item.tags) {
                    if (tag === 'armor:light' && (armorProfs.has('light') || armorProfs.has('light armor'))) return true;
                    if (tag === 'armor:medium' && (armorProfs.has('medium') || armorProfs.has('medium armor'))) return true;
                    if (tag === 'armor:heavy' && (armorProfs.has('heavy') || armorProfs.has('heavy armor'))) return true;
                    if (tag === 'armor:shield' && (armorProfs.has('shields') || armorProfs.has('shield'))) return true;
                }
            }

            // Fallback to type string inference if tags missing (backward compat)
            let armorType = '';
            if (typeLower.includes('plate') || typeLower.includes('splint') || typeLower.includes('heavy')) armorType = 'heavy';
            else if (typeLower.includes('medium') || typeLower.includes('breastplate') || typeLower.includes('scale')) armorType = 'medium';
            else if (typeLower.includes('light') || typeLower.includes('leather')) armorType = 'light';
            else if (typeLower.includes('shield')) armorType = 'shields';

            if (armorType && (armorProfs.has(armorType) || armorProfs.has(`${armorType} armor`))) return true;

            return false;
        }

        // 3. Weapon Check
        else if (item.category === 'weapon') {
            // Check direct name
            if (weaponProfs.has(nameLower)) return true;
            if (weaponProfs.has('all weapons')) return true;

            // Check Tags
            if (item.tags) {
                for (const tag of item.tags) {
                    if (tag === 'weapon:simple' && (weaponProfs.has('simple') || weaponProfs.has('simple weapons'))) return true;
                    if (tag === 'weapon:martial' && (weaponProfs.has('martial') || weaponProfs.has('martial weapons'))) return true;
                    if (tag === 'weapon:improvised' && (weaponProfs.has('improvised') || weaponProfs.has('improvised weapons'))) return true;
                }
            }

            // Improvised Check fallback
            if (typeLower.includes('improvised')) {
                return weaponProfs.has('improvised') || weaponProfs.has('improvised weapons');
            }

            // Category classification fallback
            let weaponCat = 'simple';
            if (typeLower.includes('martial')) weaponCat = 'martial';

            if (weaponProfs.has(weaponCat) || weaponProfs.has(`${weaponCat} weapons`)) return true;

            return false;
        }

        // Tools/Other
        return true;
    },

    getSpellcastingStats: (classId) => {
        const state = get();
        const clsEntry = state.classes.find(c => c.classId === classId || (c.class && c.class.id === classId));

        if (!clsEntry || !clsEntry.class || !clsEntry.class.spellcastingAbility) return null;

        const ability = clsEntry.class.spellcastingAbility;
        const score = state[ability.toLowerCase() as 'int' | 'wis' | 'cha'] || 10;
        const modifier = Math.floor((score - 10) / 2);

        // Proficiency Bonus based on total character level
        const prof = Math.floor((state.level - 1) / 4) + 2;

        return {
            ability,
            modifier,
            saveDC: 8 + modifier + prof,
            attackBonus: modifier + prof
        };
    },

    canCastSpells: () => {
        const state = get();
        const equippedArmor = state.inventory.filter(i => i.equipped && i.item.category === 'armor');

        // If any equipped armor is NOT proficient, return false
        for (const entry of equippedArmor) {
            if (!state.isProficient(entry.item)) {
                return false;
            }
        }
        return true;
    },

    // --- Phase 5 Actions ---

    // --- Computed ---
    getSavingThrowModifier: (stat) => {
        const state = get();
        const score = state[stat as 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'] || 10;
        const mod = Math.floor((score - 10) / 2);

        // Check Proficiency from THREE sources:
        // 1. Class-based proficiency
        let isClassProficient = false;
        if (state.classes && state.classes.length > 0) {
            isClassProficient = state.classes.some(c => {
                const classDef = c.class;
                if (classDef && classDef.savingThrows) {
                    return classDef.savingThrows.includes(stat.toUpperCase());
                }
                return false;
            });
        }

        // 2. Manual proficiency from proficiencies.savingThrows
        const isManualProficient = state.proficiencies?.savingThrows?.[stat.toLowerCase()] === true;

        // 3. Modifier-based proficiency (from traits, feats, items)
        const sources: ModifierSource[] = [
            ...state.inventory
                .filter(i => i.equipped && i.item && (!i.item.requiresAttunement || i.isAttuned))
                .map(i => ({ id: i.itemId, name: i.item.name, modifiers: i.item.modifiers || [] })),
            ...state.feats.map(f => ({ id: f.id, name: f.name, modifiers: f.modifiers || [] })),
            ...state.traits.map(t => ({ id: t.id, name: t.name, modifiers: t.modifiers || [] })),
        ];
        if (state.background) {
            sources.push({ id: state.background.id, name: state.background.name, modifiers: state.background.modifiers || [] });
        }
        if (state.raceEntry) {
            sources.push({ id: state.raceEntry.id, name: state.raceEntry.name, modifiers: state.raceEntry.modifiers || [] });
        }
        const isModifierProficient = getSavingThrowProficiency(stat, sources);

        const isProficient = isClassProficient || isManualProficient || isModifierProficient;

        return mod + (isProficient ? state.proficiencyBonus : 0);
    },

    // --- Phase 5 Actions ---

    addFeat: async (feat) => {
        const state = get();
        if (!state.characterId) return;
        const newFeats = [...state.feats, feat];
        set({ feats: newFeats });
        await updateCharacterVitality(state.characterId, { feats: newFeats });
    },

    removeFeat: async (index) => {
        const state = get();
        if (!state.characterId) return;
        const newFeats = [...state.feats];
        newFeats.splice(index, 1);
        set({ feats: newFeats });
        await updateCharacterVitality(state.characterId, { feats: newFeats });
    },

    addTrait: async (trait) => {
        const state = get();
        if (!state.characterId) return;
        const newTraits = [...state.traits, trait];
        set({ traits: newTraits });
        await updateCharacterVitality(state.characterId, { traits: newTraits });
    },

    removeTrait: async (index) => {
        const state = get();
        if (!state.characterId) return;
        const newTraits = [...state.traits];
        newTraits.splice(index, 1);
        set({ traits: newTraits });
        await updateCharacterVitality(state.characterId, { traits: newTraits });
    },

    setSubclass: async (classId, subclassId) => {
        const state = get();
        set({ subclass: subclassId });

        const { setCharacterSubclass } = await import("../../app/actions");
        await setCharacterSubclass(state.characterId!, classId, subclassId);
    },

    setClassFeatures: (features) => set({ classFeatures: features }),
    setBackground: (background) => set({ background }),
    setAlignment: (alignment) => set({ alignment }),
    setRaceEntry: (raceEntry: any) => set({ raceEntry }), // New Action

    // --- Phase 3 Async Actions ---
    toggleCondition: async (condition) => {
        const state = get();
        if (!state.characterId) return;

        const exists = state.conditions.find(c => c.id === condition.id);
        let newConditions;

        if (exists) {
            newConditions = state.conditions.filter(c => c.id !== condition.id);
        } else {
            newConditions = [...state.conditions, condition];
        }

        set({ conditions: newConditions });

        try {
            const { toggleCharacterCondition } = await import("../../app/actions");
            await toggleCharacterCondition(state.characterId, condition.id, !exists);
        } catch (e) {
            console.error(e);
            set({ conditions: state.conditions }); // Revert
        }
    },

    addLanguage: async (languageId) => {
        const state = get();
        if (!state.characterId) return;

        // Optimistic
        const langObj = { id: languageId, name: languageId };
        set({ languages: [...state.languages, langObj] });

        try {
            const { addCharacterLanguage } = await import("../../app/actions");
            await addCharacterLanguage(state.characterId, languageId);
        } catch (e) {
            set({ languages: state.languages });
        }
    },

    removeLanguage: async (languageId) => {
        const state = get();
        if (!state.characterId) return;

        set({ languages: state.languages.filter(l => l.id !== languageId) });

        try {
            const { removeCharacterLanguage } = await import("../../app/actions");
            await removeCharacterLanguage(state.characterId, languageId);
        } catch (e) {
            set({ languages: state.languages });
        }
    },

    // Manual Proficiencies
    manualProficiencies: { armor: [], weapons: [], tools: [] },
    setManualProficiencies: (data) => set({ manualProficiencies: data || { armor: [], weapons: [], tools: [] } }),

    addManualProficiency: async (type, value) => {
        const state = get();
        if (!state.characterId) return;

        const current = state.manualProficiencies || { armor: [], weapons: [], tools: [] };
        const list = current[type] || [];
        if (list.includes(value)) return;

        const updated = { ...current, [type]: [...list, value] };
        set({ manualProficiencies: updated });

        try {
            const { updateCharacterVitality } = await import("../../app/actions");
            await updateCharacterVitality(state.characterId, { manualProficiencies: updated });
        } catch (e) {
            console.error(e);
            set({ manualProficiencies: current }); // Revert
        }
    },

    removeManualProficiency: async (type, value) => {
        const state = get();
        if (!state.characterId) return;

        const current = state.manualProficiencies || { armor: [], weapons: [], tools: [] };
        const list = current[type] || [];
        const updated = { ...current, [type]: list.filter(v => v !== value) };

        set({ manualProficiencies: updated });

        try {
            const { updateCharacterVitality } = await import("../../app/actions");
            await updateCharacterVitality(state.characterId, { manualProficiencies: updated });
        } catch (e) {
            console.error(e);
            set({ manualProficiencies: current });
        }
    }
}));
