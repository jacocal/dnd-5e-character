"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface KmpDmDashboardContextType {
    viewModel: any;
    state: any;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

const KmpDmDashboardContext = createContext<KmpDmDashboardContextType | undefined>(undefined);

export function KmpDmDashboardProvider({ children }: { children: React.ReactNode }) {
    const [players, setPlayers] = useState<any[]>([]);
    const [catalogItems, setCatalogItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadPlayers = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [resp, rulesResp] = await Promise.all([
                fetch("/api/engine/dm/players", { cache: "no-store" }),
                catalogItems.length > 0
                    ? Promise.resolve(null)
                    : fetch("/api/engine/rules", { cache: "force-cache" })
            ]);
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }
            const sheets = await resp.json();
            if (rulesResp && rulesResp.ok) {
                const rules = await rulesResp.json();
                setCatalogItems(rules.items || []);
            }
            const mapped = (sheets || []).map((sheet: any) => ({
                id: sheet.character.id,
                name: sheet.character.name,
                raceName: sheet.character.raceEntry?.name || sheet.character.raceId,
                alignment: sheet.character.alignment || "Neutral",
                level: sheet.character.level,
                xp: sheet.character.xp ?? 0,
                gp: sheet.character.gp ?? 0,
                hpCurrent: sheet.character.hpCurrent,
                hpMax: sheet.character.hpMax,
                tempHp: sheet.character.tempHp ?? 0,
                inspiration: !!sheet.character.inspiration,
                exhaustion: sheet.character.exhaustion ?? 0,
                armorClass: sheet.combatStats?.armorClass ?? 10,
                initiative: sheet.combatStats?.initiative ?? 0,
                speed: sheet.combatStats?.speed ?? 30,
                passivePerception: sheet.combatStats?.passivePerception ?? 10,
                concentrationSpellName: sheet.concentrationSpellName,
                activeConditions: (sheet.activeConditions || []).map((c: any) => c.condition),
                quests: sheet.character.quests || [],
                recentEvents: (sheet.character.events || []).slice(0, 4),
                classSummary: (sheet.character.classes || [])
                    .map((c: any) => `${c.className || c.classId} ${c.level}`)
                    .join(" / ")
            }));
            setPlayers(mapped);
        } catch (err: any) {
            console.error("[KmpDmDashboardProvider] Error:", err);
            setError(err.message || "Failed to load active players");
        } finally {
            setIsLoading(false);
        }
    }, [catalogItems.length]);

    useEffect(() => {
        loadPlayers();
    }, [loadPlayers]);

    const dispatchToCharacter = useCallback(async (characterId: number, command: any) => {
        await fetch(`/api/engine/characters/${characterId}/commands`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(command)
        });
    }, []);

    const viewModel = React.useMemo(
        () => ({
            loadPlayers,
            updateAlignment: async (characterId: number, alignment: string) => {
                setPlayers((prev) =>
                    prev.map((p) => (p.id === characterId ? { ...p, alignment } : p))
                );
                await fetch("/api/engine/dm/alignment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ characterId, alignment })
                });
            },
            dispatchCharacterCommand: async (characterId: number, command: any) => {
                await dispatchToCharacter(characterId, command);
                await loadPlayers();
            },
            broadcastPartyCommand: async (targetIds: number[], command: any) => {
                await Promise.all(targetIds.map((id) => dispatchToCharacter(id, command)));
                await loadPlayers();
            },
            awardGoldToPlayer: async (characterId: number, deltaGp: number) => {
                const player = players.find((p) => p.id === characterId);
                if (!player) return;
                await dispatchToCharacter(characterId, {
                    type: "UPDATE_CURRENCY",
                    gp: Math.max(0, (player.gp || 0) + deltaGp)
                });
                await loadPlayers();
            },
            awardPartyRewards: async (targetIds: number[], xpEach: number, gpEach: number, itemId?: string) => {
                await Promise.all(
                    targetIds.map(async (id) => {
                        const p = players.find((pl) => pl.id === id);
                        if (xpEach > 0) {
                            await dispatchToCharacter(id, { type: "ADD_XP", amount: xpEach });
                        }
                        if (gpEach > 0 && p) {
                            await dispatchToCharacter(id, {
                                type: "UPDATE_CURRENCY",
                                gp: (p.gp || 0) + gpEach
                            });
                        }
                        if (itemId) {
                            await dispatchToCharacter(id, {
                                type: "ADD_ITEM",
                                targetId: itemId,
                                intValue: 1
                            });
                        }
                    })
                );
                await loadPlayers();
            },
            broadcastQuest: async (
                targetIds: number[],
                questData: {
                    title: string;
                    description?: string;
                    category?: string;
                    giver?: string;
                    location?: string;
                    rewardXp?: number;
                    rewardGp?: number;
                    rewardNotes?: string;
                    objectives?: string[];
                }
            ) => {
                await Promise.all(
                    targetIds.map((id) =>
                        dispatchToCharacter(id, {
                            type: "ADD_QUEST",
                            textValue: questData.title,
                            textValue2: questData.description || "",
                            targetId: questData.category || "main",
                            textValue3: `${questData.giver || ""}|||${questData.location || ""}|||${questData.rewardNotes || ""}`,
                            intValue: questData.rewardXp || 0,
                            intValue2: questData.rewardGp || 0,
                            boolValue: true,
                            secondaryId: (questData.objectives || []).join("\n")
                        })
                    )
                );
                await loadPlayers();
            }
        }),
        [loadPlayers, dispatchToCharacter, players]
    );

    const state = React.useMemo(
        () => ({
            players,
            catalogItems,
            isLoading,
            error
        }),
        [players, catalogItems, isLoading, error]
    );

    return (
        <KmpDmDashboardContext.Provider
            value={{
                viewModel,
                state,
                isLoading,
                error,
                refresh: loadPlayers
            }}
        >
            {children}
        </KmpDmDashboardContext.Provider>
    );
}

export function useKmpDmDashboard() {
    const context = useContext(KmpDmDashboardContext);
    if (context === undefined) {
        throw new Error("useKmpDmDashboard must be used within a KmpDmDashboardProvider");
    }
    return context;
}
