import React from "react";
import { cn } from "@/lib/utils";

interface AbilityScoreProps {
    label: string;
    score: number;
    className?: string;
    modifier?: number; // Optional, can be calculated
}

export function AbilityScore({ label, score, className, modifier }: AbilityScoreProps) {
    const calculatedModifier = modifier ?? Math.floor((score - 10) / 2);
    const sign = calculatedModifier >= 0 ? "+" : "";

    return (
        <div className={cn("flex flex-col items-center bg-slate-100 dark:bg-slate-800 p-2 rounded border border-slate-300 dark:border-slate-700", className)}>
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">{label}</span>
            <span className="text-2xl font-bold font-mono">{calculatedModifier}{sign}</span>
            <div className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 -mb-4 z-10">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{score}</span>
            </div>
        </div>
    );
}
