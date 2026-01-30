@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlin.js.JsExport

@JsExport
data class ResolvedSavingThrow(
    val ability: String,
    val total: Int,
    val isProficient: Boolean,
    val hasBonus: Boolean
)
