"use client";

import React, { useState } from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scroll, BookOpen, Flame, Plus, ChevronDown, ChevronUp, Trash2, Focus, X, Circle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getComponentTooltip, getSchoolName, getSchoolDescription, formatDuration } from "@/lib/format-description";
import { KmpAddContentDialog } from "./KmpAddContentDialog";
import { KmpSpellSlotsTracker } from "./KmpSpellSlotsTracker";

export function KmpSpellList() {
    const { viewModel, state } = useKmpCharacter();
    const [selectedLevel, setSelectedLevel] = useState<string>("all");
    const [expandedSpells, setExpandedSpells] = useState<Set<string>>(new Set());


    if (!state || !state.resolvedSpells) return <div>Loading Spells...</div>;

    const spells = state.resolvedSpells;
    const concentratingSpell = spells.find((s: any) => s.isConcentrating);

    // Group by Level
    const spellsByLevel: Record<number, any[]> = {};
    spells.forEach((entry: any) => {
        const level = entry.spell.level;
        if (!spellsByLevel[level]) spellsByLevel[level] = [];
        spellsByLevel[level].push(entry);
    });

    const levels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b);
    const isEmpty = levels.length === 0;

    const toggleExpand = (spellId: string) => {
        setExpandedSpells(prev => {
            const newSet = new Set(prev);
            if (newSet.has(spellId)) newSet.delete(spellId);
            else newSet.add(spellId);
            return newSet;
        });
    };

    const hasStats = state.resolvedSpellcastingStats && state.resolvedSpellcastingStats.length > 0;


    return (
        <TooltipProvider delayDuration={200} skipDelayDuration={100}>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">

                {/* Header */}
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <h3 className="text-sm font-bold uppercase text-slate-600 dark:text-slate-300">Spellbook</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 mr-2">{spells.length} spells</span>
                        <KmpAddContentDialog type="spell" />
                    </div>
                </div>

                {state.hasArmorPenalty && (
                    <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 p-2 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
                        <span className="font-bold flex items-center gap-1 shrink-0 mt-0.5">
                            <Shield className="w-3 h-3" /> Armor Warning:
                        </span>
                        <span>
                            You are wearing armor you are not proficient with. You cannot cast spells.
                        </span>
                    </div>
                )}

                {/* Slots & Concentration Area */}
                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-3">
                    {/* Spellcasting Stats */}
                    {hasStats && (
                        <div className="grid grid-cols-1 gap-2">
                            {state.resolvedSpellcastingStats.map((stat: any) => (
                                <div key={stat.classId} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 flex items-center justify-between shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.className}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">{stat.ability}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-center">
                                            <div className="text-[8px] text-slate-400 uppercase">Mod</div>
                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                {stat.modifier >= 0 ? '+' : ''}{stat.modifier}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[8px] text-slate-400 uppercase">DC</div>
                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{stat.saveDC}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[8px] text-slate-400 uppercase">Atk</div>
                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">+{stat.attackBonus}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Concentration Indicator */}
                    {/* Concentration Indicator */}
                    {concentratingSpell && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-2 rounded-md flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Focus className="h-3 w-3 text-purple-600 dark:text-purple-400 animate-pulse" />
                                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                    Concentrating: <strong>{concentratingSpell.spell.name}</strong>
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-purple-600 hover:text-purple-800 dark:text-purple-400"
                                onClick={() => viewModel?.setConcentration(concentratingSpell.spell.id, concentratingSpell.spell.name)}
                            >
                                <X size={12} />
                            </Button>
                        </div>
                    )}



                    <KmpSpellSlotsTracker />
                </div>

                {/* Filter Bar */}
                <div className="flex gap-1 p-2 overflow-x-auto border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                    <Button
                        variant={selectedLevel === "all" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => setSelectedLevel("all")}
                    >
                        All
                    </Button>
                    {levels.map(lvl => (
                        <Button
                            key={lvl}
                            variant={selectedLevel === String(lvl) ? "secondary" : "ghost"}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => setSelectedLevel(String(lvl))}
                        >
                            {lvl === 0 ? "Cantrips" : `Lvl ${lvl}`}
                        </Button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2 space-y-4">


                    {isEmpty ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                            <BookOpen className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">No spells known.</p>
                        </div>
                    ) : (
                        levels.map(lvl => {
                            if (selectedLevel !== "all" && String(lvl) !== selectedLevel) return null;

                            return (
                                <div key={lvl} className="space-y-1">
                                    {selectedLevel === "all" && (
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 mb-1 mt-2 first:mt-0 flex justify-between items-center">
                                            <span>{lvl === 0 ? "Cantrips" : `Level ${lvl}`}</span>
                                            {lvl > 0 && <span className="text-[9px] font-normal text-slate-300">Uses Slot</span>}
                                        </h4>
                                    )}

                                    <div className="grid grid-cols-1 gap-1">
                                        {spellsByLevel[lvl].map((entry: any, i: number) => {
                                            const spell = entry.spell;
                                            const spellId = entry.spell.id; // Corrected ID access depending on model
                                            // Model check: entry is KnownSpell(spell: Spell, prepared). spell is Spell(id, name...)
                                            // legacy used `spellId` top level maybe.
                                            // `KnownSpell` has `spell` object. `Spell` has `id`.
                                            const actualId = spell.id;

                                            const isFallback = spell.description === "Loading or Not Found";
                                            const isExpanded = expandedSpells.has(actualId);
                                            const schoolAbbr = spell.school.substring(0, 3).toUpperCase();
                                            const isComponentsSimple = !spell.components;

                                            return (
                                                <div
                                                    key={`${actualId}-${i}`}
                                                    className={cn(
                                                        "rounded transition border group flex flex-col",
                                                        isExpanded
                                                            ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                                                            : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                                    )}
                                                >
                                                    {/* Header Card */}
                                                    <div
                                                        className="flex items-center justify-between p-2 cursor-pointer select-none"
                                                        onClick={() => toggleExpand(actualId)}
                                                    >
                                                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                                                            <div className={`p-1.5 rounded-md shrink-0 ${lvl === 0 ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'}`}>
                                                                <Scroll size={14} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-sm font-medium leading-none flex items-center gap-2 flex-wrap">
                                                                    <span className="truncate">{spell.name}</span>

                                                                    {/* Ritual icon indicator */}
                                                                    {entry.isRitual && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <BookOpen className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p className="text-xs">Casting as ritual</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    )}

                                                                    {/* Actions (Prepare/Conc) */}
                                                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                                        {lvl > 0 && (
                                                                            <button
                                                                                onClick={() => viewModel?.prepareSpell(actualId, !entry.prepared)}
                                                                                className={cn(
                                                                                    "text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-bold cursor-pointer transition-colors border select-none",
                                                                                    entry.prepared
                                                                                        ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800"
                                                                                        : "bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 hover:bg-slate-100"
                                                                                )}
                                                                            >
                                                                                {entry.prepared ? "Prepared" : "Prepare"}
                                                                            </button>
                                                                        )}

                                                                        {spell.isConcentration && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    // Toggle logic handled by ViewModel
                                                                                    viewModel?.setConcentration(actualId, spell.name);
                                                                                }}
                                                                                className={cn(
                                                                                    "text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-bold cursor-pointer transition-colors border select-none",
                                                                                    entry.isConcentrating
                                                                                        ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-800 animate-pulse"
                                                                                        : "bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 hover:bg-purple-50 hover:text-purple-600"
                                                                                )}
                                                                                title="Toggle Concentration"
                                                                            >
                                                                                {entry.isConcentrating ? "Conc." : "Conc"}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2 mt-1 min-h-[16px]">
                                                                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                                                        {isFallback ? (
                                                                            <span className="animate-pulse text-slate-300">Loading details...</span>
                                                                        ) : (
                                                                            <>
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild><span className="cursor-help hover:text-slate-600 dark:hover:text-slate-300">{schoolAbbr}</span></TooltipTrigger>
                                                                                    <TooltipContent><p>{getSchoolName(schoolAbbr)}</p></TooltipContent>
                                                                                </Tooltip>
                                                                                <span>•</span>
                                                                                <span>{spell.castingTime}</span>
                                                                                <span>•</span>
                                                                                <span>{spell.range}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    {!isFallback && (
                                                                        <>
                                                                            <span className="text-[10px] text-slate-300">•</span>
                                                                            <div className="flex gap-1 text-[10px] text-slate-400 font-mono">
                                                                                {spell.components?.v && (
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <span className="cursor-help hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 px-1 rounded-[2px] leading-none flex items-center h-3.5">V</span>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent><p className="text-xs">{getComponentTooltip('V')}</p></TooltipContent>
                                                                                    </Tooltip>
                                                                                )}
                                                                                {spell.components?.s && (
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <span className="cursor-help hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 px-1 rounded-[2px] leading-none flex items-center h-3.5">S</span>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent><p className="text-xs">{getComponentTooltip('S')}</p></TooltipContent>
                                                                                    </Tooltip>
                                                                                )}
                                                                                {spell.components?.m && (
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <span className="cursor-help hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 px-1 rounded-[2px] leading-none flex items-center h-3.5">M</span>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent>
                                                                                            <div className="text-xs max-w-[200px]">
                                                                                                <p className="font-semibold mb-1">{getComponentTooltip('M')}</p>
                                                                                                {spell.components.material_description && (
                                                                                                    <p className="text-slate-300 italic">{spell.components.material_description}</p>
                                                                                                )}
                                                                                            </div>
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                )}
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={(e) => { e.stopPropagation(); viewModel?.forgetSpell(actualId); }}
                                                            >
                                                                <Trash2 size={12} />
                                                            </Button>
                                                            {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                                        </div>
                                                    </div>

                                                    {/* Expanded Detail Block */}
                                                    {isExpanded && !isFallback && (
                                                        <div className="px-3 pb-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                                                            {/* Duration Tag */}
                                                            {spell.duration && (
                                                                <div className="flex gap-2 mb-3">
                                                                    <Badge variant="outline" className="text-[10px] font-normal text-slate-500 bg-slate-50 dark:bg-slate-900/50">
                                                                        Duration: {formatDuration(spell.duration)}
                                                                    </Badge>
                                                                </div>
                                                            )}

                                                            {/* Description */}
                                                            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                                                {spell.description}
                                                            </div>

                                                            {/* Ritual Toggle - Bottom Bar */}
                                                            {lvl > 0 && (spell.isRitual || entry.isRitual) && (
                                                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mr-2">
                                                                        <BookOpen className="w-3 h-3" />
                                                                        <span>{spell.isRitual ? "Can be cast as Ritual" : "Ritual Override"}</span>
                                                                    </div>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                onClick={() => viewModel?.toggleSpellRitual(actualId, !entry.isRitual)}
                                                                                className={cn(
                                                                                    "text-[10px] px-3 py-1.5 rounded-md flex items-center gap-2 transition-all border font-medium",
                                                                                    entry.isRitual
                                                                                        ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800 shadow-sm"
                                                                                        : "bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
                                                                                )}
                                                                            >
                                                                                {entry.isRitual ? "Casting as Ritual" : "Ritual Cast"}
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p className="text-xs">Toggle to cast as a ritual (takes 10m longer, uses no spell slot)</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
