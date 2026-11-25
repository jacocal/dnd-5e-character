@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@Serializable
@JsExport
data class SkillGrant(
    val type: String, // "expertise" | "proficiency"
    val count: Int = 1,
    val from: Array<String> = emptyArray()
)

@Serializable
@JsExport
data class RuleCondition(
    val id: String,
    val name: String,
    val description: String,
    val modifiers: Array<Modifier>? = null
)

@Serializable
@JsExport
data class RuleResource(
    val id: String,
    val classId: String? = null,
    val subclassId: String? = null,
    val sourceType: String = "class", // "class" | "subclass" | "species" | "feat"
    val sourceId: String? = null,
    val name: String,
    val description: String? = null,
    val maxFormula: String,
    val rechargeOn: String, // "short", "long"
    val partialShortRestRecovery: Int = 0,
    val unlockLevel: Int = 1,
    val onUse: Array<ResourceEffect>? = null
)

@Serializable
@JsExport
data class Subclass(
    val id: String,
    val classId: String,
    val name: String,
    val description: String,
    val spellcastingType: String? = null,
    val grantedSpells: Map<String, Array<String>> = emptyMap(),
    val combatRiders: Array<CombatRider> = emptyArray()
)

@Serializable
@JsExport
data class Background(
    val id: String,
    val name: String,
    val description: String? = null,
    val abilityOptions: Array<String> = emptyArray(),
    val originFeatId: String? = null,
    val originFeatClass: String? = null,
    val modifiers: Array<Modifier>? = null
)

@Serializable
@JsExport
data class RuleClass(
    val id: String,
    val name: String,
    val hitDie: Int,
    val savingThrows: Array<String>,
    val spellcastingAbility: String? = null,
    val spellcastingType: String = "none",
    val spellPrepMode: String = "none", // "prepared_class_list", "spellbook", "known", "none"
    val armorProficiencies: Array<String> = emptyArray(),
    val weaponProficiencies: Array<String> = emptyArray(),
    val toolProficiencies: Array<String> = emptyArray(),
    val skillOptionsCount: Int = 2,
    val skillOptionsFrom: Array<String> = emptyArray(),
    val combatRiders: Array<CombatRider> = emptyArray()
)

@Serializable
@JsExport
data class RuleClassFeature(
    val id: String,
    val name: String,
    val description: String,
    val level: Int,
    val displayOrder: Int = 0,
    val classId: String? = null,
    val subclassId: String? = null,
    val modifiers: Array<Modifier>? = null
)

@Serializable
@JsExport
data class RuleClassProgression(
    val id: Int = 0,
    val classId: String,
    val subclassId: String? = null,
    val level: Int,
    val proficiencyBonus: Int = 2,
    val features: Array<RuleClassFeature> = emptyArray(),
    val spellSlots: Map<String, Int> = emptyMap(),
    val cantripsKnown: Int = 0,
    val spellsKnown: Int = 0,
    val extraAttacks: Int = 1,
    val skillGrants: SkillGrant? = null,
    val hasAsi: Boolean = false
)

@Serializable
@JsExport
data class RuleFeat(
    val id: String,
    val name: String,
    val category: String = "general", // "origin" | "general" | "fighting_style" | "epic_boon"
    val repeatable: Boolean = false,
    val description: String,
    val prerequisites: String? = null,
    val modifiers: Array<Modifier>? = null,
    val grantedSpells: Map<String, Array<String>> = emptyMap(),
    val combatRiders: Array<CombatRider> = emptyArray(),
    val skillGrants: SkillGrant? = null
)

@Serializable
@JsExport
data class RuleTrait(
    val id: String,
    val name: String,
    val description: String,
    val race: String? = null,
    val modifiers: Array<Modifier>? = null,
    val grantedSpells: Map<String, Array<String>> = emptyMap(),
    val combatRiders: Array<CombatRider> = emptyArray()
)

@Serializable
@JsExport
data class RuleLanguage(
    val id: String,
    val name: String,
    val script: String? = null,
    val type: String = "Standard",
    val description: String? = null
)

@Serializable
@JsExport
data class RulesCatalog(
    val classes: Array<RuleClass> = emptyArray(),
    val subclasses: Array<Subclass> = emptyArray(),
    val progression: Array<RuleClassProgression> = emptyArray(),
    val resources: Array<RuleResource> = emptyArray(),
    val races: Array<RaceEntry> = emptyArray(),
    val traits: Array<RuleTrait> = emptyArray(),
    val backgrounds: Array<Background> = emptyArray(),
    val feats: Array<RuleFeat> = emptyArray(),
    val conditions: Array<RuleCondition> = emptyArray(),
    val items: Array<Item> = emptyArray(),
    val spells: Array<Spell> = emptyArray(),
    val languages: Array<RuleLanguage> = emptyArray()
)
