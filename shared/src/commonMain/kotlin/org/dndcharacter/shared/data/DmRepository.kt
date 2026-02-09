package org.dndcharacter.shared.data

import org.dndcharacter.shared.model.DmPlayer
import org.dndcharacter.shared.model.CreateItemResult
import org.dndcharacter.shared.model.DmItemData

interface DmRepository {
    suspend fun getActivePlayers(): Array<DmPlayer>
    suspend fun createGlobalItem(item: DmItemData): CreateItemResult
    suspend fun updateCharacterAlignment(characterId: Int, alignment: String): Boolean
}
