@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@JsExport
@Serializable
data class Character(
    val id: Int,
    val name: String,
    
    // Core Stats
    val raceId: String,
    val raceEntry: RaceEntry? = null,
    val backgroundId: String?,
    val background: Background? = null,
    val alignment: String?,
    val xp: Int = 0,
    val level: Int = 1,

    // Ability Scores (Base)
    val str: Int = 10,
    val dex: Int = 10,
    val con: Int = 10,
    val int: Int = 10,
    val wis: Int = 10,
    val cha: Int = 10,

    // Vitals
    val hpCurrent: Int,
    val hpMax: Int,
    val tempHp: Int = 0,

    // Combat Stats
    val speed: Int = 30,
    val initiativeBonus: Int = 0,
    val armorClass: Int? = null,

    // Hit Dice
    val hitDiceCurrent: Int = 1,
    val hitDiceMax: Int = 1,
    val deathSaveSuccess: Int = 0,
    val deathSaveFailure: Int = 0,

    // Conditions & States
    val inspiration: Boolean = false,
    val exhaustion: Int = 0,

    // Spell Slots & Resources
    // Strong typed JSONB fields
    val usedSpellSlots: SpellSlotMap? = null,
    val usedPactSlots: Int = 0,

    // Economy
    val cp: Int = 0,
    val sp: Int = 0,
    val ep: Int = 0,
    val gp: Int = 0,
    val pp: Int = 0,

    val languages: Array<CharacterLanguage>? = null,

    // Proficiencies & Traits (Strongly Typed)
    val manualProficiencies: ManualProficiencies? = null,
    val proficiencies: CharacterProficiencies? = null,
    val feats: Array<CharacterFeat>? = null,
    val traits: Array<CharacterTrait>? = null,
    
    // Join Relationships
    val classes: Array<CharacterClass>? = null,
    // Note: spells might duplicate knowledge vs prepared, but storing the relationship entity here
    val spells: Array<CharacterSpell>? = null,
    val inventory: Array<CharacterInventoryItem>? = null,
    val conditions: Array<CharacterCondition>? = null,
    val resources: Array<CharacterResource>? = null,

    
    // Ability Point Pool
    val abilityPointPool: Int = 0,

    // Bio & Description
    val size: String = "Medium",
    val appearance: String? = null,
    val backstory: String? = null,
    val notes: String? = null,
    val imageUrl: String? = null,
    
    // Modifiers & Effects
    val resourceModifiers: Array<ResourceModifier>? = null,
    val activeModifiers: Array<ActiveModifier>? = null, // Runtime temporary modifiers from resource activation

    // Concentration
    // Quests
    val quests: Array<Quest>? = null,

    
    // Meta
    val createdAt: String,
    val updatedAt: String
) {
    // Manual equals/hashCode removed to rely on data class implementation.
    // This fixed a bug where scalar fields (HP, XP) were ignored in equality checks.

    fun getDepletedHitDice(): Int {
        return hitDiceMax - hitDiceCurrent
    }
}

@JsExport
@Serializable
data class CharacterLanguage(
    val id: Int,
    val characterId: Int,
    val languageId: String,
    val languageName: String? = null,
    val languageScript: String? = null
)
