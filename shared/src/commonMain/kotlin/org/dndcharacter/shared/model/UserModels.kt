@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport
// Imports are auto-resolved if in same package, which they are (org.dndcharacter.shared.model)
// So no explicit import needed for RuleCondition/RuleResource.

@Serializable
@JsExport
data class InventoryItem(
    val item: Item,
    val quantity: Int = 1,
    val equipped: Boolean = false,
    val isIdentified: Boolean = true,
    val isAttuned: Boolean = false,
    val currentUses: Int? = null,
    // Database ID of this specific row, not the rule Item ID
    val instanceId: Int? = null 
)

@Serializable
@JsExport
data class KnownSpell(
    val spell: Spell,
    val prepared: Boolean = false,
    val isRitual: Boolean = false,
    val isConcentrating: Boolean = false,
    // Custom overrides possible here (e.g., origin)
    val originClassId: String? = null
)

@Serializable
@JsExport
data class CharacterClassEntry(
    val classId: String,
    val subclassId: String? = null,
    val level: Int,
    val isPrimary: Boolean = false
)

@Serializable
@JsExport
data class ActiveCondition(
    val condition: RuleCondition,
    val duration: String? = null,
    val isPermanent: Boolean = false,
    val source: String? = null
)

@Serializable
@JsExport
data class TrackedResource(
    val resource: RuleResource,
    val used: Int,
    val max: Int // calculated or from rule
)

@Serializable
@JsExport
data class ResolvedProficiency(
    val name: String,
    val source: String, // "Class: Fighter", "Background: Soldier", "Manual"
    val type: String // "Armor", "Weapon", "Tool"
)

@Serializable
@JsExport
data class ResolvedProficiencies(
    val armor: Array<ResolvedProficiency> = emptyArray(),
    val weapons: Array<ResolvedProficiency> = emptyArray(),
    val tools: Array<ResolvedProficiency> = emptyArray()
)
