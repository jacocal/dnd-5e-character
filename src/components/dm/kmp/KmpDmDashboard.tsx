"use client";

import React, { useState } from "react";
import { useKmpDmDashboard } from "./KmpDmDashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Loader2,
    Shield,
    Heart,
    Eye,
    Sparkles,
    Compass,
    Trophy,
    Coins,
    Sun,
    Moon,
    Flame,
    RefreshCw,
    Plus,
    Swords,
    History,
    Send
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BattleMapCanvas } from "@/components/map/BattleMapCanvas";

const ALIGNMENTS = [
    "Lawful Good",
    "Neutral Good",
    "Chaotic Good",
    "Lawful Neutral",
    "True Neutral",
    "Chaotic Neutral",
    "Lawful Evil",
    "Neutral Evil",
    "Chaotic Evil",
    "Unaligned"
];

export function KmpDmDashboard() {
    const { viewModel, state, isLoading, error, refresh } = useKmpDmDashboard();

    // Party Action drawers/panels
    const [activeDmTool, setActiveDmTool] = useState<"none" | "quest" | "rewards" | "map">("map");
    const [targetPlayerFilter, setTargetPlayerFilter] = useState<string>("all");

    // Quest Broadcaster State
    const [qTitle, setQTitle] = useState("");
    const [qCategory, setQCategory] = useState("main");
    const [qGiver, setQGiver] = useState("");
    const [qLocation, setQLocation] = useState("");
    const [qXp, setQXp] = useState("350");
    const [qGp, setQGp] = useState("100");
    const [qNotes, setQNotes] = useState("");
    const [qDesc, setQDesc] = useState("");
    const [qObjectives, setQObjectives] = useState("");
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    // Rewards State
    const [awardXp, setAwardXp] = useState("250");
    const [awardGp, setAwardGp] = useState("50");
    const [awardItemId, setAwardItemId] = useState("none");

    // Per-Player Quick HP Delta
    const [hpDeltaByPlayer, setHpDeltaByPlayer] = useState<Record<number, string>>({});

    if (isLoading && (!state || state.players.length === 0)) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    if (error && (!state || state.players.length === 0)) {
        return (
            <div className="p-8 text-center text-red-500">
                <p>Error loading dashboard: {error}</p>
                <button onClick={refresh} className="mt-4 underline">
                    Retry
                </button>
            </div>
        );
    }

    const players: any[] = state?.players || [];
    const catalogItems: any[] = state?.catalogItems || [];
    const allPlayerIds = players.map((p) => p.id);

    const getTargetIds = (): number[] => {
        if (targetPlayerFilter === "all") return allPlayerIds;
        const parsed = parseInt(targetPlayerFilter, 10);
        return isNaN(parsed) ? allPlayerIds : [parsed];
    };

    const handleBroadcastQuest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!qTitle.trim() || players.length === 0) return;
        setIsBroadcasting(true);
        try {
            const objs = qObjectives
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean);
            await viewModel?.broadcastQuest(getTargetIds(), {
                title: qTitle.trim(),
                category: qCategory,
                giver: qGiver.trim() || undefined,
                location: qLocation.trim() || undefined,
                rewardXp: parseInt(qXp, 10) || 0,
                rewardGp: parseInt(qGp, 10) || 0,
                rewardNotes: qNotes.trim() || undefined,
                description: qDesc.trim() || undefined,
                objectives: objs
            });
            setQTitle("");
            setQDesc("");
            setQObjectives("");
            setActiveDmTool("none");
        } finally {
            setIsBroadcasting(false);
        }
    };

    const handleAwardRewards = async (e: React.FormEvent) => {
        e.preventDefault();
        if (players.length === 0) return;
        setIsBroadcasting(true);
        try {
            await viewModel?.awardPartyRewards(
                getTargetIds(),
                parseInt(awardXp, 10) || 0,
                parseInt(awardGp, 10) || 0,
                awardItemId !== "none" ? awardItemId : undefined
            );
            setActiveDmTool("none");
        } finally {
            setIsBroadcasting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Top DM Command Bar */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>Active Party Roster ({players.length})</span>
                        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
                            Live KMP Telemetry &amp; Dispatcher
                        </Badge>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Dispatch quests, award XP/Gold/Loot, trigger party rests, or inspect live player rolls.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        size="sm"
                        variant={activeDmTool === "map" ? "default" : "outline"}
                        className={cn(
                            "h-8 text-xs gap-1.5",
                            activeDmTool === "map"
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                : "border-emerald-500/40 text-emerald-300 bg-zinc-900 hover:bg-zinc-800"
                        )}
                        onClick={() => setActiveDmTool(activeDmTool === "map" ? "none" : "map")}
                    >
                        <Compass className="w-3.5 h-3.5" />
                        {activeDmTool === "map" ? "Hide Battle Map" : "Live Battle Map"}
                    </Button>

                    <Button
                        size="sm"
                        variant={activeDmTool === "quest" ? "default" : "outline"}
                        className={cn(
                            "h-8 text-xs gap-1.5",
                            activeDmTool === "quest"
                                ? "bg-amber-600 hover:bg-amber-500 text-white"
                                : "border-amber-500/40 text-amber-300 bg-zinc-900 hover:bg-zinc-800"
                        )}
                        onClick={() => setActiveDmTool(activeDmTool === "quest" ? "none" : "quest")}
                    >
                        <Compass className="w-3.5 h-3.5" />
                        Assign Quest / Bounty
                    </Button>

                    <Button
                        size="sm"
                        variant={activeDmTool === "rewards" ? "default" : "outline"}
                        className={cn(
                            "h-8 text-xs gap-1.5",
                            activeDmTool === "rewards"
                                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                                : "border-indigo-500/40 text-indigo-300 bg-zinc-900 hover:bg-zinc-800"
                        )}
                        onClick={() => setActiveDmTool(activeDmTool === "rewards" ? "none" : "rewards")}
                    >
                        <Trophy className="w-3.5 h-3.5" />
                        Award XP, Gold &amp; Loot
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                        onClick={() => viewModel?.broadcastPartyCommand(allPlayerIds, { type: "SHORT_REST" })}
                    >
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        Party Short Rest
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                        onClick={() => viewModel?.broadcastPartyCommand(allPlayerIds, { type: "LONG_REST" })}
                    >
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        Party Long Rest
                    </Button>

                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-zinc-400 hover:text-amber-400"
                        onClick={refresh}
                    >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Embedded Real-Time DM Battle Map Architect Canvas */}
            {activeDmTool === "map" && (
                <BattleMapCanvas role="dm" />
            )}

            {/* Expandable DM Quest Broadcaster Panel */}
            {activeDmTool === "quest" && (
                <form
                    onSubmit={handleBroadcastQuest}
                    className="p-4 rounded-xl bg-zinc-950 border border-amber-500/40 space-y-4 text-zinc-100"
                >
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-800 pb-2.5">
                        <div className="flex items-center gap-2">
                            <Compass className="w-4 h-4 text-amber-400" />
                            <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider">
                                Dispatch Campaign Quest or Bounty to Players
                            </h3>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-400">Recipient:</span>
                            <Select value={targetPlayerFilter} onValueChange={setTargetPlayerFilter}>
                                <SelectTrigger className="h-7 w-48 bg-zinc-900 border-zinc-700 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                    <SelectItem value="all">Entire Party ({players.length} Players)</SelectItem>
                                    {players.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name} ({p.classSummary})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                            value={qTitle}
                            onChange={(e) => setQTitle(e.target.value)}
                            placeholder="Quest Title (e.g. Siege of the Shadow Spire)"
                            className="md:col-span-2 h-8 text-xs bg-zinc-900 border-zinc-800"
                        />
                        <Select value={qCategory} onValueChange={setQCategory}>
                            <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                <SelectItem value="main">Main Quest</SelectItem>
                                <SelectItem value="side">Side Quest</SelectItem>
                                <SelectItem value="faction">Faction / Guild</SelectItem>
                                <SelectItem value="personal">Personal Arc</SelectItem>
                                <SelectItem value="bounty">Bounty / Contract</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <Input
                            value={qGiver}
                            onChange={(e) => setQGiver(e.target.value)}
                            placeholder="Quest Giver / NPC"
                            className="h-8 text-xs bg-zinc-900 border-zinc-800"
                        />
                        <Input
                            value={qLocation}
                            onChange={(e) => setQLocation(e.target.value)}
                            placeholder="Location / Dungeon"
                            className="h-8 text-xs bg-zinc-900 border-zinc-800"
                        />
                        <Input
                            type="number"
                            value={qXp}
                            onChange={(e) => setQXp(e.target.value)}
                            placeholder="Reward XP"
                            className="h-8 text-xs bg-zinc-900 border-zinc-800 font-mono"
                        />
                        <Input
                            type="number"
                            value={qGp}
                            onChange={(e) => setQGp(e.target.value)}
                            placeholder="Reward GP"
                            className="h-8 text-xs bg-zinc-900 border-zinc-800 font-mono"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Textarea
                            value={qDesc}
                            onChange={(e) => setQDesc(e.target.value)}
                            placeholder="Quest briefing & lore description..."
                            rows={3}
                            className="text-xs bg-zinc-900 border-zinc-800"
                        />
                        <Textarea
                            value={qObjectives}
                            onChange={(e) => setQObjectives(e.target.value)}
                            placeholder={`Objectives (one per line, optional [Skill DC X]):\nInfiltrate the lower gatehouse [Stealth DC 14]\nDecipher the cult ledger [Investigation DC 15]`}
                            rows={3}
                            className="text-xs font-mono bg-zinc-900 border-zinc-800"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <Input
                            value={qNotes}
                            onChange={(e) => setQNotes(e.target.value)}
                            placeholder="Optional Special Item Reward (e.g. Ring of Protection)"
                            className="h-8 text-xs max-w-sm bg-zinc-900 border-zinc-800"
                        />
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveDmTool("none")}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isBroadcasting || !qTitle.trim()}
                                className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5"
                            >
                                <Send className="w-3.5 h-3.5" />
                                Dispatch Quest
                            </Button>
                        </div>
                    </div>
                </form>
            )}

            {/* Expandable DM XP, Gold & Loot Awarder Panel */}
            {activeDmTool === "rewards" && (
                <form
                    onSubmit={handleAwardRewards}
                    className="p-4 rounded-xl bg-zinc-950 border border-indigo-500/40 space-y-4 text-zinc-100"
                >
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-800 pb-2.5">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-indigo-400" />
                            <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-wider">
                                Award Experience, Gold &amp; Catalog Loot
                            </h3>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-400">Recipient:</span>
                            <Select value={targetPlayerFilter} onValueChange={setTargetPlayerFilter}>
                                <SelectTrigger className="h-7 w-48 bg-zinc-900 border-zinc-700 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                    <SelectItem value="all">Entire Party ({players.length} Players)</SelectItem>
                                    {players.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name} ({p.classSummary})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-zinc-400">
                                Experience (+XP Each)
                            </label>
                            <Input
                                type="number"
                                min={0}
                                value={awardXp}
                                onChange={(e) => setAwardXp(e.target.value)}
                                className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-zinc-400">
                                Gold (+GP Each)
                            </label>
                            <Input
                                type="number"
                                min={0}
                                value={awardGp}
                                onChange={(e) => setAwardGp(e.target.value)}
                                className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-zinc-400">
                                Grant Item from Catalog (Optional)
                            </label>
                            <Select value={awardItemId} onValueChange={setAwardItemId}>
                                <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800">
                                    <SelectValue placeholder="No Item" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-h-64">
                                    <SelectItem value="none">No Item</SelectItem>
                                    {catalogItems.slice(0, 80).map((it: any) => (
                                        <SelectItem key={it.id} value={it.id}>
                                            {it.name} ({it.category})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveDmTool("none")}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isBroadcasting}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
                        >
                            <Trophy className="w-3.5 h-3.5" />
                            Grant Rewards
                        </Button>
                    </div>
                </form>
            )}

            {/* Player Telemetry Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.map((player: any) => {
                    const activeQuests = (player.quests || []).filter((q: any) => q.status === "active");
                    const hpAmount = parseInt(hpDeltaByPlayer[player.id] || "5", 10) || 5;

                    return (
                        <Card key={player.id} className="bg-zinc-950 border-zinc-800 text-zinc-100 flex flex-col">
                            <CardHeader className="pb-2.5">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Link
                                                href={`/character/${player.id}`}
                                                className="hover:text-amber-400 transition-colors"
                                            >
                                                {player.name}
                                            </Link>
                                            {player.inspiration && (
                                                <Badge className="bg-amber-500 text-zinc-950 text-[9px] h-4 px-1.5 font-black">
                                                    ★ INSP
                                                </Badge>
                                            )}
                                        </CardTitle>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            {player.raceName} • {player.classSummary || `Level ${player.level}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-300 font-mono">
                                            {player.xp} XP • {player.gp} GP
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
                                <div className="space-y-3">
                                    {/* Live Combat Telemetry */}
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                                            <div className="text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                                                <Heart className="w-3 h-3 text-red-400" /> HP
                                            </div>
                                            <div className="font-bold font-mono text-sm text-white">
                                                {player.hpCurrent}/{player.hpMax}
                                                {player.tempHp > 0 ? ` (+${player.tempHp})` : ""}
                                            </div>
                                        </div>
                                        <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                                            <div className="text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                                                <Shield className="w-3 h-3 text-blue-400" /> AC
                                            </div>
                                            <div className="font-bold font-mono text-sm text-white">
                                                {player.armorClass}
                                            </div>
                                        </div>
                                        <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                                            <div className="text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                                                <Eye className="w-3 h-3 text-emerald-400" /> Pass.
                                            </div>
                                            <div className="font-bold font-mono text-sm text-white">
                                                {player.passivePerception}
                                            </div>
                                        </div>
                                    </div>

                                    {/* DM Quick Damage / Heal / Inspiration Controls */}
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            type="number"
                                            min={1}
                                            value={hpDeltaByPlayer[player.id] ?? "5"}
                                            onChange={(e) =>
                                                setHpDeltaByPlayer((prev) => ({
                                                    ...prev,
                                                    [player.id]: e.target.value
                                                }))
                                            }
                                            className="h-7 w-14 text-xs font-mono text-center bg-zinc-900 border-zinc-800"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-[10px] px-2 border-red-500/40 text-red-300 bg-zinc-900 hover:bg-red-950/50"
                                            onClick={() =>
                                                viewModel?.dispatchCharacterCommand(player.id, {
                                                    type: "TAKE_DAMAGE",
                                                    amount: hpAmount,
                                                    damageType: "physical"
                                                })
                                            }
                                        >
                                            -{hpAmount} HP
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-[10px] px-2 border-emerald-500/40 text-emerald-300 bg-zinc-900 hover:bg-emerald-950/50"
                                            onClick={() =>
                                                viewModel?.dispatchCharacterCommand(player.id, {
                                                    type: "HEAL",
                                                    amount: hpAmount
                                                })
                                            }
                                        >
                                            +{hpAmount} HP
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-[10px] px-2 ml-auto border-amber-500/40 text-amber-300 bg-zinc-900 hover:bg-amber-950/50"
                                            onClick={() =>
                                                viewModel?.dispatchCharacterCommand(player.id, {
                                                    type: "TOGGLE_INSPIRATION"
                                                })
                                            }
                                        >
                                            <Flame className="w-3 h-3 mr-1" />
                                            Insp
                                        </Button>
                                    </div>

                                    {player.concentrationSpellName && (
                                        <div className="text-xs px-2.5 py-1.5 rounded bg-purple-950/50 border border-purple-700/40 text-purple-200 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                            <span className="truncate">
                                                Concentrating: <strong>{player.concentrationSpellName}</strong>
                                            </span>
                                        </div>
                                    )}

                                    {/* Active Quests Summary */}
                                    {activeQuests.length > 0 && (
                                        <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-1">
                                            <div className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1">
                                                <Compass className="w-3 h-3" />
                                                Active Quests ({activeQuests.length})
                                            </div>
                                            {activeQuests.slice(0, 2).map((q: any) => {
                                                const objs = q.objectives || [];
                                                const done = objs.filter((o: any) => o.isCompleted).length;
                                                return (
                                                    <div
                                                        key={q.id}
                                                        className="flex items-center justify-between text-[11px] text-zinc-200"
                                                    >
                                                        <span className="truncate">{q.title}</span>
                                                        <span className="font-mono text-[10px] text-zinc-400 shrink-0 ml-2">
                                                            {done}/{objs.length}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Recent Rolls & Events */}
                                    {player.recentEvents && player.recentEvents.length > 0 && (
                                        <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800/80 space-y-1">
                                            <div className="text-[10px] font-bold uppercase text-indigo-400 flex items-center gap-1">
                                                <History className="w-3 h-3" />
                                                Latest Action Log
                                            </div>
                                            {player.recentEvents.slice(0, 2).map((evt: any, idx: number) => (
                                                <div key={evt.id || idx} className="text-[11px] text-zinc-300 truncate">
                                                    <strong>{evt.title}:</strong> {evt.summary}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1 pt-2 border-t border-zinc-800/80">
                                    <label className="text-[10px] font-bold uppercase text-zinc-400">Alignment</label>
                                    <Select
                                        value={player.alignment || "Unaligned"}
                                        onValueChange={(value) => viewModel?.updateAlignment(player.id, value)}
                                    >
                                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 h-8 text-xs">
                                            <SelectValue placeholder="Select Alignment" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                            {ALIGNMENTS.map((align) => (
                                                <SelectItem key={align} value={align}>
                                                    {align}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {players.length === 0 && !isLoading && (
                <div className="text-center p-8 text-zinc-400 bg-zinc-900/50 rounded-lg border-dashed border border-zinc-800">
                    No active players found.
                </div>
            )}
        </div>
    );
}
