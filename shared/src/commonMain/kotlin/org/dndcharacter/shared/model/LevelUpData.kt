@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@JsExport
@Serializable
data class LevelUpData(
    val characterId: Int,
    val classId: String,
    val hpIncrease: Int,
    val hpMode: String, // "average" or "manual"
    val subclassId: String? = null,
    val featId: String? = null,
    val asi: AbilityScoreImprovement? = null
)

@JsExport
@Serializable
data class AbilityScoreImprovement(
    val str: Int = 0,
    val dex: Int = 0,
    val con: Int = 0,
    val int: Int = 0,
    val wis: Int = 0,
    val cha: Int = 0
)
