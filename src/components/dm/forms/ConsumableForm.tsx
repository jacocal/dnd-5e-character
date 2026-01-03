"use client";

import React from "react";

export interface ConsumableData {
    consumableType: string;
    uses: number;
    usesMax: number;
}

interface ConsumableFormProps {
    data: ConsumableData;
    onChange: (data: ConsumableData) => void;
}

export function ConsumableForm({ data, onChange }: ConsumableFormProps) {
    const handleChange = (field: keyof ConsumableData, value: any) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-4 p-4 bg-zinc-900/30 rounded border border-zinc-800">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-zinc-500">Consumable Details</h2>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-300">Type</label>
                    <select
                        value={data.consumableType}
                        onChange={e => handleChange('consumableType', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white capitalize"
                    >
                        <option value="potion">Potion</option>
                        <option value="scroll">Scroll</option>
                        <option value="poison">Poison</option>
                        <option value="food">Food</option>
                        <option value="material">Material Component</option>
                        <option value="ammunition">Ammunition</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-300">Quantity / Uses</label>
                    <input
                        type="number"
                        min={1}
                        value={data.usesMax}
                        onChange={e => {
                            const val = parseInt(e.target.value) || 1;
                            onChange({ ...data, uses: val, usesMax: val });
                        }}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                    />
                    <p className="text-xs text-zinc-500 mt-1">Default stack size or uses per item.</p>
                </div>
            </div>
        </div>
    );
}
