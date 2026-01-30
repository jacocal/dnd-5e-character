package org.dndcharacter.shared.data

import org.dndcharacter.shared.model.Character
import org.dndcharacter.shared.model.CharacterInventoryItem

interface CharacterRepository {
    suspend fun getCharacter(id: Int): Character?
    suspend fun getAllCharacters(): Array<Character>
    suspend fun createCharacter(name: String, classId: String, raceId: String): Character?
    suspend fun saveCharacter(character: Character)
    suspend fun deleteCharacter(id: Int): Boolean
    
    // Level Up
    suspend fun levelUp(data: org.dndcharacter.shared.model.LevelUpData): Character?
    
    // Spells
    suspend fun learnSpell(characterId: Int, spellId: String): org.dndcharacter.shared.model.CharacterSpell?
    suspend fun forgetSpell(characterId: Int, spellId: String): Boolean
    suspend fun prepareSpell(characterId: Int, spellId: String, prepared: Boolean): org.dndcharacter.shared.model.CharacterSpell?
    suspend fun toggleSpellRitual(characterId: Int, spellId: String, isRitual: Boolean): org.dndcharacter.shared.model.CharacterSpell?
    suspend fun toggleSpellConcentration(characterId: Int, spellId: String, isConcentrating: Boolean): org.dndcharacter.shared.model.CharacterSpell?

    // Currency, Language, Proficiency
    suspend fun updateCharacterCurrency(characterId: Int, cp: Int, sp: Int, ep: Int, gp: Int, pp: Int): Character?
    suspend fun addCharacterLanguage(characterId: Int, languageId: String): Character?
    suspend fun removeCharacterLanguage(characterId: Int, languageId: String): Character?
    suspend fun updateCharacterSkill(characterId: Int, skill: String, proficiency: String): Character?
    suspend fun addCharacterTool(characterId: Int, tool: String): Character?
    suspend fun removeCharacterTool(characterId: Int, tool: String): Character?
    suspend fun addCharacterCondition(characterId: Int, conditionId: String, level: Int? = null): Character?
    suspend fun removeCharacterCondition(characterId: Int, conditionId: String): Character?
    
    // Inventory
    suspend fun addCharacterItem(characterId: Int, itemId: String, quantity: Int): CharacterInventoryItem?
    suspend fun removeCharacterItem(inventoryId: Int): Boolean
    suspend fun updateCharacterItemState(inventoryId: Int, equipped: Boolean?, isAttuned: Boolean?, isIdentified: Boolean?, quantity: Int?): CharacterInventoryItem?
    suspend fun createCustomItem(characterId: Int, name: String, type: String, weight: Double, cost: Int, currency: String, description: String?): CharacterInventoryItem?

    // Quests
    suspend fun addQuest(characterId: Int, title: String, description: String?): org.dndcharacter.shared.model.Quest?
    suspend fun updateQuest(questId: Int, title: String?, description: String?, status: String?, isTracked: Boolean?): org.dndcharacter.shared.model.Quest?
    suspend fun deleteQuest(questId: Int): Boolean
    suspend fun addQuestObjective(questId: Int, description: String, order: Int?): org.dndcharacter.shared.model.QuestObjective?
    suspend fun toggleQuestObjective(objectiveId: Int, isCompleted: Boolean): org.dndcharacter.shared.model.QuestObjective?
    suspend fun deleteQuestObjective(objectiveId: Int): Boolean
    suspend fun addQuestLog(questId: Int, content: String): org.dndcharacter.shared.model.QuestLog?
    suspend fun deleteQuestLog(logId: Int): Boolean
}
