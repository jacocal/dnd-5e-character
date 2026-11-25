"use client";

import React, { useState } from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Shield, Check, Circle, Dices, Zap, Eye, Award, Swords, ShieldAlert, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const DAMAGE_TYPES = [
    "physical",
    "fire",
    "cold",
    "poison",
    "lightning",
    "acid",
    "thunder",
    "necrotic",
    "radiant",
    "psychic",
    "force",
    "all"
] as const;

type DefenseKind = "resistance" | "immunity" | "vulnerability";

function getAutomaticResistances(character: any, activeConditions: any[]): Array<{ type: string; source: string }> {
    const out: Array<{ type: string; source: string }> = [];
    const raceId = String(character?.raceId || "").toLowerCase();
    const activeMods: any[] = character?.activeModifiers || [];

    const isPetrified = activeConditions.some(
        (c: any) => String(c?.condition?.id || c?.conditionId || "").toLowerCase() === "petrified"
    );
    if (isPetrified) out.push({ type: "all", source: "Petrified" });

    const isRaging = activeMods.some(
        (m: any) =>
            String(m?.sourceId || "").toLowerCase().includes("rage") ||
            String(m?.sourceName || "").toLowerCase().includes("rage")
    );
    if (isRaging) out.push({ type: "physical", source: "Rage" });

    if (raceId.includes("dwarf")) out.push({ type: "poison", source: "Dwarven Resilience" });
    if (raceId.includes("aasimar")) {
        out.push({ type: "necrotic", source: "Celestial Resistance" });
        out.push({ type: "radiant", source: "Celestial Resistance" });
    }
    if (raceId.startsWith("tiefling-abyssal")) out.push({ type: "poison", source: "Fiendish Legacy" });
    else if (raceId.startsWith("tiefling-chthonic")) out.push({ type: "necrotic", source: "Fiendish Legacy" });
    else if (raceId.startsWith("tiefling-infernal") || raceId === "tiefling") {
        out.push({ type: "fire", source: "Fiendish Legacy" });
    }
    if (raceId.startsWith("dragonborn-black") || raceId.startsWith("dragonborn-copper")) {
        out.push({ type: "acid", source: "Draconic Resistance" });
    } else if (raceId.startsWith("dragonborn-blue") || raceId.startsWith("dragonborn-bronze")) {
        out.push({ type: "lightning", source: "Draconic Resistance" });
    } else if (
        raceId.startsWith("dragonborn-brass") ||
        raceId.startsWith("dragonborn-gold") ||
        raceId.startsWith("dragonborn-red")
    ) {
        out.push({ type: "fire", source: "Draconic Resistance" });
    } else if (raceId.startsWith("dragonborn-green")) {
        out.push({ type: "poison", source: "Draconic Resistance" });
    } else if (raceId.startsWith("dragonborn-silver") || raceId.startsWith("dragonborn-white")) {
        out.push({ type: "cold", source: "Draconic Resistance" });
    }

    for (const tr of character?.traits || []) {
        for (const m of tr?.modifiers || []) {
            if (String(m?.type || "").toLowerCase() === "damage_resistance" && m?.target) {
                out.push({ type: String(m.target).toLowerCase(), source: tr.name || tr.id || "Trait" });
            }
        }
    }

    const seen = new Set<string>();
    return out.filter((entry) => {
        const key = `${entry.type}:${entry.source}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

interface KmpCombatStatsProps {
    className?: string;
}

interface ResolvedSavingThrow {
    ability: string;
    total: number;
    isProficient: boolean;
    hasBonus: boolean;
    advantageState?: string;
}

export function KmpCombatStats({ className }: KmpCombatStatsProps) {
    const { state, viewModel, openRollComposer, executeInstantRoll } = useKmpCharacter();
    const [editingDefenses, setEditingDefenses] = useState(false);
    const [defenseKind, setDefenseKind] = useState<DefenseKind>("resistance");
    const character = state?.character;
    const saves = (state?.resolvedSavingThrows || []) as ResolvedSavingThrow[];
    const skills = (state?.resolvedSkills || []) as any[];
    const combatStats = state?.resolvedCombatStats;

    if (!character) return null;

    const autoResistances = getAutomaticResistances(character, state?.resolvedConditions || []);
    const customResistances: string[] = Array.isArray(character.resistances) ? character.resistances : [];
    const customImmunities: string[] = Array.isArray(character.immunities) ? character.immunities : [];
    const customVulnerabilities: string[] = Array.isArray(character.vulnerabilities) ? character.vulnerabilities : [];
    const hasAnyDefenses =
        autoResistances.length > 0 ||
        customResistances.length > 0 ||
        customImmunities.length > 0 ||
        customVulnerabilities.length > 0;

    const ac = combatStats?.armorClass ?? character.armorClass ?? 10;
    const initiative = combatStats?.initiative ?? Math.floor((character.dex - 10) / 2) + character.initiativeBonus;
    const speed = combatStats?.speed ?? state.resolvedRace?.speed ?? character.speed;
    const pb = combatStats?.proficiencyBonus ?? 2;
    const passivePerception = combatStats?.passivePerception ?? 10;
    const passiveInsight = skills.find((s: any) => s.key === "insight")?.passive ?? 10;
    const passiveInvestigation = skills.find((s: any) => s.key === "investigation")?.passive ?? 10;
    const darkvision = combatStats?.darkvision ?? 0;
    const extraAttacks = combatStats?.extraAttacks ?? 1;

    const handleToggleSave = (ability: string) => {
        viewModel?.toggleSavingThrowProficiency(ability);
    };

    const equippedItems = (state.resolvedItems || []).filter(
        (i: any) => i.equipped && i.item.category.toLowerCase() === "armor"
    );
    const armorItems = equippedItems.filter((i: any) => !i.item.type.toLowerCase().includes("shield"));
    const shieldItems = equippedItems.filter((i: any) => i.item.type.toLowerCase().includes("shield"));

    const hasArmor = armorItems.length > 0;
    const hasShield = shieldItems.length > 0;

    const armorLabels = armorItems.map((i: any) => {
        const type = i.item.type.toLowerCase();
        if (type.includes("heavy") || type.includes("plate") || type.includes("splint")) return "Heavy";
        if (type.includes("medium") || type.includes("scale") || type.includes("breastplate")) return "Medium";
        return "Light";
    });

    const uniqueArmorLabels = Array.from(new Set(armorLabels)).sort();
    let finalLabel = uniqueArmorLabels.join(" + ");
    if (!hasArmor) finalLabel = "Unarmored";
    if (hasShield) finalLabel += " + Shield";

    const hasPenalty = state.hasArmorPenalty;
    const isShieldedProficient = hasShield && !hasPenalty;
    const theme = hasPenalty ? "red" : isShieldedProficient ? "blue" : "slate";

    const themeClasses = {
        border: {
            red: "border-red-500 ring-1 ring-red-500 bg-red-50 dark:bg-red-950/20",
            blue: "border-blue-500 ring-1 ring-blue-500 bg-blue-50 dark:bg-blue-950/20",
            slate: "border-slate-200 dark:border-slate-800"
        },
        shieldIcon: {
            red: "text-red-200 dark:text-red-900",
            blue: "text-blue-200 dark:text-blue-900",
            slate: "text-slate-100 dark:text-slate-800"
        },
        titleText: {
            red: "text-red-600 dark:text-red-400",
            blue: "text-blue-600 dark:text-blue-400",
            slate: "text-slate-400"
        },
        valueText: {
            red: "text-red-700 dark:text-red-300",
            blue: "text-blue-700 dark:text-blue-300",
            slate: "text-slate-800 dark:text-slate-100"
        },
        labelText: {
            red: "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200",
            blue: "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
            slate: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        }
    };

    return (
        <TooltipProvider delayDuration={200}>
            <div className={cn("space-y-4", className)}>
                <div className="grid grid-cols-3 gap-3">
                    {/* Armor Class */}
                    <div
                        className={cn(
                            "bg-white dark:bg-slate-900 rounded-xl p-2 flex flex-col items-center justify-center gap-0.5 border shadow-sm relative overflow-hidden min-h-[90px]",
                            themeClasses.border[theme]
                        )}
                    >
                        <Shield className={cn("w-12 h-12 absolute -bottom-2 -right-2 opacity-50", themeClasses.shieldIcon[theme])} />
                        <div className={cn("text-[10px] font-bold uppercase w-full text-center tracking-widest z-10", themeClasses.titleText[theme])}>
                            AC {hasPenalty && "(!)"}
                        </div>
                        <div className={cn("text-3xl font-black z-10 leading-none -mt-1", themeClasses.valueText[theme])}>
                            {ac}
                        </div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={cn("text-[8px] font-medium z-10 px-1.5 py-0.5 rounded uppercase tracking-tight max-w-full truncate mt-1 cursor-help", themeClasses.labelText[theme])}>
                                    {finalLabel}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs font-bold">{combatStats?.armorClassBreakdown || finalLabel}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Initiative (1-Click Instant Roll or Open Composer!) */}
                    <div
                        onClick={() =>
                            executeInstantRoll({
                                rollType: "initiative",
                                targetId: "initiative",
                                label: "Initiative Roll"
                            })
                        }
                        title="Click for 1-click Instant Initiative Roll (or click 🎲 for Composer)"
                        className="bg-white dark:bg-slate-900 rounded-xl p-2 flex flex-col items-center justify-center gap-1 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all shadow-sm min-h-[90px] group relative"
                    >
                        <div className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-indigo-400 w-full text-center tracking-widest flex items-center justify-center gap-1">
                            <span>Init</span>
                            <Zap className="w-3 h-3 text-amber-500 opacity-80 group-hover:opacity-100" />
                        </div>
                        <div className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-none">
                            {initiative >= 0 ? "+" : ""}{initiative}
                        </div>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                openRollComposer({
                                    rollType: "initiative",
                                    targetId: "initiative",
                                    label: "Initiative Roll"
                                });
                            }}
                            title="Configure Initiative Roll in Composer"
                            className="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-500 dark:text-slate-400 font-bold uppercase flex items-center gap-0.5 transition-colors"
                        >
                            <Dices size={9} /> Composer
                        </button>
                    </div>

                    {/* Speed */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-2 flex flex-col items-center justify-center gap-1 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[90px]">
                        <div className="text-[10px] font-bold uppercase text-slate-400 w-full text-center tracking-widest">Speed</div>
                        <div className="flex flex-col items-center leading-none">
                            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{speed}</span>
                            <span className="text-[10px] text-slate-400 lowercase -mt-1">ft.</span>
                        </div>
                    </div>
                </div>

                {/* Senses, Passives & Proficiency Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                    <div className="px-2.5 py-1.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Award size={11} /> Prof
                        </span>
                        <span className="text-xs font-black font-mono text-indigo-700 dark:text-indigo-300">
                            +{pb}
                        </span>
                    </div>

                    <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase text-slate-400" title="Passive Perception">
                            Pass. Perc
                        </span>
                        <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                            {passivePerception}
                        </span>
                    </div>

                    <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase text-slate-400" title="Passive Insight / Investigation">
                            Ins / Inv
                        </span>
                        <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                            {passiveInsight} / {passiveInvestigation}
                        </span>
                    </div>

                    <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase text-slate-400 flex items-center gap-1">
                            <Eye size={10} /> Darkvision
                        </span>
                        <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                            {darkvision > 0 ? `${darkvision} ft.` : "None"}
                        </span>
                    </div>

                    <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between col-span-2 sm:col-span-2">
                        <span className="text-[9px] font-bold uppercase text-slate-400 flex items-center gap-1">
                            <Swords size={10} /> Attacks / Action
                        </span>
                        <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                            {extraAttacks}x Attack{extraAttacks > 1 ? "s (Extra Attack)" : ""}
                        </span>
                    </div>
                </div>

                {/* Damage Defenses (Resistances, Immunities & Vulnerabilities) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                            <ShieldAlert size={11} /> Damage Defenses
                        </span>
                        <button
                            type="button"
                            onClick={() => setEditingDefenses((prev) => !prev)}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                        >
                            {editingDefenses ? (
                                <>Done</>
                            ) : (
                                <>
                                    <Plus size={10} /> Edit
                                </>
                            )}
                        </button>
                    </div>

                    {hasAnyDefenses ? (
                        <div className="flex flex-wrap gap-1">
                            {autoResistances.map((r) => (
                                <span
                                    key={`auto-${r.type}-${r.source}`}
                                    title={`Automatic Resistance (${r.source})`}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold capitalize bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                >
                                    <span className="text-[9px] uppercase opacity-75">Res</span>
                                    {r.type}
                                </span>
                            ))}
                            {customResistances.map((t) => (
                                <button
                                    key={`res-${t}`}
                                    type="button"
                                    onClick={() => viewModel?.toggleDamageDefense(t, "resistance")}
                                    title={`Click to remove ${t} Resistance`}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold capitalize bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 hover:bg-amber-500/25"
                                >
                                    <span className="text-[9px] uppercase opacity-75">Res</span>
                                    {t}
                                    <X size={9} />
                                </button>
                            ))}
                            {customImmunities.map((t) => (
                                <button
                                    key={`imm-${t}`}
                                    type="button"
                                    onClick={() => viewModel?.toggleDamageDefense(t, "immunity")}
                                    title={`Click to remove ${t} Immunity`}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold capitalize bg-purple-500/15 text-purple-800 dark:text-purple-200 border border-purple-500/40 hover:bg-purple-500/25"
                                >
                                    <span className="text-[9px] uppercase opacity-75">Imm</span>
                                    {t}
                                    <X size={9} />
                                </button>
                            ))}
                            {customVulnerabilities.map((t) => (
                                <button
                                    key={`vuln-${t}`}
                                    type="button"
                                    onClick={() => viewModel?.toggleDamageDefense(t, "vulnerability")}
                                    title={`Click to remove ${t} Vulnerability`}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold capitalize bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/40 hover:bg-red-500/25"
                                >
                                    <span className="text-[9px] uppercase opacity-75">Vuln</span>
                                    {t}
                                    <X size={9} />
                                </button>
                            ))}
                        </div>
                    ) : (
                        !editingDefenses && (
                            <p className="text-[10px] text-slate-400">None active</p>
                        )
                    )}

                    {editingDefenses && (
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="grid grid-cols-3 gap-1">
                                {(["resistance", "immunity", "vulnerability"] as DefenseKind[]).map((kind) => (
                                    <button
                                        key={kind}
                                        type="button"
                                        onClick={() => setDefenseKind(kind)}
                                        className={cn(
                                            "py-1 px-1.5 rounded text-[10px] font-bold capitalize transition-colors",
                                            defenseKind === kind
                                                ? kind === "immunity"
                                                    ? "bg-purple-600 text-white"
                                                    : kind === "vulnerability"
                                                      ? "bg-red-600 text-white"
                                                      : "bg-amber-600 text-white"
                                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                        )}
                                    >
                                        {kind}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {DAMAGE_TYPES.map((dmg) => {
                                    const activeList =
                                        defenseKind === "immunity"
                                            ? customImmunities
                                            : defenseKind === "vulnerability"
                                              ? customVulnerabilities
                                              : customResistances;
                                    const isActive = activeList.some((x) => x.toLowerCase() === dmg);
                                    return (
                                        <button
                                            key={dmg}
                                            type="button"
                                            onClick={() => viewModel?.toggleDamageDefense(dmg, defenseKind)}
                                            className={cn(
                                                "px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize border transition-colors",
                                                isActive
                                                    ? defenseKind === "immunity"
                                                        ? "bg-purple-600 text-white border-purple-600"
                                                        : defenseKind === "vulnerability"
                                                          ? "bg-red-600 text-white border-red-600"
                                                          : "bg-amber-600 text-white border-amber-600"
                                                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                                            )}
                                        >
                                            {dmg}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Saving Throws: Click Card to Toggle Proficiency, Click Dice Button to Roll */}
                {saves.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Saving Throws</h3>
                            <span className="text-[10px] text-slate-400">Click box: Prof • 🎲: Roll</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {saves.map((save) => {
                                const { ability, total, isProficient, hasBonus, advantageState } = save;
                                const isManual = character?.proficiencies?.savingThrows?.[ability] === true;
                                const isClassOrOther = isProficient && !isManual;

                                return (
                                    <div
                                        key={ability}
                                        onClick={() => handleToggleSave(ability)}
                                        className={cn(
                                            "flex flex-col items-center p-2 border rounded-lg text-center cursor-pointer transition-colors group relative select-none",
                                            isProficient
                                                ? "border-indigo-500/40 bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40"
                                                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                        )}
                                        title={`Click to toggle ${ability.toUpperCase()} Saving Throw Proficiency`}
                                    >
                                        {/* Top Row: Proficiency Check/Circle + Ability Name */}
                                        <div className="flex items-center justify-center gap-1 mb-0.5">
                                            {isProficient ? (
                                                <Check
                                                    size={13}
                                                    className={cn(
                                                        "font-bold",
                                                        isClassOrOther ? "text-indigo-500" : "text-amber-500 dark:text-amber-400"
                                                    )}
                                                />
                                            ) : (
                                                <Circle size={11} className="text-slate-300 dark:text-slate-600" />
                                            )}
                                            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                                                {ability}
                                            </span>
                                        </div>

                                        {/* Modifier Value */}
                                        <div
                                            className={cn(
                                                "text-lg font-bold leading-none my-1 font-mono",
                                                isClassOrOther && "text-indigo-600 dark:text-indigo-400",
                                                isManual && "text-amber-600 dark:text-amber-400"
                                            )}
                                        >
                                            {total >= 0 ? `+${total}` : total}
                                        </div>

                                        {/* Dual Roll Buttons: ⚡ Instant 1-Click Roll & 🎲 Composer */}
                                        <div className="mt-1 w-full flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    executeInstantRoll({
                                                        rollType: "saving_throw",
                                                        targetId: ability,
                                                        advantageMode: (advantageState as any) || "NORMAL",
                                                        label: `${ability.toUpperCase()} Saving Throw`
                                                    });
                                                }}
                                                className="flex-1 py-0.5 px-1 rounded bg-indigo-500/15 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 dark:text-indigo-300 dark:hover:text-white text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-0.5 transition-colors border border-indigo-500/20"
                                                title={`1-Click Instant Roll ${ability.toUpperCase()} Save`}
                                            >
                                                <Zap size={9} />
                                                Roll
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openRollComposer({
                                                        rollType: "saving_throw",
                                                        targetId: ability,
                                                        advantageMode: (advantageState as any) || "NORMAL",
                                                        label: `${ability.toUpperCase()} Saving Throw`
                                                    });
                                                }}
                                                className="py-0.5 px-1.5 rounded bg-slate-100 hover:bg-slate-700 text-slate-600 hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-[9px] font-bold flex items-center justify-center transition-colors"
                                                title={`Open ${ability.toUpperCase()} Save in Roll Composer`}
                                            >
                                                <Dices size={10} />
                                            </button>
                                        </div>

                                        {hasBonus && (
                                            <div
                                                className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500"
                                                title="Bonus from Item/Feat"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}
