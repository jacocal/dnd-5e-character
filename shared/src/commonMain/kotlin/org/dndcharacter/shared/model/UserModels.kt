@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@Serializable
@JsExport
data class InventoryItem(
    val item: Item,
    val quantity: Int = 1,
    val equipped: Boolean = false,
    val isIdentified: Boolean = true,
    val isAttuned: Boolean = false,
    val currentUses: Int? = null,
    val instanceId: Int? = null,
    val isProficient: Boolean = true
)

@Serializable
@JsExport
data class KnownSpell(
    val spell: Spell,
    val prepared: Boolean = false,
    val isRitual: Boolean = false,
    val isConcentrating: Boolean = false,
    val source: String = "class", // "class", "spellbook", "subclass_always_prepared", "feat", "species"
    val alwaysPrepared: Boolean = false,
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
    val max: Int
)

@Serializable
@JsExport
data class ResolvedProficiency(
    val name: String,
    val source: String,
    val type: String
)

@Serializable
@JsExport
data class ResolvedProficiencies(
    val armor: Array<ResolvedProficiency> = emptyArray(),
    val weapons: Array<ResolvedProficiency> = emptyArray(),
    val tools: Array<ResolvedProficiency> = emptyArray()
)
