
"use client";

import { useState, useEffect } from "react";
import { useCharacterStore } from "@/store/character-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Shield, Zap, Eye } from "lucide-react";
import { getAvailableFeats, getAvailableTraits, getAvailableSubclasses } from "@/app/actions";
import { ModifierDisplay } from "./ModifierDisplay";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function FeaturesTab() {
    const {
        level,
        classes,
        feats,
        traits,
        addFeat,
        removeFeat,
        addTrait,
        removeTrait,
        classFeatures,
        setSubclass,
        manualProficiencies,
        removeManualProficiency
    } = useCharacterStore();

    // Subclass options per class (keyed by classId)
    const [subclassOptionsMap, setSubclassOptionsMap] = useState<Record<string, any[]>>({});

    // Subclass Availability Logic
    const SUBCLASS_UNLOCK_LEVEL = 3;

    // Find all classes that need subclass selection (level >= 3 and no subclassId set)
    const classesNeedingSubclass = classes.filter(
        (c) => c.level >= SUBCLASS_UNLOCK_LEVEL && !c.subclassId
    );

    // Fetch subclass options for each class that needs one
    useEffect(() => {
        classesNeedingSubclass.forEach((cls) => {
            // Only fetch if we don't already have options for this class
            if (!subclassOptionsMap[cls.classId]) {
                getAvailableSubclasses(cls.classId).then((options) => {
                    setSubclassOptionsMap((prev) => ({
                        ...prev,
                        [cls.classId]: options
                    }));
                });
            }
        });
    }, [classes]); // Re-run when classes change

    const handleSubclassSelect = (classId: string, subId: string) => {
        setSubclass(classId, subId);
    };

    return (
        <div className="space-y-6">
            {/* Subclass Selection Alerts - One per class needing a subclass */}
            {classesNeedingSubclass.map((cls) => {
                const options = subclassOptionsMap[cls.classId] || [];
                if (options.length === 0) return null;

                const className = cls.class?.name || cls.classId;

                return (
                    <div key={cls.classId} className="bg-blue-900/30 border border-blue-800 p-4 rounded-lg flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-blue-300">
                            <Zap className="h-5 w-5" />
                            <span className="font-bold">Subclass Available for {className}</span>
                        </div>
                        <p className="text-sm text-slate-300">
                            Your {className} has reached level {cls.level}. Choose a subclass:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {options.map((sub: any) => (
                                <Button
                                    key={sub.id}
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleSubclassSelect(cls.classId, sub.id)}
                                >
                                    Choose {sub.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* Dev Reset - Show for each class that HAS a subclass */}
            {classes.filter(c => c.subclassId).map((cls) => (
                <div key={`reset-${cls.classId}`} className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-slate-500 hover:text-red-400"
                        onClick={() => setSubclass(cls.classId, null)}
                    >
                        Reset {cls.class?.name || cls.classId} Subclass (Dev)
                    </Button>
                </div>
            ))}

            {/* Class Features */}
            <section className="space-y-3">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Shield className="h-5 w-5 text-indigo-400" />
                    Class Features
                </h3>
                {classFeatures.length === 0 ? (
                    <p className="text-slate-500 text-sm italic">No features unlocked yet.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {classFeatures.map((feat, idx) => (
                            <FeatureCard key={idx} item={feat} />
                        ))}
                    </div>
                )}
            </section>

            {/* Proficiencies */}
            <section className="space-y-3">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Shield className="h-5 w-5 text-blue-400" />
                    Proficiencies
                </h3>
                <TooltipProvider delayDuration={200} skipDelayDuration={100}>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-4">
                        {/* Armor */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Armor</h4>
                                <ManualProficiencyDialog type="armor" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {/* Class/Race Proficiencies (Read-Only) */}
                                {Array.from(new Set(classes.flatMap(c => c.class?.proficiencies?.armor || [])))
                                    .filter(p => p && p.trim() !== '')
                                    .map(p => (
                                        <Tooltip key={`class-${p}`}>
                                            <TooltipTrigger asChild>
                                                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded capitalize border border-slate-700 cursor-help">
                                                    {p}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-xs font-medium">{p} Armor</p>
                                                <p className="text-xs text-slate-400">Wear {p} armor without penalties. From Class.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                {/* Manual Proficiencies */}
                                {(manualProficiencies?.armor || [])
                                    .filter(p => p && p.trim() !== '')
                                    .map(p => (
                                        <div key={`manual-${p}`} className="group relative">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded capitalize border border-blue-800 flex items-center gap-1 cursor-help">
                                                        {p}
                                                        <button
                                                            onClick={() => removeManualProficiency('armor', p)}
                                                            className="hover:text-red-400 focus:outline-none"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="text-xs font-medium">{p} Armor</p>
                                                    <p className="text-xs text-slate-400">Wear {p} armor without penalties. Manually added.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    ))}
                                {Array.from(new Set(classes.flatMap(c => c.class?.proficiencies?.armor || []))).filter(p => p && p.trim() !== '').length === 0 &&
                                    (manualProficiencies?.armor || []).filter(p => p && p.trim() !== '').length === 0 && (
                                        <span className="text-slate-500 text-xs italic">None</span>
                                    )}
                            </div>
                        </div>

                        {/* Weapons */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Weapons</h4>
                                <ManualProficiencyDialog type="weapons" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {/* Class/Race Proficiencies */}
                                {Array.from(new Set(classes.flatMap(c => c.class?.proficiencies?.weapons || [])))
                                    .filter(p => p && p.trim() !== '')
                                    .map(p => (
                                        <Tooltip key={`class-${p}`}>
                                            <TooltipTrigger asChild>
                                                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded capitalize border border-slate-700 cursor-help">
                                                    {p}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-xs font-medium">{p} Weapons</p>
                                                <p className="text-xs text-slate-400">Add proficiency bonus to attacks with {p} weapons. From Class.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                {/* Manual */}
                                {(manualProficiencies?.weapons || [])
                                    .filter(p => p && p.trim() !== '')
                                    .map(p => (
                                        <div key={`manual-${p}`} className="group relative">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded capitalize border border-blue-800 flex items-center gap-1 cursor-help">
                                                        {p}
                                                        <button
                                                            onClick={() => removeManualProficiency('weapons', p)}
                                                            className="hover:text-red-400 focus:outline-none"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="text-xs font-medium">{p} Weapons</p>
                                                    <p className="text-xs text-slate-400">Add proficiency bonus to attacks with {p} weapons. Manually added.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    ))}
                                {Array.from(new Set(classes.flatMap(c => c.class?.proficiencies?.weapons || []))).filter(p => p && p.trim() !== '').length === 0 &&
                                    (manualProficiencies?.weapons || []).filter(p => p && p.trim() !== '').length === 0 && (
                                        <span className="text-slate-500 text-xs italic">None</span>
                                    )}
                            </div>
                        </div>
                    </div>
                </TooltipProvider>
            </section>

            {/* Feats */}
            <FeatureSection
                title="Feats"
                icon={<Zap className="h-5 w-5 text-amber-400" />}
                items={feats}
                onAdd={addFeat}
                onRemove={removeFeat}
                itemName="Feat"
                fetchOptions={getAvailableFeats}
            />

            {/* Racial Traits */}
            <FeatureSection
                title="Racial Traits"
                icon={<Eye className="h-5 w-5 text-emerald-400" />}
                items={traits}
                onAdd={addTrait}
                onRemove={removeTrait}
                itemName="Trait"
                fetchOptions={() => getAvailableTraits(/* TODO: Pass Race ID if available in store */)}
            />
        </div>
    );
}

// Reusable Section for Manual Entries + DB Selection
function FeatureSection({ title, icon, items, onAdd, onRemove, itemName, fetchOptions }: any) {
    const [open, setOpen] = useState(false);

    // Tab state: 'select' | 'custom'
    const [mode, setMode] = useState<'select' | 'custom'>('select');

    // Custom
    const [customName, setCustomName] = useState("");
    const [customDesc, setCustomDesc] = useState("");

    // DB Selection - store full selected object to preserve modifiers
    const [dbOptions, setDbOptions] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [selectedFeatData, setSelectedFeatData] = useState<any>(null);

    useEffect(() => {
        if (open && fetchOptions) {
            fetchOptions().then(setDbOptions);
        }
    }, [open, fetchOptions]);

    // When selecting an option, pre-fill custom fields and switch mode
    const handleSelect = (val: string) => {
        setSelectedId(val);
        const selected = dbOptions.find(o => o.id === val);
        if (selected) {
            let finalDesc = selected.description;
            // Process placeholders
            if (selected.parameters) {
                Object.entries(selected.parameters).forEach(([key, val]) => {
                    finalDesc = finalDesc.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
                });
            }
            setCustomName(selected.name);
            setCustomDesc(finalDesc);
            // Store the full selected object with modifiers
            setSelectedFeatData({
                ...selected,
                description: finalDesc // Use processed description
            });
            setMode('custom');
        }
    };

    const handleSave = () => {
        if (!customName) return;

        // If we have selected data from DB, include modifiers and other fields
        if (selectedFeatData) {
            onAdd({
                id: selectedFeatData.id,
                name: customName,
                description: customDesc,
                modifiers: selectedFeatData.modifiers || [],
                prerequisites: selectedFeatData.prerequisites,
                parameters: selectedFeatData.parameters
            });
        } else {
            // Custom feat without modifiers
            onAdd({ name: customName, description: customDesc, modifiers: [] });
        }

        // Reset
        setCustomName("");
        setCustomDesc("");
        setSelectedId("");
        setSelectedFeatData(null);
        setMode('select');
        setOpen(false);
    };

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    {icon}
                    {title}
                </h3>
                <Dialog open={open} onOpenChange={(val) => {
                    setOpen(val);
                    if (!val) {
                        setMode('select');
                        setCustomName("");
                        setCustomDesc("");
                        setSelectedId("");
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Plus size={16} />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add {itemName}</DialogTitle>
                        </DialogHeader>

                        <div className="flex gap-2 mb-4 border-b border-slate-200 dark:border-slate-700">
                            <Button
                                variant={mode === 'select' ? "secondary" : "ghost"}
                                onClick={() => setMode('select')}
                                className="rounded-b-none flex-1"
                            >
                                Browse
                            </Button>
                            <Button
                                variant={mode === 'custom' ? "secondary" : "ghost"}
                                onClick={() => setMode('custom')}
                                className="rounded-b-none flex-1"
                            >
                                Edit / Custom
                            </Button>
                        </div>

                        <div className="space-y-4 py-2">
                            {mode === 'custom' ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Name</label>
                                        <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={`e.g. Custom ${itemName}`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Description (Edit Parameters)</label>
                                        <Textarea
                                            value={customDesc}
                                            onChange={(e) => setCustomDesc(e.target.value)}
                                            placeholder="Description..."
                                            className="min-h-[100px]"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Select {itemName}</label>
                                    <Select value={selectedId} onValueChange={handleSelect}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={`Choose a ${itemName}...`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {dbOptions.map(opt => (
                                                <SelectItem key={opt.id} value={opt.id}>
                                                    {opt.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-slate-500">Selecting will populate the editor for customization.</p>
                                </div>
                            )}
                            <Button onClick={handleSave} className="w-full">
                                {mode === 'select' ? "Select to Edit" : `Add ${itemName}`}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {items.length === 0 ? (
                <p className="text-slate-500 text-sm italic">None added.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {items.map((item: any, idx: number) => (
                        <FeatureCard
                            key={idx}
                            item={item}
                            onRemove={() => onRemove(idx)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function FeatureCard({ item, onRemove }: { item: any, onRemove?: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const hasModifiers = item.modifiers && item.modifiers.length > 0;

    return (
        <Card
            className={`
                bg-slate-900/50 border-slate-800 relative group transition-all duration-200 cursor-pointer
                ${expanded ? 'col-span-full z-10' : 'hover:bg-slate-800/80'}
            `}
            onClick={() => setExpanded(!expanded)}
        >
            <CardHeader className="p-3 pr-8 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-slate-200">{item.name}</CardTitle>
                {/* Close button removed as requested */}
            </CardHeader>
            <CardContent className={`p-3 pt-0 text-xs text-slate-400 ${!expanded && 'line-clamp-2'}`}>
                {item.description}

                {/* Show modifiers when expanded */}
                {expanded && hasModifiers && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1.5">
                            Effects
                        </span>
                        <ModifierDisplay modifiers={item.modifiers} />
                    </div>
                )}

                {/* Show prerequisites if present */}
                {expanded && item.prerequisites && (
                    <div className="mt-2 text-[10px] text-slate-500">
                        <span className="font-medium">Prerequisites:</span> {item.prerequisites}
                    </div>
                )}
            </CardContent>
            {onRemove && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-950/30 h-6 w-6 p-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                >
                    <Trash2 size={12} />
                </Button>
            )}
        </Card>
    );
}

function ManualProficiencyDialog({ type }: { type: 'armor' | 'weapons' | 'tools' }) {
    const { addManualProficiency } = useCharacterStore();
    const [open, setOpen] = useState(false);
    const [customVal, setCustomVal] = useState("");

    const handleAdd = () => {
        if (!customVal) return;
        addManualProficiency(type, customVal);
        setCustomVal("");
        setOpen(false);
    };

    const suggestions = {
        armor: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
        weapons: ["Simple Weapons", "Martial Weapons", "Improvised Weapons"],
        tools: ["Thieves' Tools", "Herbalism Kit", "Smith's Tools"]
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-800">
                    <Plus size={14} className="text-slate-400" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add {type === 'armor' ? 'Armor' : type === 'weapons' ? 'Weapon' : 'Tool'} Proficiency</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex flex-wrap gap-2">
                        {suggestions[type]?.map(s => (
                            <Button
                                key={s}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                    addManualProficiency(type, s);
                                    setOpen(false);
                                }}
                            >
                                {s}
                            </Button>
                        ))}
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-950 px-2 text-slate-500">Or Custom</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            value={customVal}
                            onChange={(e) => setCustomVal(e.target.value)}
                            placeholder={`Custom ${type}...`}
                        />
                        <Button onClick={handleAdd}>Add</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
