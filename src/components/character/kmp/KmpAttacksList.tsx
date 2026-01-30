"use client";

import React from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { cn } from "@/lib/utils";
import { Sword, Flame } from "lucide-react";

export function KmpAttacksList() {
    const { state, viewModel } = useKmpCharacter();
    const character = state?.character;
    const inventory = state?.resolvedItems || [];
    const spells = state?.resolvedSpells || [];

    if (!character) return null;

    const { str, dex, int, wis, cha, classes } = character;

    // Derived Stats
    const getMod = (score: number) => Math.floor((score - 10) / 2);
    const strMod = getMod(str);
    const dexMod = getMod(dex);
    const intMod = getMod(int);
    const wisMod = getMod(wis);
    const chaMod = getMod(cha);

    // Determine Spellcasting Ability (Simplified)
    const primaryClassId = classes?.[0]?.classId || "wizard";
    let spellMod = intMod;
    if (["cleric", "druid", "ranger"].includes(primaryClassId)) spellMod = wisMod;
    if (["bard", "sorcerer", "warlock", "paladin"].includes(primaryClassId)) spellMod = chaMod;

    // Proficiency Bonus
    const level = character.level || 1;
    const proficiencyBonus = Math.ceil(level / 4) + 1;

    // Filter Weapons
    const weapons = inventory.filter((entry: any) =>
        (entry.item.type.toLowerCase().includes("weapon") || entry.item.type.toLowerCase().includes("sword") || entry.item.type.toLowerCase().includes("axe") || entry.item.type.toLowerCase().includes("bow")) &&
        entry.equipped
    );

    // Filter Attack Types Spells
    const attackSpells = spells.filter((s: any) => {
        const spell = s.spell;
        if (!spell) return false;

        // Tags check might be needed if they are on the model
        // Assuming spell.level 0 is cantrip
        const isCantrip = spell.level === 0;
        const isAttackTag = spell.tags?.includes("attack");

        if (isCantrip) return true;
        if (isAttackTag && s.prepared) return true;
        return s.prepared === true && (spell.description.toLowerCase().includes("damage") || spell.description.toLowerCase().includes("attack"));
    });

    return (
        <div className="space-y-2">
            {weapons.length === 0 && attackSpells.length === 0 && (
                <div className="text-sm text-slate-500 italic p-2 text-center">No attacks available.</div>
            )}

            {/* Weapons */}
            {weapons.map((entry: any) => {
                const item = entry.item;
                const isFinesse = item.description.toLowerCase().includes("finesse");
                const isRanged = item.type.toLowerCase().includes("ranged") || item.type.toLowerCase().includes("bow") || item.type.toLowerCase().includes("crossbow");

                // Attack Stat Logic
                const useDex = isRanged || (isFinesse && dexMod > strMod);
                const mod = useDex ? dexMod : strMod;

                const isProficient = viewModel?.isProficient(entry) ?? false;
                const hitBonus = mod + (isProficient ? proficiencyBonus : 0);

                // Damage Dice Heuristic (if not explicit fields)
                // Assuming item.description contains '1d8' etc if not processed
                // But InventoryItem might not have dedicated damageDice field on shared model? 
                // Let's check shared model... 'item' has 'description'.
                // 'Item' class on shared model: id, name, type, rarity, weight, cost, desc, tags.
                // It does NOT have damageDice explicitly.
                const damageMatch = item.description.match(/(\d+d\d+)/);
                const damageDice = damageMatch ? damageMatch[1] : "1d?";
                const damageType = "physical"; // flexible

                return (
                    <div key={entry.instanceId} className={cn(
                        "p-3 border rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition group",
                        !isProficient ? "border-amber-200 dark:border-amber-800 ring-1 ring-amber-100 dark:ring-amber-900/20" : "border-slate-200 dark:border-slate-700"
                    )}>
                        <div className="flex justify-between items-center mb-1">
                            <div className="font-bold flex items-center gap-2">
                                <Sword size={14} className={isProficient ? "text-slate-400" : "text-amber-500"} />
                                {item.name}
                                {!isProficient && (
                                    <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 px-1 py-0.5 rounded uppercase font-bold tracking-tight">Not Proficient</span>
                                )}
                            </div>
                            <div className="text-xs font-mono uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 flex items-center gap-1">
                                {isFinesse ? 'Finesse' : ''} {isRanged ? 'Ranged' : 'Melee'}
                            </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 text-xs font-bold uppercase">Hit</span>
                                <span className={cn("font-bold", !isProficient ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white")}>
                                    {hitBonus >= 0 ? '+' : ''}{hitBonus}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 text-xs font-bold uppercase">Dmg</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {damageDice} {mod !== 0 ? (mod > 0 ? `+ ${mod}` : `- ${Math.abs(mod)}`) : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Spells */}
            {attackSpells.map((entry: any) => {
                const spell = entry.spell;
                const hitBonus = spellMod + proficiencyBonus;
                const dmgMatch = spell.description?.match(/(\d+d\d+)/);
                const dmgDice = dmgMatch ? dmgMatch[1] : "?";

                return (
                    <div key={entry.spell.id} className="p-3 border rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition group border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-1">
                            <div className="font-bold flex items-center gap-2">
                                <Flame size={14} className="text-amber-500" />
                                {spell.name}
                            </div>
                            <div className="text-xs font-mono uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                                Spell
                            </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 text-xs font-bold uppercase">Hit</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {hitBonus >= 0 ? '+' : ''}{hitBonus}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 text-xs font-bold uppercase">Dmg</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {dmgDice}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
