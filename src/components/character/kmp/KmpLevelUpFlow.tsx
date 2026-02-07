"use client";

import { useState, useEffect } from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronRight, Shield, Heart, Swords, Sparkles, Plus, Minus, Calculator, Dices, RotateCcw, ChevronUp, AlertCircle, Sword } from "lucide-react";
import { getXpForLevel, canLevelUp } from "@/lib/mechanics/leveling"; // Reuse existing mechanics
import { getClassProgression, getAvailableFeats, getAvailableSubclasses } from "@/app/actions"; // Reuse server actions
import { cn } from "@/lib/utils";

// --- Types ---

interface ClassOption {
    id: string;
    name: string;
    hitDie: number;
}

type Step = "select-class" | "choose-subclass" | "choose-hp" | "choose-asi-or-feat" | "allocate-points" | "confirm";

// --- Components ---

function ExpandableSelectionCard({
    title,
    description,
    selected,
    onClick
}: {
    title: string;
    description: string;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <div
            className={cn(
                "border rounded-md transition-all duration-200 overflow-hidden cursor-pointer",
                selected ? "border-amber-400 bg-amber-50/30 dark:border-amber-700 dark:bg-amber-900/20 shadow-sm" : "border-slate-200 hover:border-amber-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
            )}
            onClick={onClick}
        >
            <div className="p-3 flex justify-between items-center gap-2">
                <div className="font-semibold text-sm">{title}</div>
                {selected ? <ChevronUp size={16} className="text-amber-500 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
            </div>

            <div
                className={cn(
                    "text-xs text-muted-foreground px-3 overflow-hidden transition-all duration-300",
                    selected ? "pb-3 max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}
            >
                {description}
            </div>
        </div>
    );
}

// --- Helper Functions (Reused) ---

function getAbilityPointGrant(feat: any): { value: number, allowedStats?: string[] } {
    if (!feat?.modifiers) return { value: 0 };
    const grantMod = feat.modifiers.find((m: any) => m.type === 'ability_point_grant');
    if (!grantMod) return { value: 0 };
    const value = typeof grantMod.value === 'number' ? grantMod.value : 0;
    let allowedStats: string[] | undefined = undefined;
    if (grantMod.condition) {
        allowedStats = grantMod.condition.split(',').map((s: string) => s.trim().toLowerCase());
    }
    return { value, allowedStats };
}

// --- Component ---

export function KmpLevelUpFlow({ classes }: { classes: ClassOption[] }) {
    const { viewModel, state } = useKmpCharacter();
    const character = state.character;

    // Local State
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<Step>("select-class");
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Flow Data
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [selectedSubclass, setSelectedSubclass] = useState<any | null>(null);
    const [hpMode, setHpMode] = useState<"average" | "manual">("average");
    const [hpIncrease, setHpIncrease] = useState<number>(0);
    const [rolledHp, setRolledHp] = useState<number | null>(null); // For roll display

    const [hasAsi, setHasAsi] = useState(false);
    const [asiChoice, setAsiChoice] = useState<"asi" | "feat" | null>(null);
    const [asiBonus, setAsiBonus] = useState<Record<string, number>>({});
    const [selectedFeat, setSelectedFeat] = useState<any | null>(null);
    const [availableFeats, setAvailableFeats] = useState<any[]>([]);
    const [availableSubclasses, setAvailableSubclasses] = useState<any[]>([]);

    // Feat Point Allocation
    const [pointsToAllocate, setPointsToAllocate] = useState(0);
    const [restrictedStats, setRestrictedStats] = useState<string[] | null>(null);
    const [allocationError, setAllocationError] = useState<string | null>(null);

    // Derived Data
    // Fix: Allow level 0 to exist (Reset state)
    const currentLevel = character?.level ?? 1;
    // Fix: Local XP Check for instant reactivity
    const xp = character?.xp || 0;
    const nextXp = getXpForLevel(currentLevel + 1);
    const canLevel = xp >= nextXp;
    const needed = Math.max(0, nextXp - xp);
    const conMod = character ? Math.floor((character.con - 10) / 2) : 0;

    // Available Classes Logic
    const currentClassIds = new Set((character?.classes || []).map((c: any) => c.classId));
    const numDistinctClasses = currentClassIds.size;
    const availableClasses = classes.filter(cls => {
        if (currentClassIds.has(cls.id)) return true;
        return numDistinctClasses < 2; // Limit multi-class to 2 for now as per legacy logic
    });

    const selectedClassOption = classes.find(c => c.id === selectedClassId);


    // --- Handlers ---

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            resetState();
        }
    };

    const resetState = () => {
        setStep("select-class");
        setSelectedClassId(null);
        setSelectedSubclass(null);
        setHpMode("average");
        setHpIncrease(0);
        setRolledHp(null);
        setHasAsi(false);
        setAsiChoice(null);
        setAsiBonus({});
        setSelectedFeat(null);
        setError(null);
        setAvailableFeats([]);
        setAvailableSubclasses([]);
    };

    const handleClassSelect = async (classId: string) => {
        setLoading("Analyzing Class...");
        setSelectedClassId(classId);
        const clsOption = classes.find(c => c.id === classId);

        try {
            // Determine next level for this class
            const currentClassLevel = (character?.classes || []).find((c: any) => c.classId === classId)?.level || 0;
            const nextClassLevel = currentClassLevel + 1;

            // Check ASI
            const progression = await getClassProgression(classId, nextClassLevel);
            const hasAsiNow = progression?.hasAsi || false;
            setHasAsi(hasAsiNow);

            // Default HP (Average)
            if (clsOption) {
                const avg = Math.floor(clsOption.hitDie / 2) + 1 + conMod;
                setHpIncrease(avg);
                setHpMode("average");
            }

            // Subclass check (Level 3)
            const currentSubclassId = (character?.classes || []).find((c: any) => c.classId === classId)?.subclassId;

            console.log(`[LevelUpDebug] Class ${classId} -> Next Lvl: ${nextClassLevel}, Current Subclass: ${currentSubclassId}`);

            if (nextClassLevel === 3 && !currentSubclassId) {
                const subs = await getAvailableSubclasses(classId);
                console.log(`[LevelUpDebug] Available Subclasses:`, subs);

                // Prompt if subclasses are available
                if (subs && subs.length > 0) {
                    setAvailableSubclasses(subs);
                    setStep("choose-subclass");
                    setLoading(null);
                    return;
                } else {
                    console.error("[LevelUp] No subclasses found for class", classId);
                    setError(`No subclasses found for ${clsOption?.name}. Please run database seed.`);
                    setLoading(null);
                    return;
                }
            }

            // Normal Flow
            if (character?.level === 0) {
                // Should not happen in KMP app usually? But if so, max HP.
                if (clsOption) setHpIncrease(clsOption.hitDie + conMod);
            }

            setStep("choose-hp");

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(null);
        }
    };

    const handleReset = async () => {
        if (!confirm("Are you sure? This will reset you to Level 1 and remove all multiclassing.")) return;
        setLoading("Resetting...");
        try {
            const { resetCharacterLevel } = await import("@/app/actions");
            await resetCharacterLevel(character.id);

            // Refresh KMP
            viewModel.loadCharacter(character.id);
            setOpen(false);
            window.location.reload();
        } catch (e: any) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading(null);
        }
    };

    const handleRollHp = () => {
        if (!selectedClassOption) return;
        const roll = Math.floor(Math.random() * selectedClassOption.hitDie) + 1;
        const total = Math.max(1, roll + conMod);
        setRolledHp(total);
        setHpIncrease(total);
        setHpMode("manual");
    };

    const handleHpConfirm = () => {
        if (hasAsi) {
            setStep("choose-asi-or-feat");
        } else {
            setStep("confirm");
            submitLevelUp(); // Direct submit if no ASI? Or show review? strict flow says Review.
            // Let's do direct submit for speed if no choices left.
        }
    };

    const submitLevelUp = async () => {
        if (!selectedClassId || !character) return;
        setLoading("Leveling Up via KMP...");
        setError(null);

        try {
            // Construct LevelUpData
            // KMP expects LevelUpData: (characterId, classId, hpIncrease, hpMode, subclassId?, featId?, asi?)

            // ASI JSON
            let asiJson = null;
            if ((asiChoice === "asi" || (asiChoice === "feat" && pointsToAllocate > 0)) && Object.keys(asiBonus).length > 0) {
                // Convert {"str": 2} to ASI object structure if needed by KMP, 
                // but KMP LevelUpData.kt defines asi as AbilityScoreImprovement class.
                // The Repository map helper converts it.
                // We need to pass a cleaner object matching `AbilityScoreImprovement` Kotlin class structure.
                // { str: 0, dex: 0 ... }

                asiJson = {
                    str: asiBonus["str"] || 0,
                    dex: asiBonus["dex"] || 0,
                    con: asiBonus["con"] || 0,
                    int: asiBonus["int"] || 0,
                    wis: asiBonus["wis"] || 0,
                    cha: asiBonus["cha"] || 0
                };
            }

            // Feat logic is tricky because `LevelUpData` takes a `featId`.
            // But if the feat grants points, we might need a separate flow?
            // The design said `levelUp` handles it.
            // If we have points to allocate from a feat, we need to handle that *before* calling levelUp?
            // Or does `levelUp` accept the alloc? 
            // Current KMP `LevelUpData` has `asi`. If feat grants points, we probably need to handle that.
            // Wait, the KMP `LevelUpData` *only* takes `featId`. It doesn't seem to take "feat extra choices".
            // We might need to handle "feat with choices" by adding the feat separately via standard API?
            // Actually, `LevelUpData` in Kotlin has `asi`.
            // If the Feat grants points (Actor +1 Cha), `featId` adds the feat.
            // Does `featId` automatically apply the +1? 
            // We'll assume the backend handles the static +1. 
            // If the feat allows a CHOICE (Resilient +1 Any), the `LevelUpInput` might be insufficient if strictly atomic.
            // However, `LevelUpDialog.tsx` legacy handles allocation locally then calls `grantAbilityPoints` and `addFeat` *separately*.

            // KMP Refactor Goal: `levelUp` mutation should be atomic.
            // Does `LevelUpInput` support "Feat Choice"?
            // Looking at `schema.graphqls`: `input LevelUpInput { ... asi: JSON }`.
            // It doesn't seem to have "Feat Selection Choice".
            // So for now, we will stick to: 
            // 1. If ASI -> Pass `asi` object.
            // 2. If Feat -> Pass `featId`. If that feat requires choices... we might be stuck.
            // For Phase 3 MVP, let's assume standard feats or handled by backend.

            // Wait, `KmpLevelUpWizard` implementation plan said:
            // "Calls viewModel.levelUp(input) on completion."

            const input = {
                characterId: character.id,
                classId: selectedClassId,
                hpIncrease: hpIncrease,
                hpMode: hpMode,
                subclassId: selectedSubclass?.id,
                featId: selectedFeat?.id,
                asi: asiJson
            };

            console.log("Submitting Level Up:", input);
            await viewModel.levelUp(input);

            setOpen(false); // Close on success (KMP optimistically updates or reloads)

        } catch (e: any) {
            console.error(e);
            setError(e.message || "Level Up Failed");
        } finally {
            setLoading(null);
        }
    };


    // --- Render ---

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-800/50 dark:text-amber-500",
                        !canLevel && "opacity-50 cursor-not-allowed hidden"
                    )}
                    disabled={!canLevel}
                >
                    {currentLevel === 0 ? <Sparkles size={16} /> : <ChevronUp size={16} />}
                    {currentLevel === 0 ? "Setup Class" : "Level Up"}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {step === "select-class"
                            ? (currentLevel === 0 ? "Initial Class Selection" : `Level Up (Level ${currentLevel + 1})`)
                            : "Next Step"
                        }
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-1">
                    {/* Error Banner */}
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2 mb-4">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {step === "select-class" && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {currentLevel === 0
                                    ? "Select your character's first class."
                                    : `You have enough XP to reach level ${currentLevel + 1}. Choose a class to advance.`
                                }
                            </p>

                            <div className="grid grid-cols-1 gap-2">
                                {availableClasses.map(cls => {
                                    const isCurrent = currentClassIds.has(cls.id);
                                    const classLevel = (character?.classes || []).find((c: any) => c.classId === cls.id)?.level || 0;

                                    return (
                                        <Button
                                            key={cls.id}
                                            variant="ghost"
                                            className={cn(
                                                "justify-between h-auto py-3 px-4 border",
                                                isCurrent ? "border-amber-200 bg-amber-50/50" : "border-slate-100"
                                            )}
                                            onClick={() => handleClassSelect(cls.id)}
                                            disabled={!!loading}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-full", isCurrent ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500")}>
                                                    <Sword size={16} />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-semibold">
                                                        {cls.name}
                                                        {isCurrent && <span className="text-xs text-amber-600 ml-2">(Lvl {classLevel} → {classLevel + 1})</span>}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">d{cls.hitDie} Hit Die</div>
                                                </div>
                                            </div>
                                            {isCurrent && <ChevronRight size={16} className="text-amber-400" />}
                                        </Button>
                                    );
                                })}
                            </div>

                            <div className="pt-2 border-t mt-4">
                                <Button
                                    variant="destructive"
                                    className="w-full gap-2"
                                    onClick={handleReset}
                                    disabled={!!loading}
                                >
                                    <RotateCcw size={16} />
                                    Reset to Level 1
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === "choose-subclass" && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg text-center">Choose a Subclass</h3>
                            <p className="text-sm text-muted-foreground text-center">
                                You reached Level 3! It's time to specialize.
                            </p>

                            {loading ? (
                                <div className="text-center p-4">Loading subclasses...</div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {availableSubclasses.map((sub) => (
                                        <ExpandableSelectionCard
                                            key={sub.id}
                                            title={sub.name}
                                            description={sub.description}
                                            selected={selectedSubclass?.id === sub.id}
                                            onClick={() => setSelectedSubclass(selectedSubclass?.id === sub.id ? null : sub)}
                                        />
                                    ))}
                                </div>
                            )}

                            <Button
                                className="w-full mt-4"
                                onClick={() => {
                                    // Proceed to HP
                                    // We need to re-trigger the HP logic part of handleClassSelect? 
                                    // Or just duplicate it here?
                                    // `handleClassSelect` does a lot.
                                    // Let's just manually set next step since we already did the "Analyze Class" part before checking subclass.
                                    // Wait, `handleClassSelect` STOPS if subclass is needed.
                                    // So we haven't calculated HP yet?
                                    // Yes, we returned early.

                                    // We need to determine HP mode for the selected class (which is already in state `selectedClassId`).
                                    // Let's extract HP logic or just run it here.

                                    if (!selectedClassOption) return;
                                    const avg = Math.floor(selectedClassOption.hitDie / 2) + 1 + conMod;
                                    setHpIncrease(avg);
                                    setHpMode("average");
                                    setStep("choose-hp");
                                }}
                                disabled={!selectedSubclass}
                            >
                                Confirm Subclass
                            </Button>
                        </div>
                    )}

                    {step === "choose-hp" && selectedClassOption && (
                        <div className="space-y-4">
                            <div className="text-center space-y-1">
                                <h3 className="font-bold text-lg">{selectedClassOption.name}</h3>
                                <p className="text-sm text-muted-foreground">Determine HP Increase</p>
                            </div>

                            {currentLevel === 0 ? (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-md text-center">
                                    <div className="font-semibold text-green-700">Level 1: Max HP</div>
                                    <div className="text-3xl font-bold mt-2">+{hpIncrease}</div>
                                    <div className="text-xs text-muted-foreground mt-1">Hit Die ({selectedClassOption.hitDie}) + CON ({conMod})</div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant={hpMode === "average" ? "default" : "outline"}
                                        className="h-auto py-6 flex-col gap-2"
                                        onClick={() => {
                                            const avg = Math.floor(selectedClassOption.hitDie / 2) + 1 + conMod;
                                            setHpMode("average");
                                            setHpIncrease(avg);
                                        }}
                                    >
                                        <Calculator size={24} />
                                        <div className="font-semibold">Take Average</div>
                                        <div className="text-2xl font-bold">+{Math.floor(selectedClassOption.hitDie / 2) + 1 + conMod}</div>
                                    </Button>

                                    <Button
                                        variant={hpMode === "manual" ? "default" : "outline"}
                                        className="h-auto py-6 flex-col gap-2 relative"
                                        onClick={handleRollHp}
                                    >
                                        <Dices size={24} />
                                        <div className="font-semibold">{rolledHp ? "Reroll" : "Roll"}</div>
                                        {rolledHp !== null ? (
                                            <div className="text-2xl font-bold">+{rolledHp}</div>
                                        ) : (
                                            <div className="text-sm opacity-50">1d{selectedClassOption.hitDie} + {conMod}</div>
                                        )}
                                    </Button>
                                </div>
                            )}

                            <Button className="w-full mt-4" onClick={handleHpConfirm} disabled={!!loading}>
                                Continue
                            </Button>
                        </div>
                    )}

                    {step === "confirm" && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-center">Confirm Level Up</h3>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-md space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Class:</span>
                                    <span className="font-semibold">{selectedClassOption?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>HP Gain:</span>
                                    <span className="font-semibold text-green-600">+{hpIncrease}</span>
                                </div>
                                {asiChoice === 'asi' && (
                                    <div className="flex justify-between">
                                        <span>ASI:</span>
                                        <span className="font-semibold">{Object.entries(asiBonus).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(", ")}</span>
                                    </div>
                                )}
                                {asiChoice === 'feat' && selectedFeat && (
                                    <div className="flex justify-between">
                                        <span>Feat:</span>
                                        <span className="font-semibold">{selectedFeat.name}</span>
                                    </div>
                                )}
                            </div>

                            <Button className="w-full" onClick={() => submitLevelUp()}>
                                Confirm & Apply
                            </Button>
                        </div>
                    )}

                    {step === "choose-asi-or-feat" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant={asiChoice === "asi" ? "default" : "outline"}
                                    onClick={() => { setAsiChoice("asi"); setSelectedFeat(null); setAsiBonus({}); }}
                                    className="h-auto py-3 flex-col"
                                >
                                    <Plus className="mb-1" />
                                    <span>Ability Score</span>
                                </Button>
                                <Button
                                    variant={asiChoice === "feat" ? "default" : "outline"}
                                    onClick={async () => {
                                        setAsiChoice("feat");
                                        setAsiBonus({});
                                        setLoading("Loading Feats...");
                                        const feats = await getAvailableFeats();
                                        // Filter feats logic (exclude existing)
                                        const existingIds = new Set((character?.feats || []).map((f: any) => f.id));
                                        setAvailableFeats(feats.filter((f: any) => !existingIds.has(f.id)));
                                        setLoading(null);
                                    }}
                                    className="h-auto py-3 flex-col"
                                >
                                    <Sparkles className="mb-1" />
                                    <span>Feat</span>
                                </Button>
                            </div>

                            {asiChoice === 'asi' && (
                                <div className="space-y-2">
                                    <p className="text-sm text-center">Distribute 2 Points</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(["str", "dex", "con", "int", "wis", "cha"] as const).map(stat => {
                                            const bonus = asiBonus[stat] || 0;
                                            const usedPoints = Object.values(asiBonus).reduce((a, b) => a + b, 0);
                                            return (
                                                <div key={stat} className="bg-slate-50 dark:bg-slate-800 p-2 rounded text-center">
                                                    <div className="text-xs font-bold uppercase">{stat}</div>
                                                    <div className="font-bold">{(character?.[stat] || 10) + bonus}</div>
                                                    <div className="flex justify-center gap-1 mt-1">
                                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={bonus <= 0} onClick={() => setAsiBonus(prev => ({ ...prev, [stat]: (prev[stat] || 0) - 1 }))}>-</Button>
                                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={usedPoints >= 2} onClick={() => setAsiBonus(prev => ({ ...prev, [stat]: (prev[stat] || 0) + 1 }))}>+</Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                </div>
                            )}

                            {asiChoice === 'feat' && (
                                <div className="space-y-4">
                                    {loading ? (
                                        <div className="text-center p-4">Loading feats...</div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 gap-2">
                                                {availableFeats.length === 0 ? (
                                                    <div className="text-center text-muted-foreground p-4 bg-slate-50 rounded">No available feats found.</div>
                                                ) : (
                                                    availableFeats.map((feat) => (
                                                        <ExpandableSelectionCard
                                                            key={feat.id}
                                                            title={feat.name}
                                                            description={feat.description}
                                                            selected={selectedFeat?.id === feat.id}
                                                            onClick={() => {
                                                                if (selectedFeat?.id === feat.id) {
                                                                    // Deselect
                                                                    setSelectedFeat(null);
                                                                    setAsiBonus({});
                                                                    setPointsToAllocate(0);
                                                                    setRestrictedStats(null);
                                                                } else {
                                                                    // Select
                                                                    console.log("Selected Feat:", feat);
                                                                    setSelectedFeat(feat);
                                                                    setAsiBonus({}); // Reset previous choices

                                                                    // Parse Modifiers for Grants
                                                                    const grant = feat.modifiers?.find((m: any) => m.type === "ability_point_grant");
                                                                    if (grant) {
                                                                        console.log("Grant found:", grant);
                                                                        setPointsToAllocate(grant.value);
                                                                        setRestrictedStats(grant.condition ? grant.condition.split(',') : null);
                                                                    } else {
                                                                        setPointsToAllocate(0);
                                                                        setRestrictedStats(null);
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    ))
                                                )}
                                            </div>




                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {step === "choose-asi-or-feat" && (
                    <div className="p-4 border-t bg-background flex-none z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                        {asiChoice === "asi" && (
                            <Button className="w-full" onClick={() => setStep("confirm")} disabled={Object.values(asiBonus).reduce((a, b) => a + b, 0) !== 2}>Review</Button>
                        )}
                        {asiChoice === "feat" && (
                            <div className="space-y-4">
                                {selectedFeat && pointsToAllocate > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold text-center text-amber-700">
                                            Bonus: Increase {restrictedStats ? restrictedStats.join(" or ").toUpperCase() : "any stat"} by {pointsToAllocate}
                                        </p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(["str", "dex", "con", "int", "wis", "cha"] as const).map(stat => {
                                                const isRestricted = restrictedStats && !restrictedStats.includes(stat);
                                                if (isRestricted) return null;

                                                const bonus = asiBonus[stat] || 0;
                                                return (
                                                    <div key={stat} className="bg-slate-50 dark:bg-slate-800 p-2 rounded text-center">
                                                        <div className="text-xs font-bold uppercase">{stat}</div>
                                                        <div className="font-bold">{(character?.[stat] || 10) + bonus}</div>
                                                        <div className="flex justify-center gap-1 mt-1">
                                                            <Button
                                                                size="sm" variant="ghost" className="h-6 w-6 p-0"
                                                                disabled={bonus <= 0}
                                                                onClick={() => setAsiBonus(prev => ({ ...prev, [stat]: (prev[stat] || 0) - 1 }))}
                                                            >-</Button>
                                                            <Button
                                                                size="sm" variant="ghost" className="h-6 w-6 p-0"
                                                                disabled={Object.values(asiBonus).reduce((a, b) => a + b, 0) >= pointsToAllocate}
                                                                onClick={() => setAsiBonus(prev => ({ ...prev, [stat]: (prev[stat] || 0) + 1 }))}
                                                            >+</Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                <Button
                                    className="w-full"
                                    onClick={() => setStep("confirm")}
                                    disabled={!selectedFeat || (pointsToAllocate > 0 && Object.values(asiBonus).reduce((a, b) => a + b, 0) !== pointsToAllocate)}
                                >
                                    Review Selection
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog >
    );
}
