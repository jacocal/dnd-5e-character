@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@Serializable
@JsExport
data class ResolvedSpellcastingStats(
    val classId: String,
    val className: String,
    val ability: String, // "INT", "WIS", "CHA"
    val modifier: Int,
    val saveDC: Int,
    val attackBonus: Int
)
