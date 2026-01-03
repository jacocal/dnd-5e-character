"use client";

import React from "react";

export interface ArmorData {
    armorClass: number | "";
    strengthRequirement: number | "";
    stealthDisadvantage: boolean;
    slot: string;
    armorType: string; // light, medium, heavy, shield
}

interface ArmorFormProps {
    data: ArmorData;
    onChange: (data: ArmorData) => void;
}

export function ArmorForm({ data, onChange }: ArmorFormProps) {
    const handleChange = (field: keyof ArmorData, value: any) => {
        const newData = { ...data, [field]: value };

        // Auto-set slot based on type if changing type
        if (field === 'armorType') {
            if (value === 'shield') newData.slot = 'off_hand';
            else newData.slot = 'chest';
        }

        onChange(newData);
    };

    return (
        <div className="space-y-4 p-4 bg-zinc-900/30 rounded border border-zinc-800">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-zinc-500">Armor Details</h2>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-300">Category</label>
                    <select
                        value={data.armorType}
                        onChange={e => handleChange('armorType', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                    >
                        <option value="light">Light Armor</option>
                        <option value="medium">Medium Armor</option>
                        <option value="heavy">Heavy Armor</option>
                        <option value="shield">Shield</option>
                        <option value="clothing">Clothing / Other</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-300">Slot</label>
                    <select
                        value={data.slot}
                        onChange={e => handleChange('slot', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                    >
                        <option value="chest">Chest (Armor/Robes)</option>
                        <option value="off_hand">Off-Hand (Shield)</option>
                        <option value="head">Head (Helm)</option>
                        <option value="hands">Hands (Gauntlets)</option>
                        <option value="feet">Feet (Boots)</option>
                        <option value="legs">Legs</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-300">
                        {data.armorType === 'shield' ? 'AC Bonus' : 'Base AC'}
                    </label>
                    <input
                        type="number"
                        placeholder={data.armorType === 'shield' ? "+2" : "11"}
                        value={data.armorClass}
                        onChange={e => handleChange('armorClass', e.target.value ? parseInt(e.target.value) : "")}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-300">Min Str</label>
                    <input
                        type="number"
                        value={data.strengthRequirement}
                        onChange={e => handleChange('strengthRequirement', e.target.value ? parseInt(e.target.value) : "")}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                    />
                </div>
                <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={data.stealthDisadvantage}
                            onChange={e => handleChange('stealthDisadvantage', e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-sm text-zinc-300">Stealth Dis.</span>
                    </label>
                </div>
            </div>
        </div>
    );
}
