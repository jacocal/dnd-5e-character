"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Dices, Zap } from "lucide-react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";

interface ResolvedSkill {
    name: string;
    key: string;
    ability: string;
    total: number;
    isProficient: boolean;
    isExpertise: boolean;
    hasBonus: boolean;
    passive: number;
    advantageState?: string;
}

type SkillFilter = "all" | "proficient" | "physical" | "mental";

export function KmpSkillsPanel({ className }: { className?: string }) {
    const { viewModel, state, openRollComposer, executeInstantRoll } = useKmpCharacter();
    const [filter, setFilter] = useState<SkillFilter>("all");
    const skills = (state?.resolvedSkills || []) as ResolvedSkill[];

    const handleToggleSkill = (skill: ResolvedSkill) => {
        if (!viewModel || !state?.character) return;

        let nextState = "proficient";
        if (skill.isExpertise) {
            nextState = "none";
        } else if (skill.isProficient) {
            nextState = "expertise";
        }

        viewModel.updateCharacterSkill(skill.name, nextState);
    };

    const handleInstantRoll = (e: React.MouseEvent, skill: ResolvedSkill) => {
        e.stopPropagation();
        executeInstantRoll({
            rollType: "skill",
            targetId: skill.key,
            advantageMode: (skill.advantageState as any) || "NORMAL",
            label: `${skill.name} (${skill.ability.toUpperCase()}) Check`
        });
    };

    const handleOpenComposer = (e: React.MouseEvent, skill: ResolvedSkill) => {
        e.stopPropagation();
        openRollComposer({
            rollType: "skill",
            targetId: skill.key,
            advantageMode: (skill.advantageState as any) || "NORMAL",
            label: `${skill.name} (${skill.ability.toUpperCase()}) Check`
        });
    };

    if (!state?.character || skills.length === 0) {
        return <div className="text-sm text-slate-500 p-4">Loading Skills...</div>;
    }

    const filteredSkills = skills.filter((s) => {
        if (filter === "proficient") return s.isProficient || s.isExpertise;
        if (filter === "physical") return s.ability === "str" || s.ability === "dex";
        if (filter === "mental") return s.ability === "int" || s.ability === "wis" || s.ability === "cha";
        return true;
    });

    const profCount = skills.filter((s) => s.isProficient || s.isExpertise).length;

    return (
        <div className={cn("space-y-2.5", className)}>
            {/* Skill Filter Pills */}
            <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
                {(
                    [
                        { id: "all", label: `All (${skills.length})` },
                        { id: "proficient", label: `★ Prof (${profCount})` },
                        { id: "physical", label: "STR/DEX" },
                        { id: "mental", label: "INT/WIS/CHA" }
                    ] as Array<{ id: SkillFilter; label: string }>
                ).map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFilter(tab.id)}
                        className={cn(
                            "flex-1 py-1 px-2 rounded-md text-[10px] font-bold transition-all whitespace-nowrap",
                            filter === tab.id
                                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-px text-sm bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                {filteredSkills.map((skill) => {
                    const { name, total, isProficient, isExpertise, hasBonus, ability, passive, advantageState } = skill;
                    const abilityLabel = ability.toUpperCase();

                    return (
                        <div
                            key={name}
                            onClick={() => handleToggleSkill(skill)}
                            title={`Click row to cycle ${name} Proficiency (None → Proficient → Expertise)`}
                            className={cn(
                                "grid grid-cols-[22px_1fr_auto] items-center px-2.5 py-2 cursor-pointer group transition-colors relative select-none",
                                "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80",
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
                                    <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-400 transition-colors" />
                                )}
                            </div>

                            {/* Skill Name + Ability + Passive */}
                            <div className="flex flex-col justify-center ml-1.5 leading-none min-w-0">
                                <span
                                    className={cn(
                                        "font-medium text-[13px] truncate",
                                        isProficient || isExpertise
                                            ? "text-slate-900 dark:text-white"
                                            : "text-slate-600 dark:text-slate-400"
                                    )}
                                >
                                    {name}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] text-slate-400 uppercase tracking-wide font-bold">
                                        {abilityLabel}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-mono">
                                        Pass {passive}
                                    </span>
                                    {hasBonus && <span className="text-[9px] text-amber-500 font-bold">★ MOD</span>}
                                    {advantageState === "ADVANTAGE" && (
                                        <span className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 px-1 rounded font-bold">
                                            Adv
                                        </span>
                                    )}
                                    {advantageState === "DISADVANTAGE" && (
                                        <span className="text-[9px] bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-1 rounded font-bold">
                                            Dis
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Dual Roll Buttons: ⚡ 1-Click Auto-Roll & 🎲 Open Composer */}
                            <div className="ml-2 flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={(e) => handleInstantRoll(e, skill)}
                                    title={`1-Click Instant Roll ${name} Check`}
                                    className={cn(
                                        "px-2 py-1 rounded-md font-mono font-bold text-xs flex items-center gap-1 border transition-colors",
                                        isExpertise
                                            ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-600 hover:text-white"
                                            : isProficient
                                            ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white"
                                            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-500"
                                    )}
                                >
                                    <Zap className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                    <span>{total >= 0 ? `+${total}` : total}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => handleOpenComposer(e, skill)}
                                    title={`Configure ${name} Check in Roll Composer (Physical Dice / Guidance / Bardic)`}
                                    className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                                >
                                    <Dices className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
