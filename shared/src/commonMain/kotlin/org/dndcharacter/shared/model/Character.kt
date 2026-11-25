@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@JsExport
@Serializable
data class HpRollEntry(
    val classId: String,
    val level: Int,
    val rolled: Int
)

@JsExport
@Serializable
data class Character(
    val id: Int,
    val name: String,
    
    // Core Stats
    val raceId: String,
    val raceEntry: RaceEntry? = null,
    val backgroundId: String? = null,
    val background: Background? = null,
    val alignment: String? = null,
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
    val hpRolls: Array<HpRollEntry> = emptyArray(),

    // Explicit Defenses (in addition to derived species/class/item resistances)
    val resistances: Array<String> = emptyArray(),
    val immunities: Array<String> = emptyArray(),
    val vulnerabilities: Array<String> = emptyArray(),

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
    val usedSpellSlots: SpellSlotMap? = null,
    val usedPactSlots: Int = 0,

    // Economy
    val cp: Int = 0,
    val sp: Int = 0,
    val ep: Int = 0,
    val gp: Int = 0,
    val pp: Int = 0,

    val languages: Array<CharacterLanguage>? = null,

    // Proficiencies & Traits
    val manualProficiencies: ManualProficiencies? = null,
    val proficiencies: CharacterProficiencies? = null,
    val feats: Array<CharacterFeat>? = null,
    val traits: Array<CharacterTrait>? = null,
    
    // Join Relationships
    val classes: Array<CharacterClass>? = null,
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
    val activeModifiers: Array<ActiveModifier>? = null,

    // Quests & Events
    val quests: Array<Quest>? = null,
    val events: Array<CharacterEvent>? = null,
    
    // Meta
    val createdAt: String = "",
    val updatedAt: String = ""
) {
    fun getDepletedHitDice(): Int {
        return hitDiceMax - hitDiceCurrent
    }
}

@JsExport
@Serializable
data class CharacterLanguage(
    val id: Int = 0,
    val characterId: Int,
    val languageId: String,
    val languageName: String? = null,
    val languageScript: String? = null
)
