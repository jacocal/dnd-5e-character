"use client";

import React, { useEffect, useState } from "react";
import { useCharacterStore } from "@/store/character-store";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export function EncumbranceBar() {
    // Subscribe to store changes that affect weight
    const { inventory, str, getEncumbrance } = useCharacterStore();
    const [stats, setStats] = useState({ current: 0, max: 0 });

    useEffect(() => {
        setStats(getEncumbrance());
    }, [inventory, str, getEncumbrance]);

    const percentage = Math.min(100, (stats.current / stats.max) * 100);
    const isOverencumbered = stats.current > stats.max;

    return (
        <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs text-slate-500 uppercase font-bold tracking-wider">
                <span>Encumbrance</span>
                <span className={cn(isOverencumbered ? "text-red-500" : "")}>
                    {stats.current.toFixed(1)} / {stats.max} lb
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
