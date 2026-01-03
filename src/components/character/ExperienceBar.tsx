
"use client";

import { useCharacterStore } from "@/store/character-store";
import { getXpProgress } from "@/lib/leveling-utils";
import { Plus, Edit2, Check, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ExperienceBar() {
    const { xp, setXp, level, setLevel } = useCharacterStore();
    const [isEditing, setIsEditing] = useState(false);
    const [editLevel, setEditLevel] = useState(level);

    const { target } = getXpProgress(xp, level);
    // Progress for current level: 
    // Usually bars show progress from prev level to next level.
    // e.g. Level 1 (0 -> 300). 150/300 = 50%.
    // Level 2 (300 -> 900). Current 500. Progress = (500-300) / (900-300).
    // For MVP, simple ratio Current / Target is simpler but Lvl 2 starts at 300 so 300/900 is 33% visually?
    // Let's stick to "Absolute XP" display: 500 / 900.
    // Percentage = (xp / target) * 100 ?
    // If I have 10,000 xp (Lvl 5), target is 14,000. 10k/14k = 71%.
    // This feels correct for an "Total Experience" bar.

    const percentage = Math.min(100, Math.max(0, (xp / target) * 100));

    const handleLevelSave = () => {
        if (editLevel > 0 && editLevel <= 20) {
            setLevel(editLevel);
            setIsEditing(false);
        }
    };

    const addXp = () => {
        const amount = prompt("Enter XP amount to add:");
        if (amount) {
            const val = parseInt(amount);
            if (!isNaN(val)) {
                setXp(xp + val);
            }
        }
    };

    return (
        <div className="mb-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Level</span>
                        {isEditing ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    value={editLevel}
                                    onChange={(e) => setEditLevel(parseInt(e.target.value) || 0)}
                                    className="w-12 h-6 text-center border rounded text-sm font-bold text-slate-900 bg-white"
                                    autoFocus
                                />
                                <button onClick={handleLevelSave} className="p-1 hover:bg-green-100 text-green-600 rounded">
                                    <Check size={14} />
                                </button>
                                <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-red-100 text-red-600 rounded">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="group flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-0.5 rounded -ml-2" onClick={() => { setEditLevel(level); setIsEditing(true); }}>
                                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{level}</span>
                                <Edit2 size={12} className="opacity-0 group-hover:opacity-50 text-slate-400" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-xs font-mono text-slate-400 mb-1">XP PROGRESS</div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {xp.toLocaleString()} <span className="text-slate-400 font-normal">/ {target.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Bar */}
            <div className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {/* Controls */}
            <div className="mt-3 flex justify-end">
                <button
                    onClick={addXp}
                    className="text-xs flex items-center gap-1 text-indigo-600 font-bold hover:bg-indigo-50 px-2 py-1 rounded transition"
                >
                    <Plus size={14} />
                    Add XP
                </button>
            </div>
        </div>
    );
}
