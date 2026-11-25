"use client";

import React, { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, SearchX, Check } from "lucide-react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { cn } from "@/lib/utils";

interface KmpAddContentDialogProps {
    type: "spell" | "item";
    trigger?: React.ReactNode;
}

export function KmpAddContentDialog({ type, trigger }: KmpAddContentDialogProps) {
    const { viewModel, catalog, state } = useKmpCharacter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [quantity, setQuantity] = useState<number>(1);
    const [recentlyAdded, setRecentlyAdded] = useState<Record<string, number>>({});

    // Instant 0ms in-memory search from preloaded KMP rules catalog
    const allEntries: any[] = useMemo(() => {
        if (type === "spell") {
            return catalog?.spells || state?.availableClassSpells || [];
        }
        return catalog?.items || [];
    }, [type, catalog, state?.availableClassSpells]);

    const filteredResults = useMemo(() => {
        const q = query.trim().toLowerCase();
        return allEntries
            .filter((entry: any) => {
                if (type === "item" && categoryFilter !== "all") {
                    const cat = (entry.category || entry.type || "").toLowerCase();
                    if (categoryFilter === "weapon" && !cat.includes("weapon")) return false;
                    if (categoryFilter === "armor" && !cat.includes("armor") && !cat.includes("shield")) return false;
                    if (
                        categoryFilter === "consumable" &&
                        !cat.includes("consumable") &&
                        !cat.includes("potion") &&
                        !cat.includes("scroll") &&
                        !(entry.name || "").toLowerCase().includes("potion")
                    ) {
                        return false;
                    }
                }
                if (type === "spell" && categoryFilter !== "all") {
                    if (categoryFilter === "0" && entry.level !== 0) return false;
                    if (categoryFilter === "leveled" && entry.level === 0) return false;
                    if (categoryFilter === "ritual" && !entry.isRitual) return false;
                }
                if (!q) return true;
                return (
                    (entry.name || "").toLowerCase().includes(q) ||
                    (entry.type || "").toLowerCase().includes(q) ||
                    (entry.category || "").toLowerCase().includes(q) ||
                    (entry.school || "").toLowerCase().includes(q)
                );
            })
            .slice(0, 50);
    }, [allEntries, query, categoryFilter, type]);

    const handleAdd = (entry: any) => {
        if (!viewModel) return;
        const amt = Math.max(1, quantity || 1);
        if (type === "spell") {
            viewModel.learnSpell(entry.id);
        } else {
            viewModel.addCharacterItem(entry.id, amt);
        }
        setRecentlyAdded((prev) => ({
            ...prev,
            [entry.id]: (prev[entry.id] || 0) + (type === "spell" ? 1 : amt)
        }));
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) {
                    setQuery("");
                    setQuantity(1);
                    setRecentlyAdded({});
                }
            }}
        >
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Plus size={14} />
                        Add {type === "spell" ? "Spell" : "Item"}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] w-[95vw]">
                <DialogHeader>
                    <DialogTitle>
                        {type === "spell" ? "Add Spells to Spellbook" : "Add Items to Inventory"}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Instant catalog search — add multiple {type}s or set exact quantity before adding.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    {/* Search + Direct Quantity Input (for Items) */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={`Search ${allEntries.length} ${type}s...`}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-8 h-9 text-xs"
                                autoFocus
                            />
                        </div>

                        {type === "item" && (
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] font-bold uppercase text-slate-400">Qty:</span>
                                <Input
                                    type="number"
                                    min={1}
                                    max={999}
                                    value={quantity}
                                    onChange={(e) =>
                                        setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
                                    }
                                    className="w-16 h-9 text-center font-mono font-bold text-xs"
                                />
                            </div>
                        )}
                    </div>

                    {/* Quick Filter Pills & Quick Quantity Presets */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex flex-wrap gap-1">
                            {(type === "item"
                                ? [
                                      { id: "all", label: "All" },
                                      { id: "weapon", label: "Weapons" },
                                      { id: "armor", label: "Armor" },
                                      { id: "consumable", label: "Potions & Scrolls" }
                                  ]
                                : [
                                      { id: "all", label: "All" },
                                      { id: "0", label: "Cantrips" },
                                      { id: "leveled", label: "Lvl 1–9" },
                                      { id: "ritual", label: "Rituals" }
                                  ]
                            ).map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setCategoryFilter(tab.id)}
                                    className={cn(
                                        "px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors",
                                        categoryFilter === tab.id
                                            ? "bg-indigo-600 text-white"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {type === "item" && (
                            <div className="flex items-center gap-1">
                                {[1, 5, 10, 20].map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setQuantity(preset)}
                                        className={cn(
                                            "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors",
                                            quantity === preset
                                                ? "bg-amber-500 text-slate-950 border-amber-400"
                                                : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"
                                        )}
                                    >
                                        ×{preset}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Instant Results List */}
                    <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                        {filteredResults.length === 0 ? (
                            <div className="text-center text-xs text-slate-500 py-8 flex flex-col items-center gap-2">
                                <SearchX className="h-7 w-7 opacity-50" />
                                No {type}s found matching &ldquo;{query}&rdquo;.
                            </div>
                        ) : (
                            filteredResults.map((entry) => {
                                const addedCount = recentlyAdded[entry.id] || 0;
                                return (
                                    <div
                                        key={entry.id}
                                        onClick={() => handleAdd(entry)}
                                        className="flex items-center justify-between p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg border border-slate-200/70 dark:border-slate-800 cursor-pointer group transition-colors"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5 flex-wrap">
                                                <span className="truncate">{entry.name}</span>
                                                {addedCount > 0 && (
                                                    <Badge className="bg-emerald-600 text-white text-[9px] h-4 px-1.5">
                                                        <Check className="w-2.5 h-2.5 mr-0.5" />
                                                        Added {type === "item" ? `×${addedCount}` : ""}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-500">
                                                {type === "spell"
                                                    ? `${entry.level === 0 ? "Cantrip" : `Lvl ${entry.level}`} • ${entry.school} • ${entry.castingTime}`
                                                    : `${entry.type} • ${entry.costAmount || 0} ${entry.costCurrency || "gp"}${
                                                          entry.damageDice ? ` • ${entry.damageDice} ${entry.damageType || ""}` : ""
                                                      }`}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2.5 text-xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500"
                                        >
                                            <Plus size={13} className="mr-1" />
                                            {type === "item" && quantity > 1 ? `Add ×${quantity}` : "Add"}
                                        </Button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
