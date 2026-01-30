"use client";

import React from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { cn } from "@/lib/utils";

export function KmpSpellSlotsTracker() {
    const { viewModel, state } = useKmpCharacter();
    const character = state?.character;
    const resolvedSlots = state?.resolvedSpellSlots;

    if (!character || !resolvedSlots) return null;

    const maxSpellSlots = resolvedSlots.slots;
    const usedSpellSlots = character.usedSpellSlots?.slots || {};

    // Pact Magic
    // Pact Magic
    const pactSlotsCount = resolvedSlots.pactSlots;
    const pactSlotLevel = resolvedSlots.pactSlotLevel;
    const usedPactSlots = character.usedPactSlots;

    const slotLevels = Object.keys(maxSpellSlots).map(Number).filter(lvl => lvl > 0).sort((a, b) => a - b);
    const hasSpellSlots = slotLevels.length > 0 && slotLevels.some(lvl => (maxSpellSlots as any)[lvl] > 0);
    const hasPactSlots = pactSlotsCount > 0;

    if (!hasSpellSlots && !hasPactSlots) return null;

    const handleConsumeResult = (lvl: number) => {
        viewModel?.consumeSpellSlot(lvl);
    };

    const handleRestoreResult = (lvl: number) => {
        viewModel?.restoreSpellSlot(lvl);
    };

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
                            const total = maxSpellSlots[lvl.toString()] || 0;
                            // Check usedSpellSlots mapping - it is Map<String, Int> coming from KMP
                            // but in JS it might be an object or a Map depending on Kotlin transpilation.
                            // Assuming object based on JSON serialization.
                            // However, SpellSlotMap.slots is a Map. In JS it might be an object if localized.
                            // Let's assume standard object access since it's likely serialized. 
                            // If it's a Kotlin Map in JS, we need `get`.
                            // But `state` comes from `useKmpCharacter` which wraps the JS Export.
                            // `SpellSlotMap` has a `get(level)` method exported.

                            // Check if `usedSpellSlots` is the class instance or raw data.
                            // It's likely the class instance since we use the KMP object.
                            // Let's try to access `.slots` safely or use the `.get()` method if available.
                            // Actually, in `KmpCharacterProvider`, we just pass the object through.
                            // `Character` export has `usedSpellSlots: SpellSlotMap?`.
                            // `SpellSlotMap` has `get(level: Int)`.

                            const used = character.usedSpellSlots?.get
                                ? character.usedSpellSlots.get(lvl) // Use exported method if available
                                : (character.usedSpellSlots?.slots as any)?.[lvl.toString()] || 0; // Fallback

                            return (
                                <div key={lvl} className="flex flex-col items-center">
                                    <div className="flex gap-1 mb-1">
                                        {Array.from({ length: total }).map((_, i) => {
                                            const isChecked = i < used;

                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        if (isChecked) handleRestoreResult(lvl);
                                                        else handleConsumeResult(lvl);
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

            {/* Pact Magic Slots (Short Rest Recovery) */}
            {hasPactSlots && (
                <>
                    {hasSpellSlots && <div className="border-t border-slate-200 dark:border-slate-700 my-4" />}

                    <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-xs font-bold text-purple-500 uppercase tracking-wider">
                            Pact Slots
                        </h3>
                        <span className="text-[10px] text-purple-400 italic">(Short Rest)</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-auto">
                            Lvl {pactSlotLevel}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                            {Array.from({ length: pactSlotsCount }).map((_, i) => {
                                const isChecked = i < usedPactSlots;

                                return (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            if (isChecked) viewModel?.restorePactSlot();
                                            else viewModel?.consumePactSlot();
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
                            {pactSlotsCount - usedPactSlots} / {pactSlotsCount}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
