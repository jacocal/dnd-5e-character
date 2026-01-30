@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.model

import kotlinx.serialization.Serializable
import kotlin.js.JsExport
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.builtins.serializer

@Serializable
@JsExport
data class ManualProficiencies(
    val armor: Array<String> = emptyArray(),
    val weapons: Array<String> = emptyArray(),
    val tools: Array<String> = emptyArray()
) {
    // Manual equals/hashCode removed

}

@Serializable
@JsExport
data class CharacterProficiencies(
    val languages: Array<String> = emptyArray(),
    val tools: Array<String> = emptyArray(),
    @Serializable(with = SkillsMapSerializer::class)
    val skills: Map<String, String> = emptyMap(),
    val savingThrows: Map<String, Boolean> = emptyMap()
) {
    // Manual equals/hashCode removed
}

object ProficiencyStringSerializer : kotlinx.serialization.KSerializer<String> {
    override val descriptor: kotlinx.serialization.descriptors.SerialDescriptor = 
        kotlinx.serialization.descriptors.PrimitiveSerialDescriptor("ProficiencyString", kotlinx.serialization.descriptors.PrimitiveKind.STRING)

    override fun deserialize(decoder: kotlinx.serialization.encoding.Decoder): String {
        val input = decoder as? kotlinx.serialization.json.JsonDecoder 
            ?: throw kotlinx.serialization.SerializationException("Expected JsonDecoder")
        val element = input.decodeJsonElement()
        return when {
            element is kotlinx.serialization.json.JsonPrimitive && element.isString -> element.content
            element is kotlinx.serialization.json.JsonPrimitive && element.booleanOrNull == true -> "proficient"
            else -> "none"
        }
    }

    override fun serialize(encoder: kotlinx.serialization.encoding.Encoder, value: String) {
        encoder.encodeString(value)
    }
}

object SkillsMapSerializer : kotlinx.serialization.KSerializer<Map<String, String>> {
    private val serializer = kotlinx.serialization.builtins.MapSerializer(
        String.serializer(), 
        ProficiencyStringSerializer
    )
    override val descriptor = serializer.descriptor
    override fun serialize(encoder: kotlinx.serialization.encoding.Encoder, value: Map<String, String>) = serializer.serialize(encoder, value)
    override fun deserialize(decoder: kotlinx.serialization.encoding.Decoder): Map<String, String> = serializer.deserialize(decoder)
}

@Serializable
@JsExport
data class CharacterFeat(
    val id: String = "",
    val name: String,
    val description: String,
    val modifiers: Array<Modifier>? = null
)

@Serializable
@JsExport
data class CharacterTrait(
    val id: String = "",
    val name: String,
    val description: String,
    val modifiers: Array<Modifier>? = null
)

@Serializable
@JsExport
data class ResourceModifier(
    val id: String,
    val modifications: Array<Modifier> = emptyArray(),
    val duration: String? = null
)

/**
 * Effect that triggers when a resource is used (e.g., Rage grants damage resistance).
 * Matches the onUse array structure in class_resources seed data.
 */
@Serializable
@JsExport
data class ResourceEffect(
    val type: String, // "bonus", "set", "grant_hp", etc.
    val target: String? = null, // "str_damage", "resistance_bludgeoning", etc.
    val formula: String? = null, // "proficiency", "3 * level"
    val value: Boolean? = null, // For boolean set values (e.g., resistance)
    val condition: String? = null, // "raging"
    val duration: String? = null, // "manual_disable", "long_rest"
    val mode: String? = null // "bonus" for grant_hp
)

/**
 * Represents a condition that must be met for a modifier to apply.
 * Mapped from string keys in seed data for type safety.
 */
@JsExport
enum class ModifierCondition(val key: String) {
    WEARING_ARMOR("wearing_armor"),
    UNARMORED("unarmored"),
    WIELDING_SHIELD("wielding_shield"),
    RAGING("raging"),
    CONCENTRATING("concentrating"),
    NONE("none");
    
    companion object {
        fun fromKey(key: String?): ModifierCondition {
            if (key.isNullOrBlank()) return NONE
            return entries.find { it.key.equals(key, ignoreCase = true) } ?: NONE
        }
    }
}

/**
 * Determines when a temporary modifier expires.
 */
@JsExport
enum class ExpirationTrigger(val key: String) {
    SHORT_REST("short_rest"),
    LONG_REST("long_rest"),
    MANUAL_DISABLE("manual_disable"),
    NEVER("never");
    
    companion object {
        fun fromKey(key: String?): ExpirationTrigger {
            if (key.isNullOrBlank()) return NEVER
            return entries.find { it.key.equals(key, ignoreCase = true) } ?: NEVER
        }
    }
}

/**
 * Modifier priority for resolution order.
 * Priority order: bonus < set < override
 */
@JsExport
enum class ModifierPriority(val priority: Int) {
    BONUS(1),
    SET(2),
    OVERRIDE(3);
    
    companion object {
        fun fromType(type: String): ModifierPriority {
            return when (type.lowercase()) {
                "override" -> OVERRIDE
                "set" -> SET
                else -> BONUS
            }
        }
    }
}

/**
 * Core modifier definition.
 * 
 * Priority hierarchy: bonus < set < override
 * - bonus: Additive. All bonuses stack.
 * - set: "At least this much." Highest value wins.
 * - override: Final authority. Highest importance.
 */
@Serializable
@JsExport
data class Modifier(
    val type: String = "bonus", // bonus, set, override, *_proficiency, etc.
    val target: String, // "speed", "ac", "str", "darkvision", etc.
    val value: Int? = null,
    val valueString: String? = null,
    val condition: String? = null,
    // New fields for enhanced modifier system
    val formula: String? = null, // e.g., "1 * class_level:druid", "con_mod"
    val duration: String? = null, // e.g., "long_rest", "short_rest"
    val max: Int? = null // Maximum cap for ability_increase modifiers
) {
    /**
     * Returns the resolved condition enum for this modifier.
     */
    fun getCondition(): ModifierCondition = ModifierCondition.fromKey(condition)
    
    /**
     * Returns the priority level for this modifier type.
     */
    fun getPriority(): ModifierPriority = ModifierPriority.fromType(type)
    
    /**
     * Returns the expiration trigger for this modifier.
     */
    fun getExpiration(): ExpirationTrigger = ExpirationTrigger.fromKey(duration)
}

/**
 * Represents an active temporary modifier on a character.
 * Used for tracking resource on-use effects that persist until rest or manual disable.
 */
@Serializable
@JsExport
data class ActiveModifier(
    val sourceId: String,
    val sourceName: String,
    val modifier: Modifier,
    val expiresOn: String, // Stored as string for serialization, use ExpirationTrigger.fromKey() to resolve
    val activatedAt: String? = null // ISO timestamp
) {
    fun getExpiration(): ExpirationTrigger = ExpirationTrigger.fromKey(expiresOn)
}

@Serializable
@JsExport
data class RaceEntry(
    val id: String = "",
    val name: String,
    val modifiers: Array<Modifier>? = null
)

@Serializable
@JsExport
data class SpellSlotMap(
    val slots: Map<String, Int> = emptyMap()
) {
    fun get(level: Int): Int = slots[level.toString()] ?: 0
}
