@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlin.js.JsExport

@JsExport
data class ResolvedSkill(
    val name: String,
    val key: String,
    val ability: String,
    val total: Int,
    val isProficient: Boolean,
    val isExpertise: Boolean,
    val hasBonus: Boolean,
    val passive: Int
)
