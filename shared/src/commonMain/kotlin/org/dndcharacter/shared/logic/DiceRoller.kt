@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.logic

import kotlin.random.Random
import kotlin.js.JsExport

@JsExport
object DiceRoller {
    fun roll(sides: Int, count: Int = 1): Int {
        var total = 0
        repeat(count) {
            total += Random.nextInt(1, sides + 1)
        }
        return total
    }
}
