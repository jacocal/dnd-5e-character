@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.mechanics

import kotlin.js.JsExport
import kotlin.math.floor
import kotlin.math.ceil

@JsExport
data class SpellSlotResult(
    val casterLevel: Int,
    // Index 1 = Level 1 slots, Index 9 = Level 9 slots. Index 0 unused.
    val slots: IntArray, 
    val pactSlots: Int,
    val pactSlotLevel: Int
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null || this::class != other::class) return false
        other as SpellSlotResult
        if (casterLevel != other.casterLevel) return false
        if (!slots.contentEquals(other.slots)) return false
        if (pactSlots != other.pactSlots) return false
        if (pactSlotLevel != other.pactSlotLevel) return false
        return true
    }

    override fun hashCode(): Int {
        var result = casterLevel
        result = 31 * result + slots.contentHashCode()
        result = 31 * result + pactSlots
        result = 31 * result + pactSlotLevel
        return result
    }
}

@JsExport
data class ClassSpellcastingInfo(
    val classId: String,
    val level: Int,
    val spellcastingType: String // "full", "half", "artificer", "third", "pact", "none"
)

@JsExport
object SpellSlotCalculator {
    
    // Key = Effective Caster Level, Value = Array of slots (0..9)
    private val MULTICLASS_SLOT_TABLE = mapOf(
        1 to intArrayOf(0, 2),
        2 to intArrayOf(0, 3),
        3 to intArrayOf(0, 4, 2),
        4 to intArrayOf(0, 4, 3),
        5 to intArrayOf(0, 4, 3, 2),
        6 to intArrayOf(0, 4, 3, 3),
        7 to intArrayOf(0, 4, 3, 3, 1),
        8 to intArrayOf(0, 4, 3, 3, 2),
        9 to intArrayOf(0, 4, 3, 3, 3, 1),
        10 to intArrayOf(0, 4, 3, 3, 3, 2),
        11 to intArrayOf(0, 4, 3, 3, 3, 2, 1),
        12 to intArrayOf(0, 4, 3, 3, 3, 2, 1),
        13 to intArrayOf(0, 4, 3, 3, 3, 2, 1, 1),
        14 to intArrayOf(0, 4, 3, 3, 3, 2, 1, 1),
        15 to intArrayOf(0, 4, 3, 3, 3, 2, 1, 1, 1),
        16 to intArrayOf(0, 4, 3, 3, 3, 2, 1, 1, 1),
        17 to intArrayOf(0, 4, 3, 3, 3, 2, 1, 1, 1, 1),
        18 to intArrayOf(0, 4, 3, 3, 3, 3, 1, 1, 1, 1),
        19 to intArrayOf(0, 4, 3, 3, 3, 3, 2, 1, 1, 1),
        20 to intArrayOf(0, 4, 3, 3, 3, 3, 2, 2, 1, 1)
    )

    // Key = Warlock Level, Value = Pair(Count, SlotLevel)
    private val PACT_MAGIC_TABLE = mapOf(
        1 to Pair(1, 1), 2 to Pair(2, 1), 3 to Pair(2, 2), 4 to Pair(2, 2),
        5 to Pair(2, 3), 6 to Pair(2, 3), 7 to Pair(2, 4), 8 to Pair(2, 4),
        9 to Pair(2, 5), 10 to Pair(2, 5), 11 to Pair(3, 5), 12 to Pair(3, 5),
        13 to Pair(3, 5), 14 to Pair(3, 5), 15 to Pair(3, 5), 16 to Pair(3, 5),
        17 to Pair(4, 5), 18 to Pair(4, 5), 19 to Pair(4, 5), 20 to Pair(4, 5)
    )

    fun calculate(classes: Array<ClassSpellcastingInfo>): SpellSlotResult {
        var ecl = 0.0
        var warlockLevel = 0
        var hasStandardCasting = false

        for (info in classes) {
            when (info.spellcastingType) {
                "full" -> {
                    ecl += info.level
                    hasStandardCasting = true
                }
                "half" -> {
                    ecl += floor(info.level / 2.0)
                    hasStandardCasting = true
                }
                "artificer" -> {
                    ecl += ceil(info.level / 2.0)
                    hasStandardCasting = true
                }
                "third" -> {
                    ecl += floor(info.level / 3.0)
                    hasStandardCasting = true
                }
                "pact" -> warlockLevel += info.level
            }
        }

        val effectiveLevel = ecl.toInt()
        
        // Lookup Slots
        val standardSlots = if (effectiveLevel > 0) {
            // Safe lookup, cap at 20
            val safeLevel = if (effectiveLevel > 20) 20 else effectiveLevel
            // Copy array to ensure safety
            val found = MULTICLASS_SLOT_TABLE[safeLevel] ?: intArrayOf()
            // Pad to size 10 (0..9)
            val padded = IntArray(10)
            for (i in found.indices) {
                if (i < 10) padded[i] = found[i]
            }
            padded
        } else {
            IntArray(10)
        }

        // Lookup Pact Magic
        val pactInfo = if (warlockLevel > 0) {
            val safeLevel = if (warlockLevel > 20) 20 else warlockLevel
            PACT_MAGIC_TABLE[safeLevel] ?: Pair(0, 0)
        } else {
            Pair(0, 0)
        }

        return SpellSlotResult(
            casterLevel = effectiveLevel,
            slots = standardSlots,
            pactSlots = pactInfo.first,
            pactSlotLevel = pactInfo.second
        )
    }
}
