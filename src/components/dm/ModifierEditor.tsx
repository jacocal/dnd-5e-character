"use client";

import React from "react";
import { Plus, X } from "lucide-react";

// Matches ModifierSchema from schemas.ts
export type Modifier = {
    type: 'bonus' | 'set' | 'override' | 'proficiency' | 'language' | 'expertise' | 'skill_proficiency' | 'ability_increase' | 'saving_throw_proficiency' | 'armor_proficiency' | 'weapon_proficiency';
    target: string;
    value: number | boolean | string;
    condition?: string;
    max?: number; // for ability_increase
};

const MODIFIER_TYPES = [
    'bonus', 'set', 'override',
    'proficiency', 'expertise', 'skill_proficiency',
    'saving_throw_proficiency', 'armor_proficiency', 'weapon_proficiency',
    'language', 'ability_increase'
];

interface ModifierEditorProps {
    value: Modifier[];
    onChange: (value: Modifier[]) => void;
}

export function ModifierEditor({ value, onChange }: ModifierEditorProps) {
    const addModifier = () => {
        onChange([
            ...value,
            { type: 'bonus', target: 'str', value: 1 }
        ]);
    };

    const removeModifier = (index: number) => {
        const newValue = [...value];
        newValue.splice(index, 1);
        onChange(newValue);
    };

    const updateModifier = (index: number, field: keyof Modifier, newVal: any) => {
        const newValue = [...value];
        newValue[index] = { ...newValue[index], [field]: newVal };
        onChange(newValue);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300">Modifiers</label>
                <button
                    type="button"
                    onClick={addModifier}
                    className="text-xs flex items-center gap-1 text-amber-500 hover:text-amber-400"
                >
                    <Plus size={14} /> Add Modifier
                </button>
            </div>

            {value.length === 0 && (
                <p className="text-xs text-zinc-500 italic">No modifiers added.</p>
            )}

            <div className="space-y-2">
                {value.map((mod, index) => (
                    <div key={index} className="flex gap-2 items-start bg-zinc-900/50 p-2 rounded border border-zinc-800">
                        <div className="flex-1 grid grid-cols-12 gap-2">
                            {/* Type */}
                            <div className="col-span-3">
                                <select
                                    value={mod.type}
                                    onChange={(e) => updateModifier(index, 'type', e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
                                >
                                    {MODIFIER_TYPES.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Target */}
                            <div className="col-span-3">
                                <input
                                    type="text"
                                    placeholder="Target (e.g. str, ac)"
                                    value={mod.target}
                                    onChange={(e) => updateModifier(index, 'target', e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
                                />
                            </div>

                            {/* Value */}
                            <div className="col-span-2">
                                <input
                                    type="text" // using text to handle number/string
                                    placeholder="Value"
                                    value={String(mod.value)}
                                    onChange={(e) => {
                                        // Auto-convert to number if possible
                                        const val = e.target.value;
                                        const num = parseFloat(val);
                                        updateModifier(index, 'value', isNaN(num) ? val : num);
                                    }}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
                                />
                            </div>

                            {/* Condition */}
                            <div className="col-span-4">
                                <input
                                    type="text"
                                    placeholder="Condition (opt)"
                                    value={mod.condition || ''}
                                    onChange={(e) => updateModifier(index, 'condition', e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => removeModifier(index)}
                            className="text-zinc-500 hover:text-red-400 p-1"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
