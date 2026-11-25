"use client";

import React from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Sparkles,
    X,
    Focus,
    AlertTriangle,
    Flame,
    ShieldAlert,
    Minus,
    Plus
} from "lucide-react";

interface ActiveModifier {
    sourceId: string;
    sourceName: string;
    modifier: {
        type: string;
        target: string;
        value?: number;
        condition?: string;
        duration?: string;
    };
    expiresOn: string;
    activatedAt?: string;
}

interface KmpActiveEffectsPanelProps {
    className?: string;
}

export function KmpActiveEffectsPanel({ className }: KmpActiveEffectsPanelProps) {
    const { state, viewModel, executeInstantRoll, openRollComposer } = useKmpCharacter();
    const character = state?.character;
    if (!character) return null;

    const activeModifiers = (state?.activeModifiers || character?.activeModifiers || []) as ActiveModifier[];
    const activeConditions: any[] = state?.resolvedConditions || [];
    const concentrationSpell = (state?.resolvedSpells || []).find((s: any) => s.isConcentrating);
    const exhaustion: number = character.exhaustion ?? 0;
    const inspiration: boolean = !!character.inspiration;
    const resolvedSkills: any[] = state?.resolvedSkills || [];

    const athleticsMod = resolvedSkills.find((s) => s.key === "athletics")?.total ?? 0;
    const acrobaticsMod = resolvedSkills.find((s) => s.key === "acrobatics")?.total ?? 0;
    const bestEscapeSkill = acrobaticsMod > athleticsMod ? "acrobatics" : "athletics";
    const bestEscapeLabel = acrobaticsMod > athleticsMod ? "ACR" : "ATH";

    // Group active modifiers by source
    const groupedBySource = activeModifiers.reduce((acc, mod) => {
        if (!acc[mod.sourceId]) {
            acc[mod.sourceId] = {
                sourceName: mod.sourceName,
                sourceId: mod.sourceId,
                expiresOn: mod.expiresOn,
                modifiers: []
            };
        }
        acc[mod.sourceId].modifiers.push(mod.modifier);
        return acc;
    }, {} as Record<string, { sourceName: string; sourceId: string; expiresOn: string; modifiers: any[] }>);

    const sources = Object.values(groupedBySource);

    const getExpirationLabel = (expiresOn: string) => {
        switch (expiresOn) {
            case "short_rest":
                return "Short Rest";
            case "long_rest":
                return "Long Rest";
            case "concentration":
                return "Conc.";
            case "manual_disable":
                return "Manual";
            default:
                return expiresOn;
        }
    };

    const hasAnyActiveStatus =
        sources.length > 0 ||
        activeConditions.length > 0 ||
        !!concentrationSpell ||
        exhaustion > 0;

    return (
        <div
            className={cn(
                "p-3.5 rounded-xl border shadow-sm flex-1 flex flex-col justify-between gap-2.5 transition-colors",
                hasAnyActiveStatus
                    ? "bg-gradient-to-br from-amber-50/70 to-indigo-50/40 dark:from-slate-900 dark:to-indigo-950/30 border-amber-300/60 dark:border-indigo-500/30"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
                className
            )}
        >
            {/* Header Row: Status Dock + Heroic Inspiration Toggle + 2024 Exhaustion Stepper */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Combat Status, Buffs &amp; Concentration
                    </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Heroic Inspiration Quick Pill */}
                    <button
                        type="button"
                        onClick={() => viewModel?.toggleInspiration()}
                        className={cn(
                            "text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all flex items-center gap-1",
                            inspiration
                                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                        )}
                        title="Toggle 2024 Heroic Inspiration (Reroll any die after rolling)"
                    >
                        <Flame className="w-3 h-3" />
                        {inspiration ? "Heroic Inspiration ★" : "No Inspiration"}
                    </button>

                    {/* 2024 Exhaustion Stepper (Lvl 0–6: -2 per level to D20 Tests, -5 ft Speed) */}
                    <div
                        className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold",
                            exhaustion > 0
                                ? "bg-red-500/15 border-red-500/40 text-red-600 dark:text-red-300"
                                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                        )}
                        title="2024 Exhaustion: -2 per level to all D20 Tests & Spell Save DC, -5 ft. Speed per level (Death at 6)"
                    >
                        <span>Exhaustion: {exhaustion}/6</span>
                        {exhaustion > 0 && (
                            <span className="font-mono text-[9px] text-red-500 dark:text-red-300">
                                (-{exhaustion * 2} D20 / -{exhaustion * 5}ft)
                            </span>
                        )}
                        <button
                            type="button"
                            disabled={exhaustion <= 0}
                            onClick={() => viewModel?.setExhaustion(Math.max(0, exhaustion - 1))}
                            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                        >
                            <Minus className="w-2.5 h-2.5" />
                        </button>
                        <button
                            type="button"
                            disabled={exhaustion >= 6}
                            onClick={() => viewModel?.setExhaustion(Math.min(6, exhaustion + 1))}
                            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                        >
                            <Plus className="w-2.5 h-2.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Body: Concentration, Active Buff Modifiers, and Active Conditions */}
            {!hasAnyActiveStatus ? (
                <div className="flex items-center justify-between text-xs text-slate-400 py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-slate-800">
                    <span>No active buffs, concentration spells, or conditions.</span>
                    <span className="text-[10px] font-mono text-emerald-500">All Systems Nominal</span>
                </div>
            ) : (
                <div className="space-y-1.5">
                    {/* 1. Active Concentration Banner */}
                    {concentrationSpell && (
                        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/35 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Focus className="w-3.5 h-3.5 text-purple-500 animate-pulse shrink-0" />
                                <span className="text-purple-800 dark:text-purple-200 truncate">
                                    Concentrating: <strong>{concentrationSpell.spell.name}</strong>
                                </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <Button
                                    size="sm"
                                    className="h-6 text-[10px] px-2 bg-purple-600 hover:bg-purple-500 text-white"
                                    onClick={() =>
                                        executeInstantRoll({
                                            rollType: "concentration_save",
                                            targetId: "con",
                                            targetAcOrDc: 10,
                                            label: "Concentration CON Save"
                                        })
                                    }
                                    title="1-Click Instant Concentration Saving Throw (DC 10)"
                                >
                                    ⚡ CON Save
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-1.5 text-[10px] text-purple-600 dark:text-purple-300 hover:text-red-500"
                                    onClick={() =>
                                        viewModel?.setConcentration(
                                            concentrationSpell.spell.id,
                                            concentrationSpell.spell.name
                                        )
                                    }
                                >
                                    <X className="w-3 h-3 mr-0.5" /> Drop
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 2. Active Buff / Resource Modifiers */}
                    {sources.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {sources.map((source) => (
                                <div
                                    key={source.sourceId}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-xs"
                                >
                                    <span className="font-bold text-amber-900 dark:text-amber-100">
                                        {source.sourceName}
                                    </span>
                                    <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300">
                                        (
                                        {source.modifiers
                                            .map(
                                                (m) =>
                                                    `${m.target}${
                                                        m.value !== undefined && m.value !== 0
                                                            ? ` ${m.value > 0 ? `+${m.value}` : m.value}`
                                                            : ""
                                                    }`
                                            )
                                            .join(", ")}
                                        )
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="text-[8px] h-3.5 px-1 border-amber-500/40 text-amber-700 dark:text-amber-300"
                                    >
                                        {getExpirationLabel(source.expiresOn)}
                                    </Badge>
                                    <button
                                        type="button"
                                        onClick={() => viewModel?.deactivateResourceEffect(source.sourceId)}
                                        className="text-amber-700 dark:text-amber-300 hover:text-red-500"
                                        title="End Effect"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 3. Active Conditions with 1-Click Escape / Save Rollers */}
                    {activeConditions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {activeConditions.map((entry: any) => {
                                const c = entry.condition;
                                const cid = (c.id || "").toLowerCase();
                                const isGrappleOrRestrain = cid === "grappled" || cid === "restrained";
                                const isWisSaveCond = cid === "frightened" || cid === "charmed";
                                const isConSaveCond = cid === "poisoned" || cid === "paralyzed" || cid === "stunned";

                                return (
                                    <div
                                        key={c.id}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-[11px] font-semibold text-rose-700 dark:text-rose-200"
                                    >
                                        <ShieldAlert className="w-3 h-3 text-rose-500 shrink-0" />
                                        <span>{c.name}</span>
                                        {isGrappleOrRestrain && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    executeInstantRoll({
                                                        rollType: "skill",
                                                        targetId: bestEscapeSkill,
                                                        label: `Escape ${c.name} (${bestEscapeLabel})`
                                                    })
                                                }
                                                className="ml-1 px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-bold hover:bg-rose-500"
                                                title={`Roll ${bestEscapeLabel} to Escape ${c.name}`}
                                            >
                                                ⚡ Escape ({bestEscapeLabel})
                                            </button>
                                        )}
                                        {isWisSaveCond && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    executeInstantRoll({
                                                        rollType: "saving_throw",
                                                        targetId: "wis",
                                                        label: `${c.name} WIS Save`
                                                    })
                                                }
                                                className="ml-1 px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-bold hover:bg-rose-500"
                                            >
                                                ⚡ WIS Save
                                            </button>
                                        )}
                                        {isConSaveCond && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    executeInstantRoll({
                                                        rollType: "saving_throw",
                                                        targetId: "con",
                                                        label: `${c.name} CON Save`
                                                    })
                                                }
                                                className="ml-1 px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-bold hover:bg-rose-500"
                                            >
                                                ⚡ CON Save
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => viewModel?.toggleCondition(c.id)}
                                            className="ml-0.5 hover:text-red-500"
                                            title={`Remove ${c.name}`}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
