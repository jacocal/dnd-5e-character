"use client";

import React, { useState } from "react";
import { useCharacterStore } from "@/store/character-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Heart,
    Shield,
    Skull,
    Zap,
    Moon,
    Sun,
    Activity,
    Thermometer,
    Dice6,
    X
} from "lucide-react";

// Displays hit dice by class (e.g., "3d6 Wizard | 2d8 Warlock")
function HitDiceByClass() {
    const { classes } = useCharacterStore();

    if (!classes || classes.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1 text-[10px] text-slate-500 mb-1">
            {classes.map((c: any, i: number) => {
                const hitDie = c.class?.hitDie || 8;
                const level = c.level || 1;
                const name = c.class?.name?.substring(0, 3) || "???";
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

interface HPCounterProps {
    className?: string;
}

export function HPCounter({ className }: HPCounterProps) {
    const {
        hpCurrent,
        hpMax,
        tempHp,
        hitDiceCurrent,
        hitDiceMax,
        deathSaveSuccess,
        deathSaveFailure,
        inspiration,
        exhaustion,
        takeDamage,
        heal,
        setTempHp,
        spendHitDie,
        toggleInspiration,
        setExhaustion,
        setDeathSaves,
        longRest,
        getEffectiveMaxHp,
        resourceModifiers,
        removeResourceModifier
    } = useCharacterStore();

    const [amount, setAmount] = useState<number>(1);
    const [isResting, setIsResting] = useState(false);

    const handleDamage = () => {
        takeDamage(amount);
        setAmount(1);
    };

    const handleHeal = () => {
        heal(amount);
        setAmount(1);
    };

    const handleTempHp = () => {
        setTempHp(tempHp + amount);
        setAmount(1);
    };

    // Calculate effective max HP including modifiers (Tough, Dwarven Toughness, etc.)
    const effectiveMaxHp = getEffectiveMaxHp();
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
                <div className="flex gap-1">
                    {/* Short Rest could go here, for now just Spend HD below */}
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
                                    onClick={() => setDeathSaves(
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
                                    onClick={() => setDeathSaves(
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
                    <HitDiceByClass />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-6 text-xs bg-white dark:bg-slate-800 border shadow-sm mt-1"
                        disabled={hitDiceCurrent <= 0}
                        onClick={spendHitDie}
                    >
                        Spend
                    </Button>
                </div>

                {/* Conditions */}
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800 space-y-2">
                    {/* Inspiration */}
                    <div
                        className={cn(
                            "flex items-center justify-between text-xs cursor-pointer select-none",
                            inspiration ? "text-amber-500 font-bold" : "text-slate-400"
                        )}
                        onClick={toggleInspiration}
                    >
                        <span>Inspiration</span>
                        <Zap size={14} fill={inspiration ? "currentColor" : "none"} />
                    </div>

                    {/* Exhaustion */}
                    <div className="flex items-center justify-between text-xs">
                        <span className={cn(exhaustion > 0 ? "text-orange-500 font-bold" : "text-slate-400")}>
                            Exhaustion
                        </span>
                        <select
                            value={exhaustion}
                            onChange={(e) => setExhaustion(parseInt(e.target.value))}
                            className="bg-transparent border-none text-right font-mono focus:ring-0 p-0 cursor-pointer"
                        >
                            {[0, 1, 2, 3, 4, 5, 6].map(lvl => (
                                <option key={lvl} value={lvl}>{lvl}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Active Effects / Modifiers */}
            {(resourceModifiers && resourceModifiers.length > 0) && (
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Active Effects</span>
                    <div className="flex flex-col gap-1">
                        {resourceModifiers.map((mod: any) => (
                            <div key={mod.id} className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded text-xs text-emerald-700 dark:text-emerald-400">
                                <span className="font-semibold">{mod.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="opacity-70 text-[10px] uppercase">{mod.duration === 'short_rest' ? 'Short Rest' : mod.duration === 'long_rest' ? 'Long Rest' : mod.duration}</span>
                                    <button
                                        onClick={() => removeResourceModifier(mod.id)}
                                        className="hover:bg-emerald-100 dark:hover:bg-emerald-900 p-0.5 rounded transition-colors"
                                        title="Dismiss Effect"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
