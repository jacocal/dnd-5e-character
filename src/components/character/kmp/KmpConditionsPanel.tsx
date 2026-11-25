"use client";

import React, { useState } from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Search, Minus, X, Zap } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const CONDITIONS_LIST = [
    {
        id: "raging",
        name: "Raging",
        desc: "+Rage Damage on STR attacks. Adv on STR checks/saves. Physical resistance.",
        fullDesc:
            "2024 Barbarian Rage: Resistance to Bludgeoning, Piercing, and Slashing damage; +Rage Damage bonus on Strength-based attacks; Advantage on Strength checks and Strength saving throws.",
        removal: "Ends after 10 rounds, if Incapacitated, or if you don Heavy armor."
    },
    {
        id: "blinded",
        name: "Blinded",
        desc: "Can't see. Disadv on attacks. Enemy attacks have Adv.",
        fullDesc:
            "A blinded creature can't see and automatically fails any ability check that requires sight. Attack rolls against the creature have Advantage, and the creature's attack rolls have Disadvantage.",
        removal: "Depends on source (spell ends, Lesser Restoration, etc.)."
    },
    {
        id: "charmed",
        name: "Charmed",
        desc: "Can't attack charmer. Charmer has Adv on social checks.",
        fullDesc:
            "A charmed creature can't attack the charmer or target them with damaging abilities or magical effects. The charmer has Advantage on ability checks to interact socially with the creature.",
        removal: "Usually ends when spell ends or charmer harms the creature."
    },
    {
        id: "deafened",
        name: "Deafened",
        desc: "Can't hear. Auto-fail hearing checks.",
        fullDesc:
            "A deafened creature can't hear and automatically fails any ability check that requires hearing.",
        removal: "Depends on source (spell ends, Lesser Restoration, etc.)."
    },
    {
        id: "frightened",
        name: "Frightened",
        desc: "Disadv on checks & attacks while source is visible.",
        fullDesc:
            "A frightened creature has Disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can't willingly move closer to the source of its fear.",
        removal: "Repeat WIS save or ends when source is out of sight / spell ends."
    },
    {
        id: "grappled",
        name: "Grappled",
        desc: "Speed 0. Disadv on attacks vs non-grappler.",
        fullDesc:
            "2024 Grappled: Speed is 0 and can't increase. You have Disadvantage on attack rolls against any target other than the grappler.",
        removal: "Spend Action to escape: Athletics or Acrobatics check vs Grappler's Escape DC."
    },
    {
        id: "incapacitated",
        name: "Incapacitated",
        desc: "No Actions, Bonus Actions, or Reactions. Drops Concentration.",
        fullDesc:
            "2024 Incapacitated: Inactive (can't take any Action, Bonus Action, or Reaction), Concentration is broken, Speechless, and Disadvantage on Initiative rolls.",
        removal: "Depends on source causing incapacitation."
    },
    {
        id: "invisible",
        name: "Invisible",
        desc: "Adv on Initiative & attacks. Enemy attacks have Disadv.",
        fullDesc:
            "2024 Invisible: Advantage on Initiative rolls. Concealed from sight. Attack rolls have Advantage, and enemy attack rolls have Disadvantage unless the attacker can see you.",
        removal: "Spell ends, or immediately after you make an attack roll, deal damage, or cast a spell."
    },
    {
        id: "paralyzed",
        name: "Paralyzed",
        desc: "Incapacitated. Speed 0. Auto-fail STR/DEX saves. Melee hits Auto-Crit.",
        fullDesc:
            "Incapacitated, Speed 0, automatically fails Strength and Dexterity saving throws, attack rolls against you have Advantage, and any hit from within 5 feet is an automatic Critical Hit.",
        removal: "Repeat CON/WIS save at end of turn or Lesser Restoration."
    },
    {
        id: "petrified",
        name: "Petrified",
        desc: "Turned to stone. Resistance to all damage. Auto-fail STR/DEX saves.",
        fullDesc:
            "Transformed into solid inanimate substance. Incapacitated, Speed 0, Resistance to all damage, Immune to Poison and Disease, and automatically fails Strength and Dexterity saving throws.",
        removal: "Greater Restoration spell or similar magic."
    },
    {
        id: "poisoned",
        name: "Poisoned",
        desc: "Disadv on all attack rolls and ability checks.",
        fullDesc: "A poisoned creature has Disadvantage on attack rolls and ability checks.",
        removal: "Repeat CON save, Lay on Hands (5 pts), Lesser Restoration, or Antitoxin."
    },
    {
        id: "prone",
        name: "Prone",
        desc: "Crawl only. Disadv on attacks. Melee Adv / Ranged Disadv against.",
        fullDesc:
            "Only movement option is to crawl unless you stand up (spending movement equal to half your Speed). Disadvantage on attack rolls. Attacks within 5 ft have Advantage; attacks beyond 5 ft have Disadvantage.",
        removal: "Spend half your Speed on your turn to Stand Up."
    },
    {
        id: "restrained",
        name: "Restrained",
        desc: "Speed 0. Disadv on attacks & DEX saves. Enemy attacks have Adv.",
        fullDesc:
            "Speed 0, attack rolls against you have Advantage, your attack rolls have Disadvantage, and you have Disadvantage on Dexterity saving throws.",
        removal: "Escape check (Athletics/Acrobatics) or break restraints."
    },
    {
        id: "stunned",
        name: "Stunned",
        desc: "Incapacitated. Auto-fail STR/DEX saves. Enemy attacks have Adv.",
        fullDesc:
            "Incapacitated, automatically fails Strength and Dexterity saving throws, and attack rolls against you have Advantage.",
        removal: "Usually ends at end of next turn or via CON save."
    },
    {
        id: "unconscious",
        name: "Unconscious",
        desc: "Incapacitated + Prone. Auto-fail STR/DEX saves. 5ft hits Auto-Crit.",
        fullDesc:
            "Incapacitated and Prone, Speed 0, unaware of surroundings, automatically fails Strength and Dexterity saving throws, attack rolls have Advantage, and hits within 5 ft are automatic Critical Hits.",
        removal: "Regain any HP, Nat 20 Death Save, or finish a rest."
    }
];

export function KmpConditionsPanel() {
    const { viewModel, state, executeInstantRoll } = useKmpCharacter();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");

    const activeConditions = state?.resolvedConditions || [];
    const activeIds = activeConditions.map((ac: any) => ac.condition.id);
    const exhaustion: number = state?.character?.exhaustion ?? 0;
    const resolvedSkills: any[] = state?.resolvedSkills || [];

    const athleticsMod = resolvedSkills.find((s) => s.key === "athletics")?.total ?? 0;
    const acrobaticsMod = resolvedSkills.find((s) => s.key === "acrobatics")?.total ?? 0;
    const bestEscapeSkill = acrobaticsMod > athleticsMod ? "acrobatics" : "athletics";
    const bestEscapeLabel = acrobaticsMod > athleticsMod ? "Acrobatics" : "Athletics";
    const bestEscapeMod = Math.max(athleticsMod, acrobaticsMod);

    const filteredConditions = CONDITIONS_LIST.filter(
        (c) =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.desc.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <TooltipProvider delayDuration={200} skipDelayDuration={100}>
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <CardTitle className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                                Conditions &amp; 2024 Exhaustion
                            </CardTitle>
                        </div>

                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2.5">
                                    <Plus className="h-3.5 w-3.5" /> Add Condition
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Manage Conditions (D&amp;D 5e 2024)</DialogTitle>
                                </DialogHeader>
                                <div className="py-3 space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search conditions (e.g. Grappled, Raging, Poisoned)..."
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            className="pl-8 h-9 text-xs"
                                        />
                                    </div>
                                    <div className="overflow-y-auto h-[380px] w-full pr-2 space-y-2">
                                        {filteredConditions.map((c) => {
                                            const isActive = activeIds.includes(c.id);
                                            return (
                                                <div
                                                    key={c.id}
                                                    className={cn(
                                                        "flex items-start p-3 rounded-lg cursor-pointer border transition-colors",
                                                        isActive
                                                            ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500"
                                                            : "hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                    )}
                                                    onClick={() => viewModel?.toggleCondition(c.id)}
                                                >
                                                    <div className="flex-1">
                                                        <div className="font-bold text-xs flex items-center justify-between">
                                                            <span>{c.name}</span>
                                                            {isActive && (
                                                                <Badge className="bg-indigo-600 text-white text-[9px] h-4">
                                                                    Active ✓
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                                            {c.fullDesc}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 mt-1.5 border-t border-slate-200 dark:border-slate-800 pt-1">
                                                            <strong>Removal:</strong> {c.removal}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                    {/* 2024 Exhaustion Level Stepper */}
                    <div
                        className={cn(
                            "p-2.5 rounded-lg border flex items-center justify-between gap-2",
                            exhaustion > 0
                                ? "bg-red-50/60 dark:bg-red-950/25 border-red-300 dark:border-red-800"
                                : "bg-slate-50 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800"
                        )}
                    >
                        <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                <span>2024 Exhaustion</span>
                                <Badge
                                    variant={exhaustion > 0 ? "destructive" : "secondary"}
                                    className="text-[10px] font-mono h-4 px-1.5"
                                >
                                    Level {exhaustion} / 6
                                </Badge>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {exhaustion === 0
                                    ? "No penalties (-2 to all D20 Tests & -5 ft. Speed per level)"
                                    : exhaustion >= 6
                                    ? "Level 6 Exhaustion: Character Death!"
                                    : `Active Penalty: -${exhaustion * 2} to all D20 Tests • -${exhaustion * 5} ft. Speed`}
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                disabled={exhaustion <= 0}
                                onClick={() => viewModel?.setExhaustion(Math.max(0, exhaustion - 1))}
                            >
                                <Minus className="w-3 h-3" />
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                disabled={exhaustion >= 6}
                                onClick={() => viewModel?.setExhaustion(Math.min(6, exhaustion + 1))}
                            >
                                <Plus className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>

                    {/* Active Condition Cards with 1-Click Escape / Save Rollers */}
                    {activeConditions.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-2">
                            No active conditions. Click &ldquo;+ Add Condition&rdquo; above to toggle one.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {activeConditions.map((entry: any) => {
                                const c = entry.condition;
                                const cid = (c.id || "").toLowerCase();
                                const conditionData = CONDITIONS_LIST.find((cond) => cond.id === cid);
                                const isGrappleOrRestrain = cid === "grappled" || cid === "restrained";
                                const isWisSave = cid === "frightened" || cid === "charmed";
                                const isConSave =
                                    cid === "poisoned" || cid === "paralyzed" || cid === "stunned";

                                return (
                                    <div
                                        key={c.id}
                                        className="p-2.5 rounded-lg border border-rose-300/60 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/15 space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-xs text-rose-800 dark:text-rose-200">
                                                {c.name}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {isGrappleOrRestrain && (
                                                    <Button
                                                        size="sm"
                                                        className="h-6 text-[10px] px-2 bg-amber-600 hover:bg-amber-500 text-white"
                                                        onClick={() =>
                                                            executeInstantRoll({
                                                                rollType: "skill",
                                                                targetId: bestEscapeSkill,
                                                                label: `Escape ${c.name} (${bestEscapeLabel})`
                                                            })
                                                        }
                                                    >
                                                        ⚡ Escape ({bestEscapeLabel}{" "}
                                                        {bestEscapeMod >= 0
                                                            ? `+${bestEscapeMod}`
                                                            : bestEscapeMod}
                                                        )
                                                    </Button>
                                                )}
                                                {isWisSave && (
                                                    <Button
                                                        size="sm"
                                                        className="h-6 text-[10px] px-2 bg-indigo-600 hover:bg-indigo-500 text-white"
                                                        onClick={() =>
                                                            executeInstantRoll({
                                                                rollType: "saving_throw",
                                                                targetId: "wis",
                                                                label: `${c.name} WIS Save`
                                                            })
                                                        }
                                                    >
                                                        ⚡ Roll WIS Save
                                                    </Button>
                                                )}
                                                {isConSave && (
                                                    <Button
                                                        size="sm"
                                                        className="h-6 text-[10px] px-2 bg-indigo-600 hover:bg-indigo-500 text-white"
                                                        onClick={() =>
                                                            executeInstantRoll({
                                                                rollType: "saving_throw",
                                                                targetId: "con",
                                                                label: `${c.name} CON Save`
                                                            })
                                                        }
                                                    >
                                                        ⚡ Roll CON Save
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 px-1.5 text-[10px] text-rose-600 hover:text-red-500"
                                                    onClick={() => viewModel?.toggleCondition(c.id)}
                                                >
                                                    <X className="w-3 h-3 mr-0.5" /> Clear
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                                            {conditionData?.desc || c.description}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    );
}
