@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@Serializable
@JsExport
data class Item(
    val id: String,
    val name: String,
    val type: String = "gear", // weapon, armor, gear
    
    // Cost
    val costAmount: Int = 0,
    val costCurrency: String = "gp",
    
    // Weight
    val weightAmount: Double = 0.0,
    val weightUnit: String = "lb",
    val fixedWeight: Boolean = false,
    
    // Stats
    val category: String = "misc",
    val slot: String? = null,
    val armorClass: Int? = null,
    val strengthRequirement: Int? = null,
    val stealthDisadvantage: Boolean = false,
    
    val damageDice: String? = null,
    val versatileDice: String? = null,
    val damageType: String? = null,
    val weaponMastery: String? = null,
    val range: String? = null,
    
    val properties: Array<String> = emptyArray(),
    val rarity: String = "common",
    val requiresAttunement: Boolean = false,
    
    // Magic
    val isMagical: Boolean = false,
    val isCursed: Boolean = false,
    val trueName: String? = null,
    val shownEffect: String? = null,
    val trueEffect: String? = null,
    
    // Consumable
    val uses: Int? = null,
    val usesMax: Int? = null,
    
    // Description
    val description: String? = null,
    val tags: Array<String> = emptyArray(),
    
    // Modifiers
    val modifiers: Array<Modifier> = emptyArray()
)
