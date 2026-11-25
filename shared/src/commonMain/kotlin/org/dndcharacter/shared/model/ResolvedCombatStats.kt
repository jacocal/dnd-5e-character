@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@Serializable
@JsExport
data class ResolvedCombatStats(
    val armorClass: Int,
    val armorClassBreakdown: String,
    val armorClassSource: String,
    val initiative: Int,
    val speed: Int,
    val proficiencyBonus: Int = 2,
    val passivePerception: Int = 10,
    val extraAttacks: Int = 1,
    val darkvision: Int = 0,
    val currentWeight: Double = 0.0,
    val maxCarryWeight: Double = 150.0
)
