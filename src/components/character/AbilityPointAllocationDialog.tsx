"use client";

import React, { useState, useEffect } from "react";
import { useCharacterStore } from "@/store/character-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Minus, Sparkles, AlertCircle } from "lucide-react";

interface AbilityPointAllocationDialogProps {
    trigger?: React.ReactNode;
    onComplete?: () => void;
}

const ABILITY_NAMES: Record<string, string> = {
    str: "Strength",
    dex: "Dexterity",
    con: "Constitution",
    int: "Intelligence",
    wis: "Wisdom",
    cha: "Charisma",
};

const MAX_ABILITY_SCORE = 20;

export function AbilityPointAllocationDialog({
    trigger,
    onComplete,
}: AbilityPointAllocationDialogProps) {
    const {
        abilityPointPool,
        str, dex, con, int, wis, cha,
        spendAbilityPoints,
        getAbilityScore,
    } = useCharacterStore();

    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Track points to allocate per ability
    const [allocation, setAllocation] = useState<Record<string, number>>({
        str: 0,
        dex: 0,
        con: 0,
        int: 0,
        wis: 0,
        cha: 0,
    });

    // Current base scores (before allocation)
    const baseScores: Record<string, number> = {
        str, dex, con, int, wis, cha
    };

    // Calculate effective scores (with modifiers from items/feats)
    const effectiveScores: Record<string, number> = {
        str: getAbilityScore('str'),
        dex: getAbilityScore('dex'),
        con: getAbilityScore('con'),
        int: getAbilityScore('int'),
        wis: getAbilityScore('wis'),
        cha: getAbilityScore('cha'),
    };

    // Calculate remaining points
    const totalAllocated = Object.values(allocation).reduce((sum, val) => sum + val, 0);
    const remainingPoints = abilityPointPool - totalAllocated;

    // Reset allocation when dialog opens
    useEffect(() => {
        if (open) {
            setAllocation({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
            setError(null);
        }
    }, [open]);

    const handleIncrement = (stat: string) => {
        const newBaseValue = baseScores[stat] + allocation[stat] + 1;

        // Check cap
        if (newBaseValue > MAX_ABILITY_SCORE) {
            setError(`${ABILITY_NAMES[stat]} would exceed maximum of ${MAX_ABILITY_SCORE}`);
            return;
        }

        // Check remaining points
        if (remainingPoints <= 0) {
            setError("No ability points remaining");
            return;
        }

        setError(null);
        setAllocation(prev => ({ ...prev, [stat]: prev[stat] + 1 }));
    };

    const handleDecrement = (stat: string) => {
        if (allocation[stat] > 0) {
            setError(null);
            setAllocation(prev => ({ ...prev, [stat]: prev[stat] - 1 }));
        }
    };

    const handleSubmit = async () => {
        if (totalAllocated === 0) {
            setError("Please allocate at least one point");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        // Build distribution array
        const distribution = Object.entries(allocation)
            .filter(([_, amount]) => amount > 0)
            .map(([stat, amount]) => ({ stat, amount }));

        const result = await spendAbilityPoints(distribution);

        setIsSubmitting(false);

        if (result.success) {
            setOpen(false);
            onComplete?.();
        } else {
            setError(result.error || "Failed to allocate points");
        }
    };

    // Don't render if no points available
    if (abilityPointPool <= 0) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                    >
                        <Sparkles size={14} />
                        Allocate Points ({abilityPointPool})
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-amber-500" size={20} />
                        Allocate Ability Points
                    </DialogTitle>
                    <DialogDescription>
                        You have <strong className="text-amber-600">{abilityPointPool}</strong> ability point{abilityPointPool !== 1 ? 's' : ''} to distribute.
                        Maximum score is {MAX_ABILITY_SCORE}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {Object.keys(baseScores).map((stat) => {
                        const baseValue = baseScores[stat];
                        const effectiveValue = effectiveScores[stat];
                        const allocatedToThis = allocation[stat];
                        const newValue = baseValue + allocatedToThis;
                        const atCap = newValue >= MAX_ABILITY_SCORE;

                        return (
                            <div
                                key={stat}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                                    allocatedToThis > 0
                                        ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                                        : "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
                                )}
                            >
                                <div className="flex-1">
                                    <div className="font-medium text-sm">
                                        {ABILITY_NAMES[stat]}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        Base: {baseValue}
                                        {effectiveValue !== baseValue && (
                                            <span className="text-blue-500 ml-1">
                                                (Effective: {effectiveValue})
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleDecrement(stat)}
                                        disabled={allocatedToThis <= 0}
                                    >
                                        <Minus size={16} />
                                    </Button>

                                    <div className="w-16 text-center">
                                        <span className="text-lg font-bold">
                                            {newValue}
                                        </span>
                                        {allocatedToThis > 0 && (
                                            <span className="text-amber-600 text-xs ml-1">
                                                (+{allocatedToThis})
                                            </span>
                                        )}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleIncrement(stat)}
                                        disabled={remainingPoints <= 0 || atCap}
                                    >
                                        <Plus size={16} />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Points Summary */}
                <div className="flex justify-between items-center px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                        Points remaining:
                    </span>
                    <span className={cn(
                        "font-bold",
                        remainingPoints === 0 ? "text-green-600" : "text-amber-600"
                    )}>
                        {remainingPoints}
                    </span>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || totalAllocated === 0}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        {isSubmitting ? "Applying..." : `Apply Changes`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
