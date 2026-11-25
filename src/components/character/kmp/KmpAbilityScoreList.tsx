"use client";

import React from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { AbilityScore } from "../AbilityScore";

export function KmpAbilityScoreList() {
    const { state, executeInstantRoll } = useKmpCharacter();
    const character = state?.character;
    const resolvedAbilityScores = state?.resolvedAbilityScores || [];

    if (!character) return null;

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
                    <div
                        key={ability.key}
                        onClick={() =>
                            executeInstantRoll({
                                rollType: "ability_check",
                                targetId: ability.key,
                                label: `${ability.label} Ability Check`
                            })
                        }
                        className="cursor-pointer transition-transform hover:scale-[1.03] active:scale-95"
                        title={`1-Click Instant ${ability.label} Check`}
                    >
                        <AbilityScore
                            label={ability.label}
                            score={ability.score}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
