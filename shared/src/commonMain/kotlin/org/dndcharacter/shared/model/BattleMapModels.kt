@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@Serializable
@JsExport
data class MapPointFt(
    val xFt: Double,
    val yFt: Double
)

@Serializable
@JsExport
data class BattleMapToken(
    val id: String,
    val characterId: Int? = null,
    val name: String,
    val label: String,
    val tokenType: String = "enemy", // "player" | "companion" | "enemy" | "npc"
    val sizeCategory: String = "Medium", // "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan"
    val sizeFt: Double = 5.0, // 2.5, 5.0, 10.0, 15.0, 20.0
    val xFt: Double,
    val yFt: Double,
    val color: String = "#ef4444",
    val state: String = "alive", // "alive" | "bloodied" | "dead"
    val isHidden: Boolean = false,
    val conditions: Array<String> = emptyArray(),
    val speedFt: Int = 30,
    val ac: Int = 12,
    val initiativeMod: Int = 0,
    val initiativeRoll: Int? = null
)

@Serializable
@JsExport
data class BattleMapShape(
    val id: String,
    val type: String, // "freehand" | "wall" | "door" | "rect" | "circle" | "terrain_difficult" | "terrain_water" | "terrain_hazard" | "text"
    val xFt: Double = 0.0,
    val yFt: Double = 0.0,
    val endXFt: Double? = null,
    val endYFt: Double? = null,
    val widthFt: Double? = null,
    val heightFt: Double? = null,
    val radiusFt: Double? = null,
    val points: Array<MapPointFt> = emptyArray(),
    val color: String = "#cbd5e1",
    val fillColor: String? = null,
    val strokeWidth: Double = 3.0,
    val label: String? = null,
    val isOpen: Boolean = false
)

@Serializable
@JsExport
data class BattleMapFogZone(
    val id: String,
    val xFt: Double,
    val yFt: Double,
    val widthFt: Double,
    val heightFt: Double,
    val label: String? = null
)

@Serializable
@JsExport
data class BattleMapAoeTemplate(
    val id: String,
    val shape: String, // "sphere" | "cone" | "cube" | "line"
    val originXFt: Double,
    val originYFt: Double,
    val targetXFt: Double,
    val targetYFt: Double,
    val sizeFt: Double,
    val widthFt: Double = 5.0,
    val color: String = "#f97316",
    val label: String = "AoE",
    val ownerName: String? = null
)

@Serializable
@JsExport
data class BattleMapPing(
    val id: String,
    val xFt: Double,
    val yFt: Double,
    val color: String = "#38bdf8",
    val senderName: String = "Player",
    val timestampMs: Double = 0.0
)

@Serializable
@JsExport
data class BattleMapScene(
    val id: String,
    val title: String,
    val isActive: Boolean = false,
    val widthFt: Int = 160,
    val heightFt: Int = 120,
    val cellSizeFt: Int = 5,
    val diagonalRule: String = "standard", // "standard" | "5-10-5"
    val backgroundUrl: String? = null,
    val gridColor: String = "#475569",
    val activeTurnTokenId: String? = null,
    val roundNumber: Int = 1,
    val tokens: Array<BattleMapToken> = emptyArray(),
    val shapes: Array<BattleMapShape> = emptyArray(),
    val fogZones: Array<BattleMapFogZone> = emptyArray(),
    val aoeTemplates: Array<BattleMapAoeTemplate> = emptyArray(),
    val lastPing: BattleMapPing? = null
)

@Serializable
@JsExport
data class BattleMapSceneSummary(
    val id: String,
    val title: String,
    val isActive: Boolean,
    val widthFt: Int,
    val heightFt: Int,
    val cellSizeFt: Int
)

@Serializable
@JsExport
data class BattleMapStatePayload(
    val activeScene: BattleMapScene,
    val scenes: Array<BattleMapSceneSummary> = emptyArray(),
    val connectedClients: Int = 1
)

@Serializable
@JsExport
data class BattleMapCommand(
    val type: String,
    val sceneId: String? = null,
    val tokenId: String? = null,
    val xFt: Double? = null,
    val yFt: Double? = null,
    val state: String? = null,
    val boolValue: Boolean? = null,
    val intValue: Int? = null,
    val intValue2: Int? = null,
    val intValue3: Int? = null,
    val textValue: String? = null,
    val textValue2: String? = null,
    val textValue3: String? = null,
    val token: BattleMapToken? = null,
    val shape: BattleMapShape? = null,
    val fogZone: BattleMapFogZone? = null,
    val aoeTemplate: BattleMapAoeTemplate? = null,
    val ping: BattleMapPing? = null
)
