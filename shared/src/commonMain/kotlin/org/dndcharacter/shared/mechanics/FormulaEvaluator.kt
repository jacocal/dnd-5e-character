@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.mechanics

import kotlin.js.JsExport
import kotlin.math.floor
import org.dndcharacter.shared.model.Character
import org.dndcharacter.shared.model.CharacterClass
import org.dndcharacter.shared.model.Modifier

/**
 * Evaluates formula-based modifier values.
 * 
 * Supported tokens:
 * - `level` - Total character level
 * - `class_level:<classId>` - Specific class level
 * - `proficiency` - Proficiency bonus
 * - `<ability>_mod` - Ability modifier (str_mod, dex_mod, con_mod, int_mod, wis_mod, cha_mod)
 * 
 * Examples:
 * - "1 * class_level:druid" → grants druid level as value
 * - "con_mod" → grants CON modifier as value
 * - "proficiency" → grants proficiency bonus as value
 */
@JsExport
object FormulaEvaluator {
    
    /**
     * Evaluation context containing character data needed for formula resolution.
     */
    data class FormulaContext(
        val totalLevel: Int,
        val classLevels: Map<String, Int>, // classId -> level
        val proficiencyBonus: Int,
        val strMod: Int,
        val dexMod: Int,
        val conMod: Int,
        val intMod: Int,
        val wisMod: Int,
        val chaMod: Int
    )
    
    /**
     * Builds a FormulaContext from character data.
     */
    fun buildContext(character: Character): FormulaContext {
        val classLevels = character.classes
            ?.associate { it.classId to it.level }
            ?: emptyMap()
        
        val totalLevel = character.level
        val proficiencyBonus = calculateProficiencyBonus(totalLevel)
        
        return FormulaContext(
            totalLevel = totalLevel,
            classLevels = classLevels,
            proficiencyBonus = proficiencyBonus,
            strMod = calculateMod(character.str),
            dexMod = calculateMod(character.dex),
            conMod = calculateMod(character.con),
            intMod = calculateMod(character.int),
            wisMod = calculateMod(character.wis),
            chaMod = calculateMod(character.cha)
        )
    }
    
    /**
     * Calculates ability modifier from score.
     */
    private fun calculateMod(score: Int): Int = floor((score - 10) / 2.0).toInt()
    
    /**
     * Calculates proficiency bonus from total level.
     */
    private fun calculateProficiencyBonus(level: Int): Int {
        return when {
            level <= 0 -> 2
            level <= 4 -> 2
            level <= 8 -> 3
            level <= 12 -> 4
            level <= 16 -> 5
            else -> 6
        }
    }
    
    /**
     * Evaluates a formula string and returns the computed integer value.
     * Returns null if the formula cannot be evaluated.
     */
    fun evaluate(formula: String?, context: FormulaContext): Int? {
        if (formula.isNullOrBlank()) return null
        
        val normalized = formula.trim().lowercase()
        
        // Try simple token match first
        val tokenValue = resolveToken(normalized, context)
        if (tokenValue != null) return tokenValue
        
        // Try parsing "N * token" pattern
        val multiplyPattern = Regex("""^(\d+)\s*\*\s*(.+)$""")
        val multiplyMatch = multiplyPattern.find(normalized)
        if (multiplyMatch != null) {
            val multiplier = multiplyMatch.groupValues[1].toIntOrNull() ?: return null
            val token = multiplyMatch.groupValues[2].trim()
            val tokenVal = resolveToken(token, context) ?: return null
            return multiplier * tokenVal
        }
        
        // Try parsing "token * N" pattern
        val multiplyPattern2 = Regex("""^(.+)\s*\*\s*(\d+)$""")
        val multiplyMatch2 = multiplyPattern2.find(normalized)
        if (multiplyMatch2 != null) {
            val token = multiplyMatch2.groupValues[1].trim()
            val multiplier = multiplyMatch2.groupValues[2].toIntOrNull() ?: return null
            val tokenVal = resolveToken(token, context) ?: return null
            return multiplier * tokenVal
        }
        
        // Try parsing as plain integer
        normalized.toIntOrNull()?.let { return it }
        
        return null
    }
    
    /**
     * Resolves a single token to its value.
     */
    private fun resolveToken(token: String, context: FormulaContext): Int? {
        return when {
            // Total level
            token == "level" -> context.totalLevel
            
            // Proficiency bonus
            token == "proficiency" -> context.proficiencyBonus
            
            // Class-specific level: class_level:classId
            token.startsWith("class_level:") -> {
                val classId = token.removePrefix("class_level:").trim()
                context.classLevels[classId] ?: 0
            }
            
            // Ability modifiers
            token == "str_mod" -> context.strMod
            token == "dex_mod" -> context.dexMod
            token == "con_mod" -> context.conMod
            token == "int_mod" -> context.intMod
            token == "wis_mod" -> context.wisMod
            token == "cha_mod" -> context.chaMod
            
            // Legacy abbreviated forms
            token == "str" -> context.strMod
            token == "dex" -> context.dexMod
            token == "con" -> context.conMod
            token == "int" -> context.intMod
            token == "wis" -> context.wisMod
            token == "cha" -> context.chaMod
            
            else -> null
        }
    }
    
    /**
     * Evaluates a modifier's formula if present, returning the computed value.
     * Falls back to modifier.value if no formula or formula evaluation fails.
     */
    fun evaluateModifier(modifier: Modifier, context: FormulaContext): Int? {
        // If formula exists, try to evaluate it
        if (!modifier.formula.isNullOrBlank()) {
            val formulaValue = evaluate(modifier.formula, context)
            if (formulaValue != null) {
                // Apply max cap if specified
                return if (modifier.max != null) {
                    minOf(formulaValue, modifier.max)
                } else {
                    formulaValue
                }
            }
        }
        
        // Fall back to static value
        return modifier.value
    }
}
