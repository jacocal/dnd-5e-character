package org.dndcharacter.shared.data

import com.apollographql.apollo.ApolloClient
import org.dndcharacter.shared.graphql.GetActivePlayersQuery
import org.dndcharacter.shared.graphql.CreateGlobalItemMutation
import org.dndcharacter.shared.graphql.UpdateCharacterAlignmentMutation
import org.dndcharacter.shared.graphql.type.CreateItemInput
import org.dndcharacter.shared.model.*

class ApolloDmRepository(
    private val apolloClient: ApolloClient
) : DmRepository {
    override suspend fun getActivePlayers(): Array<DmPlayer> {
        val response = apolloClient.query(GetActivePlayersQuery()).execute()
        val data = response.data?.activePlayers ?: return emptyArray()
        return data.map { player ->
             DmPlayer(
                 id = player.id,
                 name = player.name,
                 alignment = player.alignment
             )
        }.toTypedArray()
    }

    override suspend fun createGlobalItem(item: DmItemData): CreateItemResult {
        // Map DmItemData to CreateItemInput
        // The CreateItemInput definition in schema.ts says: modifiers: t.field({ type: "JSON", required: false })
        // We map Array<Modifier> to a serialized JSON format or a Map depending on Apollo configuration.
        // Apollo Kotlin usually maps JSON scalar to generic Any/Map.
        
        val modifiersMap = item.modifiers?.map { it.toMap() }

        val input = CreateItemInput(
             name = item.name,
             description = com.apollographql.apollo.api.Optional.presentIfNotNull(item.description),
             type = item.type,
             category = com.apollographql.apollo.api.Optional.presentIfNotNull(item.category),
             rarity = com.apollographql.apollo.api.Optional.presentIfNotNull(item.rarity),
             
             // Structured Cost
             costAmount = com.apollographql.apollo.api.Optional.presentIfNotNull(item.costAmount),
             costCurrency = com.apollographql.apollo.api.Optional.presentIfNotNull(item.costCurrency),
             
             // Structured Weight
             weightAmount = com.apollographql.apollo.api.Optional.presentIfNotNull(item.weightAmount),
             weightUnit = com.apollographql.apollo.api.Optional.presentIfNotNull(item.weightUnit),
             fixedWeight = com.apollographql.apollo.api.Optional.presentIfNotNull(item.fixedWeight),
             
             damageDice = com.apollographql.apollo.api.Optional.presentIfNotNull(item.damageDice),
             damageType = com.apollographql.apollo.api.Optional.presentIfNotNull(item.damageType),
             armorClass = com.apollographql.apollo.api.Optional.presentIfNotNull(item.armorClass),
             strengthRequirement = com.apollographql.apollo.api.Optional.presentIfNotNull(item.strengthRequirement),
             stealthDisadvantage = com.apollographql.apollo.api.Optional.presentIfNotNull(item.stealthDisadvantage),
             properties = com.apollographql.apollo.api.Optional.presentIfNotNull(item.properties?.toList()),
             range = com.apollographql.apollo.api.Optional.presentIfNotNull(item.range),
             slot = com.apollographql.apollo.api.Optional.presentIfNotNull(item.slot),
             isMagical = com.apollographql.apollo.api.Optional.presentIfNotNull(item.isMagical),
             isCursed = com.apollographql.apollo.api.Optional.presentIfNotNull(item.isCursed),
             requiresAttunement = com.apollographql.apollo.api.Optional.presentIfNotNull(item.requiresAttunement),
             trueName = com.apollographql.apollo.api.Optional.presentIfNotNull(item.trueName),
             shownEffect = com.apollographql.apollo.api.Optional.presentIfNotNull(item.shownEffect),
             trueEffect = com.apollographql.apollo.api.Optional.presentIfNotNull(item.trueEffect),
             modifiers = com.apollographql.apollo.api.Optional.presentIfNotNull(modifiersMap),
             uses = com.apollographql.apollo.api.Optional.presentIfNotNull(item.uses),
             usesMax = com.apollographql.apollo.api.Optional.presentIfNotNull(item.usesMax),
             tags = com.apollographql.apollo.api.Optional.presentIfNotNull(item.tags?.toList())
        )

        val response = apolloClient.mutation(CreateGlobalItemMutation(input)).execute()
        val data = response.data?.createGlobalItem
        
        return CreateItemResult(
            success = data?.success ?: false,
            itemId = data?.itemId,
            error = data?.error
        )
    }

    override suspend fun updateCharacterAlignment(characterId: Int, alignment: String): Boolean {
        val response = apolloClient.mutation(UpdateCharacterAlignmentMutation(characterId, alignment)).execute()
        return response.data?.updateCharacterAlignment ?: false
    }

    private fun Modifier.toMap(): Map<String, Any?> {
         val map = mutableMapOf<String, Any?>(
             "type" to type,
             "target" to target
         )
         if (value != null) map["value"] = value
         if (valueString != null) map["valueString"] = valueString
         if (condition != null) map["condition"] = condition
         if (formula != null) map["formula"] = formula
         if (duration != null) map["duration"] = duration
         if (max != null) map["max"] = max
         return map
    }
}
