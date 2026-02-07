"use client";

import React from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Shield, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KmpCombatStatsProps {
    className?: string;
}

interface ResolvedSavingThrow {
    ability: string;
    total: number;
    isProficient: boolean;
    hasBonus: boolean;
}

export function KmpCombatStats({ className }: KmpCombatStatsProps) {
    const { state, viewModel } = useKmpCharacter();
    const character = state?.character;
    const saves = (state?.resolvedSavingThrows || []) as ResolvedSavingThrow[];
    const combatStats = state?.resolvedCombatStats;

    if (!character) return null;

    // Use resolved combat stats from ViewModel (includes modifier pipeline)
    const ac = combatStats?.armorClass ?? character.armorClass ?? 10;
    const initiative = combatStats?.initiative ?? Math.floor((character.dex - 10) / 2) + character.initiativeBonus;
    const speed = combatStats?.speed ?? state.resolvedRace?.speed ?? character.speed;

    const handleToggleSave = (ability: string) => {
        viewModel?.toggleSavingThrowProficiency(ability);
    };

    // Armor Composition Logic
    const equippedItems = (state.resolvedItems || []).filter((i: any) => i.equipped && i.item.category.toLowerCase() === 'armor');

    // Sort logic: Heavy > Medium > Light > Shield
    const armorItems = equippedItems.filter((i: any) => !i.item.type.toLowerCase().includes('shield'));
    const shieldItems = equippedItems.filter((i: any) => i.item.type.toLowerCase().includes('shield'));

    const hasArmor = armorItems.length > 0;
    const hasShield = shieldItems.length > 0;

    const armorLabels = armorItems.map((i: any) => {
        const type = i.item.type.toLowerCase();
        if (type.includes('heavy') || type.includes('plate') || type.includes('splint')) return 'Heavy';
        if (type.includes('medium') || type.includes('scale') || type.includes('breastplate')) return 'Medium';
        return 'Light';
    });

    // De-dupe armor labels (e.g. usually just one, but technically multiple could be kitted)
    const uniqueArmorLabels = Array.from(new Set(armorLabels)).sort();

    let finalLabel = uniqueArmorLabels.join(' + ');
    if (!hasArmor) finalLabel = "Unarmored";
    if (hasShield) finalLabel += " + Shield";

    // Penalty
    const hasPenalty = state.hasArmorPenalty;
    const isShieldedProficient = hasShield && !hasPenalty;

    // Determine theme based on status
    const theme = hasPenalty ? 'red' : (isShieldedProficient ? 'blue' : 'slate');

    const themeClasses = {
        border: {
            red: "border-red-500 ring-1 ring-red-500 bg-red-50 dark:bg-red-950/20",
            blue: "border-blue-500 ring-1 ring-blue-500 bg-blue-50 dark:bg-blue-950/20",
            slate: "border-slate-200 dark:border-slate-800"
        },
        shieldIcon: {
            red: "text-red-200 dark:text-red-900",
            blue: "text-blue-200 dark:text-blue-900",
            slate: "text-slate-100 dark:text-slate-800"
        },
        titleText: {
            red: "text-red-600 dark:text-red-400",
            blue: "text-blue-600 dark:text-blue-400",
            slate: "text-slate-400"
        },
        valueText: {
            red: "text-red-700 dark:text-red-300",
            blue: "text-blue-700 dark:text-blue-300",
            slate: "text-slate-800 dark:text-slate-100"
        },
        labelText: {
            red: "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200",
            blue: "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
            slate: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        }
    };

    return (
        <TooltipProvider delayDuration={200}>
            <div className={cn("space-y-4", className)}>
                <div className="grid grid-cols-3 gap-3">
                    {/* Armor Class */}
                    <div className={cn(
                        "bg-white dark:bg-slate-900 rounded-xl p-2 flex flex-col items-center justify-center gap-0.5 border shadow-sm relative overflow-hidden min-h-[90px]",
                        themeClasses.border[theme]
                    )}>
                        <Shield className={cn("w-12 h-12 absolute -bottom-2 -right-2 opacity-50", themeClasses.shieldIcon[theme])} />

                        <div className={cn("text-[10px] font-bold uppercase w-full text-center tracking-widest z-10", themeClasses.titleText[theme])}>
                            AC {hasPenalty && "(!)"}
                        </div>

                        <div className={cn("text-3xl font-black z-10 leading-none -mt-1", themeClasses.valueText[theme])}>
                            {ac}
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={cn("text-[8px] font-medium z-10 px-1.5 py-0.5 rounded uppercase tracking-tight max-w-full truncate mt-1 cursor-help", themeClasses.labelText[theme])}>
                                    {finalLabel}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs font-bold">{finalLabel}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Initiative */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-2 flex flex-col items-center justify-center gap-1 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[90px]">
                        <div className="text-[10px] font-bold uppercase text-slate-400 w-full text-center tracking-widest">Init</div>
                        <div className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-none">
                            {initiative >= 0 ? '+' : ''}{initiative}
                        </div>
                    </div>

                    {/* Speed */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-2 flex flex-col items-center justify-center gap-1 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[90px]">
                        <div className="text-[10px] font-bold uppercase text-slate-400 w-full text-center tracking-widest">Speed</div>
                        <div className="flex flex-col items-center leading-none">
                            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{speed}</span>
                            <span className="text-[10px] text-slate-400 lowercase -mt-1">ft.</span>
                        </div>
                    </div>
                </div>

                {/* Saving Throws */}
                {saves.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider">Saving Throws</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {saves.map(save => {
                                const { ability, total, isProficient, hasBonus } = save;
                                const isManual = character?.proficiencies?.savingThrows?.[ability] === true;
                                // Check if proficient but NOT manual (means derived from Class/Feat)
                                const isClassOrOther = isProficient && !isManual;

                                return (
                                    <div
                                        key={ability}
                                        className="flex flex-col items-center p-2 border rounded-md text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group relative"
                                        onClick={() => handleToggleSave(ability)}
                                    >
                                        {/* Proficiency Indicator */}
                                        <div className="flex items-center justify-center mb-1 text-slate-300 group-hover:text-slate-400">
                                            {isProficient ? (
                                                <Check
                                                    size={14}
                                                    className={cn(
                                                        "font-bold",
                                                        isClassOrOther
                                                            ? "text-primary"
                                                            : "text-amber-500 dark:text-amber-400"
                                                    )}
                                                />
                                            ) : (
                                                <Circle size={12} />
                                            )}
                                        </div>

                                        <div className="text-[10px] uppercase font-bold text-muted-foreground">{ability}</div>
                                        <div className={cn(
                                            "text-lg font-bold leading-none my-1",
                                            isClassOrOther && "text-primary",
                                            isManual && "text-amber-600 dark:text-amber-400"
                                        )}>
                                            {total >= 0 ? `+${total}` : total}
                                        </div>

                                        {/* Bonus Dot */}
                                        {hasBonus && (
                                            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" title="Bonus from Item/Feat" />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}
