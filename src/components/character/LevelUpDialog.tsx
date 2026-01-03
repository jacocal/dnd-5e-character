"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronUp, Shield, Sword, RotateCcw, Dices, Calculator, Sparkles, Plus, Minus, AlertCircle } from "lucide-react";
import { useCharacterStore } from "@/store/character-store";
import { canLevelUp, getXpForLevel } from "@/lib/mechanics/leveling";
import { resetCharacterLevel, getAvailableFeats, getClassProgression } from "@/app/actions";

// Helper: Get ability point grant value from a feat's modifiers
// Helper: Get ability point grant details from a feat's modifiers
function getAbilityPointGrant(feat: any): { value: number, allowedStats?: string[] } {
    if (!feat?.modifiers) return { value: 0 };
    const grantMod = feat.modifiers.find((m: any) => m.type === 'ability_point_grant');

    if (!grantMod) return { value: 0 };

    const value = typeof grantMod.value === 'number' ? grantMod.value : 0;

    // Parse condition for allowed stats (e.g. "int,wis,cha")
    let allowedStats: string[] | undefined = undefined;
    if (grantMod.condition) {
        allowedStats = grantMod.condition.split(',').map((s: string) => s.trim().toLowerCase());
    }

    return { value, allowedStats };
}

interface ClassOption {
    id: string;
    name: string;
    hitDie: number;
}

type Step = "select-class" | "choose-hp" | "choose-asi-or-feat" | "allocate-points";

export function LevelUpDialog({ classes, characterId }: { classes: ClassOption[], characterId: number }) {
    const [open, setOpen] = useState(false);
    const { levelUp, level, classes: currentClasses, xp, con, str, dex, int, wis, cha, feats: currentFeats, addFeat, setAbilityScore, grantAbilityPoints, spendAbilityPoints } = useCharacterStore();
    const [loading, setLoading] = useState<string | null>(null);

    // Multi-step state
    const [step, setStep] = useState<Step>("select-class");
    const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
    const [rolledHp, setRolledHp] = useState<number | null>(null);
    const [pendingHpGain, setPendingHpGain] = useState<number | null>(null);

    // ASI/Feat state
    const [hasAsiThisLevel, setHasAsiThisLevel] = useState(false);
    const [availableFeats, setAvailableFeats] = useState<any[]>([]);
    const [asiChoice, setAsiChoice] = useState<"asi" | "feat" | null>(null);
    const [asiBonus, setAsiBonus] = useState<Record<string, number>>({});
    const [selectedFeat, setSelectedFeat] = useState<any | null>(null);

    // Ability Point Allocation state (when selecting ASI feat from feat list)
    const [pointsToAllocate, setPointsToAllocate] = useState(0);
    const [restrictedStats, setRestrictedStats] = useState<string[] | null>(null);
    const [allocationError, setAllocationError] = useState<string | null>(null);


    const canLevel = level === 0 || canLevelUp(currentClasses, xp); // Level 0 = no class, always allow
    const isFirstLevel = level === 0 || currentClasses.length === 0;
    const nextXp = getXpForLevel(Math.max(1, level) + 1);
    const needed = Math.max(0, nextXp - xp);

    // Calculate CON modifier
    const conMod = Math.floor((con - 10) / 2);

    // Get unique class IDs the character already has
    const currentClassIds = new Set(currentClasses.map(c => c.classId));
    const numDistinctClasses = currentClassIds.size;

    // Filter available classes based on 2-class limit
    const availableClasses = classes.filter(cls => {
        // Always allow classes the character already has
        if (currentClassIds.has(cls.id)) return true;
        // Only allow new classes if character has less than 2 distinct classes
        return numDistinctClasses < 2;
    });

    // Calculate HP options for selected class
    // First level = max HP (hit die max + CON mod)
    const getFirstLevelHp = (hitDie: number) => hitDie + conMod;
    const getFixedHp = (hitDie: number) => Math.floor(hitDie / 2) + 1 + conMod;

    const rollHitDie = (hitDie: number) => {
        const roll = Math.floor(Math.random() * hitDie) + 1;
        return Math.max(1, roll + conMod); // Minimum 1 HP gain
    };

    // Check if next level has ASI for this class
    const checkForAsi = async (classId: string, nextClassLevel: number) => {
        const progression = await getClassProgression(classId, nextClassLevel);
        return progression?.hasAsi || false;
    };

    const handleClassSelect = async (cls: ClassOption) => {
        setSelectedClass(cls);
        setRolledHp(null);

        // Calculate what the class level will be after this level-up
        const currentClassLevel = currentClasses.find(c => c.classId === cls.id)?.level || 0;
        const nextClassLevel = currentClassLevel + 1;

        // Check if next level grants ASI/Feat
        const hasAsi = await checkForAsi(cls.id, nextClassLevel);
        setHasAsiThisLevel(hasAsi);

        // Load feats if needed
        if (hasAsi) {
            const feats = await getAvailableFeats();
            const existingFeatIds = new Set((currentFeats || []).map((f: any) => f.id));
            setAvailableFeats(feats.filter(f => !existingFeatIds.has(f.id)));
        }

        // For first level, skip HP choice and use max HP
        if (isFirstLevel) {
            const hpGain = getFirstLevelHp(cls.hitDie);
            if (hasAsi) {
                setPendingHpGain(hpGain);
                setStep("choose-asi-or-feat");
            } else {
                await finalizeLevelUp(cls, hpGain);
            }
        } else {
            setStep("choose-hp");
        }
    };

    const finalizeLevelUp = async (cls: ClassOption, hpGain: number, selectedFeat?: any, asiChanges?: Record<string, number>) => {
        setLoading(cls.id);
        try {
            // Apply ASI changes if any (from direct ASI choice, not feat)
            if (asiChanges && Object.keys(asiChanges).length > 0) {
                const stats: Record<string, number> = { str, dex, con, int, wis, cha };
                for (const [stat, bonus] of Object.entries(asiChanges)) {
                    const currentValue = stats[stat] || 10;
                    setAbilityScore(stat, Math.min(20, currentValue + bonus));
                }
            }

            // Check if the selected feat grants ability points (via ability_point_grant modifier)
            const grant = selectedFeat ? getAbilityPointGrant(selectedFeat) : { value: 0 };

            if (grant.value > 0) {
                // Prepare allocation step - DO NOT grant points yet to avoid infinite loop on back navigation
                // We will grant them only when the user confirms allocation
                setPointsToAllocate(grant.value);
                setRestrictedStats(grant.allowedStats || null);
                setStep("allocate-points");
                setLoading(null);
                return; // Don't finalize yet - wait for allocation
            }

            // Add feat if selected (non-ASI feat)
            if (selectedFeat) {
                await addFeat(selectedFeat);
            }

            await levelUp(cls.id, hpGain);
            resetDialogState();
            setOpen(false);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    };

    // Handle allocation completion during level-up
    const handleAllocationComplete = async () => {
        if (!selectedClass || pendingHpGain === null) return;

        const totalUsed = Object.values(asiBonus).reduce((s, v) => s + v, 0);
        if (totalUsed !== pointsToAllocate) {
            setAllocationError(`Please allocate all ${pointsToAllocate} points`);
            return;
        }

        // 1. Grant the points now (this prevents accumulation if user backed out previously)
        await grantAbilityPoints(pointsToAllocate);

        // 2. Add the feat
        if (selectedFeat) {
            await addFeat(selectedFeat);
        }

        // 3. Spend the points (decrement pool) and apply updates via store action
        // This handles both the stat increase AND the pool decrement to prevent double allocation
        const distribution = Object.entries(asiBonus)
            .filter(([_, amount]) => amount > 0)
            .map(([stat, amount]) => ({ stat, amount }));

        const result = await spendAbilityPoints(distribution);

        if (!result.success) {
            setAllocationError(result.error || "Failed to allocate points");
            return;
        }

        await levelUp(selectedClass.id, pendingHpGain);
        resetDialogState();
        setOpen(false);
    };

    const resetDialogState = () => {
        setStep("select-class");
        setSelectedClass(null);
        setRolledHp(null);
        setPendingHpGain(null);
        setHasAsiThisLevel(false);
        setAsiChoice(null);
        setAsiBonus({});
        setSelectedFeat(null);
        setPointsToAllocate(0);
        setRestrictedStats(null);
        setAllocationError(null);
    };

    const handleConfirmHpDirect = async (cls: ClassOption, hpGain: number) => {
        if (hasAsiThisLevel) {
            setPendingHpGain(hpGain);
            setStep("choose-asi-or-feat");
        } else {
            await finalizeLevelUp(cls, hpGain);
        }
    };

    const handleRoll = () => {
        if (!selectedClass) return;
        const result = rollHitDie(selectedClass.hitDie);
        setRolledHp(result);
    };

    const handleConfirmHp = async (hpGain: number) => {
        if (!selectedClass || level >= 20 || !canLevel) return;
        if (hasAsiThisLevel) {
            setPendingHpGain(hpGain);
            setStep("choose-asi-or-feat");
        } else {
            await finalizeLevelUp(selectedClass, hpGain);
        }
    };


    const handleReset = async () => {
        if (!confirm("Are you sure? This will reset you to Level 1 and remove all multiclassing.")) return;
        setLoading("reset");
        try {
            await resetCharacterLevel(characterId);
            setOpen(false);
            window.location.reload();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            // Reset state when dialog closes
            setStep("select-class");
            setSelectedClass(null);
            setRolledHp(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-900/50 dark:text-amber-500 cursor-pointer">
                    <ChevronUp size={16} />
                    {isFirstLevel ? "Choose Class" : "Level Up"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {step === "select-class"
                            ? isFirstLevel
                                ? "Choose Your Class"
                                : `Level Up Character (Total Level: ${level})`
                            : `Choose HP Gain (${selectedClass?.name})`
                        }
                    </DialogTitle>
                </DialogHeader>

                {step === "select-class" && (
                    <div className="space-y-4">
                        {!canLevel && level > 0 && level < 20 && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 p-3 rounded-md text-sm border border-amber-200 dark:border-amber-800">
                                <strong>Not enough XP!</strong> You need {needed.toLocaleString()} more XP to reach Level {level + 1}.
                            </div>
                        )}

                        {isFirstLevel && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 p-3 rounded-md text-sm border border-blue-200 dark:border-blue-800">
                                <strong>First Level!</strong> Choose your starting class. You will receive maximum HP (Hit Die + CON modifier).
                            </div>
                        )}

                        <p className="text-sm text-slate-500">
                            Choose a class to advance.
                            {numDistinctClasses < 2
                                ? " You can level up an existing class or multiclass into a new one."
                                : " You can only level up your existing classes (2-class limit reached)."
                            }
                        </p>

                        {numDistinctClasses >= 2 && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 p-2 rounded-md text-xs border border-blue-200 dark:border-blue-800">
                                <strong>Multiclass Limit:</strong> You already have 2 classes. Only your current classes are available.
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto">
                            {availableClasses.map((cls) => {
                                const isCurrentClass = currentClassIds.has(cls.id);
                                const classLevel = currentClasses.find(c => c.classId === cls.id)?.level || 0;

                                return (
                                    <Button
                                        key={cls.id}
                                        variant="ghost"
                                        className={`justify-between h-auto py-3 px-4 border ${isCurrentClass
                                            ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10"
                                            : "border-slate-100 dark:border-slate-800"
                                            }`}
                                        onClick={() => handleClassSelect(cls)}
                                        disabled={!!loading || level >= 20 || !canLevel}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${isCurrentClass
                                                ? "bg-amber-100 dark:bg-amber-800 text-amber-600"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                }`}>
                                                <Sword size={16} />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-semibold">
                                                    {cls.name}
                                                    {isCurrentClass && (
                                                        <span className="text-xs text-amber-600 ml-2">
                                                            (Level {classLevel})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-400">d{cls.hitDie} Hit Die</div>
                                            </div>
                                        </div>
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

                {step === "choose-hp" && selectedClass && (
                    <div className="space-y-4">
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="text-sm text-slate-500 mb-1">Leveling Up</div>
                            <div className="text-2xl font-bold">{selectedClass.name}</div>
                            <div className="text-sm text-slate-400">d{selectedClass.hitDie} Hit Die</div>
                        </div>

                        <p className="text-sm text-slate-500 text-center">
                            Choose how to determine your HP increase:
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Fixed Option */}
                            <Button
                                variant="outline"
                                className="h-auto py-4 flex-col gap-2"
                                onClick={() => handleConfirmHp(getFixedHp(selectedClass.hitDie))}
                                disabled={!!loading}
                            >
                                <Calculator size={24} className="text-blue-500" />
                                <div className="font-semibold">Take Average</div>
                                <div className="text-2xl font-bold text-blue-600">
                                    +{getFixedHp(selectedClass.hitDie)} HP
                                </div>
                                <div className="text-xs text-slate-400">
                                    ({selectedClass.hitDie / 2 + 1} + {conMod >= 0 ? '+' : ''}{conMod} CON)
                                </div>
                            </Button>

                            {/* Roll Option */}
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="outline"
                                    className="h-auto py-4 flex-col gap-2 flex-1"
                                    onClick={handleRoll}
                                    disabled={!!loading}
                                >
                                    <Dices size={24} className="text-amber-500" />
                                    <div className="font-semibold">
                                        {rolledHp !== null ? "Reroll" : "Roll"}
                                    </div>
                                    {rolledHp !== null ? (
                                        <div className="text-2xl font-bold text-amber-600">
                                            +{rolledHp} HP
                                        </div>
                                    ) : (
                                        <div className="text-lg text-slate-400">
                                            1d{selectedClass.hitDie} + {conMod >= 0 ? '+' : ''}{conMod}
                                        </div>
                                    )}
                                </Button>
                                {rolledHp !== null && (
                                    <Button
                                        onClick={() => handleConfirmHp(rolledHp)}
                                        disabled={!!loading}
                                        className="bg-amber-600 hover:bg-amber-700"
                                    >
                                        Accept Roll
                                    </Button>
                                )}
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => {
                                setStep("select-class");
                                setSelectedClass(null);
                                setRolledHp(null);
                            }}
                            disabled={!!loading}
                        >
                            ← Back to Class Selection
                        </Button>
                    </div>
                )}

                {step === "choose-asi-or-feat" && selectedClass && pendingHpGain !== null && (
                    <div className="space-y-4">
                        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <Sparkles className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                            <div className="font-bold text-purple-700 dark:text-purple-300">Ability Score Improvement</div>
                            <p className="text-sm text-purple-600 dark:text-purple-400">
                                Increase your abilities or take a feat
                            </p>
                        </div>

                        {/* Choice Toggle */}
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant={asiChoice === "asi" ? "default" : "outline"}
                                className="h-auto py-3"
                                onClick={() => { setAsiChoice("asi"); setSelectedFeat(null); setAsiBonus({}); }}
                            >
                                <div className="text-center">
                                    <Plus className="h-5 w-5 mx-auto mb-1" />
                                    <div className="font-semibold">Ability Score</div>
                                    <div className="text-xs opacity-70">+2 to one, or +1 to two</div>
                                </div>
                            </Button>
                            <Button
                                variant={asiChoice === "feat" ? "default" : "outline"}
                                className="h-auto py-3"
                                onClick={() => { setAsiChoice("feat"); setAsiBonus({}); }}
                            >
                                <div className="text-center">
                                    <Sparkles className="h-5 w-5 mx-auto mb-1" />
                                    <div className="font-semibold">Feat</div>
                                    <div className="text-xs opacity-70">{availableFeats.length} available</div>
                                </div>
                            </Button>
                        </div>

                        {/* ASI Selection */}
                        {asiChoice === "asi" && (
                            <div className="space-y-2">
                                <p className="text-sm text-slate-500">
                                    Distribute +2 points (max +2 to one, or +1 to two abilities):
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["str", "dex", "con", "int", "wis", "cha"] as const).map(stat => {
                                        const currentValue = { str, dex, con, int, wis, cha }[stat];
                                        const bonus = asiBonus[stat] || 0;
                                        const totalUsed = Object.values(asiBonus).reduce((s, v) => s + v, 0);
                                        const canIncrease = totalUsed < 2 && bonus < 2 && (currentValue + bonus) < 20;
                                        const canDecrease = bonus > 0;

                                        return (
                                            <div key={stat} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center">
                                                <div className="text-xs font-bold uppercase text-slate-400">{stat}</div>
                                                <div className="text-lg font-bold">{currentValue}{bonus > 0 && <span className="text-green-500">+{bonus}</span>}</div>
                                                <div className="flex justify-center gap-1 mt-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 w-6 p-0"
                                                        disabled={!canDecrease}
                                                        onClick={() => setAsiBonus(prev => ({ ...prev, [stat]: (prev[stat] || 0) - 1 }))}
                                                    >
                                                        <Minus size={12} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 w-6 p-0"
                                                        disabled={!canIncrease}
                                                        onClick={() => setAsiBonus(prev => ({ ...prev, [stat]: (prev[stat] || 0) + 1 }))}
                                                    >
                                                        <Plus size={12} />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="text-center text-sm text-slate-400">
                                    Points used: {Object.values(asiBonus).reduce((s, v) => s + v, 0)} / 2
                                </div>
                            </div>
                        )}

                        {/* Feat Selection */}
                        {asiChoice === "feat" && (
                            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                                {availableFeats.map(feat => (
                                    <Button
                                        key={feat.id}
                                        variant={selectedFeat?.id === feat.id ? "default" : "outline"}
                                        className="w-full justify-start h-auto py-2 text-left"
                                        onClick={() => setSelectedFeat(feat)}
                                    >
                                        <div>
                                            <div className="font-semibold">{feat.name}</div>
                                            <div className="text-xs opacity-70 line-clamp-2">{feat.description}</div>
                                        </div>
                                    </Button>
                                ))}
                                {availableFeats.length === 0 && (
                                    <div className="text-center text-slate-500 py-4">No feats available</div>
                                )}
                            </div>
                        )}

                        {/* Confirm Button */}
                        <Button
                            className="w-full"
                            disabled={
                                !!loading ||
                                (asiChoice === "asi" && Object.values(asiBonus).reduce((s, v) => s + v, 0) !== 2) ||
                                (asiChoice === "feat" && !selectedFeat) ||
                                !asiChoice
                            }
                            onClick={() => finalizeLevelUp(
                                selectedClass,
                                pendingHpGain,
                                asiChoice === "feat" ? selectedFeat : undefined,
                                asiChoice === "asi" ? asiBonus : undefined
                            )}
                        >
                            {loading ? "Leveling Up..." : "Confirm Level Up"}
                        </Button>

                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => setStep("choose-hp")}
                            disabled={!!loading}
                        >
                            ← Back to HP Selection
                        </Button>
                    </div>
                )}

                {/* Allocate Points Step (after selecting ASI feat) */}
                {step === "allocate-points" && selectedClass && pendingHpGain !== null && (
                    <div className="space-y-4">
                        <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <Sparkles className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                            <div className="font-bold text-amber-700 dark:text-amber-300">Allocate Ability Points</div>
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                                You have {pointsToAllocate} point{pointsToAllocate !== 1 ? 's' : ''} to distribute
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {(["str", "dex", "con", "int", "wis", "cha"] as const).map(stat => {
                                const currentValue = { str, dex, con, int, wis, cha }[stat];
                                const bonus = asiBonus[stat] || 0;
                                const totalUsed = Object.values(asiBonus).reduce((s, v) => s + v, 0);

                                // Check restriction
                                const isAllowed = !restrictedStats || restrictedStats.includes(stat);

                                const canIncrease = isAllowed && totalUsed < pointsToAllocate && bonus < 2 && (currentValue + bonus) < 20;
                                const canDecrease = bonus > 0;

                                return (
                                    <div key={stat} className={`rounded-lg p-2 text-center border ${isAllowed ? 'bg-slate-50 dark:bg-slate-800 border-transparent' : 'bg-slate-100 dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700 opacity-60'}`}>
                                        <div className="text-xs font-bold uppercase text-slate-400">{stat}</div>
                                        <div className="text-lg font-bold">{currentValue}{bonus > 0 && <span className="text-amber-500">+{bonus}</span>}</div>

                                        {isAllowed && (
                                            <div className="flex justify-center gap-1 mt-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 w-6 p-0"
                                                    disabled={!canDecrease}
                                                    onClick={() => setAsiBonus(prev => ({ ...prev, [stat]: (prev[stat] || 0) - 1 }))}
                                                >
                                                    <Minus size={12} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 w-6 p-0"
                                                    disabled={!canIncrease}
                                                    onClick={() => setAsiBonus(prev => ({ ...prev, [stat]: (prev[stat] || 0) + 1 }))}
                                                >
                                                    <Plus size={12} />
                                                </Button>
                                            </div>
                                        )}
                                        {!isAllowed && <div className="h-7 mt-1 text-[10px] text-slate-400 flex items-center justify-center">N/A</div>}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="text-center text-sm text-slate-400">
                            Points used: {Object.values(asiBonus).reduce((s, v) => s + v, 0)} / {pointsToAllocate}
                        </div>

                        {allocationError && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                                <AlertCircle size={16} />
                                {allocationError}
                            </div>
                        )}

                        <Button
                            className="w-full bg-amber-600 hover:bg-amber-700"
                            disabled={Object.values(asiBonus).reduce((s, v) => s + v, 0) !== pointsToAllocate || !!loading}
                            onClick={handleAllocationComplete}
                        >
                            {loading ? "Applying..." : "Complete Level Up"}
                        </Button>

                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => {
                                setStep("choose-asi-or-feat");
                                setAsiBonus({});
                                setAllocationError(null);
                            }}
                            disabled={!!loading}
                        >
                            ← Back to ASI/Feat Choice
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

