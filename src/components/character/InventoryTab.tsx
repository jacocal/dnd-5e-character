"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useCharacterStore } from "@/store/character-store";
import { Minus, Plus, Trash2, Sparkles, Eye, Link2, Link2Off, Skull, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddContentDialog } from "./AddContentDialog";

import { CurrencyTracker } from "./CurrencyTracker";
import { EncumbranceBar } from "./EncumbranceBar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ModifierDisplay } from "./ModifierDisplay";

interface InventoryTabProps {
    inventory: any[];
}

type InventoryCategory = 'all' | 'equipment' | 'consumables' | 'treasures';

// Helper to normalize item category based on type/category fields
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

// Check if item should show equip button
function isEquippable(item: any): boolean {
    const cat = getItemCategory(item);
    return cat === 'weapon' || cat === 'armor' || cat === 'misc';
}

// Check if item is consumable
function isConsumable(item: any): boolean {
    return getItemCategory(item) === 'consumable';
}

// Check if item is treasure
function isTreasureItem(item: any): boolean {
    return getItemCategory(item) === 'treasure';
}

export function InventoryTab({ inventory: initialInventory }: InventoryTabProps) {
    const {
        inventory,
        toggleItemEquipped,
        updateItemQuantity,
        useItem,
        isProficient,
        attuneItem,
        unattuneItem,
        getAttunedCount,
        identifyItem,
        getItemDisplayName,
        getItemDisplayEffect,
        isItemCursedRevealed
    } = useCharacterStore();

    const [selectedCategory, setSelectedCategory] = useState<InventoryCategory>('all');
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

    const toggleExpand = (itemId: number) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    const displayInventory = inventory;
    const attunedCount = getAttunedCount ? getAttunedCount() : 0;

    // Filter by category tab
    const filteredInventory = displayInventory.filter(entry => {
        if (selectedCategory === 'all') return true;

        const cat = getItemCategory(entry.item);

        if (selectedCategory === 'consumables') return cat === 'consumable';
        if (selectedCategory === 'treasures') return cat === 'treasure';
        if (selectedCategory === 'equipment') return cat === 'weapon' || cat === 'armor' || cat === 'misc';
        return true;
    });

    // Count items per category for badges
    const categoryCounts = {
        all: displayInventory.length,
        equipment: displayInventory.filter(e => ['weapon', 'armor', 'misc'].includes(getItemCategory(e.item))).length,
        consumables: displayInventory.filter(e => getItemCategory(e.item) === 'consumable').length,
        treasures: displayInventory.filter(e => getItemCategory(e.item) === 'treasure').length
    };

    if (displayInventory.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                <CurrencyTracker />
                <EncumbranceBar />
                <div className="flex flex-col items-center justify-center p-8 gap-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <div className="text-slate-500 italic">Inventory is empty.</div>
                    <AddContentDialog type="item" />
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={200} skipDelayDuration={100}>
            <div className="space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <CurrencyTracker />
                    <AddContentDialog type="item" />
                </div>
                <EncumbranceBar />

                {/* Attunement Counter */}
                <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2">
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

                {/* Category Tabs */}
                <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 overflow-hidden">
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
                    {filteredInventory.map((entry) => {
                        const item = entry.item;
                        const isProf = isProficient(item);
                        const showProfWarning = entry.equipped && !isProf && (getItemCategory(item) === 'armor' || getItemCategory(item) === 'weapon');

                        // Magic item display helpers
                        const displayName = getItemDisplayName ? getItemDisplayName(entry) : item.name;
                        const isCursedRevealed = isItemCursedRevealed ? isItemCursedRevealed(entry) : false;
                        const isMagical = item.isMagical;
                        const isUnidentified = isMagical && !entry.isIdentified;
                        const requiresAttunement = item.requiresAttunement;
                        const isAttuned = entry.isAttuned;
                        const canEquip = isEquippable(item);
                        const isConsumableType = isConsumable(item);
                        const isTreasureType = isTreasureItem(item);
                        const itemCategory = getItemCategory(item);

                        // Check if item is cursed (separate from being magical)
                        const isCursed = item.isCursed;
                        const isCursedKnown = isCursedRevealed || (isCursed && entry.isIdentified);

                        const isExpanded = expandedItems.has(entry.id);
                        const displayEffect = getItemDisplayEffect ? getItemDisplayEffect(entry) : (item.description || '');

                        return (
                            <div key={entry.id} className={cn(
                                "rounded transition border",
                                isExpanded
                                    ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                                    : isCursedKnown
                                        ? "border-red-500 dark:border-red-700"
                                        : showProfWarning
                                            ? "border-red-200 dark:border-red-800"
                                            : isMagical
                                                ? "border-purple-200 dark:border-purple-800"
                                                : "border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                            )}>
                                {/* Clickable Item Row */}
                                <div
                                    className={cn(
                                        "flex items-start gap-3 p-3 cursor-pointer transition",
                                        !isExpanded && (isCursedKnown
                                            ? "bg-gradient-to-r from-red-100 to-red-200 hover:from-red-150 hover:to-red-250 dark:from-red-950 dark:to-red-900/80 dark:hover:from-red-900 dark:hover:to-red-800/80"
                                            : showProfWarning
                                                ? "bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                                                : isMagical
                                                    ? "bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30"
                                                    : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800")
                                    )}
                                    onClick={() => toggleExpand(entry.id)}
                                >
                                    {/* Left: Icon column */}
                                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                                        {isCursedKnown ? (
                                            <Skull className="w-5 h-5 text-red-700 dark:text-red-400" />
                                        ) : isMagical ? (
                                            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        ) : (
                                            <div className="w-5 h-5" />
                                        )}
                                    </div>

                                    {/* Center: Main content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Row 1: Name */}
                                        <div className={cn(
                                            "font-medium text-sm truncate",
                                            isCursedKnown
                                                ? "text-red-900 dark:text-red-200 font-semibold"
                                                : entry.equipped
                                                    ? "text-slate-900 dark:text-white"
                                                    : "text-slate-700 dark:text-slate-300"
                                        )} title={displayName}>
                                            {displayName}
                                        </div>

                                        {/* Row 2: Type and metadata */}
                                        <div className="flex flex-wrap gap-1.5 mt-1 text-[10px] text-slate-500">
                                            <span className="bg-slate-200/70 dark:bg-slate-700 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                                {item.type?.length > 20 ? item.type.substring(0, 18) + '...' : item.type}
                                            </span>
                                            {item.costAmount !== null && item.costAmount > 0 && (
                                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                    {item.costAmount} {item.costCurrency}
                                                </span>
                                            )}
                                            {isAttuned && (
                                                <span className="text-purple-600 dark:text-purple-400 font-medium">
                                                    Attuned
                                                </span>
                                            )}
                                        </div>

                                        {/* Row 3: Badges (only when relevant) */}
                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                            {isCursedKnown && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-red-100 border border-red-700 bg-red-700 dark:bg-red-800 dark:border-red-600 px-1.5 py-0.5 rounded shadow-sm">
                                                    ☠ Cursed
                                                </span>
                                            )}
                                            {isUnidentified && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.5 rounded">
                                                    Unidentified
                                                </span>
                                            )}
                                            {showProfWarning && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded">
                                                    Not Proficient
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Actions column */}
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        {/* Primary action row */}
                                        <div className="flex items-center gap-1">
                                            {/* Identify Button */}
                                            {isUnidentified && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); identifyItem(entry.id); }}
                                                    className="text-[10px] p-1.5 rounded-md transition-colors border bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-800"
                                                    title="Identify this item"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            {/* Attunement Button */}
                                            {requiresAttunement && !isTreasureType && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); isAttuned ? unattuneItem(entry.id) : attuneItem(entry.id); }}
                                                    disabled={!isAttuned && attunedCount >= 3}
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

                                            {/* Use/Equip Button */}
                                            {isTreasureType ? (
                                                <span className="text-[10px] px-2 py-1 text-amber-600 dark:text-amber-400 italic">
                                                    Treasure
                                                </span>
                                            ) : isConsumableType ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); useItem(entry.id); }}
                                                    className="text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wide font-bold transition-colors border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-800"
                                                >
                                                    Use
                                                </button>
                                            ) : canEquip ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleItemEquipped(entry.id); }}
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

                                        {/* Quantity controls */}
                                        <div className="flex items-center gap-0.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-slate-400 hover:text-red-500"
                                                onClick={(e) => { e.stopPropagation(); updateItemQuantity(entry.id, entry.quantity - 1); }}
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
                                                onClick={(e) => { e.stopPropagation(); updateItemQuantity(entry.id, entry.quantity + 1); }}
                                            >
                                                <Plus size={12} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Chevron Icon - visual indicator of expandability */}
                                <div className="flex items-center px-3 pb-3 pt-0">
                                    {isExpanded ? (
                                        <ChevronUp className="h-4 w-4 text-slate-400" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                    )}
                                </div>

                                {/* Expandable Description and Modifiers Section */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                                        {displayEffect && (
                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                                    {displayEffect}
                                                </p>
                                            </div>
                                        )}

                                        {entry.isIdentified && item.modifiers && item.modifiers.length > 0 && (
                                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 block mb-1.5">
                                                    Magical Properties
                                                </span>
                                                <ModifierDisplay modifiers={item.modifiers} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </TooltipProvider>
    );
}
