"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, Swords, Flame, Dices, Heart, Moon, Zap, Compass } from "lucide-react";

export function EventLogPanel({ events }: { events: any[] }) {
    const safeEvents = events || [];

    const getIcon = (type: string) => {
        switch (type) {
            case "attack":
                return <Swords className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
            case "spell_cast":
                return <Flame className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
            case "heal":
                return <Heart className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
            case "damage":
                return <Zap className="w-3.5 h-3.5 text-red-500 shrink-0" />;
            case "rest":
                return <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
            case "quest":
                return <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
            default:
                return <Dices className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-500" />
                    <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                        Action & Roll Log
                    </h2>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono">
                    {safeEvents.length} events
                </Badge>
            </div>

            {safeEvents.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-4 text-center">
                    Click any Skill, Save, Initiative, Attack, or Spell to roll and log events.
                </div>
            ) : (
                <ScrollArea className="h-56 pr-2">
                    <div className="space-y-2">
                        {safeEvents.map((evt: any, idx: number) => (
                            <div
                                key={evt.id || idx}
                                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100 truncate">
                                        {getIcon(evt.eventType)}
                                        <span className="truncate">{evt.title}</span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-mono shrink-0 uppercase">
                                        {evt.eventType}
                                    </span>
                                </div>
                                {evt.summary && (
                                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono leading-snug">
                                        {evt.summary}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}
