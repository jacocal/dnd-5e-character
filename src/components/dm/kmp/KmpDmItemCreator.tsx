"use client";

import React from "react";
import { useKmpDmItemCreator } from "./KmpDmItemCreatorProvider";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Plus } from "lucide-react";

const ITEM_TYPES = ["Weapon", "Armor", "Wondrous Item", "Consumable", "Adventuring Gear", "Trinket"];
const RARITIES = ["Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact"];
const DAMAGE_TYPES = ["Bludgeoning", "Piercing", "Slashing", "Acid", "Cold", "Fire", "Force", "Lightning", "Necrotic", "Poison", "Psychic", "Radiant", "Thunder"];

const MOD_TYPES = [
    { value: "bonus", label: "Bonus (Stat/AC/Init)" },
    { value: "set", label: "Set Value (Stat/AC)" },
    { value: "skill_proficiency", label: "Skill Proficiency" },
    { value: "weapon_proficiency", label: "Weapon Proficiency" },
    { value: "armor_proficiency", label: "Armor Proficiency" },
    { value: "tool_proficiency", label: "Tool Proficiency" },
    { value: "language", label: "Language" },
    { value: "other", label: "Other / Custom" }
];

const TARGET_OPTIONS: Record<string, string[]> = {
    bonus: ["str", "dex", "con", "int", "wis", "cha", "ac", "initiative", "speed", "hp", "spell_save_dc", "spell_attack"],
    set: ["str", "dex", "con", "int", "wis", "cha", "ac"],
    skill_proficiency: [
        "acrobatics", "animal_handling", "arcana", "athletics", "deception", "history",
        "insight", "intimidation", "investigation", "medicine", "nature", "perception",
        "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival"
    ],
    weapon_proficiency: ["simple", "martial", "longsword", "shortsword", "dagger", "shortbow", "longbow", "axe", "mace"],
    armor_proficiency: ["light", "medium", "heavy", "shields"],
    tool_proficiency: ["thieves_tools", "herbalism_kit", "blacksmith_tools", "alchemist_supplies"],
    language: ["common", "elvish", "dwarvish", "draconic", "celestial", "infernal", "primordial", "undercommon", "sylvan"]
};

const COMMON_TAGS = [
    "finesse", "light", "heavy", "two-handed", "thrown", "reach", "versatile",
    "ammunition", "loading", "focus", "ritual", "silvered", "adamantine"
];

const TAGS_BY_TYPE: Record<string, string[]> = {
    "Weapon": ["finesse", "light", "heavy", "two-handed", "thrown", "reach", "versatile", "ammunition", "loading", "simple", "martial"],
    "Armor": ["light", "medium", "heavy", "shield", "stealth_disadvantage"],
    "Consumable": [],
    "Wondrous Item": ["attunement"],
    "Adventuring Gear": ["tool", "instrument"],
    "Trinket": []
};


export function KmpDmItemCreator() {
    const { viewModel, state, isLoading } = useKmpDmItemCreator();
    const [modType, setModType] = React.useState("bonus");
    const [modTarget, setModTarget] = React.useState("");
    const [modValue, setModValue] = React.useState("");
    const [isCustomTarget, setIsCustomTarget] = React.useState(false);
    const [customTag, setCustomTag] = React.useState("");

    if (isLoading && !state) {
        return <div className="p-8 text-center text-zinc-400"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div>;
    }

    const {
        name, description, type, rarity,
        costAmount, costCurrency, weightAmount, weightUnit, fixedWeight,
        damageDice, damageType, range,
        armorClass, strengthRequirement, stealthDisadvantage,
        slot, uses, usesMax,
        isMagical, requiresAttunement, isCursed,
        trueName, shownEffect, trueEffect, tags,
        modifiers,
        isSubmitting, submissionError, submissionSuccess, createdItemId
    } = state || {};

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        viewModel?.submit();
    };

    const handleAddModifier = () => {
        if (!modTarget) return;
        const mod = {
            type: modType,
            target: modTarget,
            value: Number(modValue) || null, // Parse int or float
            valueString: isNaN(parseInt(modValue)) ? modValue : null
        };
        viewModel?.addModifier(mod);
        setModTarget("");
        setModValue("");
        setIsCustomTarget(false);
    };

    if (submissionSuccess) {
        return (
            <Card className="w-full max-w-2xl mx-auto border-green-500 bg-zinc-950 text-zinc-100">
                <CardHeader>
                    <CardTitle className="text-green-500">Item Created Successfully!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-zinc-300">Item ID: <span className="font-mono text-white">{createdItemId}</span></p>
                    <p className="text-zinc-300">Name: <span className="font-semibold text-white">{name}</span></p>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => viewModel?.reset()} className="bg-amber-600 hover:bg-amber-700 text-white">Create Another</Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-3xl mx-auto bg-zinc-950 border-zinc-800 text-zinc-100 shadow-xl">
            <CardHeader className="border-b border-zinc-800 pb-4">
                <CardTitle className="text-2xl text-amber-500 font-serif tracking-wide">Create Global Item</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {submissionError && (
                        <div className="p-4 bg-red-950/50 border border-red-800 text-red-200 rounded-md flex items-center gap-2">
                            <span className="font-bold">Error:</span> {submissionError}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-zinc-400">Item Name *</Label>
                            <Input
                                id="name"
                                value={name || ""}
                                onChange={(e) => viewModel?.updateName(e.target.value)}
                                required
                                className="bg-zinc-900 border-zinc-700 focus:border-amber-500 text-zinc-100 placeholder:text-zinc-600"
                                placeholder="ex. Longsword of Flame"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type" className="text-zinc-400">Type</Label>
                            <Select value={type || "Weapon"} onValueChange={(v) => viewModel?.updateType(v)}>
                                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                    {ITEM_TYPES.map(t => <SelectItem key={t} value={t} className="focus:bg-zinc-800 focus:text-white cursor-pointer">{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-zinc-400 flex items-center gap-2">
                            Description
                            <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800" title="Stored in DB 'description' column. Visible to all players regardless of identification.">
                                Physical / Generic
                            </span>
                        </Label>
                        <Textarea
                            id="description"
                            value={description || ""}
                            onChange={(e) => viewModel?.updateDescription(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 min-h-[100px] text-zinc-100 placeholder:text-zinc-600"
                            placeholder="Describe the item's appearance and history..."
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rarity" className="text-zinc-400">Rarity</Label>
                            <Select value={rarity || "Common"} onValueChange={(v) => viewModel?.updateRarity(v)}>
                                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                    <SelectValue placeholder="Select rarity" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                    {RARITIES.map(r => <SelectItem key={r} value={r} className="focus:bg-zinc-800 focus:text-white cursor-pointer">{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cost" className="text-zinc-400">Cost</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="cost"
                                    type="number"
                                    value={costAmount || ""}
                                    onChange={(e) => viewModel?.updateCostAmount(parseInt(e.target.value) || null)}
                                    placeholder="0"
                                    className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                                />
                                <Select value={costCurrency || "gp"} onValueChange={(v) => viewModel?.updateCostCurrency(v)}>
                                    <SelectTrigger className="w-[70px] bg-zinc-900 border-zinc-700 text-zinc-100">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                        {["gp", "sp", "cp", "pp", "ep"].map(c => <SelectItem key={c} value={c} className="focus:bg-zinc-800 focus:text-white">{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="weight" className="text-zinc-400">Weight</Label>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <Input
                                        id="weight"
                                        type="number"
                                        step="0.1"
                                        value={weightAmount || ""}
                                        onChange={(e) => viewModel?.updateWeightAmount(parseFloat(e.target.value) || null)}
                                        placeholder="0"
                                        className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                                    />
                                    <span className="flex items-center text-zinc-500 text-sm">lb</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="fixedWeight"
                                        checked={fixedWeight || false}
                                        onCheckedChange={() => viewModel?.toggleFixedWeight()}
                                        className="border-zinc-700 data-[state=checked]:bg-amber-600"
                                    />
                                    <Label htmlFor="fixedWeight" className="text-xs text-zinc-500 cursor-pointer">Fixed Weight</Label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slot" className="text-zinc-400">Slot</Label>
                            <Select value={slot || "none"} onValueChange={(v) => viewModel?.updateSlot(v === "none" ? "" : v)}>
                                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="head">Head</SelectItem>
                                    <SelectItem value="chest">Chest</SelectItem>
                                    <SelectItem value="legs">Legs</SelectItem>
                                    <SelectItem value="hands">Hands</SelectItem>
                                    <SelectItem value="feet">Feet</SelectItem>
                                    <SelectItem value="main_hand">Main Hand</SelectItem>
                                    <SelectItem value="off_hand">Off Hand</SelectItem>
                                    <SelectItem value="finger">Finger</SelectItem>
                                    <SelectItem value="neck">Neck</SelectItem>
                                    <SelectItem value="back">Back</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Combat Stats */}
                    {type === "Weapon" && (
                        <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-4">
                            <h3 className="font-semibold text-xs uppercase text-amber-500/80 tracking-widest">Combat Stats</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="damage" className="text-zinc-400">Damage Dice</Label>
                                    <Input
                                        id="damage"
                                        value={damageDice || ""}
                                        onChange={(e) => viewModel?.updateDamageDice(e.target.value)}
                                        placeholder="1d8"
                                        className="bg-zinc-900 border-zinc-700 text-zinc-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dtype" className="text-zinc-400">Damage Type</Label>
                                    <Select value={damageType || "none"} onValueChange={(v) => viewModel?.updateDamageType(v === "none" ? "" : v)}>
                                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                            <SelectValue placeholder="None" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                            <SelectItem value="none">None</SelectItem>
                                            {DAMAGE_TYPES.map(t => <SelectItem key={t} value={t} className="focus:bg-zinc-800 focus:text-white">{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="range" className="text-zinc-400">Range</Label>
                                    <Input
                                        id="range"
                                        value={range || ""}
                                        onChange={(e) => viewModel?.updateRange(e.target.value)}
                                        placeholder="60/120"
                                        className="bg-zinc-900 border-zinc-700 text-zinc-100"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Defense Stats */}
                    {(type === "Armor" || type === "Shield") && (
                        <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-4">
                            <h3 className="font-semibold text-xs uppercase text-amber-500/80 tracking-widest">Defense Stats</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ac" className="text-zinc-400">Armor Class</Label>
                                    <Input
                                        id="ac"
                                        type="number"
                                        value={armorClass || ""}
                                        onChange={(e) => viewModel?.updateArmorClass(parseInt(e.target.value) || null)}
                                        placeholder="12"
                                        className="bg-zinc-900 border-zinc-700 text-zinc-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="str" className="text-zinc-400">Min Strength</Label>
                                    <Input
                                        id="str"
                                        type="number"
                                        value={strengthRequirement || ""}
                                        onChange={(e) => viewModel?.updateStrength(parseInt(e.target.value) || null)}
                                        placeholder="13"
                                        className="bg-zinc-900 border-zinc-700 text-zinc-100"
                                    />
                                </div>
                                <div className="flex items-center space-x-2 pt-8">
                                    <Checkbox
                                        id="stealth"
                                        checked={stealthDisadvantage || false}
                                        onCheckedChange={() => viewModel?.toggleStealthDisadvantage()}
                                        className="border-zinc-700 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                                    />
                                    <Label htmlFor="stealth" className="text-zinc-300 cursor-pointer">Stealth Disadvantage</Label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Consumable Stats */}
                    {type === "Consumable" && (
                        <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-4">
                            <h3 className="font-semibold text-xs uppercase text-amber-500/80 tracking-widest">Consumable Stats</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="uses" className="text-zinc-400">Uses (Current)</Label>
                                    <Input
                                        id="uses"
                                        type="number"
                                        value={uses || ""}
                                        onChange={(e) => viewModel?.updateUses(parseInt(e.target.value) || null)}
                                        className="bg-zinc-900 border-zinc-700 text-zinc-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="usesMax" className="text-zinc-400">Max Uses</Label>
                                    <Input
                                        id="usesMax"
                                        type="number"
                                        value={usesMax || ""}
                                        onChange={(e) => viewModel?.updateUsesMax(parseInt(e.target.value) || null)}
                                        className="bg-zinc-900 border-zinc-700 text-zinc-100"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Magic & Attributes */}
                    <div className="space-y-4">
                        {/* Magic & Attributes - Hidden for Consumables */}
                        {type !== "Consumable" && (
                            <div className="flex flex-wrap gap-6 p-4 rounded-lg bg-zinc-900/30 border border-zinc-800">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="magical"
                                        checked={isMagical || false}
                                        onCheckedChange={() => viewModel?.toggleMagical()}
                                        className="border-zinc-700 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                    />
                                    <Label htmlFor="magical" className="text-zinc-300 cursor-pointer">Magical</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="attune"
                                        checked={requiresAttunement || false}
                                        onCheckedChange={() => viewModel?.toggleAttunement()}
                                        className="border-zinc-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                    <Label htmlFor="attune" className="text-zinc-300 cursor-pointer">Attunement</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="cursed"
                                        checked={isCursed || false}
                                        onCheckedChange={() => viewModel?.toggleCursed()}
                                        className="border-zinc-700 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                    />
                                    <Label htmlFor="cursed" className="text-zinc-300 cursor-pointer">Cursed</Label>
                                </div>
                            </div>
                        )}

                        {/* Magic Item Details */}
                        {isMagical && (
                            <div className="p-4 rounded-lg border border-purple-900/50 bg-purple-950/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                                <h3 className="font-semibold text-xs uppercase text-purple-400 tracking-widest">Magic Item Details</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="trueName" className="text-zinc-400">True Name (Specific)</Label>
                                        <Input
                                            id="trueName"
                                            value={trueName || ""}
                                            onChange={(e) => viewModel?.updateTrueName(e.target.value)}
                                            placeholder="e.g. Flame Tongue Longsword (if different from generic name)"
                                            className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-700"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="shownEffect" className="text-zinc-400 flex items-center gap-2">
                                                Unidentified Effect
                                                <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800" title="Stored in DB 'shown_effect'. Visible when item is NOT identified.">
                                                    DB: shown_effect
                                                </span>
                                            </Label>
                                            <Textarea
                                                id="shownEffect"
                                                value={shownEffect || ""}
                                                onChange={(e) => viewModel?.updateShownEffect(e.target.value)}
                                                className="bg-zinc-900 border-zinc-700 h-20 text-zinc-100 placeholder:text-zinc-700"
                                                placeholder="Description before identification..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="trueEffect" className="text-zinc-400 flex items-center gap-2">
                                                Identified Effect
                                                <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800" title="Stored in DB 'true_effect'. Visible when item IS identified.">
                                                    DB: true_effect
                                                </span>
                                            </Label>
                                            <Textarea
                                                id="trueEffect"
                                                value={trueEffect || ""}
                                                onChange={(e) => viewModel?.updateTrueEffect(e.target.value)}
                                                className="bg-zinc-900 border-zinc-700 h-20 text-zinc-100 placeholder:text-zinc-700"
                                                placeholder="Full magical properties..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tags - Hidden for Consumables */}
                    {type !== "Consumable" && (
                        <div className="space-y-3">
                            <Label className="text-zinc-400">Tags</Label>

                            {/* Active Tags */}
                            <div className="flex flex-wrap gap-2 mb-2">
                                {tags && tags.map((tag: string) => (
                                    <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-zinc-200 text-xs border border-zinc-700">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => viewModel?.removeTag(tag)}
                                            className="text-zinc-500 hover:text-red-400"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            {/* Add Common Tags (Context Aware) */}
                            <div className="flex flex-wrap gap-2">
                                {(TAGS_BY_TYPE[type || "Weapon"] || COMMON_TAGS).filter(t => !tags?.includes(t)).map(tag => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => viewModel?.addTag(tag)}
                                        className="px-2 py-1 rounded-full border border-zinc-700 bg-zinc-900/50 text-zinc-400 text-xs hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                                    >
                                        + {tag}
                                    </button>
                                ))}
                            </div>

                            {/* Custom Tag Input */}
                            <div className="flex gap-2 max-w-sm mt-2">
                                <Input
                                    value={customTag}
                                    onChange={(e) => setCustomTag(e.target.value)}
                                    placeholder="Add custom tag..."
                                    className="bg-zinc-900 border-zinc-700 h-8 text-xs text-zinc-200"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (customTag.trim()) {
                                                viewModel?.addTag(customTag.trim());
                                                setCustomTag("");
                                            }
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        if (customTag.trim()) {
                                            viewModel?.addTag(customTag.trim());
                                            setCustomTag("");
                                        }
                                    }}
                                    disabled={!customTag.trim()}
                                    className="h-8 text-xs bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                                >
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Modifiers / Proficiencies - Hidden for Consumables */}
                    {type !== "Consumable" && (
                        <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-4">
                            <h3 className="font-semibold text-xs uppercase text-amber-500/80 tracking-widest">Modifiers & Proficiencies</h3>

                            {/* List existing */}
                            <div className="space-y-2">
                                {modifiers && modifiers.map((mod: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-zinc-950 rounded border border-zinc-800 text-sm">
                                        <div className="flex items-center gap-3">
                                            <span className="text-amber-500 font-mono text-xs uppercase bg-amber-950/30 px-2 py-1 rounded">{mod.type.replace('_', ' ')}</span>
                                            <span className="text-zinc-400">→</span>
                                            <span className="text-zinc-200 font-medium">{mod.target.replace('_', ' ')}</span>
                                            {mod.value && <span className="text-emerald-400 font-bold">+{mod.value}</span>}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => viewModel?.removeModifier(idx)}
                                            type="button"
                                            className="text-zinc-500 hover:text-red-400 hover:bg-zinc-900 h-8 w-8 p-0"
                                        >
                                            <span className="sr-only">Remove</span>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {(!modifiers || modifiers.length === 0) && (
                                    <p className="text-zinc-600 text-xs italic text-center py-2">No modifiers added yet.</p>
                                )}
                            </div>

                            {/* Add New */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end pt-2 border-t border-zinc-800/50">
                                <div className="space-y-1">
                                    <Label className="text-xs text-zinc-500">Type</Label>
                                    <Select
                                        value={modType}
                                        onValueChange={(v) => {
                                            setModType(v);
                                            setModTarget("");
                                            setIsCustomTarget(v === "other");
                                        }}
                                    >
                                        <SelectTrigger className="bg-zinc-900 border-zinc-700 h-8 text-xs text-zinc-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
                                            {MOD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label className="text-xs text-zinc-500">Target</Label>
                                    {isCustomTarget || modType === "other" || !TARGET_OPTIONS[modType] ? (
                                        <Input
                                            value={modTarget}
                                            onChange={(e) => setModTarget(e.target.value)}
                                            placeholder="Custom target..."
                                            className="bg-zinc-900 border-zinc-700 h-8 text-xs text-zinc-200"
                                        />
                                    ) : (
                                        <Select
                                            value={modTarget}
                                            onValueChange={(v) => {
                                                if (v === "other") {
                                                    setIsCustomTarget(true);
                                                    setModTarget("");
                                                } else {
                                                    setModTarget(v);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="bg-zinc-900 border-zinc-700 h-8 text-xs text-zinc-200">
                                                <SelectValue placeholder="Select target..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
                                                {TARGET_OPTIONS[modType]?.map(t => (
                                                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                                                ))}
                                                <SelectItem value="other" className="text-amber-500">Other...</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-zinc-500">Value</Label>
                                    <Input
                                        value={modValue}
                                        onChange={(e) => setModValue(e.target.value)}
                                        placeholder="+1"
                                        className="bg-zinc-900 border-zinc-700 h-8 text-xs text-zinc-200"
                                    />
                                </div>
                            </div>
                            <Button
                                type="button"
                                onClick={handleAddModifier}
                                variant="secondary"
                                className="w-full h-8 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 text-xs uppercase tracking-wide"
                                disabled={!modTarget}
                            >
                                <Plus className="w-3 h-3 mr-1" /> Add Modifier
                            </Button>
                        </div>
                    )}

                    <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 mt-6 shadow-lg shadow-amber-900/20" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Creating Item...</>
                        ) : "Create Internal Item"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}


