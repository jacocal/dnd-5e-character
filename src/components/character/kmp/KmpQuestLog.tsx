"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Plus,
    NotebookPen,
    ArrowLeft,
    CheckCircle2,
    Circle,
    MoreVertical,
    Trash2,
    Send,
    MessageSquare,
    Archive,
    AlertCircle,
    Pin,
    PinOff,
    Trophy,
    MapPin,
    UserCheck,
    Sparkles,
    Bot,
    Dices,
    Zap,
    Search,
    Compass,
    Loader2,
    Wrench,
    Coins,
    History,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKmpCharacter } from "./KmpCharacterProvider";
import { A2UiRenderer, A2UiSurfacePayload } from "@/components/a2ui/A2UiRenderer";
import { loadSavedLlmConfig } from "@/components/copilot/LlmSettingsModal";

export const QUEST_CATEGORIES: Record<string, { label: string; badgeClass: string }> = {
    main: {
        label: "Main Quest",
        badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40"
    },
    side: {
        label: "Side Quest",
        badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40"
    },
    faction: {
        label: "Faction / Guild",
        badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40"
    },
    personal: {
        label: "Personal Arc",
        badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
    },
    bounty: {
        label: "Bounty / Contract",
        badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40"
    }
};

const SKILL_CHECK_OPTIONS = [
    { key: "none", label: "No Linked Check" },
    { key: "perception", label: "Perception" },
    { key: "investigation", label: "Investigation" },
    { key: "insight", label: "Insight" },
    { key: "arcana", label: "Arcana" },
    { key: "persuasion", label: "Persuasion" },
    { key: "stealth", label: "Stealth" },
    { key: "athletics", label: "Athletics" },
    { key: "survival", label: "Survival" },
    { key: "religion", label: "Religion" },
    { key: "history", label: "History" },
    { key: "deception", label: "Deception" },
    { key: "intimidation", label: "Intimidation" },
    { key: "sleight_of_hand", label: "Sleight of Hand" },
    { key: "medicine", label: "Medicine" },
    { key: "nature", label: "Nature" },
    { key: "acrobatics", label: "Acrobatics" }
];

const CHRONICLE_TAGS = ["Clue", "NPC", "Location", "Loot", "Lore", "Session Recap"];

/**
 * Parses an objective description for an inline skill check tag like `[Arcana DC 14]` or `[Insight]`
 * or matches a skill name inside brackets.
 */
export function parseObjectiveSkillCheck(
    description: string,
    resolvedSkills: any[]
): { skillKey: string; skillName: string; modifier: number; dc: number | null } | null {
    if (!description) return null;
    const bracketMatch = description.match(/\[([^\]]+)\]/);
    const searchTarget = (bracketMatch ? bracketMatch[1] : description).toLowerCase();

    for (const sk of resolvedSkills || []) {
        const nameLower = (sk.name || "").toLowerCase();
        const keyLower = (sk.key || "").toLowerCase().replace("_", " ");
        if (
            (bracketMatch && (searchTarget.includes(nameLower) || searchTarget.includes(keyLower))) ||
            description.toLowerCase().includes(`[${nameLower}`)
        ) {
            const dcMatch = searchTarget.match(/dc\s*(\d+)/i) || description.match(/dc\s*(\d+)/i);
            const dc = dcMatch ? parseInt(dcMatch[1], 10) : null;
            return {
                skillKey: sk.key,
                skillName: sk.name,
                modifier: sk.total ?? 0,
                dc
            };
        }
    }
    return null;
}

/**
 * Pinned Quest Tracker HUD Banner rendered on the main Character Sheet below the Vitals Dock.
 */
export function PinnedQuestHudBanner({
    onOpenQuestInDrawer
}: {
    onOpenQuestInDrawer?: (questId: number) => void;
}) {
    const { state, viewModel, executeInstantRoll, openRollComposer } = useKmpCharacter();
    const quests: any[] = state?.character?.quests || [];
    const resolvedSkills: any[] = state?.resolvedSkills || [];

    const trackedQuests = useMemo(
        () => quests.filter((q) => q.status === "active" && q.isTracked),
        [quests]
    );

    if (trackedQuests.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trackedQuests.slice(0, 2).map((quest) => {
                const objectives = [...(quest.objectives || [])].sort((a, b) => a.order - b.order);
                const completedCount = objectives.filter((o) => o.isCompleted).length;
                const totalCount = objectives.length;
                const nextObjective = objectives.find((o) => !o.isCompleted);
                const allObjectivesDone = totalCount > 0 && completedCount === totalCount;
                const catInfo = QUEST_CATEGORIES[quest.category || "main"] || QUEST_CATEGORIES.main;
                const parsedCheck = nextObjective
                    ? parseObjectiveSkillCheck(nextObjective.description, resolvedSkills)
                    : null;

                return (
                    <div
                        key={quest.id}
                        className={cn(
                            "p-3 rounded-xl border bg-white/95 dark:bg-slate-900/95 shadow-sm transition-all flex flex-col justify-between gap-2",
                            trackedQuests.length === 1 && "md:col-span-2",
                            allObjectivesDone
                                ? "border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/15"
                                : "border-amber-500/35"
                        )}
                    >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0 rotate-45" />
                                <button
                                    type="button"
                                    onClick={() => onOpenQuestInDrawer?.(quest.id)}
                                    className="font-bold text-xs md:text-sm text-slate-900 dark:text-white hover:text-amber-500 dark:hover:text-amber-400 transition-colors truncate text-left"
                                >
                                    {quest.title}
                                </button>
                                <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5", catInfo.badgeClass)}>
                                    {catInfo.label}
                                </Badge>
                                {quest.location && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-indigo-400" />
                                        {quest.location}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                {(quest.rewardXp > 0 || quest.rewardGp > 0) && (
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                                        {quest.rewardXp > 0 ? `+${quest.rewardXp} XP` : ""}
                                        {quest.rewardXp > 0 && quest.rewardGp > 0 ? " • " : ""}
                                        {quest.rewardGp > 0 ? `+${quest.rewardGp} GP` : ""}
                                    </span>
                                )}
                                {totalCount > 0 && (
                                    <Badge variant="secondary" className="text-[10px] font-mono h-5">
                                        {completedCount}/{totalCount}
                                    </Badge>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-[10px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                                    onClick={() => onOpenQuestInDrawer?.(quest.id)}
                                >
                                    Journal <ChevronRight className="w-3 h-3 ml-0.5" />
                                </Button>
                            </div>
                        </div>

                        {nextObjective ? (
                            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex-wrap">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => viewModel?.toggleQuestObjective(nextObjective.id, true)}
                                        className="text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
                                        title="Mark objective complete"
                                    >
                                        <Circle className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs text-slate-700 dark:text-slate-200 truncate">
                                        <strong className="text-[10px] uppercase text-amber-600 dark:text-amber-400 mr-1.5">
                                            Next Objective:
                                        </strong>
                                        {nextObjective.description}
                                    </span>
                                </div>

                                {parsedCheck && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            size="sm"
                                            className="h-6 text-[10px] px-2 bg-amber-600 hover:bg-amber-500 text-white gap-1"
                                            onClick={() =>
                                                executeInstantRoll({
                                                    rollType: "skill",
                                                    targetId: parsedCheck.skillKey,
                                                    targetAcOrDc: parsedCheck.dc ?? undefined,
                                                    label: `${parsedCheck.skillName} Check`
                                                })
                                            }
                                            title={`Instant Auto-Roll ${parsedCheck.skillName}`}
                                        >
                                            ⚡ {parsedCheck.skillName} ({parsedCheck.modifier >= 0 ? `+${parsedCheck.modifier}` : parsedCheck.modifier})
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 text-[10px] px-1.5 border-slate-300 dark:border-slate-700"
                                            onClick={() =>
                                                openRollComposer({
                                                    rollType: "skill",
                                                    targetId: parsedCheck.skillKey,
                                                    targetAcOrDc: parsedCheck.dc ?? undefined,
                                                    label: `${parsedCheck.skillName} Check`
                                                })
                                            }
                                            title="Open in Roll Composer"
                                        >
                                            🎲
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : allObjectivesDone ? (
                            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-emerald-500/20">
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4" />
                                    All {totalCount} objectives complete! Ready to turn in &amp; claim rewards.
                                </span>
                                <Button
                                    size="sm"
                                    className="h-6 text-[10px] px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1"
                                    onClick={() => viewModel?.claimQuestRewards(quest.id)}
                                >
                                    <Trophy className="w-3 h-3" />
                                    Complete &amp; Claim Rewards
                                </Button>
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Main Overhauled Quest Log & Campaign Journal Drawer with Embedded AG-UI + A2UI Co-Pilot.
 */
export function KmpQuestLog({
    externalOpenQuestId,
    onClearExternalOpenQuestId
}: {
    externalOpenQuestId?: number | null;
    onClearExternalOpenQuestId?: () => void;
}) {
    const {
        viewModel,
        state,
        openRollComposer,
        executeQuickRoll,
        executeInstantRoll
    } = useKmpCharacter();

    const [isOpen, setIsOpen] = useState(false);
    const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showAiExtractor, setShowAiExtractor] = useState(false);
    const [filterTab, setFilterTab] = useState<"active" | "tracked" | "main" | "side" | "completed">("active");
    const [searchQuery, setSearchQuery] = useState("");

    const [prevExternalOpenQuestId, setPrevExternalOpenQuestId] = useState<number | null | undefined>(externalOpenQuestId);
    if (externalOpenQuestId && externalOpenQuestId !== prevExternalOpenQuestId) {
        setPrevExternalOpenQuestId(externalOpenQuestId);
        setSelectedQuestId(externalOpenQuestId);
        setIsCreating(false);
        setShowAiExtractor(false);
        setIsOpen(true);
    } else if (!externalOpenQuestId && prevExternalOpenQuestId) {
        setPrevExternalOpenQuestId(externalOpenQuestId);
    }

    useEffect(() => {
        if (externalOpenQuestId) {
            onClearExternalOpenQuestId?.();
        }
    }, [externalOpenQuestId, onClearExternalOpenQuestId]);

    const quests: any[] = state?.character?.quests || [];
    const characterId: number = state?.character?.id || 0;
    const resolvedSkills: any[] = state?.resolvedSkills || [];
    const recentEvents: any[] = state?.character?.events || [];

    const selectedQuest = useMemo(
        () => (selectedQuestId ? quests.find((q: any) => q.id === selectedQuestId) || null : null),
        [quests, selectedQuestId]
    );

    const stats = useMemo(() => {
        const active = quests.filter((q) => q.status === "active" || q.status === "paused");
        const completed = quests.filter((q) => q.status === "completed");
        const tracked = quests.filter((q) => q.status === "active" && q.isTracked);
        let totalObj = 0;
        let doneObj = 0;
        let pendingXp = 0;
        let pendingGp = 0;
        active.forEach((q) => {
            const objs = q.objectives || [];
            totalObj += objs.length;
            doneObj += objs.filter((o: any) => o.isCompleted).length;
            if (!q.rewardsClaimed) {
                pendingXp += q.rewardXp || 0;
                pendingGp += q.rewardGp || 0;
            }
        });
        return {
            activeCount: active.length,
            completedCount: completed.length,
            trackedCount: tracked.length,
            totalObj,
            doneObj,
            pendingXp,
            pendingGp
        };
    }, [quests]);

    const filteredQuests = useMemo(() => {
        const qLower = searchQuery.trim().toLowerCase();
        return quests.filter((q) => {
            if (filterTab === "active" && q.status !== "active" && q.status !== "paused") return false;
            if (filterTab === "tracked" && (!q.isTracked || q.status !== "active")) return false;
            if (filterTab === "main" && (q.category || "main") !== "main") return false;
            if (filterTab === "side" && (q.category || "main") === "main") return false;
            if (filterTab === "completed" && q.status !== "completed" && q.status !== "failed") return false;

            if (!qLower) return true;
            const inTitle = (q.title || "").toLowerCase().includes(qLower);
            const inDesc = (q.description || "").toLowerCase().includes(qLower);
            const inGiver = (q.giver || "").toLowerCase().includes(qLower);
            const inLoc = (q.location || "").toLowerCase().includes(qLower);
            const inObjs = (q.objectives || []).some((o: any) =>
                (o.description || "").toLowerCase().includes(qLower)
            );
            return inTitle || inDesc || inGiver || inLoc || inObjs;
        });
    }, [quests, filterTab, searchQuery]);

    const handleCreateQuest = async (data: {
        title: string;
        description?: string;
        category?: string;
        giver?: string;
        location?: string;
        rewardXp?: number;
        rewardGp?: number;
        rewardNotes?: string;
        objectives?: string[];
    }) => {
        await viewModel?.addQuest(
            data.title,
            data.description,
            data.category || "main",
            data.giver,
            data.location,
            data.rewardXp || 0,
            data.rewardGp || 0,
            data.rewardNotes,
            data.objectives || []
        );
        setIsCreating(false);
        setShowAiExtractor(false);
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 sm:px-2.5 gap-1.5 text-xs relative">
                    <NotebookPen size={14} className="text-amber-500 shrink-0" />
                    <span className="hidden sm:inline">Quest Log</span>
                    {stats.activeCount > 0 && (
                        <Badge
                            variant="secondary"
                            className="h-4 px-1.5 text-[10px] font-mono bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                        >
                            {stats.activeCount}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>

            <SheetContent
                side="left"
                className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            >
                {/* Header & Campaign Telemetry */}
                <SheetHeader className="p-4 pb-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-2 pr-6 flex-wrap">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
                                <Compass className="w-5 h-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Quest Log &amp; Campaign Journal
                                    <Badge
                                        variant="outline"
                                        className="text-[9px] border-amber-500/40 text-amber-600 dark:text-amber-300"
                                    >
                                        AG-UI + A2UI
                                    </Badge>
                                </SheetTitle>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {stats.activeCount} Active • {stats.trackedCount} Pinned on HUD • {stats.doneObj}/{stats.totalObj} Objectives Done
                                </p>
                            </div>
                        </div>

                        {!isCreating && !selectedQuest && (
                            <div className="flex items-center gap-1.5">
                                <Button
                                    size="sm"
                                    variant={showAiExtractor ? "default" : "outline"}
                                    className={cn(
                                        "h-8 text-xs gap-1.5",
                                        showAiExtractor
                                            ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                                            : "border-indigo-500/40 text-indigo-600 dark:text-indigo-300"
                                    )}
                                    onClick={() => setShowAiExtractor(!showAiExtractor)}
                                >
                                    <Bot size={14} />
                                    <span>AI Quest Co-Pilot</span>
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-8 text-xs gap-1 bg-amber-600 hover:bg-amber-500 text-white"
                                    onClick={() => {
                                        setShowAiExtractor(false);
                                        setIsCreating(true);
                                    }}
                                >
                                    <Plus size={14} />
                                    <span>New Quest</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Pending Campaign Rewards Banner */}
                    {!isCreating && !selectedQuest && (stats.pendingXp > 0 || stats.pendingGp > 0) && (
                        <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-[11px]">
                            <span className="text-amber-800 dark:text-amber-200 font-medium flex items-center gap-1.5">
                                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                Active Quest Bounties Available to Claim:
                            </span>
                            <div className="flex items-center gap-2 font-mono font-bold">
                                {stats.pendingXp > 0 && (
                                    <span className="text-indigo-600 dark:text-indigo-300">+{stats.pendingXp} XP</span>
                                )}
                                {stats.pendingGp > 0 && (
                                    <span className="text-amber-600 dark:text-amber-300">+{stats.pendingGp} GP</span>
                                )}
                            </div>
                        </div>
                    )}
                </SheetHeader>

                <ScrollArea className="flex-1 p-4">
                    {isCreating ? (
                        <RichQuestForm
                            onCancel={() => setIsCreating(false)}
                            onSubmit={handleCreateQuest}
                        />
                    ) : selectedQuest ? (
                        <OverhauledQuestDetail
                            quest={selectedQuest}
                            characterId={characterId}
                            resolvedSkills={resolvedSkills}
                            recentEvents={recentEvents}
                            onBack={() => setSelectedQuestId(null)}
                            viewModel={viewModel}
                            onOpenRollComposer={(req) => {
                                setIsOpen(false);
                                openRollComposer(req);
                            }}
                            onQuickSimulatedRoll={executeQuickRoll}
                            onInstantRoll={executeInstantRoll}
                            onCreateExtractedQuest={handleCreateQuest}
                        />
                    ) : (
                        <div className="space-y-4">
                            {/* Embedded AG-UI Note-to-Quest & Campaign Strategy Panel */}
                            {showAiExtractor && (
                                <EmbeddedQuestAgUiPanel
                                    characterId={characterId}
                                    quest={null}
                                    onOpenRollComposer={(req) => {
                                        setIsOpen(false);
                                        openRollComposer(req);
                                    }}
                                    onQuickSimulatedRoll={executeInstantRoll}
                                    onLearnAndPrepareSpell={(spellId) => viewModel?.prepareSpell(spellId, true)}
                                    onAddQuestObjective={(qId, desc) => viewModel?.addQuestObjective(qId, desc, 99)}
                                    onAddQuestLog={(qId, content) => viewModel?.addQuestLog(qId, content)}
                                    onCreateExtractedQuest={handleCreateQuest}
                                />
                            )}

                            {/* Filter Pills & Search */}
                            <div className="space-y-2.5">
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { id: "active", label: `Active (${stats.activeCount})` },
                                        { id: "tracked", label: `📌 Pinned (${stats.trackedCount})` },
                                        { id: "main", label: "Main Quests" },
                                        { id: "side", label: "Side / Faction / Bounty" },
                                        { id: "completed", label: `Completed (${stats.completedCount})` }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setFilterTab(tab.id as any)}
                                            className={cn(
                                                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                                                filterTab === tab.id
                                                    ? "bg-amber-600 text-white shadow-sm"
                                                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search quests, NPCs, locations, or objectives..."
                                        className="h-8 pl-8 text-xs bg-white dark:bg-slate-900"
                                    />
                                </div>
                            </div>

                            {/* Quest Cards List */}
                            {filteredQuests.length === 0 ? (
                                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                                    <Compass className="w-8 h-8 text-slate-400 mx-auto" />
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                        No quests match this view.
                                    </p>
                                    <div className="flex items-center justify-center gap-2 pt-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs"
                                            onClick={() => setIsCreating(true)}
                                        >
                                            <Plus className="w-3.5 h-3.5 mr-1" />
                                            Create Quest Manually
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                                            onClick={() => setShowAiExtractor(true)}
                                        >
                                            <Bot className="w-3.5 h-3.5 mr-1" />
                                            Extract Quest from Notes (AG-UI)
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {filteredQuests.map((quest) => {
                                        const objs = [...(quest.objectives || [])].sort((a, b) => a.order - b.order);
                                        const doneCount = objs.filter((o) => o.isCompleted).length;
                                        const totalCount = objs.length;
                                        const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                                        const nextObj = objs.find((o) => !o.isCompleted);
                                        const cat = QUEST_CATEGORIES[quest.category || "main"] || QUEST_CATEGORIES.main;

                                        return (
                                            <div
                                                key={quest.id}
                                                onClick={() => setSelectedQuestId(quest.id)}
                                                className={cn(
                                                    "group p-3.5 rounded-xl border bg-white dark:bg-slate-900 hover:border-amber-500/50 cursor-pointer transition-all shadow-sm space-y-2",
                                                    quest.isTracked && quest.status === "active"
                                                        ? "border-amber-500/40"
                                                        : "border-slate-200 dark:border-slate-800"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="space-y-1 min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <Badge
                                                                variant="outline"
                                                                className={cn("text-[9px] h-4 px-1.5", cat.badgeClass)}
                                                            >
                                                                {cat.label}
                                                            </Badge>
                                                            <span
                                                                className={cn(
                                                                    "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                                                                    quest.status === "active" &&
                                                                        "bg-blue-500/15 text-blue-600 dark:text-blue-300",
                                                                    quest.status === "completed" &&
                                                                        "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
                                                                    quest.status === "failed" &&
                                                                        "bg-red-500/15 text-red-600 dark:text-red-300",
                                                                    quest.status === "paused" &&
                                                                        "bg-slate-500/15 text-slate-500"
                                                                )}
                                                            >
                                                                {quest.status}
                                                            </span>
                                                            {quest.rewardsClaimed && (
                                                                <Badge className="text-[9px] h-4 px-1.5 bg-emerald-600 text-white">
                                                                    Rewards Claimed ✓
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        <h4
                                                            className={cn(
                                                                "font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors",
                                                                (quest.status === "completed" || quest.status === "failed") &&
                                                                    "line-through opacity-75"
                                                            )}
                                                        >
                                                            {quest.title}
                                                        </h4>
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {quest.status === "active" && (
                                                            <Button
                                                                size="sm"
                                                                variant={quest.isTracked ? "default" : "outline"}
                                                                className={cn(
                                                                    "h-7 px-2 text-[10px] gap-1",
                                                                    quest.isTracked
                                                                        ? "bg-amber-600 hover:bg-amber-500 text-white"
                                                                        : "text-slate-500"
                                                                )}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    viewModel?.updateQuest(
                                                                        quest.id,
                                                                        null,
                                                                        null,
                                                                        null,
                                                                        !quest.isTracked
                                                                    );
                                                                }}
                                                                title={
                                                                    quest.isTracked
                                                                        ? "Pinned to Character Sheet HUD (Click to unpin)"
                                                                        : "Pin Quest to Character Sheet HUD"
                                                                }
                                                            >
                                                                {quest.isTracked ? (
                                                                    <>
                                                                        <Pin className="w-3 h-3 rotate-45" />
                                                                        Pinned
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <PinOff className="w-3 h-3" />
                                                                        Pin
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {quest.description && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                                        {quest.description}
                                                    </p>
                                                )}

                                                {/* Giver, Location & Rewards Pills */}
                                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                                    {quest.giver && (
                                                        <span className="flex items-center gap-1">
                                                            <UserCheck className="w-3 h-3 text-amber-500" />
                                                            {quest.giver}
                                                        </span>
                                                    )}
                                                    {quest.location && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3 text-indigo-400" />
                                                            {quest.location}
                                                        </span>
                                                    )}
                                                    {(quest.rewardXp > 0 || quest.rewardGp > 0) && (
                                                        <span className="ml-auto font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/25">
                                                            {quest.rewardXp > 0 ? `+${quest.rewardXp} XP` : ""}
                                                            {quest.rewardXp > 0 && quest.rewardGp > 0 ? " • " : ""}
                                                            {quest.rewardGp > 0 ? `+${quest.rewardGp} GP` : ""}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Objective Progress Bar & Next Objective Preview */}
                                                {totalCount > 0 && (
                                                    <div className="space-y-1 pt-1">
                                                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                                                            <span>
                                                                Objectives: <strong>{doneCount}/{totalCount}</strong> ({pct}%)
                                                            </span>
                                                            {nextObj && (
                                                                <span className="truncate max-w-[260px] text-amber-600 dark:text-amber-400 font-medium">
                                                                    Next: {nextObj.description}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                            <div
                                                                className={cn(
                                                                    "h-full transition-all duration-300",
                                                                    pct === 100 ? "bg-emerald-500" : "bg-amber-500"
                                                                )}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

/**
 * Embedded AG-UI Streaming Co-Pilot Panel for Quest Strategy & Session Note Objective Extraction.
 */
function EmbeddedQuestAgUiPanel({
    characterId,
    quest,
    onOpenRollComposer,
    onQuickSimulatedRoll,
    onLearnAndPrepareSpell,
    onAddQuestObjective,
    onAddQuestLog,
    onCreateExtractedQuest
}: {
    characterId: number;
    quest: any | null;
    onOpenRollComposer: (req: any) => void;
    onQuickSimulatedRoll: (req: any) => void;
    onLearnAndPrepareSpell?: (spellId: string) => void;
    onAddQuestObjective?: (questId: number, description: string) => void;
    onAddQuestLog?: (questId: number, content: string) => void;
    onCreateExtractedQuest?: (questData: any) => void;
}) {
    const [rawNotes, setRawNotes] = useState("");
    const [customPrompt, setCustomPrompt] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [toolCalls, setToolCalls] = useState<string[]>([]);
    const [assistantText, setAssistantText] = useState("");
    const [surfaces, setSurfaces] = useState<A2UiSurfacePayload[]>([]);

    const runQuestAgUi = async (mode: "quest_advisor" | "quest_extractor", promptOverride?: string) => {
        if (isStreaming) return;
        const llmConfig = loadSavedLlmConfig();
        const promptText =
            promptOverride ||
            (mode === "quest_extractor"
                ? `Extract a structured D&D 5e quest with objectives and skill checks from these session notes:\n${rawNotes}`
                : quest
                ? `Analyze my quest '${quest.title}' and recommend the best skill checks, utility spells, and tactical sub-objectives.`
                : "Analyze my active quests and recommend the best skill checks, spells, and next objectives.");

        setIsStreaming(true);
        setToolCalls([]);
        setAssistantText("");
        setSurfaces([]);

        try {
            const response = await fetch("/api/ag-ui/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(llmConfig.apiKey ? { "X-LLM-Api-Key": llmConfig.apiKey } : {})
                },
                body: JSON.stringify({
                    characterId,
                    questId: quest?.id ?? null,
                    rawQuestNotes: rawNotes.trim() || null,
                    requestedHelper: mode,
                    llmConfig,
                    messages: [{ role: "user", content: promptText }]
                })
            });

            if (!response.ok || !response.body) {
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const blocks = buffer.split("\n\n");
                buffer = blocks.pop() || "";

                for (const block of blocks) {
                    const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
                    if (!dataLine) continue;
                    try {
                        const evt = JSON.parse(dataLine.slice(6));
                        if (evt.type === "TOOL_CALL_START" && evt.toolCallName) {
                            setToolCalls((prev) => [...prev, evt.toolCallName]);
                        } else if (evt.type === "CUSTOM" && evt.name === "a2ui_surface" && evt.value) {
                            setSurfaces((prev) => [...prev, evt.value as A2UiSurfacePayload]);
                        } else if (evt.type === "TEXT_MESSAGE_CONTENT" && evt.delta) {
                            setAssistantText((prev) => prev + evt.delta);
                        } else if (evt.type === "RUN_ERROR") {
                            setAssistantText(`Error: ${evt.message}`);
                        }
                    } catch {
                        // ignore partial chunk
                    }
                }
            }
        } catch (e: any) {
            setAssistantText(`AG-UI Quest Co-Pilot error: ${e.message}`);
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/40 text-slate-100 space-y-3 shadow-md">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
                        {quest ? `AG-UI Quest Strategy: ${quest.title}` : "AG-UI Note-to-Quest Extractor & Strategy Co-Pilot"}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Button
                        size="sm"
                        disabled={isStreaming}
                        className="h-7 text-[11px] px-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold gap-1"
                        onClick={() => runQuestAgUi("quest_advisor")}
                    >
                        <Sparkles className="w-3 h-3" />
                        {quest ? "Analyze Quest Strategy" : "Analyze Active Quests"}
                    </Button>
                </div>
            </div>

            {/* Paste Raw DM Session Notes / Briefing to Extract Objectives or Full Quest */}
            <div className="space-y-2">
                <Textarea
                    value={rawNotes}
                    onChange={(e) => setRawNotes(e.target.value)}
                    placeholder={
                        quest
                            ? "Optional: Paste new DM session notes, clues, or rumors here to extract sub-objectives and skill checks for this quest..."
                            : "Paste DM briefing or raw session notes (e.g. 'Lord Neverember offered 300 GP and 500 XP to investigate the Crypt of the Sunless Citadel, disarm the runic ward, and recover the Dawn Relic')..."
                    }
                    className="min-h-[68px] text-xs bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
                />
                <div className="flex items-center gap-2">
                    <Input
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Or ask a specific tactical question about this quest..."
                        className="h-7 text-xs bg-slate-900 border-slate-800 text-slate-100"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && customPrompt.trim()) {
                                e.preventDefault();
                                runQuestAgUi("quest_advisor", customPrompt.trim());
                            }
                        }}
                    />
                    {rawNotes.trim() && (
                        <Button
                            size="sm"
                            disabled={isStreaming}
                            className="h-7 text-[11px] px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
                            onClick={() => runQuestAgUi("quest_extractor")}
                        >
                            Extract Objectives
                        </Button>
                    )}
                    {customPrompt.trim() && (
                        <Button
                            size="sm"
                            disabled={isStreaming}
                            variant="outline"
                            className="h-7 text-[11px] px-2.5 border-slate-700 text-slate-200 shrink-0"
                            onClick={() => runQuestAgUi("quest_advisor", customPrompt.trim())}
                        >
                            Ask
                        </Button>
                    )}
                </div>
            </div>

            {isStreaming && (
                <div className="flex items-center gap-2 text-xs text-amber-400 animate-pulse py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Streaming AG-UI Quest Analysis &amp; A2UI Strategy Surface...</span>
                </div>
            )}

            {toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {toolCalls.map((tc, idx) => (
                        <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-amber-300 font-mono"
                        >
                            <Wrench className="w-2.5 h-2.5 text-amber-400" />
                            {tc}()
                        </span>
                    ))}
                </div>
            )}

            {surfaces.length > 0 && (
                <div className="space-y-2.5">
                    {surfaces.map((surface) => (
                        <A2UiRenderer
                            key={surface.surfaceId}
                            surface={surface}
                            onOpenRollComposer={onOpenRollComposer}
                            onQuickSimulatedRoll={onQuickSimulatedRoll}
                            onLearnAndPrepareSpell={onLearnAndPrepareSpell}
                            onAddQuestObjective={onAddQuestObjective}
                            onAddQuestLog={onAddQuestLog}
                            onCreateExtractedQuest={onCreateExtractedQuest}
                        />
                    ))}
                </div>
            )}

            {assistantText && (
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {assistantText}
                </div>
            )}
        </div>
    );
}

/**
 * Overhauled Quest Detail View with Reward Claiming, Skill-Linked Objectives, Embedded AG-UI Co-Pilot, and Tagged Chronicle.
 */
function OverhauledQuestDetail({
    quest,
    characterId,
    resolvedSkills,
    recentEvents,
    onBack,
    viewModel,
    onOpenRollComposer,
    onQuickSimulatedRoll,
    onInstantRoll,
    onCreateExtractedQuest
}: {
    quest: any;
    characterId: number;
    resolvedSkills: any[];
    recentEvents: any[];
    onBack: () => void;
    viewModel: any;
    onOpenRollComposer: (req: any) => void;
    onQuickSimulatedRoll: (req: any) => void;
    onInstantRoll: (req: any) => void;
    onCreateExtractedQuest: (data: any) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [showAgUi, setShowAgUi] = useState(false);
    const [newObjective, setNewObjective] = useState("");
    const [linkedSkillKey, setLinkedSkillKey] = useState("none");
    const [linkedSkillDc, setLinkedSkillDc] = useState("14");
    const [newLog, setNewLog] = useState("");
    const [selectedTag, setSelectedTag] = useState<string>("Clue");

    const objectives = [...(quest.objectives || [])].sort((a: any, b: any) => a.order - b.order);
    const logs = [...(quest.logs || [])].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const completedCount = objectives.filter((o: any) => o.isCompleted).length;
    const totalCount = objectives.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const catInfo = QUEST_CATEGORIES[quest.category || "main"] || QUEST_CATEGORIES.main;

    const handleAddObjective = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newObjective.trim()) return;
        let finalDesc = newObjective.trim();
        if (linkedSkillKey !== "none") {
            const skLabel =
                SKILL_CHECK_OPTIONS.find((s) => s.key === linkedSkillKey)?.label || linkedSkillKey;
            const dcNum = parseInt(linkedSkillDc, 10);
            finalDesc = `${finalDesc} [${skLabel}${!isNaN(dcNum) && dcNum > 0 ? ` DC ${dcNum}` : ""}]`;
        }
        viewModel?.addQuestObjective(quest.id, finalDesc, objectives.length);
        setNewObjective("");
        setLinkedSkillKey("none");
    };

    const handleAddLog = () => {
        if (!newLog.trim()) return;
        const taggedContent = selectedTag ? `[${selectedTag}] ${newLog.trim()}` : newLog.trim();
        viewModel?.addQuestLog(quest.id, taggedContent);
        setNewLog("");
    };

    const handleDelete = () => {
        viewModel?.deleteQuest(quest.id);
        onBack();
    };

    if (isEditing) {
        return (
            <RichQuestForm
                initialData={quest}
                onCancel={() => setIsEditing(false)}
                onSubmit={async (data) => {
                    await viewModel?.updateQuest(
                        quest.id,
                        data.title,
                        data.description,
                        null,
                        null,
                        data.category,
                        data.giver,
                        data.location,
                        data.rewardXp,
                        data.rewardGp,
                        data.rewardNotes
                    );
                    setIsEditing(false);
                }}
            />
        );
    }

    return (
        <div className="space-y-5 pb-6">
            {/* Top Bar */}
            <div className="flex items-start gap-2.5">
                <Button variant="ghost" size="icon" className="-ml-2 shrink-0 h-8 w-8" onClick={onBack}>
                    <ArrowLeft size={18} />
                </Button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5", catInfo.badgeClass)}>
                            {catInfo.label}
                        </Badge>
                        <span
                            className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                quest.status === "active" &&
                                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                                quest.status === "completed" &&
                                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                                quest.status === "failed" &&
                                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                                quest.status === "paused" &&
                                    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            )}
                        >
                            {quest.status}
                        </span>
                    </div>

                    <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-white">
                        {quest.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {quest.giver && (
                            <span className="flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                                <strong>Giver:</strong> {quest.giver}
                            </span>
                        )}
                        {quest.location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                                <strong>Location:</strong> {quest.location}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <Button
                        size="sm"
                        variant={quest.isTracked ? "default" : "outline"}
                        className={cn(
                            "h-7 px-2 text-[11px] gap-1",
                            quest.isTracked ? "bg-amber-600 hover:bg-amber-500 text-white" : ""
                        )}
                        onClick={() =>
                            viewModel?.updateQuest(quest.id, null, null, null, !quest.isTracked)
                        }
                    >
                        <Pin className="w-3 h-3 rotate-45" />
                        {quest.isTracked ? "Pinned" : "Pin HUD"}
                    </Button>

                    <Button
                        size="sm"
                        variant={showAgUi ? "default" : "outline"}
                        className={cn(
                            "h-7 px-2 text-[11px] gap-1",
                            showAgUi
                                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                                : "border-indigo-500/40 text-indigo-600 dark:text-indigo-300"
                        )}
                        onClick={() => setShowAgUi(!showAgUi)}
                    >
                        <Bot className="w-3.5 h-3.5" />
                        AI Strategy
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                Edit Quest &amp; Rewards
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => viewModel?.updateQuest(quest.id, null, null, "active", null)}
                            >
                                Mark Active
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => viewModel?.updateQuest(quest.id, null, null, "paused", null)}
                            >
                                Pause Quest
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => viewModel?.updateQuest(quest.id, null, null, "failed", null)}
                            >
                                Mark Failed
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                                <Trash2 size={14} className="mr-2" /> Delete Quest
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Quest Description & Rewards Chest */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                {quest.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {quest.description}
                    </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Rewards:</span>
                        {quest.rewardXp > 0 && (
                            <Badge
                                variant="outline"
                                className="text-[10px] font-mono border-indigo-500/40 text-indigo-600 dark:text-indigo-300"
                            >
                                +{quest.rewardXp} XP
                            </Badge>
                        )}
                        {quest.rewardGp > 0 && (
                            <Badge
                                variant="outline"
                                className="text-[10px] font-mono border-amber-500/40 text-amber-600 dark:text-amber-300"
                            >
                                <Coins className="w-3 h-3 mr-1" />+{quest.rewardGp} GP
                            </Badge>
                        )}
                        {quest.rewardNotes && (
                            <Badge
                                variant="outline"
                                className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-300"
                            >
                                🎁 {quest.rewardNotes}
                            </Badge>
                        )}
                        {!quest.rewardXp && !quest.rewardGp && !quest.rewardNotes && (
                            <span className="text-[11px] text-slate-400 italic">No rewards specified</span>
                        )}
                    </div>

                    {!quest.rewardsClaimed ? (
                        <Button
                            size="sm"
                            className="h-7 text-[11px] px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5"
                            onClick={() => viewModel?.claimQuestRewards(quest.id)}
                        >
                            <Trophy className="w-3.5 h-3.5" />
                            Complete &amp; Claim Rewards
                        </Button>
                    ) : (
                        <Badge className="bg-emerald-600/20 text-emerald-500 border border-emerald-500/40 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Rewards Claimed
                        </Badge>
                    )}
                </div>
            </div>

            {/* Embedded AG-UI Quest Strategy Co-Pilot */}
            {showAgUi && (
                <EmbeddedQuestAgUiPanel
                    characterId={characterId}
                    quest={quest}
                    onOpenRollComposer={onOpenRollComposer}
                    onQuickSimulatedRoll={onInstantRoll}
                    onLearnAndPrepareSpell={(spellId) => viewModel?.prepareSpell(spellId, true)}
                    onAddQuestObjective={(qId, desc) =>
                        viewModel?.addQuestObjective(qId, desc, objectives.length)
                    }
                    onAddQuestLog={(qId, content) => viewModel?.addQuestLog(qId, content)}
                    onCreateExtractedQuest={onCreateExtractedQuest}
                />
            )}

            {/* Objectives Section with Inline Skill Check Rollers */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                        Quest Objectives ({completedCount}/{totalCount})
                    </h3>
                    {totalCount > 0 && (
                        <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                            {pct}% Complete
                        </span>
                    )}
                </div>

                {totalCount > 0 && (
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                            className={cn(
                                "h-full transition-all duration-300",
                                pct === 100 ? "bg-emerald-500" : "bg-amber-500"
                            )}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                )}

                <div className="space-y-1.5">
                    {objectives.map((obj: any) => {
                        const parsedCheck = parseObjectiveSkillCheck(obj.description, resolvedSkills);
                        return (
                            <div
                                key={obj.id}
                                className="group flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 hover:border-amber-500/40 transition-colors"
                            >
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                    <button
                                        type="button"
                                        className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-500 transition-colors"
                                        onClick={() =>
                                            viewModel?.toggleQuestObjective(obj.id, !obj.isCompleted)
                                        }
                                    >
                                        {obj.isCompleted ? (
                                            <CheckCircle2 size={17} className="text-emerald-500" />
                                        ) : (
                                            <Circle size={17} />
                                        )}
                                    </button>
                                    <span
                                        className={cn(
                                            "text-xs leading-relaxed break-words",
                                            obj.isCompleted
                                                ? "line-through text-slate-400"
                                                : "text-slate-800 dark:text-slate-100"
                                        )}
                                    >
                                        {obj.description}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    {parsedCheck && (
                                        <>
                                            <Button
                                                size="sm"
                                                className="h-6 text-[10px] px-2 bg-amber-600 hover:bg-amber-500 text-white gap-1"
                                                onClick={() =>
                                                    onInstantRoll({
                                                        rollType: "skill",
                                                        targetId: parsedCheck.skillKey,
                                                        targetAcOrDc: parsedCheck.dc ?? undefined,
                                                        label: `${parsedCheck.skillName} Check`
                                                    })
                                                }
                                                title={`1-Click Instant Roll ${parsedCheck.skillName}`}
                                            >
                                                ⚡ {parsedCheck.skillName} (
                                                {parsedCheck.modifier >= 0
                                                    ? `+${parsedCheck.modifier}`
                                                    : parsedCheck.modifier}
                                                )
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-6 text-[10px] px-1.5 border-slate-300 dark:border-slate-700"
                                                onClick={() =>
                                                    onOpenRollComposer({
                                                        rollType: "skill",
                                                        targetId: parsedCheck.skillKey,
                                                        targetAcOrDc: parsedCheck.dc ?? undefined,
                                                        label: `${parsedCheck.skillName} Check`
                                                    })
                                                }
                                                title="Open in Roll Composer"
                                            >
                                                🎲{parsedCheck.dc ? ` DC ${parsedCheck.dc}` : ""}
                                            </Button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                                        onClick={() => viewModel?.deleteQuestObjective(obj.id)}
                                        title="Delete objective"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Add New Objective with Optional Linked Skill Check */}
                <form onSubmit={handleAddObjective} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                        <Input
                            value={newObjective}
                            onChange={(e) => setNewObjective(e.target.value)}
                            placeholder="Add objective (e.g. Inspect the runic seal)..."
                            className="h-8 text-xs flex-1"
                        />
                        <Button type="submit" size="sm" className="h-8 text-xs px-3" disabled={!newObjective.trim()}>
                            <Plus size={14} className="mr-1" /> Add
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="text-slate-400 font-medium">Attach Skill Check:</span>
                        <Select value={linkedSkillKey} onValueChange={setLinkedSkillKey}>
                            <SelectTrigger className="h-7 w-40 text-xs">
                                <SelectValue placeholder="No Linked Check" />
                            </SelectTrigger>
                            <SelectContent>
                                {SKILL_CHECK_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.key} value={opt.key}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {linkedSkillKey !== "none" && (
                            <div className="flex items-center gap-1">
                                <span className="text-slate-400">DC:</span>
                                <Input
                                    type="number"
                                    min={5}
                                    max={30}
                                    value={linkedSkillDc}
                                    onChange={(e) => setLinkedSkillDc(e.target.value)}
                                    className="h-7 w-14 text-xs text-center font-mono"
                                />
                            </div>
                        )}
                    </div>
                </form>
            </div>

            {/* Campaign Chronicle & Recent Roll/Event Pinning */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-indigo-400" />
                        Quest Chronicle &amp; Clues ({logs.length})
                    </h3>

                    {/* 1-Click Pin Recent Combat/Skill Roll Event to Quest Chronicle */}
                    {recentEvents.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1">
                                    <History className="w-3 h-3 text-indigo-400" />
                                    Pin Recent Roll/Event
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="max-w-xs">
                                {recentEvents.slice(0, 6).map((evt: any, idx: number) => (
                                    <DropdownMenuItem
                                        key={evt.id || idx}
                                        className="text-xs truncate"
                                        onClick={() =>
                                            viewModel?.addQuestLog(
                                                quest.id,
                                                `[Roll Log] ${evt.title}: ${evt.summary}`
                                            )
                                        }
                                    >
                                        <span className="truncate">
                                            <strong>{evt.title}</strong> — {evt.summary}
                                        </span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Tag Selector + Chronicle Entry Input */}
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                        {CHRONICLE_TAGS.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => setSelectedTag(tag)}
                                className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all",
                                    selectedTag === tag
                                        ? "bg-indigo-600 text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700"
                                )}
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Textarea
                            value={newLog}
                            onChange={(e) => setNewLog(e.target.value)}
                            placeholder={`Record a ${selectedTag.toLowerCase()} entry for this quest...`}
                            className="min-h-[68px] resize-none pr-10 text-xs"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddLog();
                                }
                            }}
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute bottom-2 right-2 h-7 w-7 text-slate-400 hover:text-indigo-500"
                            onClick={handleAddLog}
                            disabled={!newLog.trim()}
                        >
                            <Send size={14} />
                        </Button>
                    </div>
                </div>

                {/* Chronicle Entries */}
                {logs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-3">
                        No chronicle entries yet. Record clues, NPCs, or pin recent roll outcomes above.
                    </p>
                ) : (
                    <div className="space-y-2 pt-1">
                        {logs.map((log: any) => (
                            <div
                                key={log.id}
                                className="group p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 text-xs flex items-start justify-between gap-2"
                            >
                                <div className="space-y-1 min-w-0 flex-1">
                                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                        {log.content}
                                    </p>
                                    {log.createdAt && (
                                        <span className="text-[10px] text-slate-400 block">
                                            {new Date(log.createdAt).toLocaleDateString(undefined, {
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1"
                                    onClick={() => viewModel?.deleteQuestLog(log.id)}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Rich Quest Creation & Editing Form with Category, Giver, Location, Rewards (XP/GP/Items), and Initial Objectives.
 */
function RichQuestForm({
    initialData,
    onSubmit,
    onCancel
}: {
    initialData?: any;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}) {
    const [title, setTitle] = useState(initialData?.title || "");
    const [category, setCategory] = useState(initialData?.category || "main");
    const [giver, setGiver] = useState(initialData?.giver || "");
    const [location, setLocation] = useState(initialData?.location || "");
    const [rewardXp, setRewardXp] = useState(String(initialData?.rewardXp ?? 250));
    const [rewardGp, setRewardGp] = useState(String(initialData?.rewardGp ?? 100));
    const [rewardNotes, setRewardNotes] = useState(initialData?.rewardNotes || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [objectivesText, setObjectivesText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setIsSubmitting(true);
        try {
            const objectives = objectivesText
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean);
            await onSubmit({
                title: title.trim(),
                category,
                giver: giver.trim() || undefined,
                location: location.trim() || undefined,
                rewardXp: parseInt(rewardXp, 10) || 0,
                rewardGp: parseInt(rewardGp, 10) || 0,
                rewardNotes: rewardNotes.trim() || undefined,
                description: description.trim() || undefined,
                objectives
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
        >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {initialData ? "Edit Quest Details & Rewards" : "Create New Campaign Quest"}
                </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="q-title" className="text-xs">
                        Quest Title
                    </Label>
                    <Input
                        id="q-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Defend the Sunlit Citadel"
                        className="h-8 text-xs"
                        autoFocus
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(QUEST_CATEGORIES).map(([k, v]) => (
                                <SelectItem key={k} value={k}>
                                    {v.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs">Quest Giver / NPC</Label>
                    <Input
                        value={giver}
                        onChange={(e) => setGiver(e.target.value)}
                        placeholder="e.g. High Cleric Valerius"
                        className="h-8 text-xs"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs">Location / Region</Label>
                    <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Sunlit Citadel • Inner Sanctum"
                        className="h-8 text-xs"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs">Reward XP</Label>
                    <Input
                        type="number"
                        min={0}
                        value={rewardXp}
                        onChange={(e) => setRewardXp(e.target.value)}
                        className="h-8 text-xs font-mono"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs">Reward Gold (GP)</Label>
                    <Input
                        type="number"
                        min={0}
                        value={rewardGp}
                        onChange={(e) => setRewardGp(e.target.value)}
                        className="h-8 text-xs font-mono"
                    />
                </div>
                <div className="col-span-2 sm:col-span-1 space-y-1.5">
                    <Label className="text-xs">Item / Special Reward</Label>
                    <Input
                        value={rewardNotes}
                        onChange={(e) => setRewardNotes(e.target.value)}
                        placeholder="e.g. Cloak of Protection"
                        className="h-8 text-xs"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs">Briefing &amp; Lore Description</Label>
                <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Background details, stakes, and known intel..."
                    rows={3}
                    className="text-xs"
                />
            </div>

            {!initialData && (
                <div className="space-y-1.5">
                    <Label className="text-xs">
                        Initial Objectives (one per line • optional `[Skill DC X]` tags auto-link 1-click rollers)
                    </Label>
                    <Textarea
                        value={objectivesText}
                        onChange={(e) => setObjectivesText(e.target.value)}
                        placeholder={`Inspect the shattered wards at the gate [Arcana DC 14]\nQuestion the temple sentries [Insight DC 13]\nDefend the Dawn Relic in the Inner Sanctum`}
                        rows={3}
                        className="text-xs font-mono"
                    />
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting || !title.trim()}
                    className="bg-amber-600 hover:bg-amber-500 text-white"
                >
                    {initialData ? "Save Quest Changes" : "Create Quest"}
                </Button>
            </div>
        </form>
    );
}
