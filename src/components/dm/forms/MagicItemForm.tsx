"use client";

import React from "react";
import { Modifier, ModifierEditor } from "../ModifierEditor";

export interface MagicData {
    isMagical: boolean;
    requiresAttunement: boolean;
    isCursed?: boolean;
    trueName: string;
    trueEffect?: string;
    modifiers: Modifier[];

    // Charges
    usesMax: number | "";

    // Slot Override for Wondrous Items
    slot: string | "";
}

interface MagicItemFormProps {
    data: MagicData;
    onChange: (data: MagicData) => void;
}

export function MagicItemForm({ data, onChange }: MagicItemFormProps) {
    const handleChange = (field: keyof MagicData, value: any) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-4 p-4 bg-zinc-900/30 rounded border border-zinc-800">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-zinc-500">Magic & Modifiers</h2>

            <div className="flex gap-6 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.isMagical}
                        onChange={e => handleChange('isMagical', e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm text-zinc-300">Is Magical</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.requiresAttunement}
                        onChange={e => handleChange('requiresAttunement', e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm text-zinc-300">Requires Attunement</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.isCursed || false}
                        onChange={e => handleChange('isCursed', e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-zinc-300">Is Cursed</span>
                </label>
            </div>

            {data.isMagical && (
                <div className="space-y-4 mb-6 pt-2 border-t border-zinc-800">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-zinc-300">True Name (When Identified)</label>
                            <input
                                placeholder="Real name e.g. 'Sword of Vengeance'"
                                value={data.trueName}
                                onChange={e => handleChange('trueName', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-zinc-300">Charges (Optional)</label>
                            <input
                                type="number"
                                placeholder="e.g. 7 (Leave empty if none)"
                                value={data.usesMax}
                                onChange={e => handleChange('usesMax', e.target.value ? parseInt(e.target.value) : "")}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-300">Hidden Description / True Effect</label>
                        <textarea
                            rows={3}
                            placeholder="Details revealed only after identification (or curse trigger)."
                            value={data.trueEffect || ""}
                            onChange={e => handleChange('trueEffect', e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-300">Slot (Wondrous Item)</label>
                        <select
                            value={data.slot}
                            onChange={e => handleChange('slot', e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                        >
                            <option value="">No specific slot</option>
                            <option value="head">Head</option>
                            <option value="shoulders">Shoulders</option>
                            <option value="hands">Hands</option>
                            <option value="feet">Feet</option>
                            <option value="ring">Ring (Finger)</option>
                            <option value="neck">Neck</option>
                            <option value="waist">Waist</option>
                        </select>
                    </div>
                </div>
            )}

            <ModifierEditor
                value={data.modifiers}
                onChange={val => handleChange('modifiers', val)}
            />
        </div>
    );
}
