@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport

@JsExport
@Serializable
data class Quest(
    val id: Int,
    val characterId: Int,
    val title: String,
    val description: String?,
    val status: String,
    val isTracked: Boolean,
    val createdAt: String,
    val updatedAt: String,
    val objectives: Array<QuestObjective>,
    val logs: Array<QuestLog>
)

@JsExport
@Serializable
data class QuestObjective(
    val id: Int,
    val questId: Int,
    val description: String,
    val isCompleted: Boolean,
    val order: Int
)

@JsExport
@Serializable
data class QuestLog(
    val id: Int,
    val questId: Int,
    val content: String,
    val createdAt: String
)
