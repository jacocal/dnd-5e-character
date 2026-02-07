@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@Serializable
@JsExport
data class CharacterClass(
    val characterId: Int = 0,
    val classId: String,
    val subclassId: String? = null,
    val level: Int,
    val className: String? = null,
    val subclassName: String? = null,
    val hitDie: Int? = null
)

@Serializable
@JsExport
data class CharacterSpell(
    val characterId: Int = 0,
    val spellId: String,
    val prepared: Boolean = false,
    val isRitual: Boolean = false,
    val isConcentrating: Boolean = false,
    val spell: Spell? = null,
    val spellName: String? = null,
    val spellLevel: Int? = null
)

@Serializable
@JsExport
data class CharacterInventoryItem(
    val id: Int = 0,
    val characterId: Int = 0,
    val itemId: String,
    val quantity: Int = 1,
    val equipped: Boolean = false,
    val isIdentified: Boolean = true,
    val isAttuned: Boolean = false,
    val currentUses: Int? = null,
    val item: Item? = null,
    val itemName: String? = null,
    val itemCategory: String? = null
)

@Serializable
@JsExport
data class CharacterCondition(
    val id: Int = 0,
    val characterId: Int = 0,
    val conditionId: String,
    val duration: String? = null,
    val isPermanent: Boolean? = false,
    val source: String? = null,
    val condition: RuleCondition? = null,
    val conditionName: String? = null
)

@Serializable
@JsExport
data class CharacterResource(
    val characterId: Int = 0,
    val resourceId: String,
    val usedUses: Int = 0,
    val resource: RuleResource? = null,
    val resourceName: String? = null,
    val maxFormula: String? = null,
    val rechargeOn: String? = null
)
