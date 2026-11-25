"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BattleMapCanvas } from "@/components/map/BattleMapCanvas";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, UserCheck } from "lucide-react";

function BattleMapPageContent() {
    const searchParams = useSearchParams();
    const queryCharId = searchParams.get("characterId");
    const parsedQueryCharId = queryCharId ? parseInt(queryCharId, 10) : NaN;
    const [storedCharId] = useState<number | undefined>(() => {
        if (typeof window === "undefined") return undefined;
        const saved = window.localStorage.getItem("dnd_battlemap_char_id");
        const parsed = saved ? parseInt(saved, 10) : NaN;
        return !isNaN(parsed) ? parsed : undefined;
    });

    const activeCharId = !isNaN(parsedQueryCharId) ? parsedQueryCharId : storedCharId;

    useEffect(() => {
        if (!isNaN(parsedQueryCharId) && typeof window !== "undefined") {
            window.localStorage.setItem("dnd_battlemap_char_id", String(parsedQueryCharId));
        }
    }, [parsedQueryCharId]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-3 sm:p-5 gap-3">
            <header className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <Link href="/">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs border-slate-800 bg-slate-900 text-slate-200"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Party Roster
                        </Button>
                    </Link>
                    {activeCharId && (
                        <Link href={`/character/${activeCharId}`}>
                            <Button
                                size="sm"
                                className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                            >
                                <UserCheck className="w-3.5 h-3.5" />
                                Back to Character Sheet (#{activeCharId})
                            </Button>
                        </Link>
                    )}
                    <div className="ml-1">
                        <h1 className="text-base sm:text-lg font-black text-white leading-tight">
                            Real-Time LAN Battle Map &amp; Tactical Canvas
                        </h1>
                        <p className="text-[11px] text-slate-400">
                            Synchronized across all devices on the network • Switch between Player View and DM Architect in the map toolbar
                        </p>
                    </div>
                </div>

                <Link href="/dm">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs border-amber-500/40 bg-amber-950/30 text-amber-300"
                    >
                        <Shield className="w-3.5 h-3.5" />
                        DM Command Center
                    </Button>
                </Link>
            </header>

            <BattleMapCanvas
                role="player"
                characterId={activeCharId}
                className="flex-1"
            />
        </div>
    );
}

export default function StandaloneBattleMapPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center text-xs">
                    Loading Battle Map...
                </div>
            }
        >
            <BattleMapPageContent />
        </Suspense>
    );
}
