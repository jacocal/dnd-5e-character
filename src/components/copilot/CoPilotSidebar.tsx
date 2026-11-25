"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Bot,
    Send,
    Sparkles,
    Swords,
    Shield,
    BookOpen,
    Loader2,
    Wrench,
    Compass
} from "lucide-react";
import { A2UiRenderer, A2UiSurfacePayload } from "@/components/a2ui/A2UiRenderer";
import {
    LlmSettingsModal,
    LlmConnectionConfig,
    DEFAULT_LLM_CONFIG,
    loadSavedLlmConfig
} from "./LlmSettingsModal";

interface ChatTurn {
    id: string;
    role: "user" | "assistant";
    content: string;
    toolCalls?: string[];
    surfaces?: A2UiSurfacePayload[];
}

interface CoPilotSidebarProps {
    characterId: number;
    characterName: string;
    onOpenRollComposer: (rollRequest: any) => void;
    onQuickSimulatedRoll: (rollRequest: any) => void;
    onLearnAndPrepareSpell?: (spellId: string) => void;
    onAddQuestObjective?: (questId: number, description: string) => void;
    onAddQuestLog?: (questId: number, content: string) => void;
    onCreateExtractedQuest?: (questData: any) => void;
}

export function CoPilotSidebar({
    characterId,
    characterName,
    onOpenRollComposer,
    onQuickSimulatedRoll,
    onLearnAndPrepareSpell,
    onAddQuestObjective,
    onAddQuestLog,
    onCreateExtractedQuest
}: CoPilotSidebarProps) {
    const [open, setOpen] = useState(false);
    const [llmConfig, setLlmConfig] = useState<LlmConnectionConfig>(DEFAULT_LLM_CONFIG);
    const [targetAc, setTargetAc] = useState<number>(15);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [turns, setTurns] = useState<ChatTurn[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLlmConfig(loadSavedLlmConfig());
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [turns, isStreaming]);

    // Auto-run initial tactical analysis the first time the user opens the Co-Pilot
    useEffect(() => {
        if (open && turns.length === 0 && !isStreaming) {
            sendQuery("What is my best tactical action on this turn?", "tactical_advisor");
        }
    }, [open]);

    const sendQuery = async (promptText: string, requestedHelper?: string) => {
        if (!promptText.trim() || isStreaming) return;

        const userTurn: ChatTurn = {
            id: `user-${Date.now()}`,
            role: "user",
            content: promptText.trim()
        };
        const assistantTurnId = `assistant-${Date.now() + 1}`;
        const initialAssistantTurn: ChatTurn = {
            id: assistantTurnId,
            role: "assistant",
            content: "",
            toolCalls: [],
            surfaces: []
        };

        const updatedHistory = [...turns, userTurn];
        setTurns([...updatedHistory, initialAssistantTurn]);
        setInput("");
        setIsStreaming(true);

        try {
            const response = await fetch("/api/ag-ui/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(llmConfig.apiKey ? { "X-LLM-Api-Key": llmConfig.apiKey } : {})
                },
                body: JSON.stringify({
                    characterId,
                    targetAc,
                    requestedHelper,
                    llmConfig,
                    messages: updatedHistory.map((t) => ({
                        role: t.role,
                        content: t.content
                    }))
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

                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const block of lines) {
                    const dataLine = block
                        .split("\n")
                        .find((l) => l.startsWith("data: "));
                    if (!dataLine) continue;

                    try {
                        const evt = JSON.parse(dataLine.slice(6));
                        setTurns((prev) =>
                            prev.map((turn) => {
                                if (turn.id !== assistantTurnId) return turn;
                                if (evt.type === "TOOL_CALL_START") {
                                    const nextTools = [...(turn.toolCalls || []), evt.toolCallName];
                                    return { ...turn, toolCalls: nextTools };
                                }
                                if (evt.type === "CUSTOM" && evt.name === "a2ui_surface" && evt.value) {
                                    const nextSurfaces = [...(turn.surfaces || []), evt.value as A2UiSurfacePayload];
                                    return { ...turn, surfaces: nextSurfaces };
                                }
                                if (evt.type === "TEXT_MESSAGE_CONTENT" && evt.delta) {
                                    return { ...turn, content: turn.content + evt.delta };
                                }
                                if (evt.type === "RUN_ERROR") {
                                    return { ...turn, content: `Error: ${evt.message}` };
                                }
                                return turn;
                            })
                        );
                    } catch {
                        // Ignore malformed chunk
                    }
                }
            }
        } catch (err: any) {
            setTurns((prev) =>
                prev.map((turn) =>
                    turn.id === assistantTurnId
                        ? { ...turn, content: `Co-Pilot connection error: ${err.message}` }
                        : turn
                )
            );
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    size="sm"
                    className="h-8 px-2.5 sm:px-3 gap-1.5 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-sm"
                >
                    <Bot className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Tactical Co-Pilot</span>
                    <span className="sm:hidden">Co-Pilot</span>
                </Button>
            </SheetTrigger>

            <SheetContent
                side="right"
                className="w-full sm:max-w-lg bg-slate-950 border-slate-800 text-slate-100 flex flex-col p-0"
            >
                <SheetHeader className="p-4 pb-3 border-b border-slate-800 bg-slate-900/60">
                    <div className="flex items-center justify-between gap-2 pr-6">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div>
                                <SheetTitle className="text-sm font-bold text-white flex items-center gap-2">
                                    Koog Tactical Co-Pilot
                                    <Badge variant="outline" className="text-[9px] border-indigo-500/40 text-indigo-300">
                                        AG-UI + A2UI
                                    </Badge>
                                </SheetTitle>
                                <p className="text-[11px] text-slate-400">
                                    Rules & Turn Advisor for {characterName} (Player Assistant • No AI DM)
                                </p>
                            </div>
                        </div>

                        <LlmSettingsModal config={llmConfig} onChange={setLlmConfig} />
                    </div>

                    {/* Quick Helper Triggers & Target AC */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2 border-indigo-500/30 bg-indigo-950/40 text-indigo-200 hover:bg-indigo-900/50"
                            onClick={() => sendQuery(`What is my highest-damage turn action against AC ${targetAc}?`, "tactical_advisor")}
                            disabled={isStreaming}
                        >
                            <Swords className="w-3 h-3 mr-1" />
                            Best Turn Action
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2 border-emerald-500/30 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/50"
                            onClick={() => sendQuery("Break down my Armor Class, Initiative, and Save DC.", "stat_breakdown")}
                            disabled={isStreaming}
                        >
                            <Shield className="w-3 h-3 mr-1" />
                            Stat Breakdown
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2 border-purple-500/30 bg-purple-950/40 text-purple-200 hover:bg-purple-900/50"
                            onClick={() => sendQuery("Which spells should I prepare and which are always prepared?", "spell_prep")}
                            disabled={isStreaming}
                        >
                            <BookOpen className="w-3 h-3 mr-1" />
                            Spell Advisor
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2 border-amber-500/30 bg-amber-950/40 text-amber-200 hover:bg-amber-900/50"
                            onClick={() => sendQuery("Analyze my active quests and recommend the best skill checks, spells, and next objectives.", "quest_advisor")}
                            disabled={isStreaming}
                        >
                            <Compass className="w-3 h-3 mr-1" />
                            Quest Advisor
                        </Button>

                        <div className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
                            <span>Target AC:</span>
                            <input
                                type="number"
                                min={5}
                                max={30}
                                value={targetAc}
                                onChange={(e) => setTargetAc(Math.max(5, Math.min(30, parseInt(e.target.value) || 15)))}
                                className="w-11 h-6 px-1 text-center rounded bg-slate-900 border border-slate-700 text-white font-mono font-bold"
                            />
                        </div>
                    </div>
                </SheetHeader>

                {/* Conversation & A2UI Helper Stream */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {turns.map((turn) => (
                        <div key={turn.id} className="space-y-2.5">
                            {turn.role === "user" ? (
                                <div className="flex justify-end">
                                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2 bg-indigo-600 text-white text-xs">
                                        {turn.content}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {/* AG-UI Tool Call Pills */}
                                    {turn.toolCalls && turn.toolCalls.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {turn.toolCalls.map((tc, i) => (
                                                <span
                                                    key={i}
                                                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono"
                                                >
                                                    <Wrench className="w-2.5 h-2.5 text-indigo-400" />
                                                    {tc}()
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Streamed Assistant Text */}
                                    {turn.content && (
                                        <div className="rounded-2xl rounded-tl-sm p-3 bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                                            {turn.content}
                                        </div>
                                    )}

                                    {/* A2UI Declarative Helper Surfaces */}
                                    {turn.surfaces && turn.surfaces.length > 0 && (
                                        <div className="space-y-2.5">
                                            {turn.surfaces.map((surface) => (
                                                <A2UiRenderer
                                                    key={surface.surfaceId}
                                                    surface={surface}
                                                    onOpenRollComposer={(req) => {
                                                        setOpen(false);
                                                        onOpenRollComposer(req);
                                                    }}
                                                    onQuickSimulatedRoll={(req) => {
                                                        onQuickSimulatedRoll(req);
                                                    }}
                                                    onLearnAndPrepareSpell={onLearnAndPrepareSpell}
                                                    onAddQuestObjective={onAddQuestObjective}
                                                    onAddQuestLog={onAddQuestLog}
                                                    onCreateExtractedQuest={onCreateExtractedQuest}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {isStreaming && (
                        <div className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Koog Co-Pilot is analyzing sheet & simulating dice outcomes...</span>
                        </div>
                    )}
                </div>

                {/* Input Bar */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        sendQuery(input);
                    }}
                    className="p-3 border-t border-slate-800 bg-slate-900/70 flex items-center gap-2"
                >
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your best attack, rider stacking, or 5e (2024) rules..."
                        className="bg-slate-950 border-slate-800 text-xs text-slate-100"
                        disabled={isStreaming}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isStreaming}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 h-9 w-9"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}
