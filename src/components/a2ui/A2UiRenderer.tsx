"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Swords,
    Sparkles,
    Shield,
    Dices,
    BookOpen,
    Zap,
    Target,
    CheckCircle2,
    AlertTriangle,
    ArrowUpRight,
    Compass,
    Plus,
    ScrollText,
    Trophy,
    MapPin,
    UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface A2UiSurfacePayload {
    surfaceId: string;
    componentType:
        | "TacticalActionAdvisorCard"
        | "RollHelperCard"
        | "StatBreakdownCard"
        | "SpellPrepAdvisorCard"
        | "QuestTacticalAdvisorCard"
        | string;
    title: string;
    subtitle?: string | null;
    data: Record<string, any>;
}

interface A2UiRendererProps {
    surface: A2UiSurfacePayload;
    onOpenRollComposer: (rollRequest: any) => void;
    onQuickSimulatedRoll: (rollRequest: any) => void;
    onLearnAndPrepareSpell?: (spellId: string) => void;
    onAddQuestObjective?: (questId: number, description: string) => void;
    onAddQuestLog?: (questId: number, content: string) => void;
    onCreateExtractedQuest?: (questData: {
        title: string;
        description?: string;
        category?: string;
        giver?: string;
        location?: string;
        rewardXp?: number;
        rewardGp?: number;
        objectives?: string[];
    }) => void;
}

export function A2UiRenderer({
    surface,
    onOpenRollComposer,
    onQuickSimulatedRoll,
    onLearnAndPrepareSpell,
    onAddQuestObjective,
    onAddQuestLog,
    onCreateExtractedQuest
}: A2UiRendererProps) {
    switch (surface.componentType) {
        case "TacticalActionAdvisorCard":
            return (
                <TacticalActionAdvisorCard
                    surface={surface}
                    onOpenRollComposer={onOpenRollComposer}
                    onQuickSimulatedRoll={onQuickSimulatedRoll}
                />
            );
        case "RollHelperCard":
            return (
                <RollHelperCard
                    surface={surface}
                    onOpenRollComposer={onOpenRollComposer}
                    onQuickSimulatedRoll={onQuickSimulatedRoll}
                />
            );
        case "StatBreakdownCard":
            return <StatBreakdownCard surface={surface} />;
        case "SpellPrepAdvisorCard":
            return (
                <SpellPrepAdvisorCard
                    surface={surface}
                    onLearnAndPrepareSpell={onLearnAndPrepareSpell}
                />
            );
        case "QuestTacticalAdvisorCard":
            return (
                <QuestTacticalAdvisorCard
                    surface={surface}
                    onOpenRollComposer={onOpenRollComposer}
                    onQuickSimulatedRoll={onQuickSimulatedRoll}
                    onLearnAndPrepareSpell={onLearnAndPrepareSpell}
                    onAddQuestObjective={onAddQuestObjective}
                    onAddQuestLog={onAddQuestLog}
                    onCreateExtractedQuest={onCreateExtractedQuest}
                />
            );
        default:
            return null;
    }
}

function TacticalActionAdvisorCard({
    surface,
    onOpenRollComposer,
    onQuickSimulatedRoll
}: {
    surface: A2UiSurfacePayload;
    onOpenRollComposer: (req: any) => void;
    onQuickSimulatedRoll: (req: any) => void;
}) {
    const options: any[] = surface.data?.options || [];
    const hpPercent: number = surface.data?.hpPercent ?? 100;
    const targetAc: number = surface.data?.targetAc ?? 15;

    return (
        <Card className="border-indigo-500/30 bg-slate-900/90 text-slate-100 shadow-lg overflow-hidden">
            <CardHeader className="p-3 pb-2 bg-gradient-to-r from-indigo-950/80 to-slate-900 border-b border-indigo-500/20">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-400 shrink-0" />
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                            {surface.title}
                        </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-indigo-400/40 text-indigo-300 bg-indigo-950/50">
                        A2UI Advisor
                    </Badge>
                </div>
                {surface.subtitle && (
                    <p className={cn(
                        "text-[11px] mt-1 flex items-center gap-1.5",
                        hpPercent <= 35 ? "text-amber-300 font-medium" : "text-slate-400"
                    )}>
                        {hpPercent <= 35 && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        {surface.subtitle}
                    </p>
                )}
            </CardHeader>
            <CardContent className="p-2.5 space-y-2">
                {options.length === 0 ? (
                    <div className="text-xs text-slate-400 italic p-2 text-center">
                        No offensive actions or prepared attack spells found. Equip a weapon or prepare a spell.
                    </div>
                ) : (
                    options.map((opt, idx) => (
                        <div
                            key={opt.id || idx}
                            className={cn(
                                "p-2.5 rounded-lg border transition-all",
                                idx === 0
                                    ? "bg-indigo-950/40 border-indigo-500/40 shadow-sm"
                                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={cn(
                                            "text-[10px] font-black px-1.5 py-0.5 rounded",
                                            idx === 0
                                                ? "bg-amber-500 text-slate-950"
                                                : "bg-slate-800 text-slate-300"
                                        )}>
                                            #{opt.rank || idx + 1}
                                        </span>
                                        <span className="font-bold text-xs text-white truncate">
                                            {opt.name}
                                        </span>
                                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-slate-800 text-slate-300">
                                            {opt.actionCost}
                                        </Badge>
                                    </div>
                                    <div className="text-[11px] text-slate-300 mt-1 font-mono">
                                        {opt.summary}
                                    </div>
                                    {opt.recommendedRiders && opt.recommendedRiders.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {opt.recommendedRiders.map((r: string) => (
                                                <span
                                                    key={r}
                                                    className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1"
                                                >
                                                    <Zap className="w-2.5 h-2.5" />
                                                    {r}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="text-sm font-black text-emerald-400 font-mono leading-none">
                                        {opt.expectedDamage} <span className="text-[9px] font-normal text-slate-400">DPR</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                        {opt.hitOrSuccessChancePct}% vs AC {targetAc}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-slate-800/80">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200"
                                    onClick={() => onOpenRollComposer(opt.rollRequest)}
                                >
                                    <ArrowUpRight className="w-3 h-3 mr-1" />
                                    Composer / Physical Dice
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-6 text-[10px] px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white"
                                    onClick={() => onQuickSimulatedRoll(opt.rollRequest)}
                                >
                                    <Dices className="w-3 h-3 mr-1" />
                                    Auto-Roll
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

function RollHelperCard({
    surface,
    onOpenRollComposer,
    onQuickSimulatedRoll
}: {
    surface: A2UiSurfacePayload;
    onOpenRollComposer: (req: any) => void;
    onQuickSimulatedRoll: (req: any) => void;
}) {
    const rollRequest = surface.data?.rollRequest;
    const modifier = surface.data?.modifier ?? 0;

    return (
        <Card className="border-amber-500/30 bg-slate-900/90 text-slate-100 shadow-md">
            <CardHeader className="p-3 pb-2 border-b border-slate-800 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Dices className="w-4 h-4 text-amber-400" />
                    <div>
                        <CardTitle className="text-xs font-bold text-amber-200">{surface.title}</CardTitle>
                        {surface.subtitle && <p className="text-[10px] text-slate-400">{surface.subtitle}</p>}
                    </div>
                </div>
                <span className="text-base font-black font-mono text-amber-400">
                    {modifier >= 0 ? `+${modifier}` : modifier}
                </span>
            </CardHeader>
            <CardContent className="p-2.5 flex items-center justify-end gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
                    onClick={() => rollRequest && onOpenRollComposer(rollRequest)}
                >
                    Physical Dice / Riders
                </Button>
                <Button
                    size="sm"
                    className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white"
                    onClick={() => rollRequest && onQuickSimulatedRoll(rollRequest)}
                >
                    <Dices className="w-3.5 h-3.5 mr-1" />
                    Roll Now
                </Button>
            </CardContent>
        </Card>
    );
}

function StatBreakdownCard({ surface }: { surface: A2UiSurfacePayload }) {
    const d = surface.data || {};
    const acSources: Array<{ label: string; value: string }> = d.acSources || [];

    return (
        <Card className="border-emerald-500/30 bg-slate-900/90 text-slate-100 shadow-md">
            <CardHeader className="p-3 pb-2 bg-emerald-950/30 border-b border-emerald-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                            {surface.title}
                        </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300">
                        A2UI Stats
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">Armor Class</div>
                        <div className="text-lg font-black text-emerald-400">{d.armorClass}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">Initiative</div>
                        <div className="text-lg font-black text-indigo-400">
                            {d.initiativeBonus >= 0 ? `+${d.initiativeBonus}` : d.initiativeBonus}
                        </div>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">Proficiency</div>
                        <div className="text-lg font-black text-amber-400">+{d.proficiencyBonus}</div>
                    </div>
                </div>

                {acSources.length > 0 && (
                    <div className="p-2 rounded bg-slate-950/70 border border-slate-800 space-y-1">
                        <div className="text-[10px] font-bold uppercase text-slate-400">AC Formula Sources</div>
                        {acSources.map((src, i) => (
                            <div key={i} className="flex justify-between text-[11px]">
                                <span className="text-slate-300">{src.label}</span>
                                <span className="font-mono font-bold text-emerald-300">{src.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {d.spellcastingAbility && (
                    <div className="flex items-center justify-between p-2 rounded bg-purple-950/30 border border-purple-500/20 text-[11px]">
                        <span className="text-purple-200 font-medium">
                            Spellcasting ({d.spellcastingAbility})
                        </span>
                        <span className="font-mono font-bold text-purple-300">
                            DC {d.spellSaveDc} • +{d.spellAttackBonus} Hit
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function SpellPrepAdvisorCard({
    surface,
    onLearnAndPrepareSpell
}: {
    surface: A2UiSurfacePayload;
    onLearnAndPrepareSpell?: (spellId: string) => void;
}) {
    const d = surface.data || {};
    const alwaysPrepared: any[] = d.alwaysPreparedSpells || [];
    const recommended: any[] = d.recommendedSpells || [];

    return (
        <Card className="border-purple-500/30 bg-slate-900/90 text-slate-100 shadow-md">
            <CardHeader className="p-3 pb-2 bg-purple-950/30 border-b border-purple-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-400" />
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-200">
                            {surface.title}
                        </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-300">
                        {d.preparedCount ?? 0} / {d.maxPreparedSpells ?? 0} Prepared
                    </Badge>
                </div>
                {surface.subtitle && <p className="text-[10px] text-slate-400 mt-1">{surface.subtitle}</p>}
            </CardHeader>
            <CardContent className="p-3 space-y-3 text-xs">
                {alwaysPrepared.length > 0 && (
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase text-purple-300">
                            Auto-Granted Always-Prepared Spells
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {alwaysPrepared.map((sp) => (
                                <span
                                    key={sp.id}
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-200 flex items-center gap-1"
                                >
                                    <CheckCircle2 className="w-3 h-3 text-purple-400" />
                                    {sp.name}
                                    <span className="text-[9px] text-purple-400">({sp.source})</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {recommended.length > 0 && (
                    <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase text-slate-400">
                            Recommended Class Spells to Prepare
                        </div>
                        {recommended.map((sp) => (
                            <div
                                key={sp.id}
                                className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800"
                            >
                                <div className="min-w-0">
                                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                        <span>{sp.name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">Lvl {sp.level}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                        {sp.school} • {sp.damageSummary}
                                    </div>
                                </div>
                                {onLearnAndPrepareSpell && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 text-[10px] px-2 border-purple-500/40 text-purple-300 hover:bg-purple-950"
                                        onClick={() => onLearnAndPrepareSpell(sp.id)}
                                    >
                                        + Prepare
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function QuestTacticalAdvisorCard({
    surface,
    onOpenRollComposer,
    onQuickSimulatedRoll,
    onLearnAndPrepareSpell,
    onAddQuestObjective,
    onAddQuestLog,
    onCreateExtractedQuest
}: {
    surface: A2UiSurfacePayload;
    onOpenRollComposer: (req: any) => void;
    onQuickSimulatedRoll: (req: any) => void;
    onLearnAndPrepareSpell?: (spellId: string) => void;
    onAddQuestObjective?: (questId: number, description: string) => void;
    onAddQuestLog?: (questId: number, content: string) => void;
    onCreateExtractedQuest?: (questData: any) => void;
}) {
    const d = surface.data || {};
    const questId: number = d.questId || 0;
    const recommendedSkills: any[] = d.recommendedSkills || [];
    const recommendedTools: any[] = d.recommendedTools || [];
    const suggestedObjectives: string[] = d.suggestedObjectives || [];
    const suggestedChronicleEntry: string | undefined = d.suggestedChronicleEntry;
    const extractedQuest: any = d.extractedQuest;
    const [addedObjs, setAddedObjs] = React.useState<Record<string, boolean>>({});
    const [loggedBrief, setLoggedBrief] = React.useState(false);
    const [createdQuestDone, setCreatedQuestDone] = React.useState(false);

    return (
        <Card className="border-amber-500/35 bg-slate-900/95 text-slate-100 shadow-lg overflow-hidden">
            <CardHeader className="p-3 pb-2 bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/60 border-b border-amber-500/25">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Compass className="w-4 h-4 text-amber-400 shrink-0" />
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-200 truncate">
                            {surface.title}
                        </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-300 bg-amber-950/50 shrink-0">
                        A2UI Quest Co-Pilot
                    </Badge>
                </div>
                {surface.subtitle && (
                    <p className="text-[10px] text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                        {surface.subtitle}
                    </p>
                )}
                {(d.rewardXp > 0 || d.rewardGp > 0 || d.rewardNotes) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {d.rewardXp > 0 && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                +{d.rewardXp} XP
                            </span>
                        )}
                        {d.rewardGp > 0 && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                +{d.rewardGp} GP
                            </span>
                        )}
                        {d.rewardNotes && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                🎁 {d.rewardNotes}
                            </span>
                        )}
                    </div>
                )}
            </CardHeader>

            <CardContent className="p-3 space-y-3 text-xs">
                {/* 1. Extracted Quest Blueprint (When Note-to-Quest Extractor is used) */}
                {extractedQuest && onCreateExtractedQuest && (
                    <div className="p-2.5 rounded-xl bg-amber-950/35 border border-amber-500/40 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase text-amber-300 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Extracted Quest Blueprint
                            </span>
                            <Badge className="bg-amber-500/20 text-amber-200 border-amber-400/40 text-[9px] uppercase">
                                {extractedQuest.category || "main"}
                            </Badge>
                        </div>
                        <div className="font-bold text-white text-xs">{extractedQuest.title}</div>
                        <div className="flex flex-wrap gap-2 text-[10px] text-slate-300">
                            {extractedQuest.giver && (
                                <span className="flex items-center gap-1">
                                    <UserCheck className="w-3 h-3 text-amber-400" />
                                    {extractedQuest.giver}
                                </span>
                            )}
                            {extractedQuest.location && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-indigo-400" />
                                    {extractedQuest.location}
                                </span>
                            )}
                            {extractedQuest.rewardXp > 0 && (
                                <span className="text-indigo-300 font-mono">+{extractedQuest.rewardXp} XP</span>
                            )}
                            {extractedQuest.rewardGp > 0 && (
                                <span className="text-amber-300 font-mono">+{extractedQuest.rewardGp} GP</span>
                            )}
                        </div>
                        <Button
                            size="sm"
                            disabled={createdQuestDone}
                            className="w-full h-7 text-[11px] bg-amber-600 hover:bg-amber-500 text-white font-bold"
                            onClick={() => {
                                onCreateExtractedQuest(extractedQuest);
                                setCreatedQuestDone(true);
                            }}
                        >
                            {createdQuestDone ? (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                    Created Quest in Quest Log!
                                </>
                            ) : (
                                <>
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    Create Quest with {(extractedQuest.objectives || []).length} Objectives
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {/* 2. Best Character Skill Checks for Quest Objectives */}
                {recommendedSkills.length > 0 && (
                    <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase text-amber-300 flex items-center justify-between">
                            <span>Recommended Objective Skill Checks</span>
                            <span className="text-[9px] text-slate-400 font-normal">1-Click Auto-Roll or Composer</span>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                            {recommendedSkills.map((sk) => (
                                <div
                                    key={sk.key}
                                    className="p-2 rounded-lg bg-slate-950/75 border border-slate-800 flex items-center justify-between gap-2"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold text-white">{sk.name}</span>
                                            <span className="text-[10px] font-mono font-bold text-amber-400">
                                                {sk.modifier >= 0 ? `+${sk.modifier}` : sk.modifier}
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                                                Passive {sk.passive}
                                            </span>
                                            {sk.isExpertise && (
                                                <Badge className="text-[8px] h-3.5 px-1 bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                                    EXP
                                                </Badge>
                                            )}
                                            {!sk.isExpertise && sk.isProficient && (
                                                <Badge className="text-[8px] h-3.5 px-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                                    PROF
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate">{sk.reason}</div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 text-[10px] px-2 border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200"
                                            onClick={() => sk.rollRequest && onOpenRollComposer(sk.rollRequest)}
                                            title={`Open ${sk.name} Check (DC ${sk.suggestedDc}) in Roll Composer`}
                                        >
                                            🎲 DC {sk.suggestedDc}
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-6 text-[10px] px-2 bg-amber-600 hover:bg-amber-500 text-white"
                                            onClick={() => sk.rollRequest && onQuickSimulatedRoll(sk.rollRequest)}
                                            title={`Instant Auto-Roll ${sk.name}`}
                                        >
                                            ⚡ Roll
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. Recommended Spells, Rituals & Class Features for the Quest */}
                {recommendedTools.length > 0 && (
                    <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase text-indigo-300">
                            Quest Utility Spells, Rituals &amp; Class Features
                        </div>
                        <div className="space-y-1">
                            {recommendedTools.slice(0, 4).map((tool, i) => (
                                <div
                                    key={tool.id || i}
                                    className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/90 flex items-center justify-between gap-2"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-slate-100">{tool.name}</span>
                                            <Badge variant="outline" className="text-[9px] h-4 px-1 border-indigo-500/30 text-indigo-300">
                                                {tool.type}
                                            </Badge>
                                        </div>
                                        <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{tool.summary}</div>
                                    </div>
                                    {tool.spellId && !tool.prepared && onLearnAndPrepareSpell && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 text-[10px] px-2 border-purple-500/40 text-purple-300 hover:bg-purple-950 shrink-0"
                                            onClick={() => onLearnAndPrepareSpell(tool.spellId)}
                                        >
                                            + Prepare
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. Suggested Sub-Objectives with 1-Click Append to Quest */}
                {suggestedObjectives.length > 0 && questId > 0 && onAddQuestObjective && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-800">
                        <div className="text-[10px] font-bold uppercase text-emerald-300 flex items-center justify-between">
                            <span>AI Suggested Sub-Objectives</span>
                            <span className="text-[9px] text-slate-400 font-normal">Click + to append to quest</span>
                        </div>
                        <div className="space-y-1">
                            {suggestedObjectives.map((objText, idx) => {
                                const isAdded = !!addedObjs[objText];
                                return (
                                    <div
                                        key={idx}
                                        className="p-2 rounded-lg bg-slate-950/75 border border-slate-800 flex items-center justify-between gap-2"
                                    >
                                        <span className="text-[11px] text-slate-200 leading-snug">{objText}</span>
                                        <Button
                                            size="sm"
                                            variant={isAdded ? "secondary" : "outline"}
                                            disabled={isAdded}
                                            className="h-6 text-[10px] px-2 shrink-0 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950"
                                            onClick={() => {
                                                onAddQuestObjective(questId, objText);
                                                setAddedObjs((prev) => ({ ...prev, [objText]: true }));
                                            }}
                                        >
                                            {isAdded ? "Added ✓" : "+ Objective"}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 5. 1-Click Save Tactical Brief to Quest Chronicle */}
                {suggestedChronicleEntry && questId > 0 && onAddQuestLog && (
                    <div className="pt-1 flex justify-end">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={loggedBrief}
                            className="h-6 text-[10px] px-2.5 border-indigo-500/40 text-indigo-300 hover:bg-indigo-950"
                            onClick={() => {
                                onAddQuestLog(questId, suggestedChronicleEntry);
                                setLoggedBrief(true);
                            }}
                        >
                            <ScrollText className="w-3 h-3 mr-1" />
                            {loggedBrief ? "Saved to Quest Chronicle ✓" : "Save Brief to Quest Chronicle"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
