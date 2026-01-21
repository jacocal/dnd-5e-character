"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Shuffle, RefreshCw } from "lucide-react";

type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";
type Method = "pointbuy" | "standard" | "roll";

const ABILITIES: Ability[] = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_LABELS: Record<Ability, string> = {
    str: "Strength", dex: "Dexterity", con: "Constitution",
    int: "Intelligence", wis: "Wisdom", cha: "Charisma"
};

const POINT_COSTS: Record<number, number> = {
    8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
};

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

interface Props {
    abilityOptions?: string[] | null; // 2024 rules: exactly 3 allowed abilities like ["STR", "DEX", "CON"]
}

export default function AbilityScoreCalculator({ abilityOptions }: Props) {
    // Convert abilityOptions to lowercase Ability type array for filtering
    const allowedAbilities: Ability[] = abilityOptions
        ? abilityOptions.map(a => a.toLowerCase() as Ability).filter(a => ABILITIES.includes(a))
        : ABILITIES; // If no options provided, allow all
    const [method, setMethod] = useState<Method>("pointbuy");
    const [scores, setScores] = useState<Record<Ability, number>>({
        str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8
    });

    // For Standard Array - track which values are assigned
    const [standardAssignments, setStandardAssignments] = useState<Record<Ability, number | null>>({
        str: null, dex: null, con: null, int: null, wis: null, cha: null
    });

    // For rolled scores
    const [rolledValues, setRolledValues] = useState<number[]>([]);
    const [rollAssignments, setRollAssignments] = useState<Record<Ability, number | null>>({
        str: null, dex: null, con: null, int: null, wis: null, cha: null
    });

    // Background bonus mode: "2and1" or "triple1"
    const [bonusMode, setBonusMode] = useState<"2and1" | "triple1">("2and1");
    const [primaryBonus, setPrimaryBonus] = useState<Ability | null>(null);
    const [secondaryBonus, setSecondaryBonus] = useState<Ability | null>(null);
    const [tripleBonus, setTripleBonus] = useState<Ability[]>([]);

    // Calculate final scores with bonuses
    const getFinalScore = (ability: Ability): number => {
        let base = 10;

        if (method === "pointbuy") {
            base = scores[ability];
        } else if (method === "standard") {
            base = standardAssignments[ability] ?? 10;
        } else if (method === "roll") {
            // rollAssignments now stores INDEX, not value
            const idx = rollAssignments[ability];
            base = idx !== null ? rolledValues[idx] : 10;
        }

        let bonus = 0;
        if (bonusMode === "2and1") {
            if (primaryBonus === ability) bonus = 2;
            else if (secondaryBonus === ability) bonus = 1;
        } else {
            if (tripleBonus.includes(ability)) bonus = 1;
        }

        return Math.min(20, base + bonus);
    };

    // Point Buy logic
    const calculatePointsUsed = () => {
        return Object.values(scores).reduce((total, score) => total + (POINT_COSTS[score] || 0), 0);
    };
    const pointsUsed = calculatePointsUsed();
    const pointsRemaining = 27 - pointsUsed;

    const handlePointBuyChange = (ability: Ability, change: number) => {
        const current = scores[ability];
        const next = current + change;
        if (next < 8 || next > 15) return;
        const costDiff = POINT_COSTS[next] - POINT_COSTS[current];
        if (pointsRemaining - costDiff < 0) return;
        setScores(prev => ({ ...prev, [ability]: next }));
    };

    // Standard Array logic
    const handleStandardSelect = (ability: Ability, value: number) => {
        // Remove value from any other ability first
        const newAssignments = { ...standardAssignments };
        for (const key of ABILITIES) {
            if (newAssignments[key] === value) {
                newAssignments[key] = null;
            }
        }
        newAssignments[ability] = value;
        setStandardAssignments(newAssignments);
    };

    const getAvailableStandardValues = (currentAbility: Ability) => {
        const used = new Set(
            ABILITIES.filter(a => a !== currentAbility)
                .map(a => standardAssignments[a])
                .filter(v => v !== null)
        );
        return STANDARD_ARRAY.filter(v => !used.has(v));
    };

    // Roll logic
    const rollDice = () => {
        const newRolls: number[] = [];
        for (let i = 0; i < 6; i++) {
            // Roll 4d6, drop lowest
            const dice = [
                Math.floor(Math.random() * 6) + 1,
                Math.floor(Math.random() * 6) + 1,
                Math.floor(Math.random() * 6) + 1,
                Math.floor(Math.random() * 6) + 1,
            ];
            dice.sort((a, b) => b - a);
            newRolls.push(dice[0] + dice[1] + dice[2]);
        }
        setRolledValues(newRolls.sort((a, b) => b - a));
        setRollAssignments({ str: null, dex: null, con: null, int: null, wis: null, cha: null });
    };

    // Now uses INDEX instead of value to handle duplicate roll values
    const handleRollSelect = (ability: Ability, index: number | null) => {
        const newAssignments = { ...rollAssignments };
        // Remove this index from any other ability
        if (index !== null) {
            for (const key of ABILITIES) {
                if (newAssignments[key] === index) {
                    newAssignments[key] = null;
                }
            }
        }
        newAssignments[ability] = index;
        setRollAssignments(newAssignments);
    };

    // Returns available roll indices (not values) for the dropdown
    const getAvailableRollIndices = (currentAbility: Ability): number[] => {
        const usedIndices = new Set(
            ABILITIES.filter(a => a !== currentAbility)
                .map(a => rollAssignments[a])
                .filter((idx): idx is number => idx !== null)
        );
        return rolledValues.map((_, idx) => idx).filter(idx => !usedIndices.has(idx));
    };

    // Bonus toggle handlers
    const toggleTripleBonus = (ability: Ability) => {
        if (tripleBonus.includes(ability)) {
            setTripleBonus(tripleBonus.filter(a => a !== ability));
        } else if (tripleBonus.length < 3) {
            setTripleBonus([...tripleBonus, ability]);
        }
    };

    const getModifier = (score: number) => Math.floor((score - 10) / 2);

    // Reset when method changes
    useEffect(() => {
        if (method === "pointbuy") {
            setScores({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
        } else if (method === "standard") {
            setStandardAssignments({ str: null, dex: null, con: null, int: null, wis: null, cha: null });
        } else if (method === "roll") {
            setRolledValues([]);
            setRollAssignments({ str: null, dex: null, con: null, int: null, wis: null, cha: null });
        }
    }, [method]);

    // Reset bonus selections when abilityOptions changes (background changed)
    useEffect(() => {
        setPrimaryBonus(null);
        setSecondaryBonus(null);
        setTripleBonus([]);
    }, [abilityOptions]);

    return (
        <div className="space-y-6">
            {/* Method Selector */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {[
                    { id: "pointbuy", label: "Point Buy" },
                    { id: "standard", label: "Standard Array" },
                    { id: "roll", label: "Roll" },
                ].map(opt => (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMethod(opt.id as Method)}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${method === opt.id
                            ? "bg-white dark:bg-slate-700 text-red-600 shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Roll Button */}
            {method === "roll" && (
                <div className="flex justify-center">
                    <Button type="button" onClick={rollDice} className="gap-2">
                        <Shuffle size={16} />
                        {rolledValues.length > 0 ? "Reroll All" : "Roll 4d6 Drop Lowest"}
                    </Button>
                    {rolledValues.length > 0 && (
                        <div className="ml-4 flex gap-2 items-center text-sm">
                            <span className="text-slate-500">Rolled:</span>
                            {rolledValues.map((v, i) => (
                                <span key={i} className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded font-mono font-bold">
                                    {v}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Point Buy Info */}
            {method === "pointbuy" && (
                <div className={`text-center text-sm font-bold px-3 py-2 rounded ${pointsRemaining === 0
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}>
                    Points Remaining: {pointsRemaining} / 27
                </div>
            )}

            {/* Standard Array Info */}
            {method === "standard" && (
                <div className="text-center text-sm text-slate-500">
                    Assign each value once: <span className="font-mono font-bold">15, 14, 13, 12, 10, 8</span>
                </div>
            )}

            {/* Ability Scores Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {ABILITIES.map((ability) => {
                    const finalScore = getFinalScore(ability);
                    const mod = getModifier(finalScore);
                    const baseScore = method === "pointbuy" ? scores[ability]
                        : method === "standard" ? standardAssignments[ability]
                            : rollAssignments[ability];

                    return (
                        <div key={ability} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-2">
                            <div className="text-center font-bold uppercase text-slate-600 dark:text-slate-400 text-sm">
                                {ABILITY_LABELS[ability]}
                            </div>

                            {/* Point Buy Controls */}
                            {method === "pointbuy" && (
                                <div className="flex items-center justify-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handlePointBuyChange(ability, -1)}
                                        disabled={scores[ability] <= 8}
                                    >
                                        <Minus size={14} />
                                    </Button>
                                    <div className="text-2xl font-bold w-12 text-center">{scores[ability]}</div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handlePointBuyChange(ability, 1)}
                                        disabled={scores[ability] >= 15 || pointsRemaining < (POINT_COSTS[scores[ability] + 1] - POINT_COSTS[scores[ability]])}
                                    >
                                        <Plus size={14} />
                                    </Button>
                                </div>
                            )}

                            {/* Standard Array Dropdown */}
                            {method === "standard" && (
                                <select
                                    value={standardAssignments[ability] ?? ""}
                                    onChange={(e) => handleStandardSelect(ability, parseInt(e.target.value))}
                                    className="w-full px-3 py-2 text-center text-lg font-bold border rounded-md bg-white dark:bg-slate-800"
                                >
                                    <option value="">--</option>
                                    {getAvailableStandardValues(ability).map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                    {standardAssignments[ability] !== null && (
                                        <option value={standardAssignments[ability]!}>{standardAssignments[ability]}</option>
                                    )}
                                </select>
                            )}

                            {/* Roll Dropdown - uses INDEX for value to handle duplicates */}
                            {method === "roll" && (
                                <select
                                    value={rollAssignments[ability] ?? ""}
                                    onChange={(e) => handleRollSelect(ability, e.target.value === "" ? null : parseInt(e.target.value))}
                                    disabled={rolledValues.length === 0}
                                    className="w-full px-3 py-2 text-center text-lg font-bold border rounded-md bg-white dark:bg-slate-800 disabled:opacity-50"
                                >
                                    <option value="">--</option>
                                    {getAvailableRollIndices(ability).map(idx => (
                                        <option key={idx} value={idx}>{rolledValues[idx]}</option>
                                    ))}
                                    {rollAssignments[ability] !== null && (
                                        <option value={rollAssignments[ability]!}>{rolledValues[rollAssignments[ability]!]}</option>
                                    )}
                                </select>
                            )}

                            {/* Final Score & Modifier */}
                            <div className="text-center">
                                <div className="text-xs text-slate-400">
                                    Final: <span className="font-bold text-slate-700 dark:text-slate-200">{finalScore}</span>
                                    <span className="ml-2">({mod >= 0 ? '+' : ''}{mod})</span>
                                </div>
                            </div>

                            {/* Hidden inputs for form submission */}
                            <input type="hidden" name={ability} value={finalScore} />
                        </div>
                    );
                })}
            </div>

            {/* Background Ability Bonuses */}
            {abilityOptions && abilityOptions.length > 0 && (
                <div className="p-4 border-2 border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-3">
                        Background Ability Bonuses
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        Your background allows bonuses to: <span className="font-bold">{abilityOptions.join(", ")}</span>
                    </p>
                    <p className="text-xs text-slate-500 mb-4">
                        Choose one: +2 to one ability and +1 to another, OR +1 to three different abilities.
                    </p>

                    {/* Bonus Mode Selector */}
                    <div className="flex gap-2 mb-4">
                        <button
                            type="button"
                            onClick={() => { setBonusMode("2and1"); setTripleBonus([]); }}
                            className={`flex-1 px-3 py-2 text-sm rounded-md border ${bonusMode === "2and1"
                                ? "bg-amber-100 dark:bg-amber-800 border-amber-300 text-amber-800 dark:text-amber-200"
                                : "border-slate-200 dark:border-slate-700"
                                }`}
                        >
                            +2 / +1
                        </button>
                        <button
                            type="button"
                            onClick={() => { setBonusMode("triple1"); setPrimaryBonus(null); setSecondaryBonus(null); }}
                            className={`flex-1 px-3 py-2 text-sm rounded-md border ${bonusMode === "triple1"
                                ? "bg-amber-100 dark:bg-amber-800 border-amber-300 text-amber-800 dark:text-amber-200"
                                : "border-slate-200 dark:border-slate-700"
                                }`}
                        >
                            +1 / +1 / +1
                        </button>
                    </div>

                    {/* +2/+1 Selection - Only allowed abilities */}
                    {bonusMode === "2and1" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1">+2 Bonus</label>
                                <select
                                    value={primaryBonus ?? ""}
                                    onChange={(e) => {
                                        const val = e.target.value as Ability | "";
                                        setPrimaryBonus(val || null);
                                        if (val === secondaryBonus) setSecondaryBonus(null);
                                    }}
                                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800"
                                >
                                    <option value="">Select...</option>
                                    {allowedAbilities.map(a => (
                                        <option key={a} value={a}>{ABILITY_LABELS[a]}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1">+1 Bonus</label>
                                <select
                                    value={secondaryBonus ?? ""}
                                    onChange={(e) => setSecondaryBonus(e.target.value as Ability || null)}
                                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800"
                                >
                                    <option value="">Select...</option>
                                    {allowedAbilities.filter(a => a !== primaryBonus).map(a => (
                                        <option key={a} value={a}>{ABILITY_LABELS[a]}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Triple +1 Selection - Only allowed abilities */}
                    {bonusMode === "triple1" && (
                        <div className="flex flex-wrap gap-2">
                            {allowedAbilities.map(a => (
                                <button
                                    key={a}
                                    type="button"
                                    onClick={() => toggleTripleBonus(a)}
                                    className={`px-3 py-2 text-sm rounded-md border ${tripleBonus.includes(a)
                                        ? "bg-amber-200 dark:bg-amber-700 border-amber-400 text-amber-800 dark:text-amber-100"
                                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        } ${tripleBonus.length >= 3 && !tripleBonus.includes(a) ? "opacity-50 cursor-not-allowed" : ""}`}
                                    disabled={tripleBonus.length >= 3 && !tripleBonus.includes(a)}
                                >
                                    {ABILITY_LABELS[a]}
                                </button>
                            ))}
                            <span className="text-xs text-slate-500 self-center ml-2">
                                ({tripleBonus.length}/3 selected)
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Validation Messages */}
            {method === "pointbuy" && pointsRemaining > 0 && (
                <p className="text-xs text-amber-600 text-center">
                    You have {pointsRemaining} unused points.
                </p>
            )}
            {method === "roll" && rolledValues.length === 0 && (
                <p className="text-xs text-amber-600 text-center">
                    Click "Roll" to generate your ability scores.
                </p>
            )}
        </div>
    );
}
