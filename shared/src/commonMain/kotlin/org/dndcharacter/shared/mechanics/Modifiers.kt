@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.mechanics

import kotlin.js.JsExport
import kotlin.js.JsName
import kotlin.math.min
import kotlin.math.max

@JsExport
data class RuleModifier(
    val type: String,
    val target: String,
    // Value can be number, boolean, or string in TS. 
    // In Kotlin, we need to handle this. For now, let's use String and parse it, 
    // or separate fields. Using String for interop simplicity, but specific accessors would be better.
    // simpler approach for KMP/JS interop: use separate nullable fields and a helper, 
    // OR just use String and cast/parse in logic.
    val valueStr: String, 
    val condition: String? = null,
    val max: Int? = null
) {
    // Helper to get number value
    fun getNumberValue(): Int = valueStr.toIntOrNull() ?: 0
    
    // Helper to get boolean value
    fun getBooleanValue(): Boolean = valueStr.lowercase() == "true"
}

@JsExport
data class ModifierSource(
    val id: String,
    val name: String,
    val modifiers: Array<RuleModifier>
)

@JsExport
object ModifierCalculator {

    /**
     * Calculates a stat value with modifiers applied.
     * 
     * Priority hierarchy (highest to lowest):
     * - override: Final authority. Highest override value wins.
     * - set: "At least this much." Highest set value wins. Applied if no override.
     * - bonus: Additive. All bonuses stack after set/override resolution.
     * 
     * @param baseValue The base stat value
     * @param statName The stat to calculate (e.g., "str", "ac", "speed")
     * @param sources All modifier sources to consider
     * @param conditionContext Optional condition context for filtering conditional modifiers
     */
    fun calculateStatWithModifiers(
        baseValue: Int, 
        statName: String, 
        sources: Array<ModifierSource>,
        conditionContext: ConditionEvaluator.ConditionContext? = null
    ): Int {
        var finalValue = baseValue
        val bonuses = mutableListOf<Int>()
        var setValues = mutableListOf<Int>() // Collect all "set" values
        var overrideValues = mutableListOf<Int>() // Collect all "override" values
        var minMaxCap: Int? = null
        val targetStat = statName.lowercase()

        for (source in sources) {
            for (mod in source.modifiers) {
                if (!mod.target.equals(targetStat, ignoreCase = true)) continue
                
                // Check conditions if context is provided
                if (conditionContext != null && !mod.condition.isNullOrEmpty()) {
                    val condition = org.dndcharacter.shared.model.ModifierCondition.fromKey(mod.condition)
                    if (!ConditionEvaluator.isConditionMet(condition, conditionContext)) {
                        continue // Condition not met, skip this modifier
                    }
                }
                // If no condition context but modifier has condition, skip (conservative)
                if (conditionContext == null && !mod.condition.isNullOrEmpty()) {
                    continue // TODO: Handle conditions when context not available
                }

                when (mod.type) {
                    "override" -> {
                        val v = mod.getNumberValue()
                        overrideValues.add(v)
                    }
                    "set" -> {
                        val v = mod.getNumberValue()
                        setValues.add(v)
                    }
                    "bonus", "ability_increase" -> {
                        val v = mod.getNumberValue()
                        bonuses.add(v)
                        
                        // Handle caps
                        if (mod.type == "ability_increase" && mod.max != null) {
                            minMaxCap = if (minMaxCap == null) mod.max else min(minMaxCap!!, mod.max)
                        }
                    }
                }
            }
        }

        // Priority resolution: override > set > base+bonuses
        // 1. If any override exists, use highest override (bonuses don't apply)
        if (overrideValues.isNotEmpty()) {
            finalValue = overrideValues.maxOrNull() ?: baseValue
        }
        // 2. If set exists, compare (base + bonuses) vs set - use higher
        else if (setValues.isNotEmpty()) {
            val basePlusBonuses = baseValue + bonuses.sum()
            val highestSet = setValues.maxOrNull() ?: baseValue
            finalValue = max(basePlusBonuses, highestSet)
        }
        // 3. Otherwise, apply bonuses to base
        else {
            finalValue = baseValue + bonuses.sum()
        }

        // Apply Max Cap (for ability_increase type modifiers)
        if (minMaxCap != null) {
            finalValue = min(finalValue, minMaxCap!!)
        }

        return finalValue
    }

    fun getProficiencyModifiers(statName: String, sources: Array<ModifierSource>): Boolean {
        val target = statName.lowercase()
        for (source in sources) {
            for (mod in source.modifiers) {
                if (mod.type == "skill_proficiency" && mod.target.equals(target, ignoreCase = true) && mod.getBooleanValue()) return true
                if (mod.type == "proficiency" && mod.target.equals(target, ignoreCase = true)) return true
            }
        }
        return false
    }

    fun getSavingThrowProficiency(ability: String, sources: Array<ModifierSource>): Boolean {
        val target = ability.lowercase()
        for (source in sources) {
            for (mod in source.modifiers) {
                if (mod.type == "saving_throw_proficiency" && 
                    mod.target.equals(target, ignoreCase = true) && 
                    mod.getBooleanValue()) return true
            }
        }
        return false
    }
    
    fun getArmorProficiency(armorType: String, sources: Array<ModifierSource>): Boolean {
        val target = armorType.lowercase()
        for (source in sources) {
            for (mod in source.modifiers) {
                if (mod.type == "armor_proficiency" && 
                    mod.target.equals(target, ignoreCase = true) && 
                    mod.getBooleanValue()) return true
            }
        }
        return false
    }
    
    fun getWeaponProficiency(weaponIdOrCategory: String, sources: Array<ModifierSource>): Boolean {
        val target = weaponIdOrCategory.lowercase()
        for (source in sources) {
            for (mod in source.modifiers) {
                if (mod.type == "weapon_proficiency" && mod.getBooleanValue()) {
                    if (mod.target.equals(target, ignoreCase = true)) return true
                }
            }
        }
        return false
    }
    
    fun getLanguageModifiers(sources: Array<ModifierSource>): Array<String> {
        val list = mutableListOf<String>()
        for (source in sources) {
            for (mod in source.modifiers) {
                if (mod.type == "language" && mod.getBooleanValue()) {
                    list.add(mod.target)
                }
            }
        }
        return list.toTypedArray()
    }
    
    fun getExpertiseModifiers(skillName: String, sources: Array<ModifierSource>): Boolean {
        val target = skillName.lowercase()
        for (source in sources) {
            for (mod in source.modifiers) {
                if (mod.type == "expertise" && 
                    mod.target.equals(target, ignoreCase = true) && 
                    mod.getBooleanValue()) return true
            }
        }
        return false
    }
    
    fun getHpPerLevelBonus(sources: Array<ModifierSource>): Int {
        var total = 0
        for (source in sources) {
            for (mod in source.modifiers) {
                if (mod.type == "bonus" && mod.target.equals("hp_per_level", ignoreCase = true)) {
                    total += mod.getNumberValue()
                }
            }
        }
        return total
    }
    
    fun getHpMaxBonus(sources: Array<ModifierSource>): Int {
        var total = 0
        for (source in sources) {
            for (mod in source.modifiers) {
                if (mod.type == "bonus" && mod.target.equals("hp_max", ignoreCase = true)) {
                    total += mod.getNumberValue()
                }
            }
        }
        return total
    }
    
    fun calculateEffectiveMaxHp(baseHpMax: Int, level: Int, sources: Array<ModifierSource>): Int {
        val hpPerLvl = getHpPerLevelBonus(sources)
        val flatBonus = getHpMaxBonus(sources)
        return baseHpMax + (level * hpPerLvl) + flatBonus
    }
    fun getSkillBonus(skillName: String, sources: Array<ModifierSource>): Int {
        val target = skillName.replace("_", " ").lowercase()
        var total = 0
        for (source in sources) {
            for (mod in source.modifiers) {
                // Check exact match or space/underscore replacement
                val modTarget = mod.target.replace("_", " ").lowercase()
                
                if (mod.type == "bonus" && modTarget == target) {
                    total += mod.getNumberValue()
                }
            }
        }
        return total
    }

    fun getSavingThrowBonus(ability: String, sources: Array<ModifierSource>): Int {
        val targetAbil = ability.lowercase()
        val targetSave = "${targetAbil}_save"
        var total = 0
        for (source in sources) {
            for (mod in source.modifiers) {
                val t = mod.target.lowercase()
                if (mod.type == "bonus") {
                    if (t == targetSave || t == "saving_throws" || t == "all_saving_throws") {
                        total += mod.getNumberValue()
                    }
                }
            }
        }
        return total
    }
}
