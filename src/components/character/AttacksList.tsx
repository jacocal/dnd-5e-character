"use client";

import React from "react";
import { useCharacterStore } from "@/store/character-store";
import { cn } from "@/lib/utils";
import { Sword, Flame, Dices } from "lucide-react";

export function AttacksList() {
    const { inventory, spells, str, dex, int, wis, cha, classes, isProficient } = useCharacterStore();

    // Derived Stats
    const strMod = Math.floor((str - 10) / 2);
    const dexMod = Math.floor((dex - 10) / 2);
    const intMod = Math.floor((int - 10) / 2);
    const wisMod = Math.floor((wis - 10) / 2);
    const chaMod = Math.floor((cha - 10) / 2);

    // Determine Spellcasting Ability (Simplified based on first class)
    // TODO: support multiclass
    const primaryClass = classes?.[0]?.classId || "wizard";
    let spellMod = intMod; // Default Wizard
    if (["cleric", "druid", "ranger"].includes(primaryClass)) spellMod = wisMod;
    if (["bard", "sorcerer", "warlock", "paladin"].includes(primaryClass)) spellMod = chaMod;

    // Proficiency Bonus (Level 1-4 = +2, 5-8 = +3, etc)
    const level = classes?.[0]?.level || 1;
    const proficiencyBonus = Math.ceil(level / 4) + 1;

    // Filter Weapons
    const weapons = inventory.filter(entry =>
        (entry.item.category === "weapon" || entry.item.type.toLowerCase().includes("weapon")) &&
        entry.equipped
    );

    // Filter Attack Types Spells (Cantrips mainly, or spells with 'spell attack')
    const attackSpells = spells.filter(s => {
        const spell = s.spell; // Access nested spell object
        if (!spell) return false;

        // Logic:
        // 1. Cantrips (Level 0) tagged as "attack" are always shown (always available if known).
        // 2. Level 1+ spells tagged as "attack" MUST be Prepared to show up here.
        // 3. Any other spell explicitly prepared is shown (e.g. if user prepares "Light" manual override)

        const isAttackTag = spell.tags?.includes("attack");
        const isCantrip = spell.level === 0;

        if (isCantrip && isAttackTag) return true;
        if (isAttackTag && s.prepared) return true;

        // Also show non-attacks if they are explicitly prepared (User intent to use)
        // Actually, user only wants Attacks in this specific list usually, but let's allow "Prepared" to override.
        return s.prepared === true;
    });

    return (
        <div className="space-y-2">
            {weapons.length === 0 && attackSpells.length === 0 && (
                <div className="text-sm text-slate-500 italic p-2 text-center">No attacks available.</div>
            )}

            {/* Weapons */}
            {weapons.map(entry => {
                const item = entry.item;
                const isFinesse = item.properties?.includes("finesse") || item.description?.toLowerCase().includes("finesse");
                const isRanged = item.properties?.includes("thrown") || item.type.toLowerCase().includes("ranged") || item.description?.toLowerCase().includes("range");

                // Attack Stat Logic
                const useDex = isRanged || (isFinesse && dexMod > strMod);
                const mod = useDex ? dexMod : strMod;

                // Proficient Check
                const hasProficiency = isProficient ? isProficient(item) : true;
                const hitBonus = mod + (hasProficiency ? proficiencyBonus : 0);

                const damageDice = item.damageDice || "1d?";
                const damageType = item.damageType || "physical";

                return (
                    <div key={entry.id} className="p-3 border rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition group border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-1">
                            <div className="font-bold flex items-center gap-2">
                                <Sword size={14} className="text-slate-400" />
                                {item.name}
                            </div>
                            <div className="text-xs font-mono uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 flex items-center gap-1">
                                {!hasProficiency && <span className="text-red-500 font-bold" title="Not Proficient">⚠️</span>}
                                {isFinesse ? 'Finesse' : ''} {isRanged ? 'Ranged' : 'Melee'}
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
                                    {damageDice} {mod !== 0 ? (mod > 0 ? `+ ${mod}` : `- ${Math.abs(mod)}`) : ''}
                                </span>
                            </div>
                            <div className="ml-auto text-xs text-slate-400 capitalize">
                                {damageType}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Spells */}
            {attackSpells.map(entry => {
                const spell = entry.spell;
                const hitBonus = spellMod + proficiencyBonus;
                // Heuristic for damage: First XdY match in desc
                const dmgMatch = spell.description?.match(/(\d+d\d+)/);
                const dmgDice = dmgMatch ? dmgMatch[1] : "?";

                return (
                    <div key={entry.spellId} className="p-3 border rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition group border-slate-200 dark:border-slate-700">
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
