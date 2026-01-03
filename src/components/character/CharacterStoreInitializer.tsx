"use client";

import { useRef } from "react";
import { useCharacterStore } from "@/store/character-store";
import * as React from "react";
import { useRouter } from "next/navigation";

interface CharacterStoreInitializerProps {
    characterId: number;
    hpCurrent: number;
    hpMax: number;
    tempHp: number;
    hitDiceCurrent: number;
    hitDiceMax: number;
    deathSaveSuccess: number;
    deathSaveFailure: number;
    inspiration: boolean;
    exhaustion: number;
    // Ability Scores
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
    armorClass: number | null;
    speed: number;
    initiativeBonus: number;
    proficiencies: any;
    manualProficiencies: any; // Record<string, string[]>
    spells: any[];
    inventory: any[];
    // Phase 3
    xp: number;
    level: number;
    // Currency
    cp: number;
    sp: number;
    ep: number;
    gp: number;
    pp: number;
    // Phase 5
    feats: any[];
    traits: any[];
    subclass: string | null;
    classFeatures: any[];
    classes: any[];
    maxSpellSlots: Record<string, number>;
    usedSpellSlots: Record<string, number>;
    // Pact Magic (Warlock)
    usedPactSlots: number;
    maxPactSlots: { count: number; level: number } | null;
    effectiveCasterLevel: number;
    // Misc
    proficiencyBonus: number;
    // Bio & Details
    size: string;
    appearance: string;
    backstory: string;
    languages: any[];
    conditions: any[];
    raceEntry: any;
    background: any;
    alignment: string | null;
    darkvision: number | null;
    resources: any[];
    resourceModifiers: any[];
    abilityPointPool: number;
}

export function CharacterStoreInitializer(props: CharacterStoreInitializerProps) {
    const initialized = useRef(false);
    const router = useRouter();

    // Initial Hydration
    if (!initialized.current) {
        useCharacterStore.setState(props);
        initialized.current = true;
    }

    // React to prop changes (Revalidation from Server Actions)
    React.useEffect(() => {
        // When props change (meaning the server sent new data), we sync the store.
        // This is critical for replacing optimistic temporary IDs with real database IDs
        // and ensuring the UI reflects the true server state.
        useCharacterStore.setState(props);
    }, [
        props.hpCurrent, props.hpMax, props.tempHp, props.hitDiceCurrent,
        props.inventory, props.spells, props.proficiencies, props.feats, props.classFeatures,
        props.xp, props.level, props.cp, props.sp, props.ep, props.gp, props.pp,
        props.size, props.appearance, props.backstory, props.languages, props.conditions
        // We track specific props to avoid unnecessary re-renders or loops, 
        // though setState does a shallow merge/diff usually.
        // A simple [props] dependency might be too aggressive if object references change on every render,
        // but in Next.js Server->Client prop passing, they usually change only on re-render.
        // For safety, we can just depend on the key data objects being different references.
    ]);

    // Actually, to be simpler and catch all updates:
    React.useEffect(() => {
        useCharacterStore.setState(props);
    }, [props]);

    // Auto-refresh when tab becomes visible (catches DM-side updates like alignment changes)
    React.useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                router.refresh();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [router]);

    return null;
}

