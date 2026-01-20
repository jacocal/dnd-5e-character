"use client";

import { useCharacterStore } from "@/store/character-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Plus, Search } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CONDITIONS_LIST = [
    {
        id: "blinded",
        name: "Blinded",
        desc: "Can't see. Disadv on attacks. Enemy attacks have Adv.",
        fullDesc: "A blinded creature can't see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
        removal: "Depends on source (spell ends, healing, etc.)"
    },
    {
        id: "charmed",
        name: "Charmed",
        desc: "Can't attack charmer. Charmer has Adv on social.",
        fullDesc: "A charmed creature can't attack the charmer or target them with harmful abilities or magical effects. The charmer has advantage on ability checks to interact socially with the creature.",
        removal: "Usually ends when spell ends or charmer harms the creature."
    },
    {
        id: "deafened",
        name: "Deafened",
        desc: "Can't hear.",
        fullDesc: "A deafened creature can't hear and automatically fails any ability check that requires hearing.",
        removal: "Depends on source (spell ends, healing, etc.)"
    },
    {
        id: "frightened",
        name: "Frightened",
        desc: "Disadv on checks/attacks. Can't move closer.",
        fullDesc: "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can't willingly move closer to the source of its fear.",
        removal: "Usually ends when source is no longer visible or spell ends."
    },
    {
        id: "grappled",
        name: "Grappled",
        desc: "Speed 0.",
        fullDesc: "A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed. The condition ends if the grappler is incapacitated or moved away.",
        removal: "Escape using Athletics or Acrobatics vs grappler's Athletics."
    },
    {
        id: "incapacitated",
        name: "Incapacitated",
        desc: "No actions or reactions.",
        fullDesc: "An incapacitated creature can't take actions or reactions.",
        removal: "Depends on source causing incapacitation."
    },
    {
        id: "invisible",
        name: "Invisible",
        desc: "Adv on attacks. Enemy Disadv.",
        fullDesc: "An invisible creature is impossible to see without magic or special senses. The creature's attack rolls have advantage, and attack rolls against the creature have disadvantage.",
        removal: "Spell ends, attacking, or casting a spell may end it."
    },
    {
        id: "paralyzed",
        name: "Paralyzed",
        desc: "Incapacitated. Auto-crit from 5ft.",
        fullDesc: "A paralyzed creature is incapacitated and can't move or speak. It automatically fails Strength and Dexterity saving throws. Attacks against it have advantage, and any attack that hits from within 5 feet is a critical hit.",
        removal: "Usually ends when spell/effect duration expires."
    },
    {
        id: "petrified",
        name: "Petrified",
        desc: "Stone. Resistance to all damage.",
        fullDesc: "A petrified creature is transformed to stone. It is incapacitated, can't move or speak, and has resistance to all damage. It automatically fails Strength and Dexterity saves.",
        removal: "Greater Restoration spell or similar magic."
    },
    {
        id: "poisoned",
        name: "Poisoned",
        desc: "Disadv on attacks and checks.",
        fullDesc: "A poisoned creature has disadvantage on attack rolls and ability checks.",
        removal: "Time, Lesser/Greater Restoration, or specific antidotes."
    },
    {
        id: "prone",
        name: "Prone",
        desc: "Crawl. Disadv on attacks. Enemy Adv (melee) / Disadv (ranged).",
        fullDesc: "A prone creature can only move by crawling (costs extra movement). It has disadvantage on attack rolls. Attacks from within 5 feet have advantage; ranged attacks have disadvantage.",
        removal: "Stand up using half your movement speed."
    },
    {
        id: "restrained",
        name: "Restrained",
        desc: "Speed 0. Disadv on Dex saves. Enemy Adv.",
        fullDesc: "A restrained creature's speed becomes 0. Attack rolls against it have advantage, and its attack rolls and Dexterity saves have disadvantage.",
        removal: "Depends on source (escape, spell ends, etc.)"
    },
    {
        id: "stunned",
        name: "Stunned",
        desc: "Incapacitated. Fail Str/Dex saves.",
        fullDesc: "A stunned creature is incapacitated, can't move, and can speak only falteringly. It automatically fails Strength and Dexterity saves. Attack rolls against it have advantage.",
        removal: "Usually ends when spell/effect duration expires."
    },
    {
        id: "unconscious",
        name: "Unconscious",
        desc: "Incapacitated. Drop items. Auto-crit.",
        fullDesc: "An unconscious creature is incapacitated, can't move or speak, drops what it's holding, and falls prone. It automatically fails Strength and Dexterity saves. Attacks have advantage, and hits from within 5 feet are critical hits.",
        removal: "Healing, stabilization, or completing a long rest."
    },
    {
        id: "exhaustion",
        name: "Exhaustion",
        desc: "Cumulative penalties.",
        fullDesc: "Exhaustion is measured in 6 levels. Effects include: disadvantage on checks (1), speed halved (2), disadvantage on attacks/saves (3), HP max halved (4), speed 0 (5), death (6).",
        removal: "Long rest removes 1 level (with food/drink). Greater Restoration removes 1 level."
    },
];

export function ConditionsPanel() {
    const { conditions, toggleCondition } = useCharacterStore();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");

    const filteredConditions = CONDITIONS_LIST.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.desc.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <TooltipProvider delayDuration={200} skipDelayDuration={100}>
            <Card>
                <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Conditions</CardTitle>
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Manage Conditions</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                    <div className="relative mb-4">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search conditions..."
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            className="pl-8"
                                        />
                                    </div>
                                    <div className="overflow-y-auto h-[400px] w-full pr-4">
                                        <div className="space-y-2">
                                            {filteredConditions.length === 0 && (
                                                <div className="text-center text-sm text-slate-500 py-4">
                                                    No conditions found.
                                                </div>
                                            )}
                                            {filteredConditions.map((c) => {
                                                const isActive = conditions.some(ac => ac.id === c.id);
                                                return (
                                                    <div
                                                        key={c.id}
                                                        className={`flex items-start p-3 rounded-md cursor-pointer border transition-colors ${isActive ? "bg-accent border-primary" : "hover:bg-accent/50 border-transparent"}`}
                                                        onClick={() => toggleCondition({ id: c.id, name: c.name, description: c.desc })}
                                                    >
                                                        <div className="flex-1">
                                                            <div className="font-medium text-sm flex items-center gap-2">
                                                                {c.name}
                                                                {isActive && <Check className="h-3 w-3 text-primary" />}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-1">{c.fullDesc}</div>
                                                            <div className="text-xs text-slate-500 mt-1.5 border-t border-slate-200 dark:border-slate-700 pt-1.5">
                                                                <span className="font-medium">Removal:</span> {c.removal}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent className="py-2">
                    {conditions.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No active conditions</p>
                    ) : (
                        <div className="flex flex-wrap gap-1">
                            {conditions.map(c => {
                                const conditionData = CONDITIONS_LIST.find(cond => cond.id === c.id);
                                return (
                                    <Tooltip key={c.id}>
                                        <TooltipTrigger asChild>
                                            <span
                                                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-secondary text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
                                                onClick={() => toggleCondition(c)}
                                            >
                                                {c.name}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            <p className="text-xs font-medium mb-1">{c.name}</p>
                                            <p className="text-xs">{conditionData?.fullDesc || c.description}</p>
                                            {conditionData?.removal && (
                                                <p className="text-xs text-slate-400 mt-1 border-t border-slate-600 pt-1">
                                                    <span className="font-medium">Remove:</span> {conditionData.removal}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-slate-500 mt-1 italic">Click to remove</p>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    );
}
