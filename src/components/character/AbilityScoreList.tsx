"use client";

import React from "react";
import { useCharacterStore } from "@/store/character-store";
import { AbilityScore } from "./AbilityScore";
import { AbilityPointAllocationDialog } from "./AbilityPointAllocationDialog";

export function AbilityScoreList() {
    const { getAbilityScore, abilityPointPool } = useCharacterStore();

    const abilities = [
        { key: "str", label: "STR" },
        { key: "dex", label: "DEX" },
        { key: "con", label: "CON" },
        { key: "int", label: "INT" },
        { key: "wis", label: "WIS" },
        { key: "cha", label: "CHA" },
    ];

    return (
        <div className="space-y-4">
            {/* Ability Point Allocation Button (shown when points available) */}
            {abilityPointPool > 0 && (
                <div className="flex justify-center">
                    <AbilityPointAllocationDialog />
                </div>
            )}

            <div className="grid grid-cols-3 md:grid-cols-1 gap-3">
                {abilities.map((ability) => (
                    <AbilityScore
                        key={ability.key}
                        label={ability.label}
                        score={getAbilityScore ? getAbilityScore(ability.key) : 10}
                    />
                ))}
            </div>
        </div>
    );
}
