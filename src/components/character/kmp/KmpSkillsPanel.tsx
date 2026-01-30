"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";

// Define the interface locally if not available via shared exports yet
interface ResolvedSkill {
    name: string;
    key: string;
    ability: string;
    total: number;
    isProficient: boolean;
    isExpertise: boolean;
    hasBonus: boolean;
    passive: number;
}

export function KmpSkillsPanel({ className }: { className?: string }) {
    const { viewModel, state } = useKmpCharacter();
    const skills = (state?.resolvedSkills || []) as ResolvedSkill[];

    const handleToggleSkill = (skill: ResolvedSkill) => {
        if (!viewModel || !state?.character) return;

        let nextState = "proficient";
        if (skill.isExpertise) {
            nextState = "none";
        } else if (skill.isProficient) {
            nextState = "expertise";
        }

        // Optimistic update handled by ViewModel if efficient, otherwise rely on eventual consistency
        viewModel.updateCharacterSkill(skill.name, nextState);
    };

    if (!state?.character || skills.length === 0) {
        return <div className="text-sm text-slate-500 p-4">Loading Skills...</div>;
    }

    return (
        <div className={cn("flex flex-col gap-px text-sm bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800", className)}>
            {skills.map((skill) => {
                const { name, total, isProficient, isExpertise, hasBonus, ability } = skill;
                const abilityLabel = ability.toUpperCase();

                return (
                    <div
                        key={name}
                        onClick={() => handleToggleSkill(skill)}
                        className={cn(
                            "grid grid-cols-[24px_1fr_40px] items-center px-3 py-2 cursor-pointer group transition-colors relative select-none",
                            "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800",
                            (isProficient || isExpertise) && "bg-slate-50/50 dark:bg-slate-800/20"
                        )}
                    >
                        {/* Proficiency Marker */}
                        <div className="flex items-center justify-center relative">
                            {isExpertise ? (
                                <div className="relative text-purple-600 dark:text-purple-400">
                                    <Check size={14} strokeWidth={4} className="absolute -left-[3px]" />
                                    <Check size={14} strokeWidth={4} className="absolute -left-[7px] opacity-50" />
                                </div>
                            ) : isProficient ? (
                                <div className="bg-indigo-600 text-white rounded-full p-[2px]">
                                    <Check size={10} strokeWidth={4} />
                                </div>
                            ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300 transition-colors" />
                            )}
                        </div>

                        {/* Skill Name */}
                        <div className="flex flex-col justify-center ml-2 leading-none">
                            <span className={cn(
                                "font-medium text-[13px]",
                                (isProficient || isExpertise) ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                            )}>
                                {name}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[9px] text-slate-400 uppercase tracking-wide font-bold">{abilityLabel}</span>
                                {hasBonus && <span className="text-[9px] text-amber-500 font-bold">★ ITEM</span>}
                                {state?.hasArmorPenalty && (ability === 'str' || ability === 'dex') && (
                                    <span className="text-[9px] bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-1 rounded font-bold ml-1">
                                        Dis
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Modifier */}
                        <div className={cn(
                            "text-right font-mono font-bold text-sm",
                            isExpertise ? "text-purple-600 dark:text-purple-400"
                                : isProficient ? "text-indigo-600 dark:text-indigo-400"
                                    : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                        )}>
                            {total >= 0 ? '+' : ''}{total}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
