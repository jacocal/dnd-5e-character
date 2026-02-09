"use client";

import React from "react";
import { useKmpDmDashboard } from "./KmpDmDashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const ALIGNMENTS = [
    "Lawful Good", "Neutral Good", "Chaotic Good",
    "Lawful Neutral", "True Neutral", "Chaotic Neutral",
    "Lawful Evil", "Neutral Evil", "Chaotic Evil",
    "Unaligned"
];

export function KmpDmDashboard() {
    const { viewModel, state, isLoading, error, refresh } = useKmpDmDashboard();

    if (isLoading && (!state || state.players.length === 0)) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    if (error && (!state || state.players.length === 0)) {
        return (
            <div className="p-8 text-center text-red-500">
                <p>Error loading dashboard: {error}</p>
                <button onClick={refresh} className="mt-4 underline">Retry</button>
            </div>
        );
    }

    const players = state?.players || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Active Players ({players.length})</h2>
                <button
                    onClick={refresh}
                    className="text-sm text-muted-foreground hover:text-primary"
                >
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.map((player: any) => (
                    <Card key={player.id}>
                        <CardHeader className="pb-2">
                            <CardTitle>{player.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">ID: {player.id}</div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium uppercase text-muted-foreground">Alignment</label>
                                    <Select
                                        value={player.alignment || "Unaligned"}
                                        onValueChange={(value) => viewModel?.updateAlignment(player.id, value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Alignment" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ALIGNMENTS.map(align => (
                                                <SelectItem key={align} value={align}>{align}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {players.length === 0 && !isLoading && (
                <div className="text-center p-8 text-muted-foreground bg-muted rounded-lg border-dashed border">
                    No active players found.
                </div>
            )}
        </div>
    );
}
