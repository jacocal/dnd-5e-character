@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.mechanics

import kotlin.js.JsExport
import kotlin.js.JsName
import kotlin.math.floor

@JsExport
data class AbilityScores(
    val str: Int,
    val dex: Int,
    val con: Int,
    val int: Int,
    val wis: Int,
    val cha: Int
)

@JsExport
fun getModifier(score: Int): Int {
    return floor((score - 10) / 2.0).toInt()
}

@JsExport
data class AcResult(
    val value: Int,
    val source: String
)

// We define a cleaner interface for JS interop
interface AcFormula {
    val featureName: String
    val classId: String
    val description: String
    fun calculate(abilities: AbilityScores, dexMod: Int): Int
    fun isApplicable(states: Array<String>): Boolean
}

// Concrete implementations for the known formulas
private class BarbarianUnarmoredDefense : AcFormula {
    override val featureName = "Unarmored Defense"
    override val classId = "barbarian"
    override val description = "AC = 10 + DEX modifier + CON modifier when not wearing armor"
    
    override fun calculate(abilities: AbilityScores, dexMod: Int): Int {
        return 10 + dexMod + getModifier(abilities.con)
    }

    override fun isApplicable(states: Array<String>): Boolean {
        return states.contains("unarmored")
    }
}

private class MonkUnarmoredDefense : AcFormula {
    override val featureName = "Unarmored Defense"
    override val classId = "monk"
    override val description = "AC = 10 + DEX modifier + WIS modifier when not wearing armor"
    
    override fun calculate(abilities: AbilityScores, dexMod: Int): Int {
        return 10 + dexMod + getModifier(abilities.wis)
    }

    override fun isApplicable(states: Array<String>): Boolean {
        return states.contains("unarmored")
    }
}

private class DraconicResilience : AcFormula {
    override val featureName = "Draconic Resilience"
    override val classId = "sorcerer"
    override val description = "AC = 13 + DEX modifier when not wearing armor (Draconic Bloodline)"
    
    override fun calculate(abilities: AbilityScores, dexMod: Int): Int {
        return 13 + dexMod
    }

    override fun isApplicable(states: Array<String>): Boolean {
        return states.contains("unarmored")
    }
}

@JsExport
object AcCalculator {
    // We cannot export 'List' directly to JS well in some KMP versions without mapping, 
    // but internal usage is fine. For the public API, we hide the concrete classes 
    // or expose them carefully. 
    // For simplicity, we keep the registry internal and expose the calculation method.
    
    private val formulas = listOf(
        BarbarianUnarmoredDefense(),
        MonkUnarmoredDefense(),
        DraconicResilience()
    )

    fun calculateBestAc(
        classFeatures: Array<String>, // Simplification: just pass feature names
        states: Array<String>,
        classIds: Array<String>,
        abilities: AbilityScores,
        dexMod: Int
    ): AcResult {
        
        // Find all applicable formulas
        val applicable = formulas.filter { formula ->
            // 1. Check Class
            if (!classIds.contains(formula.classId)) return@filter false
            
            // 2. Check Feature (Case insensitive)
            val hasFeature = classFeatures.any { it.equals(formula.featureName, ignoreCase = true) }
            if (!hasFeature) return@filter false
            
            // 3. Check Condition
            formula.isApplicable(states)
        }

        if (applicable.isEmpty()) {
            return AcResult(10 + dexMod, "Unarmored (Base)")
        }

        // Find max
        var bestAc = 0
        var bestSource = ""

        for (formula in applicable) {
            val ac = formula.calculate(abilities, dexMod)
            if (ac > bestAc) {
                bestAc = ac
                bestSource = "${formula.featureName} (${formula.classId})"
            }
        }

        return AcResult(bestAc, bestSource)
    }
}
