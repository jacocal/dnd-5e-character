@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.dndcharacter.shared.engine.GameEngine
import org.dndcharacter.shared.engine.RollResolver
import org.dndcharacter.shared.model.*
import kotlin.js.JsExport

@JsExport
object SharedFactory {

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        isLenient = true
    }

    /**
     * Resolves a full character sheet deterministically from JSON inputs.
     */
    fun resolveSheetJson(characterJson: String, rulesCatalogJson: String): String {
        val character = json.decodeFromString<Character>(characterJson)
        val catalog = json.decodeFromString<RulesCatalog>(rulesCatalogJson)
        val resolved = GameEngine.resolve(character, catalog)
        return json.encodeToString(resolved)
    }

    /**
     * Dispatches a command deterministically against character + rules catalog and returns EngineResult JSON.
     */
    fun dispatchCommandJson(characterJson: String, rulesCatalogJson: String, commandJson: String): String {
        val character = json.decodeFromString<Character>(characterJson)
        val catalog = json.decodeFromString<RulesCatalog>(rulesCatalogJson)
        val command = json.decodeFromString<GameCommandPayload>(commandJson)
        val result = GameEngine.dispatch(character, catalog, command)
        return json.encodeToString(result)
    }

    /**
     * Executes/previews a roll (Simulated or Physical Dice Input) against a resolved sheet JSON.
     */
    fun executeRollJson(resolvedSheetJson: String, rollRequestJson: String): String {
        val sheet = json.decodeFromString<ResolvedCharacterSheet>(resolvedSheetJson)
        val request = json.decodeFromString<RollRequest>(rollRequestJson)
        val outcome = RollResolver.executeRoll(sheet, request)
        return json.encodeToString(outcome)
    }
}
