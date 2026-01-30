"use client";

import React, { useState } from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Shield, Zap, Eye, Trash2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function KmpFeaturesTab() {
    const { state, viewModel } = useKmpCharacter();
    const character = state?.character;

    if (!character) return null;

    const { feats, traits } = character;
    const raceTraits = traits || [];
    const charFeats = feats || [];
    const classFeatures = state.resolvedFeatures || [];
    const proficiencies = state.resolvedProficiencies;

    return (
        <div className="space-y-8">
            {/* Proficiencies */}
            <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-500" />
                        Proficiencies
                    </h3>
                    <AddProficiencyDialog viewModel={viewModel} />
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <ProficiencyGroup
                        title="Armor"
                        items={proficiencies?.armor || []}
                        onRemove={(p) => viewModel.removeManualProficiency("armor", p.name)}
                    />
                    <ProficiencyGroup
                        title="Weapons"
                        items={proficiencies?.weapons || []}
                        onRemove={(p) => viewModel.removeManualProficiency("weapon", p.name)}
                    />
                    <ProficiencyGroup
                        title="Tools"
                        items={proficiencies?.tools || []}
                        onRemove={(p) => viewModel.removeManualProficiency("tool", p.name)}
                    />
                </div>
            </section>

            {/* Class Features */}
            <FeatureSection
                title="Class Features"
                icon={Shield}
                iconColor="text-indigo-500"
                items={classFeatures}
                emptyText="No class features resolved."
            />

            {/* Feats */}
            <FeatureSection
                title="Feats"
                icon={Zap}
                iconColor="text-amber-500"
                items={charFeats}
                emptyText="No feats acquired yet."
            />

            {/* Racial Traits */}
            <FeatureSection
                title="Racial Traits"
                icon={Eye}
                iconColor="text-emerald-500"
                items={raceTraits}
                emptyText="No racial traits."
            />
        </div>
    );
}

function ProficiencyGroup({ title, items, onRemove }: { title: string, items: any[], onRemove: (item: any) => void }) {
    if (!items || items.length === 0) return null;
    return (
        <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</h4>
            <div className="flex flex-wrap gap-2">
                {items.map((p: any, idx) => (
                    <TooltipProvider key={idx}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className={`
                                    text-xs font-medium px-2.5 py-1 rounded-md capitalize border flex items-center gap-1.5
                                    ${p.source === 'Manual'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}
                                `}>
                                    {p.name}
                                    {p.source === 'Manual' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRemove(p); }}
                                            className="hover:text-red-500 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Source: {p.source}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </div>
        </div>
    );
}

const PROFICIENCY_OPTIONS: Record<string, { label: string, value: string }[]> = {
    armor: [
        { label: "Light Armor", value: "light" },
        { label: "Medium Armor", value: "medium" },
        { label: "Heavy Armor", value: "heavy" },
        { label: "Shields", value: "shield" }
    ],
    weapon: [
        { label: "Simple Weapons", value: "simple" },
        { label: "Martial Weapons", value: "martial" }
    ],
    tool: [
        "Alchemist's Supplies", "Brewer's Supplies", "Calligrapher's Supplies", "Carpenter's Tools", "Cartographer's Tools",
        "Cobbler's Tools", "Cook's Utensils", "Glassblower's Tools", "Jeweler's Tools", "Leatherworker's Tools",
        "Mason's Tools", "Painter's Supplies", "Potter's Tools", "Smith's Tools", "Tinker's Tools", "Weaver's Tools", "Woodcarver's Tools",
        "Disguise Kit", "Forgery Kit", "Herbalism Kit", "Navigator's Tools", "Poisoner's Kit", "Thieves' Tools",
        "Gaming Set (Dice)", "Gaming Set (Dragonchess)", "Gaming Set (Playing Cards)", "Gaming Set (Three-Dragon Ante)",
        "Musical Instrument (Bagpipes)", "Musical Instrument (Drum)", "Musical Instrument (Dulcimer)", "Musical Instrument (Flute)",
        "Musical Instrument (Lute)", "Musical Instrument (Lyre)", "Musical Instrument (Horn)", "Musical Instrument (Pan Flute)",
        "Musical Instrument (Shawm)", "Musical Instrument (Viol)",
        "Land Vehicles", "Water Vehicles"
    ].map(t => ({ label: t, value: t }))
};

function AddProficiencyDialog({ viewModel }: { viewModel: any }) {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState("tool");
    const [mode, setMode] = useState<"preset" | "custom">("preset");
    const [presetValue, setPresetValue] = useState("");
    const [customValue, setCustomValue] = useState("");

    const handleSave = () => {
        const value = mode === "preset" ? presetValue : customValue;
        if (value.trim()) {
            viewModel.addManualProficiency(type, value.trim());
            setOpen(false);
            setPresetValue("");
            setCustomValue("");
        }
    };

    const currentOptions = PROFICIENCY_OPTIONS[type] || [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px] uppercase font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    <Plus className="h-3 w-3" /> Add
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] w-[95vw]">
                <DialogHeader>
                    <DialogTitle>Add Proficiency</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={(val) => { setType(val); setPresetValue(""); }}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="tool">Tool</SelectItem>
                                <SelectItem value="weapon">Weapon</SelectItem>
                                <SelectItem value="armor">Armor</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Selection Mode</Label>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => setMode("preset")}
                                className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition-all", mode === "preset" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700")}
                            >
                                Preset
                            </button>
                            <button
                                onClick={() => setMode("custom")}
                                className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition-all", mode === "custom" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700")}
                            >
                                Custom
                            </button>
                        </div>
                    </div>

                    {mode === "preset" ? (
                        <div className="grid gap-2">
                            <Label>Choose Proficiency</Label>
                            <Select value={presetValue} onValueChange={setPresetValue}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {currentOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            <Label>Name</Label>
                            <Input
                                value={customValue}
                                onChange={(e) => setCustomValue(e.target.value)}
                                placeholder="e.g. Cook's Utensils"
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            />
                        </div>
                    )}

                    <Button onClick={handleSave} disabled={mode === "preset" ? !presetValue : !customValue}>
                        Add Proficiency
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function FeatureSection({ title, icon: Icon, iconColor, items, emptyText }: any) {
    if (!items || items.length === 0) {
        return (
            <section className="space-y-3">
                <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                    {title}
                </h3>
                <p className="text-slate-400 text-sm italic py-2">{emptyText}</p>
            </section>
        );
    }

    return (
        <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <Icon className={`h-4 w-4 ${iconColor}`} />
                {title}
            </h3>

            {/* Mobile: Grid of Cards */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden`}>
                {items.map((item: any, idx: number) => (
                    <FeatureCard key={idx} item={item} />
                ))}
            </div>

            {/* Desktop: List Rows */}
            <div className={`hidden md:flex flex-col gap-px bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden`}>
                {items.map((item: any, idx: number) => (
                    <FeatureRow key={idx} item={item} isLast={idx === items.length - 1} />
                ))}
            </div>
        </section>
    );
}

function FeatureCard({ item }: { item: any }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <Card
            className={`
                bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all duration-200 cursor-pointer shadow-sm
                ${expanded ? 'ring-2 ring-indigo-500/20' : 'hover:border-slate-300 dark:hover:border-slate-700'}
            `}
            onClick={() => setExpanded(!expanded)}
        >
            <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex justify-between w-full">
                    <span>{item.name}</span>
                    {item.level && <span className="text-xs font-normal text-slate-400">Lvl {item.level}</span>}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
                <p className={`text-xs text-slate-500 dark:text-slate-400 leading-relaxed ${!expanded && 'line-clamp-3'}`}>
                    {item.description || "No description available."}
                </p>

                {expanded && item.modifiers && item.modifiers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/50 flex flex-wrap gap-1">
                        {item.modifiers.map((mod: any, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[10px] h-5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {mod.target} {mod.value > 0 ? '+' : ''}{mod.value ?? mod.valueString}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function FeatureRow({ item, isLast }: { item: any, isLast: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const hasModifiers = item.modifiers && item.modifiers.length > 0;

    return (
        <div className="group bg-white dark:bg-slate-900">
            <div
                className={cn(
                    "flex items-center justify-between p-3 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    expanded && "bg-slate-50 dark:bg-slate-800/50"
                )}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{item.name}</span>
                    {hasModifiers && (
                        <div className="flex gap-1">
                            {item.modifiers.slice(0, 2).map((mod: any, i: number) => (
                                <span key={i} className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                                    {mod.target}
                                </span>
                            ))}
                            {item.modifiers.length > 2 && <span className="text-[10px] text-slate-400">+{item.modifiers.length - 2}</span>}
                        </div>
                    )}
                </div>
                {item.level && <span className="text-xs font-mono text-slate-400">Lvl {item.level}</span>}
            </div>

            {expanded && (
                <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400 leading-relaxed animate-in slide-in-from-top-1 duration-200">
                    <p>{item.description || "No description available."}</p>

                    {hasModifiers && (
                        <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800 flex flex-wrap gap-2">
                            {item.modifiers.map((mod: any, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                                    {mod.target}: {mod.value > 0 ? '+' : ''}{mod.value ?? mod.valueString}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
