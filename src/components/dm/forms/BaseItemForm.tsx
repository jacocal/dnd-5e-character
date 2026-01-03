"use client";

import React from "react";

export interface BaseItemData {
    name: string;
    costAmount: number;
    costCurrency: string;
    weight: string;
    rarity: string;
    description: string;
}

interface BaseItemFormProps {
    data: BaseItemData;
    onChange: (data: BaseItemData) => void;
}

export function BaseItemForm({ data, onChange }: BaseItemFormProps) {
    const handleChange = (field: keyof BaseItemData, value: any) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-4 p-4 bg-zinc-900/30 rounded border border-zinc-800">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-zinc-500">Basic Information</h2>

            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-300">Item Name</label>
                    <input
                        required
                        value={data.name}
                        onChange={e => handleChange('name', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                        placeholder="e.g. Sword of Truth"
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-300">Cost (GP)</label>
                    <input
                        type="number"
                        value={data.costAmount}
                        onChange={e => handleChange('costAmount', parseInt(e.target.value) || 0)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-300">Weight (lbs)</label>
                    <input
                        value={data.weight}
                        onChange={e => handleChange('weight', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-300">Rarity</label>
                    <select
                        value={data.rarity}
                        onChange={e => handleChange('rarity', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                    >
                        <option value="common">Common</option>
                        <option value="uncommon">Uncommon</option>
                        <option value="rare">Rare</option>
                        <option value="very rare">Very Rare</option>
                        <option value="legendary">Legendary</option>
                        <option value="artifact">Artifact</option>
                    </select>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-300">Description</label>
                <textarea
                    rows={3}
                    value={data.description}
                    onChange={e => handleChange('description', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                />
            </div>
        </div>
    );
}
