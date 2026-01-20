"use client";

import React, { useState } from "react";
import { useCharacterStore } from "@/store/character-store";
import { Shield, Footprints, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

interface CombatStatsProps {
    dexScore: number;
    className?: string;
}

export function CombatStats({ dexScore, className }: CombatStatsProps) {
    const {
        armorClass, speed, initiativeBonus, inventory,
        setArmorClass, setSpeed, setInitiativeBonus,
        getArmorClass, getAbilityScore, isProficient
    } = useCharacterStore();

    const [editingAC, setEditingAC] = useState(false);
    const [editingInit, setEditingInit] = useState(false);
    const [editingSpeed, setEditingSpeed] = useState(false);

    // Dynamic Stats
    const currentDex = getAbilityScore ? getAbilityScore('dex') : dexScore;
    const dexMod = Math.floor((currentDex - 10) / 2);

    // UI Label Helper (still needs inventory to know names)
    const equippedArmor = inventory.find(i => i.equipped && i.item?.category === 'armor' && i.item?.slot !== 'off_hand');
    const equippedShield = inventory.find(i => i.equipped && (i.item?.category === 'armor' || i.item?.type.toLowerCase().includes('shield')) && (i.item?.slot === 'off_hand' || i.item?.type.toLowerCase().includes('shield')));

    // getArmorClass now returns { value, isProficient } or fallback to legacy number
    const acResult = getArmorClass ? getArmorClass() : { value: 10 + dexMod, isProficient: true };
    const calculatedAC = typeof acResult === 'number' ? acResult : acResult.value;
    const acProficient = typeof acResult === 'number' ? true : acResult.isProficient;
    const currentAC = armorClass ?? calculatedAC;

    // Proficiency Check - use the built-in check from getArmorClass
    const hasWarning = !acProficient;

    // Initiative
    const totalInit = dexMod + initiativeBonus;

    const shieldActive = !!equippedShield;

    return (
        <div className={cn("grid grid-cols-3 gap-3", className)}>
            {/* Armor Class */}
            <div className={cn(
                "relative group bg-slate-100 dark:bg-slate-800 rounded-xl p-3 flex flex-col items-center justify-center border-2 min-h-[100px]",
                hasWarning ? "border-red-500 bg-red-50 dark:bg-red-900/10" : "border-slate-200 dark:border-slate-700"
            )}>
                {hasWarning && (
                    <div className="absolute top-1 right-1 text-red-500 animate-pulse" title="Not Proficient! Attacks/Spells compromised.">
                        <Shield className="w-5 h-5 fill-red-500 stroke-red-600" />
                    </div>
                )}
                {!hasWarning && shieldActive && (
                    <Shield className="w-5 h-5 absolute top-2 right-2 text-amber-500 opacity-80" />
                )}
                {!shieldActive && <Shield className="w-8 h-8 text-slate-400 absolute opacity-10" />}

                <div className="text-xs font-bold uppercase text-slate-500 mb-1 z-10 mt-1">Armor Class</div>
                <div className="text-3xl font-bold bg-white dark:bg-slate-900 rounded-full w-12 h-12 flex items-center justify-center shadow-sm z-10 border border-slate-100 dark:border-slate-800 mb-1">
                    {editingAC ? (
                        <input
                            type="number"
                            className="w-10 text-center bg-transparent border-none focus:ring-0 p-0 text-xl font-bold"
                            value={armorClass ?? ''}
                            placeholder={calculatedAC.toString()}
                            onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : null;
                                // Auto-reset override if value matches calculated
                                if (val === calculatedAC) {
                                    setArmorClass(null);
                                } else {
                                    setArmorClass(val);
                                }
                            }}
                            onBlur={() => setEditingAC(false)}
                            autoFocus
                        />
                    ) : (
                        <span onClick={() => setEditingAC(true)} className="cursor-pointer select-none" title="Click to Edit Override">
                            {currentAC}
                        </span>
                    )}
                </div>
                {armorClass !== null && (
                    <div className="text-[10px] text-amber-600 font-bold absolute bottom-1">Overridden</div>
                )}
                {!editingAC && armorClass === null && (
                    <div className="text-[9px] text-slate-400 absolute bottom-1 w-full text-center px-1 leading-tight" title={`${equippedArmor ? equippedArmor.item.name : 'Unarmored'} ${equippedShield ? '+ Shield' : ''}`}>
                        <span className="block truncate">{equippedArmor ? (equippedArmor.item.name.length > 15 ? equippedArmor.item.name.substring(0, 12) + '...' : equippedArmor.item.name) : 'Unarmored'}</span>
                        {equippedShield && <span className="block text-[8px]">+ Shield</span>}
                    </div>
                )}
            </div>

            {/* Initiative */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-3 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                <Wind className="w-5 h-5 text-slate-400 mb-1" />
                <div className="text-[10px] font-bold uppercase text-slate-500">Initiative</div>
                <div className="text-2xl font-bold z-10">
                    {editingInit ? (
                        <input
                            type="number"
                            className="w-12 text-center bg-slate-50 dark:bg-slate-800 border rounded focus:ring-1 focus:ring-blue-500 p-0 text-lg font-bold"
                            value={initiativeBonus}
                            onChange={(e) => setInitiativeBonus(parseInt(e.target.value) || 0)}
                            onBlur={() => setEditingInit(false)}
                            autoFocus
                        />
                    ) : (
                        <span onClick={() => setEditingInit(true)} className="cursor-pointer select-none border-b border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400" title="Click to Edit Bonus">
                            {totalInit >= 0 ? '+' : ''}{totalInit}
                        </span>
                    )}
                </div>
                {!editingInit && (
                    <div className="text-[10px] text-slate-400">
                        Dex {dexMod >= 0 ? '+' : ''}{dexMod}
                        {initiativeBonus !== 0 && <span className="text-blue-500 font-bold mx-1">+{initiativeBonus}</span>}
                    </div>
                )}
            </div>

            {/* Speed */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-3 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:border-green-200 dark:hover:border-green-800 transition-colors">
                <Footprints className="w-5 h-5 text-slate-400 mb-1" />
                <div className="text-[10px] font-bold uppercase text-slate-500">Speed</div>
                <div className="text-2xl font-bold z-10">
                    {editingSpeed ? (
                        <input
                            type="number"
                            className="w-12 text-center bg-slate-50 dark:bg-slate-800 border rounded focus:ring-1 focus:ring-green-500 p-0 text-lg font-bold"
                            step="5"
                            value={speed}
                            onChange={(e) => setSpeed(parseInt(e.target.value) || 0)}
                            onBlur={() => setEditingSpeed(false)}
                            autoFocus
                        />
                    ) : (
                        <span onClick={() => setEditingSpeed(true)} className="cursor-pointer select-none border-b border-dashed border-slate-300 dark:border-slate-600 hover:border-green-400" title="Click to Edit">
                            {speed}
                        </span>
                    )}
                </div>
                <div className="text-[10px] text-slate-400">ft.</div>
            </div>
        </div>
    );
}
