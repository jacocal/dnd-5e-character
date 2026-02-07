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
        <div className={cn("flex flex-col items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group min-h-[90px] justify-between", className)}>
            <div className="absolute top-0 inset-x-0 h-1 bg-slate-100 dark:bg-slate-800" />

            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">{label}</span>

            <div className="text-2xl font-black font-mono text-slate-800 dark:text-slate-100 z-10">
                {sign}{calculatedModifier}
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-700 mb-0.5 z-10">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{score}</span>
            </div>
        </div>
    );
}
