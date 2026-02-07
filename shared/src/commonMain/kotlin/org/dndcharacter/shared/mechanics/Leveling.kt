package org.dndcharacter.shared.mechanics

import org.dndcharacter.shared.model.CharacterClass

object Leveling {
    const val MAX_LEVEL = 20

    val XP_TABLE = mapOf(
        1 to 0,
        2 to 300,
        3 to 900,
        4 to 2700,
        5 to 6500,
        6 to 14000,
        7 to 23000,
        8 to 34000,
        9 to 48000,
        10 to 64000,
        11 to 85000,
        12 to 100000,
        13 to 120000,
        14 to 140000,
        15 to 165000,
        16 to 195000,
        17 to 225000,
        18 to 265000,
        19 to 305000,
        20 to 355000
    )

    fun calculateTotalLevel(classes: Array<CharacterClass>): Int {
        return classes.sumOf { it.level }
    }

    fun calculateProficiencyBonus(totalLevel: Int): Int {
        if (totalLevel <= 0) return 2
        return kotlin.math.ceil(1 + totalLevel / 4.0).toInt()
    }

    fun getXpForLevel(level: Int): Int {
        return XP_TABLE[level] ?: 0
    }

    fun canLevelUp(currentClasses: Array<CharacterClass>, currentXp: Int): Boolean {
        val total = calculateTotalLevel(currentClasses)
        if (total >= MAX_LEVEL) return false
        val requiredXp = getXpForLevel(total + 1)
        return currentXp >= requiredXp
    }

    fun getPotentialLevels(currentClasses: Array<CharacterClass>, currentXp: Int): Int {
        val currentTotal = calculateTotalLevel(currentClasses)
        var potential = 0
        for (lvl in (currentTotal + 1)..MAX_LEVEL) {
            if (currentXp >= getXpForLevel(lvl)) {
                potential++
            } else {
                break
            }
        }
        return potential
    }
}
