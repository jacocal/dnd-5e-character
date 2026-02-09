@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.ui.viewmodel

import org.dndcharacter.shared.data.DmRepository
import org.dndcharacter.shared.model.DmPlayer
import kotlinx.coroutines.launch
import kotlin.js.JsExport

@JsExport
data class DmDashboardState(
    val players: Array<DmPlayer> = emptyArray(),
    val isLoading: Boolean = false,
    val error: String? = null
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null || this::class != other::class) return false
        other as DmDashboardState
        if (!players.contentEquals(other.players)) return false
        if (isLoading != other.isLoading) return false
        if (error != other.error) return false
        return true
    }
    
    override fun hashCode(): Int {
        var result = players.contentHashCode()
        result = 31 * result + isLoading.hashCode()
        result = 31 * result + (error?.hashCode() ?: 0)
        return result
    }
}

@JsExport
class DmDashboardViewModel(
    @Suppress("NON_EXPORTABLE_TYPE") private val repository: DmRepository
) : BaseViewModel<DmDashboardState>(DmDashboardState()) {

    fun loadPlayers() {
        setState { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                val players = repository.getActivePlayers()
                setState { it.copy(isLoading = false, players = players) }
            } catch (e: Throwable) {
                setState { it.copy(isLoading = false, error = e.message ?: "Unknown error") }
            }
        }
    }

    fun updateAlignment(playerId: Int, newAlignment: String) {
        // Optimistic update
        val currentPlayers = state.value.players
        val updatedPlayers = currentPlayers.map {
            if (it.id == playerId) it.copy(alignment = newAlignment) else it
        }.toTypedArray()

        setState { it.copy(players = updatedPlayers) }

        viewModelScope.launch {
            try {
                val success = repository.updateCharacterAlignment(playerId, newAlignment)
                if (!success) {
                    // Revert
                    setState { it.copy(players = currentPlayers) }
                }
            } catch (e: Throwable) {
                setState { it.copy(players = currentPlayers, error = "Failed to update alignment") }
            }
        }
    }
}
