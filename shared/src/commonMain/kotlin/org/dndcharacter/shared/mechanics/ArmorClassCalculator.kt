@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.mechanics

import kotlin.js.JsExport
import kotlin.math.floor
import kotlin.math.max
import org.dndcharacter.shared.model.Character
import org.dndcharacter.shared.model.InventoryItem

/**
 * AC Formula Definition for class features like Unarmored Defense
 */
@JsExport
data class AcFormulaDefinition(
    val featureName: String,
    val classId: String,
    val description: String
)

/**
 * AC Calculation Result with value and source attribution
 */
@JsExport
data class AcCalculationResult(
    val value: Int,
    val source: String,
    val breakdown: String
)

/**
 * Armor Class Calculator - handles all AC calculation scenarios including Unarmored Defense
 */
@JsExport
object ArmorClassCalculator {
    
    private fun getModifier(score: Int): Int = floor((score - 10).toDouble() / 2).toInt()
    
    /**
     * Registry of Unarmored Defense formulas by class
     */
    private val UNARMORED_DEFENSE_FORMULAS = mapOf(
        "barbarian" to AcFormulaDefinition(
            featureName = "Unarmored Defense",
            classId = "barbarian",
            description = "10 + DEX + CON when not wearing armor"
        ),
        "monk" to AcFormulaDefinition(
            featureName = "Unarmored Defense",
            classId = "monk",
            description = "10 + DEX + WIS when not wearing armor"
        ),
        "sorcerer" to AcFormulaDefinition(
            featureName = "Draconic Resilience",
            classId = "sorcerer",
            description = "13 + DEX when not wearing armor (Draconic Bloodline)"
        )
    )
    
    /**
     * Calculate Barbarian Unarmored Defense: 10 + DEX + CON
     */
    private fun calculateBarbarianUnarmored(char: Character): Int {
        val dexMod = getModifier(char.dex)
        val conMod = getModifier(char.con)
        return 10 + dexMod + conMod
    }
    
    /**
     * Calculate Monk Unarmored Defense: 10 + DEX + WIS
     */
    private fun calculateMonkUnarmored(char: Character): Int {
        val dexMod = getModifier(char.dex)
        val wisMod = getModifier(char.wis)
        return 10 + dexMod + wisMod
    }
    
    /**
     * Calculate Draconic Resilience: 13 + DEX
     */
    private fun calculateDraconicResilience(char: Character): Int {
        val dexMod = getModifier(char.dex)
        return 13 + dexMod
    }
    
    /**
     * Check if character has a feature by name in their class progression
     */
    private fun hasClassFeature(char: Character, featureName: String, classId: String): Boolean {
        // Features are typically stored in class progression or resolved features
        // For now, we'll check if character has the class at the right level
        // Level 1 Barbarian/Monk gets Unarmored Defense
        // Level 1 Draconic Bloodline Sorcerer gets Draconic Resilience
        val charClass = char.classes?.find { it.classId == classId }
        return charClass != null && charClass.level >= 1
    }
    
    /**
     * Check if character is wearing armor
     */
    fun isWearingArmor(inventory: Array<InventoryItem>?): Boolean {
        return inventory?.any { item ->
            item.equipped && item.item.category == "armor" && item.item.slot == "chest"
        } ?: false
    }
    
    /**
     * Check if character is wielding a shield
     */
    fun isWieldingShield(inventory: Array<InventoryItem>?): Boolean {
        return inventory?.any { item ->
            item.equipped && (item.item.category == "shield" || item.item.slot == "off_hand")
        } ?: false
    }
    
    /**
     * Get equipped armor AC (base armor class from worn armor)
     */
    fun getArmorAc(
        inventory: Array<InventoryItem>?,
        char: Character
    ): AcCalculationResult? {
        val armor = inventory?.find { item ->
            item.equipped && item.item.category == "armor" && item.item.slot == "chest"
        } ?: return null
        
        val baseAc = armor.item.armorClass ?: 10
        val dexMod = getModifier(char.dex)
        
        // Light armor: full DEX bonus
        // Medium armor: max +2 DEX bonus
        // Heavy armor: no DEX bonus
        val armorType = armor.item.type.lowercase()
        val finalDexBonus = when {
            armorType.contains("light") -> dexMod
            armorType.contains("medium") -> minOf(dexMod, 2)
            armorType.contains("heavy") -> 0
            else -> dexMod // Default to light armor behavior
        }
        
        return AcCalculationResult(
            value = baseAc + finalDexBonus,
            source = armor.item.name,
            breakdown = "$baseAc (${armor.item.name}) + $finalDexBonus (DEX)"
        )
    }
    
    /**
     * Get shield AC bonus
     */
    fun getShieldBonus(inventory: Array<InventoryItem>?): Int {
        val shield = inventory?.find { item ->
            item.equipped && (item.item.category == "shield" || item.item.slot == "off_hand")
        } ?: return 0
        
        return shield.item.armorClass ?: 2
    }
    
    /**
     * Calculate the best Unarmored Defense AC for the character
     * Returns null if no unarmored defense applies
     */
    fun calculateUnarmoredDefense(char: Character): AcCalculationResult? {
        val classIds = char.classes?.map { it.classId } ?: return null
        val dexMod = getModifier(char.dex)
        
        var bestAc = 10 + dexMod // Base unarmored
        var bestSource = "Unarmored (Base)"
        var bestBreakdown = "10 + $dexMod (DEX)"
        
        // Check Barbarian Unarmored Defense
        if (classIds.contains("barbarian") && hasClassFeature(char, "Unarmored Defense", "barbarian")) {
            val ac = calculateBarbarianUnarmored(char)
            if (ac > bestAc) {
                val conMod = getModifier(char.con)
                bestAc = ac
                bestSource = "Unarmored Defense (Barbarian)"
                bestBreakdown = "10 + $dexMod (DEX) + $conMod (CON)"
            }
        }
        
        // Check Monk Unarmored Defense
        if (classIds.contains("monk") && hasClassFeature(char, "Unarmored Defense", "monk")) {
            val ac = calculateMonkUnarmored(char)
            if (ac > bestAc) {
                val wisMod = getModifier(char.wis)
                bestAc = ac
                bestSource = "Unarmored Defense (Monk)"
                bestBreakdown = "10 + $dexMod (DEX) + $wisMod (WIS)"
            }
        }
        
        // Check Draconic Resilience (would need subclass check, simplified for now)
        // TODO: Add subclass-based feature detection
        
        return AcCalculationResult(
            value = bestAc,
            source = bestSource,
            breakdown = bestBreakdown
        )
    }
    
    /**
     * Calculate the character's effective AC considering armor, Unarmored Defense, and modifiers
     */
    fun calculateArmorClass(
        char: Character,
        inventory: Array<InventoryItem>?,
        modifierSources: Array<ModifierSource>? = null
    ): AcCalculationResult {
        val wearingArmor = isWearingArmor(inventory)
        val shieldBonus = getShieldBonus(inventory)
        
        // Get base AC (armor or unarmored)
        val baseResult = if (wearingArmor) {
            getArmorAc(inventory, char) ?: AcCalculationResult(10, "None", "10 (base)")
        } else {
            calculateUnarmoredDefense(char) ?: AcCalculationResult(
                value = 10 + getModifier(char.dex),
                source = "Unarmored (Base)",
                breakdown = "10 + ${getModifier(char.dex)} (DEX)"
            )
        }
        
        var totalAc = baseResult.value
        var fullBreakdown = baseResult.breakdown
        
        // Add shield bonus
        if (shieldBonus > 0) {
            totalAc += shieldBonus
            fullBreakdown += " + $shieldBonus (Shield)"
        }
        
        // Apply modifier bonuses (from magic items, etc.)
        modifierSources?.forEach { source ->
            source.modifiers.forEach { mod ->
                if (mod.target.lowercase() == "ac" && mod.type == "bonus") {
                    val bonus = mod.valueStr.toIntOrNull() ?: 0
                    if (bonus != 0) {
                        totalAc += bonus
                        fullBreakdown += " + $bonus (${source.name})"
                    }
                }
            }
        }
        
        return AcCalculationResult(
            value = totalAc,
            source = if (shieldBonus > 0) "${baseResult.source} + Shield" else baseResult.source,
            breakdown = fullBreakdown
        )
    }
}
