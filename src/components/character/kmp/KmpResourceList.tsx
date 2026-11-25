"use client";

import React from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Zap, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function KmpResourceList() {
    const { state, viewModel } = useKmpCharacter();
    const { resolvedResources } = state || {};

    if (!resolvedResources || resolvedResources.length === 0) {
        return (
            <div className="text-center py-6 text-slate-400 dark:text-slate-600 text-sm italic">
                No trackable resources available.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {resolvedResources.map((res: any) => (
                <ResourceRow
                    key={res.resource.id}
                    res={res}
                    viewModel={viewModel}
                />
            ))}
        </div>
    );
}

function ResourceRow({ res, viewModel }: { res: any; viewModel: any }) {
    const max = res.max || 1;
    const currentUsed = res.used || 0;
    const remaining = Math.max(0, max - currentUsed);
    const percent = max > 0 ? (remaining / max) * 100 : 0;
    const resourceId = res.resource.id;

    const [localRemaining, setLocalRemaining] = React.useState<string>(String(remaining));
    const [isFocused, setIsFocused] = React.useState(false);

    React.useEffect(() => {
        if (!isFocused) {
            setLocalRemaining(String(remaining));
        }
    }, [remaining, isFocused]);

    const commitDirectRemaining = () => {
        setIsFocused(false);
        const parsed = parseInt(localRemaining, 10);
        if (isNaN(parsed)) {
            setLocalRemaining(String(remaining));
            return;
        }
        const clampedRem = Math.max(0, Math.min(max, parsed));
        setLocalRemaining(String(clampedRem));
        const newUsed = max - clampedRem;
        if (newUsed !== currentUsed) {
            viewModel?.updateResource(resourceId, newUsed);
        }
    };

    const handleStepRemaining = (deltaRem: number) => {
        const nextRem = Math.max(0, Math.min(max, remaining + deltaRem));
        setLocalRemaining(String(nextRem));
        const nextUsed = max - nextRem;
        if (nextUsed !== currentUsed) {
            viewModel?.updateResource(resourceId, nextUsed);
        }
    };

    return (
        <div className="group bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md shrink-0">
                        <Zap size={14} className="fill-current" />
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-tight truncate">
                            {res.resource.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                            Recharges on {res.resource.rechargeOn} Rest
                        </p>
                    </div>
                </div>

                {/* Direct Editable Remaining Pool / Charges */}
                <div className="flex items-center gap-1 shrink-0">
                    <input
                        type="number"
                        min={0}
                        max={max}
                        value={localRemaining}
                        onFocus={(e) => {
                            setIsFocused(true);
                            e.currentTarget.select();
                        }}
                        onChange={(e) => setLocalRemaining(e.target.value)}
                        onBlur={commitDirectRemaining}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        title="Click to type exact remaining charges/pool directly"
                        className={cn(
                            "w-12 h-7 px-1 text-center font-mono text-sm font-bold rounded border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500",
                            remaining === 0
                                ? "text-slate-400"
                                : "text-indigo-600 dark:text-indigo-400"
                        )}
                    />
                    <span className="text-xs text-slate-400 font-mono font-bold">
                        / {max}
                    </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2.5">
                <div
                    className={cn(
                        "h-full transition-all duration-200 ease-out",
                        remaining === 0 ? "bg-slate-400" : "bg-indigo-500"
                    )}
                    style={{ width: `${percent}%` }}
                />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-1.5">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    onClick={() => handleStepRemaining(-1)}
                    disabled={remaining <= 0}
                    title="Spend 1 point/charge without triggering full ability"
                >
                    <Minus size={12} className="mr-0.5" /> 1
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    onClick={() => handleStepRemaining(1)}
                    disabled={currentUsed <= 0}
                    title="Refund / Restore 1 charge"
                >
                    <Plus size={12} className="mr-0.5" /> 1
                </Button>
                <Button
                    size="sm"
                    className="h-7 text-xs px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                    onClick={() => viewModel?.useResource(resourceId)}
                    disabled={remaining <= 0}
                    title="Use Resource & Trigger Automated Class Mechanics"
                >
                    Use{resourceId === "lay-on-hands" ? " (+5 HP)" : ""}
                </Button>
            </div>
        </div>
    );
}
