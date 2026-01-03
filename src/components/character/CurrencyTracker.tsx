"use client";

import React, { useState, useMemo } from "react";
import { useCharacterStore } from "@/store/character-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins, Plus, Minus, Calculator, Edit } from "lucide-react";
import { CURRENCY_VALUES, type CurrencyType } from "@/lib/constants";

// Check if electrum is enabled via environment variable
const USE_ELECTRUM = process.env.NEXT_PUBLIC_USE_ELECTRUM === "true";

// Order of currencies from highest to lowest value
// If USE_ELECTRUM is false: PP → GP → SP → CP (skip EP)
// If USE_ELECTRUM is true:  PP → GP → EP → CP (skip SP)
const CURRENCY_ORDER: CurrencyType[] = USE_ELECTRUM
    ? ["pp", "gp", "ep", "cp"]
    : ["pp", "gp", "sp", "cp"];

// Currency display info
const CURRENCY_INFO: Record<CurrencyType, { name: string; color: string }> = {
    cp: { name: "Copper", color: "text-orange-700 dark:text-orange-600" },
    sp: { name: "Silver", color: "text-slate-500 dark:text-slate-400" },
    ep: { name: "Electrum", color: "text-slate-600 dark:text-slate-500" },
    gp: { name: "Gold", color: "text-yellow-600 dark:text-yellow-500" },
    pp: { name: "Platinum", color: "text-slate-400 dark:text-slate-300" },
};

/**
 * Convert a total GP value into optimal currency distribution
 * Uses the appropriate currency order based on USE_ELECTRUM setting
 * @param totalGp - Total value in gold pieces
 * @returns Object with counts for each currency type
 */
function convertToCoins(totalGp: number): Record<CurrencyType, number> {
    const result: Record<CurrencyType, number> = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    let remaining = Math.round(totalGp * 100) / 100; // Round to 2 decimal places

    for (const currency of CURRENCY_ORDER) {
        const value = CURRENCY_VALUES[currency];
        const count = Math.floor(remaining / value);
        if (count > 0) {
            result[currency] = count;
            remaining = Math.round((remaining - count * value) * 100) / 100;
        }
    }

    return result;
}

/**
 * Calculate total GP value from currency amounts
 */
function calculateTotalGp(currencies: Record<CurrencyType, number>): number {
    return Object.entries(currencies).reduce((total, [type, amount]) => {
        return total + amount * CURRENCY_VALUES[type as CurrencyType];
    }, 0);
}

type ViewMode = "edit" | "calculator";

export function CurrencyTracker() {
    const { cp, sp, ep, gp, pp, setCurrency } = useCharacterStore();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<ViewMode>("edit");

    // Local state for direct editing
    const [editValues, setEditValues] = useState({ cp, sp, ep, gp, pp });

    // Calculator state
    const [calcAmount, setCalcAmount] = useState("");
    const [calcCurrency, setCalcCurrency] = useState<CurrencyType>("gp");
    const [calcMode, setCalcMode] = useState<"earn" | "spend">("earn");

    // Calculate total GP value of current holdings
    const totalGpValue = useMemo(() => calculateTotalGp({ cp, sp, ep, gp, pp }), [cp, sp, ep, gp, pp]);

    // Preview the result of calculator action
    const calcPreview = useMemo(() => {
        const amount = parseFloat(calcAmount) || 0;
        if (amount <= 0) return null;

        const amountInGp = amount * CURRENCY_VALUES[calcCurrency];
        const currentTotal = totalGpValue;

        if (calcMode === "earn") {
            const newTotal = currentTotal + amountInGp;
            return {
                newTotal,
                coins: convertToCoins(newTotal),
                change: amountInGp,
                valid: true,
            };
        } else {
            const newTotal = currentTotal - amountInGp;
            return {
                newTotal,
                coins: newTotal >= 0 ? convertToCoins(newTotal) : null,
                change: -amountInGp,
                valid: newTotal >= 0,
            };
        }
    }, [calcAmount, calcCurrency, calcMode, totalGpValue]);

    const handleOpen = () => {
        setEditValues({ cp, sp, ep, gp, pp });
        setCalcAmount("");
        setIsOpen(true);
    };

    const handleSave = () => {
        setCurrency("cp", editValues.cp);
        setCurrency("sp", editValues.sp);
        setCurrency("ep", editValues.ep);
        setCurrency("gp", editValues.gp);
        setCurrency("pp", editValues.pp);
        setIsOpen(false);
    };

    const handleChange = (type: keyof typeof editValues, val: string) => {
        const num = parseInt(val) || 0;
        setEditValues(prev => ({ ...prev, [type]: Math.max(0, num) }));
    };

    const handleCalculatorApply = () => {
        if (!calcPreview?.valid || !calcPreview.coins) return;

        setCurrency("cp", calcPreview.coins.cp);
        setCurrency("sp", calcPreview.coins.sp);
        setCurrency("ep", calcPreview.coins.ep);
        setCurrency("gp", calcPreview.coins.gp);
        setCurrency("pp", calcPreview.coins.pp);
        setCalcAmount("");
        setIsOpen(false);
    };

    return (
        <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1" title="Copper Pieces">
                    <span className="font-bold text-orange-700 dark:text-orange-600">{cp}</span> <span className="text-xs text-slate-500 uppercase">CP</span>
                </div>
                <div className="flex items-center gap-1" title="Silver Pieces">
                    <span className="font-bold text-slate-500 dark:text-slate-400">{sp}</span> <span className="text-xs text-slate-500 uppercase">SP</span>
                </div>
                <div className="flex items-center gap-1" title="Electrum Pieces">
                    <span className="font-bold text-slate-600 dark:text-slate-500">{ep}</span> <span className="text-xs text-slate-500 uppercase">EP</span>
                </div>
                <div className="flex items-center gap-1" title="Gold Pieces">
                    <span className="font-bold text-yellow-600 dark:text-yellow-500">{gp}</span> <span className="text-xs text-slate-500 uppercase">GP</span>
                </div>
                <div className="flex items-center gap-1" title="Platinum Pieces">
                    <span className="font-bold text-slate-400 dark:text-slate-300">{pp}</span> <span className="text-xs text-slate-500 uppercase">PP</span>
                </div>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-white" onClick={handleOpen}>
                        <Coins size={16} />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Coins size={20} />
                            Manage Currency
                        </DialogTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Total Value: <span className="font-bold text-yellow-600">{totalGpValue.toFixed(2)} GP</span>
                        </p>
                    </DialogHeader>

                    {/* Tab Toggle */}
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <button
                            onClick={() => setActiveTab("edit")}
                            className={`py-2 px-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${activeTab === "edit"
                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                        >
                            <Edit size={14} />
                            Edit Directly
                        </button>
                        <button
                            onClick={() => setActiveTab("calculator")}
                            className={`py-2 px-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${activeTab === "calculator"
                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                        >
                            <Calculator size={14} />
                            Calculator
                        </button>
                    </div>

                    {/* Direct Edit Content */}
                    {activeTab === "edit" && (
                        <div className="mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs uppercase font-bold text-slate-500 block">Copper (CP)</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={editValues.cp}
                                        onChange={(e) => handleChange("cp", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs uppercase font-bold text-slate-500 block">Silver (SP)</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={editValues.sp}
                                        onChange={(e) => handleChange("sp", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs uppercase font-bold text-slate-500 block">Electrum (EP)</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={editValues.ep}
                                        onChange={(e) => handleChange("ep", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs uppercase font-bold text-slate-500 block">Gold (GP)</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={editValues.gp}
                                        onChange={(e) => handleChange("gp", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs uppercase font-bold text-slate-500 block">Platinum (PP)</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={editValues.pp}
                                        onChange={(e) => handleChange("pp", e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button onClick={handleSave} className="w-full mt-4">Save Changes</Button>
                        </div>
                    )}

                    {/* Calculator Content */}
                    {activeTab === "calculator" && (
                        <div className="mt-4 space-y-4">
                            {/* Earn/Spend Toggle */}
                            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={() => setCalcMode("earn")}
                                    className={`flex-1 py-2 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${calcMode === "earn"
                                        ? "bg-green-500 text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                        }`}
                                >
                                    <Plus size={16} />
                                    Earn
                                </button>
                                <button
                                    onClick={() => setCalcMode("spend")}
                                    className={`flex-1 py-2 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${calcMode === "spend"
                                        ? "bg-red-500 text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                        }`}
                                >
                                    <Minus size={16} />
                                    Spend
                                </button>
                            </div>

                            {/* Amount Input */}
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs uppercase font-bold text-slate-500 block mb-1">Amount</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0"
                                        value={calcAmount}
                                        onChange={(e) => setCalcAmount(e.target.value)}
                                    />
                                </div>
                                <div className="w-28">
                                    <label className="text-xs uppercase font-bold text-slate-500 block mb-1">Currency</label>
                                    <Select value={calcCurrency} onValueChange={(v: CurrencyType) => setCalcCurrency(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cp">CP</SelectItem>
                                            <SelectItem value="sp">SP</SelectItem>
                                            <SelectItem value="ep">EP</SelectItem>
                                            <SelectItem value="gp">GP</SelectItem>
                                            <SelectItem value="pp">PP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Preview */}
                            {calcPreview && (
                                <div className={`p-4 rounded-lg border ${calcPreview.valid
                                    ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                    }`}>
                                    {calcPreview.valid && calcPreview.coins ? (
                                        <>
                                            <p className="text-xs uppercase font-bold text-slate-500 mb-2">
                                                Result ({calcMode === "earn" ? "+" : ""}{calcPreview.change.toFixed(2)} GP)
                                            </p>
                                            <div className="flex flex-wrap gap-3">
                                                {CURRENCY_ORDER.map(type => (
                                                    <div key={type} className="flex items-center gap-1">
                                                        <span className={`font-bold ${CURRENCY_INFO[type].color}`}>
                                                            {calcPreview.coins![type]}
                                                        </span>
                                                        <span className="text-xs text-slate-500 uppercase">{type}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2">
                                                New Total: <span className="font-bold text-yellow-600">{calcPreview.newTotal.toFixed(2)} GP</span>
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-sm text-red-600 dark:text-red-400">
                                            Insufficient funds! You need {Math.abs(calcPreview.newTotal).toFixed(2)} more GP.
                                        </p>
                                    )}
                                </div>
                            )}

                            <Button
                                onClick={handleCalculatorApply}
                                className="w-full"
                                disabled={!calcPreview?.valid}
                            >
                                {calcMode === "earn" ? "Add" : "Deduct"} Currency
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
