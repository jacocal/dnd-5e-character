import React from "react";
import { cn } from "@/lib/utils";

interface SkillRowProps {
    name: string;
    modifier: number;
    isProficient?: boolean;
    className?: string;
}

export function SkillRow({ name, modifier, isProficient = false, className }: SkillRowProps) {
    const sign = modifier >= 0 ? "+" : "";

    return (
        <div className={cn("flex items-center justify-between py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors", className)}>
            <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full border border-slate-400", isProficient ? "bg-slate-900 dark:bg-slate-100" : "bg-transparent")} />
                <span className={cn("text-sm", isProficient ? "font-semibold text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400")}>{name}</span>
            </div>
            <span className="text-sm font-mono text-slate-700 dark:text-slate-300">
                {sign}{modifier}
            </span>
        </div>
    );
}
