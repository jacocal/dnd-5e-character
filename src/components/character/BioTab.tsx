"use client";

import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function BioTab() {
    const { viewModel, state } = useKmpCharacter();
    const character = state?.character;

    // Derived State
    const size = character?.size || "Medium";
    const appearance = character?.appearance || "";
    const backstory = character?.backstory || "";
    const languages = character?.languages || [];
    // Fix: Calculate Darkvision manually to handle modifiers correctly
    const calculateDarkvision = () => {
        if (!state || !character) return 0;

        const allModifiers: any[] = [];

        // 1. Traits (Race & Background usually)
        if (character.traits) {
            character.traits.forEach((t: any) => {
                if (t.modifiers) allModifiers.push(...t.modifiers);
            });
        }

        // 1b. Race Entry (Fallback/Primary Source for Racial Traits if traits list is bare)
        if (character.raceEntry && character.raceEntry.modifiers) {
            allModifiers.push(...character.raceEntry.modifiers);
        }

        // 1c. Background
        if (character.background && character.background.modifiers) {
            allModifiers.push(...character.background.modifiers);
        }

        // 2. Feats
        if (character.feats) {
            character.feats.forEach((f: any) => {
                if (f.modifiers) allModifiers.push(...f.modifiers);
            });
        }

        // 3. Items (Equipped only)
        // Accessing resolvedItems from state as per existing patterns (e.g. KmpInventoryList)
        if (state.resolvedItems) {
            state.resolvedItems.forEach((entry: any) => {
                if (entry.equipped && entry.item && entry.item.modifiers) {
                    allModifiers.push(...entry.item.modifiers);
                }
            });
        }

        const darkvisionMods = allModifiers.filter((m: any) => m.target === "darkvision");

        // Rule 1: 'set' has higher priority than 'bonus'.
        // Rule 2: Highest 'set' value wins.
        const setMods = darkvisionMods.filter((m: any) => m.type === "set");
        if (setMods.length > 0) {
            const maxSet = Math.max(...setMods.map((m: any) => Number(m.value) || 0));
            return maxSet;
        }

        // Fallback: Apply bonuses to base (assuming 0 base if no set exists)
        const bonusMods = darkvisionMods.filter((m: any) => m.type === "bonus");
        const totalBonus = bonusMods.reduce((acc: number, m: any) => acc + (Number(m.value) || 0), 0);

        // If standard racial darkvision was working, it would be a 'set' modifier in traits.
        // If backend provided a base value in resolvedRace.darkvision that we want to keep as fallback:
        const base = state?.resolvedRace?.darkvision || 0;

        // If we have bonuses but no explicit set, we add to base. 
        // However, if the bug is that traits ARENT calculating, then base might be 0 when it should be 60.
        // So we strictly rely on modifiers defined in data. 
        // If a racial trait says "set 60", we use it. If no trait says anything, it's 0 + bonuses.

        return base + totalBonus;
    };

    const darkvision = calculateDarkvision();

    const [localApp, setLocalApp] = useState(appearance);
    const [localBack, setLocalBack] = useState(backstory);
    const [isLanguageDialogOpen, setIsLanguageDialogOpen] = useState(false);

    useEffect(() => {
        setLocalApp(appearance);
    }, [appearance]);

    useEffect(() => {
        setLocalBack(backstory);
    }, [backstory]);

    const handleUpdateBio = (newApp: string, newBack: string, newSize: string) => {
        if (!viewModel) return;
        viewModel.updateBio(newSize, newApp, newBack);
    };

    const handleSizeChange = (val: string) => {
        handleUpdateBio(localApp, localBack, val);
    };

    const handleAppBlur = () => {
        if (localApp !== appearance) {
            handleUpdateBio(localApp, localBack, size);
        }
    };

    const handleBackBlur = () => {
        if (localBack !== backstory) {
            handleUpdateBio(localApp, localBack, size);
        }
    };

    const handleAddLanguage = (lang: string) => {
        if (!viewModel || !character) return;
        // Fix: Removed character.id, KMP ViewModel handles context
        viewModel.addCharacterLanguage(lang);
    };

    const handleRemoveLanguage = (langId: string) => {
        if (!viewModel || !character) return;
        // Fix: Removed character.id
        viewModel.removeCharacterLanguage(langId);
    };

    const availableLanguages = [
        "Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin", "Halfling", "Orc",
        "Abyssal", "Celestial", "Draconic", "Deep Speech", "Infernal", "Primordial", "Sylvan", "Undercommon"
    ];

    return (
        <div className="space-y-8">
            {/* Appearance Section */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    Appearance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium leading-none mb-2 block text-muted-foreground">Size</label>
                        <Select value={size} onValueChange={handleSizeChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Size" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Tiny">Tiny</SelectItem>
                                <SelectItem value="Small">Small</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Large">Large</SelectItem>
                                <SelectItem value="Huge">Huge</SelectItem>
                                <SelectItem value="Gargantuan">Gargantuan</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {darkvision !== null && darkvision > 0 && (
                        <div>
                            <label className="text-sm font-medium leading-none mb-2 block text-muted-foreground">Senses</label>
                            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-md text-sm font-medium">
                                Darkvision {darkvision} ft.
                            </div>
                        </div>
                    )}
                    <div className={darkvision !== null && darkvision > 0 ? "" : "md:col-span-2"}>
                        <label className="text-sm font-medium leading-none mb-2 block text-muted-foreground">Character Description</label>
                        <Textarea
                            value={localApp}
                            onChange={(e) => setLocalApp(e.target.value)}
                            onBlur={handleAppBlur}
                            placeholder="Describe your character's appearance..."
                            className="min-h-[120px] resize-y bg-slate-50 dark:bg-slate-900/50"
                        />
                    </div>
                </div>
            </section>


            {/* Languages Section */}
            <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        Languages
                    </h3>
                    <Dialog open={isLanguageDialogOpen} onOpenChange={setIsLanguageDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="ml-auto">
                                Add Language <Plus className="ml-2 h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Manage Languages</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                                <h4 className="text-sm font-medium mb-3 text-slate-500 uppercase tracking-wider">Available Languages</h4>
                                <div className="flex flex-wrap gap-2">
                                    {availableLanguages
                                        .filter(lang => !languages.some((l: any) => l.languageId === lang.toLowerCase()))
                                        .map(lang => (
                                            <button
                                                key={lang}
                                                onClick={() => handleAddLanguage(lang.toLowerCase())}
                                                className="inline-flex items-center rounded-md border px-2.5 py-1 text-sm font-medium transition-all
                                                         border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600
                                                         dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
                                            >
                                                <Plus className="h-3 w-3 mr-1 opacity-50" />
                                                {lang}
                                            </button>
                                        ))}
                                    {availableLanguages.every(lang => languages.some((l: any) => l.languageId === lang.toLowerCase())) && (
                                        <p className="text-sm text-slate-400 italic">All languages learned.</p>
                                    )}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="space-y-4">
                    {/* Known Languages Display Only */}
                    <div className="min-h-[40px] p-4 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-dashed border-slate-200 dark:border-slate-800">
                        {languages.length === 0 && (
                            <div className="text-center text-sm text-muted-foreground w-full">
                                No languages known. Click + to add.
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {languages.map((l: any) => {
                                // Fallback key if id is 0 (optimistic)
                                const uniqueKey = l.id > 0 ? l.id : `lang-${l.languageId}`;
                                return (
                                    <div key={uniqueKey} className="inline-flex items-center rounded-md border px-2.5 py-1 text-sm font-medium transition-colors border-transparent bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 gap-1 group">
                                        {l.languageName || l.languageId}
                                        <button
                                            className="ml-1 rounded-full outline-none hover:bg-indigo-200 dark:hover:bg-indigo-800 p-0.5 transition-colors"
                                            onClick={() => handleRemoveLanguage(l.languageId)}
                                        >
                                            <X className="h-3 w-3" />
                                            <span className="sr-only">Remove</span>
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* Backstory Section */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    Backstory
                </h3>
                <Textarea
                    value={localBack}
                    onChange={(e) => setLocalBack(e.target.value)}
                    onBlur={handleBackBlur}
                    placeholder="Once upon a time..."
                    className="min-h-[300px] bg-slate-50 dark:bg-slate-900/50"
                />
            </section>
        </div>
    );
}
