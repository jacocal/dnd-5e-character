@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlin.js.JsExport

@JsExport
data class ResolvedCombatStats(
    val armorClass: Int,
    val armorClassBreakdown: String,
    val armorClassSource: String,
    val initiative: Int,
    val speed: Int
)
