package org.dndcharacter.server

import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.concurrent.atomic.AtomicInteger
import org.dndcharacter.server.ai.AgUiChatRequest
import org.dndcharacter.server.ai.KoogCoPilotService
import org.dndcharacter.server.db.PostgresRepository
import org.dndcharacter.shared.engine.GameEngine
import org.dndcharacter.shared.engine.RollResolver
import org.dndcharacter.shared.model.*

@Serializable
data class CreateCharacterRequest(
    val name: String,
    val raceId: String,
    val subraceId: String? = null,
    val classId: String,
    val subclassId: String? = null,
    val backgroundId: String? = null,
    val alignment: String = "Neutral",
    val level: Int = 1,
    val baseAbilities: Map<String, Int> = mapOf(
        "STR" to 15, "DEX" to 14, "CON" to 13, "INT" to 12, "WIS" to 10, "CHA" to 8
    ),
    val backgroundBonuses: Map<String, Int> = emptyMap(),
    val skillProficiencies: List<String> = emptyList(),
    val startingEquipmentIds: List<String> = emptyList(),
    val originFeatId: String? = null
)

@Serializable
data class UpdateAlignmentRequest(
    val characterId: Int,
    val alignment: String
)

fun main() {
    val port = System.getenv("KTOR_PORT")?.toIntOrNull() ?: 8081
    val databaseUrl = System.getenv("DATABASE_URL")
        ?: "postgres://postgres:postgres@localhost:5432/dnd_character_db"

    val repo = PostgresRepository(databaseUrl = databaseUrl)
    val coPilotService = KoogCoPilotService(repo)
    val battleMapFlow = MutableSharedFlow<BattleMapStatePayload>(replay = 1, extraBufferCapacity = 64)
    val connectedMapClients = AtomicInteger(0)
    var latestMapPing: BattleMapPing? = null
    val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        coerceInputValues = true
    }

    embeddedServer(Netty, port = port, host = "0.0.0.0") {
        install(ContentNegotiation) {
            json(json)
        }
        install(CORS) {
            anyHost()
            allowHeader(HttpHeaders.ContentType)
            allowHeader(HttpHeaders.Authorization)
            allowHeader("X-LLM-Provider")
            allowHeader("X-LLM-Base-Url")
            allowHeader("X-LLM-Model")
            allowHeader("X-LLM-Api-Key")
            allowMethod(HttpMethod.Get)
            allowMethod(HttpMethod.Post)
            allowMethod(HttpMethod.Put)
            allowMethod(HttpMethod.Delete)
            allowMethod(HttpMethod.Options)
        }

        routing {
            get("/api/engine/health") {
                call.respond(
                    buildJsonObject {
                        put("status", "ok")
                        put("engine", "dnd-5e-2024-kmp-v2")
                        put("port", port)
                    }
                )
            }

            get("/api/engine/rules") {
                val catalog = repo.getRulesCatalog()
                call.respond(catalog)
            }

            post("/api/engine/rules/invalidate") {
                repo.invalidateCatalogCache()
                call.respond(mapOf("invalidated" to true))
            }

            get("/api/engine/characters") {
                val sheets = repo.getAllCharacters()
                call.respond(sheets)
            }

            post("/api/engine/characters") {
                val req = call.receive<CreateCharacterRequest>()
                val catalog = repo.getRulesCatalog()
                val ruleClass = catalog.classes.find { it.id == req.classId }
                val resolvedSubclass = req.subclassId?.takeIf { it.isNotBlank() }?.let { subReq ->
                    catalog.subclasses.find {
                        it.id.equals(subReq, ignoreCase = true) ||
                            (it.classId == req.classId && (it.id.endsWith("-$subReq", ignoreCase = true) || it.name.contains(subReq, ignoreCase = true)))
                    }
                }
                val background = req.backgroundId?.let { bgId -> catalog.backgrounds.find { it.id == bgId } }

                fun abilityVal(code: String, defaultVal: Int): Int {
                    val base = req.baseAbilities[code] ?: req.baseAbilities[code.lowercase()] ?: defaultVal
                    val bonus = req.backgroundBonuses[code] ?: req.backgroundBonuses[code.lowercase()] ?: 0
                    return base + bonus
                }

                val strScore = abilityVal("STR", 15)
                val dexScore = abilityVal("DEX", 14)
                val conScore = abilityVal("CON", 13)
                val intScore = abilityVal("INT", 12)
                val wisScore = abilityVal("WIS", 10)
                val chaScore = abilityVal("CHA", 8)

                // Origin feat from background or request
                val featId = req.originFeatId ?: background?.originFeatId
                val initialFeats = listOfNotNull(
                    featId?.let { fId -> catalog.feats.find { it.id == fId } }
                ).map { rf ->
                    CharacterFeat(
                        id = rf.id,
                        name = rf.name,
                        description = rf.description,
                        modifiers = rf.modifiers
                    )
                }.toTypedArray()

                // Racial traits
                val initialTraits = catalog.traits
                    .filter { val r = it.race; r != null && req.raceId.startsWith(r) }
                    .map { rt ->
                        CharacterTrait(
                            id = rt.id,
                            name = rt.name,
                            description = rt.description,
                            modifiers = rt.modifiers
                        )
                    }.toTypedArray()

                // Starting equipment
                val defaultEquipmentIds = req.startingEquipmentIds.ifEmpty {
                    when (req.classId) {
                        "fighter", "paladin" -> listOf("longsword", "shield", "chain-mail")
                        "barbarian" -> listOf("greataxe", "handaxe")
                        "rogue", "ranger", "bard" -> listOf("rapier", "shortbow", "leather")
                        "cleric", "druid" -> listOf("mace", "shield", "scale-mail")
                        "wizard", "sorcerer", "warlock" -> listOf("quarterstaff", "dagger")
                        "monk" -> listOf("quarterstaff", "shortbow")
                        else -> listOf("dagger")
                    }
                }
                val initialInventory = defaultEquipmentIds.mapIndexedNotNull { idx, itemId ->
                    val item = catalog.items.find { it.id == itemId } ?: return@mapIndexedNotNull null
                    CharacterInventoryItem(
                        id = idx + 1,
                        characterId = 0,
                        itemId = item.id,
                        item = item,
                        itemName = item.name,
                        itemCategory = item.category,
                        quantity = 1,
                        equipped = true,
                        isAttuned = false,
                        isIdentified = true
                    )
                }.toTypedArray()

                // Starting prepared/known spells for level 1 casters
                val classSpells = catalog.spells.filter { sp ->
                    sp.classes.any { c -> c.equals(req.classId, ignoreCase = true) }
                }
                val starterSpells = (
                    classSpells.filter { it.level == 0 }.take(2) +
                        classSpells.filter { it.level == 1 }.take(3)
                    ).map { sp ->
                        CharacterSpell(
                            characterId = 0,
                            spellId = sp.id,
                            spell = sp,
                            spellName = sp.name,
                            spellLevel = sp.level,
                            prepared = true,
                            source = "class",
                            alwaysPrepared = false
                        )
                    }.toTypedArray()

                val hitDie = ruleClass?.hitDie ?: 8
                val conMod = (conScore - 10).floorDiv(2)
                val maxHp = (hitDie + conMod).coerceAtLeast(1)
                val savesMap = (ruleClass?.savingThrows ?: emptyArray()).associate { it.lowercase() to true }
                val skillsMap = req.skillProficiencies.associate { it.lowercase() to "proficient" }

                val draft = Character(
                    id = 0,
                    name = req.name.ifBlank { "Adventurer" },
                    raceId = req.raceId,
                    backgroundId = req.backgroundId,
                    alignment = req.alignment,
                    xp = 0,
                    level = req.level,
                    str = strScore,
                    dex = dexScore,
                    con = conScore,
                    int = intScore,
                    wis = wisScore,
                    cha = chaScore,
                    hpCurrent = maxHp,
                    hpMax = maxHp,
                    tempHp = 0,
                    speed = 30,
                    hitDiceCurrent = req.level,
                    hitDiceMax = req.level,
                    proficiencies = CharacterProficiencies(
                        skills = skillsMap,
                        savingThrows = savesMap
                    ),
                    feats = initialFeats,
                    traits = initialTraits,
                    classes = arrayOf(
                        CharacterClass(
                            characterId = 0,
                            classId = req.classId,
                            subclassId = resolvedSubclass?.id,
                            level = req.level,
                            className = ruleClass?.name ?: req.classId,
                            subclassName = resolvedSubclass?.name,
                            hitDie = hitDie
                        )
                    ),
                    inventory = initialInventory,
                    spells = starterSpells,
                    languages = arrayOf(
                        CharacterLanguage(id = 0, characterId = 0, languageId = "common", languageName = "Common")
                    )
                )

                val created = repo.createCharacter(draft)
                val finalSheet = GameEngine.resolve(created, catalog)
                call.respond(HttpStatusCode.Created, finalSheet)
            }

            get("/api/engine/characters/{id}") {
                val id = call.parameters["id"]?.toIntOrNull()
                if (id == null) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid character ID"))
                    return@get
                }
                val catalog = repo.getRulesCatalog()
                val raw = repo.getCharacter(id)
                if (raw == null) {
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "Character not found"))
                    return@get
                }
                val synced = GameEngine.syncAutoGrantedSpells(raw, catalog)
                val rawSpellSize = raw.spells?.size ?: 0
                val syncedSpellSize = synced.spells?.size ?: 0
                if (syncedSpellSize != rawSpellSize) {
                    val saved = repo.saveEngineResult(
                        EngineResult(
                            character = synced,
                            sheet = GameEngine.resolve(synced, catalog)
                        )
                    )
                    call.respond(saved.sheet)
                    return@get
                }
                val sheet = GameEngine.resolve(synced, catalog)
                call.respond(sheet)
            }

            delete("/api/engine/characters/{id}") {
                val id = call.parameters["id"]?.toIntOrNull()
                if (id == null) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid character ID"))
                    return@delete
                }
                val deleted = repo.deleteCharacter(id)
                call.respond(mapOf("deleted" to deleted))
            }

            post("/api/engine/characters/{id}/commands") {
                val id = call.parameters["id"]?.toIntOrNull()
                if (id == null) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid character ID"))
                    return@post
                }
                val command = call.receive<GameCommandPayload>()
                val catalog = repo.getRulesCatalog()

                val questCommands = setOf(
                    "ADD_QUEST", "UPDATE_QUEST", "DELETE_QUEST", "CLAIM_QUEST_REWARDS",
                    "ADD_QUEST_OBJECTIVE", "TOGGLE_QUEST_OBJECTIVE", "DELETE_QUEST_OBJECTIVE",
                    "ADD_QUEST_LOG", "DELETE_QUEST_LOG"
                )

                if (command.type.uppercase() in questCommands) {
                    val updatedSheet = repo.handleQuestCommand(id, command)
                        ?: return@post call.respond(HttpStatusCode.NotFound, mapOf("error" to "Character not found"))
                    call.respond(EngineResult(character = updatedSheet.character, sheet = updatedSheet))
                    return@post
                }

                val current = repo.getCharacter(id)
                if (current == null) {
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "Character not found"))
                    return@post
                }
                val result = GameEngine.dispatch(current, catalog, command)
                val persisted = repo.saveEngineResult(result)
                // If the player rolled Initiative on their Character Sheet, automatically sync their Initiative score to their Battle Map token and broadcast!
                val rollOut = persisted.lastRollOutcome
                if (rollOut != null && rollOut.rollType.equals("initiative", ignoreCase = true) && rollOut.totalD20Result != null) {
                    val updatedMap = repo.handleBattleMapCommand(
                        command = BattleMapCommand(
                            type = "SET_TOKEN_INITIATIVE",
                            tokenId = "char-$id",
                            intValue = rollOut.totalD20Result,
                            intValue2 = id
                        ),
                        connectedClients = connectedMapClients.get().coerceAtLeast(1),
                        latestPing = latestMapPing
                    )
                    battleMapFlow.tryEmit(updatedMap)
                }
                call.respond(persisted)
            }

            post("/api/engine/characters/{id}/roll-preview") {
                val id = call.parameters["id"]?.toIntOrNull()
                if (id == null) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid character ID"))
                    return@post
                }
                val req = call.receive<RollRequest>()
                val catalog = repo.getRulesCatalog()
                val current = repo.getCharacter(id)
                if (current == null) {
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "Character not found"))
                    return@post
                }
                val sheet = GameEngine.resolve(current, catalog)
                val outcome = RollResolver.executeRoll(sheet, req)
                call.respond(outcome)
            }

            // ==================== DM Sandbox Endpoints ====================
            get("/api/engine/dm/players") {
                val players = repo.getAllCharacters()
                call.respond(players)
            }

            post("/api/engine/dm/items") {
                val item = call.receive<Item>()
                val created = repo.createGlobalItem(item)
                call.respond(HttpStatusCode.Created, created)
            }

            post("/api/engine/dm/spells") {
                val spell = call.receive<Spell>()
                val created = repo.createGlobalSpell(spell)
                call.respond(HttpStatusCode.Created, created)
            }

            post("/api/engine/dm/alignment") {
                val req = call.receive<UpdateAlignmentRequest>()
                val ok = repo.updateAlignment(req.characterId, req.alignment)
                call.respond(mapOf("success" to ok))
            }

            // ==================== Real-Time Shared LAN Battle Map Endpoints ====================
            get("/api/engine/battlemap") {
                val state = repo.getBattleMapState(
                    connectedClients = connectedMapClients.get().coerceAtLeast(1),
                    latestPing = latestMapPing
                )
                call.respond(state)
            }

            post("/api/engine/battlemap/commands") {
                val cmd = call.receive<BattleMapCommand>()
                if (cmd.ping != null) {
                    latestMapPing = cmd.ping
                }
                val updated = repo.handleBattleMapCommand(
                    command = cmd,
                    connectedClients = connectedMapClients.get().coerceAtLeast(1),
                    latestPing = latestMapPing
                )
                battleMapFlow.tryEmit(updated)
                call.respond(updated)
            }

            get("/api/engine/battlemap/stream") {
                call.response.cacheControl(CacheControl.NoCache(null))
                val nowClients = connectedMapClients.incrementAndGet()
                try {
                    val initial = repo.getBattleMapState(
                        connectedClients = nowClients,
                        latestPing = latestMapPing
                    )
                    battleMapFlow.tryEmit(initial)
                    call.respondTextWriter(contentType = ContentType.Text.EventStream) {
                        write("data: ${json.encodeToString(initial)}\n\n")
                        flush()

                        val heartbeatJob = launch {
                            while (isActive) {
                                delay(15_000)
                                write(": heartbeat\n\n")
                                flush()
                            }
                        }
                        try {
                            battleMapFlow.collect { statePayload ->
                                val withCount = statePayload.copy(
                                    connectedClients = connectedMapClients.get().coerceAtLeast(1)
                                )
                                write("data: ${json.encodeToString(withCount)}\n\n")
                                flush()
                            }
                        } finally {
                            heartbeatJob.cancel()
                        }
                    }
                } finally {
                    val left = connectedMapClients.decrementAndGet().coerceAtLeast(0)
                    val snap = repo.getBattleMapState(
                        connectedClients = left.coerceAtLeast(1),
                        latestPing = latestMapPing
                    )
                    battleMapFlow.tryEmit(snap)
                }
            }

            // ==================== AG-UI & A2UI Co-Pilot Endpoints ====================
            get("/api/ag-ui/models") {
                val provider = call.request.queryParameters["provider"] ?: "ollama"
                val baseUrl = call.request.queryParameters["baseUrl"] ?: "http://localhost:11434"
                val apiKey = call.request.headers["X-LLM-Api-Key"] ?: call.request.queryParameters["apiKey"]
                val discovered = coPilotService.discoverModels(provider, baseUrl, apiKey)
                call.respond(discovered)
            }

            post("/api/ag-ui/chat") {
                val req = call.receive<AgUiChatRequest>()
                val headerApiKey = call.request.headers["X-LLM-Api-Key"]
                val headerProvider = call.request.headers["X-LLM-Provider"]
                val headerBaseUrl = call.request.headers["X-LLM-Base-Url"]
                val headerModel = call.request.headers["X-LLM-Model"]

                val effectiveConfig = req.llmConfig.copy(
                    provider = headerProvider ?: req.llmConfig.provider,
                    baseUrl = headerBaseUrl ?: req.llmConfig.baseUrl,
                    model = headerModel ?: req.llmConfig.model,
                    apiKey = headerApiKey ?: req.llmConfig.apiKey
                )

                call.response.cacheControl(CacheControl.NoCache(null))
                call.respondTextWriter(contentType = ContentType.Text.EventStream) {
                    coPilotService.streamCoPilotTurn(req.copy(llmConfig = effectiveConfig)) { _, payloadJson ->
                        write("data: $payloadJson\n\n")
                        flush()
                    }
                }
            }
        }
    }.start(wait = true)
}
