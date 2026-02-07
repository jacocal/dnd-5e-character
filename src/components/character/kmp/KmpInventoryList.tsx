"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Minus, Plus, Trash2, Sparkles, Eye, Link2, Link2Off, Skull, ChevronDown, ChevronUp, ShieldAlert, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KmpAddContentDialog } from "./KmpAddContentDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { KmpEncumbranceBar } from "./KmpEncumbranceBar";

// Helper to format modifiers (adapted from legacy format-description.ts)
function formatModifier(modifier: any): string {
    const { type, target, value, condition, max } = modifier;

    // Simple target formatting
    let targetLabel = target;
    const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    if (abilities.includes(target.toLowerCase())) {
        targetLabel = target.toUpperCase() + ' score';
    } else {
        const targetMap: Record<string, string> = {
            ac: 'AC', hp: 'HP', speed: 'Speed', initiative: 'Initiative',
            acrobatics: 'Acrobatics', 'animal handling': 'Animal Handling', arcana: 'Arcana', athletics: 'Athletics',
            deception: 'Deception', history: 'History', insight: 'Insight', intimidation: 'Intimidation',
            investigation: 'Investigation', medicine: 'Medicine', nature: 'Nature', perception: 'Perception',
            performance: 'Performance', persuasion: 'Persuasion', religion: 'Religion', 'sleight of hand': 'Sleight of Hand',
            stealth: 'Stealth', survival: 'Survival'
        };
        targetLabel = targetMap[target.toLowerCase()] || (target.charAt(0).toUpperCase() + target.slice(1).toLowerCase());
    }

    switch (type) {
        case 'bonus': return `+${value} to ${targetLabel}`;
        case 'set': return `Set ${targetLabel} to ${value}`;
        case 'override': return `Override ${targetLabel} to ${value}`;
        case 'ability_increase': return `+${value} to ${target.toUpperCase()}${max ? ` (max ${max})` : ''}`;
        case 'ability_point_grant': return `+${value} Ability Score Increase point${Number(value) !== 1 ? 's' : ''}`;
        case 'skill_proficiency': return `Proficiency in ${targetLabel}`;
        case 'expertise': return `Expertise in ${targetLabel}`;
        case 'saving_throw_proficiency': return `${target.toUpperCase()} saving throw proficiency`;
        case 'armor_proficiency': return `${targetLabel} proficiency`;
        case 'weapon_proficiency': return `${targetLabel} proficiency`;
        case 'language': return `Speak ${targetLabel}`;
        default: return condition ? `${type}: ${value} to ${targetLabel} (${condition})` : `${type}: ${value} to ${targetLabel}`;
    }
}

// Helper to normalize item category
// Copied from legacy logic
function getItemCategory(item: any): 'weapon' | 'armor' | 'consumable' | 'treasure' | 'misc' {
    if (!item) return 'misc';

    const typeLower = (item.type || '').toLowerCase();
    const categoryLower = (item.category || '').toLowerCase();
    const nameLower = (item.name || '').toLowerCase();

    // Weapons
    if (categoryLower === 'weapon' || typeLower.includes('weapon')) return 'weapon';

    // Armor (including shields)
    if (categoryLower === 'armor' || typeLower.includes('armor') || typeLower.includes('shield')) return 'armor';

    // Consumables (potions, scrolls, wands with charges)
    if (categoryLower === 'consumable' ||
        typeLower.includes('potion') ||
        typeLower.includes('scroll') ||
        nameLower.includes('potion') ||
        nameLower.includes('scroll')) return 'consumable';

    // Treasures (gems, art objects, valuables)
    if (categoryLower === 'treasure' ||
        typeLower.includes('treasure') ||
        typeLower.includes('gem') ||
        typeLower.includes('art object') ||
        typeLower.includes('(gem)') ||
        typeLower.includes('(art')) return 'treasure';

    // Wondrous items / misc with slots are equipment
    if (item.slot || typeLower.includes('wondrous') || typeLower.includes('ring') || typeLower.includes('amulet') || typeLower.includes('cloak')) return 'misc';

    return 'misc';
}

function isEquippable(item: any): boolean {
    const cat = getItemCategory(item);
    return cat === 'weapon' || cat === 'armor' || cat === 'misc';
}

function isConsumable(item: any): boolean {
    return getItemCategory(item) === 'consumable';
}

function isTreasureItem(item: any): boolean {
    return getItemCategory(item) === 'treasure';
}

type InventoryCategory = 'all' | 'equipment' | 'consumables' | 'treasures';

export function KmpInventoryList() {
    const { viewModel, state } = useKmpCharacter();
    const [selectedCategory, setSelectedCategory] = useState<InventoryCategory>('all');
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

    const inventory = state?.resolvedItems || [];
    const attunedCount = inventory.filter((i: any) => i.isAttuned).length;

    const toggleExpand = (itemId: number) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) newSet.delete(itemId);
            else newSet.add(itemId);
            return newSet;
        });
    };

    // Filter by category tab
    const filteredInventory = inventory.filter((entry: any) => {
        if (selectedCategory === 'all') return true;
        const cat = getItemCategory(entry.item);
        if (selectedCategory === 'consumables') return cat === 'consumable';
        if (selectedCategory === 'treasures') return cat === 'treasure';
        if (selectedCategory === 'equipment') return cat === 'weapon' || cat === 'armor' || cat === 'misc';
        return true;
    });

    const categoryCounts = {
        all: inventory.length,
        equipment: inventory.filter((e: any) => ['weapon', 'armor', 'misc'].includes(getItemCategory(e.item))).length,
        consumables: inventory.filter((e: any) => getItemCategory(e.item) === 'consumable').length,
        treasures: inventory.filter((e: any) => getItemCategory(e.item) === 'treasure').length
    };

    if (inventory.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                    <h2 className="text-xs font-bold uppercase text-slate-400 mb-4 tracking-wider">Inventory</h2>
                    <KmpEncumbranceBar />
                </div>
                <div className="flex flex-col items-center justify-center p-8 gap-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                    <div className="text-slate-500 italic">Inventory is empty.</div>
                    <KmpAddContentDialog type="item" />
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={200} skipDelayDuration={100}>
            <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Inventory</h2>
                        <KmpAddContentDialog type="item" />
                    </div>
                    <KmpEncumbranceBar />

                    {/* Attunement Counter */}
                    <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2 mt-4">
                        <div className="flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Attuned Items</span>
                        </div>
                        <span className={cn(
                            "text-sm font-bold",
                            attunedCount >= 3 ? "text-red-600 dark:text-red-400" : "text-purple-600 dark:text-purple-400"
                        )}>
                            {attunedCount}/3
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 overflow-hidden mb-3">
                        {(['all', 'equipment', 'consumables', 'treasures'] as InventoryCategory[]).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "text-[10px] sm:text-xs font-medium py-1 px-1.5 sm:px-2 rounded-md transition-colors capitalize flex items-center gap-0.5 min-w-0 shrink",
                                    selectedCategory === cat
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                )}
                            >
                                <span className="truncate">{cat === 'consumables' ? 'Use' : cat === 'equipment' ? 'Gear' : cat}</span>
                                <span className={cn(
                                    "text-[9px] px-1 rounded-full shrink-0",
                                    selectedCategory === cat ? "bg-slate-200 dark:bg-slate-600" : "bg-slate-200/50 dark:bg-slate-700/50"
                                )}>
                                    {categoryCounts[cat]}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2 w-full">
                        {filteredInventory.map((entry: any) => {
                            const item = entry.item;
                            // Basic logic replacements for helpers that might be missing
                            const showProfWarning = entry.equipped && viewModel && !viewModel.isProficient(entry);

                            // Attunement
                            const requiresAttunement = item.requiresAttunement || false;
                            const isAttuned = entry.isAttuned;

                            // Magic & ID
                            const isMagical = item.isMagical || isAttuned || requiresAttunement;
                            const isUnidentified = entry.isIdentified === false && isMagical;
                            // Cursed Status: Show if identified OR if equipped (curse is active/revealed when equipped)
                            const isCursedKnown = (item.isCursed && !isUnidentified) || (item.isCursed && entry.equipped);

                            // Display Logic: 
                            // Unidentified -> Name (generic) + Shown Effect (fake description) or Description (generic)
                            // Identified -> True Name (specific) or Name + True Effect (specific) or Description
                            const displayName = isUnidentified ? item.name : (item.trueName || item.name);
                            const displayDesc = isUnidentified ? (item.shownEffect || item.description) : (item.trueEffect || item.description);

                            const canEquip = isEquippable(item);
                            const isConsumableType = isConsumable(item);
                            const isTreasureType = isTreasureItem(item);

                            const isExpanded = expandedItems.has(entry.instanceId);

                            return (
                                <div key={entry.instanceId} className={cn(
                                    "rounded transition border",
                                    isExpanded
                                        ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                                        : isCursedKnown || showProfWarning
                                            ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20"
                                            : isMagical
                                                ? "border-purple-200 dark:border-purple-800"
                                                : "border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                )}>
                                    <div
                                        className={cn(
                                            "flex items-start gap-3 p-3 cursor-pointer transition",
                                            !isExpanded && (isCursedKnown || showProfWarning
                                                ? "bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20"
                                                : isMagical
                                                    ? "bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30"
                                                    : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800")
                                        )}
                                        onClick={() => toggleExpand(entry.instanceId)}
                                    >
                                        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                                            {isCursedKnown ? (
                                                <Skull className="w-5 h-5 text-red-600 dark:text-red-400" />
                                            ) : showProfWarning ? (
                                                <ShieldAlert className="w-5 h-5 text-amber-500" />
                                            ) : isMagical ? (
                                                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            ) : (
                                                <div className="w-5 h-5" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "font-medium text-sm truncate",
                                                    entry.equipped
                                                        ? "text-slate-900 dark:text-white"
                                                        : "text-slate-700 dark:text-slate-300"
                                                )} title={displayName}>
                                                    {displayName}
                                                </span>
                                                {showProfWarning && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                                        Not Proficient
                                                    </span>
                                                )}
                                                {isUnidentified && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                                        <Eye className="w-3 h-3" /> Unknown
                                                    </span>
                                                )}
                                                {isCursedKnown && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center gap-1">
                                                        <Skull className="w-3 h-3" /> Cursed
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 mt-1 text-[10px] text-slate-500">
                                                <span className="bg-slate-200/70 dark:bg-slate-700 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                                    {item.type}
                                                </span>
                                                {!isUnidentified && item.costAmount > 0 && (
                                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                        {item.costAmount} GP
                                                    </span>
                                                )}
                                                {isAttuned && (
                                                    <span className="text-purple-600 dark:text-purple-400 font-medium">
                                                        Attuned
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <div className="flex items-center gap-1">
                                                {/* Identify Button */}
                                                {isUnidentified && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            viewModel?.identifyItem(entry.instanceId);
                                                        }}
                                                        className="text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wide font-bold transition-colors border bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-200"
                                                    >
                                                        Identify
                                                    </button>
                                                )}

                                                {/* Requires Attunement - checking item.description for now as flag might be missing */}
                                                {(requiresAttunement || item.description?.toLowerCase().includes("attunement")) && !isTreasureType && !isUnidentified && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Block unattuning cursed items via normal click
                                                            if (isAttuned && isCursedKnown) {
                                                                alert("This item is cursed and cannot be unattuned normally. Cast Remove Curse first.");
                                                                return;
                                                            }
                                                            viewModel?.updateCharacterItemState(entry.instanceId, null, !isAttuned, null, null);
                                                        }}
                                                        disabled={(!isAttuned && attunedCount >= 3) || (isAttuned && isCursedKnown)}
                                                        className={cn(
                                                            "text-[10px] p-1.5 rounded-md transition-colors border",
                                                            isAttuned
                                                                ? "bg-purple-200 text-purple-800 border-purple-300 dark:bg-purple-800 dark:text-purple-200 dark:border-purple-700"
                                                                : attunedCount >= 3
                                                                    ? "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-not-allowed opacity-50"
                                                                    : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                                                        )}
                                                        title={isAttuned ? "Break attunement" : attunedCount >= 3 ? "Max attunements reached" : "Attune to this item"}
                                                    >
                                                        {isAttuned ? <Link2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />}
                                                    </button>
                                                )}

                                                {isTreasureType ? (
                                                    <span className="text-[10px] px-2 py-1 text-amber-600 dark:text-amber-400 italic">
                                                        Treasure
                                                    </span>
                                                ) : isConsumableType ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (entry.quantity > 1) {
                                                                viewModel?.updateCharacterItemState(entry.instanceId, null, null, null, entry.quantity - 1);
                                                            } else {
                                                                viewModel?.removeCharacterItem(entry.instanceId);
                                                            }
                                                        }}
                                                        className="text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wide font-bold transition-colors border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-800"
                                                    >
                                                        Use
                                                    </button>
                                                ) : canEquip ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (entry.equipped && isCursedKnown) {
                                                                alert("You cannot unequip a cursed item. You must break the curse logic first.");
                                                                return;
                                                            }
                                                            viewModel?.updateCharacterItemState(entry.instanceId, !entry.equipped, null, null, null);
                                                        }}
                                                        className={cn(
                                                            "text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wide font-bold transition-colors border",
                                                            entry.equipped
                                                                ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800"
                                                                : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-200"
                                                        )}
                                                    >
                                                        {entry.equipped ? "Equipped" : "Equip"}
                                                    </button>
                                                ) : null}
                                            </div>

                                            <div className="flex items-center gap-0.5">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-slate-400 hover:text-red-500"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (entry.quantity > 1) {
                                                            viewModel?.updateCharacterItemState(entry.instanceId, null, null, null, entry.quantity - 1);
                                                        } else {
                                                            viewModel?.removeCharacterItem(entry.instanceId);
                                                        }
                                                    }}
                                                >
                                                    {entry.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                                                </Button>
                                                <span className="text-xs font-mono w-5 text-center font-bold text-slate-600 dark:text-slate-400">
                                                    {entry.quantity}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        viewModel?.updateCharacterItemState(entry.instanceId, null, null, null, entry.quantity + 1);
                                                    }}
                                                >
                                                    <Plus size={12} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center px-3 pb-3 pt-0">
                                        {isExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-slate-400" />
                                        )}
                                    </div>

                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200 opacity-70">
                                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                                {displayDesc}
                                            </p>

                                            {isUnidentified && (
                                                <p className="text-xs italic text-slate-500">
                                                    This item's true nature is unknown. Identify it to reveal its properties.
                                                </p>
                                            )}

                                            {/* Modifiers - Only show if identified */}
                                            {!isUnidentified && item.modifiers && item.modifiers.length > 0 && (
                                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 block mb-1.5">
                                                        Magical Properties
                                                    </span>
                                                    <div className="space-y-1">
                                                        {item.modifiers.map((mod: any, idx: number) => (
                                                            <div key={idx} className="flex items-start gap-2 text-sm">
                                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                                                                <span className="text-slate-700 dark:text-slate-300">
                                                                    {formatModifier(mod)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {isCursedKnown && (
                                                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                                                    <div className="flex items-center gap-2 mb-1 text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                                                        <Skull className="w-4 h-4" /> Curse Active
                                                    </div>
                                                    <p className="text-xs text-red-600 dark:text-red-300">
                                                        This item is cursed. To unequip or unattune it, you must first break the curse.
                                                    </p>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-2 text-xs border-red-200 hover:bg-red-100 text-red-700"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent collapse
                                                            if (confirm("Has 'Remove Curse' been cast on this item?")) {
                                                                viewModel?.breakCurse(entry.instanceId);
                                                            }
                                                        }}
                                                    >
                                                        <Wand2 className="w-3 h-3 mr-2" /> Break Curse & Unequip
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
