package org.dndcharacter.shared.usecase

import org.dndcharacter.shared.model.Character
import org.dndcharacter.shared.model.CharacterClass
import org.dndcharacter.shared.mechanics.getModifier
import org.dndcharacter.shared.logic.DiceRoller
import org.dndcharacter.shared.data.RulesRepository

// Removed @JsExport to avoid suspend function export issues
class LevelUpUseCase(
    private val rulesRepository: RulesRepository
) {
    /**
     * Levels up a character in a specific class.
     * @param character The current character state
     * @param classId The class ID to level up in (must exist in rules)
     * @param takeAverageHp If true, uses fixed HP average. If false, rolls for HP.
     * @param targetSubclassId Optional subclass ID if picking one at this level
     */
    suspend fun execute(
        character: Character, 
        classId: String, 
        takeAverageHp: Boolean,
        targetSubclassId: String? = null
    ): Character {
        // 1. Validate inputs
        // In real app, check rulesRepository.getClass(classId)
        
        // 2. Find existing class entry or create new
        val existingClass = character.classes?.find { it.classId == classId }
        
        val newClasses = if (existingClass != null) {
            // Update existing
            character.classes.map { 
                if (it.classId == classId) {
                    it.copy(
                        level = it.level + 1,
                        subclassId = targetSubclassId ?: it.subclassId
                    )
                } else it
            }.toTypedArray()
        } else {
            // Add new (Multiclass)
            val newEntry = CharacterClass(
                characterId = character.id,
                classId = classId,
                level = 1,
                subclassId = targetSubclassId
            )
            val currentList = character.classes?.toList() ?: emptyList()
            (currentList + newEntry).toTypedArray()
        }
        
        // 3. Update Global Level
        // Recalculate total level from all classes
        val newTotalLevel = newClasses.sumOf { it.level }
        
        // 4. Calculate HP Increase
        // Needed: Hit Die for the class. 
        // Mocking logic for now as RulesRepository.getClass is not yet fully implemented in interface
        // We assume d8 for basics, or try to infer.
        // TODO: Add getClass(id) to Repository to get HitDie.
        val hitDie = 8 // Default fallback
        val conMod = getModifier(character.con)
        
        val hpGain = if (takeAverageHp) {
            (hitDie / 2) + 1 + conMod
        } else {
            DiceRoller.roll(hitDie) + conMod
        }
        
        // Ensure minimum 1 HP gain? 5e rules say minimum 1.
        val actualHpGain = maxOf(1, hpGain)
        
        // 5. Update Resources (e.g. Rage)
        // This requires observing the Rules for the new level.
        // For simplified implementation, we just update the character stats.
        
        return character.copy(
            level = newTotalLevel,
            classes = newClasses,
            hpMax = character.hpMax + actualHpGain,
            hpCurrent = character.hpCurrent + actualHpGain, // Heal the gain? Usually yes.
            hitDiceMax = newTotalLevel, // Simplified
            hitDiceCurrent = character.hitDiceCurrent + 1
        )
    }
}
