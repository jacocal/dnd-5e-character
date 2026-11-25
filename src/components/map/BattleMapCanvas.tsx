"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Compass,
    Move,
    Hand,
    Ruler,
    Flame,
    Radio,
    Pencil,
    Square,
    Circle as CircleIcon,
    BrickWall,
    DoorOpen,
    AlertTriangle,
    Waves,
    Type,
    Eye,
    EyeOff,
    Eraser,
    Skull,
    HeartPulse,
    CheckCircle2,
    Plus,
    Trash2,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Minimize2,
    Crosshair,
    Users,
    SkipForward,
    SkipBack,
    RotateCcw,
    Dices,
    Layers,
    Sparkles,
    Shield,
    Swords
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MapTool =
    | "select"
    | "pan"
    | "ruler"
    | "ping"
    | "aoe"
    | "freehand"
    | "wall"
    | "door"
    | "rect"
    | "circle"
    | "terrain_difficult"
    | "terrain_water"
    | "terrain_hazard"
    | "text"
    | "fog"
    | "eraser";

const MONSTER_PRESETS = [
    { name: "Goblin Ambush", label: "GB", sizeCategory: "Small", sizeFt: 5, ac: 15, speedFt: 30, color: "#ea580c" },
    { name: "Shadow Cultist", label: "SC", sizeCategory: "Medium", sizeFt: 5, ac: 13, speedFt: 30, color: "#ef4444" },
    { name: "Skeleton Warrior", label: "SK", sizeCategory: "Medium", sizeFt: 5, ac: 13, speedFt: 30, color: "#94a3b8" },
    { name: "Sanctum Ogre", label: "OG", sizeCategory: "Large", sizeFt: 10, ac: 11, speedFt: 40, color: "#dc2626" },
    { name: "Shadow Wyvern", label: "WY", sizeCategory: "Huge", sizeFt: 15, ac: 15, speedFt: 80, color: "#991b1b" },
    { name: "Adult Red Dragon", label: "RD", sizeCategory: "Huge", sizeFt: 15, ac: 19, speedFt: 80, color: "#b91c1c" },
    { name: "Ancient Titan", label: "AT", sizeCategory: "Gargantuan", sizeFt: 20, ac: 20, speedFt: 50, color: "#7f1d1d" },
    { name: "Allied Guard (NPC)", label: "GD", sizeCategory: "Medium", sizeFt: 5, ac: 16, speedFt: 30, color: "#0ea5e9" }
];

const AOE_PRESETS = [
    { id: "sphere-20", label: "20ft Sphere (Fireball)", shape: "sphere", sizeFt: 20, widthFt: 20, color: "#f97316" },
    { id: "cone-15", label: "15ft Cone (Burning Hands)", shape: "cone", sizeFt: 15, widthFt: 15, color: "#ef4444" },
    { id: "cone-30", label: "30ft Cone (Fear / Breath)", shape: "cone", sizeFt: 30, widthFt: 30, color: "#a855f7" },
    { id: "cone-60", label: "60ft Cone (Cone of Cold)", shape: "cone", sizeFt: 60, widthFt: 60, color: "#38bdf8" },
    { id: "cube-15", label: "15ft Cube (Thunderwave)", shape: "cube", sizeFt: 15, widthFt: 15, color: "#6366f1" },
    { id: "line-60", label: "60×5ft Line (Gust / Sunbeam)", shape: "line", sizeFt: 60, widthFt: 5, color: "#eab308" },
    { id: "line-100", label: "100×5ft Line (Lightning Bolt)", shape: "line", sizeFt: 100, widthFt: 5, color: "#06b6d4" }
];

/**
 * Calculates D&D 5e distance in feet between two points (x1, y1) and (x2, y2) in feet,
 * supporting both Standard 5e (5ft diagonals) and Tactical Variant (5-10-5ft alternating diagonals),
 * plus optional 2x Difficult Terrain penalty when crossing terrain_difficult / terrain_water zones.
 */
export function calculateTacticalDistanceFt(
    x1Ft: number,
    y1Ft: number,
    x2Ft: number,
    y2Ft: number,
    diagonalRule: string = "standard",
    shapes: any[] = []
): { baseFt: number; terrainPenaltyFt: number; totalFt: number } {
    const dxFt = Math.abs(x2Ft - x1Ft);
    const dyFt = Math.abs(y2Ft - y1Ft);
    const dxCells = dxFt / 5.0;
    const dyCells = dyFt / 5.0;
    const diagCells = Math.min(dxCells, dyCells);
    const straightCells = Math.max(dxCells, dyCells) - diagCells;

    const baseCells =
        diagonalRule === "5-10-5"
            ? straightCells + Math.floor(diagCells * 1.5)
            : straightCells + diagCells;
    const baseFt = Math.round((baseCells * 5.0) / 5.0) * 5;

    // Sample 10 points along the segment to check how much passes through difficult terrain
    const difficultZones = (shapes || []).filter(
        (s) => s.type === "terrain_difficult" || s.type === "terrain_water"
    );
    if (difficultZones.length === 0 || baseFt === 0) {
        return { baseFt, terrainPenaltyFt: 0, totalFt: baseFt };
    }

    let difficultSamples = 0;
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const sx = x1Ft + (x2Ft - x1Ft) * t;
        const sy = y1Ft + (y2Ft - y1Ft) * t;
        const inDiff = difficultZones.some((z) => {
            const minX = Math.min(z.xFt, z.xFt + (z.widthFt || 0));
            const maxX = Math.max(z.xFt, z.xFt + (z.widthFt || 0));
            const minY = Math.min(z.yFt, z.yFt + (z.heightFt || 0));
            const maxY = Math.max(z.yFt, z.yFt + (z.heightFt || 0));
            return sx >= minX && sx <= maxX && sy >= minY && sy <= maxY;
        });
        if (inDiff) difficultSamples++;
    }

    const penaltyFt = Math.round(((baseFt * (difficultSamples / steps)) / 5.0)) * 5;
    return {
        baseFt,
        terrainPenaltyFt: penaltyFt,
        totalFt: baseFt + penaltyFt
    };
}

function parseRangeFtFromString(rangeStr?: string | null): number | null {
    if (!rangeStr) return null;
    const lower = rangeStr.toLowerCase();
    if (lower.includes("touch") || lower.includes("reach")) return 5;
    const m = lower.match(/(\d+)\s*(?:ft|feet)/);
    return m ? parseInt(m[1], 10) : null;
}

interface BattleMapCanvasProps {
    role?: "player" | "dm";
    allowRoleSwitch?: boolean;
    characterId?: number;
    characterName?: string;
    characterActions?: any[];
    className?: string;
}

export function BattleMapCanvas({
    role: initialRole = "player",
    allowRoleSwitch = false,
    characterId,
    characterName,
    characterActions = [],
    className
}: BattleMapCanvasProps) {
    const [roleState, setRole] = useState<"player" | "dm">(initialRole);
    const role = allowRoleSwitch ? roleState : initialRole;
    const [storedPlayerCharId, setActivePlayerCharId] = useState<number | undefined>(() => {
        if (characterId) return characterId;
        if (typeof window !== "undefined") {
            const savedId = window.localStorage.getItem("dnd_battlemap_char_id");
            if (savedId) {
                const parsed = parseInt(savedId, 10);
                if (!isNaN(parsed)) return parsed;
            }
        }
        return undefined;
    });
    const [mapState, setMapState] = useState<any | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Viewport & Tool State
    const [activeTool, setActiveTool] = useState<MapTool>("select");
    const [pxPerFoot, setPxPerFoot] = useState<number>(6); // 6px per foot => 30px per 5ft square, 160ft = 960px
    const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
    const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
    const [drawColor, setDrawColor] = useState<string>("#cbd5e1");
    const [textLabelInput, setTextLabelInput] = useState<string>("Objective / Room");
    const [selectedAoePresetId, setSelectedAoePresetId] = useState<string>("sphere-20");
    const [rangeRingFt, setRangeRingFt] = useState<number>(0);

    // Selection & Interactive Drag State
    const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
    const [draggingToken, setDraggingToken] = useState<{
        tokenId: string;
        startXFt: number;
        startYFt: number;
        currentXFt: number;
        currentYFt: number;
    } | null>(null);
    const [activeDragTool, setActiveDragTool] = useState<{
        tool: MapTool;
        startXFt: number;
        startYFt: number;
        currentXFt: number;
        currentYFt: number;
        points: Array<{ xFt: number; yFt: number }>;
    } | null>(null);
    const [isPanning, setIsPanning] = useState<{
        startClientX: number;
        startClientY: number;
        origPanX: number;
        origPanY: number;
    } | null>(null);

    // DM Drawers / Modals
    const [showMonsterSpawner, setShowMonsterSpawner] = useState(false);
    const [showSceneSettings, setShowSceneSettings] = useState(false);
    const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
    const [customMonsterName, setCustomMonsterName] = useState<string>("");
    const [customMonsterSize, setCustomMonsterSize] = useState<string>("Medium");
    const [customMonsterCount, setCustomMonsterCount] = useState<number>(1);

    // Scene Creator / Settings Inputs
    const [newSceneTitle, setNewSceneTitle] = useState("");
    const [newSceneWidth, setNewSceneWidth] = useState("180");
    const [newSceneHeight, setNewSceneHeight] = useState("140");
    const [newSceneCell, setNewSceneCell] = useState("5");
    const [bgUrlInput, setBgUrlInput] = useState("");

    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // 1. Connect to Real-Time Battle Map SSE Stream (/api/engine/battlemap/stream)
    useEffect(() => {
        let es: EventSource | null = null;
        let retryTimeout: ReturnType<typeof setTimeout> | null = null;

        const connect = () => {
            es = new EventSource("/api/engine/battlemap/stream");
            es.onopen = () => {
                setIsConnected(true);
            };
            es.onmessage = (evt) => {
                try {
                    const data = JSON.parse(evt.data);
                    if (data && data.activeScene) {
                        setMapState(data);
                        setIsConnected(true);
                    }
                } catch {
                    // ignore malformed frame
                }
            };
            es.onerror = () => {
                setIsConnected(false);
                es?.close();
                retryTimeout = setTimeout(connect, 2500);
            };
        };

        connect();
        return () => {
            if (retryTimeout) clearTimeout(retryTimeout);
            es?.close();
        };
    }, []);

    const sendMapCommand = useCallback(async (cmd: any) => {
        try {
            const resp = await fetch("/api/engine/battlemap/commands", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cmd)
            });
            if (resp.ok) {
                const updated = await resp.json();
                setMapState(updated);
            }
        } catch (e) {
            console.error("[BattleMapCanvas] Command error:", e);
        }
    }, []);

    const scene = mapState?.activeScene;
    const allScenes: any[] = mapState?.scenes || [];
    const tokens: any[] = scene?.tokens || [];
    const shapes: any[] = scene?.shapes || [];
    const fogZones: any[] = scene?.fogZones || [];
    const aoeTemplates: any[] = scene?.aoeTemplates || [];
    const diagonalRule: string = scene?.diagonalRule || "standard";
    const cellSizeFt: number = scene?.cellSizeFt || 5;
    const widthFt: number = scene?.widthFt || 160;
    const heightFt: number = scene?.heightFt || 120;

    // List of player characters on the map for controller assignment
    const partyCharacters = useMemo(() => {
        const seen = new Map<number, string>();
        tokens.forEach((t) => {
            if (t.tokenType === "player" && t.characterId && t.characterId > 0) {
                seen.set(t.characterId, t.name);
            }
        });
        return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
    }, [tokens]);

    // Derive active player character (explicit prop -> selected/stored -> first party character)
    const activePlayerCharId = characterId ?? storedPlayerCharId ?? partyCharacters[0]?.id;

    // Auto-select player's own token on load
    const myPlayerToken = useMemo(
        () =>
            tokens.find(
                (t) =>
                    (activePlayerCharId && t.characterId === activePlayerCharId && t.tokenType === "player") ||
                    (characterName && t.name.toLowerCase() === characterName.toLowerCase())
            ) || tokens.find((t) => t.tokenType === "player"),
        [tokens, activePlayerCharId, characterName]
    );

    const effectiveSelectedTokenId = selectedTokenId ?? myPlayerToken?.id ?? null;

    const selectedToken = useMemo(
        () => tokens.find((t) => t.id === effectiveSelectedTokenId) || null,
        [tokens, effectiveSelectedTokenId]
    );

    // Calculate live distances from player's token (or selected token) to all visible enemy tokens
    const referenceToken = myPlayerToken || selectedToken;
    const enemyDistances = useMemo(() => {
        if (!referenceToken) return [];
        return tokens
            .filter((t) => t.tokenType === "enemy" && (!t.isHidden || role === "dm") && t.state !== "dead")
            .map((enemy) => {
                const dist = calculateTacticalDistanceFt(
                    referenceToken.xFt,
                    referenceToken.yFt,
                    enemy.xFt,
                    enemy.yFt,
                    diagonalRule,
                    shapes
                );
                return {
                    ...enemy,
                    distanceFt: dist.baseFt
                };
            })
            .sort((a, b) => a.distanceFt - b.distanceFt);
    }, [tokens, referenceToken, diagonalRule, shapes, role]);

    // Extract range options from character's equipped weapons & prepared spells
    const actionRangeOptions = useMemo(() => {
        const opts: Array<{ label: string; rangeFt: number }> = [
            { label: "No Range Ring", rangeFt: 0 },
            { label: "5 ft. (Melee Reach)", rangeFt: 5 },
            { label: "15 ft. (Close / Burning Hands)", rangeFt: 15 },
            { label: "30 ft. (Short / Misty Step)", rangeFt: 30 },
            { label: "60 ft. (Medium / Sacred Flame)", rangeFt: 60 },
            { label: "120 ft. (Long / Fire Bolt / Eldritch Blast)", rangeFt: 120 },
            { label: "150 ft. (Longbow / Fireball)", rangeFt: 150 }
        ];
        const seen = new Set(opts.map((o) => o.rangeFt));
        (characterActions || []).forEach((act: any) => {
            const rFt = parseRangeFtFromString(act.range);
            if (rFt && rFt > 0 && !seen.has(rFt)) {
                seen.add(rFt);
                opts.push({ label: `${rFt} ft. (${act.name})`, rangeFt: rFt });
            }
        });
        return opts.sort((a, b) => a.rangeFt - b.rangeFt);
    }, [characterActions]);

    // Convert client mouse/touch coordinates to map Feet coordinates
    const clientToMapFt = useCallback(
        (clientX: number, clientY: number, shouldSnap: boolean = snapToGrid): { xFt: number; yFt: number } => {
            const svg = svgRef.current;
            if (!svg) return { xFt: 0, yFt: 0 };
            const rect = svg.getBoundingClientRect();
            const rawXFt = (clientX - rect.left - panOffset.x) / pxPerFoot;
            const rawYFt = (clientY - rect.top - panOffset.y) / pxPerFoot;
            const clampedX = Math.max(0, Math.min(widthFt, rawXFt));
            const clampedY = Math.max(0, Math.min(heightFt, rawYFt));
            if (!shouldSnap) {
                return {
                    xFt: Math.round(clampedX * 2) / 2,
                    yFt: Math.round(clampedY * 2) / 2
                };
            }
            // Snap to 2.5ft half-cell center so 5ft tokens sit cleanly in grid squares
            const snapStep = 2.5;
            return {
                xFt: Math.round(clampedX / snapStep) * snapStep,
                yFt: Math.round(clampedY / snapStep) * snapStep
            };
        },
        [panOffset, pxPerFoot, widthFt, heightFt, snapToGrid]
    );

    const canMoveToken = useCallback(
        (token: any): boolean => {
            if (role === "dm") return true;
            // characterId === -1 means Shared Party Control (any player can move this token)
            if (token.characterId === -1) return true;
            if (activePlayerCharId && activePlayerCharId > 0) {
                return token.characterId === activePlayerCharId;
            }
            return false;
        },
        [role, activePlayerCharId]
    );

    const getControllerLabel = useCallback(
        (token: any): string => {
            if (token.characterId === -1) return "All Players (Shared)";
            if (token.characterId && token.characterId > 0) {
                const owner = partyCharacters.find((p) => p.id === token.characterId);
                return owner ? owner.name : `Character #${token.characterId}`;
            }
            return "DM Only";
        },
        [partyCharacters]
    );

    // Fit map into container viewport
    const handleFitToScreen = useCallback(() => {
        const cont = containerRef.current;
        if (!cont) return;
        const rect = cont.getBoundingClientRect();
        const fitPx = Math.min((rect.width - 40) / widthFt, (rect.height - 40) / heightFt);
        setPxPerFoot(Math.max(2.5, Math.min(14, Math.round(fitPx * 10) / 10)));
        setPanOffset({ x: 20, y: 20 });
    }, [widthFt, heightFt]);

    const handleCenterOnMyToken = useCallback(() => {
        const target = myPlayerToken || selectedToken;
        const cont = containerRef.current;
        if (!target || !cont) return;
        const rect = cont.getBoundingClientRect();
        setPanOffset({
            x: rect.width / 2 - target.xFt * pxPerFoot,
            y: rect.height / 2 - target.yFt * pxPerFoot
        });
    }, [myPlayerToken, selectedToken, pxPerFoot]);

    // Pointer Handlers for Canvas
    const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
        if (activeTool === "pan" || e.button === 1) {
            setIsPanning({
                startClientX: e.clientX,
                startClientY: e.clientY,
                origPanX: panOffset.x,
                origPanY: panOffset.y
            });
            return;
        }

        const pt = clientToMapFt(e.clientX, e.clientY, activeTool !== "freehand");

        if (activeTool === "ping") {
            sendMapCommand({
                type: "PING_MAP",
                ping: {
                    id: `ping-${Date.now()}`,
                    xFt: pt.xFt,
                    yFt: pt.yFt,
                    color: role === "dm" ? "#f59e0b" : "#38bdf8",
                    senderName: role === "dm" ? "DM" : characterName || "Player",
                    timestampMs: Date.now()
                }
            });
            return;
        }

        if (activeTool === "text" && role === "dm") {
            if (!textLabelInput.trim()) return;
            sendMapCommand({
                type: "ADD_SHAPE",
                shape: {
                    id: `text-${Date.now()}`,
                    type: "text",
                    xFt: pt.xFt,
                    yFt: pt.yFt,
                    color: drawColor,
                    strokeWidth: 2,
                    label: textLabelInput.trim()
                }
            });
            return;
        }

        if (
            activeTool === "ruler" ||
            activeTool === "aoe" ||
            (role === "dm" &&
                [
                    "freehand",
                    "wall",
                    "door",
                    "rect",
                    "circle",
                    "terrain_difficult",
                    "terrain_water",
                    "terrain_hazard",
                    "fog"
                ].includes(activeTool))
        ) {
            setActiveDragTool({
                tool: activeTool,
                startXFt: pt.xFt,
                startYFt: pt.yFt,
                currentXFt: pt.xFt,
                currentYFt: pt.yFt,
                points: [pt]
            });
            return;
        }

        // Default in "select" mode when clicking empty canvas: pan the map!
        if (activeTool === "select") {
            setIsPanning({
                startClientX: e.clientX,
                startClientY: e.clientY,
                origPanX: panOffset.x,
                origPanY: panOffset.y
            });
        }
    };

    const handleCanvasPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        if (isPanning) {
            setPanOffset({
                x: isPanning.origPanX + (e.clientX - isPanning.startClientX),
                y: isPanning.origPanY + (e.clientY - isPanning.startClientY)
            });
            return;
        }

        if (draggingToken) {
            const pt = clientToMapFt(e.clientX, e.clientY, snapToGrid);
            setDraggingToken((prev) =>
                prev ? { ...prev, currentXFt: pt.xFt, currentYFt: pt.yFt } : null
            );
            return;
        }

        if (activeDragTool) {
            const pt = clientToMapFt(
                e.clientX,
                e.clientY,
                activeDragTool.tool !== "freehand" && snapToGrid
            );
            setActiveDragTool((prev) => {
                if (!prev) return null;
                const nextPoints =
                    prev.tool === "freehand" ? [...prev.points, pt] : prev.points;
                return {
                    ...prev,
                    currentXFt: pt.xFt,
                    currentYFt: pt.yFt,
                    points: nextPoints
                };
            });
        }
    };

    const handleCanvasPointerUp = () => {
        if (isPanning) {
            setIsPanning(null);
            return;
        }

        if (draggingToken) {
            const { tokenId, startXFt, startYFt, currentXFt, currentYFt } = draggingToken;
            setDraggingToken(null);
            if (startXFt !== currentXFt || startYFt !== currentYFt) {
                // Optimistically update local token position immediately
                setMapState((prev: any) => {
                    if (!prev?.activeScene) return prev;
                    return {
                        ...prev,
                        activeScene: {
                            ...prev.activeScene,
                            tokens: prev.activeScene.tokens.map((t: any) =>
                                t.id === tokenId ? { ...t, xFt: currentXFt, yFt: currentYFt } : t
                            )
                        }
                    };
                });
                sendMapCommand({
                    type: "MOVE_TOKEN",
                    tokenId,
                    xFt: currentXFt,
                    yFt: currentYFt
                });
            }
            return;
        }

        if (activeDragTool) {
            const dt = activeDragTool;
            setActiveDragTool(null);

            if (dt.tool === "ruler") {
                return;
            }

            if (dt.tool === "aoe") {
                const preset = AOE_PRESETS.find((p) => p.id === selectedAoePresetId) || AOE_PRESETS[0];
                sendMapCommand({
                    type: "UPSERT_AOE",
                    aoeTemplate: {
                        id: `aoe-${characterId || role}-${Date.now() % 10000}`,
                        shape: preset.shape,
                        originXFt: dt.startXFt,
                        originYFt: dt.startYFt,
                        targetXFt: dt.currentXFt === dt.startXFt ? dt.startXFt + preset.sizeFt : dt.currentXFt,
                        targetYFt: dt.currentYFt,
                        sizeFt: preset.sizeFt,
                        widthFt: preset.widthFt,
                        color: preset.color,
                        label: preset.label,
                        ownerName: characterName || (role === "dm" ? "DM" : "Player")
                    }
                });
                return;
            }

            if (role !== "dm") return;

            const minX = Math.min(dt.startXFt, dt.currentXFt);
            const minY = Math.min(dt.startYFt, dt.currentYFt);
            const wFt = Math.max(5, Math.abs(dt.currentXFt - dt.startXFt));
            const hFt = Math.max(5, Math.abs(dt.currentYFt - dt.startYFt));

            if (dt.tool === "fog") {
                sendMapCommand({
                    type: "ADD_FOG",
                    fogZone: {
                        id: `fog-${Date.now()}`,
                        xFt: minX,
                        yFt: minY,
                        widthFt: wFt,
                        heightFt: hFt,
                        label: "Fog of War"
                    }
                });
                return;
            }

            if (dt.tool === "freehand" && dt.points.length > 1) {
                sendMapCommand({
                    type: "ADD_SHAPE",
                    shape: {
                        id: `free-${Date.now()}`,
                        type: "freehand",
                        xFt: dt.startXFt,
                        yFt: dt.startYFt,
                        points: dt.points,
                        color: drawColor,
                        strokeWidth: 3.5
                    }
                });
                return;
            }

            if (dt.tool === "wall" || dt.tool === "door") {
                sendMapCommand({
                    type: "ADD_SHAPE",
                    shape: {
                        id: `${dt.tool}-${Date.now()}`,
                        type: dt.tool,
                        xFt: dt.startXFt,
                        yFt: dt.startYFt,
                        endXFt: dt.currentXFt,
                        endYFt: dt.currentYFt,
                        color: dt.tool === "door" ? "#f59e0b" : drawColor,
                        strokeWidth: dt.tool === "door" ? 6 : 5,
                        isOpen: false
                    }
                });
                return;
            }

            if (dt.tool === "circle") {
                const rFt = Math.max(
                    5,
                    Math.round(Math.hypot(dt.currentXFt - dt.startXFt, dt.currentYFt - dt.startYFt))
                );
                sendMapCommand({
                    type: "ADD_SHAPE",
                    shape: {
                        id: `circle-${Date.now()}`,
                        type: "circle",
                        xFt: dt.startXFt,
                        yFt: dt.startYFt,
                        radiusFt: rFt,
                        color: drawColor,
                        fillColor: `${drawColor}22`,
                        strokeWidth: 3
                    }
                });
                return;
            }

            if (
                ["rect", "terrain_difficult", "terrain_water", "terrain_hazard"].includes(dt.tool)
            ) {
                const toolMeta: Record<string, { color: string; fill: string; label: string }> = {
                    rect: { color: drawColor, fill: "#1e293b33", label: "Room" },
                    terrain_difficult: {
                        color: "#d97706",
                        fill: "#f59e0b33",
                        label: "Difficult Terrain (2× Move)"
                    },
                    terrain_water: {
                        color: "#0ea5e9",
                        fill: "#0284c744",
                        label: "Water (Difficult 2×)"
                    },
                    terrain_hazard: {
                        color: "#ef4444",
                        fill: "#ef444433",
                        label: "Hazard Zone"
                    }
                };
                const meta = toolMeta[dt.tool] || toolMeta.rect;
                sendMapCommand({
                    type: "ADD_SHAPE",
                    shape: {
                        id: `${dt.tool}-${Date.now()}`,
                        type: dt.tool,
                        xFt: minX,
                        yFt: minY,
                        widthFt: wFt,
                        heightFt: hFt,
                        color: meta.color,
                        fillColor: meta.fill,
                        strokeWidth: 3,
                        label: meta.label
                    }
                });
            }
        }
    };

    const handleSpawnMonsters = () => {
        const preset = MONSTER_PRESETS[selectedPresetIdx] || MONSTER_PRESETS[0];
        const baseName = customMonsterName.trim() || preset.name;
        const sizeCat = customMonsterName.trim() ? customMonsterSize : preset.sizeCategory;
        const sizeFtMap: Record<string, number> = {
            Tiny: 2.5,
            Small: 5,
            Medium: 5,
            Large: 10,
            Huge: 15,
            Gargantuan: 20
        };
        const sFt = sizeFtMap[sizeCat] || 5;
        const count = Math.max(1, Math.min(8, customMonsterCount));

        for (let i = 0; i < count; i++) {
            const suffix = count > 1 ? ` ${String.fromCharCode(65 + i)}` : "";
            const fullName = `${baseName}${suffix}`;
            const label =
                count > 1
                    ? `${preset.label[0]}${i + 1}`
                    : customMonsterName.trim()
                    ? customMonsterName.trim().slice(0, 2).toUpperCase()
                    : preset.label;
            sendMapCommand({
                type: "UPSERT_TOKEN",
                token: {
                    id: `enemy-${Date.now()}-${i}`,
                    characterId: null,
                    name: fullName,
                    label,
                    tokenType: preset.name.includes("Allied") ? "npc" : "enemy",
                    sizeCategory: sizeCat,
                    sizeFt: sFt,
                    xFt: Math.min(widthFt - 15, 75 + i * (sFt + 5)),
                    yFt: Math.min(heightFt - 15, 50 + (i % 2) * 10),
                    color: preset.color,
                    state: "alive",
                    isHidden: false,
                    conditions: [],
                    speedFt: preset.speedFt,
                    ac: preset.ac
                }
            });
        }
        setShowMonsterSpawner(false);
        setCustomMonsterName("");
    };

    if (!scene) {
        return (
            <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-center text-xs animate-pulse">
                Connecting to Real-Time LAN Battle Map Canvas...
            </div>
        );
    }

    // Separate dead/corpse tokens so they render on the floor layer beneath living tokens
    const sortedTokens = [...tokens].sort((a, b) => {
        if (a.state === "dead" && b.state !== "dead") return -1;
        if (a.state !== "dead" && b.state === "dead") return 1;
        return 0;
    });

    const activeTurnToken = tokens.find((t) => t.id === scene.activeTurnTokenId);

    return (
        <div
            className={cn(
                "flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-slate-100",
                isFullscreen ? "fixed inset-2 z-50" : "relative",
                className
            )}
        >
            {/* Top Bar: Scene Info, Live LAN Indicator, Turn Tracker & Role/Scene Controls */}
            <div className="p-2.5 sm:p-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                        <span
                            className={cn(
                                "w-2 h-2 rounded-full",
                                isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                            )}
                        />
                        <span>
                            {isConnected
                                ? `LAN Live (${mapState?.connectedClients || 1} online)`
                                : "Reconnecting..."}
                        </span>
                    </div>

                    {role === "dm" && allScenes.length > 0 ? (
                        <Select
                            value={scene.id}
                            onValueChange={(nextId) =>
                                sendMapCommand({ type: "SWITCH_SCENE", sceneId: nextId })
                            }
                        >
                            <SelectTrigger className="h-7 text-xs font-bold bg-slate-950 border-slate-700 text-white w-56 sm:w-64">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                {allScenes.map((sc: any) => (
                                    <SelectItem key={sc.id} value={sc.id}>
                                        {sc.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <span className="font-bold text-xs sm:text-sm text-white truncate">
                            {scene.title}
                        </span>
                    )}

                    <Badge
                        variant="outline"
                        className="text-[10px] font-mono border-slate-700 text-slate-300"
                    >
                        {widthFt}×{heightFt} ft • {cellSizeFt}ft/sq •{" "}
                        {diagonalRule === "5-10-5" ? "5-10-5 Diag" : "5ft Diag"}
                    </Badge>
                </div>

                    {/* Turn Controls & Role / Fullscreen Controls */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-indigo-500/30 text-[11px]">
                        <span className="font-mono font-bold text-indigo-400 mr-1">
                            Round {scene.roundNumber}
                        </span>
                        {role === "dm" && (
                            <>
                                <button
                                    type="button"
                                    onClick={() =>
                                        sendMapCommand({
                                            type: "ROLL_ENCOUNTER_INITIATIVE",
                                            boolValue: false
                                        })
                                    }
                                    className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1"
                                    title="Roll 1d20 + Initiative for ALL tokens (Players & Monsters), sort turn order, and start Round 1"
                                >
                                    <Dices className="w-3 h-3" />
                                    Roll All Init
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        sendMapCommand({
                                            type: "ROLL_ENCOUNTER_INITIATIVE",
                                            boolValue: true
                                        })
                                    }
                                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1"
                                    title="Roll Initiative for Monsters/NPCs only (Players can roll ⚡ Init on their Character Sheets to join automatically!)"
                                >
                                    <Dices className="w-3 h-3" />
                                    Monsters Init
                                </button>
                                <button
                                    type="button"
                                    onClick={() => sendMapCommand({ type: "PREV_TURN" })}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                    title="Previous Turn"
                                >
                                    <SkipBack className="w-3 h-3" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => sendMapCommand({ type: "NEXT_TURN" })}
                                    className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-0.5"
                                    title="Advance to Next Living Token's Turn"
                                >
                                    Next Turn <SkipForward className="w-2.5 h-2.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => sendMapCommand({ type: "RESET_COMBAT_TURNS" })}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                                    title="Reset Initiative & Return to Round 1"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Role Toggle (Player vs DM Map Architect) + Standalone Player Identity Selector */}
                    {role === "player" && !characterId && partyCharacters.length > 0 && (
                        <Select
                            value={String(activePlayerCharId || partyCharacters[0]?.id || "")}
                            onValueChange={(val) => {
                                const parsed = parseInt(val, 10);
                                if (!isNaN(parsed)) {
                                    setActivePlayerCharId(parsed);
                                    if (typeof window !== "undefined") {
                                        window.localStorage.setItem("dnd_battlemap_char_id", String(parsed));
                                    }
                                    const matchedTok = tokens.find(
                                        (t) => t.characterId === parsed && t.tokenType === "player"
                                    );
                                    if (matchedTok) setSelectedTokenId(matchedTok.id);
                                }
                            }}
                        >
                            <SelectTrigger className="h-7 text-[11px] w-40 bg-slate-950 border-indigo-500/40 text-indigo-200 font-bold">
                                <SelectValue placeholder="Playing As..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                {partyCharacters.map((pc) => (
                                    <SelectItem key={pc.id} value={String(pc.id)}>
                                        Playing: {pc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {allowRoleSwitch && (
                        <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                            <button
                                type="button"
                                onClick={() => {
                                    setRole("player");
                                    setActiveTool("select");
                                }}
                                className={cn(
                                    "px-2 py-1 rounded-md text-[10px] font-bold transition-colors",
                                    role === "player"
                                        ? "bg-indigo-600 text-white"
                                        : "text-slate-400 hover:text-white"
                                )}
                            >
                                Player View
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("dm")}
                                className={cn(
                                    "px-2 py-1 rounded-md text-[10px] font-bold transition-colors",
                                    role === "dm"
                                        ? "bg-amber-600 text-white"
                                        : "text-slate-400 hover:text-white"
                                )}
                            >
                                DM Architect
                            </button>
                        </div>
                    )}

                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0 border-slate-700 bg-slate-950 text-slate-300"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Battle Map"}
                    >
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </Button>
                </div>
            </div>

            {/* Live Initiative Turn Queue Ribbon (Shows Sorted Turn Order, Initiative Scores & 1-Click Turn Selection) */}
            <div className="px-3 py-1.5 bg-slate-950/90 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
                    Turn Order:
                </span>
                {tokens
                    .filter((t) => t.state !== "dead" && (!t.isHidden || role === "dm"))
                    .map((t, idx) => {
                        const isCurrentTurn = scene.activeTurnTokenId === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                    setSelectedTokenId(t.id);
                                    if (role === "dm") {
                                        sendMapCommand({
                                            type: "SET_ACTIVE_TURN",
                                            tokenId: t.id
                                        });
                                    }
                                }}
                                title={
                                    role === "dm"
                                        ? `Click to select ${t.name} & set as Active Turn`
                                        : `Click to inspect ${t.name}`
                                }
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 border transition-all",
                                    isCurrentTurn
                                        ? "bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm ring-1 ring-amber-400/50"
                                        : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700",
                                    t.isHidden && "opacity-60 border-dashed"
                                )}
                            >
                                <span className="text-[9px] font-mono text-slate-400">
                                    #{idx + 1}
                                </span>
                                <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: t.color }}
                                />
                                <span className="truncate max-w-[110px]">{t.name}</span>
                                {t.initiativeRoll != null ? (
                                    <span className="px-1.5 py-0.2 rounded bg-slate-950 text-amber-400 font-mono font-bold text-[10px]">
                                        {t.initiativeRoll}
                                    </span>
                                ) : (
                                    <span className="text-[9px] font-mono text-slate-500">
                                        ({t.initiativeMod >= 0 ? `+${t.initiativeMod}` : t.initiativeMod})
                                    </span>
                                )}
                                {isCurrentTurn && (
                                    <span className="text-[9px] font-black uppercase text-amber-400">
                                        ★ TURN
                                    </span>
                                )}
                            </button>
                        );
                    })}
            </div>

            {/* Second Bar: Interactive Tools, Range Ring Selector, AoE Picker & DM Spawner */}
            <div className="p-2 bg-slate-900/75 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1 flex-wrap">
                    {(
                        [
                            { id: "select", label: "Move / Select", icon: Move, dmOnly: false },
                            { id: "pan", label: "Pan", icon: Hand, dmOnly: false },
                            { id: "ruler", label: "Ruler (ft)", icon: Ruler, dmOnly: false },
                            { id: "aoe", label: "Spell AoE", icon: Flame, dmOnly: false },
                            { id: "ping", label: "Ping", icon: Radio, dmOnly: false },
                            { id: "freehand", label: "Draw", icon: Pencil, dmOnly: true },
                            { id: "wall", label: "Wall", icon: BrickWall, dmOnly: true },
                            { id: "door", label: "Door", icon: DoorOpen, dmOnly: true },
                            { id: "rect", label: "Room", icon: Square, dmOnly: true },
                            { id: "circle", label: "Circle", icon: CircleIcon, dmOnly: true },
                            { id: "terrain_difficult", label: "Difficult 2×", icon: AlertTriangle, dmOnly: true },
                            { id: "terrain_water", label: "Water", icon: Waves, dmOnly: true },
                            { id: "terrain_hazard", label: "Hazard", icon: Flame, dmOnly: true },
                            { id: "text", label: "Label", icon: Type, dmOnly: true },
                            { id: "fog", label: "Fog of War", icon: EyeOff, dmOnly: true },
                            { id: "eraser", label: "Eraser", icon: Eraser, dmOnly: true }
                        ] as Array<{ id: MapTool; label: string; icon: any; dmOnly: boolean }>
                    )
                        .filter((t) => !t.dmOnly || role === "dm")
                        .map((tool) => {
                            const Icon = tool.icon;
                            const isActive = activeTool === tool.id;
                            return (
                                <button
                                    key={tool.id}
                                    type="button"
                                    onClick={() => setActiveTool(tool.id)}
                                    className={cn(
                                        "px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all",
                                        isActive
                                            ? "bg-indigo-600 text-white shadow-sm"
                                            : "bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                    <span>{tool.label}</span>
                                </button>
                            );
                        })}
                </div>

                {/* Contextual Sub-Controls (AoE Preset, Text Label, Range Ring, DM Spawner & Map Settings) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {activeTool === "aoe" && (
                        <div className="flex items-center gap-1">
                            <Select value={selectedAoePresetId} onValueChange={setSelectedAoePresetId}>
                                <SelectTrigger className="h-7 text-[11px] w-48 bg-slate-950 border-amber-500/40 text-amber-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                    {AOE_PRESETS.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {aoeTemplates.length > 0 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[10px] px-2 border-slate-700 bg-slate-950 text-slate-300"
                                    onClick={() => sendMapCommand({ type: "CLEAR_AOE" })}
                                >
                                    Clear AoEs
                                </Button>
                            )}
                        </div>
                    )}

                    {activeTool === "text" && role === "dm" && (
                        <Input
                            value={textLabelInput}
                            onChange={(e) => setTextLabelInput(e.target.value)}
                            placeholder="Click map to place label..."
                            className="h-7 w-40 text-xs bg-slate-950 border-amber-500/40 text-white"
                        />
                    )}

                    {/* Weapon / Spell Range Ring Selector */}
                    <Select
                        value={String(rangeRingFt)}
                        onValueChange={(v) => setRangeRingFt(parseInt(v, 10) || 0)}
                    >
                        <SelectTrigger className="h-7 text-[11px] w-40 sm:w-48 bg-slate-950 border-slate-700 text-indigo-200">
                            <SelectValue placeholder="Range Ring..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                            {actionRangeOptions.map((opt) => (
                                <SelectItem key={opt.rangeFt} value={String(opt.rangeFt)}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {role === "dm" && (
                        <>
                            <Button
                                size="sm"
                                className="h-7 text-[11px] px-2.5 bg-rose-600 hover:bg-rose-500 text-white gap-1"
                                onClick={() => setShowMonsterSpawner(!showMonsterSpawner)}
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Spawn Token
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] px-2 border-slate-700 bg-slate-950 text-slate-200 gap-1"
                                onClick={() => sendMapCommand({ type: "SYNC_PARTY_TOKENS" })}
                                title="Pull all active player characters and companions from DB onto the map"
                            >
                                <Users className="w-3.5 h-3.5 text-indigo-400" />
                                Sync Party
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] px-2 border-slate-700 bg-slate-950 text-slate-200 gap-1"
                                onClick={() => {
                                    setNewSceneTitle(scene.title);
                                    setNewSceneWidth(String(scene.widthFt));
                                    setNewSceneHeight(String(scene.heightFt));
                                    setNewSceneCell(String(scene.cellSizeFt));
                                    setBgUrlInput(scene.backgroundUrl || "");
                                    setShowSceneSettings(!showSceneSettings);
                                }}
                            >
                                <Layers className="w-3.5 h-3.5 text-amber-400" />
                                Map Scale &amp; Scenes
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* DM Expandable Monster & Token Spawner */}
            {role === "dm" && showMonsterSpawner && (
                <div className="p-3 bg-slate-900 border-b border-rose-500/30 flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase text-rose-400">
                            Monster / NPC Preset:
                        </span>
                        <Select
                            value={String(selectedPresetIdx)}
                            onValueChange={(v) => setSelectedPresetIdx(parseInt(v, 10) || 0)}
                        >
                            <SelectTrigger className="h-7 w-48 text-xs bg-slate-950 border-slate-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                {MONSTER_PRESETS.map((p, idx) => (
                                    <SelectItem key={idx} value={String(idx)}>
                                        {p.name} ({p.sizeCategory} • {p.sizeFt}ft • AC {p.ac})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Input
                            value={customMonsterName}
                            onChange={(e) => setCustomMonsterName(e.target.value)}
                            placeholder="Or custom name (e.g. Mind Flayer)..."
                            className="h-7 w-44 text-xs bg-slate-950 border-slate-700"
                        />

                        <Select value={customMonsterSize} onValueChange={setCustomMonsterSize}>
                            <SelectTrigger className="h-7 w-32 text-xs bg-slate-950 border-slate-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                <SelectItem value="Tiny">Tiny (2.5ft)</SelectItem>
                                <SelectItem value="Small">Small (5ft)</SelectItem>
                                <SelectItem value="Medium">Medium (5ft)</SelectItem>
                                <SelectItem value="Large">Large (10ft)</SelectItem>
                                <SelectItem value="Huge">Huge (15ft)</SelectItem>
                                <SelectItem value="Gargantuan">Gargantuan (20ft)</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">Qty:</span>
                            <Input
                                type="number"
                                min={1}
                                max={8}
                                value={customMonsterCount}
                                onChange={(e) =>
                                    setCustomMonsterCount(Math.max(1, Math.min(8, parseInt(e.target.value, 10) || 1)))
                                }
                                className="h-7 w-14 text-xs text-center font-mono bg-slate-950 border-slate-700"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Button
                            size="sm"
                            className="h-7 text-xs bg-rose-600 hover:bg-rose-500 text-white"
                            onClick={handleSpawnMonsters}
                        >
                            Spawn on Map
                        </Button>
                    </div>
                </div>
            )}

            {/* DM Expandable Map Scale, Diagonal Rule, Background & Scene Creator */}
            {role === "dm" && showSceneSettings && (
                <div className="p-3 bg-slate-900 border-b border-amber-500/30 space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
                        <div className="col-span-2 space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400">
                                Scene Title
                            </label>
                            <Input
                                value={newSceneTitle}
                                onChange={(e) => setNewSceneTitle(e.target.value)}
                                className="h-7 text-xs bg-slate-950 border-slate-700"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400">
                                Width (ft)
                            </label>
                            <Input
                                type="number"
                                min={60}
                                max={600}
                                step={10}
                                value={newSceneWidth}
                                onChange={(e) => setNewSceneWidth(e.target.value)}
                                className="h-7 text-xs font-mono bg-slate-950 border-slate-700"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400">
                                Height (ft)
                            </label>
                            <Input
                                type="number"
                                min={60}
                                max={600}
                                step={10}
                                value={newSceneHeight}
                                onChange={(e) => setNewSceneHeight(e.target.value)}
                                className="h-7 text-xs font-mono bg-slate-950 border-slate-700"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400">
                                Grid Cell Scale
                            </label>
                            <Select value={newSceneCell} onValueChange={setNewSceneCell}>
                                <SelectTrigger className="h-7 text-xs bg-slate-950 border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                    <SelectItem value="5">5 ft / square</SelectItem>
                                    <SelectItem value="10">10 ft / square</SelectItem>
                                    <SelectItem value="15">15 ft / square</SelectItem>
                                    <SelectItem value="20">20 ft / square</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400">
                                Diagonal Rule
                            </label>
                            <Select
                                value={scene.diagonalRule || "standard"}
                                onValueChange={(rule) =>
                                    sendMapCommand({
                                        type: "UPDATE_MAP_SETTINGS",
                                        textValue2: rule
                                    })
                                }
                            >
                                <SelectTrigger className="h-7 text-xs bg-slate-950 border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                    <SelectItem value="standard">Standard 5e (5ft)</SelectItem>
                                    <SelectItem value="5-10-5">Variant (5-10-5ft)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                        <Input
                            value={bgUrlInput}
                            onChange={(e) => setBgUrlInput(e.target.value)}
                            placeholder="Optional Background Map Image URL (https://...)..."
                            className="h-7 text-xs flex-1 min-w-[220px] bg-slate-950 border-slate-700"
                        />

                        <div className="flex items-center gap-1.5">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-amber-500/40 text-amber-300"
                                onClick={() => {
                                    sendMapCommand({
                                        type: "UPDATE_MAP_SETTINGS",
                                        textValue: newSceneTitle,
                                        intValue: parseInt(newSceneWidth, 10) || 160,
                                        intValue2: parseInt(newSceneHeight, 10) || 120,
                                        intValue3: parseInt(newSceneCell, 10) || 5,
                                        textValue3: bgUrlInput
                                    });
                                    setShowSceneSettings(false);
                                }}
                            >
                                Update Current Scene
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                                onClick={() => {
                                    sendMapCommand({
                                        type: "CREATE_SCENE",
                                        textValue: newSceneTitle || "New Encounter Map",
                                        intValue: parseInt(newSceneWidth, 10) || 180,
                                        intValue2: parseInt(newSceneHeight, 10) || 140,
                                        intValue3: parseInt(newSceneCell, 10) || 5,
                                        textValue3: bgUrlInput
                                    });
                                    setShowSceneSettings(false);
                                }}
                            >
                                + Create as New Scene
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-red-500/40 text-red-300"
                                onClick={() => sendMapCommand({ type: "CLEAR_SHAPES" })}
                            >
                                Clear Drawings
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-slate-700 text-slate-300"
                                onClick={() => sendMapCommand({ type: "CLEAR_FOG" })}
                            >
                                Reveal All Fog
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Selected Token Inspector & DM Monster State Bar (Alive / Bloodied / Dead ☠️ / Hidden 👁️) */}
            {selectedToken && (
                <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: selectedToken.color }}
                        />
                        <span className="font-bold text-white">{selectedToken.name}</span>
                        <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                            {selectedToken.sizeCategory} ({selectedToken.sizeFt} ft) • AC {selectedToken.ac} • Speed{" "}
                            {selectedToken.speedFt} ft
                        </Badge>
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px]",
                                canMoveToken(selectedToken)
                                    ? "border-indigo-500/40 text-indigo-300 bg-indigo-950/40"
                                    : "border-slate-700 text-slate-400"
                            )}
                        >
                            Controller: {getControllerLabel(selectedToken)}
                            {canMoveToken(selectedToken) ? " (You can move)" : " (Locked)"}
                        </Badge>
                        <Badge
                            className={cn(
                                "text-[10px] uppercase",
                                selectedToken.state === "dead"
                                    ? "bg-red-950 text-red-300 border border-red-500/40"
                                    : selectedToken.state === "bloodied"
                                    ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                                    : "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                            )}
                        >
                            {selectedToken.state === "dead"
                                ? "☠️ Killed / Dead"
                                : selectedToken.state === "bloodied"
                                ? "🩸 Bloodied"
                                : "Alive"}
                        </Badge>
                        {selectedToken.isHidden && (
                            <Badge className="bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px]">
                                👁️ Hidden from Players
                            </Badge>
                        )}
                        {referenceToken && referenceToken.id !== selectedToken.id && (
                            <span className="font-mono font-bold text-amber-400">
                                Distance from {referenceToken.name}:{" "}
                                {
                                    calculateTacticalDistanceFt(
                                        referenceToken.xFt,
                                        referenceToken.yFt,
                                        selectedToken.xFt,
                                        selectedToken.yFt,
                                        diagonalRule,
                                        shapes
                                    ).baseFt
                                }{" "}
                                ft.
                            </span>
                        )}
                    </div>

                    {/* DM & Player Token Initiative Input + DM Token State Actions (Kill ☠️, Bloodied 🩸, Alive, Hide 👁️, Delete) */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {(role === "dm" || canMoveToken(selectedToken)) && (
                            <div className="flex items-center gap-1 mr-1">
                                <span className="text-[10px] font-bold uppercase text-slate-400">
                                    Init:
                                </span>
                                <input
                                    type="number"
                                    value={selectedToken.initiativeRoll ?? ""}
                                    placeholder={
                                        selectedToken.initiativeMod >= 0
                                            ? `+${selectedToken.initiativeMod}`
                                            : String(selectedToken.initiativeMod)
                                    }
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        sendMapCommand({
                                            type: "SET_TOKEN_INITIATIVE",
                                            tokenId: selectedToken.id,
                                            intValue: isNaN(val) ? null : val
                                        });
                                    }}
                                    title="Type or edit this token's Initiative total (automatically re-sorts Turn Order!)"
                                    className="w-12 h-6 px-1 text-center font-mono text-xs font-bold rounded bg-slate-950 border border-slate-700 text-amber-300"
                                />
                            </div>
                        )}

                        {role === "dm" && (
                            <>
                                {/* DM Controller Assignment Dropdown */}
                                <div className="flex items-center gap-1 mr-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">
                                        Control:
                                    </span>
                                    <Select
                                        value={String(selectedToken.characterId ?? 0)}
                                        onValueChange={(val) => {
                                            const num = parseInt(val, 10) || 0;
                                            sendMapCommand({
                                                type: "ASSIGN_TOKEN_CONTROLLER",
                                                tokenId: selectedToken.id,
                                                intValue: num
                                            });
                                        }}
                                    >
                                        <SelectTrigger className="h-6 text-[10px] w-36 bg-slate-950 border-slate-700 text-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                            <SelectItem value="0">DM Only</SelectItem>
                                            <SelectItem value="-1">All Players (Shared)</SelectItem>
                                            {partyCharacters.map((pc) => (
                                                <SelectItem key={pc.id} value={String(pc.id)}>
                                                    {pc.name} (#{pc.id})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    size="sm"
                                    variant={scene.activeTurnTokenId === selectedToken.id ? "default" : "outline"}
                                    className="h-6 text-[10px] px-2 border-amber-500/40 text-amber-300 bg-slate-950 hover:bg-amber-950/50"
                                    onClick={() =>
                                        sendMapCommand({
                                            type: "SET_ACTIVE_TURN",
                                            tokenId: selectedToken.id
                                        })
                                    }
                                >
                                    ★ Make Active Turn
                                </Button>
                                <Button
                                    size="sm"
                                    variant={selectedToken.state === "alive" ? "default" : "outline"}
                                    className="h-6 text-[10px] px-2 bg-emerald-700 hover:bg-emerald-600 text-white"
                                    onClick={() =>
                                        sendMapCommand({
                                            type: "SET_TOKEN_STATE",
                                            tokenId: selectedToken.id,
                                            state: "alive"
                                        })
                                    }
                                >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Alive
                                </Button>
                                <Button
                                    size="sm"
                                    variant={selectedToken.state === "bloodied" ? "default" : "outline"}
                                    className="h-6 text-[10px] px-2 bg-amber-700 hover:bg-amber-600 text-white"
                                    onClick={() =>
                                        sendMapCommand({
                                            type: "SET_TOKEN_STATE",
                                            tokenId: selectedToken.id,
                                            state: "bloodied"
                                        })
                                    }
                                >
                                    <HeartPulse className="w-3 h-3 mr-1" />
                                    Bloodied
                                </Button>
                                <Button
                                    size="sm"
                                    variant={selectedToken.state === "dead" ? "default" : "outline"}
                                    className="h-6 text-[10px] px-2 bg-red-700 hover:bg-red-600 text-white font-bold"
                                    onClick={() =>
                                        sendMapCommand({
                                            type: "SET_TOKEN_STATE",
                                            tokenId: selectedToken.id,
                                            state: selectedToken.state === "dead" ? "alive" : "dead"
                                        })
                                    }
                                >
                                    <Skull className="w-3 h-3 mr-1" />
                                    {selectedToken.state === "dead" ? "Revive" : "Kill ☠️"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 border-purple-500/40 text-purple-300"
                                    onClick={() =>
                                        sendMapCommand({
                                            type: "TOGGLE_TOKEN_HIDDEN",
                                            tokenId: selectedToken.id
                                        })
                                    }
                                >
                                    {selectedToken.isHidden ? (
                                        <>
                                            <Eye className="w-3 h-3 mr-1" /> Reveal
                                        </>
                                    ) : (
                                        <>
                                            <EyeOff className="w-3 h-3 mr-1" /> Hide
                                        </>
                                    )}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[10px] px-1.5 text-red-400 hover:text-red-300"
                                    onClick={() => {
                                        sendMapCommand({
                                            type: "DELETE_TOKEN",
                                            tokenId: selectedToken.id
                                        });
                                        setSelectedTokenId(null);
                                    }}
                                    title="Remove Token from Map"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Main Interactive SVG Canvas Viewport */}
            <div
                ref={containerRef}
                className={cn(
                    "relative w-full overflow-hidden bg-slate-950 select-none",
                    isFullscreen ? "flex-1" : "h-[460px] sm:h-[560px]"
                )}
            >
                <svg
                    ref={svgRef}
                    onPointerDown={handleCanvasPointerDown}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={handleCanvasPointerUp}
                    className={cn(
                        "w-full h-full touch-none",
                        activeTool === "pan" || isPanning
                            ? "cursor-grab active:cursor-grabbing"
                            : activeTool === "ruler" || activeTool === "aoe" || activeTool === "ping"
                            ? "cursor-crosshair"
                            : "cursor-default"
                    )}
                >
                    <defs>
                        {/* Dynamic Scaled Grid Pattern */}
                        <pattern
                            id={`battlemap-grid-${scene.id}`}
                            width={cellSizeFt * pxPerFoot}
                            height={cellSizeFt * pxPerFoot}
                            patternUnits="userSpaceOnUse"
                        >
                            <path
                                d={`M ${cellSizeFt * pxPerFoot} 0 L 0 0 0 ${cellSizeFt * pxPerFoot}`}
                                fill="none"
                                stroke={scene.gridColor || "#334155"}
                                strokeWidth="1"
                                strokeOpacity="0.55"
                            />
                        </pattern>
                        {/* Difficult Terrain Diagonal Hatch Pattern */}
                        <pattern
                            id="difficult-terrain-hatch"
                            width="12"
                            height="12"
                            patternTransform="rotate(45 0 0)"
                            patternUnits="userSpaceOnUse"
                        >
                            <line
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="12"
                                stroke="#f59e0b"
                                strokeWidth="2"
                                strokeOpacity="0.35"
                            />
                        </pattern>
                    </defs>

                    <g transform={`translate(${panOffset.x}, ${panOffset.y})`}>
                        {/* Map Board Background */}
                        <rect
                            x={0}
                            y={0}
                            width={widthFt * pxPerFoot}
                            height={heightFt * pxPerFoot}
                            fill="#0f172a"
                            stroke="#475569"
                            strokeWidth={2}
                        />

                        {/* Optional DM Background Map Image */}
                        {scene.backgroundUrl && (
                            <image
                                href={scene.backgroundUrl}
                                x={0}
                                y={0}
                                width={widthFt * pxPerFoot}
                                height={heightFt * pxPerFoot}
                                preserveAspectRatio="none"
                                opacity={0.85}
                            />
                        )}

                        {/* Scaled Tactical Grid Overlay */}
                        <rect
                            x={0}
                            y={0}
                            width={widthFt * pxPerFoot}
                            height={heightFt * pxPerFoot}
                            fill={`url(#battlemap-grid-${scene.id})`}
                        />

                        {/* Coordinate Ruler Ticks Along Top & Left Edges (in Feet) */}
                        {Array.from({ length: Math.floor(widthFt / (cellSizeFt * 2)) + 1 }).map((_, i) => {
                            const ft = i * cellSizeFt * 2;
                            return (
                                <text
                                    key={`xtick-${ft}`}
                                    x={ft * pxPerFoot + 3}
                                    y={11}
                                    fill="#64748b"
                                    fontSize="9"
                                    fontFamily="monospace"
                                >
                                    {ft}ft
                                </text>
                            );
                        })}

                        {/* LAYER 1: Drawn Rooms, Terrain Zones, Walls, Doors, Freehand & Labels */}
                        {shapes.map((sh: any) => {
                            const handleEraseOrDoorClick = (e: React.PointerEvent) => {
                                if (role === "dm" && activeTool === "eraser") {
                                    e.stopPropagation();
                                    sendMapCommand({ type: "DELETE_SHAPE", textValue: sh.id });
                                } else if (sh.type === "door") {
                                    e.stopPropagation();
                                    sendMapCommand({ type: "TOGGLE_DOOR", textValue: sh.id });
                                }
                            };

                            if (
                                sh.type === "rect" ||
                                sh.type === "terrain_difficult" ||
                                sh.type === "terrain_water" ||
                                sh.type === "terrain_hazard"
                            ) {
                                const x = sh.xFt * pxPerFoot;
                                const y = sh.yFt * pxPerFoot;
                                const w = (sh.widthFt || 10) * pxPerFoot;
                                const h = (sh.heightFt || 10) * pxPerFoot;
                                return (
                                    <g key={sh.id} onPointerDown={handleEraseOrDoorClick}>
                                        <rect
                                            x={x}
                                            y={y}
                                            width={w}
                                            height={h}
                                            fill={
                                                sh.type === "terrain_difficult"
                                                    ? "url(#difficult-terrain-hatch)"
                                                    : sh.fillColor || "#1e293b33"
                                            }
                                            stroke={sh.color || "#94a3b8"}
                                            strokeWidth={sh.strokeWidth || 2}
                                            strokeDasharray={
                                                sh.type.startsWith("terrain_") ? "6 4" : undefined
                                            }
                                            rx={4}
                                        />
                                        {sh.label && (
                                            <text
                                                x={x + 6}
                                                y={y + 14}
                                                fill={sh.color || "#cbd5e1"}
                                                fontSize="10"
                                                fontWeight="bold"
                                                opacity={0.85}
                                            >
                                                {sh.label}
                                            </text>
                                        )}
                                    </g>
                                );
                            }

                            if (sh.type === "circle") {
                                return (
                                    <circle
                                        key={sh.id}
                                        onPointerDown={handleEraseOrDoorClick}
                                        cx={sh.xFt * pxPerFoot}
                                        cy={sh.yFt * pxPerFoot}
                                        r={(sh.radiusFt || 10) * pxPerFoot}
                                        fill={sh.fillColor || "#1e293b33"}
                                        stroke={sh.color || "#cbd5e1"}
                                        strokeWidth={sh.strokeWidth || 3}
                                    />
                                );
                            }

                            if (sh.type === "wall" || sh.type === "door") {
                                const isDoor = sh.type === "door";
                                return (
                                    <g
                                        key={sh.id}
                                        onPointerDown={handleEraseOrDoorClick}
                                        className={isDoor ? "cursor-pointer" : undefined}
                                    >
                                        <line
                                            x1={sh.xFt * pxPerFoot}
                                            y1={sh.yFt * pxPerFoot}
                                            x2={(sh.endXFt ?? sh.xFt) * pxPerFoot}
                                            y2={(sh.endYFt ?? sh.yFt) * pxPerFoot}
                                            stroke={
                                                isDoor
                                                    ? sh.isOpen
                                                        ? "#22c55e"
                                                        : "#f59e0b"
                                                    : sh.color || "#cbd5e1"
                                            }
                                            strokeWidth={(sh.strokeWidth || 5)}
                                            strokeDasharray={isDoor && sh.isOpen ? "4 6" : undefined}
                                            strokeLinecap="round"
                                        />
                                    </g>
                                );
                            }

                            if (sh.type === "freehand" && sh.points && sh.points.length > 1) {
                                const pts = sh.points
                                    .map((p: any) => `${p.xFt * pxPerFoot},${p.yFt * pxPerFoot}`)
                                    .join(" ");
                                return (
                                    <polyline
                                        key={sh.id}
                                        onPointerDown={handleEraseOrDoorClick}
                                        points={pts}
                                        fill="none"
                                        stroke={sh.color || "#cbd5e1"}
                                        strokeWidth={sh.strokeWidth || 3}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                );
                            }

                            if (sh.type === "text" && sh.label) {
                                return (
                                    <g
                                        key={sh.id}
                                        onPointerDown={handleEraseOrDoorClick}
                                        transform={`translate(${sh.xFt * pxPerFoot}, ${sh.yFt * pxPerFoot})`}
                                    >
                                        <rect
                                            x={-4}
                                            y={-12}
                                            width={sh.label.length * 6.5 + 10}
                                            height={18}
                                            rx={4}
                                            fill="#0f172acc"
                                            stroke={sh.color || "#fbbf24"}
                                            strokeWidth={1}
                                        />
                                        <text
                                            x={2}
                                            y={1}
                                            fill={sh.color || "#fbbf24"}
                                            fontSize="11"
                                            fontWeight="bold"
                                        >
                                            {sh.label}
                                        </text>
                                    </g>
                                );
                            }
                            return null;
                        })}

                        {/* LAYER 2: Weapon / Spell Range Ring around Reference Token */}
                        {rangeRingFt > 0 && referenceToken && (
                            <g className="pointer-events-none">
                                <circle
                                    cx={referenceToken.xFt * pxPerFoot}
                                    cy={referenceToken.yFt * pxPerFoot}
                                    r={rangeRingFt * pxPerFoot}
                                    fill="#6366f112"
                                    stroke="#818cf8"
                                    strokeWidth={2}
                                    strokeDasharray="8 4"
                                />
                                <text
                                    x={referenceToken.xFt * pxPerFoot}
                                    y={(referenceToken.yFt - rangeRingFt) * pxPerFoot - 6}
                                    textAnchor="middle"
                                    fill="#a5b4fc"
                                    fontSize="11"
                                    fontWeight="bold"
                                    fontFamily="monospace"
                                >
                                    Range: {rangeRingFt} ft.
                                </text>
                            </g>
                        )}

                        {/* LAYER 3: Active Spell AoE Templates (Sphere, Cone, Cube, Line) */}
                        {aoeTemplates.map((aoe: any) => {
                            const ox = aoe.originXFt * pxPerFoot;
                            const oy = aoe.originYFt * pxPerFoot;
                            const tx = aoe.targetXFt * pxPerFoot;
                            const ty = aoe.targetYFt * pxPerFoot;
                            const sPx = aoe.sizeFt * pxPerFoot;
                            const angleRad = Math.atan2(ty - oy, tx - ox);

                            const handleEraseAoe = (e: React.PointerEvent) => {
                                if (activeTool === "eraser" || activeTool === "aoe") {
                                    e.stopPropagation();
                                    sendMapCommand({ type: "DELETE_AOE", textValue: aoe.id });
                                }
                            };

                            if (aoe.shape === "sphere") {
                                return (
                                    <g key={aoe.id} onPointerDown={handleEraseAoe}>
                                        <circle
                                            cx={ox}
                                            cy={oy}
                                            r={sPx}
                                            fill={`${aoe.color}33`}
                                            stroke={aoe.color}
                                            strokeWidth={2}
                                            strokeDasharray="6 3"
                                        />
                                        <text
                                            x={ox}
                                            y={oy - sPx - 5}
                                            textAnchor="middle"
                                            fill={aoe.color}
                                            fontSize="10"
                                            fontWeight="bold"
                                        >
                                            {aoe.label} ({aoe.sizeFt}ft)
                                        </text>
                                    </g>
                                );
                            }

                            if (aoe.shape === "cube") {
                                return (
                                    <g key={aoe.id} onPointerDown={handleEraseAoe}>
                                        <rect
                                            x={ox - sPx / 2}
                                            y={oy - sPx / 2}
                                            width={sPx}
                                            height={sPx}
                                            fill={`${aoe.color}33`}
                                            stroke={aoe.color}
                                            strokeWidth={2}
                                            strokeDasharray="6 3"
                                        />
                                        <text
                                            x={ox}
                                            y={oy - sPx / 2 - 5}
                                            textAnchor="middle"
                                            fill={aoe.color}
                                            fontSize="10"
                                            fontWeight="bold"
                                        >
                                            {aoe.label}
                                        </text>
                                    </g>
                                );
                            }

                            if (aoe.shape === "cone") {
                                // 53.13-degree D&D 5e cone (width at end equals length)
                                const halfAngle = 0.4636;
                                const x1 = ox + sPx * Math.cos(angleRad - halfAngle);
                                const y1 = oy + sPx * Math.sin(angleRad - halfAngle);
                                const x2 = ox + sPx * Math.cos(angleRad + halfAngle);
                                const y2 = oy + sPx * Math.sin(angleRad + halfAngle);
                                return (
                                    <g key={aoe.id} onPointerDown={handleEraseAoe}>
                                        <polygon
                                            points={`${ox},${oy} ${x1},${y1} ${x2},${y2}`}
                                            fill={`${aoe.color}38`}
                                            stroke={aoe.color}
                                            strokeWidth={2}
                                        />
                                        <text
                                            x={(ox + x1 + x2) / 3}
                                            y={(oy + y1 + y2) / 3}
                                            textAnchor="middle"
                                            fill="#ffffff"
                                            fontSize="10"
                                            fontWeight="bold"
                                        >
                                            {aoe.sizeFt}ft Cone
                                        </text>
                                    </g>
                                );
                            }

                            if (aoe.shape === "line") {
                                const endX = ox + sPx * Math.cos(angleRad);
                                const endY = oy + sPx * Math.sin(angleRad);
                                return (
                                    <g key={aoe.id} onPointerDown={handleEraseAoe}>
                                        <line
                                            x1={ox}
                                            y1={oy}
                                            x2={endX}
                                            y2={endY}
                                            stroke={aoe.color}
                                            strokeWidth={(aoe.widthFt || 5) * pxPerFoot}
                                            strokeOpacity={0.4}
                                            strokeLinecap="round"
                                        />
                                        <text
                                            x={(ox + endX) / 2}
                                            y={(oy + endY) / 2 - 8}
                                            textAnchor="middle"
                                            fill={aoe.color}
                                            fontSize="10"
                                            fontWeight="bold"
                                        >
                                            {aoe.label}
                                        </text>
                                    </g>
                                );
                            }
                            return null;
                        })}

                        {/* LAYER 4: Character, Companion, NPC & Monster Tokens */}
                        {sortedTokens.map((token: any) => {
                            if (token.isHidden && role !== "dm") return null;

                            const isDraggingThis = draggingToken?.tokenId === token.id;
                            const drawXFt = isDraggingThis && draggingToken ? draggingToken.currentXFt : token.xFt;
                            const drawYFt = isDraggingThis && draggingToken ? draggingToken.currentYFt : token.yFt;
                            const cx = drawXFt * pxPerFoot;
                            const cy = drawYFt * pxPerFoot;
                            const radiusPx = Math.max(10, ((token.sizeFt || 5) * pxPerFoot) / 2 - 2);
                            const isSelected = selectedTokenId === token.id;
                            const isActiveTurn = scene.activeTurnTokenId === token.id;
                            const isDead = token.state === "dead";
                            const isBloodied = token.state === "bloodied";
                            const movable = canMoveToken(token);

                            return (
                                <g
                                    key={token.id}
                                    transform={`translate(${cx}, ${cy})`}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        setSelectedTokenId(token.id);
                                        if (role === "dm" && activeTool === "eraser") {
                                            sendMapCommand({
                                                type: "DELETE_TOKEN",
                                                tokenId: token.id
                                            });
                                            return;
                                        }
                                        if (activeTool === "select" && movable) {
                                            setDraggingToken({
                                                tokenId: token.id,
                                                startXFt: token.xFt,
                                                startYFt: token.yFt,
                                                currentXFt: token.xFt,
                                                currentYFt: token.yFt
                                            });
                                        }
                                    }}
                                    className={cn(
                                        movable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                                        token.isHidden && "opacity-55"
                                    )}
                                >
                                    {/* Active Turn Pulsing Aura */}
                                    {isActiveTurn && !isDead && (
                                        <circle
                                            r={radiusPx + 6}
                                            fill="none"
                                            stroke="#fbbf24"
                                            strokeWidth={2.5}
                                            strokeDasharray="5 3"
                                        />
                                    )}

                                    {/* Selected Token Highlight Ring */}
                                    {isSelected && (
                                        <circle
                                            r={radiusPx + 3.5}
                                            fill="none"
                                            stroke="#38bdf8"
                                            strokeWidth={2.5}
                                        />
                                    )}

                                    {/* Main Token Medallion */}
                                    <circle
                                        r={radiusPx}
                                        fill={isDead ? "#1e293b" : token.color}
                                        stroke={
                                            isDead
                                                ? "#64748b"
                                                : isBloodied
                                                ? "#f59e0b"
                                                : "#ffffff"
                                        }
                                        strokeWidth={isBloodied ? 3 : 2}
                                        strokeDasharray={token.isHidden ? "4 3" : undefined}
                                    />

                                    {/* Dead Skull Overlay or Token Initials Label */}
                                    {isDead ? (
                                        <>
                                            <line
                                                x1={-radiusPx * 0.55}
                                                y1={-radiusPx * 0.55}
                                                x2={radiusPx * 0.55}
                                                y2={radiusPx * 0.55}
                                                stroke="#ef4444"
                                                strokeWidth={3}
                                            />
                                            <line
                                                x1={radiusPx * 0.55}
                                                y1={-radiusPx * 0.55}
                                                x2={-radiusPx * 0.55}
                                                y2={radiusPx * 0.55}
                                                stroke="#ef4444"
                                                strokeWidth={3}
                                            />
                                            <text
                                                y={4}
                                                textAnchor="middle"
                                                fill="#fca5a5"
                                                fontSize={Math.max(10, radiusPx * 0.75)}
                                                fontWeight="black"
                                            >
                                                ☠
                                            </text>
                                        </>
                                    ) : (
                                        <text
                                            y={4}
                                            textAnchor="middle"
                                            fill="#ffffff"
                                            fontSize={Math.max(10, radiusPx * 0.65)}
                                            fontWeight="bold"
                                            fontFamily="monospace"
                                        >
                                            {token.label}
                                        </text>
                                    )}

                                    {/* Bloodied Badge */}
                                    {isBloodied && !isDead && (
                                        <circle
                                            cx={radiusPx * 0.7}
                                            cy={-radiusPx * 0.7}
                                            r={5}
                                            fill="#f59e0b"
                                            stroke="#0f172a"
                                            strokeWidth={1.5}
                                        />
                                    )}

                                    {/* Token Name Plate */}
                                    <text
                                        y={radiusPx + 12}
                                        textAnchor="middle"
                                        fill={isDead ? "#64748b" : "#f8fafc"}
                                        fontSize="10"
                                        fontWeight="bold"
                                        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.95)" }}
                                    >
                                        {token.name}
                                        {isDead ? " (Dead)" : isBloodied ? " (Bloodied)" : ""}
                                    </text>
                                </g>
                            );
                        })}

                        {/* LAYER 5: Fog of War Zones (Opaque to Players, Translucent to DM) */}
                        {fogZones.map((fz: any) => (
                            <g
                                key={fz.id}
                                onPointerDown={(e) => {
                                    if (role === "dm" && (activeTool === "eraser" || activeTool === "fog")) {
                                        e.stopPropagation();
                                        sendMapCommand({ type: "DELETE_FOG", textValue: fz.id });
                                    }
                                }}
                                className={role === "dm" ? "cursor-pointer" : "pointer-events-none"}
                            >
                                <rect
                                    x={fz.xFt * pxPerFoot}
                                    y={fz.yFt * pxPerFoot}
                                    width={fz.widthFt * pxPerFoot}
                                    height={fz.heightFt * pxPerFoot}
                                    fill="#020617"
                                    fillOpacity={role === "dm" ? 0.45 : 0.97}
                                    stroke={role === "dm" ? "#a855f7" : "#020617"}
                                    strokeWidth={role === "dm" ? 2 : 0}
                                    strokeDasharray={role === "dm" ? "6 4" : undefined}
                                />
                                {role === "dm" && (
                                    <text
                                        x={(fz.xFt + fz.widthFt / 2) * pxPerFoot}
                                        y={(fz.yFt + fz.heightFt / 2) * pxPerFoot}
                                        textAnchor="middle"
                                        fill="#d8b4fe"
                                        fontSize="10"
                                        fontWeight="bold"
                                    >
                                        👁️ Fog of War (Click with Fog/Eraser to Reveal)
                                    </text>
                                )}
                            </g>
                        ))}

                        {/* LAYER 6: Live Token Movement Vector & Speed Budget Ruler */}
                        {draggingToken && (() => {
                            const movedToken = tokens.find((t) => t.id === draggingToken.tokenId);
                            const speedLimit = movedToken?.speedFt || 30;
                            const dist = calculateTacticalDistanceFt(
                                draggingToken.startXFt,
                                draggingToken.startYFt,
                                draggingToken.currentXFt,
                                draggingToken.currentYFt,
                                diagonalRule,
                                shapes
                            );
                            const strokeColor =
                                dist.totalFt <= speedLimit
                                    ? "#22c55e"
                                    : dist.totalFt <= speedLimit * 2
                                    ? "#f59e0b"
                                    : "#ef4444";
                            const x1 = draggingToken.startXFt * pxPerFoot;
                            const y1 = draggingToken.startYFt * pxPerFoot;
                            const x2 = draggingToken.currentXFt * pxPerFoot;
                            const y2 = draggingToken.currentYFt * pxPerFoot;
                            const midX = (x1 + x2) / 2;
                            const midY = (y1 + y2) / 2 - 14;

                            return (
                                <g className="pointer-events-none">
                                    <circle
                                        cx={x1}
                                        cy={y1}
                                        r={6}
                                        fill={strokeColor}
                                        fillOpacity={0.5}
                                    />
                                    <line
                                        x1={x1}
                                        y1={y1}
                                        x2={x2}
                                        y2={y2}
                                        stroke={strokeColor}
                                        strokeWidth={3.5}
                                        strokeDasharray="6 4"
                                    />
                                    <rect
                                        x={midX - 65}
                                        y={midY - 13}
                                        width={130}
                                        height={20}
                                        rx={6}
                                        fill="#020617ee"
                                        stroke={strokeColor}
                                        strokeWidth={1.5}
                                    />
                                    <text
                                        x={midX}
                                        y={midY + 1}
                                        textAnchor="middle"
                                        fill={strokeColor}
                                        fontSize="11"
                                        fontWeight="bold"
                                        fontFamily="monospace"
                                    >
                                        {dist.totalFt} / {speedLimit} ft
                                        {dist.terrainPenaltyFt > 0 ? " (2× Diff)" : ""}
                                        {dist.totalFt > speedLimit && dist.totalFt <= speedLimit * 2
                                            ? " [DASH]"
                                            : ""}
                                    </text>
                                </g>
                            );
                        })()}

                        {/* LAYER 7: Active Free Ruler / Shape Preview while Dragging */}
                        {activeDragTool && (() => {
                            const x1 = activeDragTool.startXFt * pxPerFoot;
                            const y1 = activeDragTool.startYFt * pxPerFoot;
                            const x2 = activeDragTool.currentXFt * pxPerFoot;
                            const y2 = activeDragTool.currentYFt * pxPerFoot;
                            const dist = calculateTacticalDistanceFt(
                                activeDragTool.startXFt,
                                activeDragTool.startYFt,
                                activeDragTool.currentXFt,
                                activeDragTool.currentYFt,
                                diagonalRule,
                                shapes
                            );
                            return (
                                <g className="pointer-events-none">
                                    <line
                                        x1={x1}
                                        y1={y1}
                                        x2={x2}
                                        y2={y2}
                                        stroke="#38bdf8"
                                        strokeWidth={3}
                                        strokeDasharray="5 3"
                                    />
                                    <rect
                                        x={(x1 + x2) / 2 - 48}
                                        y={(y1 + y2) / 2 - 22}
                                        width={96}
                                        height={18}
                                        rx={5}
                                        fill="#020617ee"
                                        stroke="#38bdf8"
                                    />
                                    <text
                                        x={(x1 + x2) / 2}
                                        y={(y1 + y2) / 2 - 10}
                                        textAnchor="middle"
                                        fill="#38bdf8"
                                        fontSize="11"
                                        fontWeight="bold"
                                        fontFamily="monospace"
                                    >
                                        {dist.baseFt} ft.
                                    </text>
                                </g>
                            );
                        })()}

                        {/* LAYER 8: Live Map Ping Sonar Ring */}
                        {scene.lastPing && (
                            <g
                                transform={`translate(${scene.lastPing.xFt * pxPerFoot}, ${
                                    scene.lastPing.yFt * pxPerFoot
                                })`}
                                className="pointer-events-none"
                            >
                                <circle
                                    r={18}
                                    fill="none"
                                    stroke={scene.lastPing.color || "#38bdf8"}
                                    strokeWidth={3}
                                    className="animate-ping"
                                />
                                <circle
                                    r={5}
                                    fill={scene.lastPing.color || "#38bdf8"}
                                />
                                <text
                                    y={-12}
                                    textAnchor="middle"
                                    fill={scene.lastPing.color || "#38bdf8"}
                                    fontSize="10"
                                    fontWeight="bold"
                                >
                                    📍 {scene.lastPing.senderName}
                                </text>
                            </g>
                        )}
                    </g>
                </svg>

                {/* Floating Bottom-Left Zoom & Camera Controls */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-lg">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-300 hover:text-white"
                        onClick={() => setPxPerFoot((z) => Math.max(2, Math.round((z - 1) * 10) / 10))}
                        title="Zoom Out (Larger Battlefield View)"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-[10px] font-mono font-bold px-1.5 text-slate-300">
                        {Math.round((pxPerFoot / 6) * 100)}%
                    </span>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-300 hover:text-white"
                        onClick={() => setPxPerFoot((z) => Math.min(16, Math.round((z + 1) * 10) / 10))}
                        title="Zoom In (Close-Up Tactical View)"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[10px] font-bold text-slate-300 hover:text-white"
                        onClick={handleFitToScreen}
                    >
                        Fit Map
                    </Button>
                    {(myPlayerToken || selectedToken) && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px] font-bold text-indigo-300 hover:text-white gap-1"
                            onClick={handleCenterOnMyToken}
                        >
                            <Crosshair className="w-3 h-3" />
                            Center Token
                        </Button>
                    )}
                </div>

                {/* Floating Bottom-Right Live Target Distance Radar (Exact Feet from Your Character to Enemies) */}
                {enemyDistances.length > 0 && (
                    <div className="absolute bottom-3 right-3 max-w-[260px] bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 shadow-lg space-y-1">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between gap-2">
                            <span>Target Distances (from {referenceToken?.name})</span>
                        </div>
                        <div className="space-y-1 max-h-28 overflow-y-auto">
                            {enemyDistances.map((en) => (
                                <button
                                    key={en.id}
                                    type="button"
                                    onClick={() => setSelectedTokenId(en.id)}
                                    className="w-full flex items-center justify-between gap-2 text-[11px] px-1.5 py-0.5 rounded hover:bg-slate-800 text-left"
                                >
                                    <span className="truncate text-slate-200 flex items-center gap-1">
                                        <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: en.color }}
                                        />
                                        {en.name}
                                        {en.state === "bloodied" && (
                                            <span className="text-[9px] text-amber-400">🩸</span>
                                        )}
                                    </span>
                                    <span
                                        className={cn(
                                            "font-mono font-bold shrink-0",
                                            en.distanceFt <= 5
                                                ? "text-red-400"
                                                : en.distanceFt <= 30
                                                ? "text-amber-300"
                                                : "text-emerald-300"
                                        )}
                                    >
                                        {en.distanceFt} ft.
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
