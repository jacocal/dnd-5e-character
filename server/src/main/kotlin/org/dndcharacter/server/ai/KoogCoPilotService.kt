package org.dndcharacter.server.ai

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*
import org.dndcharacter.server.db.PostgresRepository
import org.dndcharacter.shared.engine.GameEngine
import org.dndcharacter.shared.model.*
import kotlin.math.max
import kotlin.math.pow
import kotlin.math.roundToInt

@Serializable
data class LlmConnectionConfig(
    val provider: String = "ollama", // "ollama", "openai-compatible", "gemini", "openai", "anthropic", "openrouter"
    val baseUrl: String = "http://localhost:11434",
    val model: String = "qwen3.5:0.8b",
    val apiKey: String? = null
)

@Serializable
data class AgUiChatMessage(
    val role: String, // "user" | "assistant" | "system"
    val content: String
)

@Serializable
data class AgUiChatRequest(
    val characterId: Int,
    val messages: List<AgUiChatMessage>,
    val targetAc: Int? = null,
    val questId: Int? = null,
    val rawQuestNotes: String? = null,
    val llmConfig: LlmConnectionConfig = LlmConnectionConfig(),
    val requestedHelper: String? = null // optional explicit trigger: "tactical_advisor", "stat_breakdown", "spell_prep", "roll_helper", "quest_advisor", "quest_extractor"
)

@Serializable
data class DiscoveredModelsResponse(
    val provider: String,
    val baseUrl: String,
    val reachable: Boolean,
    val models: List<String>,
    val error: String? = null
)

// ==================== A2UI Declarative Helper Component Payloads ====================

@Serializable
data class A2UiSurfacePayload(
    val surfaceId: String,
    val componentType: String, // "TacticalActionAdvisorCard" | "RollHelperCard" | "StatBreakdownCard" | "SpellPrepAdvisorCard"
    val title: String,
    val subtitle: String? = null,
    val data: JsonObject
)

@Serializable
data class TacticalOptionItem(
    val id: String,
    val rank: Int,
    val name: String,
    val actionCost: String,
    val category: String,
    val expectedDamage: Double,
    val hitOrSuccessChancePct: Int,
    val summary: String,
    val recommendedRiders: List<String> = emptyList(),
    val rollRequest: RollRequest
)

class KoogCoPilotService(private val repo: PostgresRepository) {

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    private val httpClient = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(this@KoogCoPilotService.json)
        }
        install(HttpTimeout) {
            requestTimeoutMillis = 45_000
            connectTimeoutMillis = 5_000
            socketTimeoutMillis = 45_000
        }
    }

    suspend fun discoverModels(provider: String, baseUrl: String, apiKey: String?): DiscoveredModelsResponse {
        val cleanUrl = baseUrl.trimEnd('/')
        return try {
            when (provider.lowercase()) {
                "ollama" -> {
                    val response = httpClient.get("$cleanUrl/api/tags")
                    if (!response.status.isSuccess()) {
                        return DiscoveredModelsResponse(provider, cleanUrl, false, emptyList(), "HTTP ${response.status.value}")
                    }
                    val body = json.parseToJsonElement(response.bodyAsText()).jsonObject
                    val models = body["models"]?.jsonArray?.mapNotNull {
                        it.jsonObject["name"]?.jsonPrimitive?.contentOrNull
                    } ?: emptyList()
                    DiscoveredModelsResponse(provider, cleanUrl, true, models)
                }
                "openai-compatible", "lmstudio", "vllm", "llamacpp" -> {
                    val modelsEndpoint = if (cleanUrl.endsWith("/v1")) "$cleanUrl/models" else "$cleanUrl/v1/models"
                    val response = httpClient.get(modelsEndpoint) {
                        if (!apiKey.isNullOrBlank()) {
                            header(HttpHeaders.Authorization, "Bearer $apiKey")
                        }
                    }
                    if (!response.status.isSuccess()) {
                        return DiscoveredModelsResponse(provider, cleanUrl, false, emptyList(), "HTTP ${response.status.value}")
                    }
                    val body = json.parseToJsonElement(response.bodyAsText()).jsonObject
                    val models = body["data"]?.jsonArray?.mapNotNull {
                        it.jsonObject["id"]?.jsonPrimitive?.contentOrNull
                    } ?: emptyList()
                    DiscoveredModelsResponse(provider, cleanUrl, true, models)
                }
                "gemini" -> DiscoveredModelsResponse(
                    provider = "gemini",
                    baseUrl = "https://generativelanguage.googleapis.com",
                    reachable = true,
                    models = listOf("gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash")
                )
                "openai" -> DiscoveredModelsResponse(
                    provider = "openai",
                    baseUrl = "https://api.openai.com/v1",
                    reachable = true,
                    models = listOf("gpt-4o", "gpt-4o-mini", "o3-mini")
                )
                "anthropic" -> DiscoveredModelsResponse(
                    provider = "anthropic",
                    baseUrl = "https://api.anthropic.com/v1",
                    reachable = true,
                    models = listOf("claude-3-7-sonnet-latest", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest")
                )
                "openrouter" -> DiscoveredModelsResponse(
                    provider = "openrouter",
                    baseUrl = "https://openrouter.ai/api/v1",
                    reachable = true,
                    models = listOf("anthropic/claude-3.7-sonnet", "google/gemini-2.5-pro", "openai/gpt-4o", "meta-llama/llama-3.3-70b-instruct")
                )
                else -> DiscoveredModelsResponse(provider, cleanUrl, false, emptyList(), "Unknown provider: $provider")
            }
        } catch (e: Exception) {
            DiscoveredModelsResponse(
                provider = provider,
                baseUrl = cleanUrl,
                reachable = false,
                models = emptyList(),
                error = e.message ?: "Connection failed"
            )
        }
    }

    /**
     * Builds a deterministic Tactical Action Advisor A2UI surface from the character's live ResolvedCharacterSheet.
     */
    fun buildTacticalAdvisorSurface(sheet: ResolvedCharacterSheet, targetAc: Int = 15): A2UiSurfacePayload {
        val options = mutableListOf<TacticalOptionItem>()
        val extraAttacks = max(1, sheet.combatStats.extraAttacks)

        // 1. Evaluate Weapon & Unarmed Actions with eligible riders
        sheet.actions.filter { it.actionCategory == "weapon" || it.actionCategory == "unarmed" }.forEach { atk ->
            val eligibleRiders = atk.eligibleRiders.filter { rider ->
                (rider.consumesSlotLevel == null && rider.consumesResourceId == null) ||
                    rider.id in listOf("sneak-attack", "sneak_attack", "rage-damage", "rage_damage", "hex", "hunters-mark", "hunters_mark", "blessed-strikes", "improved-divine-smite")
            }
            val toHit = atk.toHitBonus ?: 0
            val hitChance = (((21 - (targetAc - toHit)).coerceIn(2, 19)) / 20.0)
            val baseDice = atk.baseDamageDice ?: "1"
            val baseAvg = parseAverageDice(baseDice) + atk.damageBonus
            val riderAvg = eligibleRiders.sumOf { r ->
                val dAvg = parseAverageDice(r.dice ?: "")
                val fAvg = when (r.diceFormula) {
                    "sneak_attack_d6" -> ((sheet.character.level + 1) / 2) * 3.5
                    "martial_arts_die", "bardic_die" -> 4.5
                    else -> 0.0
                }
                val flatAvg = when (r.formula) {
                    "rage_damage" -> if (sheet.character.level >= 16) 4.0 else if (sheet.character.level >= 9) 3.0 else 2.0
                    "proficiency" -> sheet.combatStats.proficiencyBonus.toDouble()
                    else -> 0.0
                }
                dAvg + fAvg + flatAvg
            }
            val totalDpr = (extraAttacks * hitChance * baseAvg) + ((1.0 - (1.0 - hitChance).pow(extraAttacks.toDouble())) * riderAvg)

            options.add(
                TacticalOptionItem(
                    id = "opt-${atk.id}",
                    rank = 0,
                    name = if (extraAttacks > 1 && atk.actionCategory == "weapon") "${atk.name} (${extraAttacks}x Extra Attack)" else atk.name,
                    actionCost = atk.castingTime,
                    category = "Weapon Attack",
                    expectedDamage = (totalDpr * 10.0).roundToInt() / 10.0,
                    hitOrSuccessChancePct = (hitChance * 100).roundToInt(),
                    summary = "${if (toHit >= 0) "+$toHit" else "$toHit"} to hit ($baseDice${if (atk.damageBonus >= 0) "+${atk.damageBonus}" else "${atk.damageBonus}"} ${atk.damageType ?: "physical"})" +
                        if (eligibleRiders.isNotEmpty()) " + ${eligibleRiders.joinToString(", ") { it.name }}" else "",
                    recommendedRiders = eligibleRiders.map { it.name },
                    rollRequest = RollRequest(
                        rollType = "weapon_attack",
                        targetId = atk.id,
                        selectedRiderIds = eligibleRiders.map { it.id }.toTypedArray(),
                        targetAcOrDc = targetAc
                    )
                )
            )
        }

        // 2. Evaluate Cantrips & Prepared/Known Spells
        sheet.actions.filter { it.actionCategory == "cantrip" || it.actionCategory == "spell" }.forEach { spellAtk ->
            val spellLevel = spellAtk.spellLevel ?: 0
            val slotAvailable = spellLevel == 0 || (
                (sheet.spellSlots.slots.getOrElse(spellLevel) { 0 }) > (sheet.character.usedSpellSlots?.get(spellLevel) ?: 0)
            )
            if (slotAvailable) {
                val toHit = spellAtk.toHitBonus ?: 0
                val successChance = if (spellAtk.saveAbility != null && spellAtk.saveDC != null) {
                    (((spellAtk.saveDC!! - 3).coerceIn(2, 19)) / 20.0)
                } else {
                    (((21 - (targetAc - toHit)).coerceIn(2, 19)) / 20.0)
                }
                val dmgDice = spellAtk.baseDamageDice ?: spellAtk.healingDice ?: "0"
                val baseAvg = parseAverageDice(dmgDice) + spellAtk.damageBonus + spellAtk.healingBonus
                val expected = if (spellAtk.saveAbility != null) {
                    val halfOnSave = if (spellAtk.saveHalfDamage) 0.5 else 0.0
                    (successChance * baseAvg) + ((1.0 - successChance) * baseAvg * halfOnSave)
                } else {
                    successChance * baseAvg
                }

                options.add(
                    TacticalOptionItem(
                        id = "opt-${spellAtk.id}",
                        rank = 0,
                        name = spellAtk.name,
                        actionCost = if (spellLevel == 0) "Action (Cantrip)" else "Action (Lv $spellLevel Slot)",
                        category = if (spellLevel == 0) "Cantrip" else "Leveled Spell",
                        expectedDamage = (expected * 10.0).roundToInt() / 10.0,
                        hitOrSuccessChancePct = (successChance * 100).roundToInt(),
                        summary = if (spellAtk.saveAbility != null) {
                            "DC ${spellAtk.saveDC} ${spellAtk.saveAbility} Save ($dmgDice ${spellAtk.damageType ?: "effect"})"
                        } else {
                            "+$toHit Spell Attack ($dmgDice ${spellAtk.damageType ?: "damage"})"
                        },
                        recommendedRiders = emptyList(),
                        rollRequest = RollRequest(
                            rollType = "spell",
                            targetId = spellAtk.id,
                            slotLevel = spellLevel.takeIf { it > 0 },
                            targetAcOrDc = if (spellAtk.saveAbility != null) spellAtk.saveDC else targetAc
                        )
                    )
                )
            }
        }

        val ranked = options
            .sortedByDescending { it.expectedDamage }
            .take(5)
            .mapIndexed { idx, item -> item.copy(rank = idx + 1) }

        val hpRatio = if (sheet.character.hpMax > 0) (sheet.character.hpCurrent * 100) / sheet.character.hpMax else 100
        val tacticalAlert = when {
            hpRatio <= 35 -> "Warning: HP is critically low ($hpRatio%). Prioritize healing, defensive bonus actions, or disengage."
            sheet.concentrationSpellName != null -> "Active Concentration on '${sheet.concentrationSpellName}'. Avoid casting another Concentration spell unless switching."
            else -> "Evaluated ${options.size} available actions against Target AC $targetAc."
        }

        val dataObj = buildJsonObject {
            put("characterName", sheet.character.name)
            put("targetAc", targetAc)
            put("hpPercent", hpRatio)
            put("tacticalAlert", tacticalAlert)
            put("extraAttacks", extraAttacks)
            put("options", json.encodeToJsonElement(ranked))
        }

        return A2UiSurfacePayload(
            surfaceId = "tactical-advisor-${sheet.character.id}",
            componentType = "TacticalActionAdvisorCard",
            title = "Tactical Turn Advisor (vs AC $targetAc)",
            subtitle = tacticalAlert,
            data = dataObj
        )
    }

    /**
     * Builds an A2UI StatBreakdownCard explaining how the character's key stats are derived.
     */
    fun buildStatBreakdownSurface(sheet: ResolvedCharacterSheet): A2UiSurfacePayload {
        val acSources = buildJsonArray {
            add(buildJsonObject {
                put("label", sheet.combatStats.armorClassSource.ifBlank { "Armor Class Formula" })
                put("value", sheet.combatStats.armorClassBreakdown.ifBlank { "${sheet.combatStats.armorClass}" })
            })
        }

        val primarySpellStat = sheet.spellcastingStats.firstOrNull()

        val dataObj = buildJsonObject {
            put("armorClass", sheet.combatStats.armorClass)
            put("acSources", acSources)
            put("initiativeBonus", sheet.combatStats.initiative)
            put("proficiencyBonus", sheet.combatStats.proficiencyBonus)
            put("spellSaveDc", primarySpellStat?.saveDC ?: 0)
            put("spellAttackBonus", primarySpellStat?.attackBonus ?: 0)
            put("spellcastingAbility", primarySpellStat?.ability)
            put("maxHp", sheet.character.hpMax)
            put("currentHp", sheet.character.hpCurrent)
            put("tempHp", sheet.character.tempHp)
            put("speed", sheet.combatStats.speed)
        }

        return A2UiSurfacePayload(
            surfaceId = "stat-breakdown-${sheet.character.id}",
            componentType = "StatBreakdownCard",
            title = "Combat & Stat Derivation Breakdown",
            subtitle = "Live deterministic calculation from equipped gear, abilities, and class rules",
            data = dataObj
        )
    }

    /**
     * Builds an A2UI SpellPrepAdvisorCard helping the player manage Always-Prepared and Prepared spells.
     */
    fun buildSpellPrepAdvisorSurface(sheet: ResolvedCharacterSheet): A2UiSurfacePayload {
        val alwaysPrepared = sheet.knownSpells.filter { it.alwaysPrepared }
        val userPrepared = sheet.knownSpells.filter { it.prepared && !it.alwaysPrepared && it.spell.level > 0 }

        val recommendedToLearnOrPrepare = sheet.availableClassSpells
            .filter { it.level > 0 }
            .filter { candidate -> sheet.knownSpells.none { cs -> cs.spell.id == candidate.id && (cs.prepared || cs.alwaysPrepared) } }
            .take(6)
            .map { sp ->
                buildJsonObject {
                    put("id", sp.id)
                    put("name", sp.name)
                    put("level", sp.level)
                    put("school", sp.school)
                    put("concentration", sp.isConcentration)
                    put("actionType", sp.castingTime)
                    val firstDmg = sp.mechanics?.damage?.firstOrNull()
                    put("damageSummary", if (firstDmg != null) "${firstDmg.dice} ${firstDmg.type}" else "Utility / Control")
                }
            }

        val dataObj = buildJsonObject {
            put("spellPrepMode", sheet.spellPrepMode)
            put("preparedCount", userPrepared.size)
            put("maxPreparedSpells", sheet.maxPreparedSpells)
            put("alwaysPreparedSpells", buildJsonArray {
                alwaysPrepared.forEach { cs ->
                    add(buildJsonObject {
                        put("id", cs.spell.id)
                        put("name", cs.spell.name)
                        put("level", cs.spell.level)
                        put("source", cs.source)
                    })
                }
            })
            put("recommendedSpells", JsonArray(recommendedToLearnOrPrepare))
        }

        return A2UiSurfacePayload(
            surfaceId = "spell-prep-${sheet.character.id}",
            componentType = "SpellPrepAdvisorCard",
            title = "Spell Preparation & Grimoire Advisor",
            subtitle = "Mode: ${sheet.spellPrepMode} • Prepared: ${userPrepared.size} / ${sheet.maxPreparedSpells} (+${alwaysPrepared.size} Always Prepared)",
            data = dataObj
        )
    }

    /**
     * Builds an A2UI RollHelperCard when the user asks about a specific check, save, or attack.
     */
    fun buildRollHelperSurface(sheet: ResolvedCharacterSheet, userQuery: String, targetAc: Int): A2UiSurfacePayload? {
        val q = userQuery.lowercase()
        val matchedSkill = sheet.skills.firstOrNull { q.contains(it.name.lowercase()) }
        if (matchedSkill != null) {
            val req = RollRequest(
                rollType = "skill",
                targetId = matchedSkill.key
            )
            return A2UiSurfacePayload(
                surfaceId = "roll-helper-skill-${matchedSkill.key}",
                componentType = "RollHelperCard",
                title = "${matchedSkill.name} Check Helper",
                subtitle = "Modifier: ${if (matchedSkill.total >= 0) "+${matchedSkill.total}" else "${matchedSkill.total}"}",
                data = buildJsonObject {
                    put("label", "${matchedSkill.name} Check")
                    put("modifier", matchedSkill.total)
                    put("rollRequest", json.encodeToJsonElement(req))
                }
            )
        }

        val matchedAttack = sheet.actions.firstOrNull { q.contains(it.name.lowercase()) }
        if (matchedAttack != null) {
            val req = RollRequest(
                rollType = if (matchedAttack.actionCategory in listOf("spell", "cantrip")) "spell" else "weapon_attack",
                targetId = matchedAttack.id,
                selectedRiderIds = matchedAttack.eligibleRiders
                    .filter { it.consumesSlotLevel == null && it.consumesResourceId == null }
                    .map { it.id }
                    .toTypedArray(),
                targetAcOrDc = targetAc
            )
            val toHit = matchedAttack.toHitBonus ?: 0
            return A2UiSurfacePayload(
                surfaceId = "roll-helper-atk-${matchedAttack.id}",
                componentType = "RollHelperCard",
                title = "${matchedAttack.name} Roll Helper",
                subtitle = "${if (toHit >= 0) "+$toHit" else "$toHit"} to hit • ${matchedAttack.baseDamageDice ?: ""} ${matchedAttack.damageType ?: ""}",
                data = buildJsonObject {
                    put("label", matchedAttack.name)
                    put("modifier", toHit)
                    put("damageDice", matchedAttack.baseDamageDice ?: "")
                    put("rollRequest", json.encodeToJsonElement(req))
                }
            )
        }

        return null
    }

    /**
     * Builds an A2UI QuestTacticalAdvisorCard analyzing active/selected quests (or raw DM session notes)
     * against the character's resolved skills, passive senses, prepared/available spells, and class features.
     */
    fun buildQuestTacticalAdvisorSurface(
        sheet: ResolvedCharacterSheet,
        questId: Int? = null,
        rawNotes: String? = null,
        userQuery: String = ""
    ): A2UiSurfacePayload {
        val allQuests = (sheet.character.quests ?: emptyArray()).toList()
        val targetQuest = questId?.let { id -> allQuests.find { it.id == id } }
            ?: allQuests.firstOrNull { userQuery.contains(it.title, ignoreCase = true) }
            ?: allQuests.firstOrNull { it.status == "active" && it.isTracked }
            ?: allQuests.firstOrNull { it.status == "active" }
            ?: allQuests.firstOrNull()

        val combinedText = buildString {
            if (targetQuest != null) {
                appendLine(targetQuest.title)
                appendLine(targetQuest.description ?: "")
                appendLine(targetQuest.location ?: "")
                appendLine(targetQuest.giver ?: "")
                targetQuest.objectives.filter { !it.isCompleted }.forEach { appendLine(it.description) }
            }
            if (!rawNotes.isNullOrBlank()) appendLine(rawNotes)
            appendLine(userQuery)
        }.lowercase()

        // 1. Match Quest/Objective context to Character's Resolved Skills (with explicit DC extraction if present)
        val skillKeywords = mapOf(
            "arcana" to listOf("arcana", "ward", "rune", "magic", "spell", "sigil", "portal", "relic", "artifact", "ritual"),
            "investigation" to listOf("investigat", "clue", "search", "inspect", "decipher", "examine", "mechanism", "trap", "hidden"),
            "perception" to listOf("percept", "spot", "listen", "ambush", "watch", "sentry", "guard", "patrol", "scout", "look"),
            "insight" to listOf("insight", "question", "interrogat", "motive", "lie", "truth", "sentry", "suspect", "npc"),
            "persuasion" to listOf("persua", "negotiate", "convince", "diploma", "council", "lord", "cleric", "ally", "parley"),
            "intimidation" to listOf("intimidat", "threat", "coerce", "demand", "surrender", "cult"),
            "deception" to listOf("deceiv", "deception", "disguise", "bluff", "infiltrat", "impersonat"),
            "stealth" to listOf("stealth", "sneak", "infiltrat", "shadow", "hide", "unseen", "quiet"),
            "religion" to listOf("relig", "temple", "citadel", "sanctum", "cult", "undead", "crypt", "relic", "shrine", "god", "divine"),
            "history" to listOf("histor", "ancient", "ruin", "dynasty", "lore", "king", "citadel", "tomb"),
            "survival" to listOf("surviv", "track", "trail", "wilderness", "forest", "camp", "hunt", "navigate"),
            "nature" to listOf("natur", "beast", "plant", "venom", "druid", "fey", "elemental"),
            "athletics" to listOf("athlet", "climb", "swim", "jump", "break", "force", "barricade", "grapple", "gate"),
            "acrobatics" to listOf("acrobat", "balance", "ledge", "escape", "dodge"),
            "sleight_of_hand" to listOf("sleight", "lock", "pickpocket", "disarm", "steal"),
            "medicine" to listOf("medicin", "wounded", "heal", "stabilize", "plague", "poison", "autopsy")
        )

        val matchedSkills = sheet.skills
            .map { sk ->
                val kws = skillKeywords[sk.key] ?: listOf(sk.key)
                val keywordHits = kws.count { combinedText.contains(it) }
                val score = (keywordHits * 10) + sk.total + (if (sk.isProficient) 3 else 0) + (if (sk.isExpertise) 3 else 0)
                Triple(sk, keywordHits, score)
            }
            .sortedByDescending { it.third }
            .take(4)
            .map { (sk, hits, _) ->
                val dcRegex = Regex("""${sk.name}\s*(?:dc\s*)?(\d+)""", RegexOption.IGNORE_CASE)
                val explicitDc = dcRegex.find(combinedText)?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 14
                val reason = when {
                    hits > 0 && sk.isExpertise -> "Expertise + directly matches quest objective keywords"
                    hits > 0 && sk.isProficient -> "Proficient + matches active quest objectives"
                    hits > 0 -> "Matches active quest objective keywords"
                    sk.isExpertise -> "Highest character Expertise skill (+${sk.total}, Passive ${sk.passive})"
                    sk.isProficient -> "Strong proficient character skill (+${sk.total}, Passive ${sk.passive})"
                    else -> "Available check (+${sk.total}, Passive ${sk.passive})"
                }
                buildJsonObject {
                    put("key", sk.key)
                    put("name", sk.name)
                    put("ability", sk.ability.uppercase())
                    put("modifier", sk.total)
                    put("passive", sk.passive)
                    put("isProficient", sk.isProficient)
                    put("isExpertise", sk.isExpertise)
                    put("suggestedDc", explicitDc)
                    put("reason", reason)
                    put(
                        "rollRequest",
                        json.encodeToJsonElement(
                            RollRequest(
                                rollType = "skill",
                                targetId = sk.key,
                                targetAcOrDc = explicitDc
                            )
                        )
                    )
                }
            }

        // 2. Match Quest Themes to Character's Known / Available Spells & Class Features
        val recommendedTools = buildJsonArray {
            // Class features relevant to exploration / quests
            sheet.classFeatures.take(6).forEach { feat ->
                val fName = feat.name.lowercase()
                val fDesc = feat.description.lowercase()
                val isRelevant = fName.contains("divine sense") || fName.contains("lay on hands") ||
                    fName.contains("wild shape") || fName.contains("channel divinity") ||
                    fName.contains("cunning action") || fName.contains("expertise") ||
                    fName.contains("bardic inspiration") || fName.contains("arcane recovery") ||
                    fName.contains("aura") || fDesc.contains("advantage")
                if (isRelevant) {
                    add(buildJsonObject {
                        put("id", feat.id)
                        put("name", feat.name)
                        put("type", "Class Feature")
                        put("prepared", true)
                        put("summary", feat.description.take(120) + if (feat.description.length > 120) "..." else "")
                    })
                }
            }

            // Spells (both currently known/prepared and available class utility/ritual spells)
            val utilityCandidates = (sheet.knownSpells.map { it.spell to (it.prepared || it.alwaysPrepared) } +
                sheet.availableClassSpells
                    .filter { sp -> sheet.knownSpells.none { k -> k.spell.id == sp.id } }
                    .filter { sp -> sp.isRitual || sp.level <= 2 }
                    .take(10)
                    .map { it to false })
                .distinctBy { it.first.id }
                .take(5)

            utilityCandidates.forEach { (sp, isPrep) ->
                add(buildJsonObject {
                    put("id", sp.id)
                    put("name", sp.name)
                    put("type", if (sp.isRitual) "Lvl ${sp.level} Ritual Spell" else if (sp.level == 0) "Cantrip" else "Lvl ${sp.level} Spell")
                    put("prepared", isPrep)
                    put("spellId", sp.id)
                    put("summary", "${sp.castingTime} • ${sp.range} — ${sp.description.take(105)}...")
                })
            }
        }

        // 3. Generate Suggested Tactical Sub-Objectives (or Extract Quest from Raw Session Notes)
        val topSkill1 = sheet.skills.maxByOrNull { it.total }
        val topSkill2 = sheet.skills.sortedByDescending { it.total }.getOrNull(1) ?: topSkill1
        val existingObjSet = (targetQuest?.objectives?.map { it.description.lowercase() } ?: emptyList()).toSet()

        val suggestedObjectives = buildJsonArray {
            if (!rawNotes.isNullOrBlank()) {
                val lines = rawNotes.lines()
                    .map { it.trim().removePrefix("-").removePrefix("*").removePrefix("•").trim() }
                    .filter { it.length >= 6 }
                if (lines.size >= 2) {
                    lines.take(4).forEach { line ->
                        val hasBracket = line.contains("[") && line.contains("]")
                        val enriched = if (hasBracket) line else "$line [${topSkill1?.name ?: "Perception"} DC 14]"
                        add(enriched)
                    }
                }
            }
            val candidates = listOf(
                "Scout the ${targetQuest?.location ?: "objective perimeter"} for hazards & ambush points [${topSkill1?.name ?: "Perception"} DC 14]",
                "Gather tactical intel from ${targetQuest?.giver ?: "local witnesses"} [${topSkill2?.name ?: "Insight"} DC 13]",
                "Secure a defensible position & verify magical wards before engaging [Arcana DC 14]",
                "Recover proof of completion for ${targetQuest?.giver ?: "the quest giver"} to claim full rewards"
            )
            candidates.filter { cand -> existingObjSet.none { ex -> ex.contains(cand.take(20).lowercase()) } }
                .take(3)
                .forEach { add(it) }
        }

        val extractedQuestObj = if (!rawNotes.isNullOrBlank() || userQuery.contains("extract", ignoreCase = true) || userQuery.contains("create quest", ignoreCase = true)) {
            val cleanNotes = (rawNotes?.takeIf { it.isNotBlank() } ?: userQuery).trim()
            val firstLine = cleanNotes.lines().firstOrNull()?.trim()?.removePrefix("#")?.trim() ?: "New Campaign Quest"
            val autoTitle = if (firstLine.length in 4..65) firstLine else "Investigate: ${firstLine.take(42)}..."
            val lowerN = cleanNotes.lowercase()
            val autoCat = when {
                lowerN.contains("bounty") || lowerN.contains("hunt") || lowerN.contains("contract") -> "bounty"
                lowerN.contains("faction") || lowerN.contains("guild") || lowerN.contains("order") -> "faction"
                lowerN.contains("personal") || lowerN.contains("backstory") || lowerN.contains("oath") -> "personal"
                lowerN.contains("side") || lowerN.contains("rumor") -> "side"
                else -> "main"
            }
            val xpMatch = Regex("""(\d+)\s*xp""", RegexOption.IGNORE_CASE).find(cleanNotes)?.groupValues?.getOrNull(1)?.toIntOrNull() ?: (sheet.character.level * 150)
            val gpMatch = Regex("""(\d+)\s*(?:gp|gold)""", RegexOption.IGNORE_CASE).find(cleanNotes)?.groupValues?.getOrNull(1)?.toIntOrNull() ?: (sheet.character.level * 50)
            buildJsonObject {
                put("title", autoTitle)
                put("description", cleanNotes)
                put("category", autoCat)
                put("giver", targetQuest?.giver ?: "Campaign Contact")
                put("location", targetQuest?.location ?: "Uncharted Sector")
                put("rewardXp", xpMatch)
                put("rewardGp", gpMatch)
                put("objectives", suggestedObjectives)
            }
        } else null

        val uncompletedCount = targetQuest?.objectives?.count { !it.isCompleted } ?: 0
        val totalObjCount = targetQuest?.objectives?.size ?: 0
        val dataObj = buildJsonObject {
            put("questId", targetQuest?.id ?: 0)
            put("questTitle", targetQuest?.title ?: "Campaign Quest & Exploration Advisor")
            put("questCategory", targetQuest?.category ?: "main")
            put("questStatus", targetQuest?.status ?: "active")
            put("questGiver", targetQuest?.giver)
            put("questLocation", targetQuest?.location)
            put("rewardXp", targetQuest?.rewardXp ?: 0)
            put("rewardGp", targetQuest?.rewardGp ?: 0)
            put("rewardNotes", targetQuest?.rewardNotes)
            put("uncompletedObjectivesCount", uncompletedCount)
            put("totalObjectivesCount", totalObjCount)
            put("recommendedSkills", JsonArray(matchedSkills))
            put("recommendedTools", recommendedTools)
            put("suggestedObjectives", suggestedObjectives)
            put(
                "suggestedChronicleEntry",
                "[Tactical Brief] Evaluated '${targetQuest?.title ?: "Active Mission"}': Lead with ${topSkill1?.name ?: "Perception"} (+${topSkill1?.total ?: 0}, Passive ${topSkill1?.passive ?: 10}) and ${topSkill2?.name ?: "Insight"} (+${topSkill2?.total ?: 0}) while keeping ${sheet.combatStats.armorClass} AC ready."
            )
            if (extractedQuestObj != null) {
                put("extractedQuest", extractedQuestObj)
            }
        }

        return A2UiSurfacePayload(
            surfaceId = "quest-advisor-${targetQuest?.id ?: sheet.character.id}-${System.currentTimeMillis() % 10000}",
            componentType = "QuestTacticalAdvisorCard",
            title = if (targetQuest != null) "Quest Strategy: ${targetQuest.title}" else "Campaign Quest & Note Advisor",
            subtitle = if (targetQuest != null) {
                listOfNotNull(
                    targetQuest.category.uppercase(),
                    targetQuest.giver?.let { "Giver: $it" },
                    targetQuest.location,
                    "${totalObjCount - uncompletedCount}/$totalObjCount Objectives"
                ).joinToString(" • ")
            } else {
                "AI Objective Breakdown, Skill Check Mapping & Utility Loadout"
            },
            data = dataObj
        )
    }

    /**
     * Generates the tactical co-pilot response and A2UI helper surfaces, streaming AG-UI events via callback.
     */
    suspend fun streamCoPilotTurn(
        request: AgUiChatRequest,
        emitEvent: suspend (eventType: String, payloadJson: String) -> Unit
    ) {
        val runId = "run-${System.currentTimeMillis()}"
        val msgId = "msg-${System.currentTimeMillis()}"
        emitEvent("RUN_STARTED", buildJsonObject {
            put("type", "RUN_STARTED")
            put("runId", runId)
            put("characterId", request.characterId)
        }.toString())

        val catalog = repo.getRulesCatalog()
        val rawChar = repo.getCharacter(request.characterId)
        if (rawChar == null) {
            emitEvent("RUN_ERROR", buildJsonObject {
                put("type", "RUN_ERROR")
                put("message", "Character #${request.characterId} not found")
            }.toString())
            return
        }

        val sheet = GameEngine.resolve(rawChar, catalog)
        val targetAc = request.targetAc ?: 15
        val primaryClass = sheet.character.classes?.firstOrNull()

        // 1. Emit AG-UI STATE_SNAPSHOT so the client and Co-Pilot share exact character state
        val activeQuestsList = (sheet.character.quests ?: emptyArray()).filter { it.status == "active" }
        emitEvent("STATE_SNAPSHOT", buildJsonObject {
            put("type", "STATE_SNAPSHOT")
            put("characterId", sheet.character.id)
            put("characterName", sheet.character.name)
            put("level", sheet.character.level)
            put("className", primaryClass?.className ?: primaryClass?.classId ?: "Adventurer")
            put("subclassName", primaryClass?.subclassName)
            put("hp", "${sheet.character.hpCurrent}/${sheet.character.hpMax}")
            put("ac", sheet.combatStats.armorClass)
            put("activeConcentration", sheet.concentrationSpellName)
            put("activeQuestsCount", activeQuestsList.size)
            put("trackedQuestTitles", buildJsonArray {
                activeQuestsList.filter { it.isTracked }.forEach { add(it.title) }
            })
        }.toString())

        val lastUserMessage = request.messages.lastOrNull { it.role == "user" }?.content ?: "What is my best tactical action right now?"
        val lowerQuery = lastUserMessage.lowercase()

        // 2. Determine which A2UI Helper Cards to generate and emit tool call events
        val surfacesToEmit = mutableListOf<A2UiSurfacePayload>()

        val wantQuests = request.requestedHelper in listOf("quest_advisor", "quest_extractor") ||
            request.questId != null ||
            !request.rawQuestNotes.isNullOrBlank() ||
            lowerQuery.contains("quest") || lowerQuery.contains("objective") || lowerQuery.contains("mission") ||
            lowerQuery.contains("journal") || lowerQuery.contains("clue") || lowerQuery.contains("investigat") ||
            lowerQuery.contains("extract") || lowerQuery.contains("note") ||
            activeQuestsList.any { lowerQuery.contains(it.title.lowercase()) }

        val wantTactical = request.requestedHelper == "tactical_advisor" ||
            lowerQuery.contains("best") || lowerQuery.contains("action") || lowerQuery.contains("turn") ||
            lowerQuery.contains("attack") || lowerQuery.contains("damage") || lowerQuery.contains("combat") ||
            lowerQuery.contains("recommend") || lowerQuery.contains("tactic")

        val wantStats = request.requestedHelper == "stat_breakdown" ||
            lowerQuery.contains("ac") || lowerQuery.contains("armor") || lowerQuery.contains("stat") ||
            lowerQuery.contains("dc") || lowerQuery.contains("initiative") || lowerQuery.contains("breakdown")

        val wantSpells = request.requestedHelper == "spell_prep" ||
            lowerQuery.contains("spell") || lowerQuery.contains("prepare") || lowerQuery.contains("cantrip") ||
            lowerQuery.contains("slot") || lowerQuery.contains("concentrat")

        if (wantQuests) {
            val toolName = if (!request.rawQuestNotes.isNullOrBlank() || request.requestedHelper == "quest_extractor") {
                "extractQuestObjectivesFromNotes"
            } else {
                "analyzeQuestStrategy"
            }
            emitEvent("TOOL_CALL_START", buildJsonObject {
                put("type", "TOOL_CALL_START")
                put("toolCallId", "tc-quest")
                put("toolCallName", toolName)
            }.toString())
            surfacesToEmit.add(
                buildQuestTacticalAdvisorSurface(
                    sheet = sheet,
                    questId = request.questId,
                    rawNotes = request.rawQuestNotes,
                    userQuery = lastUserMessage
                )
            )
            emitEvent("TOOL_CALL_END", buildJsonObject {
                put("type", "TOOL_CALL_END")
                put("toolCallId", "tc-quest")
                put("toolCallName", toolName)
            }.toString())
        }

        if (wantTactical) {
            emitEvent("TOOL_CALL_START", buildJsonObject {
                put("type", "TOOL_CALL_START")
                put("toolCallId", "tc-tactical")
                put("toolCallName", "simulateTacticalAction")
            }.toString())
            surfacesToEmit.add(buildTacticalAdvisorSurface(sheet, targetAc))
            emitEvent("TOOL_CALL_END", buildJsonObject {
                put("type", "TOOL_CALL_END")
                put("toolCallId", "tc-tactical")
                put("toolCallName", "simulateTacticalAction")
            }.toString())
        }

        if (wantStats) {
            emitEvent("TOOL_CALL_START", buildJsonObject {
                put("type", "TOOL_CALL_START")
                put("toolCallId", "tc-stats")
                put("toolCallName", "inspectStatDerivation")
            }.toString())
            surfacesToEmit.add(buildStatBreakdownSurface(sheet))
            emitEvent("TOOL_CALL_END", buildJsonObject {
                put("type", "TOOL_CALL_END")
                put("toolCallId", "tc-stats")
                put("toolCallName", "inspectStatDerivation")
            }.toString())
        }

        if (wantSpells && sheet.spellPrepMode != "none") {
            emitEvent("TOOL_CALL_START", buildJsonObject {
                put("type", "TOOL_CALL_START")
                put("toolCallId", "tc-spells")
                put("toolCallName", "analyzeSpellPreparation")
            }.toString())
            surfacesToEmit.add(buildSpellPrepAdvisorSurface(sheet))
            emitEvent("TOOL_CALL_END", buildJsonObject {
                put("type", "TOOL_CALL_END")
                put("toolCallId", "tc-spells")
                put("toolCallName", "analyzeSpellPreparation")
            }.toString())
        }

        buildRollHelperSurface(sheet, lastUserMessage, targetAc)?.let { surfacesToEmit.add(it) }

        if (surfacesToEmit.isEmpty()) {
            surfacesToEmit.add(buildTacticalAdvisorSurface(sheet, targetAc))
        }

        for (surface in surfacesToEmit) {
            emitEvent("CUSTOM", buildJsonObject {
                put("type", "CUSTOM")
                put("name", "a2ui_surface")
                put("value", json.encodeToJsonElement(surface))
            }.toString())
        }

        // 3. Call Configured LLM (Local LAN or BYOK Cloud) with full character context, falling back cleanly to deterministic analysis if unreachable
        emitEvent("TEXT_MESSAGE_START", buildJsonObject {
            put("type", "TEXT_MESSAGE_START")
            put("messageId", msgId)
            put("role", "assistant")
        }.toString())

        val systemPrompt = buildSystemPrompt(sheet, targetAc, surfacesToEmit)
        val llmText = tryCallLlm(request.llmConfig, systemPrompt, request.messages)
            ?: buildDeterministicTacticalNarrative(sheet, targetAc, surfacesToEmit, request.llmConfig)

        val chunks = llmText.chunked(80)
        for (chunk in chunks) {
            emitEvent("TEXT_MESSAGE_CONTENT", buildJsonObject {
                put("type", "TEXT_MESSAGE_CONTENT")
                put("messageId", msgId)
                put("delta", chunk)
            }.toString())
        }

        emitEvent("TEXT_MESSAGE_END", buildJsonObject {
            put("type", "TEXT_MESSAGE_END")
            put("messageId", msgId)
        }.toString())

        emitEvent("RUN_FINISHED", buildJsonObject {
            put("type", "RUN_FINISHED")
            put("runId", runId)
        }.toString())
    }

    private fun buildSystemPrompt(
        sheet: ResolvedCharacterSheet,
        targetAc: Int,
        surfaces: List<A2UiSurfacePayload>
    ): String {
        val abilitiesSummary = sheet.abilityScores.joinToString(", ") {
            "${it.ability.uppercase()} ${it.effectiveValue} (${if (it.modifier >= 0) "+${it.modifier}" else "${it.modifier}"})"
        }
        val attacksSummary = sheet.actions.joinToString("\n") { atk ->
            "- ${atk.name} [${atk.actionCategory}]: +${atk.toHitBonus ?: 0} to hit, ${atk.baseDamageDice ?: ""}+${atk.damageBonus} ${atk.damageType ?: ""}" +
                (if (atk.eligibleRiders.isNotEmpty()) " | Riders: ${atk.eligibleRiders.joinToString { r -> "${r.name} (${r.dice ?: r.diceFormula ?: r.formula ?: ""})" }}" else "")
        }
        val resourcesSummary = sheet.trackedResources.joinToString(", ") {
            "${it.resource.name}: ${it.max - it.used}/${it.max}"
        }
        val recentLogSummary = (sheet.character.events ?: emptyArray()).take(5).joinToString("\n") {
            "- [${it.eventType}] ${it.title}: ${it.summary}"
        }
        val condSummary = sheet.activeConditions.joinToString(", ") { it.condition.name }
        val mapDistancesSummary = try {
            val mapState = repo.getBattleMapState()
            val scene = mapState.activeScene
            val myToken = scene.tokens.find { it.characterId == sheet.character.id && it.tokenType == "player" }
            if (myToken != null) {
                val visibleEnemies = scene.tokens.filter {
                    it.tokenType == "enemy" && !it.isHidden && it.state != "dead"
                }
                if (visibleEnemies.isNotEmpty()) {
                    "Scene '${scene.title}' (${scene.widthFt}x${scene.heightFt} ft, ${scene.diagonalRule} diagonals) — Your Position: (${myToken.xFt.toInt()}ft, ${myToken.yFt.toInt()}ft)\n" +
                        visibleEnemies.joinToString("\n") { en ->
                            val dxCells = kotlin.math.abs(en.xFt - myToken.xFt) / 5.0
                            val dyCells = kotlin.math.abs(en.yFt - myToken.yFt) / 5.0
                            val diag = kotlin.math.min(dxCells, dyCells)
                            val straight = kotlin.math.max(dxCells, dyCells) - diag
                            val distFt = if (scene.diagonalRule == "5-10-5") {
                                ((straight + kotlin.math.floor(diag * 1.5)) * 5.0).roundToInt()
                            } else {
                                ((straight + diag) * 5.0).roundToInt()
                            }
                            "- ${en.name} (${en.sizeCategory}, ${en.state.uppercase()}, AC ${en.ac}): ${distFt} ft. away"
                        }
                } else "On Map '${scene.title}' (No visible living enemy tokens)"
            } else "Character token not placed on active map."
        } catch (_: Exception) {
            "Battle map unavailable."
        }
        val questsSummary = (sheet.character.quests ?: emptyArray())
            .filter { it.status == "active" || it.isTracked }
            .joinToString("\n") { q ->
                val objs = q.objectives.joinToString("; ") { o -> "${if (o.isCompleted) "[x]" else "[ ]"} ${o.description}" }
                "- [${q.category.uppercase()}] ${q.title} (Giver: ${q.giver ?: "Unknown"}, Location: ${q.location ?: "Unknown"}, Rewards: +${q.rewardXp} XP / +${q.rewardGp} GP) | Objectives: $objs"
            }
        val primaryClass = sheet.character.classes?.firstOrNull()
        val primarySpellStat = sheet.spellcastingStats.firstOrNull()

        return """
You are the D&D 5e (2024 Revision) Tactical Co-Pilot & Rules Assistant powered by JetBrains Koog.
IMPORTANT ROLE CONSTRAINT: You are NOT a Dungeon Master (a real human is the DM). Do NOT narrate story scenes or roleplay as NPCs.
Your sole mission is to help the player understand their character sheet, stack their combat riders/skills optimally, verify 5e (2024) rules, plan quest objective strategies, and choose the highest-impact tactical action on their turn.

LIVE CHARACTER SNAPSHOT:
- Name: ${sheet.character.name} (Level ${sheet.character.level} ${sheet.character.raceEntry?.name ?: sheet.character.raceId} ${primaryClass?.className ?: ""}${primaryClass?.subclassName?.let { " - $it" } ?: ""})
- HP: ${sheet.character.hpCurrent}/${sheet.character.hpMax} (Temp HP: ${sheet.character.tempHp}) | AC: ${sheet.combatStats.armorClass} | Speed: ${sheet.combatStats.speed} ft
- Initiative: +${sheet.combatStats.initiative} | Proficiency Bonus: +${sheet.combatStats.proficiencyBonus} | Extra Attacks: ${sheet.combatStats.extraAttacks}
- Spellcasting: Ability ${primarySpellStat?.ability ?: "None"}, Save DC ${primarySpellStat?.saveDC ?: 0}, Spell Attack +${primarySpellStat?.attackBonus ?: 0}
- Active Concentration: ${sheet.concentrationSpellName ?: "None"}
- Abilities: $abilitiesSummary
- Class Resources: ${resourcesSummary.ifBlank { "None" }}
- Conditions: ${condSummary.ifBlank { "None" }}

ACTIVE & TRACKED QUESTS:
${questsSummary.ifBlank { "No active quests." }}

LIVE BATTLE MAP & ENEMY DISTANCES:
$mapDistancesSummary

AVAILABLE ATTACKS & SPELLS (Evaluated vs Target AC $targetAc):
$attacksSummary

RECENT ACTION LOG:
${recentLogSummary.ifBlank { "No recent actions logged." }}

A2UI HELPER CARDS ALREADY RENDERED FOR THE USER:
${surfaces.joinToString(", ") { "${it.componentType} (${it.title})" }}

Keep your answer concise, tactical, and directly actionable. Reference exact bonuses, dice, and riders from the snapshot above, and point the player to the interactive A2UI helper card(s) rendered below your message to execute or customize the roll.
""".trimIndent()
    }

    private suspend fun tryCallLlm(
        config: LlmConnectionConfig,
        systemPrompt: String,
        messages: List<AgUiChatMessage>
    ): String? {
        val cleanUrl = config.baseUrl.trimEnd('/')
        return try {
            when (config.provider.lowercase()) {
                "ollama" -> {
                    var modelToUse = config.model.ifBlank { "qwen3.5:0.8b" }
                    val discovered = discoverModels("ollama", cleanUrl, null)
                    if (discovered.reachable && discovered.models.isNotEmpty() && modelToUse !in discovered.models) {
                        // Prefer a pure local non-embedding, non-cloud model first if available
                        modelToUse = discovered.models.firstOrNull {
                            !it.contains("embed", ignoreCase = true) && !it.endsWith(":cloud", ignoreCase = true)
                        } ?: discovered.models.firstOrNull {
                            !it.contains("embed", ignoreCase = true)
                        } ?: discovered.models.first()
                    }
                    val reqBody = buildJsonObject {
                        put("model", modelToUse)
                        put("stream", false)
                        put("think", false)
                        put("options", buildJsonObject {
                            put("num_predict", 400)
                            put("temperature", 0.3)
                        })
                        put("messages", buildJsonArray {
                            add(buildJsonObject {
                                put("role", "system")
                                put("content", systemPrompt)
                            })
                            messages.forEach { m ->
                                add(buildJsonObject {
                                    put("role", m.role)
                                    put("content", m.content)
                                })
                            }
                        })
                    }
                    val resp = httpClient.post("$cleanUrl/api/chat") {
                        contentType(ContentType.Application.Json)
                        setBody(reqBody.toString())
                    }
                    if (!resp.status.isSuccess()) return null
                    val obj = json.parseToJsonElement(resp.bodyAsText()).jsonObject
                    val content = obj["message"]?.jsonObject?.get("content")?.jsonPrimitive?.contentOrNull
                    content?.let { "*(Connected to Local Ollama model `$modelToUse` at `$cleanUrl` — 0 paid cloud tokens)*\n\n$it" }
                }
                "openai-compatible", "openai", "openrouter" -> {
                    val endpoint = when (config.provider.lowercase()) {
                        "openai" -> "https://api.openai.com/v1/chat/completions"
                        "openrouter" -> "https://openrouter.ai/api/v1/chat/completions"
                        else -> if (cleanUrl.endsWith("/v1")) "$cleanUrl/chat/completions" else "$cleanUrl/v1/chat/completions"
                    }
                    if (config.provider.lowercase() in listOf("openai", "openrouter") && config.apiKey.isNullOrBlank()) {
                        return null
                    }
                    val reqBody = buildJsonObject {
                        put("model", config.model)
                        put("stream", false)
                        put("messages", buildJsonArray {
                            add(buildJsonObject {
                                put("role", "system")
                                put("content", systemPrompt)
                            })
                            messages.forEach { m ->
                                add(buildJsonObject {
                                    put("role", m.role)
                                    put("content", m.content)
                                })
                            }
                        })
                    }
                    val resp = httpClient.post(endpoint) {
                        contentType(ContentType.Application.Json)
                        if (!config.apiKey.isNullOrBlank()) {
                            header(HttpHeaders.Authorization, "Bearer ${config.apiKey}")
                        }
                        setBody(reqBody.toString())
                    }
                    if (!resp.status.isSuccess()) return null
                    val obj = json.parseToJsonElement(resp.bodyAsText()).jsonObject
                    obj["choices"]?.jsonArray?.firstOrNull()?.jsonObject
                        ?.get("message")?.jsonObject?.get("content")?.jsonPrimitive?.contentOrNull
                }
                "gemini" -> {
                    if (config.apiKey.isNullOrBlank()) return null
                    val modelId = config.model.ifBlank { "gemini-2.5-flash" }
                    val endpoint = "https://generativelanguage.googleapis.com/v1beta/models/$modelId:generateContent?key=${config.apiKey}"
                    val reqBody = buildJsonObject {
                        put("systemInstruction", buildJsonObject {
                            put("parts", buildJsonArray {
                                add(buildJsonObject { put("text", systemPrompt) })
                            })
                        })
                        put("contents", buildJsonArray {
                            messages.forEach { m ->
                                add(buildJsonObject {
                                    put("role", if (m.role == "assistant") "model" else "user")
                                    put("parts", buildJsonArray {
                                        add(buildJsonObject { put("text", m.content) })
                                    })
                                })
                            }
                        })
                    }
                    val resp = httpClient.post(endpoint) {
                        contentType(ContentType.Application.Json)
                        setBody(reqBody.toString())
                    }
                    if (!resp.status.isSuccess()) return null
                    val obj = json.parseToJsonElement(resp.bodyAsText()).jsonObject
                    obj["candidates"]?.jsonArray?.firstOrNull()?.jsonObject
                        ?.get("content")?.jsonObject?.get("parts")?.jsonArray?.firstOrNull()?.jsonObject
                        ?.get("text")?.jsonPrimitive?.contentOrNull
                }
                "anthropic" -> {
                    if (config.apiKey.isNullOrBlank()) return null
                    val reqBody = buildJsonObject {
                        put("model", config.model.ifBlank { "claude-3-7-sonnet-latest" })
                        put("max_tokens", 1024)
                        put("system", systemPrompt)
                        put("messages", buildJsonArray {
                            messages.forEach { m ->
                                add(buildJsonObject {
                                    put("role", if (m.role == "assistant") "assistant" else "user")
                                    put("content", m.content)
                                })
                            }
                        })
                    }
                    val resp = httpClient.post("https://api.anthropic.com/v1/messages") {
                        contentType(ContentType.Application.Json)
                        header("x-api-key", config.apiKey)
                        header("anthropic-version", "2023-06-01")
                        setBody(reqBody.toString())
                    }
                    if (!resp.status.isSuccess()) return null
                    val obj = json.parseToJsonElement(resp.bodyAsText()).jsonObject
                    obj["content"]?.jsonArray?.firstOrNull()?.jsonObject
                        ?.get("text")?.jsonPrimitive?.contentOrNull
                }
                else -> null
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun buildDeterministicTacticalNarrative(
        sheet: ResolvedCharacterSheet,
        targetAc: Int,
        surfaces: List<A2UiSurfacePayload>,
        llmConfig: LlmConnectionConfig
    ): String {
        val tacticalSurface = surfaces.firstOrNull { it.componentType == "TacticalActionAdvisorCard" }
        val questSurface = surfaces.firstOrNull { it.componentType == "QuestTacticalAdvisorCard" }
        val topOptions = tacticalSurface?.data?.get("options")?.jsonArray?.mapNotNull {
            json.decodeFromJsonElement<TacticalOptionItem>(it)
        } ?: emptyList()

        val sb = StringBuilder()
        sb.appendLine("### Tactical Co-Pilot Analysis for **${sheet.character.name}**")
        sb.appendLine(
            "- **Status**: ${sheet.character.hpCurrent}/${sheet.character.hpMax} HP • **AC ${sheet.combatStats.armorClass}** • **Proficiency +${sheet.combatStats.proficiencyBonus}**" +
                (if (sheet.concentrationSpellName != null) " • Concentrating on `${sheet.concentrationSpellName}`" else "")
        )

        if (questSurface != null) {
            val qTitle = questSurface.data["questTitle"]?.jsonPrimitive?.contentOrNull ?: "Active Quest"
            val recSkills = questSurface.data["recommendedSkills"]?.jsonArray?.mapNotNull {
                val obj = it.jsonObject
                val name = obj["name"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                val mod = obj["modifier"]?.jsonPrimitive?.intOrNull ?: 0
                val pass = obj["passive"]?.jsonPrimitive?.intOrNull ?: 10
                "**$name** (${if (mod >= 0) "+$mod" else "$mod"}, Passive $pass)"
            } ?: emptyList()
            sb.appendLine("- **Quest Tactical Brief ($qTitle)**:")
            if (recSkills.isNotEmpty()) {
                sb.appendLine("  - **Best Character Skill Checks for Objectives**: ${recSkills.joinToString(", ")}.")
            }
            sb.appendLine("  - Use the interactive **A2UI Quest Strategy Card** below to roll objective skill checks in 1 click, prepare recommended utility spells, or append suggested sub-objectives directly to your Quest Log.")
        }

        if (topOptions.isNotEmpty()) {
            val best = topOptions.first()
            sb.appendLine(
                "- **Top Recommended Turn Action (vs AC $targetAc)**: **${best.name}** (${best.actionCost}) — **${best.expectedDamage} expected DPR** (${best.hitOrSuccessChancePct}% hit/success chance)."
            )
            if (best.recommendedRiders.isNotEmpty()) {
                sb.appendLine("  - **Auto-Stacked Combat Riders**: ${best.recommendedRiders.joinToString(", ")}.")
            }
            if (topOptions.size > 1) {
                val second = topOptions[1]
                sb.appendLine(
                    "- **Runner-Up Option**: **${second.name}** (${second.actionCost}) — **${second.expectedDamage} expected DPR** (${second.summary})."
                )
            }
        }

        sb.appendLine()
        sb.appendLine(
            "Use the interactive **A2UI Helper Cards** below to load any action directly into the **Action & Roll Composer** (supports both **1-Click Simulated Auto-Roll** and **Physical Tabletop Dice Input**)."
        )
        sb.appendLine(
            "_Note: Local/Cloud LLM (`${llmConfig.provider}` at `${llmConfig.baseUrl}`) was not reachable or has no API key set, so this breakdown was generated directly by the deterministic KMP Tactical Simulation Engine. Click the **LLM Settings** gear to connect your LAN Ollama/LM Studio server or BYOK key._"
        )
        return sb.toString().trim()
    }

    private fun parseAverageDice(formula: String): Double {
        if (formula.isBlank()) return 0.0
        val regex = Regex("""(\d+)d(\d+)""", RegexOption.IGNORE_CASE)
        val match = regex.find(formula) ?: return formula.toDoubleOrNull() ?: 0.0
        val count = match.groupValues[1].toIntOrNull() ?: 1
        val sides = match.groupValues[2].toIntOrNull() ?: 6
        return count * ((sides + 1) / 2.0)
    }
}
