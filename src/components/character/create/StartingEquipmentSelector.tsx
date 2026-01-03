"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";

interface EquipmentOption {
    items: string[];
    gp: number;
}

interface EquipmentOptions {
    A: EquipmentOption;
    B: EquipmentOption;
    C?: EquipmentOption;
}

interface StartingEquipmentSelectorProps {
    classOptions: EquipmentOptions | null;
    backgroundOptions: EquipmentOptions | null;
    className: string;
    backgroundName: string;
    onClassOptionChange: (option: "A" | "B" | "C") => void;
    onBackgroundOptionChange: (option: "A" | "B") => void;
}

// Helper to count item occurrences
function countItems(items: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const item of items) {
        counts.set(item, (counts.get(item) || 0) + 1);
    }
    return counts;
}

// Format item ID to display name
function formatItemName(id: string): string {
    return id
        .replace(/-/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

// Format items list with quantities
function formatItemsList(items: string[]): string {
    const counts = countItems(items);
    const formatted: string[] = [];

    counts.forEach((count, item) => {
        const name = formatItemName(item);
        formatted.push(count > 1 ? `${name} (×${count})` : name);
    });

    return formatted.join(", ") || "None";
}

export default function StartingEquipmentSelector({
    classOptions,
    backgroundOptions,
    className,
    backgroundName,
    onClassOptionChange,
    onBackgroundOptionChange,
}: StartingEquipmentSelectorProps) {
    const [classSelection, setClassSelection] = useState<"A" | "B" | "C">("A");
    const [backgroundSelection, setBackgroundSelection] = useState<"A" | "B">("A");

    useEffect(() => {
        // Reset to A when options change
        setClassSelection("A");
        setBackgroundSelection("A");
        onClassOptionChange("A");
        onBackgroundOptionChange("A");
    }, [classOptions, backgroundOptions]);

    const handleClassChange = (option: "A" | "B" | "C") => {
        setClassSelection(option);
        onClassOptionChange(option);
    };

    const handleBackgroundChange = (option: "A" | "B") => {
        setBackgroundSelection(option);
        onBackgroundOptionChange(option);
    };

    // Calculate total starting GP
    const classGp = classOptions?.[classSelection]?.gp || 0;
    const backgroundGp = backgroundOptions?.[backgroundSelection]?.gp || 0;
    const totalGp = classGp + backgroundGp;

    if (!classOptions && !backgroundOptions) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Starting Equipment</Label>
                <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    Total Starting GP: {totalGp}
                </div>
            </div>

            {/* Class Equipment Options */}
            {classOptions && (
                <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {className} Starting Equipment
                    </Label>
                    <div className="space-y-2">
                        {/* Option A */}
                        <label
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${classSelection === "A"
                                    ? "border-red-600 bg-red-50 dark:bg-red-900/20"
                                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                }`}
                        >
                            <input
                                type="radio"
                                name="classEquipment"
                                value="A"
                                checked={classSelection === "A"}
                                onChange={() => handleClassChange("A")}
                                className="mt-1 text-red-600"
                            />
                            <div className="space-y-1">
                                <span className="font-medium text-sm">Option A ({classOptions.A.gp} GP)</span>
                                <p className="text-xs text-slate-500">
                                    {formatItemsList(classOptions.A.items)}
                                </p>
                            </div>
                        </label>

                        {/* Option B */}
                        <label
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${classSelection === "B"
                                    ? "border-red-600 bg-red-50 dark:bg-red-900/20"
                                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                }`}
                        >
                            <input
                                type="radio"
                                name="classEquipment"
                                value="B"
                                checked={classSelection === "B"}
                                onChange={() => handleClassChange("B")}
                                className="mt-1 text-red-600"
                            />
                            <div className="space-y-1">
                                <span className="font-medium text-sm">Option B ({classOptions.B.gp} GP)</span>
                                <p className="text-xs text-slate-500">
                                    {classOptions.B.items.length > 0 ? formatItemsList(classOptions.B.items) : "Gold only"}
                                </p>
                            </div>
                        </label>

                        {/* Option C (if available, e.g., Fighter) */}
                        {classOptions.C && (
                            <label
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${classSelection === "C"
                                        ? "border-red-600 bg-red-50 dark:bg-red-900/20"
                                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="classEquipment"
                                    value="C"
                                    checked={classSelection === "C"}
                                    onChange={() => handleClassChange("C")}
                                    className="mt-1 text-red-600"
                                />
                                <div className="space-y-1">
                                    <span className="font-medium text-sm">Option C ({classOptions.C.gp} GP)</span>
                                    <p className="text-xs text-slate-500">
                                        {formatItemsList(classOptions.C.items)}
                                    </p>
                                </div>
                            </label>
                        )}
                    </div>
                </div>
            )}

            {/* Background Equipment Options */}
            {backgroundOptions && (
                <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {backgroundName} Starting Equipment
                    </Label>
                    <div className="space-y-2">
                        {/* Option A */}
                        <label
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${backgroundSelection === "A"
                                    ? "border-red-600 bg-red-50 dark:bg-red-900/20"
                                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                }`}
                        >
                            <input
                                type="radio"
                                name="backgroundEquipment"
                                value="A"
                                checked={backgroundSelection === "A"}
                                onChange={() => handleBackgroundChange("A")}
                                className="mt-1 text-red-600"
                            />
                            <div className="space-y-1">
                                <span className="font-medium text-sm">Option A ({backgroundOptions.A.gp} GP)</span>
                                <p className="text-xs text-slate-500">
                                    {formatItemsList(backgroundOptions.A.items)}
                                </p>
                            </div>
                        </label>

                        {/* Option B */}
                        <label
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${backgroundSelection === "B"
                                    ? "border-red-600 bg-red-50 dark:bg-red-900/20"
                                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                }`}
                        >
                            <input
                                type="radio"
                                name="backgroundEquipment"
                                value="B"
                                checked={backgroundSelection === "B"}
                                onChange={() => handleBackgroundChange("B")}
                                className="mt-1 text-red-600"
                            />
                            <div className="space-y-1">
                                <span className="font-medium text-sm">Option B ({backgroundOptions.B.gp} GP)</span>
                                <p className="text-xs text-slate-500">
                                    {backgroundOptions.B.items.length > 0 ? formatItemsList(backgroundOptions.B.items) : "Gold only"}
                                </p>
                            </div>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}
