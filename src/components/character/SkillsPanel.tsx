"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check, Circle } from "lucide-react";
import { useCharacterStore } from "@/store/character-store";

// Full configured skill list with associated abilities
const ALL_SKILLS = [
    { name: "Acrobatics", ability: "dex", key: "acrobatics" },
    { name: "Animal Handling", ability: "wis", key: "animal_handling" },
    { name: "Arcana", ability: "int", key: "arcana" },
    { name: "Athletics", ability: "str", key: "athletics" },
    { name: "Deception", ability: "cha", key: "deception" },
    { name: "History", ability: "int", key: "history" },
    { name: "Insight", ability: "wis", key: "insight" },
    { name: "Intimidation", ability: "cha", key: "intimidation" },
    { name: "Investigation", ability: "int", key: "investigation" },
    { name: "Medicine", ability: "wis", key: "medicine" },
    { name: "Nature", ability: "int", key: "nature" },
    { name: "Perception", ability: "wis", key: "perception" },
    { name: "Performance", ability: "cha", key: "performance" },
    { name: "Persuasion", ability: "cha", key: "persuasion" },
    { name: "Religion", ability: "int", key: "religion" },
    { name: "Sleight of Hand", ability: "dex", key: "sleight_of_hand" },
    { name: "Stealth", ability: "dex", key: "stealth" },
    { name: "Survival", ability: "wis", key: "survival" },
] as const;

interface SkillsPanelProps {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
    className?: string;
}

export function SkillsPanel({
    str, dex, con, int, wis, cha,
    className
}: SkillsPanelProps) {
    const {
        proficiencies,
        proficiencyBonus,
        toggleSkill,
        inventory,
        feats,
        traits,
        background,
        raceEntry,
        getAbilityScore
    } = useCharacterStore();

    // Helper to get ability mod
    const getMod = (score: number) => Math.floor((score - 10) / 2);

    // Collect skill bonuses from all modifier sources
    const getSkillBonuses = (skillKey: string) => {
        let bonus = 0;
        let hasProficiencyFromMods = false;
        let hasExpertiseFromMods = false;

        // Helper to check modifiers from a source
        const checkModifiers = (modifiers: any[]) => {
            if (!modifiers || !Array.isArray(modifiers)) return;

            for (const mod of modifiers) {
                if (!mod.target) continue;
                const target = mod.target.toLowerCase();

                // Check if modifier targets this skill (by key or partial match)
                if (target === skillKey || target === skillKey.replace('_', ' ')) {
                    if (mod.type === 'bonus') {
                        bonus += (typeof mod.value === 'number' ? mod.value : 0);
                    } else if (mod.type === 'skill_proficiency') {
                        hasProficiencyFromMods = true;
                    } else if (mod.type === 'expertise') {
                        hasExpertiseFromMods = true;
                    }
                }
            }
        };

        // Check equipped items (that don't require attunement or are attuned)
        for (const entry of inventory || []) {
            if (entry.equipped && entry.item) {
                if (!entry.item.requiresAttunement || entry.isAttuned) {
                    checkModifiers(entry.item.modifiers);
                }
            }
        }

        // Check feats
        for (const feat of feats || []) {
            checkModifiers(feat.modifiers);
        }

        // Check traits
        for (const trait of traits || []) {
            checkModifiers(trait.modifiers);
        }

        // Check background
        if (background?.modifiers) {
            checkModifiers(background.modifiers);
        }

        // Check race
        if (raceEntry?.modifiers) {
            checkModifiers(raceEntry.modifiers);
        }

        return { bonus, hasProficiencyFromMods, hasExpertiseFromMods };
    };

    const getSkillModifier = (skillName: string, ability: string, skillKey: string) => {
        // Use getAbilityScore for dynamic ability score (includes item/feat modifiers)
        const abilityScore = getAbilityScore ? getAbilityScore(ability) : ({ str, dex, con, int, wis, cha }[ability] || 10);
        const abilityMod = getMod(abilityScore);
        const proficiencyState = proficiencies?.skills?.[skillName];

        // Get bonuses from items/feats
        const { bonus, hasProficiencyFromMods, hasExpertiseFromMods } = getSkillBonuses(skillKey);

        let total = abilityMod + bonus;

        // Check proficiency (from manual toggle OR from modifiers)
        const isProficient = proficiencyState === true || hasProficiencyFromMods;
        const isExpertise = proficiencyState === "expertise" || hasExpertiseFromMods;

        if (isExpertise) {
            total += (proficiencyBonus * 2);
        } else if (isProficient) {
            total += proficiencyBonus;
        }

        return { total, isProficient, isExpertise, hasBonus: bonus > 0 };
    };

    return (
        <div className={cn("flex flex-col gap-1 text-sm", className)}>
            <div className="grid grid-cols-[20px_1fr_30px] border-b pb-1 mb-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>P</span>
                <span>Skill</span>
                <span className="text-right">Mod</span>
            </div>
            {ALL_SKILLS.map((skill) => {
                const { total, isProficient, isExpertise, hasBonus } = getSkillModifier(skill.name, skill.ability, skill.key);
                const proficiencyState = proficiencies?.skills?.[skill.name];

                return (
                    <div
                        key={skill.name}
                        className="grid grid-cols-[20px_1fr_30px] items-center hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-1 py-1 transition-colors cursor-pointer group"
                        onClick={() => toggleSkill(skill.name)}
                    >
                        <div className="flex items-center justify-center text-slate-300 group-hover:text-slate-400 relative">
                            {isExpertise ? (
                                <div className="relative">
                                    <Check size={14} className="text-purple-600 dark:text-purple-400 font-bold absolute -left-[2px]" />
                                    <Check size={14} className="text-purple-600 dark:text-purple-400 font-bold absolute -left-[6px]" />
                                </div>
                            ) : isProficient ? (
                                <Check size={14} className="text-green-500 font-bold" />
                            ) : (
                                <Circle size={12} />
                            )}
                        </div>
                        <div className={cn(
                            "font-medium transition-colors ml-1",
                            isExpertise ? "text-purple-700 dark:text-purple-300 font-bold"
                                : isProficient ? "text-slate-900 dark:text-white font-bold"
                                    : "text-slate-700 dark:text-slate-300"
                        )}>
                            {skill.name}
                            <span className="text-[10px] text-slate-400 ml-1 font-normal uppercase">({skill.ability})</span>
                            {hasBonus && <span className="text-[9px] text-amber-500 ml-1 font-bold">★</span>}
                        </div>
                        <div className={cn(
                            "text-right font-mono font-bold",
                            hasBonus ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
                        )}>
                            {total >= 0 ? '+' : ''}{total}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

