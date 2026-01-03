"use client";

import React from "react";

export interface WeaponData {
    damageDice: string;
    damageType: string;
    properties: string[];
    range: string;
    slot: string;
}

interface WeaponFormProps {
    data: WeaponData;
    onChange: (data: WeaponData) => void;
}

const WEAPON_PROPERTIES = [
    "finesse", "heavy", "light", "loading", "range",
    "reach", "thrown", "two_handed", "versatile"
];

const DAMAGE_TYPES = [
    "bludgeoning", "piercing", "slashing",
    "acid", "cold", "fire", "force", "lightning",
    "necrotic", "poison", "psychic", "radiant", "thunder"
];

export function WeaponForm({ data, onChange }: WeaponFormProps) {
    const handleChange = (field: keyof WeaponData, value: any) => {
        onChange({ ...data, [field]: value });
    };

    const toggleProperty = (prop: string) => {
        const newProps = data.properties.includes(prop)
            ? data.properties.filter(p => p !== prop)
            : [...data.properties, prop];

        // Auto-handle slot logic slightly
        let newSlot = data.slot;
        if (newProps.includes("two_handed")) newSlot = "two_handed";

        onChange({ ...data, properties: newProps, slot: newSlot });
    };

    return (
        <div className="space-y-4 p-4 bg-zinc-900/30 rounded border border-zinc-800">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-zinc-500">Weapon Details</h2>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-300">Damage</label>
                    <div className="flex gap-2">
                        <input
                            placeholder="1d8"
                            value={data.damageDice}
                            onChange={e => handleChange('damageDice', e.target.value)}
                            className="w-1/2 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                        />
                        <select
                            value={data.damageType}
                            onChange={e => handleChange('damageType', e.target.value)}
                            className="w-1/2 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white capitalize"
                        >
                            <option value="">Type...</option>
                            {DAMAGE_TYPES.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-300">Range (ft)</label>
                    <input
                        placeholder="e.g. 20/60"
                        value={data.range}
                        onChange={e => handleChange('range', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Properties</label>
                <div className="grid grid-cols-3 gap-2">
                    {WEAPON_PROPERTIES.map(prop => (
                        <label key={prop} className="flex items-center gap-2 cursor-pointer p-2 bg-zinc-900/50 rounded hover:bg-zinc-800 border border-zinc-800 transition-colors">
                            <input
                                type="checkbox"
                                checked={data.properties.includes(prop)}
                                onChange={() => toggleProperty(prop)}
                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-600 focus:ring-amber-500"
                            />
                            <span className="text-xs text-zinc-300 capitalize">{prop.replace('_', '-')}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-300">Slot</label>
                <select
                    value={data.slot}
                    onChange={e => handleChange('slot', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                >
                    <option value="main_hand">Main Hand (One-Handed)</option>
                    <option value="off_hand">Off Hand (Light)</option>
                    <option value="two_handed">Two Handed</option>
                </select>
            </div>
        </div>
    );
}
