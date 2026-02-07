package org.dndcharacter.shared.data

import com.apollographql.apollo.ApolloClient
import org.dndcharacter.shared.graphql.GetCharacterQuery
import org.dndcharacter.shared.graphql.GetCharactersQuery
import org.dndcharacter.shared.model.*
import org.dndcharacter.shared.graphql.fragment.FullCharacter

/**
 * CharacterRepository implementation that fetches data from the GraphQL API
 * using Apollo Kotlin client.
 */
class ApolloCharacterRepository(
    private val apolloClient: ApolloClient
) : CharacterRepository {

    override suspend fun getCharacter(id: Int): Character? {
        val response = apolloClient.query(GetCharacterQuery(id)).execute()
        val data = response.data?.character?.fullCharacter ?: return null
        return mapToCharacter(data)
    }

    override suspend fun getAllCharacters(): Array<Character> {
        val response = apolloClient.query(GetCharactersQuery()).execute()
        val data = response.data?.characters ?: return emptyArray()
        
        return data.map { c ->
            Character(
                id = c.id ?: 0,
                name = c.name ?: "Unknown",
                raceId = c.raceId ?: "",
                raceEntry = c.raceName?.let { RaceEntry(id = c.raceId ?: "", name = it) },
                backgroundId = null,
                background = null,
                alignment = null,
                xp = 0,
                level = c.level ?: 1,
                str = 10, dex = 10, con = 10, int = 10, wis = 10, cha = 10,
                hpCurrent = 0, hpMax = 0, tempHp = 0,
                speed = 30, initiativeBonus = 0, armorClass = null,
                hitDiceCurrent = 1, hitDiceMax = 1,
                deathSaveSuccess = 0, deathSaveFailure = 0,
                inspiration = false, exhaustion = 0,
                usedPactSlots = 0,
                cp = 0, sp = 0, ep = 0, gp = 0, pp = 0,
                abilityPointPool = 0,
                size = "Medium",
                classes = c.classes?.map { cc ->
                    CharacterClass(
                        classId = cc.classId ?: "",
                        subclassId = null,
                        level = cc.level ?: 1,
                        className = cc.className,
                        subclassName = null,
                        hitDie = null
                    )
                }?.toTypedArray() ?: emptyArray(),
                createdAt = "",
                updatedAt = ""
            )
        }.toTypedArray()
    }


    override suspend fun saveCharacter(character: Character) {
        val input = org.dndcharacter.shared.graphql.type.UpdateCharacterInput(
            name = character.name,
            raceId = character.raceId,
            backgroundId = com.apollographql.apollo.api.Optional.presentIfNotNull(character.backgroundId),
            alignment = com.apollographql.apollo.api.Optional.presentIfNotNull(character.alignment),
            xp = character.xp,
            level = character.level,
            str = character.str,
            dex = character.dex,
            con = character.con,
            int = character.int,
            wis = character.wis,
            cha = character.cha,
            hpCurrent = character.hpCurrent,
            hpMax = character.hpMax,
            tempHp = character.tempHp,
            armorClass = com.apollographql.apollo.api.Optional.presentIfNotNull(character.armorClass),
            speed = character.speed,
            initiativeBonus = character.initiativeBonus,
            hitDiceCurrent = character.hitDiceCurrent,
            hitDiceMax = character.hitDiceMax,
            deathSaveSuccess = character.deathSaveSuccess,
            deathSaveFailure = character.deathSaveFailure,
            inspiration = character.inspiration,
            exhaustion = character.exhaustion,
            usedPactSlots = character.usedPactSlots,
            cp = character.cp,
            sp = character.sp,
            ep = character.ep,
            gp = character.gp,
            pp = character.pp,
            abilityPointPool = character.abilityPointPool,
            size = com.apollographql.apollo.api.Optional.presentIfNotNull(character.size),
            appearance = com.apollographql.apollo.api.Optional.presentIfNotNull(character.appearance),
            backstory = com.apollographql.apollo.api.Optional.presentIfNotNull(character.backstory),
            notes = com.apollographql.apollo.api.Optional.presentIfNotNull(character.notes),
            imageUrl = com.apollographql.apollo.api.Optional.presentIfNotNull(character.imageUrl),
            
            // JSON Fields (Passed as mapped Lists/Maps for generic serialization)
            usedSpellSlots = com.apollographql.apollo.api.Optional.presentIfNotNull(character.usedSpellSlots?.slots),
            manualProficiencies = com.apollographql.apollo.api.Optional.presentIfNotNull(character.manualProficiencies?.toMap()),
            proficiencies = com.apollographql.apollo.api.Optional.presentIfNotNull(character.proficiencies?.toMap()),
            feats = com.apollographql.apollo.api.Optional.presentIfNotNull(character.feats?.map { it.toMap() }),
            traits = com.apollographql.apollo.api.Optional.presentIfNotNull(character.traits?.map { it.toMap() }),
            resourceModifiers = com.apollographql.apollo.api.Optional.presentIfNotNull(character.resourceModifiers?.map { it.toMap() }),

            // Relations
            classes = com.apollographql.apollo.api.Optional.presentIfNotNull(
                character.classes?.map {
                    org.dndcharacter.shared.graphql.type.CharacterClassInput(
                        classId = it.classId,
                        subclassId = com.apollographql.apollo.api.Optional.presentIfNotNull(it.subclassId),
                        level = it.level
                    )
                }
            ),
            spells = com.apollographql.apollo.api.Optional.presentIfNotNull(
                character.spells?.map {
                    org.dndcharacter.shared.graphql.type.CharacterSpellInput(
                        spellId = it.spellId,
                        prepared = it.prepared,
                        isRitual = it.isRitual
                    )
                }
            ),
            inventory = com.apollographql.apollo.api.Optional.presentIfNotNull(
                character.inventory?.map {
                    org.dndcharacter.shared.graphql.type.CharacterInventoryInput(
                        itemId = it.itemId,
                        quantity = it.quantity,
                        equipped = it.equipped,
                        isIdentified = it.isIdentified,
                        isAttuned = it.isAttuned,
                        currentUses = com.apollographql.apollo.api.Optional.presentIfNotNull(it.currentUses)
                    )
                }
            ),
            conditions = com.apollographql.apollo.api.Optional.presentIfNotNull(
                character.conditions?.map {
                    org.dndcharacter.shared.graphql.type.CharacterConditionInput(
                        conditionId = it.conditionId,
                        duration = com.apollographql.apollo.api.Optional.presentIfNotNull(it.duration),
                        isPermanent = com.apollographql.apollo.api.Optional.presentIfNotNull(it.isPermanent),
                        source = com.apollographql.apollo.api.Optional.presentIfNotNull(it.source)
                    )
                }
            ),
            resources = com.apollographql.apollo.api.Optional.presentIfNotNull(
                character.resources?.map {
                    org.dndcharacter.shared.graphql.type.CharacterResourceInput(
                        resourceId = it.resourceId,
                        usedUses = it.usedUses
                    )
                }
            )
        )

        apolloClient.mutation(org.dndcharacter.shared.graphql.UpdateCharacterMutation(character.id, input)).execute()
    }



    override suspend fun createCharacter(name: String, raceId: String, classId: String): Character? {
        val input = org.dndcharacter.shared.graphql.type.CreateCharacterInput(
            name = name,
            raceId = raceId,
            classId = classId
        )
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.CreateCharacterMutation(input)).execute()
        // Access fullCharacter fragment here
        val data = response.data?.createCharacter?.fullCharacter ?: return null
        
        return mapToCharacter(data)
    }

    override suspend fun deleteCharacter(id: Int): Boolean {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.DeleteCharacterMutation(id)).execute()
        return response.data?.deleteCharacter ?: false
    }

    override suspend fun levelUp(data: LevelUpData): Character? {
        val input = org.dndcharacter.shared.graphql.type.LevelUpInput(
            characterId = data.characterId,
            classId = data.classId,
            hpIncrease = data.hpIncrease,
            hpMode = data.hpMode,
            subclassId = com.apollographql.apollo.api.Optional.presentIfNotNull(data.subclassId),
            featId = com.apollographql.apollo.api.Optional.presentIfNotNull(data.featId),
            asi = com.apollographql.apollo.api.Optional.presentIfNotNull(data.asi?.toMap())
        )
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.LevelUpMutation(input)).execute()
        val charData = response.data?.levelUp?.fullCharacter ?: return null
        return mapToCharacter(charData)
    }

    override suspend fun addCharacterItem(characterId: Int, itemId: String, quantity: Int): CharacterInventoryItem? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.AddCharacterItemMutation(characterId, itemId, quantity)).execute()
        val data = response.data?.addCharacterItem ?: return null
        return CharacterInventoryItem(
            id = data.id ?: 0,
            itemId = data.itemId ?: "",
            quantity = data.quantity ?: 0,
            equipped = data.equipped ?: false,
            isIdentified = data.isIdentified ?: false,
            isAttuned = data.isAttuned ?: false,
            currentUses = data.currentUses,
            itemName = data.itemName,
            itemCategory = data.itemCategory
        )
    }

    override suspend fun removeCharacterItem(inventoryId: Int): Boolean {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.RemoveCharacterItemMutation(inventoryId)).execute()
        return response.data?.removeCharacterItem ?: false
    }

    override suspend fun createCustomItem(characterId: Int, name: String, type: String, weight: Double, cost: Int, currency: String, description: String?): CharacterInventoryItem? {
        // TODO: Implement CreateCustomItemMutation in GraphQL or Backend when available
        return null
    }

    override suspend fun updateCharacterItemState(inventoryId: Int, equipped: Boolean?, isAttuned: Boolean?, isIdentified: Boolean?, quantity: Int?): CharacterInventoryItem? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.UpdateCharacterItemStateMutation(
            inventoryId = inventoryId,
            equipped = com.apollographql.apollo.api.Optional.presentIfNotNull(equipped),
            isIdentified = com.apollographql.apollo.api.Optional.presentIfNotNull(isIdentified),
            isAttuned = com.apollographql.apollo.api.Optional.presentIfNotNull(isAttuned),
            quantity = com.apollographql.apollo.api.Optional.presentIfNotNull(quantity)
        )).execute()
        val data = response.data?.updateCharacterItemState ?: return null
        return CharacterInventoryItem(
            id = data.id ?: 0,
            itemId = data.itemId ?: "",
            quantity = data.quantity ?: 0,
            equipped = data.equipped ?: false,
            isIdentified = data.isIdentified ?: false,
            isAttuned = data.isAttuned ?: false,
            currentUses = data.currentUses,
            itemName = data.itemName,
            itemCategory = data.itemCategory
        )
    }

    override suspend fun learnSpell(characterId: Int, spellId: String): CharacterSpell? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.LearnSpellMutation(characterId, spellId)).execute()
        val data = response.data?.learnSpell ?: return null
        return CharacterSpell(
            characterId = characterId,
            spellId = data.spellId ?: "",
            prepared = data.prepared ?: false,
            isRitual = data.isRitual ?: false,
            spellName = data.spellName,
            spellLevel = data.spellLevel
        )
    }

    override suspend fun forgetSpell(characterId: Int, spellId: String): Boolean {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.ForgetSpellMutation(characterId, spellId)).execute()
        return response.data?.forgetSpell ?: false
    }

    override suspend fun prepareSpell(characterId: Int, spellId: String, prepared: Boolean): CharacterSpell? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.PrepareSpellMutation(characterId, spellId, prepared)).execute()
        val data = response.data?.prepareSpell ?: return null
        return CharacterSpell(
            characterId = characterId,
            spellId = data.spellId ?: "",
            prepared = data.prepared ?: false,
            isRitual = data.isRitual ?: false,
            spellName = data.spellName,
            spellLevel = data.spellLevel
        )
    }

    override suspend fun toggleSpellRitual(characterId: Int, spellId: String, isRitual: Boolean): CharacterSpell? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.ToggleSpellRitualMutation(characterId, spellId, isRitual)).execute()
        val data = response.data?.toggleSpellRitual ?: return null
        return CharacterSpell(
            characterId = characterId,
            spellId = data.spellId ?: "",
            prepared = data.prepared ?: false,
            isRitual = data.isRitual ?: false,
            spellName = data.spellName,
            spellLevel = data.spellLevel
        )
    }

    override suspend fun toggleSpellConcentration(characterId: Int, spellId: String, isConcentrating: Boolean): CharacterSpell? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.ToggleSpellConcentrationMutation(characterId, spellId, isConcentrating)).execute()
        val data = response.data?.toggleSpellConcentration ?: return null
        return CharacterSpell(
            characterId = characterId,
            spellId = data.spellId ?: "",
            prepared = data.prepared ?: false,
            isRitual = data.isRitual ?: false,
            isConcentrating = data.isConcentrating ?: false,
            spellName = data.spellName,
            spellLevel = data.spellLevel
        )
    }

    override suspend fun updateCharacterCurrency(characterId: Int, cp: Int, sp: Int, ep: Int, gp: Int, pp: Int): Character? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.UpdateCharacterCurrencyMutation(characterId, cp, sp, ep, gp, pp)).execute()
        val data = response.data?.updateCharacterCurrency?.fullCharacter ?: return null
        return mapToCharacter(data)
    }

    override suspend fun addCharacterLanguage(characterId: Int, languageId: String): Character? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.AddCharacterLanguageMutation(characterId, languageId)).execute()
        val data = response.data?.addCharacterLanguage?.fullCharacter ?: return null
        return mapToCharacter(data)
    }

    override suspend fun removeCharacterLanguage(characterId: Int, languageId: String): Character? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.RemoveCharacterLanguageMutation(characterId, languageId)).execute()
        val data = response.data?.removeCharacterLanguage?.fullCharacter ?: return null
        return mapToCharacter(data)
    }

    override suspend fun updateCharacterSkill(characterId: Int, skill: String, proficiency: String): Character? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.UpdateCharacterSkillMutation(characterId, skill, proficiency)).execute()
        val data = response.data?.updateCharacterSkill?.fullCharacter ?: return null
        return mapToCharacter(data)
    }

    override suspend fun addCharacterTool(characterId: Int, tool: String): Character? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.AddCharacterToolMutation(characterId, tool)).execute()
        val data = response.data?.addCharacterTool?.fullCharacter ?: return null
        return mapToCharacter(data)
    }

    override suspend fun removeCharacterTool(characterId: Int, tool: String): Character? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.RemoveCharacterToolMutation(characterId, tool)).execute()
        val data = response.data?.removeCharacterTool?.fullCharacter ?: return null
        return mapToCharacter(data)
    }

    private fun mapToCharacter(data: FullCharacter): Character {
        return Character(
            id = data.id ?: 0,
            name = data.name ?: "Unknown",
            raceId = data.raceId ?: "",
            raceEntry = data.raceName?.let { RaceEntry(id = data.raceId ?: "", name = it) },
            backgroundId = data.backgroundId,
            background = null, // Hydrated later in ViewModel
            alignment = data.alignment,
            xp = data.xp ?: 0,
            level = data.level ?: 1,
            str = data.str ?: 10,
            dex = data.dex ?: 10,
            con = data.con ?: 10,
            int = data.int ?: 10,
            wis = data.wis ?: 10,
            cha = data.cha ?: 10,
            hpCurrent = data.hpCurrent ?: 1,
            hpMax = data.hpMax ?: 1,
            tempHp = data.tempHp ?: 0,
            armorClass = data.armorClass,
            speed = data.speed ?: 30,
            initiativeBonus = data.initiativeBonus ?: 0,
            hitDiceCurrent = data.hitDiceCurrent ?: 1,
            hitDiceMax = data.hitDiceMax ?: 1,
            deathSaveSuccess = data.deathSaveSuccess ?: 0,
            deathSaveFailure = data.deathSaveFailure ?: 0,
            inspiration = data.inspiration ?: false,
            exhaustion = data.exhaustion ?: 0,
            usedSpellSlots = parseSpellSlotMap(data.usedSpellSlots),
            usedPactSlots = data.usedPactSlots ?: 0,
            cp = data.cp ?: 0,
            sp = data.sp ?: 0,
            ep = data.ep ?: 0,
            gp = data.gp ?: 0,
            pp = data.pp ?: 0,
            proficiencies = parseCharacterProficiencies(data.proficiencies),
            manualProficiencies = parseManualProficiencies(data.manualProficiencies),
            feats = parseFeats(data.feats),
            traits = parseTraits(data.traits),
            abilityPointPool = data.abilityPointPool ?: 0,
            size = data.size ?: "Medium",
            appearance = data.appearance,
            backstory = data.backstory,
            notes = data.notes,
            imageUrl = data.imageUrl,
            resourceModifiers = parseResourceModifiers(data.resourceModifiers),
            classes = data.classes?.map { cc ->
                CharacterClass(
                    classId = cc.classId ?: "",
                    subclassId = cc.subclassId,
                    level = cc.level ?: 1,
                    className = cc.className,
                    subclassName = cc.subclass?.name,
                    hitDie = cc.hitDie
                )
            }?.toTypedArray() ?: emptyArray(),
            spells = data.spells?.map { cs ->
                CharacterSpell(
                    characterId = data.id ?: 0, // Mapping error fix? cs doesn't have characterId, use data.id
                    spellId = cs.spellId ?: "",
                    prepared = cs.prepared ?: false,
                    isRitual = cs.isRitual ?: false,
                    isConcentrating = cs.isConcentrating ?: false,
                    spellName = cs.spellName,
                    spellLevel = cs.spellLevel
                )
            }?.toTypedArray() ?: emptyArray(),
            inventory = data.inventory?.map { ci ->
                CharacterInventoryItem(
                    id = ci.id ?: 0,
                    characterId = data.id ?: 0, // Mapping error fix?
                    itemId = ci.itemId ?: "",
                    quantity = ci.quantity ?: 1,
                    equipped = ci.equipped ?: false,
                    isIdentified = ci.isIdentified ?: true,
                    isAttuned = ci.isAttuned ?: false,
                    currentUses = ci.currentUses,
                    itemName = ci.itemName,
                    itemCategory = ci.itemCategory
                )
            }?.toTypedArray() ?: emptyArray(),
            conditions = data.conditions?.map { cc ->
                CharacterCondition(
                    id = cc.id ?: 0,
                    characterId = data.id ?: 0,
                    conditionId = cc.conditionId ?: "",
                    duration = cc.duration,
                    isPermanent = cc.isPermanent,
                    source = cc.source,
                    conditionName = cc.conditionName
                )
            }?.toTypedArray() ?: emptyArray(),
            resources = data.resources?.map { cr ->
                CharacterResource(
                    characterId = data.id ?: 0,
                    resourceId = cr.resourceId ?: "",
                    usedUses = cr.usedUses ?: 0,
                    resourceName = cr.resourceName,
                    maxFormula = cr.maxFormula,
                    rechargeOn = cr.rechargeOn
                )
            }?.toTypedArray() ?: emptyArray(),
            languages = data.languages?.map { cl ->
                CharacterLanguage(
                     id = cl.id ?: 0,
                     characterId = cl.characterId ?: 0,
                     languageId = cl.languageId ?: "",
                     languageName = cl.language?.name,
                     languageScript = cl.language?.script
                )
            }?.toTypedArray() ?: emptyArray(),
            quests = data.quests?.map { q ->
                Quest(
                    id = q.id ?: 0,
                    characterId = data.id ?: 0,
                    title = q.title ?: "",
                    description = q.description,
                    status = q.status ?: "active",
                    isTracked = q.isTracked ?: true,
                    createdAt = q.createdAt ?: "",
                    updatedAt = q.updatedAt ?: "",
                    objectives = q.objectives?.map { obj ->
                         QuestObjective(
                             id = obj.id ?: 0,
                             questId = q.id ?: 0,
                             description = obj.description ?: "",
                             isCompleted = obj.isCompleted ?: false,
                             order = obj.order ?: 0
                         )
                     }?.toTypedArray() ?: emptyArray(),
                    logs = q.logs?.map { log ->
                        QuestLog(
                            id = log.id ?: 0,
                            questId = q.id ?: 0,
                            content = log.content ?: "",
                            createdAt = log.createdAt ?: ""
                        )
                    }?.toTypedArray() ?: emptyArray()
                )
            }?.toTypedArray() ?: emptyArray(),

            createdAt = "",
            updatedAt = ""
        )
    }

    // Helper functions to parse JSON fields
    @Suppress("UNCHECKED_CAST")
    private fun parseSpellSlotMap(data: Any?): SpellSlotMap? {
        if (data == null) return null
        return try {
            val map = data as? Map<String, Any> ?: return null
            SpellSlotMap(
                slots = map.mapValues { (it.value as Number).toInt() }
            )
        } catch (e: Exception) {
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseCharacterProficiencies(data: Any?): CharacterProficiencies? {
        if (data == null) return null
        return try {
            val map = data as? Map<String, Any> ?: return null
            CharacterProficiencies(
                skills = (map["skills"] as? Map<String, Any>)?.mapValues { entry ->
                    when (val v = entry.value) {
                        true -> "proficient"
                        "expertise" -> "expertise"
                        is String -> v
                        else -> "none"
                    }
                } ?: emptyMap(),
                tools = (map["tools"] as? List<String>)?.toTypedArray() ?: emptyArray(),
                savingThrows = (map["savingThrows"] as? Map<String, Boolean>) ?: emptyMap()
            )
        } catch (e: Exception) {
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseManualProficiencies(data: Any?): ManualProficiencies? {
        if (data == null) return null
        return try {
            val map = data as? Map<String, Any> ?: return null
            ManualProficiencies(
                armor = (map["armor"] as? List<String>)?.toTypedArray() ?: emptyArray(),
                weapons = (map["weapons"] as? List<String>)?.toTypedArray() ?: emptyArray(),
                tools = (map["tools"] as? List<String>)?.toTypedArray() ?: emptyArray()
            )
        } catch (e: Exception) {
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseFeats(data: Any?): Array<CharacterFeat>? {
        if (data == null) return null
        return try {
            val list = data as? List<Map<String, Any>> ?: return null
            list.map { feat ->
                CharacterFeat(
                    id = feat["id"] as? String ?: "",
                    name = feat["name"] as? String ?: "",
                    description = feat["description"] as? String ?: ""
                )
            }.toTypedArray()
        } catch (e: Exception) {
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseTraits(data: Any?): Array<CharacterTrait>? {
        if (data == null) return null
        return try {
            val list = data as? List<Map<String, Any>> ?: return null
            list.map { trait ->
                CharacterTrait(
                    id = trait["id"] as? String ?: "",
                    name = trait["name"] as? String ?: "",
                    description = trait["description"] as? String ?: "",
                    modifiers = parseModifiers(trait["modifiers"])
                )
            }.toTypedArray()
        } catch (e: Exception) {
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseResourceModifiers(data: Any?): Array<ResourceModifier>? {
        if (data == null) return null
        return try {
            val list = data as? List<Map<String, Any>> ?: return null
            list.map { mod ->
                ResourceModifier(
                    id = mod["id"] as? String ?: "",
                    modifications = parseModifiers(mod["modifications"]),
                    duration = mod["duration"] as? String
                )
            }.toTypedArray()
        } catch (e: Exception) {
            null
        }

    }

    @Suppress("UNCHECKED_CAST")
    private fun parseModifiers(modifiers: Any?): Array<Modifier> {
        if (modifiers !is List<*>) return emptyArray()
        return modifiers.mapNotNull { mod ->
            if (mod !is Map<*, *>) return@mapNotNull null
            val type = mod["type"] as? String ?: "bonus"
            val target = mod["target"] as? String ?: return@mapNotNull null
            val value = (mod["value"] as? Number)?.toInt()
            val valueString = mod["valueString"] as? String
            val condition = mod["condition"] as? String
            Modifier(type, target, value, valueString, condition)
        }.toTypedArray()
    }

    override suspend fun addCharacterCondition(characterId: Int, conditionId: String, level: Int?): Character? {
        val inputLevel = com.apollographql.apollo.api.Optional.presentIfNotNull(level)
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.AddCharacterConditionMutation(characterId, conditionId, inputLevel)).execute()
        val data = response.data?.addCharacterCondition?.fullCharacter ?: return null
        return mapToCharacter(data)
    }

    override suspend fun removeCharacterCondition(characterId: Int, conditionId: String): Character? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.RemoveCharacterConditionMutation(characterId, conditionId)).execute()
        val data = response.data?.removeCharacterCondition?.fullCharacter ?: return null
        return mapToCharacter(data)
    }

    // Helper serialization mappings
    private fun ManualProficiencies.toMap(): Map<String, Any> {
        return mapOf(
            "armor" to armor.toList(),
            "weapons" to weapons.toList(),
            "tools" to tools.toList()
        )
    }

    private fun CharacterProficiencies.toMap(): Map<String, Any> {
        return mapOf(
            "languages" to languages.toList(),
            "tools" to tools.toList(),
            "skills" to skills,
            "savingThrows" to savingThrows
        )
    }

    private fun CharacterFeat.toMap(): Map<String, Any> {
        return mapOf(
            "id" to id,
            "name" to name,
            "description" to description
        )
    }

    private fun CharacterTrait.toMap(): Map<String, Any> {
        val map = mutableMapOf<String, Any>(
            "id" to id,
            "name" to name,
            "description" to description
        )
        if (modifiers != null) {
            map["modifiers"] = modifiers.map { it.toMap() }
        }
        return map
    }

    private fun ResourceModifier.toMap(): Map<String, Any> {
        val map = mutableMapOf<String, Any>(
            "id" to id,
            "modifications" to modifications.map { it.toMap() }
        )
        if (duration != null) map["duration"] = duration
        return map
    }

    private fun Modifier.toMap(): Map<String, Any> {
        val map = mutableMapOf<String, Any>(
            "target" to target
        )
        if (value != null) map["value"] = value
        if (valueString != null) map["valueString"] = valueString
        return map
    }

    private fun AbilityScoreImprovement.toMap(): Map<String, Any> {
        return mapOf(
            "str" to str,
            "dex" to dex,
            "con" to con,
            "int" to int,
            "wis" to wis,
            "cha" to cha
        )
    }

    // Quest Implementation
    override suspend fun addQuest(characterId: Int, title: String, description: String?): Quest? {
        val input = com.apollographql.apollo.api.Optional.presentIfNotNull(description)
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.AddQuestMutation(characterId, title, input)).execute()
        val data = response.data?.addQuest ?: return null
        
        return Quest(
            id = data.id ?: 0,
            characterId = characterId,
            title = data.title ?: "",
            description = data.description,
            status = data.status ?: "active",
            isTracked = data.isTracked ?: true,
            createdAt = data.createdAt ?: "",
            updatedAt = data.updatedAt ?: "",
            objectives = data.objectives?.map { obj ->
                 QuestObjective(
                     id = obj.id ?: 0,
                     questId = data.id ?: 0,
                     description = obj.description ?: "",
                     isCompleted = obj.isCompleted ?: false,
                     order = obj.order ?: 0
                 )
            }?.toTypedArray() ?: emptyArray(),
            logs = data.logs?.map { log ->
                QuestLog(
                    id = log.id ?: 0,
                    questId = data.id ?: 0,
                    content = log.content ?: "",
                    createdAt = log.createdAt ?: ""
                )
            }?.toTypedArray() ?: emptyArray()
        )
    }

    override suspend fun updateQuest(questId: Int, title: String?, description: String?, status: String?, isTracked: Boolean?): Quest? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.UpdateQuestMutation(
            questId = questId,
            title = com.apollographql.apollo.api.Optional.presentIfNotNull(title),
            description = com.apollographql.apollo.api.Optional.presentIfNotNull(description),
            status = com.apollographql.apollo.api.Optional.presentIfNotNull(status),
            isTracked = com.apollographql.apollo.api.Optional.presentIfNotNull(isTracked)
        )).execute()
        val data = response.data?.updateQuest ?: return null
        
        return Quest(
            id = data.id ?: 0,
            characterId = 0, // Not returned in update response usually, but available in context if needed. Just 0 for now as UI might use state.
            title = data.title ?: "",
            description = data.description,
            status = data.status ?: "active",
            isTracked = data.isTracked ?: true,
            createdAt = data.createdAt ?: "",
            updatedAt = data.updatedAt ?: "",
            objectives = data.objectives?.map { obj ->
                 QuestObjective(
                     id = obj.id ?: 0,
                     questId = data.id ?: 0,
                     description = obj.description ?: "",
                     isCompleted = obj.isCompleted ?: false,
                     order = obj.order ?: 0
                 )
            }?.toTypedArray() ?: emptyArray(),
            logs = data.logs?.map { log ->
                QuestLog(
                    id = log.id ?: 0,
                    questId = data.id ?: 0,
                    content = log.content ?: "",
                    createdAt = log.createdAt ?: ""
                )
            }?.toTypedArray() ?: emptyArray()
        )
    }

    override suspend fun deleteQuest(questId: Int): Boolean {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.DeleteQuestMutation(questId)).execute()
        return response.data?.deleteQuest ?: false
    }

    override suspend fun addQuestObjective(questId: Int, description: String, order: Int?): QuestObjective? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.AddQuestObjectiveMutation(questId, description, com.apollographql.apollo.api.Optional.presentIfNotNull(order))).execute()
        val data = response.data?.addQuestObjective ?: return null
        return QuestObjective(
            id = data.id ?: 0,
            questId = data.questId ?: 0,
            description = data.description ?: "",
            isCompleted = data.isCompleted ?: false,
            order = data.order ?: 0
        )
    }

    override suspend fun toggleQuestObjective(objectiveId: Int, isCompleted: Boolean): QuestObjective? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.ToggleQuestObjectiveMutation(objectiveId, isCompleted)).execute()
        val data = response.data?.toggleQuestObjective ?: return null
        return QuestObjective(
            id = data.id ?: 0,
            questId = data.questId ?: 0,
            description = data.description ?: "",
            isCompleted = data.isCompleted ?: false,
            order = data.order ?: 0
        )
    }

    override suspend fun deleteQuestObjective(objectiveId: Int): Boolean {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.DeleteQuestObjectiveMutation(objectiveId)).execute()
        return response.data?.deleteQuestObjective ?: false
    }

    override suspend fun addQuestLog(questId: Int, content: String): QuestLog? {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.AddQuestLogMutation(questId, content)).execute()
        val data = response.data?.addQuestLog ?: return null
        return QuestLog(
            id = data.id ?: 0,
            questId = data.questId ?: 0,
            content = data.content ?: "",
            createdAt = data.createdAt ?: ""
        )
    }

    override suspend fun deleteQuestLog(logId: Int): Boolean {
        val response = apolloClient.mutation(org.dndcharacter.shared.graphql.DeleteQuestLogMutation(logId)).execute()
        return response.data?.deleteQuestLog ?: false
    }
}

