"use client";

import { useEffect, useState } from "react";
import { KmpCharacterProvider, useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { KmpAbilityScoreList } from "@/components/character/kmp/KmpAbilityScoreList";
import { KmpCombatStats } from "@/components/character/kmp/KmpCombatStats";
import { KmpHPCounter } from "@/components/character/kmp/KmpHPCounter";
import { KmpConditionsPanel } from "@/components/character/kmp/KmpConditionsPanel";
import { KmpSpellList } from "@/components/character/kmp/KmpSpellList";
import { KmpInventoryList } from "@/components/character/kmp/KmpInventoryList";
import { KmpAttacksList } from "@/components/character/kmp/KmpAttacksList";
import { KmpFeaturesTab } from "@/components/character/kmp/KmpFeaturesTab";
import { KmpQuestLog, PinnedQuestHudBanner } from "@/components/character/kmp/KmpQuestLog";
import { KmpResourceList } from "@/components/character/kmp/KmpResourceList";
import { KmpSkillsPanel } from "@/components/character/kmp/KmpSkillsPanel";
import { KmpActiveEffectsPanel } from "@/components/character/kmp/KmpActiveEffectsPanel";
import { ActionRollComposer } from "@/components/character/ActionRollComposer";
import { EventLogPanel } from "@/components/character/EventLogPanel";
import { CoPilotSidebar } from "@/components/copilot/CoPilotSidebar";
import { BattleMapCanvas } from "@/components/map/BattleMapCanvas";

import { BioTab } from "@/components/character/BioTab";
import { CurrencyTracker } from "@/components/character/CurrencyTracker";
import { ExperienceBar } from "@/components/character/ExperienceBar";
import { KmpLevelUpFlow } from "@/components/character/kmp/KmpLevelUpFlow";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Moon,
    Sun,
    Dices,
    Swords,
    BookOpen,
    Backpack,
    ScrollText,
    Sparkles,
    Zap,
    X,
    RotateCcw,
    SlidersHorizontal,
    ChevronDown,
    ChevronUp,
    Heart,
    Shield,
    Compass
} from "lucide-react";
import Link from "next/link";
import { fetchClasses } from "@/app/actions";
import { cn } from "@/lib/utils";

type WorkspaceTab = "stats" | "combat" | "map" | "spellbook" | "inventory" | "features";

function KmpPageContent({ characterId }: { characterId: number }) {
    const {
        viewModel: vm,
        state,
        sheet,
        isLoading,
        error,
        openRollComposer,
        executeQuickRoll,
        executeInstantRoll,
        composerOpen,
        setComposerOpen,
        composerRequest,
        lastRollOutcome,
        toastRollOutcome,
        lastInstantRequest,
        dismissToastRoll,
        concentrationCheckDc,
        dismissConcentrationCheck
    } = useKmpCharacter();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [classes, setClasses] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<WorkspaceTab>("combat");
    const [openQuestIdFromHud, setOpenQuestIdFromHud] = useState<number | null>(null);
    const [mobileVitalsExpanded, setMobileVitalsExpanded] = useState<boolean>(true);

    const handleSelectTab = (tab: WorkspaceTab) => {
        setActiveTab(tab);
        // On mobile, auto-collapse the tall Vitals Dock when switching to Map, Spells, Gear, or Features so tab content appears immediately at the top
        if (tab === "map" || tab === "spellbook" || tab === "inventory" || tab === "features") {
            setMobileVitalsExpanded(false);
        } else if (tab === "combat") {
            setMobileVitalsExpanded(true);
        }
    };

    useEffect(() => {
        fetchClasses().then(setClasses);
        if (typeof window !== "undefined" && characterId) {
            window.localStorage.setItem("dnd_battlemap_char_id", String(characterId));
        }
    }, [characterId]);

    if (isLoading && !sheet) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
                <div className="animate-pulse">Loading KMP Rules Engine...</div>
            </div>
        );
    }

    if (error && !sheet) {
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

    const classString = character.classes?.length > 0
        ? character.classes
            .map((c: { classId: string; className?: string; subclassId?: string; subclassName?: string; level: number }) => {
                const name = c.className || c.classId || "Unknown";
                const subName = c.subclassName ? ` (${c.subclassName})` : (c.subclassId ? ` (${c.subclassId})` : "");
                return `Lvl ${c.level} ${name}${subName}`;
            })
            .join(" / ")
        : "Commoner";

    const unselectedGrantsCount = (state?.spellGrantSlots || []).filter((s: any) => !s.selectedSpellId).length;
    const preparedCount = state?.preparedSpellsCount ?? 0;
    const maxPrepared = state?.maxPreparedSpells ?? 0;
    const triggerCount = (state?.activeTriggerMatrix || []).length;

    const tabs: Array<{ id: WorkspaceTab; label: string; icon: any; badge?: string | number }> = [
        {
            id: "combat",
            label: "Combat & Actions",
            icon: Swords,
            badge: (state?.actions || []).length
        },
        {
            id: "map",
            label: "Battle Map",
            icon: Compass,
            badge: "LIVE"
        },
        {
            id: "spellbook",
            label: "Spellbook & Prep",
            icon: BookOpen,
            badge: maxPrepared > 0 ? `${preparedCount}/${maxPrepared}` : (state?.resolvedSpells || []).length
        },
        {
            id: "inventory",
            label: "Inventory & Gear",
            icon: Backpack,
            badge: (state?.resolvedItems || []).length
        },
        {
            id: "features",
            label: "Features, Triggers & Bio",
            icon: ScrollText,
            badge: triggerCount > 0 ? `${triggerCount}⚡` : undefined
        }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 lg:pb-12">
            {/* Interactive Action & Roll Composer (Simulated + Physical Tabletop Dice + Rider Stacking) */}
            <ActionRollComposer
                open={composerOpen}
                onOpenChange={setComposerOpen}
                initialRequest={composerRequest}
                sheet={sheet}
                lastRollOutcome={lastRollOutcome}
                onExecuteRoll={executeQuickRoll}
                concentrationRequiredDc={concentrationCheckDc}
                onDismissConcentrationPrompt={dismissConcentrationCheck}
            />

            {/* Sticky Top Character Banner (Ultra-Compact 1-Row on Mobile, Full Toolbar on Desktop) */}
            <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
                <div className="container mx-auto max-w-7xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 -ml-1">
                                <ArrowLeft size={18} />
                            </Button>
                        </Link>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <h1 className="text-sm sm:text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-tight truncate">
                                    {character.name}
                                </h1>
                                <Badge
                                    variant="secondary"
                                    className="text-[9px] sm:text-[10px] h-4 sm:h-5 px-1.5 font-bold uppercase tracking-wider truncate max-w-[160px] sm:max-w-none"
                                >
                                    {classString}
                                </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate hidden sm:block mt-0.5">
                                {character.raceEntry?.name || character.raceId} • {character.background?.name || "Adventurer"}
                                {character.alignment ? ` • ${character.alignment}` : ""}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* AG-UI & A2UI Tactical Co-Pilot */}
                        <CoPilotSidebar
                            characterId={character.id}
                            characterName={character.name}
                            onOpenRollComposer={openRollComposer}
                            onQuickSimulatedRoll={executeQuickRoll}
                            onLearnAndPrepareSpell={(spellId) => vm?.prepareSpell(spellId, true)}
                            onAddQuestObjective={(qId, desc) => vm?.addQuestObjective(qId, desc, 99)}
                            onAddQuestLog={(qId, content) => vm?.addQuestLog(qId, content)}
                            onCreateExtractedQuest={(qData) =>
                                vm?.addQuest(
                                    qData.title,
                                    qData.description,
                                    qData.category || "main",
                                    qData.giver,
                                    qData.location,
                                    qData.rewardXp || 0,
                                    qData.rewardGp || 0,
                                    qData.rewardNotes,
                                    qData.objectives || []
                                )
                            }
                        />

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 sm:px-2.5 gap-1.5 text-xs"
                            onClick={() =>
                                openRollComposer({
                                    rollType: "custom_dice",
                                    targetId: "1d20",
                                    label: "Tabletop Dice Tray"
                                })
                            }
                            title="Open Ad-Hoc Tabletop Dice Tray (1d4..1d100 or custom XdY+Z)"
                        >
                            <Dices size={14} className="text-amber-500" />
                            <span className="hidden md:inline">Dice Tray</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden md:inline-flex h-8 gap-1.5 text-xs"
                            onClick={() =>
                                openRollComposer({
                                    rollType: "initiative",
                                    targetId: "initiative",
                                    label: "Initiative Roll"
                                })
                            }
                        >
                            <Dices size={14} className="text-indigo-500" />
                            <span>Init Roll</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden md:inline-flex h-8 gap-1 text-xs"
                            onClick={() => vm?.shortRest()}
                            title="Short Rest (Recover Pact Magic & Short Rest Resources)"
                        >
                            <Sun size={14} className="text-amber-500" />
                            <span>Short Rest</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden md:inline-flex h-8 gap-1 text-xs"
                            onClick={() => vm?.longRest()}
                            title="Long Rest (Restore Full HP, Spell Slots, Hit Dice, Free Casts & Resources)"
                        >
                            <Moon size={14} className="text-indigo-400" />
                            <span>Long Rest</span>
                        </Button>

                        <KmpQuestLog
                            externalOpenQuestId={openQuestIdFromHud}
                            onClearExternalOpenQuestId={() => setOpenQuestIdFromHud(null)}
                        />
                        <KmpLevelUpFlow classes={classes} />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-3 sm:px-4 pt-3 sm:pt-4 flex-grow w-full max-w-7xl space-y-4 sm:space-y-5">
                {/* Pending Player Choices Notification Banner */}
                {unselectedGrantsCount > 0 && (
                    <div
                        onClick={() => handleSelectTab("spellbook")}
                        className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-800 dark:text-amber-200 flex items-center justify-between cursor-pointer hover:bg-amber-500/15 transition-colors text-xs"
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>
                                You have <strong>{unselectedGrantsCount}</strong> unselected Feat/Species spell choice(s) available!
                            </span>
                        </div>
                        <span className="font-bold underline">Open Spellbook &amp; Prep →</span>
                    </div>
                )}

                {/* Mobile-Only Compact Vitals Pill Bar (Allows collapsing/expanding the tall Vitals Dock on phones) */}
                <div className="lg:hidden flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 text-xs font-mono font-bold flex-wrap">
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <Heart className="w-3.5 h-3.5 fill-current" />
                            {character.hpCurrent}/{character.hpMax}
                            {character.tempHp > 0 ? ` (+${character.tempHp})` : ""}
                        </span>
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <Shield className="w-3.5 h-3.5" />
                            AC {state?.resolvedCombatStats?.armorClass ?? character.armorClass ?? 10}
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                executeInstantRoll({
                                    rollType: "initiative",
                                    targetId: "initiative",
                                    label: "Initiative Roll"
                                })
                            }
                            className="flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400"
                        >
                            ⚡ Init{" "}
                            {(state?.resolvedCombatStats?.initiative ?? 0) >= 0
                                ? `+${state?.resolvedCombatStats?.initiative ?? 0}`
                                : state?.resolvedCombatStats?.initiative ?? 0}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setMobileVitalsExpanded(!mobileVitalsExpanded)}
                        className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800"
                    >
                        <span>{mobileVitalsExpanded ? "Hide Vitals" : "Vitals & Rests"}</span>
                        {mobileVitalsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                </div>

                {/* Top Vitals & XP Dock (Always Visible on Desktop, Collapsible on Mobile) */}
                <div
                    className={cn(
                        "grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch",
                        mobileVitalsExpanded ? "grid" : "hidden lg:grid"
                    )}
                >
                    <div className="lg:col-span-5">
                        <KmpHPCounter className="h-full" />
                    </div>
                    <div className="lg:col-span-7 flex flex-col justify-between gap-4">
                        <ExperienceBar />
                        <KmpActiveEffectsPanel />
                    </div>
                </div>

                {/* Pinned Active Quest Tracker HUD Banner */}
                <div className={cn(mobileVitalsExpanded ? "block" : "hidden lg:block")}>
                    <PinnedQuestHudBanner onOpenQuestInDrawer={(qId) => setOpenQuestIdFromHud(qId)} />
                </div>

                {/* Main 2-Pane Workspace: Persistent Left Rail on Desktop + 4 Mode Tabs (Direct 5-Tab Bottom Bar on Mobile) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Left Rail: Abilities, Combat Stats, Saving Throws & Skills */}
                    <aside
                        className={cn(
                            "space-y-4 lg:col-span-4",
                            activeTab === "stats" ? "block" : "hidden lg:block"
                        )}
                    >
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                                    Abilities
                                </h2>
                                <span className="text-[10px] text-indigo-400 font-medium">⚡ Tap for Instant Check</span>
                            </div>
                            <KmpAbilityScoreList />
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h2 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider">
                                Defense, Senses &amp; Saving Throws
                            </h2>
                            <KmpCombatStats />
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                                    Skills
                                </h2>
                                <span className="text-[10px] text-slate-400">Row: Prof • ⚡: Roll • 🎲: Composer</span>
                            </div>
                            <KmpSkillsPanel />
                        </div>
                    </aside>

                    {/* Right Main Workspace: 4 Mode Tabs */}
                    <section
                        className={cn(
                            "lg:col-span-8 space-y-4",
                            activeTab === "stats" ? "hidden lg:block" : "block"
                        )}
                    >
                        {/* Desktop Tab Navigation Bar (Hidden on Mobile where Fixed Bottom Nav is used) */}
                        <div className="hidden lg:flex flex-wrap gap-1.5 p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            {tabs.map((t) => {
                                const Icon = t.icon;
                                const isActive = activeTab === t.id || (activeTab === "stats" && t.id === "combat");
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setActiveTab(t.id)}
                                        className={cn(
                                            "flex-1 min-w-[140px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                                            isActive
                                                ? "bg-indigo-600 text-white shadow-sm"
                                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" />
                                        <span className="truncate">{t.label}</span>
                                        {t.badge !== undefined && (
                                            <span
                                                className={cn(
                                                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                                                    isActive
                                                        ? "bg-indigo-800 text-indigo-100"
                                                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                                )}
                                            >
                                                {t.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* TAB 1: Combat & Actions */}
                        {(activeTab === "combat" || activeTab === "stats") && (
                            <div className="space-y-5 animate-in fade-in duration-150">
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                                Actions, Weapon Masteries & Combat Spells
                                            </h2>
                                            <p className="text-xs text-slate-500">
                                                Click any action to stack riders (Divine Smite, Sneak Attack, Rage, Bless) and roll via Simulated or Physical Tabletop Dice.
                                            </p>
                                        </div>
                                    </div>
                                    <KmpAttacksList />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                        <h2 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider">
                                            Class & Feat Resources
                                        </h2>
                                        <KmpResourceList />
                                    </div>
                                    <KmpConditionsPanel />
                                </div>

                                <EventLogPanel events={character.events || []} />
                            </div>
                        )}

                        {/* TAB 2: Real-Time LAN Battle Map Canvas */}
                        {activeTab === "map" && (
                            <div className="animate-in fade-in duration-150">
                                <BattleMapCanvas
                                    role="player"
                                    characterId={character.id}
                                    characterName={character.name}
                                    characterActions={state?.actions || []}
                                />
                            </div>
                        )}

                        {/* TAB 3: Spellbook & Daily Preparation */}
                        {activeTab === "spellbook" && (
                            <div className="animate-in fade-in duration-150">
                                <KmpSpellList />
                            </div>
                        )}

                        {/* TAB 3: Inventory & Gear */}
                        {activeTab === "inventory" && (
                            <div className="space-y-5 animate-in fade-in duration-150">
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                                    <div>
                                        <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                                            Coin Purse & Wealth Calculator
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Track coins directly or use the earn/spend converter
                                        </p>
                                    </div>
                                    <CurrencyTracker />
                                </div>

                                <KmpInventoryList />
                            </div>
                        )}

                        {/* TAB 4: Features, Causal Trigger Matrix & Bio */}
                        {activeTab === "features" && (
                            <div className="space-y-6 animate-in fade-in duration-150">
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <KmpFeaturesTab />
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <BioTab />
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* Mobile & Tablet Fixed Bottom 6-Tab Thumb Navigation Bar (<1024px) */}
            <nav
                aria-label="Mobile Character Sheet Navigation"
                className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] px-1 py-1"
            >
                <div className="grid grid-cols-6 gap-0.5 max-w-lg mx-auto">
                    {[
                        { id: "stats" as WorkspaceTab, label: "Stats", icon: SlidersHorizontal, badge: undefined },
                        { id: "combat" as WorkspaceTab, label: "Combat", icon: Swords, badge: (state?.actions || []).length },
                        { id: "map" as WorkspaceTab, label: "Map", icon: Compass, badge: undefined },
                        {
                            id: "spellbook" as WorkspaceTab,
                            label: "Spells",
                            icon: BookOpen,
                            badge: maxPrepared > 0 ? `${preparedCount}/${maxPrepared}` : undefined
                        },
                        { id: "inventory" as WorkspaceTab, label: "Gear", icon: Backpack, badge: (state?.resolvedItems || []).length },
                        { id: "features" as WorkspaceTab, label: "Features", icon: ScrollText, badge: triggerCount > 0 ? `${triggerCount}⚡` : undefined }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleSelectTab(tab.id)}
                                className={cn(
                                    "relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all select-none",
                                    isActive
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                <div className="relative flex items-center justify-center">
                                    <Icon className="w-4 h-4" />
                                    {tab.badge !== undefined && (
                                        <span
                                            className={cn(
                                                "ml-1 text-[9px] font-mono font-bold px-1 rounded-full leading-tight",
                                                isActive
                                                    ? "bg-indigo-800 text-indigo-100"
                                                    : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                            )}
                                        >
                                            {tab.badge}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-bold mt-0.5 leading-none truncate max-w-full">
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Floating Non-Blocking Instant Roll Result Toast (Positioned above Bottom Nav on Mobile) */}
            {toastRollOutcome && !composerOpen && (
                <div className="fixed bottom-20 lg:bottom-5 right-3 sm:right-5 left-3 sm:left-auto z-50 sm:w-full sm:max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-200">
                    <div
                        className={cn(
                            "p-4 rounded-2xl border shadow-2xl backdrop-blur-md space-y-2.5",
                            toastRollOutcome.isCriticalHit
                                ? "bg-amber-950/95 border-amber-400 text-amber-100"
                                : toastRollOutcome.isCriticalFail
                                ? "bg-red-950/95 border-red-500 text-red-100"
                                : "bg-slate-950/95 border-indigo-500/50 text-slate-100"
                        )}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span className="font-bold text-sm truncate">{toastRollOutcome.title}</span>
                                    {toastRollOutcome.isCriticalHit && (
                                        <Badge className="bg-amber-500 text-slate-950 font-black text-[9px] h-4 px-1.5">
                                            CRIT!
                                        </Badge>
                                    )}
                                    {toastRollOutcome.isCriticalFail && (
                                        <Badge className="bg-red-600 text-white font-black text-[9px] h-4 px-1.5">
                                            NAT 1!
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-[11px] font-mono text-slate-300 mt-1 break-words">
                                    {toastRollOutcome.detailedFormula || toastRollOutcome.summary}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                    <div className="text-[8px] uppercase text-slate-400 font-bold">
                                        {toastRollOutcome.totalDamage > 0 && toastRollOutcome.totalD20Result == null
                                            ? "Damage"
                                            : "Total"}
                                    </div>
                                    <div className="text-2xl font-black font-mono text-white leading-none">
                                        {toastRollOutcome.totalD20Result ?? toastRollOutcome.totalDamage}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={dismissToastRoll}
                                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {toastRollOutcome.triggeredEffects && toastRollOutcome.triggeredEffects.length > 0 && (
                            <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                                {toastRollOutcome.triggeredEffects.slice(0, 2).map((eff: string, idx: number) => (
                                    <div
                                        key={idx}
                                        className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-500/30 text-indigo-200"
                                    >
                                        ⚡ {eff}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80">
                            {lastInstantRequest && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[11px] gap-1 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                                    onClick={() => executeInstantRoll(lastInstantRequest)}
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Roll Again
                                </Button>
                            )}
                            {lastInstantRequest && (
                                <Button
                                    size="sm"
                                    className="h-7 text-[11px] gap-1 bg-indigo-600 hover:bg-indigo-500 text-white ml-auto"
                                    onClick={() => {
                                        openRollComposer(lastInstantRequest);
                                    }}
                                >
                                    <Dices className="w-3 h-3" />
                                    Open in Composer
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
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
