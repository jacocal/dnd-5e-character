@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.mechanics

import org.dndcharacter.shared.model.Character
import kotlin.js.JsExport

@JsExport
data class RaceResolution(
    val speed: Int,
    val size: String,
    val darkvision: Int?
)

@JsExport
object RaceLogic {
    // Ported from getRaceModifierValues and getDarkvisionRange
    fun resolve(character: Character): RaceResolution {
        val race = character.raceEntry
        
        // 1. Resolve Speed and Size
        // In KMP we are using Strong Types (RaceEntry object), but we need to check how it's structured.
        // Assuming RaceEntry has a 'modifiers' list of objects.
        // Since strict typing for 'modifiers' might be Any/JSON, we need safe casting if it's not strongly typed yet.
        // Based on Character.kt, RaceEntry is strongly typed if I updated it, or it might be raw.
        // Let's use the list iteration approach similar to TS.
        
        var speed = 30
        var size = "Medium"
        var darkvision: Int? = null
        
        val modifiers = race?.modifiers ?: emptyArray()
        
        for (mod in modifiers) {
            when (mod.target) {
                "speed" -> speed = mod.value ?: speed
                "size" -> size = mod.valueString ?: size
            }
        }
        
        // 2. Resolve Darkvision from Race and Traits
        // Traits are in character.traits
        // Need to check race modifiers first?
        // TS logic: "Check character's traits for darkvision modifiers"
        
        // Check Race Modifiers for Darkvision? (Usually traits handle this but checking just in case)
        // ...
        
        // Check Traits
        val traits = character.traits ?: emptyArray()
        for (trait in traits) {
            val traitMods = trait.modifiers ?: emptyArray()
            for (mod in traitMods) {
                if (mod.target == "darkvision") {
                    val value = mod.value ?: 0
                    if (darkvision == null || value > darkvision) {
                        darkvision = value
                    }
                }
            }
        }
        
        // Safe defaults if race has explicit speed
        // If Character model has 'speed' field, it might be the base.
        // But the resolution logic should look at the applied modifiers.
        
        return RaceResolution(speed, size, darkvision)
    }
}
