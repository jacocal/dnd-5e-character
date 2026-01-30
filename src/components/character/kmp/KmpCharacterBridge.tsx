"use client";

import { useEffect } from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { useCharacterStore } from "@/store/character-store";

/**
 * Syncs the KMP ViewModel state to the legacy Zustand store
 * so that existing UI components continue to work.
 */
export function KmpCharacterBridge() {
    const { state, viewModel } = useKmpCharacter();
    const character = state?.character;

    // Get store setters
    // We access the store via the hook but since we call it outside of render (in useEffect),
    // we use setState directly or use the hook properties.
    // Using the hook inside the component is safer for reactivity.

    // Ideally we would grab 'setState' from the store but the hook pattern is established.
    useEffect(() => {
        if (!character) return;

        // Map KMP Character State to Zustand Store Properties
        // Note: Some complex objects might need deeper transformation if types mismatch significantly.
        // Assuming KMP sends clean JSON-serializable structures that match the schema-based types.

        useCharacterStore.setState({
            // Core Stats
            hpCurrent: character.hpCurrent,
            hpMax: character.hpMax,
            tempHp: character.tempHp || 0,
            hitDiceCurrent: character.hitDiceCurrent,
            hitDiceMax: character.hitDiceMax,
            deathSaveSuccess: character.deathSaveSuccess || 0,
            deathSaveFailure: character.deathSaveFailure || 0,
            inspiration: character.inspiration || false,
            exhaustion: character.exhaustion || 0,

            // Abilities
            str: character.str,
            dex: character.dex,
            con: character.con,
            int: character.int,
            wis: character.wis,
            cha: character.cha,

            // Combat
            armorClass: character.armorClass,
            speed: character.speed,
            initiativeBonus: character.initiativeBonus,

            // Progression
            level: character.level,
            xp: character.xp,

            // Lists
            classes: character.classes || [],
            feats: character.feats || [],
            traits: character.traits || [],
            inventory: character.inventory || [],
            spells: character.spells || [],
            conditions: character.conditions || []
        });

    }, [character]);

    return null; // This component renders nothing
}
