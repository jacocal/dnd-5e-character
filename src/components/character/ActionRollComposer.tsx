"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dices,
    Swords,
    Sparkles,
    Zap,
    Target,
    ShieldAlert,
    CheckCircle2,
    XCircle,
    Flame,
    Hand
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RollRequestPayload {
    rollType: string;
    targetId: string;
    diceMode?: "SIMULATED" | "PHYSICAL";
    advantageMode?: "NORMAL" | "ADVANTAGE" | "DISADVANTAGE";
    physicalD20Rolls?: number[];
    physicalDamageRolls?: number[];
    selectedRiderIds?: string[];
    useVersatileTwoHanded?: boolean;
    slotLevel?: number | null;
    usePactSlot?: boolean;
    isRitualCast?: boolean;
    useFreeCast?: boolean;
    addSpellcastingModToDamage?: boolean;
    targetAcOrDc?: number | null;
    label?: string;
}

interface ActionRollComposerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialRequest: RollRequestPayload | null;
    sheet: any;
    lastRollOutcome: any | null;
    onExecuteRoll: (req: RollRequestPayload) => Promise<void>;
    concentrationRequiredDc?: number | null;
    onDismissConcentrationPrompt?: () => void;
}

export function ActionRollComposer({
    open,
    onOpenChange,
    initialRequest,
    sheet,
    lastRollOutcome,
    onExecuteRoll,
    concentrationRequiredDc,
    onDismissConcentrationPrompt
}: ActionRollComposerProps) {
    const [diceMode, setDiceMode] = useState<"SIMULATED" | "PHYSICAL">("SIMULATED");
    const [advantageMode, setAdvantageMode] = useState<"NORMAL" | "ADVANTAGE" | "DISADVANTAGE">("NORMAL");
    const [selectedRiderIds, setSelectedRiderIds] = useState<string[]>([]);
    const [useVersatile, setUseVersatile] = useState(false);
    const [slotLevel, setSlotLevel] = useState<number | null>(null);
    const [usePactSlot, setUsePactSlot] = useState(false);
    const [isRitualCast, setIsRitualCast] = useState(false);
    const [useFreeCast, setUseFreeCast] = useState(false);
    const [addSpellModToDmg, setAddSpellModToDmg] = useState(false);
    const [targetAcOrDc, setTargetAcOrDc] = useState<string>("");
    const [physD20First, setPhysD20First] = useState<string>("15");
    const [physD20Second, setPhysD20Second] = useState<string>("12");
    const [physDamageRaw, setPhysDamageRaw] = useState<string>("6");
    const [customDiceFormula, setCustomDiceFormula] = useState<string>("1d20");
    const [submitting, setSubmitting] = useState(false);

    const matchedAction = (sheet?.actions || []).find(
        (a: any) => a.id === initialRequest?.targetId
    );
    const matchedSkill = (sheet?.skills || []).find(
        (s: any) => s.key === initialRequest?.targetId || s.name.toLowerCase() === initialRequest?.targetId?.toLowerCase()
    );
    const matchedSave = (sheet?.savingThrows || []).find(
        (s: any) => s.ability.toLowerCase() === initialRequest?.targetId?.toLowerCase()
    );
    const matchingGrantSlot = (sheet?.spellGrantSlots || []).find(
        (g: any) => g.selectedSpellId === initialRequest?.targetId && g.grantsFreeCastPerLongRest && !g.freeCastUsed
    );

    const eligibleRiders: any[] =
        matchedAction?.eligibleRiders ||
        (sheet?.availableRiders || []).filter((r: any) => {
            if (initialRequest?.rollType === "skill" || initialRequest?.rollType === "ability_check") {
                return r.appliesTo?.includes("ability_check") || r.appliesTo?.includes("skill") || r.appliesTo?.includes("d20_test");
            }
            if (initialRequest?.rollType === "saving_throw" || initialRequest?.rollType === "concentration_save") {
                return r.appliesTo?.includes("saving_throw") || r.appliesTo?.includes("save") || r.appliesTo?.includes("d20_test");
            }
            return false;
        });

    useEffect(() => {
        if (!initialRequest) return;
        setDiceMode(initialRequest.diceMode || "SIMULATED");
        const defaultAdv =
            initialRequest.advantageMode ||
            (matchedSkill?.advantageState as any) ||
            (matchedSave?.advantageState as any) ||
            "NORMAL";
        setAdvantageMode(defaultAdv);
        setSelectedRiderIds(initialRequest.selectedRiderIds || []);
        setUseVersatile(initialRequest.useVersatileTwoHanded || false);
        setSlotLevel(initialRequest.slotLevel ?? matchedAction?.spellLevel ?? null);
        setUsePactSlot(initialRequest.usePactSlot || false);
        setIsRitualCast(initialRequest.isRitualCast || false);
        setUseFreeCast(initialRequest.useFreeCast ?? (!!matchingGrantSlot));
        setAddSpellModToDmg(initialRequest.addSpellcastingModToDamage || false);
        if (initialRequest.rollType === "custom_dice" && initialRequest.targetId) {
            setCustomDiceFormula(initialRequest.targetId);
        }
        setTargetAcOrDc(initialRequest.targetAcOrDc != null ? String(initialRequest.targetAcOrDc) : "");
    }, [initialRequest, matchedAction?.id, matchedSkill?.key, matchedSave?.ability, matchingGrantSlot?.slotId]);

    useEffect(() => {
        if (concentrationRequiredDc && concentrationRequiredDc > 0 && !open) {
            onOpenChange(true);
        }
    }, [concentrationRequiredDc]);

    if (!initialRequest && !concentrationRequiredDc) return null;

    const effectiveRollType = concentrationRequiredDc && !initialRequest
        ? "concentration_save"
        : (initialRequest?.rollType || "skill");
    const effectiveTargetId = concentrationRequiredDc && !initialRequest
        ? "con"
        : (initialRequest?.targetId || "perception");

    const title =
        initialRequest?.label ||
        matchedAction?.name ||
        (matchedSkill ? `${matchedSkill.name} (${matchedSkill.ability.toUpperCase()}) Check` : null) ||
        (matchedSave ? `${matchedSave.ability.toUpperCase()} Saving Throw` : null) ||
        (effectiveRollType === "concentration_save" ? `Concentration CON Save (DC ${concentrationRequiredDc})` : null) ||
        (effectiveRollType === "initiative" ? "Initiative Roll" : `${effectiveTargetId.toUpperCase()} Roll`);

    const toggleRider = (id: string) => {
        setSelectedRiderIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleRoll = async (overrideMode?: "SIMULATED" | "PHYSICAL") => {
        const modeToUse = overrideMode || diceMode;
        setSubmitting(true);
        try {
            const d20List: number[] = [];
            if (modeToUse === "PHYSICAL") {
                const r1 = Math.max(1, Math.min(20, parseInt(physD20First) || 10));
                d20List.push(r1);
                if (advantageMode !== "NORMAL") {
                    const r2 = Math.max(1, Math.min(20, parseInt(physD20Second) || 10));
                    d20List.push(r2);
                }
            }
            const dmgList: number[] =
                modeToUse === "PHYSICAL"
                    ? physDamageRaw
                          .split(",")
                          .map((s) => parseInt(s.trim()))
                          .filter((n) => !isNaN(n) && n >= 1)
                    : [];

            const parsedTarget =
                targetAcOrDc.trim() !== ""
                    ? parseInt(targetAcOrDc)
                    : concentrationRequiredDc || null;

            await onExecuteRoll({
                rollType: effectiveRollType,
                targetId: effectiveRollType === "custom_dice" ? customDiceFormula : effectiveTargetId,
                diceMode: modeToUse,
                advantageMode,
                physicalD20Rolls: d20List,
                physicalDamageRolls: dmgList,
                selectedRiderIds,
                useVersatileTwoHanded: useVersatile,
                slotLevel,
                usePactSlot,
                isRitualCast,
                useFreeCast,
                addSpellcastingModToDamage: addSpellModToDmg,
                targetAcOrDc: parsedTarget
            });
            if (concentrationRequiredDc && onDismissConcentrationPrompt) {
                onDismissConcentrationPrompt();
            }
        } finally {
            setSubmitting(false);
        }
    };

    const baseSpellLvl = matchedAction?.spellLevel ?? 0;
    const availableSlotLevels: number[] = [];
    if (effectiveRollType === "spell" && baseSpellLvl > 0 && sheet?.spellSlots?.slots) {
        for (let lvl = baseSpellLvl; lvl <= 9; lvl++) {
            const maxForLvl = sheet.spellSlots.slots[lvl] || 0;
            if (maxForLvl > 0) availableSlotLevels.push(lvl);
        }
    }

    const hasDamageOrHealing =
        effectiveRollType === "weapon_attack" ||
        effectiveRollType === "spell" ||
        effectiveRollType === "hit_die" ||
        effectiveRollType === "custom_dice" ||
        !!matchedAction?.baseDamageDice ||
        !!matchedAction?.healingDice;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg bg-slate-950 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b border-slate-800 pb-3">
                    <div className="flex items-center justify-between pr-6">
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
                            {effectiveRollType === "weapon_attack" ? (
                                <Swords className="w-4 h-4 text-amber-400" />
                            ) : effectiveRollType === "spell" ? (
                                <Flame className="w-4 h-4 text-purple-400" />
                            ) : (
                                <Dices className="w-4 h-4 text-indigo-400" />
                            )}
                            <span>{title}</span>
                        </DialogTitle>
                        <Badge variant="outline" className="text-[10px] border-indigo-500/40 text-indigo-300 uppercase">
                            {effectiveRollType.replace("_", " ")}
                        </Badge>
                    </div>
                    {matchedAction?.breakdown && (
                        <p className="text-xs text-slate-400 font-mono mt-1">{matchedAction.breakdown}</p>
                    )}
                    {matchedAction?.activeTriggers && matchedAction.activeTriggers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {matchedAction.activeTriggers.map((trig: string, idx: number) => (
                                <span
                                    key={idx}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-500/30 text-indigo-200 font-medium"
                                >
                                    ⚡ {trig}
                                </span>
                            ))}
                        </div>
                    )}
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                    {/* Custom Tabletop Dice Tray Presets & Formula Input */}
                    {effectiveRollType === "custom_dice" && (
                        <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/40 space-y-2.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                                Quick Dice Presets & Custom Formula (XdY+Z)
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                                {["1d4", "1d6", "1d8", "1d10", "1d12", "1d20", "1d100", "2d4+2", "4d4+4", "8d6"].map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setCustomDiceFormula(preset)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md font-mono text-xs border transition-all",
                                            customDiceFormula === preset
                                                ? "bg-indigo-600 border-indigo-400 text-white font-bold"
                                                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-indigo-500/40"
                                        )}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                            <Input
                                value={customDiceFormula}
                                onChange={(e) => setCustomDiceFormula(e.target.value)}
                                placeholder="e.g. 2d6+3, 1d20+5, 8d6"
                                className="h-8 bg-slate-950 border-indigo-500/40 text-white font-mono text-xs"
                            />
                        </div>
                    )}

                    {concentrationRequiredDc && (
                        <div className="p-3 rounded-lg bg-purple-950/60 border border-purple-500/50 text-purple-200 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 animate-pulse" />
                                <div>
                                    <div className="font-bold">Concentration Check Triggered!</div>
                                    <div className="text-[11px] text-purple-300">
                                        You took damage while concentrating on <strong>{sheet?.concentrationSpellName}</strong>. Roll a <strong>DC {concentrationRequiredDc} CON Save</strong>.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Advantage / Normal / Disadvantage Toggle + Target AC/DC */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div className="sm:col-span-2 space-y-1.5">
                            <Label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                d20 Roll State
                            </Label>
                            <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                                {(["DISADVANTAGE", "NORMAL", "ADVANTAGE"] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setAdvantageMode(mode)}
                                        className={cn(
                                            "py-1.5 px-2 rounded-md text-[10px] font-bold uppercase transition-all",
                                            advantageMode === mode
                                                ? mode === "ADVANTAGE"
                                                    ? "bg-emerald-600 text-white shadow-sm"
                                                    : mode === "DISADVANTAGE"
                                                    ? "bg-red-600 text-white shadow-sm"
                                                    : "bg-indigo-600 text-white shadow-sm"
                                                : "text-slate-400 hover:text-slate-200"
                                        )}
                                    >
                                        {mode === "DISADVANTAGE" ? "Disadv" : mode === "ADVANTAGE" ? "Advantage" : "Normal"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                                <Target className="w-3 h-3 text-indigo-400" />
                                Target AC / DC
                            </Label>
                            <Input
                                type="number"
                                value={targetAcOrDc}
                                onChange={(e) => setTargetAcOrDc(e.target.value)}
                                placeholder={matchedAction?.saveDC ? `DC ${matchedAction.saveDC}` : "Optional"}
                                className="h-8 bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
                            />
                        </div>
                    </div>

                    {/* Versatile 2H, 1/Long Rest Free Cast, Spellcasting Mod to Damage & Spell Slot Upcast Selector */}
                    {(matchedAction?.versatileDamageDice ||
                        matchingGrantSlot ||
                        availableSlotLevels.length > 0 ||
                        (effectiveRollType === "spell" && matchedAction?.baseDamageDice)) && (
                        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
                            {effectiveRollType === "spell" && matchedAction?.baseDamageDice && (
                                <div className="flex items-center justify-between p-2 rounded bg-indigo-950/40 border border-indigo-500/30">
                                    <div className="flex items-center gap-2">
                                        <Flame className="w-4 h-4 text-indigo-400 shrink-0" />
                                        <div>
                                            <div className="font-semibold text-indigo-200">
                                                Add Spellcasting Modifier (
                                                {sheet?.spellcastingStats?.[0]?.modifier >= 0
                                                    ? `+${sheet?.spellcastingStats?.[0]?.modifier}`
                                                    : sheet?.spellcastingStats?.[0]?.modifier ?? "+3"}{" "}
                                                {sheet?.spellcastingStats?.[0]?.ability || "INT"}) to Damage
                                            </div>
                                            <div className="text-[10px] text-indigo-300/80">
                                                {matchedAction?.damageBonus > 0
                                                    ? `Base damage already includes +${matchedAction.damageBonus} modifier bonus.`
                                                    : `Your +${sheet?.spellcastingStats?.[0]?.modifier ?? 0} ${
                                                          sheet?.spellcastingStats?.[0]?.ability || "Spell"
                                                      } mod is applied to Spell Attack/Save DC. Check to also add it to damage.`}
                                            </div>
                                        </div>
                                    </div>
                                    <Checkbox
                                        checked={addSpellModToDmg}
                                        onCheckedChange={(v) => setAddSpellModToDmg(!!v)}
                                        className="border-indigo-500 data-[state=checked]:bg-indigo-600"
                                    />
                                </div>
                            )}

                            {matchedAction?.versatileDamageDice && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Hand className="w-4 h-4 text-amber-400" />
                                        <div>
                                            <div className="font-semibold text-slate-200">Versatile Two-Handed Grip</div>
                                            <div className="text-[10px] text-slate-400">
                                                Upgrades base weapon dice from {matchedAction.baseDamageDice} to {matchedAction.versatileDamageDice}
                                            </div>
                                        </div>
                                    </div>
                                    <Checkbox
                                        checked={useVersatile}
                                        onCheckedChange={(v) => setUseVersatile(!!v)}
                                        className="border-slate-600 data-[state=checked]:bg-amber-600"
                                    />
                                </div>
                            )}

                            {matchingGrantSlot && (
                                <div className="flex items-center justify-between p-2 rounded bg-emerald-950/40 border border-emerald-500/40">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-emerald-400" />
                                        <div>
                                            <div className="font-semibold text-emerald-200">
                                                Use 1/Long Rest Free Cast ({matchingGrantSlot.sourceName})
                                            </div>
                                            <div className="text-[10px] text-emerald-300/80">
                                                Casts at Level {baseSpellLvl} without expending any spell slot!
                                            </div>
                                        </div>
                                    </div>
                                    <Checkbox
                                        checked={useFreeCast}
                                        onCheckedChange={(v) => {
                                            setUseFreeCast(!!v);
                                            if (v) setSlotLevel(baseSpellLvl);
                                        }}
                                        className="border-emerald-500 data-[state=checked]:bg-emerald-600"
                                    />
                                </div>
                            )}

                            {availableSlotLevels.length > 0 && !useFreeCast && (
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase text-purple-300">
                                        Cast at Spell Slot Level (Upcasting Scales Automatically)
                                    </Label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {availableSlotLevels.map((lvl) => {
                                            const maxSlots = sheet?.spellSlots?.slots?.[lvl] || 0;
                                            const usedSlots = sheet?.character?.usedSpellSlots?.slots?.[String(lvl)] || 0;
                                            const rem = Math.max(0, maxSlots - usedSlots);
                                            return (
                                                <button
                                                    key={lvl}
                                                    type="button"
                                                    onClick={() => setSlotLevel(lvl)}
                                                    className={cn(
                                                        "px-2.5 py-1 rounded-md text-xs font-mono border transition-all",
                                                        slotLevel === lvl
                                                            ? "bg-purple-600 border-purple-400 text-white font-bold"
                                                            : "bg-slate-950 border-slate-800 text-slate-300 hover:border-purple-500/50"
                                                    )}
                                                >
                                                    Lvl {lvl} ({rem}/{maxSlots})
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Multi-Skill & Combat Rider Stacking */}
                    {eligibleRiders.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5" />
                                Stack Combat Riders & Class Skills ({selectedRiderIds.length} active)
                            </Label>
                            <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
                                {eligibleRiders.map((rider: any) => {
                                    const isChecked = selectedRiderIds.includes(rider.id);
                                    return (
                                        <div
                                            key={rider.id}
                                            onClick={() => toggleRider(rider.id)}
                                            className={cn(
                                                "p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-2",
                                                isChecked
                                                    ? "bg-amber-950/40 border-amber-500/60 text-amber-100"
                                                    : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <Checkbox
                                                    checked={isChecked}
                                                    onCheckedChange={() => toggleRider(rider.id)}
                                                    className="border-slate-600 data-[state=checked]:bg-amber-500"
                                                />
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-xs flex items-center gap-1.5 flex-wrap">
                                                        <span>{rider.name}</span>
                                                        {rider.source && (
                                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                                                {rider.source}
                                                            </span>
                                                        )}
                                                        {(rider.consumesSlotLevel || rider.consumesResourceId) && (
                                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700/40">
                                                                Uses {rider.consumesResourceId || `Slot Lv ${rider.consumesSlotLevel}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="font-mono font-bold text-xs text-amber-400 shrink-0">
                                                {rider.dice ? `+${rider.dice}` : ""}
                                                {rider.diceFormula ? ` +${rider.diceFormula.replace("_", " ")}` : ""}
                                                {rider.formula ? ` +${rider.formula.replace("_", " ")}` : ""}
                                                {rider.damageType ? ` ${rider.damageType}` : ""}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Execution Mode Tabs: Simulated Auto-Roll vs Physical Tabletop Dice Input */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Dice Input Mode
                            </span>
                            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setDiceMode("SIMULATED")}
                                    className={cn(
                                        "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors",
                                        diceMode === "SIMULATED"
                                            ? "bg-indigo-600 text-white"
                                            : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    Simulated Auto-Roll
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDiceMode("PHYSICAL")}
                                    className={cn(
                                        "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors",
                                        diceMode === "PHYSICAL"
                                            ? "bg-amber-600 text-white"
                                            : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    Physical Tabletop Dice
                                </button>
                            </div>
                        </div>

                        {diceMode === "PHYSICAL" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800 animate-in fade-in duration-150">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-amber-300 font-semibold">
                                        Physical d20 Roll (1–20)
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={physD20First}
                                            onChange={(e) => setPhysD20First(e.target.value)}
                                            className="bg-slate-950 border-amber-500/40 text-white font-mono"
                                            placeholder="d20 #1"
                                        />
                                        {advantageMode !== "NORMAL" && (
                                            <Input
                                                type="number"
                                                min={1}
                                                max={20}
                                                value={physD20Second}
                                                onChange={(e) => setPhysD20Second(e.target.value)}
                                                className="bg-slate-950 border-amber-500/40 text-white font-mono"
                                                placeholder="d20 #2"
                                            />
                                        )}
                                    </div>
                                </div>

                                {hasDamageOrHealing && (
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-amber-300 font-semibold">
                                            Physical Damage Dice Values (comma-separated)
                                        </Label>
                                        <Input
                                            value={physDamageRaw}
                                            onChange={(e) => setPhysDamageRaw(e.target.value)}
                                            className="bg-slate-950 border-amber-500/40 text-white font-mono"
                                            placeholder="e.g. 6, 4, 5"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2 pt-1">
                            <Button
                                type="button"
                                onClick={() => handleRoll()}
                                disabled={submitting}
                                className={cn(
                                    "w-full font-bold text-xs py-2.5 shadow-md",
                                    diceMode === "PHYSICAL"
                                        ? "bg-amber-600 hover:bg-amber-500 text-white"
                                        : "bg-indigo-600 hover:bg-indigo-500 text-white"
                                )}
                            >
                                <Dices className="w-4 h-4 mr-2" />
                                {submitting
                                    ? "Resolving in KMP Engine..."
                                    : diceMode === "PHYSICAL"
                                    ? "Resolve Physical Tabletop Roll"
                                    : "Execute Simulated Auto-Roll"}
                            </Button>
                        </div>
                    </div>

                    {/* Latest Roll Outcome Display */}
                    {lastRollOutcome && (
                        <div
                            className={cn(
                                "p-3.5 rounded-xl border space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200",
                                lastRollOutcome.isCriticalHit
                                    ? "bg-amber-950/50 border-amber-400 text-amber-100"
                                    : lastRollOutcome.isCriticalFail
                                    ? "bg-red-950/50 border-red-500 text-red-100"
                                    : "bg-slate-900/95 border-indigo-500/40 text-slate-100"
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-sm">{lastRollOutcome.title}</span>
                                        {lastRollOutcome.isCriticalHit && (
                                            <Badge className="bg-amber-500 text-slate-950 font-black text-[10px]">
                                                CRITICAL HIT!
                                            </Badge>
                                        )}
                                        {lastRollOutcome.isCriticalFail && (
                                            <Badge className="bg-red-600 text-white font-black text-[10px]">
                                                CRITICAL FAIL!
                                            </Badge>
                                        )}
                                        {lastRollOutcome.isSuccess === true && (
                                            <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> HIT / PASS
                                            </Badge>
                                        )}
                                        {lastRollOutcome.isSuccess === false && (
                                            <Badge className="bg-rose-700 text-white text-[10px] gap-1">
                                                <XCircle className="w-3 h-3" /> MISS / FAIL
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-slate-300 font-mono mt-1">
                                        {lastRollOutcome.detailedFormula || lastRollOutcome.summary}
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    {lastRollOutcome.totalD20Result != null && (
                                        <div>
                                            <div className="text-[9px] uppercase text-slate-400">d20 Total</div>
                                            <div className="text-2xl font-black font-mono text-white leading-none">
                                                {lastRollOutcome.totalD20Result}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Triggered Feats, Class Features, Racial Traits & Weapon Masteries */}
                            {lastRollOutcome.triggeredEffects && lastRollOutcome.triggeredEffects.length > 0 && (
                                <div className="pt-2 border-t border-slate-800 space-y-1">
                                    <div className="text-[10px] font-bold uppercase text-indigo-300 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-indigo-400" />
                                        Triggered Feats, Traits & Weapon Masteries
                                    </div>
                                    <div className="space-y-1">
                                        {lastRollOutcome.triggeredEffects.map((eff: string, idx: number) => (
                                            <div
                                                key={idx}
                                                className="text-[11px] px-2 py-1 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-100"
                                            >
                                                ⚡ {eff}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Damage Breakdown Parts */}
                            {lastRollOutcome.damageParts && lastRollOutcome.damageParts.length > 0 && (
                                <div className="pt-2 border-t border-slate-800 space-y-1">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="text-slate-400 uppercase text-[10px]">Damage Breakdown</span>
                                        <span className="text-base font-black text-amber-400 font-mono">
                                            {lastRollOutcome.totalDamage} Total Damage
                                        </span>
                                    </div>
                                    {lastRollOutcome.damageParts.map((part: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                                            <span>
                                                {part.source} ({part.diceFormula})
                                                {part.rolledValues?.length > 0 && ` [${part.rolledValues.join(", ")}]`}
                                            </span>
                                            <span className="font-bold text-white">
                                                {part.subtotal} <span className="text-slate-400 text-[10px]">{part.damageType}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {lastRollOutcome.totalHealing > 0 && (
                                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-400">
                                    <span>Healing Applied</span>
                                    <span className="text-base font-black font-mono">+{lastRollOutcome.totalHealing} HP</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
