@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@Serializable
@JsExport
data class SpellComponents(
    val v: Boolean = false,
    val s: Boolean = false,
    val m: Boolean = false,
    val material_description: String? = null
)

@Serializable
@JsExport
data class Spell(
    val id: String,
    val name: String,
    val level: Int = 0,
    val school: String = "Unknown",
    val castingTime: String = "",
    val range: String = "",
    val isRitual: Boolean = false,
    val isConcentration: Boolean = false,
    val description: String = "",
    // Arrays in KMP/JS interop better as Arrays or explicitly mapped Lists
    val classes: Array<String> = emptyArray(),
    val tags: Array<String> = emptyArray(),
    val components: SpellComponents? = null
)
