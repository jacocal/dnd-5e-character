"use client";

import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Gauge, Flame, Zap, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function KmpResourceList() {
    const { state, viewModel } = useKmpCharacter();
    // Use resolvedResources which has the correctly calculated 'max' from ViewModel
    const { resolvedResources } = state || {};

    if (!resolvedResources || resolvedResources.length === 0) {
        return (
            <div className="text-center py-6 text-slate-400 dark:text-slate-600 text-sm italic">
                No trackable resources available.
            </div>
        );
    }

    const handleUpdate = (resourceId: string, currentUsed: number, change: number, max: number) => {
        const newUsed = Math.max(0, Math.min(max, currentUsed + change));
        if (newUsed !== currentUsed) {
            viewModel?.updateResource(resourceId, newUsed);
        }
    };

    return (
        <div className="space-y-3">
            {resolvedResources.map((res: any) => {
                // resolvedResources is Array<TrackedResource>
                // Structure: { resource: RuleResource, used: number, max: number }

                const max = res.max;
                const currentUsed = res.used;
                const remaining = Math.max(0, max - currentUsed);
                const percent = max > 0 ? (remaining / max) * 100 : 0;
                const resourceId = res.resource.id;

                return (
                    <div
                        key={resourceId}
                        className="group bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md">
                                    <Zap size={14} className="fill-current" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-tight">
                                        {res.resource.name}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                        Recharges on {res.resource.rechargeOn} Rest
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={cn(
                                    "text-xl font-bold font-mono block leading-none",
                                    remaining === 0 ? "text-slate-300 dark:text-slate-600" : "text-indigo-600 dark:text-indigo-400"
                                )}>
                                    {remaining}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium uppercase">
                                    / {max} Left
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                            <div
                                className={cn(
                                    "h-full transition-all duration-300 ease-out",
                                    remaining === 0 ? "bg-slate-400" : "bg-indigo-500"
                                )}
                                style={{ width: `${percent}%` }}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 mt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-3 bg-white dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
                                onClick={() => handleUpdate(resourceId, currentUsed, -1, max)} // Un-use (Add back)
                                disabled={currentUsed <= 0}
                                title="Refund / Add charge"
                            >
                                <Plus size={12} className="mr-1" /> Add
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 text-xs px-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 dark:shadow-none"
                                onClick={() => viewModel?.useResource(resourceId)} // Use: consumes AND activates effects
                                disabled={remaining <= 0}
                            >
                                Use
                            </Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
