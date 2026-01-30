package org.dndcharacter.shared.data

import com.apollographql.apollo.ApolloClient
import org.dndcharacter.shared.graphql.GetConditionQuery
import org.dndcharacter.shared.graphql.GetItemQuery
import org.dndcharacter.shared.graphql.GetRaceQuery
import org.dndcharacter.shared.graphql.GetFeatQuery
import org.dndcharacter.shared.graphql.GetResourceQuery
import org.dndcharacter.shared.graphql.GetSpellQuery
import org.dndcharacter.shared.graphql.GetClassProgressionQuery
import org.dndcharacter.shared.model.Item
import org.dndcharacter.shared.model.RaceEntry
import org.dndcharacter.shared.model.RuleCondition
import org.dndcharacter.shared.model.RuleResource
import org.dndcharacter.shared.model.Spell
import org.dndcharacter.shared.model.SpellComponents
import org.dndcharacter.shared.model.Modifier

class ApolloRulesRepository(private val apolloClient: ApolloClient) : RulesRepository {

    override suspend fun getItem(id: String): Item? {
        val response = apolloClient.query(GetItemQuery(id)).execute()
        val data = response.data?.item ?: return null
        
        return Item(
            id = data.id ?: "",
            name = data.name ?: "",
            type = data.type ?: "gear",
            costAmount = data.costAmount ?: 0,
            costCurrency = data.costCurrency ?: "gp",
            weightAmount = data.weightAmount ?: 0.0,
            weightUnit = data.weightUnit ?: "lb",
            category = data.category ?: "misc",
            slot = data.slot,
            armorClass = data.armorClass,
            strengthRequirement = data.strengthRequirement,
            stealthDisadvantage = data.stealthDisadvantage ?: false,
            damageDice = data.damageDice,
            damageType = data.damageType,
            range = data.range,
            properties = data.properties?.filterNotNull()?.toTypedArray() ?: emptyArray(),
            rarity = data.rarity ?: "common",
            requiresAttunement = data.requiresAttunement ?: false,
            isMagical = data.isMagical ?: false,
            isCursed = data.isCursed ?: false,
            trueName = data.trueName,
            shownEffect = data.shownEffect,
            trueEffect = data.trueEffect,
            description = data.description,
            tags = data.tags?.filterNotNull()?.toTypedArray() ?: emptyArray(),
            modifiers = parseModifiers(data.modifiers)
        )
    }

    override suspend fun getSpell(id: String): Spell? {
        val response = apolloClient.query(GetSpellQuery(id)).execute()
        val data = response.data?.spell ?: return null
        
        return Spell(
            id = data.id ?: "",
            name = data.name ?: "",
            level = data.level ?: 0,
            school = data.school ?: "Unknown",
            castingTime = data.castingTime ?: "",
            range = data.range ?: "",
            isRitual = data.isRitual ?: false,
            isConcentration = data.isConcentration ?: false,
            description = data.description ?: "",
            classes = data.classes?.filterNotNull()?.toTypedArray() ?: emptyArray(),
            tags = data.tags?.filterNotNull()?.toTypedArray() ?: emptyArray(),
            components = @Suppress("UNCHECKED_CAST") (data.components as? Map<String, Any?>)?.let { comp ->
                SpellComponents(
                    v = comp["v"] as? Boolean ?: false,
                    s = comp["s"] as? Boolean ?: false,
                    m = comp["m"] as? Boolean ?: false,
                    material_description = comp["material_description"] as? String
                )
            }
        )
    }

    override suspend fun getCondition(id: String): RuleCondition? {
        val response = apolloClient.query(GetConditionQuery(id)).execute()
        val data = response.data?.condition ?: return null
        
        return RuleCondition(
            id = data.id ?: "",
            name = data.name ?: "",
            description = data.description ?: "",
            modifiers = data.modifiers?.toString()
        )
    }
    
    override suspend fun getResource(id: String): RuleResource? {
        val response = apolloClient.query(GetResourceQuery(id)).execute()
        val data = response.data?.resource ?: return null
        
        return RuleResource(
            id = data.id ?: "",
            classId = data.classId ?: "",
            name = data.name ?: "",
            description = data.description,
            maxFormula = data.maxFormula ?: "1",
            rechargeOn = data.rechargeOn ?: "long",
            onUse = parseResourceEffects(data.onUse)
        )
    }

    private fun parseResourceEffects(onUse: Any?): Array<org.dndcharacter.shared.model.ResourceEffect>? {
        if (onUse !is List<*>) return null
        return onUse.mapNotNull { effect ->
            if (effect !is Map<*, *>) return@mapNotNull null
            org.dndcharacter.shared.model.ResourceEffect(
                type = effect["type"] as? String ?: "bonus",
                target = effect["target"] as? String,
                formula = effect["formula"] as? String,
                value = effect["value"] as? Boolean,
                condition = effect["condition"] as? String,
                duration = effect["duration"] as? String,
                mode = effect["mode"] as? String
            )
        }.toTypedArray().ifEmpty { null }
    }
    
    override suspend fun getRace(id: String): RaceEntry? {
        val response = apolloClient.query(GetRaceQuery(id)).execute()
        val data = response.data?.race ?: return null
        
        return RaceEntry(
            id = data.id ?: "",
            name = data.name ?: "",
            modifiers = parseModifiers(data.modifiers)
        )
    }

    override suspend fun getBackground(id: String): org.dndcharacter.shared.model.Background? {
        val response = apolloClient.query(org.dndcharacter.shared.graphql.GetBackgroundsQuery()).execute()
        val bg = response.data?.backgrounds?.find { it?.id == id } ?: return null
        
        return org.dndcharacter.shared.model.Background(
            id = bg.id ?: "",
            name = bg.name ?: "",
            description = bg.description
        )
    }

    override suspend fun getSubclasses(): List<org.dndcharacter.shared.model.Subclass> {
        val response = apolloClient.query(org.dndcharacter.shared.graphql.GetSubclassesQuery()).execute()
        return response.data?.subclasses?.filterNotNull()?.map {
            org.dndcharacter.shared.model.Subclass(
                id = it.id ?: "",
                classId = it.classId ?: "",
                name = it.name ?: "",
                description = it.description ?: "",
                spellcastingType = it.spellcastingType ?: "none"
            )
        } ?: emptyList()
    }

    override suspend fun getClass(id: String): org.dndcharacter.shared.model.RuleClass? {
        // Query all classes and find match (Validation: schema only has plural classes query)
        val response = apolloClient.query(org.dndcharacter.shared.graphql.GetClassesQuery()).execute()
        val data = response.data?.classes?.find { it?.id == id } ?: return null
        
        // Parse proficiencies JSON
        val profs = data.proficiencies
        var armor: Array<String> = emptyArray()
        var weapons: Array<String> = emptyArray()
        var tools: Array<String> = emptyArray()

        if (profs is Map<*, *>) {
            val armorList = profs["armor"] as? List<*>
            if (armorList != null) {
                armor = armorList.mapNotNull { it as? String }.toTypedArray()
            }
            val weaponList = profs["weapons"] as? List<*>
            if (weaponList != null) {
                weapons = weaponList.mapNotNull { it as? String }.toTypedArray()
            }
            val toolList = profs["tools"] as? List<*>
            if (toolList != null) {
                tools = toolList.mapNotNull { it as? String }.toTypedArray()
            }
        }

        return org.dndcharacter.shared.model.RuleClass(
            id = data.id ?: "",
            name = data.name ?: "",
            hitDie = data.hitDie ?: 8,
            savingThrows = data.savingThrows?.filterNotNull()?.toTypedArray() ?: emptyArray(),
            armorProficiencies = armor,
            weaponProficiencies = weapons,
            toolProficiencies = tools
        )
    }

    override suspend fun getClassFeatures(classId: String): List<org.dndcharacter.shared.model.RuleClassFeature> {
        val response = apolloClient.query(GetClassProgressionQuery(classId)).execute()
        val progression = response.data?.classProgression ?: return emptyList()

        return progression.filterNotNull()
            .filter { it.subclassId == null } // Only base class features
            .flatMap { p ->
                parseFeatures(p.features, p.level ?: 0, null)
            }
    }

    override suspend fun getSubclassFeatures(classId: String, subclassId: String): List<org.dndcharacter.shared.model.RuleClassFeature> {
         val response = apolloClient.query(GetClassProgressionQuery(classId)).execute()
         val progression = response.data?.classProgression ?: return emptyList()

         return progression.filterNotNull()
             .filter { it.subclassId == subclassId }
             .flatMap { p ->
                 parseFeatures(p.features, p.level ?: 0, null)
             }
    }

    override suspend fun getFeat(id: String): org.dndcharacter.shared.model.RuleFeat? {
        val response = apolloClient.query(GetFeatQuery(id)).execute()
        val data = response.data?.feat ?: return null
        
        return org.dndcharacter.shared.model.RuleFeat(
            id = data.id ?: "",
            name = data.name ?: "",
            description = data.description ?: "",
            prerequisites = data.prerequisites ?: "",
            modifiers = parseModifiers(data.modifiers)
        )
    }

    private fun parseFeatures(featuresJson: Any?, level: Int, sourceId: Int?): List<org.dndcharacter.shared.model.RuleClassFeature> {
        if (featuresJson !is List<*>) return emptyList()
        var order = 0
        return featuresJson.mapNotNull { f ->
            if (f !is Map<*, *>) return@mapNotNull null
            val name = f["name"] as? String ?: return@mapNotNull null
            val desc = f["description"] as? String ?: ""
            val id = name.lowercase().replace(" ", "_")
            order++
            org.dndcharacter.shared.model.RuleClassFeature(id, name, desc, level, order)
        }
    }

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
}
