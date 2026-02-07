@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.mechanics

import kotlin.js.JsExport
import org.dndcharacter.shared.model.Character
import org.dndcharacter.shared.model.InventoryItem
import org.dndcharacter.shared.model.Modifier
import org.dndcharacter.shared.model.ModifierCondition
import org.dndcharacter.shared.model.ActiveModifier

/**
 * Evaluates modifier conditions against character state.
 * Used to filter modifiers that only apply under specific circumstances.
 */
@JsExport
object ConditionEvaluator {
    
    /**
     * Character state context for condition evaluation.
     */
    data class ConditionContext(
        val isWearingArmor: Boolean = false,
        val isWieldingShield: Boolean = false,
        val isRaging: Boolean = false,
        val isConcentrating: Boolean = false
    ) {
        val isUnarmored: Boolean get() = !isWearingArmor
    }
    
    /**
     * Builds a ConditionContext from character data and resolved items.
     */
    fun buildContext(
        character: Character,
        resolvedItems: Array<InventoryItem>
    ): ConditionContext {
        // Check equipped items for armor and shield
        val equippedItems = resolvedItems.filter { it.equipped }
        
        val isWearingArmor = equippedItems.any { item ->
            val categoryLower = item.item.category.lowercase()
            val typeLower = item.item.type.lowercase()
            val tags = item.item.tags.map { it.lowercase() }
            
            // Armor category or has armor tags (but not shield)
            (categoryLower == "armor" || typeLower.contains("armor") ||
                tags.any { it.startsWith("armor:") && !it.contains("shield") }) &&
                !typeLower.contains("shield") && !tags.contains("armor:shield")
        }
        
        val isWieldingShield = equippedItems.any { item ->
            val typeLower = item.item.type.lowercase()
            val tags = item.item.tags.map { it.lowercase() }
            
            typeLower.contains("shield") || tags.contains("armor:shield")
        }
        
        // Check for Raging condition
        val isRaging = character.conditions?.any { 
            it.conditionId.lowercase() == "raging" 
        } == true
        
        // Check for concentration (any spell with isConcentrating)
        val isConcentrating = character.spells?.any { 
            it.isConcentrating 
        } == true
        
        return ConditionContext(
            isWearingArmor = isWearingArmor,
            isWieldingShield = isWieldingShield,
            isRaging = isRaging,
            isConcentrating = isConcentrating
        )
    }
    
    /**
     * Checks if a specific condition is met in the given context.
     */
    fun isConditionMet(condition: ModifierCondition, context: ConditionContext): Boolean {
        return when (condition) {
            ModifierCondition.WEARING_ARMOR -> context.isWearingArmor
            ModifierCondition.UNARMORED -> context.isUnarmored
            ModifierCondition.WIELDING_SHIELD -> context.isWieldingShield
            ModifierCondition.RAGING -> context.isRaging
            ModifierCondition.CONCENTRATING -> context.isConcentrating
            ModifierCondition.NONE -> true // No condition = always applies
        }
    }
    
    /**
     * Checks if a modifier's condition is met.
     */
    fun isModifierActive(modifier: Modifier, context: ConditionContext): Boolean {
        val condition = modifier.getCondition()
        return isConditionMet(condition, context)
    }
    
    /**
     * Filters a list of modifiers to only those whose conditions are met.
     */
    fun filterActiveModifiers(
        modifiers: Array<Modifier>,
        context: ConditionContext
    ): Array<Modifier> {
        return modifiers.filter { isModifierActive(it, context) }.toTypedArray()
    }
    
    /**
     * Filters active modifiers (from resource activation) by their conditions.
     */
    fun filterActiveResourceModifiers(
        activeModifiers: Array<ActiveModifier>,
        context: ConditionContext
    ): Array<ActiveModifier> {
        return activeModifiers.filter { 
            isModifierActive(it.modifier, context) 
        }.toTypedArray()
    }
}
