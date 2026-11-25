"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Settings2, RefreshCw, CheckCircle2, AlertCircle, Server, Cloud } from "lucide-react";

export interface LlmConnectionConfig {
    provider: "ollama" | "openai-compatible" | "gemini" | "openai" | "anthropic" | "openrouter";
    baseUrl: string;
    model: string;
    apiKey?: string;
}

export const DEFAULT_LLM_CONFIG: LlmConnectionConfig = {
    provider: "ollama",
    baseUrl: "http://localhost:11434",
    model: "qwen3.5:0.8b",
    apiKey: "",
};

const STORAGE_KEY = "dnd_copilot_llm_config_v2";

export function loadSavedLlmConfig(): LlmConnectionConfig {
    if (typeof window === "undefined") return DEFAULT_LLM_CONFIG;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_LLM_CONFIG;
        return { ...DEFAULT_LLM_CONFIG, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_LLM_CONFIG;
    }
}

export function saveLlmConfig(cfg: LlmConnectionConfig) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function LlmSettingsModal({
    config,
    onChange,
}: {
    config: LlmConnectionConfig;
    onChange: (cfg: LlmConnectionConfig) => void;
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<LlmConnectionConfig>(config);
    const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
    const [discovering, setDiscovering] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        setDraft(config);
    }, [config]);

    const handleProviderChange = (provider: LlmConnectionConfig["provider"]) => {
        const defaultUrls: Record<string, string> = {
            ollama: "http://localhost:11434",
            "openai-compatible": "http://localhost:1234/v1",
            gemini: "https://generativelanguage.googleapis.com",
            openai: "https://api.openai.com/v1",
            anthropic: "https://api.anthropic.com/v1",
            openrouter: "https://openrouter.ai/api/v1",
        };
        const defaultModels: Record<string, string> = {
            ollama: "qwen3.5:0.8b",
            "openai-compatible": "local-model",
            gemini: "gemini-2.5-flash",
            openai: "gpt-4o-mini",
            anthropic: "claude-3-7-sonnet-latest",
            openrouter: "anthropic/claude-3.7-sonnet",
        };
        setDraft((prev) => ({
            ...prev,
            provider,
            baseUrl: defaultUrls[provider] || prev.baseUrl,
            model: defaultModels[provider] || prev.model,
        }));
        setStatusMsg(null);
    };

    const handleDiscover = async () => {
        setDiscovering(true);
        setStatusMsg(null);
        try {
            const params = new URLSearchParams({
                provider: draft.provider,
                baseUrl: draft.baseUrl,
            });
            const resp = await fetch(`/api/ag-ui/models?${params.toString()}`, {
                headers: draft.apiKey ? { "X-LLM-Api-Key": draft.apiKey } : {},
            });
            const data = await resp.json();
            if (data.reachable && Array.isArray(data.models)) {
                setDiscoveredModels(data.models);
                if (data.models.length > 0 && !data.models.includes(draft.model)) {
                    setDraft((prev) => ({ ...prev, model: data.models[0] }));
                }
                setStatusMsg({
                    ok: true,
                    text: `Connected! Found ${data.models.length} model(s).`,
                });
            } else {
                setStatusMsg({
                    ok: false,
                    text: data.error || "Could not reach LLM server. Deterministic KMP Co-Pilot fallback remains active.",
                });
            }
        } catch (e: any) {
            setStatusMsg({
                ok: false,
                text: e.message || "Discovery failed.",
            });
        } finally {
            setDiscovering(false);
        }
    };

    const handleSave = () => {
        saveLlmConfig(draft);
        onChange(draft);
        setOpen(false);
    };

    const isLocalLan = draft.provider === "ollama" || draft.provider === "openai-compatible";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
                    title="Configure Local Network LLM or BYOK Cloud Key"
                >
                    <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="truncate max-w-[110px]">{config.provider}: {config.model}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 text-slate-100">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Settings2 className="w-4 h-4 text-indigo-400" />
                        Koog Co-Pilot LLM Connection
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                    <div className="space-y-1.5">
                        <Label className="text-slate-300">Provider (Local LAN or BYOK Cloud)</Label>
                        <Select
                            value={draft.provider}
                            onValueChange={(v) => handleProviderChange(v as LlmConnectionConfig["provider"])}
                        >
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                <SelectItem value="ollama">Local Network — Ollama (LAN / Localhost)</SelectItem>
                                <SelectItem value="openai-compatible">Local Network — LM Studio / vLLM / llama.cpp</SelectItem>
                                <SelectItem value="gemini">Cloud BYOK — Google Gemini</SelectItem>
                                <SelectItem value="openai">Cloud BYOK — OpenAI</SelectItem>
                                <SelectItem value="anthropic">Cloud BYOK — Anthropic Claude</SelectItem>
                                <SelectItem value="openrouter">Cloud BYOK — OpenRouter</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {isLocalLan ? (
                        <div className="space-y-1.5">
                            <Label className="text-slate-300 flex items-center gap-1.5">
                                <Server className="w-3.5 h-3.5 text-emerald-400" />
                                Local Network Base URL
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    value={draft.baseUrl}
                                    onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
                                    placeholder="http://192.168.1.50:11434"
                                    className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleDiscover}
                                    disabled={discovering}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 mr-1 ${discovering ? "animate-spin" : ""}`} />
                                    Discover
                                </Button>
                            </div>
                            <p className="text-[10px] text-slate-400">
                                Point to any machine on your LAN running Ollama (:11434) or LM Studio (:1234/v1).
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <Label className="text-slate-300 flex items-center gap-1.5">
                                <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                                Bring Your Own API Key (Stored in Browser LocalStorage)
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    type="password"
                                    value={draft.apiKey || ""}
                                    onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                                    placeholder="sk-... or AIza..."
                                    className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleDiscover}
                                    disabled={discovering}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0"
                                >
                                    Load Models
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-slate-300">Model Name</Label>
                        {discoveredModels.length > 0 ? (
                            <Select
                                value={draft.model}
                                onValueChange={(v) => setDraft({ ...draft, model: v })}
                            >
                                <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                    {discoveredModels.map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {m}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                value={draft.model}
                                onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                                placeholder="llama3.1:8b or gemini-2.5-flash"
                                className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                            />
                        )}
                    </div>

                    {statusMsg && (
                        <div
                            className={`p-2.5 rounded-md border flex items-center gap-2 text-xs ${
                                statusMsg.ok
                                    ? "bg-emerald-950/50 border-emerald-700/50 text-emerald-300"
                                    : "bg-amber-950/50 border-amber-700/50 text-amber-300"
                            }`}
                        >
                            {statusMsg.ok ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 shrink-0" />
                            )}
                            <span>{statusMsg.text}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setOpen(false)}
                            className="text-slate-400"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSave}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white"
                        >
                            Save Connection
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
