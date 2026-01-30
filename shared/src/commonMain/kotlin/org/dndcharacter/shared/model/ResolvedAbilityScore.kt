@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlin.js.JsExport

@JsExport
data class ResolvedAbilityScore(
    val ability: String,
    val baseValue: Int,
    val effectiveValue: Int,
    val modifier: Int
)
