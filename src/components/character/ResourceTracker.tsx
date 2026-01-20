"use client";

import { useCharacterStore } from "@/store/character-store";
import { Button } from "@/components/ui/button";
import { Zap, RotateCcw, Moon, Sun } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ResourceTracker() {
    const { resources, useResource, restoreResource } = useCharacterStore();

    if (!resources || resources.length === 0) {
        return null;
    }

    return (
        <TooltipProvider delayDuration={200} skipDelayDuration={100}>
            <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <Zap size={14} />
                    Class Resources
                </h3>

                <div className="space-y-2">
                    {resources.map((resource) => {
                        const remaining = resource.maxUses - resource.usedUses;
                        const isShortRest = resource.rechargeOn === 'short';

                        return (
                            <div
                                key={resource.id}
                                className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="font-medium text-sm cursor-help underline decoration-dotted underline-offset-2">{resource.name}</span>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                <p className="text-xs">{(resource as any).description || 'A class resource used for special abilities.'}</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Recharges on {isShortRest ? 'Short Rest' : 'Long Rest'}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                        <span
                                            className={`text-xs px-1.5 py-0.5 rounded ${isShortRest
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                                                }`}
                                            title={isShortRest ? 'Recharges on Short Rest' : 'Recharges on Long Rest'}
                                        >
                                            {isShortRest ? <Moon size={10} className="inline" /> : <Sun size={10} className="inline" />}
                                            {isShortRest ? ' Short' : ' Long'}
                                        </span>
                                    </div>
                                    <span className="text-sm font-mono">
                                        <span className={remaining === 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}>
                                            {remaining}
                                        </span>
                                        <span className="text-slate-400">/{resource.maxUses}</span>
                                    </span>
                                </div>

                                {/* Uses visualization */}
                                <div className="flex gap-1 mb-2">
                                    {Array.from({ length: resource.maxUses }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-2 flex-1 rounded-full transition-colors ${i < remaining
                                                ? 'bg-emerald-500 dark:bg-emerald-400'
                                                : 'bg-slate-300 dark:bg-slate-600'
                                                }`}
                                        />
                                    ))}
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 h-7 text-xs"
                                        onClick={() => useResource(resource.id)}
                                        disabled={remaining === 0}
                                    >
                                        Use
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2"
                                        onClick={() => restoreResource(resource.id)}
                                        disabled={resource.usedUses === 0}
                                        title="Restore 1 use"
                                    >
                                        <RotateCcw size={12} />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </TooltipProvider>
    );
}
