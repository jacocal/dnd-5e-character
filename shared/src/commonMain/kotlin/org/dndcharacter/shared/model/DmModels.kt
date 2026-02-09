@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@Serializable
@JsExport
data class DmPlayer(
    val id: Int,
    val name: String,
    val alignment: String? = null
)

@Serializable
@JsExport
data class CreateItemResult(
    val success: Boolean,
    val itemId: String? = null,
    val error: String? = null
)

@Serializable
@JsExport
data class DmItemData(
    val name: String,
    val description: String? = null,
    val type: String,
    val category: String? = null,
    val rarity: String? = null,
    val costAmount: Int? = null,
    val costCurrency: String? = null,
    val weightAmount: Double? = null,
    val weightUnit: String? = null,
    val fixedWeight: Boolean? = null,
    val damageDice: String? = null,
    val damageType: String? = null,
    val armorClass: Int? = null,
    val strengthRequirement: Int? = null,
    val stealthDisadvantage: Boolean? = null,
    val properties: Array<String>? = null,
    val range: String? = null,
    val slot: String? = null,
    val isMagical: Boolean? = null,
    val isCursed: Boolean? = null,
    val requiresAttunement: Boolean? = null,
    val trueName: String? = null,
    val shownEffect: String? = null,
    val trueEffect: String? = null,
    val modifiers: Array<Modifier>? = null,
    val uses: Int? = null,
    val usesMax: Int? = null,
    val tags: Array<String>? = null
)
