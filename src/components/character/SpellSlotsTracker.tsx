
"use client";

import { useCharacterStore } from "@/store/character-store";
import { cn } from "@/lib/utils";

export function SpellSlotsTracker() {
    const {
        usedSpellSlots = {},
        maxSpellSlots,
        consumeSpellSlot,
        restoreSpellSlot,
        // Pact Magic (Warlock)
        usedPactSlots,
        maxPactSlots,
        consumePactSlot,
        restorePactSlot
    } = useCharacterStore();

    const maxSlots = maxSpellSlots || {};
    const slotLevels = Object.keys(maxSlots).map(Number).sort((a, b) => a - b);

    const hasSpellSlots = slotLevels.length > 0;
    const hasPactSlots = maxPactSlots !== null;

    if (!hasSpellSlots && !hasPactSlots) return null;

    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 mb-4">
            {/* Standard Spell Slots (Long Rest Recovery) */}
            {hasSpellSlots && (
                <>
                    <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Spell Slots
                        </h3>
                        <span className="text-[10px] text-slate-400 italic">(Long Rest)</span>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        {slotLevels.map(lvl => {
                            const total = maxSlots[lvl];
                            const used = usedSpellSlots[lvl] || 0;

                            return (
                                <div key={lvl} className="flex flex-col items-center">
                                    <div className="flex gap-1 mb-1">
                                        {Array.from({ length: total }).map((_, i) => {
                                            const isChecked = i < used;

                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        if (isChecked) restoreSpellSlot(lvl);
                                                        else consumeSpellSlot(lvl);
                                                    }}
                                                    className={cn(
                                                        "w-3 h-3 rounded-full border transition-all",
                                                        isChecked
                                                            ? "bg-slate-300 dark:bg-slate-700 border-slate-400" // Used (Dimmed)
                                                            : "bg-indigo-500 border-indigo-600 shadow-sm hover:scale-110" // Available (Bright)
                                                    )}
                                                    title={isChecked ? "Recover Slot" : "Use Slot"}
                                                />
                                            );
                                        })}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400">
                                        Lvl {lvl}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Pact Magic Slots (Short Rest Recovery) - Warlock Only */}
            {hasPactSlots && (
                <>
                    {hasSpellSlots && <div className="border-t border-slate-200 dark:border-slate-700 my-4" />}

                    <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-xs font-bold text-purple-500 uppercase tracking-wider">
                            Pact Slots
                        </h3>
                        <span className="text-[10px] text-purple-400 italic">(Short Rest)</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-auto">
                            Lvl {maxPactSlots.level}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                            {Array.from({ length: maxPactSlots.count }).map((_, i) => {
                                const isChecked = i < usedPactSlots;

                                return (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            if (isChecked) restorePactSlot();
                                            else consumePactSlot();
                                        }}
                                        className={cn(
                                            "w-4 h-4 rounded-full border-2 transition-all",
                                            isChecked
                                                ? "bg-slate-300 dark:bg-slate-700 border-purple-400/50" // Used
                                                : "bg-purple-500 border-purple-600 shadow-md hover:scale-110" // Available
                                        )}
                                        title={isChecked ? "Recover Pact Slot" : "Use Pact Slot"}
                                    />
                                );
                            })}
                        </div>
                        <span className="text-xs text-slate-400">
                            {maxPactSlots.count - usedPactSlots} / {maxPactSlots.count}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
