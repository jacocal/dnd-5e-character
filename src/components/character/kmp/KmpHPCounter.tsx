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

// Displays hit dice by class (e.g., "3d6 Wizard | 2d8 Warlock")
function HitDiceByClass({ classes }: { classes: any[] }) {
    if (!classes || classes.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1 text-[10px] text-slate-500 mb-1">
            {classes.map((c: any, i: number) => {
                const hitDie = c.hitDie || 8;
                const level = c.level || 1;
                // Use className if available (from join), otherwise fallback to classId
                const rawName = c.className || c.classId || "???";
                const name = rawName.substring(0, 3).toUpperCase();

                return (
                    <span key={c.classId || i} className="flex items-center gap-0.5">
                        {i > 0 && <span className="text-slate-300 mx-1">|</span>}
                        <Dice6 size={10} className="text-slate-400" />
                        <span className="font-mono font-bold">{level}d{hitDie}</span>
                        <span className="text-slate-400 uppercase">{name}</span>
                    </span>
                );
            })}
        </div>
    );
}

interface KmpHPCounterProps {
    className?: string;
}

export function KmpHPCounter({ className }: KmpHPCounterProps) {
    const { viewModel, state } = useKmpCharacter();
    const [amount, setAmount] = useState<number>(1);

    if (!state || !state.character) return null;

    const char = state.character;
    const activeModifiers = state?.activeModifiers || char.activeModifiers || [];

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
        viewModel.takeDamage(amount);
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
                <div className="flex gap-2">
                    <input
                        type="number"
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-16 px-2 py-1 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-bold"
                    />
                    <div className="flex flex-1 gap-1">
                        <Button
                            variant="outline"
                            className="flex-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            onClick={handleDamage}
                        >
                            Dmg
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                            onClick={handleHeal}
                        >
                            Heal
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-10 text-blue-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={handleTempHp}
                            title="Set Temp HP"
                        >
                            <Shield size={16} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Death Saves (Conditional) */}
            {isDying && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase text-slate-500">
                        <Skull size={14} className="text-slate-400" />
                        Death Saves
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex gap-1">
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
                        <div className="flex gap-1">
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
                {/* Hit Dice - Per Class */}
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Hit Dice</span>
                        <span className="text-xs font-mono">{hitDiceCurrent}/{hitDiceMax}</span>
                    </div>
                    <HitDiceByClass classes={char.classes} />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-6 text-xs bg-white dark:bg-slate-800 border shadow-sm mt-1"
                        disabled={hitDiceCurrent <= 0}
                        onClick={() => viewModel.spendHitDie(null)}
                    >
                        Spend
                    </Button>
                </div>

                {/* Conditions & Inspiration */}
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800 space-y-2">
                    {/* Inspiration */}
                    <div
                        className={cn(
                            "flex items-center justify-between text-xs cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700 p-1 rounded transition-colors",
                            inspiration ? "text-amber-500 font-bold" : "text-slate-400"
                        )}
                        onClick={() => viewModel.toggleInspiration()}
                    >
                        <span>Inspiration</span>
                        <Zap size={14} fill={inspiration ? "currentColor" : "none"} />
                    </div>

                    {/* Exhaustion */}
                    <div className="flex items-center justify-between text-xs p-1">
                        <span className={cn(exhaustion > 0 ? "text-orange-500 font-bold" : "text-slate-400")}>
                            Exhaustion
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                className="w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-700 border rounded hover:bg-slate-100"
                                onClick={() => viewModel.setExhaustion(exhaustion - 1)}
                                disabled={exhaustion <= 0}
                            >-</button>
                            <span className="font-mono w-4 text-center">{exhaustion}</span>
                            <button
                                className="w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-700 border rounded hover:bg-slate-100"
                                onClick={() => viewModel.setExhaustion(exhaustion + 1)}
                                disabled={exhaustion >= 6}
                            >+</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Resource Modifiers - To be implemented via resolvedResources */}
        </div>
    );
}
