"use client";

import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { getXpProgress } from "@/lib/leveling-utils";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ExperienceBar() {
    const { viewModel, state } = useKmpCharacter();
    const character = state?.character;

    const xp: number = character?.xp ?? 0;
    const totalClassLevel = (character?.classes || []).reduce(
        (sum: number, c: { level?: number }) => sum + (c.level || 0),
        0
    );
    const level: number = totalClassLevel > 0 ? totalClassLevel : (character?.level ?? 1);

    const [isEditing, setIsEditing] = useState(false);
    const [editLevel, setEditLevel] = useState(level);

    const { target } = getXpProgress(xp, level);
    const percentage = Math.min(100, Math.max(0, (xp / target) * 100));

    const commitLevel = async () => {
        if (editLevel > 0 && editLevel <= 20) {
            setIsEditing(false);
            if (viewModel && typeof viewModel.setLevel === "function") {
                try {
                    await viewModel.setLevel(editLevel);
                } catch (err) {
                    console.error("[ExperienceBar] Error calling setLevel:", err);
                }
            }
        } else {
            alert("Level must be between 1 and 20");
        }
    };

    const addXp = async () => {
        const amount = prompt("Enter XP amount to add:");
        if (amount) {
            const val = parseInt(amount, 10);
            if (!isNaN(val) && viewModel) {
                await viewModel.addExperience(val);
            }
        }
    };

    return (
        <div className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Background Progress Layer */}
            <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950/50" />
            <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
            />

            <div className="relative flex items-center justify-between p-3 sm:p-4">
                {/* Level Indicator */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-black text-xl sm:text-2xl rounded-xl shadow-lg shadow-violet-500/20">
                            {isEditing ? (
                                <>
                                    <input
                                        type="number"
                                        value={editLevel}
                                        onChange={(e) => setEditLevel(parseInt(e.target.value, 10) || 0)}
                                        className="w-full h-full bg-transparent text-center focus:outline-none text-white placeholder-white/50"
                                        autoFocus
                                        onBlur={commitLevel}
                                        onKeyDown={(e) => e.key === "Enter" && commitLevel()}
                                    />
                                    <button
                                        type="button"
                                        className="absolute -right-8 top-1/2 -translate-y-1/2 bg-green-500 text-white text-[10px] px-1 py-0.5 rounded shadow z-50 cursor-pointer hover:bg-green-600"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            commitLevel();
                                        }}
                                    >
                                        Save
                                    </button>
                                </>
                            ) : (
                                <span
                                    onClick={() => {
                                        setEditLevel(level);
                                        setIsEditing(true);
                                    }}
                                    className="cursor-pointer"
                                >
                                    {level}
                                </span>
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm text-slate-500 uppercase tracking-wider">
                            Lvl
                        </div>
                    </div>
                </div>

                {/* XP Text & Bar Visual */}
                <div className="flex-1 px-4 sm:px-6">
                    <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Experience</span>
                        <div className="text-sm font-medium font-mono">
                            <span className="text-slate-900 dark:text-white font-bold">{xp.toLocaleString()}</span>
                            <span className="text-slate-400 text-xs"> / {target.toLocaleString()} XP</span>
                        </div>
                    </div>

                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-[0_0_10px_rgba(167,139,250,0.5)] transition-all duration-500 ease-out"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>

                {/* Controls */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={addXp}
                    className="shrink-0 h-9 w-9 rounded-full hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/20"
                >
                    <Plus size={18} />
                </Button>
            </div>
        </div>
    );
}
