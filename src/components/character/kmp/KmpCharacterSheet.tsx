"use client";

import { useEffect, useState } from "react";
import { KmpCharacterProvider, useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { KmpCharacterBridge } from "@/components/character/kmp/KmpCharacterBridge";
import { KmpAbilityScoreList } from "@/components/character/kmp/KmpAbilityScoreList";
import { KmpCombatStats } from "@/components/character/kmp/KmpCombatStats";
import { KmpHPCounter } from "@/components/character/kmp/KmpHPCounter";
import { KmpConditionsPanel } from "@/components/character/kmp/KmpConditionsPanel";
import { KmpSpellList } from "@/components/character/kmp/KmpSpellList";
import { KmpInventoryList } from "@/components/character/kmp/KmpInventoryList";
import { KmpAttacksList } from "@/components/character/kmp/KmpAttacksList";
import { KmpFeaturesTab } from "@/components/character/kmp/KmpFeaturesTab";
import { KmpQuestLog } from "@/components/character/kmp/KmpQuestLog";
import { KmpResourceList } from "@/components/character/kmp/KmpResourceList";
import { KmpSkillsPanel } from "@/components/character/kmp/KmpSkillsPanel";
import { KmpActiveEffectsPanel } from "@/components/character/kmp/KmpActiveEffectsPanel";
import { KmpMobileNav } from "@/components/character/kmp/KmpMobileNav";

// Legacy Components
import { BioTab } from "@/components/character/BioTab";
import { CurrencyTracker } from "@/components/character/CurrencyTracker";
import { ExperienceBar } from "@/components/character/ExperienceBar";
import { KmpLevelUpFlow } from "@/components/character/kmp/KmpLevelUpFlow";

import { CharacterHeaderActions } from "@/components/character/CharacterHeaderActions";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { fetchClasses } from "@/app/actions";

function KmpPageContent({ characterId }: { characterId: number }) {
    const { viewModel: vm, state, isLoading, error } = useKmpCharacter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [classes, setClasses] = useState<any[]>([]);

    useEffect(() => {
        // Fetch classes for LevelUpDialog
        fetchClasses().then(setClasses);
    }, []);

    if (isLoading && !state) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
                <div className="animate-pulse">Loading KMP Module...</div>
            </div>
        );
    }

    if (error && !state) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950 text-red-400">
                Error: {error}
            </div>
        );
    }

    const { character } = state || {};

    if (!character) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                <div className="text-center py-12">
                    <button
                        onClick={() => vm?.loadCharacter(characterId)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500"
                    >
                        Reload Character
                    </button>
                    <p className="mt-2 text-slate-500">Character ID: {characterId}</p>
                </div>
            </div>
        );
    }

    // Build class string
    const classString = character.classes?.length > 0
        ? character.classes
            .map((c: { classId: string; subclassId?: string; subclassName?: string; level: number }) => {
                const name = c.classId || "Unknown"; // Fallback if class object isn't expanded
                const subName = c.subclassName ? ` (${c.subclassName})` : (c.subclassId ? ` (${c.subclassId})` : "");
                return `Lvl ${c.level} ${name}${subName}`;
            })
            .join(" / ")
        : "Commoner";

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 md:pb-0">
            {/* Bridge: Sync KMP State to Zustand Store for Legacy Components */}
            <KmpCharacterBridge />

            {/* Mobile Navigation */}
            <KmpMobileNav />

            {/* Header */}
            <header className="bg-white dark:bg-slate-900 shadow-sm p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-all duration-200">
                <div className="container mx-auto flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="shrink-0">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-tight truncate">{character.name}</h1>
                        <p className="text-xs md:text-sm text-slate-500 truncate">
                            {character.raceEntry?.name || character.raceId} • {character.background?.name || "Unknown Background"}{character.alignment ? ` • ${character.alignment}` : ""}
                        </p>
                        <p className="text-slate-400 uppercase text-[10px] md:text-xs font-bold tracking-wider truncate">{classString}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden md:block">
                            <KmpQuestLog />
                        </div>
                        <KmpLevelUpFlow classes={classes} />
                        <div className="hidden md:block">
                            <CharacterHeaderActions />
                        </div>
                    </div>
                </div>
                {/* Mobile Quest/Actions row if needed */}
                <div className="container mx-auto mt-2 flex justify-end md:hidden gap-2">
                    <KmpQuestLog />
                    <CharacterHeaderActions />
                </div>
            </header>

            <main className="container mx-auto p-4 flex-grow w-full max-w-7xl space-y-6">
                {/* XP Bar */}
                <ExperienceBar />

                {/* Responsive Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-start">

                    {/* Column 1: Stats (Left on Desktop, Top on Mobile) */}
                    <div id="section-stats" className="space-y-6 lg:col-span-3">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h2 className="text-sm font-bold uppercase text-slate-400 mb-4 tracking-wider">Abilities</h2>
                            <KmpAbilityScoreList />
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h2 className="text-sm font-bold uppercase text-slate-400 mb-3 tracking-wider">Combat Stats</h2>
                            <KmpCombatStats />


                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h2 className="text-sm font-bold uppercase text-slate-400 mb-3 tracking-wider">Skills</h2>
                            <KmpSkillsPanel />
                        </div>
                    </div>

                    {/* Column 2: Combat & Actions (Center on Desktop) */}
                    <div id="section-combat" className="space-y-6 lg:col-span-5">
                        {/* Vitals & Conditions */}
                        <div className="space-y-4">
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden sticky top-24 z-20">
                                <KmpHPCounter />
                            </div>

                            {/* Active Effects Panel - shows Rage, Wild Shape, etc. */}
                            <KmpActiveEffectsPanel />

                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                <h2 className="text-sm font-bold uppercase text-slate-400 mb-3 tracking-wider">Resources</h2>
                                <KmpResourceList />
                            </div>

                            <KmpConditionsPanel />
                        </div>

                        {/* Attacks & Actions */}
                        <div id="section-actions" className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h2 className="text-lg font-semibold mb-4">Actions & Attacks</h2>
                            <KmpAttacksList />
                        </div>
                    </div>

                    {/* Column 3: Spells, Inv, Bio (Right on Desktop) */}
                    <div className="space-y-6 lg:col-span-4">
                        <div id="section-spells" className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 min-h-[400px]">
                            <KmpSpellList />
                        </div>

                        <div id="section-inventory" className="space-y-6">
                            <KmpInventoryList />

                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                <h2 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Currency</h2>
                                <CurrencyTracker />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <KmpFeaturesTab />
                        </div>

                        <div id="section-bio" className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <BioTab />
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

interface KmpCharacterSheetProps {
    characterId: number;
}

export function KmpCharacterSheet({ characterId }: KmpCharacterSheetProps) {
    return (
        <KmpCharacterProvider characterId={characterId}>
            <KmpPageContent characterId={characterId} />
        </KmpCharacterProvider>
    );
}
