"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useCharacterStore } from "@/store/character-store";
import { Check, Circle, Trash2, Focus, X, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddContentDialog } from "./AddContentDialog";
import { SpellSlotsTracker } from "./SpellSlotsTracker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getComponentTooltip, getSchoolName, getSchoolDescription, formatDuration } from "@/lib/format-description";

interface SpellsTabProps {
    spells: any[]; // Fallback if not hydrated, but we use store
}

export function SpellsTab({ spells: initialSpells }: SpellsTabProps) {
    const { spells, toggleSpellPrepared, toggleSpellRitual, removeSpell, canCastSpells, concentratingOn, setConcentrating } = useCharacterStore();
    const canCast = canCastSpells();
    const [expandedSpells, setExpandedSpells] = useState<Set<string>>(new Set());

    const toggleExpand = (spellId: string) => {
        setExpandedSpells(prev => {
            const newSet = new Set(prev);
            if (newSet.has(spellId)) {
                newSet.delete(spellId);
            } else {
                newSet.add(spellId);
            }
            return newSet;
        });
    };

    // Use store spells if available, otherwise initial (server) spells
    const displaySpells = spells.length > 0 ? spells : initialSpells;

    // Group spells by level
    const spellsByLevel = displaySpells.reduce((acc: Record<number, any[]>, entry: any) => {
        const level = entry.spell.level;
        if (!acc[level]) acc[level] = [];
        acc[level].push(entry);
        return acc;
    }, {});

    const levels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b);

    if (displaySpells.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 gap-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="text-slate-500 italic">No spells known.</div>
                <AddContentDialog type="spell" />
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={200} skipDelayDuration={100}>
            <div className="space-y-6">
                {!canCast && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-md text-sm font-medium flex gap-2 items-center">
                        <Circle className="h-4 w-4 fill-red-500 text-red-500" />
                        Cannot cast spells while wearing armor you are not proficient with.
                    </div>
                )}

                {/* Concentration Indicator */}
                {concentratingOn && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-3 rounded-md flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Focus className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-pulse" />
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                Concentrating on: <strong>{concentratingOn.spellName}</strong>
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-purple-600 hover:text-purple-800 dark:text-purple-400"
                            onClick={() => setConcentrating(null)}
                        >
                            <X size={14} className="mr-1" /> End
                        </Button>
                    </div>
                )}

                <SpellcastingStats />
                <SpellSlotsTracker />
                <div className="flex justify-end">
                    <AddContentDialog type="spell" />
                </div>

                {levels.map(level => (
                    <div key={level} className="space-y-2">
                        <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1 flex justify-between items-center">
                            <span>{level === 0 ? "Cantrips" : `Level ${level}`}</span>
                            {level > 0 && <span className="text-[10px] font-normal text-slate-400">Uses Level {level} Slot</span>}
                        </h3>
                        <div className="grid gap-2">
                            {spellsByLevel[level].map((entry) => {
                                const isExpanded = expandedSpells.has(entry.spellId);
                                const schoolAbbr = entry.spell.school.substring(0, 3).toUpperCase();
                                return (
                                    <div key={entry.spellId} className={cn(
                                        "rounded transition border group",
                                        isExpanded
                                            ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                                            : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                    )}>
                                        {/* Main spell row */}
                                        <div
                                            className="flex items-center justify-between p-2 cursor-pointer"
                                            onClick={() => toggleExpand(entry.spellId)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">{entry.spell.name}</span>

                                                    {/* Ritual icon indicator - shows when spell is being cast as ritual */}
                                                    {entry.isRitual && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <BookOpen className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="text-xs">Casting as ritual (no spell slot)</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}

                                                    {level > 0 && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleSpellPrepared(entry.spellId, entry.prepared); }}
                                                            className={cn(
                                                                "text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-bold cursor-pointer transition-colors border select-none",
                                                                entry.prepared
                                                                    ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800"
                                                                    : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                            )}
                                                        >
                                                            {entry.prepared ? "Prepared" : "Prepare"}
                                                        </button>
                                                    )}
                                                    {level > 0 && entry.prepared && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleSpellRitual(entry.spellId, entry.isRitual); }}
                                                            className={cn(
                                                                "text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-bold cursor-pointer transition-colors border select-none",
                                                                entry.isRitual
                                                                    ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-800"
                                                                    : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                            )}
                                                        >
                                                            Ritual
                                                        </button>
                                                    )}
                                                    {entry.spell.isConcentration && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const isCurrentlyConcentrating = concentratingOn?.spellId === entry.spellId;
                                                                if (isCurrentlyConcentrating) {
                                                                    setConcentrating(null);
                                                                } else {
                                                                    setConcentrating({ spellId: entry.spellId, spellName: entry.spell.name });
                                                                }
                                                            }}
                                                            className={cn(
                                                                "text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-bold cursor-pointer transition-colors border select-none",
                                                                concentratingOn?.spellId === entry.spellId
                                                                    ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-800 animate-pulse"
                                                                    : "bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-purple-100 hover:text-purple-600 dark:hover:bg-purple-900/50"
                                                            )}
                                                            title={concentratingOn?.spellId === entry.spellId ? "Click to end concentration" : "Click to concentrate"}
                                                        >
                                                            {concentratingOn?.spellId === entry.spellId ? "Conc. ✓" : "Conc."}
                                                        </button>
                                                    )}

                                                </div>
                                                <div className="text-xs text-slate-500 flex gap-2 mt-0.5 items-center flex-wrap">
                                                    <span>{entry.spell.castingTime}</span>
                                                    <span>•</span>
                                                    <span>{entry.spell.range}</span>
                                                    <span>•</span>
                                                    <span>{formatDuration(entry.spell.duration)}</span>
                                                    <span>•</span>
                                                    <span className="flex gap-1">
                                                        {entry.spell.components?.v && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help">V</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="text-xs max-w-xs">{getComponentTooltip('V')}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {entry.spell.components?.s && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help">S</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="text-xs max-w-xs">{getComponentTooltip('S')}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {entry.spell.components?.m && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help">M</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="text-xs max-w-xs">
                                                                        {getComponentTooltip('M')}
                                                                        {entry.spell.components.material_description && (
                                                                            <><br /><span className="font-semibold text-amber-600 dark:text-amber-400">Required: </span>{entry.spell.components.material_description}</>
                                                                        )}
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="text-xs text-slate-400 font-mono hidden sm:block cursor-help">
                                                            {schoolAbbr}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs font-semibold">{getSchoolName(schoolAbbr)}</p>
                                                        <p className="text-[10px] text-slate-400">{getSchoolDescription(entry.spell.school)}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => { e.stopPropagation(); removeSpell(entry.spellId); }}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                                {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                            </div>
                                        </div>

                                        {/* Expanded description */}
                                        {isExpanded && (
                                            <div className="px-3 pb-3 pt-1 border-t border-slate-200 dark:border-slate-700 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                    {entry.spell.description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </TooltipProvider>
    );
}

function SpellcastingStats() {
    const { classes, getSpellcastingStats } = useCharacterStore();
    const spellcastingClasses = classes?.filter((c: any) => c.class?.spellcastingAbility) || [];

    if (spellcastingClasses.length === 0) return null;

    return (
        <div className="grid grid-cols-1 gap-4">
            {spellcastingClasses.map((c: any) => {
                const stats = getSpellcastingStats(c.classId || c.class?.id);
                if (!stats) return null;
                return (
                    <div key={c.classId || c.class?.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-4">
                        <div className="mb-3 text-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                                {{
                                    INT: 'Intelligence',
                                    WIS: 'Wisdom',
                                    CHA: 'Charisma',
                                    STR: 'Strength',
                                    DEX: 'Dexterity',
                                    CON: 'Constitution'
                                }[stats.ability] || stats.ability}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700/50 p-2 flex flex-col items-center justify-center aspect-square">
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                                    Modifier
                                </div>
                                <div className="text-2xl font-black text-slate-700 dark:text-slate-200">
                                    {stats.modifier >= 0 ? '+' : ''}{stats.modifier}
                                </div>

                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700/50 p-2 flex flex-col items-center justify-center aspect-square">
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Save DC</div>
                                <div className="text-2xl font-black text-slate-700 dark:text-slate-200">{stats.saveDC}</div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700/50 p-2 flex flex-col items-center justify-center aspect-square">
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Atk Bonus</div>
                                <div className="text-2xl font-black text-slate-700 dark:text-slate-200">+{stats.attackBonus}</div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
}
