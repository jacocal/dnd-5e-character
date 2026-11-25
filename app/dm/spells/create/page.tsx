"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const SCHOOLS = [
    "Abjuration", "Conjuration", "Divination", "Enchantment",
    "Evocation", "Illusion", "Necromancy", "Transmutation"
];

const CASTING_TIMES = ["1 Action", "1 Bonus Action", "1 Reaction", "1 Minute", "10 Minutes", "1 Hour"];
const DAMAGE_TYPES = ["Fire", "Cold", "Lightning", "Radiant", "Necrotic", "Force", "Psychic", "Thunder", "Acid", "Poison", "Bludgeoning", "Piercing", "Slashing"];
const CLASSES_LIST = ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard"];

export default function CreateSpellPage() {
    const [name, setName] = useState("");
    const [level, setLevel] = useState(1);
    const [school, setSchool] = useState("Evocation");
    const [castingTime, setCastingTime] = useState("1 Action");
    const [range, setRange] = useState("60 feet");
    const [description, setDescription] = useState("");
    const [isRitual, setIsRitual] = useState(false);
    const [isConcentration, setIsConcentration] = useState(false);
    const [selectedClasses, setSelectedClasses] = useState<string[]>(["wizard", "sorcerer"]);

    // Structured Mechanics
    const [actionType, setActionType] = useState<"attack" | "save" | "heal" | "utility">("attack");
    const [saveAbility, setSaveAbility] = useState("DEX");
    const [saveHalfDamage, setSaveHalfDamage] = useState(true);
    const [damageDice, setDamageDice] = useState("3d6");
    const [damageType, setDamageType] = useState("Fire");
    const [upcastDice, setUpcastDice] = useState("1d6");

    const [submitting, setSubmitting] = useState(false);
    const [createdSpell, setCreatedSpell] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    const toggleClass = (cls: string) => {
        setSelectedClasses((prev) =>
            prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const mechanics: any = {
                actionType,
                attackType: actionType === "attack" ? "ranged_spell" : null,
                saveAbility: actionType === "save" ? saveAbility : null,
                saveHalfDamage: actionType === "save" ? saveHalfDamage : false,
                damage:
                    actionType === "attack" || actionType === "save"
                        ? [{ dice: damageDice, type: damageType.toLowerCase(), flatBonus: 0, addSpellMod: false }]
                        : [],
                healing:
                    actionType === "heal"
                        ? { dice: damageDice, flatBonus: 0, addSpellMod: true }
                        : null,
                upcast:
                    level > 0 && upcastDice.trim()
                        ? { perSlotLevel: 1, bonusDice: upcastDice.trim(), bonusFlat: 0 }
                        : null
            };

            const resp = await fetch("/api/engine/dm/spells", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: "",
                    name,
                    level,
                    school,
                    castingTime,
                    range,
                    isRitual,
                    isConcentration,
                    description,
                    classes: selectedClasses,
                    tags: [actionType],
                    mechanics
                })
            });

            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }
            const data = await resp.json();
            setCreatedSpell(data);
        } catch (err: any) {
            setError(err.message || "Failed to create custom spell");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <Link href="/dm" className="inline-flex items-center text-zinc-400 hover:text-white mb-6 text-sm">
                <ArrowLeft size={16} className="mr-2" /> Back to DM Sandbox
            </Link>

            <Card className="bg-zinc-950 border-zinc-800 text-zinc-100 shadow-xl">
                <CardHeader className="border-b border-zinc-800">
                    <CardTitle className="text-2xl text-purple-400 flex items-center gap-2">
                        <Flame className="w-6 h-6" />
                        Author Custom 5e (2024) Spell
                    </CardTitle>
                </CardHeader>

                <CardContent className="pt-6">
                    {createdSpell ? (
                        <div className="space-y-4 py-4">
                            <div className="p-4 rounded-lg bg-emerald-950/50 border border-emerald-700/50 text-emerald-200 flex items-center gap-3">
                                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                                <div>
                                    <div className="font-bold">Spell Added to Global Grimoire!</div>
                                    <div className="text-xs text-emerald-300 font-mono">
                                        ID: {createdSpell.id} • {createdSpell.name} (Level {createdSpell.level} {createdSpell.school})
                                    </div>
                                </div>
                            </div>
                            <Button
                                onClick={() => {
                                    setCreatedSpell(null);
                                    setName("");
                                    setDescription("");
                                }}
                                className="bg-purple-600 hover:bg-purple-500 text-white"
                            >
                                Create Another Spell
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6 text-sm">
                            {error && (
                                <div className="p-3 rounded bg-red-950/60 border border-red-700 text-red-200 text-xs">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 space-y-1.5">
                                    <Label className="text-zinc-400">Spell Name *</Label>
                                    <Input
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Chronal Lance"
                                        className="bg-zinc-900 border-zinc-700 text-zinc-100"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-zinc-400">Spell Level</Label>
                                    <Select value={String(level)} onValueChange={(v) => setLevel(parseInt(v))}>
                                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                            <SelectItem value="0">Cantrip (0)</SelectItem>
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                                                <SelectItem key={lvl} value={String(lvl)}>
                                                    Level {lvl}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-zinc-400">School</Label>
                                    <Select value={school} onValueChange={setSchool}>
                                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                            {SCHOOLS.map((s) => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-zinc-400">Casting Time</Label>
                                    <Select value={castingTime} onValueChange={setCastingTime}>
                                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                            {CASTING_TIMES.map((c) => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-zinc-400">Range</Label>
                                    <Input
                                        value={range}
                                        onChange={(e) => setRange(e.target.value)}
                                        className="bg-zinc-900 border-zinc-700 text-zinc-100"
                                    />
                                </div>
                            </div>

                            {/* Structured KMP Automation Mechanics */}
                            <div className="p-4 rounded-xl bg-zinc-900/60 border border-purple-900/40 space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                                    Automated Combat & Roll Mechanics
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-zinc-400 text-xs">Resolution Type</Label>
                                        <Select value={actionType} onValueChange={(v: any) => setActionType(v)}>
                                            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                                <SelectItem value="attack">Spell Attack Roll</SelectItem>
                                                <SelectItem value="save">Saving Throw DC</SelectItem>
                                                <SelectItem value="heal">Healing Spell</SelectItem>
                                                <SelectItem value="utility">Utility / Buff</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {actionType === "save" && (
                                        <div className="space-y-1.5">
                                            <Label className="text-zinc-400 text-xs">Target Save Ability</Label>
                                            <Select value={saveAbility} onValueChange={setSaveAbility}>
                                                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                                    {["STR", "DEX", "CON", "INT", "WIS", "CHA"].map((ab) => (
                                                        <SelectItem key={ab} value={ab}>{ab}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {actionType !== "utility" && (
                                        <>
                                            <div className="space-y-1.5">
                                                <Label className="text-zinc-400 text-xs">
                                                    {actionType === "heal" ? "Healing Dice" : "Damage Dice"}
                                                </Label>
                                                <Input
                                                    value={damageDice}
                                                    onChange={(e) => setDamageDice(e.target.value)}
                                                    placeholder="3d6"
                                                    className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono"
                                                />
                                            </div>

                                            {actionType !== "heal" && (
                                                <div className="space-y-1.5">
                                                    <Label className="text-zinc-400 text-xs">Damage Type</Label>
                                                    <Select value={damageType} onValueChange={setDamageType}>
                                                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                                            {DAMAGE_TYPES.map((dt) => (
                                                                <SelectItem key={dt} value={dt}>{dt}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {level > 0 && actionType !== "utility" && (
                                        <div className="space-y-1.5">
                                            <Label className="text-zinc-400 text-xs">Upcast Bonus Dice / Slot</Label>
                                            <Input
                                                value={upcastDice}
                                                onChange={(e) => setUpcastDice(e.target.value)}
                                                placeholder="1d6"
                                                className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Flags & Classes */}
                            <div className="flex flex-wrap gap-6">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="conc"
                                        checked={isConcentration}
                                        onCheckedChange={(v) => setIsConcentration(!!v)}
                                    />
                                    <Label htmlFor="conc" className="cursor-pointer">Requires Concentration</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="ritual"
                                        checked={isRitual}
                                        onCheckedChange={(v) => setIsRitual(!!v)}
                                    />
                                    <Label htmlFor="ritual" className="cursor-pointer">Ritual Tag</Label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-zinc-400">Available to Classes</Label>
                                <div className="flex flex-wrap gap-2">
                                    {CLASSES_LIST.map((cls) => (
                                        <button
                                            key={cls}
                                            type="button"
                                            onClick={() => toggleClass(cls)}
                                            className={`px-3 py-1 rounded-full text-xs uppercase font-bold border transition-colors ${
                                                selectedClasses.includes(cls)
                                                    ? "bg-purple-600 border-purple-400 text-white"
                                                    : "bg-zinc-900 border-zinc-700 text-zinc-400"
                                            }`}
                                        >
                                            {cls}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-zinc-400">Spell Description *</Label>
                                <Textarea
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe the spell's effect..."
                                    className="bg-zinc-900 border-zinc-700 text-zinc-100 min-h-[110px]"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Spell...
                                    </>
                                ) : (
                                    "Add Spell to Global Grimoire"
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
