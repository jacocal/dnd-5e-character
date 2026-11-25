@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.mechanics

import kotlin.js.JsExport
import kotlin.math.floor
import org.dndcharacter.shared.model.Character
import org.dndcharacter.shared.model.InventoryItem
import org.dndcharacter.shared.model.ModifierCondition

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
 * Armor Class Calculator (D&D 5e 2024 Rules).
 * Handles Armor, Shields, Medium Armor Master, Barbarian/Monk/Dance Bard Unarmored Defense,
 * Draconic Sorcery Resilience (10 + DEX + CHA), Mage Armor / Armor of Shadows, and conditional AC modifiers.
 */
@JsExport
object ArmorClassCalculator {

    private fun getModifier(score: Int): Int = floor((score - 10).toDouble() / 2).toInt()

    private fun isShieldItem(item: InventoryItem): Boolean {
        val cat = item.item.category.lowercase()
        val typ = item.item.type.lowercase()
        val tags = item.item.tags.map { it.lowercase() }
        return cat == "shield" || typ.contains("shield") || tags.contains("armor:shield")
    }

    private fun isWornArmorItem(item: InventoryItem): Boolean {
        if (isShieldItem(item)) return false
        val cat = item.item.category.lowercase()
        val typ = item.item.type.lowercase()
        val tags = item.item.tags.map { it.lowercase() }
        return (cat == "armor" || typ.contains("armor") || tags.any { it.startsWith("armor:") }) &&
            (item.item.slot == null || item.item.slot == "chest")
    }

    /**
     * Check if character is wearing body armor (excludes shields).
     */
    fun isWearingArmor(inventory: Array<InventoryItem>?): Boolean {
        return inventory?.any { it.equipped && isWornArmorItem(it) } ?: false
    }

    /**
     * Check if character is wielding a shield (never triggers on off-hand weapons).
     */
    fun isWieldingShield(inventory: Array<InventoryItem>?): Boolean {
        return inventory?.any { it.equipped && isShieldItem(it) } ?: false
    }

    /**
     * Get equipped armor AC (with Medium Armor Master support: +3 max DEX if DEX >= 16).
     */
    fun getArmorAc(
        inventory: Array<InventoryItem>?,
        char: Character
    ): AcCalculationResult? {
        val armor = inventory?.find { it.equipped && isWornArmorItem(it) } ?: return null

        val baseAc = armor.item.armorClass ?: 10
        val dexMod = getModifier(char.dex)
        val hasMediumArmorMaster = char.feats?.any { it.id.equals("medium-armor-master", ignoreCase = true) } == true
        val mediumDexCap = if (hasMediumArmorMaster && char.dex >= 16) 3 else 2

        val armorType = armor.item.type.lowercase()
        val tags = armor.item.tags.map { it.lowercase() }
        val finalDexBonus = when {
            armorType.contains("light") || tags.contains("armor:light") -> dexMod
            armorType.contains("medium") || tags.contains("armor:medium") -> minOf(dexMod, mediumDexCap)
            armorType.contains("heavy") || tags.contains("armor:heavy") -> 0
            else -> dexMod
        }

        val breakdown = if (finalDexBonus != 0) {
            "$baseAc (${armor.item.name}) + $finalDexBonus (DEX)"
        } else {
            "$baseAc (${armor.item.name})"
        }

        return AcCalculationResult(
            value = baseAc + finalDexBonus,
            source = armor.item.name,
            breakdown = breakdown
        )
    }

    /**
     * Get shield AC bonus (only from actual shields, never off-hand weapons).
     */
    fun getShieldBonus(inventory: Array<InventoryItem>?): Int {
        val shield = inventory?.find { it.equipped && isShieldItem(it) } ?: return 0
        return shield.item.armorClass ?: 2
    }

    /**
     * Calculate the best Unarmored AC formula (highest wins per D&D 5e 2024 rules).
     * - Base Unarmored: 10 + DEX
     * - Barbarian Unarmored Defense: 10 + DEX + CON (shield allowed)
     * - Monk Unarmored Defense: 10 + DEX + WIS (NO shield allowed)
     * - Draconic Sorcery (Lv 3+): 10 + DEX + CHA (2024 PHB; shield allowed if proficient)
     * - College of Dance Bard (Lv 3+): 10 + DEX + CHA (2024 PHB; NO shield allowed)
     * - Mage Armor / Armor of Shadows: 13 + DEX (when active & unarmored)
     */
    fun calculateUnarmoredDefense(
        char: Character,
        wieldingShield: Boolean = false,
        hasMageArmor: Boolean = false
    ): AcCalculationResult {
        val dexMod = getModifier(char.dex)
        val conMod = getModifier(char.con)
        val wisMod = getModifier(char.wis)
        val chaMod = getModifier(char.cha)

        var bestAc = 10 + dexMod
        var bestSource = "Unarmored (Base)"
        var bestBreakdown = "10 + $dexMod (DEX)"

        if (hasMageArmor) {
            val ac = 13 + dexMod
            if (ac > bestAc) {
                bestAc = ac
                bestSource = "Mage Armor"
                bestBreakdown = "13 + $dexMod (DEX)"
            }
        }

        char.classes?.forEach { cls ->
            when (cls.classId.lowercase()) {
                "barbarian" -> {
                    val ac = 10 + dexMod + conMod
                    if (ac > bestAc) {
                        bestAc = ac
                        bestSource = "Unarmored Defense (Barbarian)"
                        bestBreakdown = "10 + $dexMod (DEX) + $conMod (CON)"
                    }
                }
                "monk" -> {
                    // 2024 & 2014 PHB: Monk Unarmored Defense requires no armor AND no shield
                    if (!wieldingShield) {
                        val ac = 10 + dexMod + wisMod
                        if (ac > bestAc) {
                            bestAc = ac
                            bestSource = "Unarmored Defense (Monk)"
                            bestBreakdown = "10 + $dexMod (DEX) + $wisMod (WIS)"
                        }
                    }
                }
                "sorcerer" -> {
                    // 2024 PHB: Draconic Resilience (Lv 3+) = 10 + DEX + CHA
                    if (cls.level >= 3 && cls.subclassId?.contains("draconic", ignoreCase = true) == true) {
                        val ac = 10 + dexMod + chaMod
                        if (ac > bestAc) {
                            bestAc = ac
                            bestSource = "Draconic Resilience (Sorcerer)"
                            bestBreakdown = "10 + $dexMod (DEX) + $chaMod (CHA)"
                        }
                    }
                }
                "bard" -> {
                    // 2024 PHB: College of Dance Dazzling Footwork (Lv 3+) = 10 + DEX + CHA (no armor/shield)
                    if (!wieldingShield && cls.level >= 3 && cls.subclassId?.contains("dance", ignoreCase = true) == true) {
                        val ac = 10 + dexMod + chaMod
                        if (ac > bestAc) {
                            bestAc = ac
                            bestSource = "Unarmored Defense (College of Dance)"
                            bestBreakdown = "10 + $dexMod (DEX) + $chaMod (CHA)"
                        }
                    }
                }
            }
        }

        return AcCalculationResult(
            value = bestAc,
            source = bestSource,
            breakdown = bestBreakdown
        )
    }

    /**
     * Calculate the character's effective AC considering armor, Unarmored Defense, shields, and conditional modifiers.
     */
    fun calculateArmorClass(
        char: Character,
        inventory: Array<InventoryItem>?,
        modifierSources: Array<ModifierSource>? = null,
        conditionContext: ConditionEvaluator.ConditionContext? = null
    ): AcCalculationResult {
        val ctx = conditionContext ?: ConditionEvaluator.buildContext(char, inventory ?: emptyArray())
        val wearingArmor = isWearingArmor(inventory)
        val wieldingShield = isWieldingShield(inventory)
        val shieldBonus = getShieldBonus(inventory)

        val hasMageArmor = (modifierSources?.any { src ->
            src.id.equals("mage-armor", ignoreCase = true) ||
                src.id.equals("inv-armor-of-shadows", ignoreCase = true)
        } == true)

        val baseResult = if (wearingArmor) {
            getArmorAc(inventory, char) ?: AcCalculationResult(10, "None", "10 (base)")
        } else {
            calculateUnarmoredDefense(char, wieldingShield = wieldingShield, hasMageArmor = hasMageArmor)
        }

        var totalAc = baseResult.value
        var fullBreakdown = baseResult.breakdown
        var resolvedSource = baseResult.source

        // Apply 'set' AC modifiers (e.g., Barkskin set AC 17 — highest wins before bonuses)
        modifierSources?.forEach { source ->
            source.modifiers.forEach { mod ->
                if (mod.target.equals("ac", ignoreCase = true) && mod.type.equals("set", ignoreCase = true)) {
                    if (!mod.condition.isNullOrEmpty()) {
                        val cond = ModifierCondition.fromKey(mod.condition)
                        if (!ConditionEvaluator.isConditionMet(cond, ctx)) return@forEach
                    }
                    val setVal = mod.valueStr.toIntOrNull() ?: 0
                    if (setVal > totalAc) {
                        totalAc = setVal
                        resolvedSource = source.name
                        fullBreakdown = "$setVal (${source.name})"
                    }
                }
            }
        }

        // Add shield bonus
        if (shieldBonus > 0) {
            totalAc += shieldBonus
            fullBreakdown += " + $shieldBonus (Shield)"
        }

        // Apply conditional 'bonus' AC modifiers (Defense Fighting Style, Ring of Protection, Shield spell, etc.)
        // Note: inv-armor-of-shadows is already handled as Mage Armor base formula (13 + DEX) above so it doesn't double-stack with Unarmored Defense.
        modifierSources?.forEach { source ->
            if (source.id.equals("inv-armor-of-shadows", ignoreCase = true)) return@forEach
            source.modifiers.forEach { mod ->
                if (mod.target.equals("ac", ignoreCase = true) && mod.type.equals("bonus", ignoreCase = true)) {
                    if (!mod.condition.isNullOrEmpty()) {
                        val cond = ModifierCondition.fromKey(mod.condition)
                        if (!ConditionEvaluator.isConditionMet(cond, ctx)) return@forEach
                    }
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
            source = if (shieldBonus > 0) "$resolvedSource + Shield" else resolvedSource,
            breakdown = fullBreakdown
        )
    }
}
