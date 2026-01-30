"use client";

import React from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, X } from "lucide-react";

interface ActiveModifier {
    sourceId: string;
    sourceName: string;
    modifier: {
        type: string;
        target: string;
        value?: number;
        condition?: string;
        duration?: string;
    };
    expiresOn: string;
    activatedAt?: string;
}

interface KmpActiveEffectsPanelProps {
    className?: string;
}

export function KmpActiveEffectsPanel({ className }: KmpActiveEffectsPanelProps) {
    const { state, viewModel } = useKmpCharacter();
    const character = state?.character;
    const activeModifiers = (state?.activeModifiers || character?.activeModifiers || []) as ActiveModifier[];

    if (!character || activeModifiers.length === 0) {
        return null; // Don't show panel if no active effects
    }

    // Group by source for cleaner display
    const groupedBySource = activeModifiers.reduce((acc, mod) => {
        if (!acc[mod.sourceId]) {
            acc[mod.sourceId] = {
                sourceName: mod.sourceName,
                sourceId: mod.sourceId,
                expiresOn: mod.expiresOn,
                modifiers: []
            };
        }
        acc[mod.sourceId].modifiers.push(mod.modifier);
        return acc;
    }, {} as Record<string, { sourceName: string; sourceId: string; expiresOn: string; modifiers: any[] }>);

    const sources = Object.values(groupedBySource);

    const handleDeactivate = (sourceId: string) => {
        viewModel?.deactivateResourceEffect(sourceId);
    };

    const getExpirationLabel = (expiresOn: string) => {
        switch (expiresOn) {
            case "short_rest": return "Until Short Rest";
            case "long_rest": return "Until Long Rest";
            case "manual_disable": return "Manual";
            case "never": return "Permanent";
            default: return expiresOn;
        }
    };

    const canDeactivate = (expiresOn: string) => {
        // All effects can be ended early (e.g., Wild Shape can be dismissed as bonus action)
        return true;
    };

    return (
        <div className={cn(
            "p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm",
            className
        )}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-amber-500" />
                <span className="text-sm font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider">
                    Active Effects
                </span>
                <span className="ml-auto text-xs text-amber-600 dark:text-amber-400 font-mono">
                    {sources.length}
                </span>
            </div>

            {/* Effects List */}
            <div className="space-y-2">
                {sources.map((source) => (
                    <div
                        key={source.sourceId}
                        className="flex items-center justify-between p-2 bg-white/60 dark:bg-slate-800/50 rounded-lg border border-amber-100 dark:border-amber-900/50"
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                                    {source.sourceName}
                                </span>
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                                    {getExpirationLabel(source.expiresOn)}
                                </span>
                            </div>
                            <div className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5 truncate">
                                {source.modifiers.map((m, i) => (
                                    <span key={i}>
                                        {i > 0 && ", "}
                                        {m.type} {m.target}
                                        {m.value !== undefined && m.value !== 0 && ` (${m.value > 0 ? '+' : ''}${m.value})`}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {canDeactivate(source.expiresOn) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-amber-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                                onClick={() => handleDeactivate(source.sourceId)}
                                title="Deactivate Effect"
                            >
                                <X size={14} />
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
