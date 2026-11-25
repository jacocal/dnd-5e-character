@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@Serializable
@JsExport
data class ResolvedSavingThrow(
    val ability: String,
    val total: Int,
    val isProficient: Boolean,
    val hasBonus: Boolean,
    val advantageState: String = "NORMAL",
    val autoFail: Boolean = false
)
