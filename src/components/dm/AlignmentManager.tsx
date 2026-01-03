"use client";

import { useState, useEffect, useTransition } from "react";
import { ALIGNMENTS, type Alignment } from "@/lib/constants";
import { getActivePlayersWithAlignment, updateCharacterAlignment } from "@/app/dm-actions";

interface Player {
    id: number;
    name: string;
    alignment: string | null;
}

export function AlignmentManager() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        async function fetchPlayers() {
            const result = await getActivePlayersWithAlignment();
            if (result.success && result.players) {
                setPlayers(result.players);
            }
            setLoading(false);
        }
        fetchPlayers();
    }, []);

    const handleAlignmentChange = (characterId: number, newAlignment: string) => {
        // Optimistic update
        setPlayers(prev =>
            prev.map(p => p.id === characterId ? { ...p, alignment: newAlignment } : p)
        );

        startTransition(async () => {
            const result = await updateCharacterAlignment(characterId, newAlignment);
            if (!result.success) {
                // Revert on failure - refetch
                const refetch = await getActivePlayersWithAlignment();
                if (refetch.success && refetch.players) {
                    setPlayers(refetch.players);
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="p-6 rounded-lg bg-zinc-900 border border-zinc-800">
                <h2 className="text-xl font-semibold text-amber-500 mb-2">Player Alignments</h2>
                <p className="text-zinc-400">Loading players...</p>
            </div>
        );
    }

    if (players.length === 0) {
        return (
            <div className="p-6 rounded-lg bg-zinc-900 border border-zinc-800">
                <h2 className="text-xl font-semibold text-amber-500 mb-2">Player Alignments</h2>
                <p className="text-zinc-400">No characters found.</p>
            </div>
        );
    }

    return (
        <div className="p-6 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-900/50 transition-colors">
            <h2 className="text-xl font-semibold text-amber-500 mb-4">Player Alignments</h2>
            <p className="text-zinc-400 mb-4">
                View and modify the alignment of active player characters.
            </p>

            <div className="space-y-3">
                {players.map(player => (
                    <div
                        key={player.id}
                        className="flex items-center justify-between gap-4 py-2 border-b border-zinc-800 last:border-0"
                    >
                        <span className="text-white font-medium min-w-[120px]">
                            {player.name}
                        </span>
                        <select
                            value={player.alignment || ""}
                            onChange={(e) => handleAlignmentChange(player.id, e.target.value)}
                            disabled={isPending}
                            className="flex-1 max-w-[200px] px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:ring-2 focus:ring-amber-600 outline-none disabled:opacity-50"
                        >
                            <option value="">Unset</option>
                            {ALIGNMENTS.map(alignment => (
                                <option key={alignment} value={alignment}>
                                    {alignment}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
        </div>
    );
}
