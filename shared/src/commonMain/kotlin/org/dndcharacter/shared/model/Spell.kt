@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@Serializable
@JsExport
data class SpellComponents(
    val v: Boolean = false,
    val s: Boolean = false,
    val m: Boolean = false,
    val material_description: String? = null
)

@Serializable
@JsExport
data class SpellDuration(
    val type: String = "instant",
    val value: Int? = null,
    val unit: String? = null
)

@Serializable
@JsExport
data class SpellDamagePart(
    val dice: String,
    val type: String,
    val flatBonus: Int = 0,
    val addSpellMod: Boolean = false
)

@Serializable
@JsExport
data class SpellHealingPart(
    val dice: String = "0d0",
    val flatBonus: Int = 0,
    val addSpellMod: Boolean = true
)

@Serializable
@JsExport
data class SpellUpcastRule(
    val perSlotLevel: Int = 1,
    val bonusDice: String? = null,
    val bonusFlat: Int = 0
)

@Serializable
@JsExport
data class CombatRider(
    val id: String,
    val name: String,
    val source: String = "",
    val dice: String? = null,
    val diceFormula: String? = null, // "sneak_attack_d6", "martial_arts_die", "bardic_die"
    val formula: String? = null, // "rage_damage", "proficiency", "half_class_level", "class_level", "cha_mod", "int_mod", "wis_mod"
    val damageType: String? = null,
    val appliesTo: String = "damage", // "damage", "melee_damage", "weapon_damage", "finesse_or_ranged_damage", "heavy_weapon_damage", "cantrip_damage", "spell_damage", "attack_roll", "attack_and_save", "skill", "save", "d20_test"
    val grantsAdvantage: Boolean = false,
    val consumesSlotLevel: Int? = null,
    val consumesResourceId: String? = null,
    val minLevel: Int = 1,
    val description: String = ""
)

@Serializable
@JsExport
data class SpellMechanics(
    val actionType: String = "utility", // "attack", "save", "auto_damage", "heal", "buff", "utility"
    val attackType: String? = null, // "melee_spell", "ranged_spell"
    val saveAbility: String? = null, // "STR", "DEX", "CON", "INT", "WIS", "CHA"
    val saveHalfDamage: Boolean = false,
    val damage: Array<SpellDamagePart> = emptyArray(),
    val healing: SpellHealingPart? = null,
    val upcast: SpellUpcastRule? = null,
    val cantripScaling: Map<String, String> = emptyMap(),
    val appliesCondition: String? = null,
    val appliesModifiers: Array<Modifier> = emptyArray(),
    val rider: CombatRider? = null
)

@Serializable
@JsExport
data class Spell(
    val id: String,
    val name: String,
    val level: Int = 0,
    val school: String = "Unknown",
    val castingTime: String = "1 Action",
    val range: String = "Self",
    val isRitual: Boolean = false,
    val isConcentration: Boolean = false,
    val description: String = "",
    val classes: Array<String> = emptyArray(),
    val tags: Array<String> = emptyArray(),
    val components: SpellComponents? = null,
    val duration: SpellDuration? = null,
    val mechanics: SpellMechanics? = null
)
