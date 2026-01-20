"use client";

import { useCharacterStore } from "@/store/character-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATS = ["str", "dex", "con", "int", "wis", "cha"];

export function SavingThrowsList() {
    const {
        getSavingThrowModifier,
        classes,
        proficiencyBonus,
        proficiencies,
        toggleSavingThrow
    } = useCharacterStore();

    // Determine proficiency source for each stat
    const getProficiencyInfo = (stat: string) => {
        const isClassProficient = classes.some(c => c.class?.savingThrows?.includes(stat.toUpperCase()));
        const isManualProficient = proficiencies?.savingThrows?.[stat.toLowerCase()] === true;
        return { isClassProficient, isManualProficient };
    };

    return (
        <Card>
            <CardHeader className="py-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Saving Throws
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 py-2">
                {STATS.map(stat => {
                    const mod = getSavingThrowModifier(stat);
                    const { isClassProficient, isManualProficient } = getProficiencyInfo(stat);
                    const isProficient = isClassProficient || isManualProficient;

                    return (
                        <div
                            key={stat}
                            className="flex flex-col items-center p-2 border rounded-md text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                            onClick={() => toggleSavingThrow(stat)}
                        >
                            {/* Proficiency Indicator */}
                            <div className="flex items-center justify-center mb-1 text-slate-300 group-hover:text-slate-400">
                                {isProficient ? (
                                    <Check
                                        size={14}
                                        className={cn(
                                            "font-bold",
                                            isClassProficient
                                                ? "text-primary"
                                                : "text-amber-500 dark:text-amber-400"
                                        )}
                                    />
                                ) : (
                                    <Circle size={12} />
                                )}
                            </div>

                            <div className="text-xs uppercase font-bold text-muted-foreground">{stat}</div>
                            <div className={cn(
                                "text-lg font-bold",
                                isClassProficient && "text-primary",
                                isManualProficient && !isClassProficient && "text-amber-600 dark:text-amber-400"
                            )}>
                                {mod >= 0 ? `+${mod}` : mod}
                            </div>
                            {isProficient && (
                                <div className={cn(
                                    "text-[10px]",
                                    isClassProficient
                                        ? "text-primary"
                                        : "text-amber-500 dark:text-amber-400"
                                )}>
                                    {isClassProficient ? "Class" : "Manual"} (+{proficiencyBonus})
                                </div>
                            )}
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    );
}
