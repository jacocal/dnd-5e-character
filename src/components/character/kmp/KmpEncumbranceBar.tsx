"use client";

import React from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export function KmpEncumbranceBar() {
    const { state } = useKmpCharacter();
    const character = state?.character;
    const items = state?.resolvedItems || [];

    if (!character) return null;

    const currentWeight = items.reduce((sum: number, entry: any) => {
        const w = entry.item.weightAmount || 0;
        return sum + (w * entry.quantity);
    }, 0);

    // Standard D&D 5e rule: Str * 15
    const maxWeight = (character.str || 10) * 15;

    const percentage = Math.min(100, Math.max(0, (currentWeight / maxWeight) * 100));
    const isOverencumbered = currentWeight > maxWeight;

    return (
        <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs text-slate-500 uppercase font-bold tracking-wider">
                <span>Encumbrance</span>
                <span className={cn(isOverencumbered ? "text-red-500" : "")}>
                    {currentWeight.toFixed(1)} / {maxWeight} lb
                </span>
            </div>
            <Progress
                value={percentage}
                className={cn("h-2", isOverencumbered ? "bg-slate-200 dark:bg-slate-800 [&>div]:bg-red-500" : "")}
            />
            {isOverencumbered && (
                <div className="text-[10px] text-red-500 font-medium text-right">
                    Speed -10 ft.
                </div>
            )}
        </div>
    );
}
