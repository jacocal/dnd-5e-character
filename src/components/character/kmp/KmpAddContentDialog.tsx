"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, SearchX, Loader2 } from "lucide-react";
import { searchSpells, searchItems } from "@/app/actions";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";

interface KmpAddContentDialogProps {
    type: "spell" | "item";
    trigger?: React.ReactNode;
}

export function KmpAddContentDialog({ type, trigger }: KmpAddContentDialogProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);



    const { viewModel } = useKmpCharacter();

    useEffect(() => {
        if (!open) {
            setQuery("");
            setResults([]);
            return;
        }



        const delayDebounceFn = setTimeout(async () => {
            // If query is empty, don't search, or maybe show recent?
            if (!query) {
                setResults([]);
                return;
            }

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
    }, [query, type, open]);

    const handleAdd = async (entry: any) => {
        if (!viewModel) return;

        setLoading(true);
        try {
            if (type === "spell") {
                viewModel.learnSpell(entry.id);
            } else {
                viewModel.addCharacterItem(entry.id, 1);
            }
            setOpen(false);
        } catch (error) {
            console.error("Add failed", error);
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
                        {type === "spell" ? "Add Spell" : "Add Item"}
                    </DialogTitle>
                    <DialogDescription>
                        Search and add {type === "spell" ? "spells" : "items"} to your character.
                    </DialogDescription>
                </DialogHeader>

                <div className="gap-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={`Search ${type}s...`}
                            value={query}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                            className="pl-8"
                            autoFocus
                        />
                    </div>
                    <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                        {loading && results.length === 0 && (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            </div>
                        )}

                        {!loading && results.length === 0 && query && (
                            <div className="text-center text-sm text-slate-500 p-2 flex flex-col items-center gap-2">
                                <SearchX className="h-8 w-8 opacity-50" />
                                No results found for "{query}".
                            </div>
                        )}

                        {!loading && !query && (
                            <div className="text-center text-sm text-slate-400 p-2 italic">
                                Type to search...
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
            </DialogContent>
        </Dialog>
    );
}
