"use client";

import React, { useState } from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Scroll,
    BookOpen,
    Flame,
    ChevronDown,
    ChevronUp,
    Trash2,
    Focus,
    X,
    Shield,
    Dices,
    Sparkles,
    Lock,
    RefreshCw,
    CheckCircle2,
    Plus,
    Search,
    Zap
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSchoolName, formatDuration } from "@/lib/format-description";
import { KmpAddContentDialog } from "./KmpAddContentDialog";
import { KmpSpellSlotsTracker } from "./KmpSpellSlotsTracker";

export function KmpSpellList() {
    const { viewModel, state, catalog, openRollComposer, executeInstantRoll } = useKmpCharacter();
    const [selectedFilter, setSelectedFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [expandedSpells, setExpandedSpells] = useState<Set<string>>(new Set());
    const [editingGrantSlotId, setEditingGrantSlotId] = useState<string | null>(null);

    if (!state || !state.resolvedSpells) return <div>Loading Spells...</div>;

    const spells = [...state.resolvedSpells].sort((a: any, b: any) => {
        const lvlDiff = (a.spell?.level ?? 0) - (b.spell?.level ?? 0);
        if (lvlDiff !== 0) return lvlDiff;
        return (a.spell?.name || "").localeCompare(b.spell?.name || "");
    });

    const concentratingSpell = spells.find((s: any) => s.isConcentrating);
    const grantSlots: any[] = state.spellGrantSlots || [];
    const allCatalogSpells: any[] = catalog?.spells || state.availableClassSpells || [];

    // Separate spells into:
    // 1) Fixed Grants (Subclass / Species Locked)
    // 2) Player-Choice Grants (Feat / Species Swappable)
    // 3) Class Cantrips & Leveled Spells (Prepared Today vs Unprepared in Spellbook/List)
    const fixedGrantedSpells = spells.filter((s: any) => s.source?.endsWith("_fixed"));
    const choiceGrantedSpells = spells.filter((s: any) => s.source?.startsWith("choice:"));
    const classOrSpellbookSpells = spells.filter(
        (s: any) => !s.source?.endsWith("_fixed") && !s.source?.startsWith("choice:")
    );

    const knownCantripsCount = state.knownCantripsCount ?? classOrSpellbookSpells.filter((s: any) => s.spell?.level === 0).length;
    const maxCantrips = state.maxCantrips ?? 0;
    const preparedCount = state.preparedSpellsCount ?? classOrSpellbookSpells.filter((s: any) => s.spell?.level > 0 && s.prepared).length;
    const maxPrepared = state.maxPreparedSpells ?? 0;
    const isPrepCapReached = maxPrepared > 0 && preparedCount >= maxPrepared;

    const toggleExpand = (spellId: string) => {
        setExpandedSpells((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(spellId)) newSet.delete(spellId);
            else newSet.add(spellId);
            return newSet;
        });
    };

    const hasStats = state.resolvedSpellcastingStats && state.resolvedSpellcastingStats.length > 0;

    const getDefaultSpellRiderIds = (spellId: string): string[] => {
        const matchedAct = (state.actions || []).find((a: any) => a.id === spellId);
        const riders: any[] = matchedAct?.eligibleRiders || [];
        return riders
            .filter((r) => !r.consumesSlotLevel && !r.consumesResourceId)
            .map((r) => r.id);
    };

    const primarySpellStat = (state.resolvedSpellcastingStats || [])[0];
    const getSpellMechanicsBadge = (spell: any): string | null => {
        if (!spell?.mechanics) return null;
        const m = spell.mechanics;
        const parts: string[] = [];
        if (m.attackType && m.attackType !== "none") {
            const atkBonus = primarySpellStat?.attackBonus ?? 0;
            parts.push(`${atkBonus >= 0 ? `+${atkBonus}` : atkBonus} Hit`);
        } else if (m.saveAbility) {
            const dc = primarySpellStat?.saveDC ?? 13;
            parts.push(`${m.saveAbility.toUpperCase()} DC ${dc}`);
        }
        if (m.damage && m.damage.length > 0) {
            const d0 = m.damage[0];
            parts.push(`${d0.dice} ${d0.type}`);
        } else if (m.healing?.dice) {
            parts.push(`${m.healing.dice} Heal`);
        } else if (m.appliesModifiers && m.appliesModifiers.length > 0) {
            parts.push("Buff");
        }
        return parts.length > 0 ? parts.join(" • ") : null;
    };

    // Group class/spellbook spells by level
    const qLower = searchQuery.trim().toLowerCase();
    const filteredClassSpells = classOrSpellbookSpells.filter((entry: any) => {
        const sp = entry.spell || {};
        const lvl = sp.level ?? 0;
        const ct = (sp.castingTime || "").toLowerCase();

        if (qLower) {
            const matchName = (sp.name || "").toLowerCase().includes(qLower);
            const matchSchool = (sp.school || "").toLowerCase().includes(qLower);
            const matchDesc = (sp.description || "").toLowerCase().includes(qLower);
            if (!matchName && !matchSchool && !matchDesc) return false;
        }

        if (selectedFilter === "all") return true;
        if (selectedFilter === "prepared") return lvl === 0 || entry.prepared;
        if (selectedFilter === "unprepared") return lvl > 0 && !entry.prepared;
        if (selectedFilter === "action") return ct.includes("action") && !ct.includes("bonus") && !ct.includes("reaction");
        if (selectedFilter === "bonus") return ct.includes("bonus");
        if (selectedFilter === "reaction") return ct.includes("reaction");
        if (selectedFilter === "concentration") return !!sp.isConcentration;
        if (selectedFilter === "ritual") return !!(entry.isRitual || sp.isRitual);
        return String(lvl) === selectedFilter;
    });

    const spellsByLevel: Record<number, any[]> = {};
    filteredClassSpells.forEach((entry: any) => {
        const level = entry.spell.level;
        if (!spellsByLevel[level]) spellsByLevel[level] = [];
        spellsByLevel[level].push(entry);
    });
    const levels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b);

    return (
        <TooltipProvider delayDuration={200} skipDelayDuration={100}>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                {/* Top Header & Total Preparation Summary Bar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <Flame className="w-5 h-5 text-orange-500" />
                            <div>
                                <h3 className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">
                                    Spellbook & Daily Preparation
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Adding a spell to your Spellbook does not auto-prepare it. Prepare up to your total daily limit across all spell levels.
                                </p>
                            </div>
                        </div>
                        <KmpAddContentDialog
                            type="spell"
                            trigger={
                                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                                    <Plus className="w-3.5 h-3.5" />
                                    Add to Spellbook
                                </Button>
                            }
                        />
                    </div>

                    {/* Preparation Pools (Total Across All Levels, Not Per Level!) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Total Prepared Pool */}
                        <div
                            className={cn(
                                "p-2.5 rounded-lg border flex items-center justify-between",
                                isPrepCapReached
                                    ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            )}
                        >
                            <div>
                                <div className="text-[10px] font-bold uppercase text-slate-400">
                                    Total Prepared (Lvl 1–9)
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    Pool across all spell levels
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-black font-mono text-blue-600 dark:text-blue-400">
                                    {preparedCount} / {maxPrepared}
                                </span>
                            </div>
                        </div>

                        {/* Class Cantrips Known Pool */}
                        <div className="p-2.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] font-bold uppercase text-slate-400">
                                    Class Cantrips Known
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    At-will level 0 spells
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                                    {knownCantripsCount} / {maxCantrips}
                                </span>
                            </div>
                        </div>

                        {/* Bonus Always-Prepared Grants */}
                        <div className="p-2.5 rounded-lg border bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-800/50 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                                    Granted Always-Prepared
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    Free bonus (0 prep cost)
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                                    +{fixedGrantedSpells.length + choiceGrantedSpells.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Spellcasting Stats & Spell Slots */}
                    {hasStats && (
                        <div className="grid grid-cols-1 gap-2">
                            {state.resolvedSpellcastingStats.map((stat: any) => (
                                <div
                                    key={stat.classId}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 flex items-center justify-between shadow-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                            {stat.className}
                                        </Badge>
                                        <span className="text-xs text-slate-500 font-mono">
                                            Spellcasting Ability: <strong>{stat.ability}</strong>
                                        </span>
                                    </div>
                                    <div className="flex gap-5">
                                        <div className="text-center">
                                            <div className="text-[9px] text-slate-400 uppercase font-bold">Ability Mod</div>
                                            <div className="text-sm font-bold font-mono text-slate-700 dark:text-slate-200">
                                                {stat.modifier >= 0 ? `+${stat.modifier}` : stat.modifier}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[9px] text-slate-400 uppercase font-bold">Save DC</div>
                                            <div className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                                                {stat.saveDC}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[9px] text-slate-400 uppercase font-bold">Spell Attack</div>
                                            <div className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                                                +{stat.attackBonus}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {concentratingSpell && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-2.5 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Focus className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-pulse" />
                                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                    Active Concentration: <strong>{concentratingSpell.spell.name}</strong>
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400"
                                onClick={() =>
                                    viewModel?.setConcentration(
                                        concentratingSpell.spell.id,
                                        concentratingSpell.spell.name
                                    )
                                }
                            >
                                <X size={12} className="mr-1" /> Drop
                            </Button>
                        </div>
                    )}

                    <KmpSpellSlotsTracker />
                </div>

                {state.hasArmorPenalty && (
                    <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 p-2.5 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                        <span className="font-bold flex items-center gap-1 shrink-0">
                            <Shield className="w-3.5 h-3.5" /> Armor Proficiency Warning:
                        </span>
                        <span>You are wearing armor you are not proficient with. You cannot cast spells while wearing it.</span>
                    </div>
                )}

                <div className="p-4 space-y-6">
                    {/* SECTION 1: Player-Choice Granted Spells (Swappable — e.g. Magic Initiate, High Elf, Fey Touched) */}
                    {grantSlots.length > 0 && (
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Feat & Lineage Spell Choices (Always Prepared • Player Choice)
                                </h4>
                                <span className="text-[10px] text-slate-400">
                                    Click Change to swap your chosen spell
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {grantSlots.map((slot: any) => {
                                    const boundEntry = spells.find((s: any) => s.source === `choice:${slot.slotId}`);
                                    const boundSpell = boundEntry?.spell;
                                    const isEditing = editingGrantSlotId === slot.slotId;

                                    // Filter eligible spells from catalog for this choice slot
                                    const eligibleChoices = allCatalogSpells.filter((sp: any) => {
                                        if (sp.level !== slot.spellLevel) return false;
                                        if (slot.spellClassFilter && slot.spellClassFilter !== "any") {
                                            return (sp.classes || []).some(
                                                (c: string) => c.toLowerCase() === slot.spellClassFilter.toLowerCase()
                                            );
                                        }
                                        return true;
                                    });

                                    return (
                                        <div
                                            key={slot.slotId}
                                            className="p-3 rounded-xl border border-amber-300/60 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/15 space-y-2"
                                        >
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <div className="min-w-0">
                                                    <div className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                                                        {slot.sourceName}
                                                    </div>
                                                    {boundSpell ? (
                                                        <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5 flex-wrap">
                                                            <span>{boundSpell.name}</span>
                                                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300">
                                                                {slot.spellLevel === 0 ? "Cantrip" : `Level ${slot.spellLevel}`} • Always Prepared
                                                            </Badge>
                                                            {slot.grantsFreeCastPerLongRest && (
                                                                <Badge
                                                                    className={cn(
                                                                        "text-[9px] h-4 px-1.5",
                                                                        slot.freeCastUsed
                                                                            ? "bg-slate-700 text-slate-300"
                                                                            : "bg-emerald-600 text-white"
                                                                    )}
                                                                >
                                                                    {slot.freeCastUsed ? "1/LR Free Cast Used" : "1/LR Free Cast Ready"}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs italic text-amber-700 dark:text-amber-300 mt-0.5">
                                                            No spell chosen yet — select a {slot.spellClassFilter} {slot.spellLevel === 0 ? "cantrip" : `level ${slot.spellLevel} spell`}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {boundSpell && (
                                                        <Button
                                                            size="sm"
                                                            className="h-7 text-[11px] px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white gap-1"
                                                            onClick={() =>
                                                                openRollComposer({
                                                                    rollType: "spell",
                                                                    targetId: boundSpell.id,
                                                                    selectedRiderIds: getDefaultSpellRiderIds(boundSpell.id),
                                                                    slotLevel: slot.spellLevel > 0 ? slot.spellLevel : null,
                                                                    useFreeCast: slot.grantsFreeCastPerLongRest && !slot.freeCastUsed,
                                                                    label: boundSpell.name
                                                                })
                                                            }
                                                        >
                                                            <Dices className="w-3 h-3" />
                                                            {slot.grantsFreeCastPerLongRest && !slot.freeCastUsed ? "Cast Free" : "Cast"}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-[11px] px-2.5 border-amber-400/50 text-amber-700 dark:text-amber-300 gap-1"
                                                        onClick={() =>
                                                            setEditingGrantSlotId(isEditing ? null : slot.slotId)
                                                        }
                                                    >
                                                        <RefreshCw className="w-3 h-3" />
                                                        {boundSpell ? "Change Choice" : "Choose Spell"}
                                                    </Button>
                                                </div>
                                            </div>

                                            {isEditing && (
                                                <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/50 flex items-center gap-2">
                                                    <Select
                                                        value={boundSpell?.id || ""}
                                                        onValueChange={(newSpellId) => {
                                                            viewModel?.selectGrantedSpell(slot.slotId, newSpellId);
                                                            setEditingGrantSlotId(null);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                                                            <SelectValue
                                                                placeholder={`Select a ${slot.spellClassFilter} ${
                                                                    slot.spellLevel === 0 ? "Cantrip" : `Level ${slot.spellLevel} Spell`
                                                                }...`}
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-64">
                                                            {eligibleChoices.map((sp: any) => (
                                                                <SelectItem key={sp.id} value={sp.id}>
                                                                    {sp.name} ({sp.school} • {sp.castingTime})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: Fixed Subclass & Species Granted Spells (Locked Always-Prepared) */}
                    {fixedGrantedSpells.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5" />
                                    Subclass & Species Fixed Spells (Always Prepared • Locked)
                                </h4>
                                <span className="text-[10px] text-slate-400">
                                    Granted automatically by class/species rules
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-1.5">
                                {fixedGrantedSpells.map((entry: any) => {
                                    const spell = entry.spell;
                                    const isExpanded = expandedSpells.has(spell.id);
                                    const srcLabel = entry.source === "subclass_fixed" ? "Subclass Grant" : "Species Grant";

                                    return (
                                        <div
                                            key={spell.id}
                                            className="rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/20 dark:bg-purple-950/10"
                                        >
                                            <div
                                                className="flex items-center justify-between p-2.5 cursor-pointer"
                                                onClick={() => toggleExpand(spell.id)}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <Scroll className="w-4 h-4 text-purple-500 shrink-0" />
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                                                            <span>{spell.name}</span>
                                                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-purple-400/50 text-purple-600 dark:text-purple-300">
                                                                {spell.level === 0 ? "Cantrip" : `Lvl ${spell.level}`} • {srcLabel}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {spell.school} • {spell.castingTime} • {spell.range}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        size="sm"
                                                        className="h-7 text-[11px] px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white gap-1"
                                                        onClick={() =>
                                                            openRollComposer({
                                                                rollType: "spell",
                                                                targetId: spell.id,
                                                                selectedRiderIds: getDefaultSpellRiderIds(spell.id),
                                                                slotLevel: spell.level > 0 ? spell.level : null,
                                                                label: spell.name
                                                            })
                                                        }
                                                    >
                                                        <Dices className="w-3 h-3" />
                                                        Cast
                                                    </Button>
                                                    {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="px-3 pb-3 pt-2 border-t border-purple-200/50 dark:border-purple-900/50 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">
                                                    {spell.description}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: Class Cantrips & Spellbook / Known Spells (Prepare vs Unprepare) */}
                    <div className="space-y-3">
                        <div className="space-y-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Class Spells &amp; Spellbook ({classOrSpellbookSpells.length})
                                </h4>
                                <div className="relative w-full sm:w-64">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search spells by name, school, effect..."
                                        className="h-7 pl-8 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Filter Pills (Prep State + Action Economy) */}
                            <div className="flex flex-wrap gap-1">
                                {[
                                    { id: "all", label: "All" },
                                    { id: "prepared", label: `Prepared (${preparedCount}/${maxPrepared})` },
                                    { id: "unprepared", label: "Unprepared" },
                                    { id: "0", label: `Cantrips (${knownCantripsCount}/${maxCantrips})` },
                                    { id: "action", label: "1 Action" },
                                    { id: "bonus", label: "Bonus Action" },
                                    { id: "reaction", label: "Reaction" },
                                    { id: "concentration", label: "Concentration" },
                                    { id: "ritual", label: "Ritual" }
                                ].map((tab) => (
                                    <Button
                                        key={tab.id}
                                        variant={selectedFilter === tab.id ? "secondary" : "ghost"}
                                        size="sm"
                                        className="h-6 text-[11px] px-2"
                                        onClick={() => setSelectedFilter(tab.id)}
                                    >
                                        {tab.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {levels.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                <BookOpen className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm">No spells match the current filter.</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Click &ldquo;Add to Spellbook&rdquo; above to add spells from the rules catalog.
                                </p>
                            </div>
                        ) : (
                            levels.map((lvl) => (
                                <div key={lvl} className="space-y-1.5">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 flex justify-between items-center">
                                        <span>{lvl === 0 ? "Class Cantrips (Level 0)" : `Level ${lvl} Spells`}</span>
                                        {lvl > 0 && (
                                            <span className="text-[10px] font-normal text-slate-400">
                                                Counts toward Total Prepared ({preparedCount}/{maxPrepared}) when Prepared
                                            </span>
                                        )}
                                    </h5>

                                    <div className="grid grid-cols-1 gap-1.5">
                                        {spellsByLevel[lvl].map((entry: any, i: number) => {
                                            const spell = entry.spell;
                                            const actualId = spell.id;
                                            const isExpanded = expandedSpells.has(actualId);
                                            const schoolAbbr = (spell.school || "UNK").substring(0, 3).toUpperCase();
                                            const isPrepared = entry.prepared === true || lvl === 0;
                                            const cannotPrepareMore = !entry.prepared && lvl > 0 && isPrepCapReached;

                                            return (
                                                <div
                                                    key={`${actualId}-${i}`}
                                                    className={cn(
                                                        "rounded-lg transition border group flex flex-col",
                                                        isExpanded
                                                            ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                                                            : isPrepared
                                                            ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400/50"
                                                            : "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 opacity-85 hover:opacity-100"
                                                    )}
                                                >
                                                    <div
                                                        className="flex items-center justify-between p-2.5 cursor-pointer select-none gap-2 flex-wrap sm:flex-nowrap"
                                                        onClick={() => toggleExpand(actualId)}
                                                    >
                                                        <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-[180px]">
                                                            <div
                                                                className={cn(
                                                                    "p-1.5 rounded-md shrink-0",
                                                                    lvl === 0
                                                                        ? "bg-slate-100 text-slate-500 dark:bg-slate-800"
                                                                        : isPrepared
                                                                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                                                                        : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                                                                )}
                                                            >
                                                                <Scroll size={14} />
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-sm font-semibold leading-none flex items-center gap-2 flex-wrap">
                                                                    <span className="truncate">{spell.name}</span>
                                                                    {getSpellMechanicsBadge(spell) && (
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className="text-[9px] h-4 px-1.5 font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25"
                                                                        >
                                                                            {getSpellMechanicsBadge(spell)}
                                                                        </Badge>
                                                                    )}
                                                                    {entry.isRitual && (
                                                                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
                                                                            Ritual
                                                                        </Badge>
                                                                    )}
                                                                    {spell.isConcentration && (
                                                                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-purple-500/40 text-purple-600 dark:text-purple-400">
                                                                            Conc.
                                                                        </Badge>
                                                                    )}
                                                                </div>

                                                                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-1">
                                                                    <span>{getSchoolName(schoolAbbr)}</span>
                                                                    <span>•</span>
                                                                    <span>{spell.castingTime}</span>
                                                                    <span>•</span>
                                                                    <span>{spell.range}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Action Buttons: Prepare/Unprepare + Cast + Forget */}
                                                        <div
                                                            className="flex items-center gap-1.5 shrink-0 ml-auto"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {lvl > 0 && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button
                                                                            type="button"
                                                                            disabled={cannotPrepareMore}
                                                                            onClick={() =>
                                                                                viewModel?.prepareSpell(
                                                                                    actualId,
                                                                                    !entry.prepared
                                                                                )
                                                                            }
                                                                            className={cn(
                                                                                "text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wide font-bold transition-colors border flex items-center gap-1",
                                                                                entry.prepared
                                                                                    ? "bg-blue-600 text-white border-blue-500 hover:bg-blue-700"
                                                                                    : cannotPrepareMore
                                                                                    ? "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-800 cursor-not-allowed"
                                                                                    : "bg-white text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:border-blue-500 hover:text-blue-500"
                                                                            )}
                                                                        >
                                                                            {entry.prepared && <CheckCircle2 className="w-3 h-3" />}
                                                                            {entry.prepared ? "Prepared" : "+ Prepare"}
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    {cannotPrepareMore && (
                                                                        <TooltipContent>
                                                                            <p className="text-xs">
                                                                                Total Prepared limit reached ({preparedCount}/{maxPrepared}). Unprepare another spell first.
                                                                            </p>
                                                                        </TooltipContent>
                                                                    )}
                                                                </Tooltip>
                                                            )}

                                                            {(isPrepared || entry.isRitual) && (
                                                                <>
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-7 text-[10px] px-2 bg-amber-600 hover:bg-amber-500 text-white"
                                                                        onClick={() =>
                                                                            executeInstantRoll({
                                                                                rollType: "spell",
                                                                                targetId: actualId,
                                                                                selectedRiderIds: getDefaultSpellRiderIds(actualId),
                                                                                slotLevel: lvl > 0 ? lvl : null,
                                                                                isRitualCast: !isPrepared && entry.isRitual,
                                                                                label: spell.name
                                                                            })
                                                                        }
                                                                        title={`1-Click Instant Cast ${spell.name}`}
                                                                    >
                                                                        ⚡
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-7 text-[10px] px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white gap-1"
                                                                        onClick={() =>
                                                                            openRollComposer({
                                                                                rollType: "spell",
                                                                                targetId: actualId,
                                                                                selectedRiderIds: getDefaultSpellRiderIds(actualId),
                                                                                slotLevel: lvl > 0 ? lvl : null,
                                                                                isRitualCast: !isPrepared && entry.isRitual,
                                                                                label: spell.name
                                                                            })
                                                                        }
                                                                    >
                                                                        <Dices className="w-3 h-3" />
                                                                        {!isPrepared && entry.isRitual ? "Ritual Cast" : "Cast"}
                                                                    </Button>
                                                                </>
                                                            )}

                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-slate-400 hover:text-red-500"
                                                                title="Remove from Spellbook"
                                                                onClick={() => viewModel?.forgetSpell(actualId)}
                                                            >
                                                                <Trash2 size={13} />
                                                            </Button>

                                                            {isExpanded ? (
                                                                <ChevronUp size={14} className="text-slate-400" />
                                                            ) : (
                                                                <ChevronDown size={14} className="text-slate-400" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="px-3 pb-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                                                            {spell.duration && (
                                                                <div className="flex gap-2 mb-2">
                                                                    <Badge variant="outline" className="text-[10px] font-normal">
                                                                        Duration: {formatDuration(spell.duration)}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                                                {spell.description}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
