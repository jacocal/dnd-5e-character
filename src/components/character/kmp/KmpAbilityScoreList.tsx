"use client";

import React from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { AbilityScore } from "../AbilityScore";

export function KmpAbilityScoreList() {
    const { state } = useKmpCharacter();
    const character = state?.character;
    const resolvedAbilityScores = state?.resolvedAbilityScores || [];

    if (!character) return null;

    // Use resolved ability scores if available (modifier-applied), fallback to raw values
    const abilities = resolvedAbilityScores.length > 0
        ? resolvedAbilityScores.map((ab: any) => ({
            key: ab.ability,
            label: ab.ability.toUpperCase(),
            score: ab.effectiveValue
        }))
        : [
            { key: "str", label: "STR", score: character.str },
            { key: "dex", label: "DEX", score: character.dex },
            { key: "con", label: "CON", score: character.con },
            { key: "int", label: "INT", score: character.int },
            { key: "wis", label: "WIS", score: character.wis },
            { key: "cha", label: "CHA", score: character.cha },
        ];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {abilities.map((ability: { key: string; label: string; score: number }) => (
                    <AbilityScore
                        key={ability.key}
                        label={ability.label}
                        score={ability.score}
                    />
                ))}
            </div>
        </div>
    );
}
