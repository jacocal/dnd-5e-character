@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport
import org.dndcharacter.shared.mechanics.SpellSlotResult

@Serializable
@JsExport
data class SpellGrantSlot(
    val slotId: String, // e.g., "feat:magic-initiate:cantrip:1", "feat:magic-initiate:lvl1:1"
    val sourceType: String, // "feat", "species", "class"
    val sourceId: String,
    val sourceName: String,
    val spellClassFilter: String, // e.g. "cleric", "druid", "wizard"
    val spellLevel: Int, // 0 for cantrip, 1+ for leveled spell
    val selectedSpellId: String? = null,
    val selectedSpellName: String? = null,
    val grantsFreeCastPerLongRest: Boolean = false,
    val freeCastUsed: Boolean = false
)

@Serializable
@JsExport
data class CausalTriggerInfo(
    val id: String,
    val sourceType: String, // "Feat", "Class Feature", "Species Trait", "Weapon Mastery"
    val sourceName: String,
    val triggerCondition: String,
    val effectSummary: String,
    val isActive: Boolean = true
)

@Serializable
@JsExport
data class FeatureChoiceOption(
    val id: String,
    val name: String,
    val description: String,
    val effectSummary: String
)

@Serializable
@JsExport
data class FeatureChoiceSlot(
    val slotId: String,
    val category: String,
    val sourceClass: String,
    val unlockLevel: Int,
    val selectedOptionId: String? = null,
    val selectedOptionName: String? = null,
    val selectedOptionSummary: String? = null,
    val options: Array<FeatureChoiceOption> = emptyArray()
)

@Serializable
@JsExport
data class CompanionForm(
    val id: String,
    val name: String,
    val category: String, // "Wild Shape Beast", "Familiar", "Find Steed", "Primal Companion", "Summoned Spirit"
    val maxHp: Int,
    val armorClass: Int,
    val speed: String,
    val attackName: String,
    val attackBonus: Int,
    val damageDice: String,
    val damageBonus: Int,
    val damageType: String,
    val notes: String
)

@Serializable
@JsExport
data class ResolvedAttackAction(
    val id: String,
    val name: String,
    val actionCategory: String, // "weapon", "cantrip", "spell", "unarmed", "feature"
    val castingTime: String = "1 Action",
    val range: String = "5 ft.",
    val isProficient: Boolean = true,
    val attackAbility: String? = null, // "STR", "DEX", "INT", "WIS", "CHA"
    val toHitBonus: Int? = null,
    val saveAbility: String? = null, // "DEX", "WIS", "CON", etc.
    val saveDC: Int? = null,
    val saveHalfDamage: Boolean = false,
    val baseDamageDice: String? = null,
    val versatileDamageDice: String? = null,
    val damageBonus: Int = 0,
    val damageType: String? = null,
    val healingDice: String? = null,
    val healingBonus: Int = 0,
    val weaponMastery: String? = null,
    val properties: Array<String> = emptyArray(),
    val spellLevel: Int? = null,
    val isConcentration: Boolean = false,
    val isRitual: Boolean = false,
    val eligibleRiders: Array<CombatRider> = emptyArray(),
    val activeTriggers: Array<String> = emptyArray(),
    val freeCastAvailable: Boolean = false,
    val grantSlotId: String? = null,
    val breakdown: String = ""
)

@Serializable
@JsExport
data class DamageBreakdownPart(
    val source: String, // e.g. "Longsword", "Sneak Attack", "Rage", "Hex"
    val diceFormula: String, // e.g. "1d8", "2d6", "+3"
    val rolledValues: Array<Int> = emptyArray(),
    val flatBonus: Int = 0,
    val subtotal: Int = 0,
    val damageType: String = "physical"
)

@Serializable
@JsExport
data class RollRequest(
    val rollType: String, // "skill", "saving_throw", "ability_check", "initiative", "weapon_attack", "spell", "death_save", "concentration_save", "hit_die"
    val targetId: String, // e.g., "perception", "dex", "longsword", "fireball"
    val diceMode: String = "SIMULATED", // "SIMULATED" | "PHYSICAL"
    val advantageMode: String = "NORMAL", // "NORMAL" | "ADVANTAGE" | "DISADVANTAGE"
    val physicalD20Rolls: Array<Int> = emptyArray(),
    val physicalDamageRolls: Array<Int> = emptyArray(),
    val selectedRiderIds: Array<String> = emptyArray(),
    val useVersatileTwoHanded: Boolean = false,
    val slotLevel: Int? = null,
    val usePactSlot: Boolean = false,
    val isRitualCast: Boolean = false,
    val useFreeCast: Boolean = false,
    val addSpellcastingModToDamage: Boolean = false,
    val targetAcOrDc: Int? = null
)

@Serializable
@JsExport
data class RollOutcome(
    val rollType: String,
    val targetId: String,
    val title: String,
    val diceMode: String,
    val advantageMode: String,
    val d20Rolls: Array<Int> = emptyArray(),
    val chosenD20: Int? = null,
    val isCriticalHit: Boolean = false,
    val isCriticalFail: Boolean = false,
    val toHitOrCheckModifier: Int = 0,
    val riderCheckDiceTotal: Int = 0,
    val totalD20Result: Int? = null,
    val targetAcOrDc: Int? = null,
    val isSuccess: Boolean? = null,
    val saveAbility: String? = null,
    val saveDC: Int? = null,
    val damageParts: Array<DamageBreakdownPart> = emptyArray(),
    val totalDamage: Int = 0,
    val totalHealing: Int = 0,
    val consumedSlotLevel: Int? = null,
    val consumedPactSlot: Boolean = false,
    val consumedFreeCastSlotId: String? = null,
    val consumedResourceIds: Array<String> = emptyArray(),
    val appliedCondition: String? = null,
    val concentrationSpellId: String? = null,
    val triggeredEffects: Array<String> = emptyArray(),
    val detailedFormula: String = "",
    val summary: String = ""
)

@Serializable
@JsExport
data class ResolvedCharacterSheet(
    val character: Character,
    val abilityScores: Array<ResolvedAbilityScore> = emptyArray(),
    val combatStats: ResolvedCombatStats,
    val skills: Array<ResolvedSkill> = emptyArray(),
    val savingThrows: Array<ResolvedSavingThrow> = emptyArray(),
    val spellcastingStats: Array<ResolvedSpellcastingStats> = emptyArray(),
    val spellSlots: SpellSlotResult,
    val knownCantripsCount: Int = 0,
    val preparedSpellsCount: Int = 0,
    val maxPreparedSpells: Int = 0,
    val maxCantrips: Int = 0,
    val spellPrepMode: String = "none",
    val spellGrantSlots: Array<SpellGrantSlot> = emptyArray(),
    val inventoryItems: Array<InventoryItem> = emptyArray(),
    val knownSpells: Array<KnownSpell> = emptyArray(),
    val availableClassSpells: Array<Spell> = emptyArray(),
    val activeConditions: Array<ActiveCondition> = emptyArray(),
    val trackedResources: Array<TrackedResource> = emptyArray(),
    val classFeatures: Array<RuleClassFeature> = emptyArray(),
    val proficiencies: ResolvedProficiencies = ResolvedProficiencies(),
    val actions: Array<ResolvedAttackAction> = emptyArray(),
    val availableRiders: Array<CombatRider> = emptyArray(),
    val activeTriggerMatrix: Array<CausalTriggerInfo> = emptyArray(),
    val featureChoiceSlots: Array<FeatureChoiceSlot> = emptyArray(),
    val weaponMasteryLimit: Int = 0,
    val masteredWeaponIds: Array<String> = emptyArray(),
    val availableCompanions: Array<CompanionForm> = emptyArray(),
    val activeCompanion: CompanionForm? = null,
    val companionHpCurrent: Int = 0,
    val pendingSkillGrants: Array<SkillGrant> = emptyArray(),
    val hasArmorPenalty: Boolean = false,
    val canLevelUp: Boolean = false,
    val nextLevelXp: Int = 300,
    val concentrationSpellName: String? = null
)

@Serializable
@JsExport
data class GameCommandPayload(
    val type: String, // "EXECUTE_ROLL", "SELECT_GRANTED_SPELL", "TAKE_DAMAGE", "HEAL", "SET_TEMP_HP", "SET_DEATH_SAVES", "SPEND_HIT_DIE", "SHORT_REST", "LONG_REST", "USE_RESOURCE", "RESTORE_RESOURCE", "DEACTIVATE_EFFECT", "TOGGLE_CONDITION", "SET_EXHAUSTION", "TOGGLE_INSPIRATION", "CONSUME_SPELL_SLOT", "RESTORE_SPELL_SLOT", "CONSUME_PACT_SLOT", "RESTORE_PACT_SLOT", "PREPARE_SPELL", "LEARN_SPELL", "FORGET_SPELL", "TOGGLE_RITUAL", "SET_CONCENTRATION", "ADD_ITEM", "REMOVE_ITEM", "UPDATE_ITEM_STATE", "UPDATE_CURRENCY", "UPDATE_SKILL", "TOGGLE_SAVING_THROW", "ADD_PROFICIENCY", "REMOVE_PROFICIENCY", "ADD_LANGUAGE", "REMOVE_LANGUAGE", "UPDATE_BIO", "ADD_XP", "SET_LEVEL", "LEVEL_UP", "ADD_QUEST", "UPDATE_QUEST", "DELETE_QUEST", "ADD_QUEST_OBJECTIVE", "TOGGLE_QUEST_OBJECTIVE", "DELETE_QUEST_OBJECTIVE", "ADD_QUEST_LOG", "DELETE_QUEST_LOG"
    val rollRequest: RollRequest? = null,
    val amount: Int? = null,
    val damageType: String? = null,
    val targetId: String? = null,
    val secondaryId: String? = null,
    val intValue: Int? = null,
    val intValue2: Int? = null,
    val boolValue: Boolean? = null,
    val boolValue2: Boolean? = null,
    val boolValue3: Boolean? = null,
    val textValue: String? = null,
    val textValue2: String? = null,
    val textValue3: String? = null,
    val cp: Int? = null,
    val sp: Int? = null,
    val ep: Int? = null,
    val gp: Int? = null,
    val pp: Int? = null,
    val levelUpData: LevelUpData? = null
)

@Serializable
@JsExport
data class EngineResult(
    val character: Character,
    val sheet: ResolvedCharacterSheet,
    val events: Array<CharacterEvent> = emptyArray(),
    val lastRollOutcome: RollOutcome? = null,
    val concentrationCheckRequiredDc: Int? = null
)
