"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2 } from "lucide-react";
import { searchSpells, searchItems } from "@/app/actions";
import { useCharacterStore } from "@/store/character-store";

interface AddContentDialogProps {
    type: "spell" | "item";
    trigger?: React.ReactNode;
}

export function AddContentDialog({ type, trigger }: AddContentDialogProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [mode, setMode] = useState<"search" | "create">("search");
    const [customItem, setCustomItem] = useState({
        name: "",
        weightAmount: "",
        costAmount: "",
        costCurrency: "gp",
        type: "gear",
        description: ""
    });

    const { addSpell, addItem, createCustomItem } = useCharacterStore();

    useEffect(() => {
        if (!open) {
            setMode("search");
            setQuery("");
            setResults([]);
            setCustomItem({ name: "", weightAmount: "", costAmount: "", costCurrency: "gp", type: "gear", description: "" });
            return;
        }

        if (mode === "create") return;

        const delayDebounceFn = setTimeout(async () => {
            // ... existing search logic ...
            setLoading(true);
            try {
                const data = type === "spell"
                    ? await searchSpells(query)
                    : await searchItems(query);
                setResults(data);
            } catch (error) {
                console.error("Search error", error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query, type, open, mode]);

    const handleAdd = async (entry: any) => {
        setLoading(true);
        try {
            if (type === "spell") {
                await addSpell(entry);
            } else {
                await addItem(entry);
            }
            setOpen(false);
        } catch (error) {
            console.error("Add failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCustom = async () => {
        if (!customItem.name) return;
        setLoading(true);
        try {
            await createCustomItem(customItem);
            setOpen(false);
        } catch (error) {
            console.error("Create failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Plus size={16} />
                        Add {type === "spell" ? "Spell" : "Item"}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {type === "spell" ? "Add Spell" : (
                            <div className="flex gap-4 text-sm">
                                <button
                                    onClick={() => setMode("search")}
                                    className={mode === "search" ? "font-bold text-slate-900 dark:text-white" : "text-slate-500"}
                                >
                                    Search Items
                                </button>
                                <button
                                    onClick={() => setMode("create")}
                                    className={mode === "create" ? "font-bold text-slate-900 dark:text-white" : "text-slate-500"}
                                >
                                    Create Custom
                                </button>
                            </div>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {mode === "search" ? (
                    <div className="gap-4 py-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={`Search ${type}s...`}
                                value={query}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                            {loading && results.length === 0 && (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                </div>
                            )}

                            {!loading && results.length === 0 && (
                                <div className="text-center text-sm text-slate-500 p-2">
                                    No results found.
                                </div>
                            )}

                            {results.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="flex items-center justify-between p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-transparent hover:border-slate-200 cursor-pointer group"
                                    onClick={() => handleAdd(entry)}
                                >
                                    <div>
                                        <div className="font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{entry.name}</div>
                                        <div className="text-xs text-slate-500">
                                            {type === "spell"
                                                ? `Lvl ${entry.level} • ${entry.school}`
                                                : `${entry.type} • ${entry.costAmount} ${entry.costCurrency}`
                                            }
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        <Plus size={16} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Name</label>
                            <Input
                                placeholder="Item Name"
                                value={customItem.name}
                                onChange={(e) => setCustomItem(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Weight (lb)</label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={customItem.weightAmount}
                                    onChange={(e) => setCustomItem(prev => ({ ...prev, weightAmount: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Type</label>
                                <Input
                                    placeholder="gear, weapon..."
                                    value={customItem.type}
                                    onChange={(e) => setCustomItem(prev => ({ ...prev, type: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Cost</label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={customItem.costAmount}
                                    onChange={(e) => setCustomItem(prev => ({ ...prev, costAmount: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Currency</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                                    value={customItem.costCurrency}
                                    onChange={(e) => setCustomItem(prev => ({ ...prev, costCurrency: e.target.value }))}
                                >
                                    <option value="cp">CP</option>
                                    <option value="sp">SP</option>
                                    <option value="ep">EP</option>
                                    <option value="gp">GP</option>
                                    <option value="pp">PP</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Description</label>
                            <Input
                                placeholder="Optional description..."
                                value={customItem.description}
                                onChange={(e) => setCustomItem(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        <Button className="w-full" onClick={handleCreateCustom} disabled={loading || !customItem.name}>
                            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                            Create Item
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
