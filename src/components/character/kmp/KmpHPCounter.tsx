"use client";

import React, { useState } from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Activity,
    Dice6,
    Shield,
    Skull,
    Zap,
    X
} from "lucide-react";

// Displays hit dice by class with remaining counts & selectable multiclass chips
function HitDiceByClass({
    classes,
    selectedClassId,
    onSelectClass
}: {
    classes: any[];
    selectedClassId: string;
    onSelectClass: (classId: string) => void;
}) {
    if (!classes || classes.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1 text-[10px] text-slate-500 mb-1">
            {classes.map((c: any, i: number) => {
                const hitDie = c.hitDie || 8;
                const level = c.level || 1;
                const used = Math.min(level, Math.max(0, c.hitDiceUsed || 0));
                const remaining = Math.max(0, level - used);
                const rawName = c.className || c.classId || "???";
                const name = rawName.substring(0, 3).toUpperCase();
                const isSelected = c.classId === selectedClassId;
                const isMulticlass = classes.length > 1;

                return (
                    <button
                        key={c.classId || i}
                        type="button"
                        disabled={!isMulticlass || remaining <= 0}
                        onClick={() => isMulticlass && remaining > 0 && onSelectClass(c.classId)}
                        title={`${rawName}: ${remaining}/${level} d${hitDie} Hit Dice available${isMulticlass ? " (click to select die)" : ""}`}
                        className={cn(
                            "flex items-center gap-0.5 rounded px-1 py-0.5 transition-colors",
                            isMulticlass && remaining > 0 && "cursor-pointer",
                            isSelected && isMulticlass
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40"
                                : remaining <= 0
                                  ? "opacity-45 line-through"
                                  : "hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                        )}
                    >
                        <Dice6 size={10} className={isSelected && isMulticlass ? "text-emerald-500" : "text-slate-400"} />
                        <span className="font-mono font-bold">
                            {remaining}/{level}d{hitDie}
                        </span>
                        <span className="text-slate-400 uppercase">{name}</span>
                    </button>
                );
            })}
        </div>
    );
}

interface KmpHPCounterProps {
    className?: string;
}

export function KmpHPCounter({ className }: KmpHPCounterProps) {
    const { viewModel, state, openRollComposer, executeInstantRoll } = useKmpCharacter();
    const [amount, setAmount] = useState<number>(1);
    const [damageType, setDamageType] = useState<string>("physical");
    const [selectedHitDieClassId, setSelectedHitDieClassId] = useState<string>("");

    if (!state || !state.character) return null;

    const char = state.character;
    const charClasses: any[] = char.classes || [];
    const activeHitDieClass =
        charClasses.find((c: any) => c.classId === selectedHitDieClassId && (c.level || 1) - (c.hitDiceUsed || 0) > 0) ||
        charClasses.find((c: any) => (c.level || 1) - (c.hitDiceUsed || 0) > 0) ||
        charClasses[0];
    const effectiveHitDieClassId = activeHitDieClass?.classId || "hit_die";
    const effectiveHitDieSides = activeHitDieClass?.hitDie || 8;
    const effectiveHitDieClassName = activeHitDieClass?.className || activeHitDieClass?.classId || "Class";

    // Extract Values - HP is managed by ViewModel including active effect bonuses
    const hpCurrent = char.hpCurrent;
    const hpMax = char.hpMax;
    const tempHp = char.tempHp;

    const hitDiceCurrent = char.hitDiceCurrent;
    const hitDiceMax = char.hitDiceMax;
    const deathSaveSuccess = char.deathSaveSuccess;
    const deathSaveFailure = char.deathSaveFailure;
    const inspiration = char.inspiration;
    const exhaustion = char.exhaustion;

    // Actions
    const handleDamage = () => {
        viewModel.takeDamage(amount, damageType);
        setAmount(1);
    };

    const handleHeal = () => {
        viewModel.heal(amount);
        setAmount(1);
    };

    const handleTempHp = () => {
        viewModel.setTempHp(tempHp + amount);
        setAmount(1);
    };

    // Calculate effective max (Tough feat logic is in VM via getEffectiveMaxHp)
    const effectiveMaxHp = viewModel.getEffectiveMaxHp();
    const effectiveMax = Math.max(effectiveMaxHp, hpCurrent + tempHp);
    const hpPercent = effectiveMax > 0 ? (hpCurrent / effectiveMax) * 100 : 0;
    const tempHpPercent = effectiveMax > 0 ? (tempHp / effectiveMax) * 100 : 0;

    const isDying = hpCurrent === 0;

    return (
        <div className={cn("flex flex-col gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800", className)}>

            {/* Header / Top Row */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-500">
                    <Activity size={18} />
                    <span className="text-sm font-bold uppercase tracking-wider">Vitals</span>
                </div>
            </div>

            {/* HP & Input Section */}
            <div className="flex flex-col gap-3">
                {/* Visual Bar */}
                <div className="relative h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <div
                        className={cn("absolute top-0 left-0 h-full transition-all duration-300 ease-out",
                            isDying ? "bg-slate-500" : "bg-red-500"
                        )}
                        style={{ width: `${hpPercent}%` }}
                    />
                    {tempHp > 0 && (
                        <div
                            className="absolute top-0 h-full bg-blue-400/50 border-l border-blue-500"
                            style={{
                                left: `${hpPercent}%`,
                                width: `${tempHpPercent}%`
                            }}
                        />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-shadow-sm text-slate-900 dark:text-white mix-blend-difference">
                        {hpCurrent} / {effectiveMaxHp} {tempHp > 0 && `(+${tempHp})`}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-1.5 items-center">
                    <input
                        type="number"
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-14 h-9 px-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-bold text-sm"
                    />
                    <select
                        value={damageType}
                        onChange={(e) => setDamageType(e.target.value)}
                        title="Damage Type (Triggers Rage, Dwarven Poison & Tiefling Fire Resistances)"
                        className="h-9 px-2 text-xs rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium"
                    >
                        <option value="physical">⚔️ Physical</option>
                        <option value="poison">☠️ Poison</option>
                        <option value="fire">🔥 Fire</option>
                        <option value="cold">❄️ Cold</option>
                        <option value="lightning">⚡ Lightning</option>
                        <option value="radiant">✨ Radiant</option>
                        <option value="necrotic">💀 Necrotic</option>
                        <option value="psychic">🧠 Psychic</option>
                        <option value="force">🔮 Force</option>
                        <option value="acid">🧪 Acid</option>
                        <option value="thunder">🌩️ Thunder</option>
                    </select>
                    <div className="flex flex-1 gap-1 min-w-[140px]">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-9 hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-bold text-xs"
                            onClick={handleDamage}
                        >
                            Dmg
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-9 hover:bg-green-50 hover:text-green-600 hover:border-green-200 font-bold text-xs"
                            onClick={handleHeal}
                        >
                            Heal
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9 text-blue-400 hover:text-blue-600 hover:bg-blue-50 shrink-0"
                            onClick={handleTempHp}
                            title="Add to Temp HP"
                        >
                            <Shield size={16} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Death Saves (Conditional) */}
            {isDying && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-red-300 dark:border-red-900/60 animate-in fade-in slide-in-from-top-2 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-red-600 dark:text-red-400">
                            <Skull size={14} />
                            <span>Death Saving Throws</span>
                            {deathSaveSuccess >= 3 && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black">
                                    STABILIZED
                                </span>
                            )}
                            {deathSaveFailure >= 3 && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-700 text-white font-black">
                                    FALLEN
                                </span>
                            )}
                        </div>
                        <Button
                            size="sm"
                            className="h-6 px-2.5 text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white gap-1"
                            onClick={() =>
                                openRollComposer({
                                    rollType: "death_save",
                                    targetId: "death_save",
                                    label: "Death Saving Throw (Nat 20 = 1 HP, Nat 1 = 2 Fails)"
                                })
                            }
                        >
                            <Dice6 size={12} />
                            Roll Death Save
                        </Button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex gap-1 items-center">
                            <span className="text-xs w-10 text-right pr-2">Succ</span>
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={`succ-${i}`}
                                    onClick={() => viewModel.setDeathSaves(
                                        deathSaveSuccess >= i ? i - 1 : i, // Toggle logic
                                        deathSaveFailure
                                    )}
                                    className={cn(
                                        "w-5 h-5 rounded-full border cursor-pointer transition-colors",
                                        deathSaveSuccess >= i ? "bg-green-500 border-green-600" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                                    )}
                                />
                            ))}
                        </div>
                        <div className="flex gap-1 items-center">
                            <span className="text-xs w-8 text-right pr-2">Fail</span>
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={`fail-${i}`}
                                    onClick={() => viewModel.setDeathSaves(
                                        deathSaveSuccess,
                                        deathSaveFailure >= i ? i - 1 : i
                                    )}
                                    className={cn(
                                        "w-5 h-5 rounded-full border cursor-pointer transition-colors",
                                        deathSaveFailure >= i ? "bg-red-500 border-red-600" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Secondary Vitals Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Hit Dice - Per Class with 1-Click Roll & Composer */}
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Hit Dice</span>
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                                {hitDiceCurrent}/{hitDiceMax}
                            </span>
                        </div>
                        <HitDiceByClass
                            classes={charClasses}
                            selectedClassId={effectiveHitDieClassId}
                            onSelectClass={setSelectedHitDieClassId}
                        />
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm gap-1 px-2"
                            disabled={hitDiceCurrent <= 0}
                            onClick={() =>
                                executeInstantRoll({
                                    rollType: "hit_die",
                                    targetId: effectiveHitDieClassId,
                                    label: `Spend ${effectiveHitDieClassName} Hit Die (1d${effectiveHitDieSides} + CON)`
                                })
                            }
                            title={`1-Click Roll ${effectiveHitDieClassName} 1d${effectiveHitDieSides} Hit Die & Automatically Heal HP`}
                        >
                            <Zap size={11} className="text-amber-300 shrink-0" />
                            <span>Roll 1d{effectiveHitDieSides}</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 shrink-0"
                            disabled={hitDiceCurrent <= 0}
                            onClick={() =>
                                openRollComposer({
                                    rollType: "hit_die",
                                    targetId: effectiveHitDieClassId,
                                    label: `Spend ${effectiveHitDieClassName} Hit Die (1d${effectiveHitDieSides} + CON)`
                                })
                            }
                            title={`Open ${effectiveHitDieClassName} Hit Die (1d${effectiveHitDieSides}) in Roll Composer`}
                        >
                            <Dice6 size={13} />
                        </Button>
                    </div>
                </div>

                {/* Quick Rests & Initiative (Mobile & Desktop Ergonomic Shortcuts) */}
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Rests &amp; Init</span>
                        <button
                            type="button"
                            onClick={() =>
                                executeInstantRoll({
                                    rollType: "initiative",
                                    targetId: "initiative",
                                    label: "Initiative Roll"
                                })
                            }
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                            title="1-Click Instant Initiative Roll"
                        >
                            ⚡ Init Roll
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-1.5 font-bold bg-white dark:bg-slate-900 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                            onClick={() => viewModel?.shortRest()}
                            title="Short Rest (Recover Pact Magic, Short Rest Resources & +1 Channel Divinity/Second Wind/Rage/Wild Shape)"
                        >
                            ☀️ Short
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-1.5 font-bold bg-white dark:bg-slate-900 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10"
                            onClick={() => viewModel?.longRest()}
                            title="Long Rest (Restore Full HP, Hit Dice, Spell Slots & Resources)"
                        >
                            🌙 Long
                        </Button>
                    </div>
                </div>
            </div>

            {/* Active Resource Modifiers - To be implemented via resolvedResources */}
        </div>
    );
}
