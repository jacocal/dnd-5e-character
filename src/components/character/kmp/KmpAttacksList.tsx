"use client";

import React from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { cn } from "@/lib/utils";
import { Sword, Flame, Zap, Dices, Sparkles, Shield, PawPrint, Plus, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function KmpAttacksList() {
    const { state, viewModel, openRollComposer, executeInstantRoll } = useKmpCharacter();
    const actions: any[] = state?.actions || [];
    const masteryLimit: number = state?.weaponMasteryLimit ?? 0;
    const masteredIds: string[] = state?.masteredWeaponIds || [];
    const availableCompanions: any[] = state?.availableCompanions || [];
    const activeCompanion: any | null = state?.activeCompanion || null;
    const companionHp: number = state?.companionHpCurrent ?? 0;

    if (!state?.character) return null;

    return (
        <div className="space-y-4">
            {/* 2024 Weapon Mastery Loadout Bar (if character has Weapon Mastery slots) */}
            {masteryLimit > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/50 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <Sword className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-bold text-amber-800 dark:text-amber-200">
                            2024 Weapon Mastery Loadout: {masteredIds.length} / {masteryLimit} Active
                        </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                        Click the Mastery pill on any proficient weapon below to toggle its mastery on/off after a Long Rest
                    </span>
                </div>
            )}

            {actions.length === 0 ? (
                <div className="text-sm text-slate-500 italic p-4 text-center">
                    No equipped weapons or prepared combat spells.
                </div>
            ) : (
                <div className="space-y-2.5">
                    {actions.map((atk: any) => {
                        const isSpell = atk.actionCategory === "spell" || atk.actionCategory === "cantrip";
                        const isWeapon = atk.actionCategory === "weapon";
                        const isProficient = atk.isProficient !== false;
                        const hitBonus = atk.toHitBonus ?? 0;
                        const riders: any[] = atk.eligibleRiders || [];
                        const activeTriggers: string[] = atk.activeTriggers || [];
                        const isMastered = masteredIds.includes(atk.id);
                        const rawItem = (state?.resolvedItems || []).find((i: any) => i.item?.id === atk.id)?.item;
                        const rawMasteryProp = rawItem?.weaponMastery;

                        return (
                            <div
                                key={atk.id}
                                onClick={() =>
                                    openRollComposer({
                                        rollType: isSpell ? "spell" : "weapon_attack",
                                        targetId: atk.id,
                                        selectedRiderIds: riders
                                            .filter(
                                                (r) =>
                                                    !r.consumesSlotLevel &&
                                                    !r.consumesResourceId &&
                                                    r.id !== "rider-rage" &&
                                                    r.id !== "rider-reckless"
                                            )
                                            .map((r) => r.id),
                                        slotLevel: atk.spellLevel && atk.spellLevel > 0 ? atk.spellLevel : null,
                                        useFreeCast: atk.freeCastAvailable === true,
                                        label: atk.name
                                    })
                                }
                                className={cn(
                                    "p-3.5 border rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-all group shadow-sm",
                                    !isProficient
                                        ? "border-amber-300 dark:border-amber-800"
                                        : "border-slate-200 dark:border-slate-800 hover:border-indigo-500/50"
                                )}
                            >
                                <div className="flex justify-between items-start sm:items-center mb-1.5 gap-2 flex-wrap">
                                    <div className="font-bold text-sm flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                                        {isSpell ? (
                                            <Flame size={15} className="text-purple-500 shrink-0" />
                                        ) : (
                                            <Sword size={15} className={isProficient ? "text-amber-500 shrink-0" : "text-red-500 shrink-0"} />
                                        )}
                                        <span className="truncate text-slate-900 dark:text-white">{atk.name}</span>
                                        {!isProficient && (
                                            <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 px-1.5 py-0.5 rounded uppercase font-bold">
                                                Not Proficient
                                            </span>
                                        )}
                                        {isWeapon && rawMasteryProp && masteryLimit > 0 && isProficient && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    viewModel?.toggleWeaponMastery(atk.id);
                                                }}
                                                className={cn(
                                                    "text-[9px] h-4 px-1.5 rounded border font-bold uppercase transition-colors",
                                                    isMastered
                                                        ? "bg-amber-500 text-slate-950 border-amber-400"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 hover:border-amber-400"
                                                )}
                                                title="Toggle 2024 Weapon Mastery Loadout"
                                            >
                                                {isMastered ? `★ Mastery: ${rawMasteryProp}` : `+ Master (${rawMasteryProp})`}
                                            </button>
                                        )}
                                        {atk.freeCastAvailable && (
                                            <Badge className="text-[9px] h-4 px-1.5 bg-emerald-600 text-white">
                                                1/LR Free Cast
                                            </Badge>
                                        )}
                                    </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                <span className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                                    <span className="hidden sm:inline">{atk.castingTime} • </span>
                                    {atk.actionCategory === "cantrip"
                                        ? "Cantrip"
                                        : atk.actionCategory === "spell"
                                        ? `Lvl ${atk.spellLevel}`
                                        : atk.range}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        executeInstantRoll({
                                            rollType: isSpell ? "spell" : "weapon_attack",
                                            targetId: atk.id,
                                            selectedRiderIds: riders
                                                .filter(
                                                    (r) =>
                                                        !r.consumesSlotLevel &&
                                                        !r.consumesResourceId &&
                                                        r.id !== "rider-rage" &&
                                                        r.id !== "rider-reckless"
                                                )
                                                .map((r) => r.id),
                                            slotLevel: atk.spellLevel && atk.spellLevel > 0 ? atk.spellLevel : null,
                                            useFreeCast: atk.freeCastAvailable === true,
                                            label: atk.name
                                        });
                                    }}
                                    className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-colors"
                                    title="1-Click Instant Auto-Roll"
                                >
                                    <Zap className="w-3 h-3 text-amber-300" />
                                    Roll
                                </button>
                                <span title="Click card to open Roll Composer">
                                    <Dices className="w-4 h-4 text-indigo-400 opacity-75 group-hover:opacity-100 transition-opacity" />
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs">
                            {atk.saveAbility && atk.saveDC ? (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 text-[10px] font-bold uppercase">Save</span>
                                    <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">
                                        DC {atk.saveDC} {atk.saveAbility}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 text-[10px] font-bold uppercase">Hit</span>
                                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                                        {hitBonus >= 0 ? `+${hitBonus}` : hitBonus}
                                    </span>
                                </div>
                            )}

                            {atk.baseDamageDice && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 text-[10px] font-bold uppercase">Dmg</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200 font-mono">
                                        {atk.baseDamageDice}
                                        {atk.damageBonus !== 0
                                            ? atk.damageBonus > 0
                                                ? `+${atk.damageBonus}`
                                                : `${atk.damageBonus}`
                                            : ""}{" "}
                                        <span className="text-slate-400 font-sans text-[11px]">{atk.damageType}</span>
                                    </span>
                                    {atk.versatileDamageDice && (
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            (2H: {atk.versatileDamageDice})
                                        </span>
                                    )}
                                </div>
                            )}

                            {atk.healingDice && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-emerald-500 text-[10px] font-bold uppercase">Heal</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                                        {atk.healingDice}
                                        {atk.healingBonus > 0 ? `+${atk.healingBonus}` : ""}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Causal Trigger Synergies (Weapon Masteries, Feats, Class Features, Racial Traits & Riders) */}
                        {activeTriggers.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                <span className="text-[9px] uppercase font-bold text-indigo-400 mr-1 flex items-center gap-0.5">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    Triggers:
                                </span>
                                {activeTriggers.slice(0, 5).map((trig: string, idx: number) => (
                                    <span
                                        key={idx}
                                        className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 font-medium"
                                    >
                                        {trig}
                                    </span>
                                ))}
                                {activeTriggers.length > 5 && (
                                    <span className="text-[9px] text-slate-400">+{activeTriggers.length - 5} more</span>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
                </div>
            )}

            {/* Wild Shape, Familiar, Steed & Summon Companion Stat-Block Card */}
            {availableCompanions.length > 0 && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/15 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            <PawPrint className="w-4 h-4 text-emerald-500" />
                            <div>
                                <h4 className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
                                    Wild Shape, Familiar, Steed & Summoned Companion
                                </h4>
                                <p className="text-[10px] text-slate-500">
                                    Track form HP, AC, and roll companion attacks separately from your character
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Select
                                value={activeCompanion?.id || "none"}
                                onValueChange={(val) =>
                                    viewModel?.setCompanionForm(val === "none" ? null : val)
                                }
                            >
                                <SelectTrigger className="h-8 text-xs w-full sm:w-56 bg-white dark:bg-slate-900">
                                    <SelectValue placeholder="Select Companion / Form..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Active Companion / Form</SelectItem>
                                    {availableCompanions.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name} (AC {c.armorClass} • {c.maxHp} HP)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {activeCompanion && (
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-emerald-500/30 space-y-2.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div>
                                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>{activeCompanion.name}</span>
                                        <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                                            {activeCompanion.category}
                                        </Badge>
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                        AC {activeCompanion.armorClass} • Speed: {activeCompanion.speed}
                                    </div>
                                </div>

                                {/* Companion HP Controls */}
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-xs text-red-500"
                                        onClick={() => viewModel?.updateCompanionHp(-5)}
                                    >
                                        -5
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 w-7 p-0 text-red-500"
                                        onClick={() => viewModel?.updateCompanionHp(-1)}
                                    >
                                        <Minus className="w-3 h-3" />
                                    </Button>
                                    <div className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">
                                        {companionHp} / {activeCompanion.maxHp} HP
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 w-7 p-0 text-emerald-500"
                                        onClick={() => viewModel?.updateCompanionHp(1)}
                                    >
                                        <Plus className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-xs text-emerald-500"
                                        onClick={() => viewModel?.updateCompanionHp(5)}
                                    >
                                        +5
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                                <div className="text-xs text-slate-600 dark:text-slate-300">
                                    <span className="font-bold">{activeCompanion.attackName}:</span>{" "}
                                    <span className="font-mono">
                                        +{activeCompanion.attackBonus} to hit • {activeCompanion.damageDice}+
                                        {activeCompanion.damageBonus} {activeCompanion.damageType}
                                    </span>
                                    <div className="text-[11px] text-slate-400 mt-0.5">{activeCompanion.notes}</div>
                                </div>

                                <Button
                                    size="sm"
                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
                                    onClick={() =>
                                        openRollComposer({
                                            rollType: "companion_attack",
                                            targetId: activeCompanion.id,
                                            label: `${activeCompanion.name}: ${activeCompanion.attackName}`
                                        })
                                    }
                                >
                                    <Dices className="w-3.5 h-3.5" />
                                    Roll Companion Attack
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
