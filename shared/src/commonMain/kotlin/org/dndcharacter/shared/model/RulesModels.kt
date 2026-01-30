@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@Serializable
@JsExport
data class RuleCondition(
    val id: String,
    val name: String,
    val description: String,
    // JSONB modifiers in DB, simplified here
    val modifiers: String? = null 
)

@Serializable
@JsExport
data class RuleResource(
    val id: String,
    val classId: String,
    val name: String,
    val description: String? = null,
    val maxFormula: String,
    val rechargeOn: String, // "short", "long"
    val onUse: Array<ResourceEffect>? = null
)

@Serializable
@JsExport
data class Subclass(
    val id: String,
    val classId: String,
    val name: String,
    val description: String,
    val spellcastingType: String? = null
)

@Serializable
@JsExport
data class Background(
    val id: String,
    val name: String,
    val description: String? = null,
    val modifiers: Array<Modifier>? = null
)

@Serializable
@JsExport
data class RuleClass(
    val id: String,
    val name: String,
    val hitDie: Int,
    val savingThrows: Array<String>,
    // Simplified proficiencies for now
    val armorProficiencies: Array<String> = emptyArray(),
    val weaponProficiencies: Array<String> = emptyArray(),
    val toolProficiencies: Array<String> = emptyArray()
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null || this::class != other::class) return false
        other as RuleClass
        if (id != other.id) return false
        return true
    }

    override fun hashCode(): Int = id.hashCode()
}

@Serializable
@JsExport
data class RuleClassFeature(
    val id: String,
    val name: String,
    val description: String,
    val level: Int,
    val displayOrder: Int,
    val modifiers: Array<Modifier>? = null
)

@Serializable
@JsExport
data class RuleFeat(
    val id: String,
    val name: String,
    val description: String,
    val prerequisites: String? = null,
    val modifiers: Array<Modifier>? = null
)
