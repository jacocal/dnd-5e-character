package org.dndcharacter.server.db

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import org.dndcharacter.shared.engine.GameEngine
import org.dndcharacter.shared.model.*
import java.net.URI
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.Statement

class PostgresRepository(databaseUrl: String) {

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        isLenient = true
        coerceInputValues = true
    }

    private val dataSource: HikariDataSource

    @Volatile
    private var cachedCatalog: RulesCatalog? = null

    @Volatile
    private var cachedCatalogTimestampMs: Long = 0L

    private val catalogTtlMs: Long = 30_000L

    init {
        val cleanUrl = databaseUrl.removePrefix("postgres://").removePrefix("postgresql://")
        val uri = URI("http://$cleanUrl")
        val userInfo = (uri.userInfo ?: "postgres:postgres").split(":")
        val user = userInfo.getOrElse(0) { "postgres" }
        val pass = userInfo.getOrElse(1) { "postgres" }
        val host = uri.host ?: "localhost"
        val port = if (uri.port > 0) uri.port else 5432
        val dbName = uri.path?.removePrefix("/") ?: "dnd_character_db"

        val config = HikariConfig().apply {
            jdbcUrl = "jdbc:postgresql://$host:$port/$dbName"
            username = user
            password = pass
            driverClassName = "org.postgresql.Driver"
            maximumPoolSize = 10
        }
        dataSource = HikariDataSource(config)
    }

    fun invalidateCatalogCache() {
        cachedCatalog = null
        cachedCatalogTimestampMs = 0L
    }

    fun getRulesCatalog(forceRefresh: Boolean = false): RulesCatalog {
        val now = System.currentTimeMillis()
        if (!forceRefresh && (now - cachedCatalogTimestampMs) < catalogTtlMs) {
            cachedCatalog?.let { return it }
        }
        dataSource.connection.use { conn ->
            val classes = loadClasses(conn)
            val subclasses = loadSubclasses(conn)
            val progression = loadProgression(conn)
            val resources = loadResources(conn)
            val races = loadRaces(conn)
            val traits = loadTraits(conn)
            val backgrounds = loadBackgrounds(conn)
            val feats = loadFeats(conn)
            val conditions = loadConditions(conn)
            val items = loadItems(conn)
            val spells = loadSpells(conn)
            val languages = loadLanguages(conn)

            val catalog = RulesCatalog(
                classes = classes,
                subclasses = subclasses,
                progression = progression,
                resources = resources,
                races = races,
                traits = traits,
                backgrounds = backgrounds,
                feats = feats,
                conditions = conditions,
                items = items,
                spells = spells,
                languages = languages
            )
            cachedCatalog = catalog
            cachedCatalogTimestampMs = System.currentTimeMillis()
            return catalog
        }
    }

    // --- Rules Loaders ---

    private fun ResultSet.hasColumn(col: String): Boolean {
        val meta = metaData
        for (i in 1..meta.columnCount) {
            if (meta.getColumnLabel(i).equals(col, ignoreCase = true)) return true
        }
        return false
    }

    private fun ResultSet.getStringOrNull(col: String): String? =
        if (hasColumn(col)) getString(col) else null

    private fun ResultSet.getIntOrDefault(col: String, default: Int): Int =
        if (hasColumn(col)) getInt(col) else default

    private fun ResultSet.getBooleanOrDefault(col: String, default: Boolean): Boolean =
        if (hasColumn(col)) getBoolean(col) else default

    private fun ResultSet.getStringArray(col: String): Array<String> {
        if (!hasColumn(col)) return emptyArray()
        val sqlArr = getArray(col) ?: return emptyArray()
        val raw = sqlArr.array
        return when (raw) {
            is Array<*> -> raw.filterNotNull().map { it.toString() }.toTypedArray()
            else -> emptyArray()
        }
    }

    private fun parseModifiersJson(rawJson: String?): Array<Modifier> {
        if (rawJson.isNullOrBlank()) return emptyArray()
        return try {
            val arr = json.parseToJsonElement(rawJson) as? JsonArray ?: return emptyArray()
            arr.mapNotNull { el ->
                val obj = el as? JsonObject ?: return@mapNotNull null
                val type = obj["type"]?.jsonPrimitive?.contentOrNull ?: "bonus"
                val target = obj["target"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                val valPrim = obj["value"]?.jsonPrimitive
                val intVal = valPrim?.intOrNull ?: (if (valPrim?.booleanOrNull == true) 1 else null)
                val strVal = obj["valueString"]?.jsonPrimitive?.contentOrNull
                    ?: (if (intVal == null) valPrim?.contentOrNull else null)
                val condition = obj["condition"]?.jsonPrimitive?.contentOrNull
                val formula = obj["formula"]?.jsonPrimitive?.contentOrNull
                val duration = obj["duration"]?.jsonPrimitive?.contentOrNull
                val max = obj["max"]?.jsonPrimitive?.intOrNull
                Modifier(
                    type = type,
                    target = target,
                    value = intVal,
                    valueString = strVal,
                    condition = condition,
                    formula = formula,
                    duration = duration,
                    max = max
                )
            }.toTypedArray()
        } catch (e: Exception) {
            emptyArray()
        }
    }

    private fun parseCombatRidersJson(rawJson: String?): Array<CombatRider> {
        if (rawJson.isNullOrBlank()) return emptyArray()
        return try {
            json.decodeFromString<Array<CombatRider>>(rawJson)
        } catch (e: Exception) {
            emptyArray()
        }
    }

    private fun parseGrantedSpellsJson(rawJson: String?): Map<String, Array<String>> {
        if (rawJson.isNullOrBlank()) return emptyMap()
        return try {
            json.decodeFromString<Map<String, Array<String>>>(rawJson)
        } catch (e: Exception) {
            emptyMap()
        }
    }

    private fun parseCharacterFeatsJson(rawJson: String?): Array<CharacterFeat> {
        if (rawJson.isNullOrBlank() || rawJson == "null") return emptyArray()
        return try {
            val arr = json.parseToJsonElement(rawJson) as? JsonArray ?: return emptyArray()
            arr.mapNotNull { el ->
                val obj = el as? JsonObject ?: return@mapNotNull null
                val id = obj["id"]?.jsonPrimitive?.contentOrNull ?: ""
                val name = obj["name"]?.jsonPrimitive?.contentOrNull ?: id
                val desc = obj["description"]?.jsonPrimitive?.contentOrNull ?: ""
                val mods = parseModifiersJson(obj["modifiers"]?.toString())
                CharacterFeat(id = id, name = name, description = desc, modifiers = mods)
            }.toTypedArray()
        } catch (e: Exception) {
            emptyArray()
        }
    }

    private fun parseCharacterTraitsJson(rawJson: String?): Array<CharacterTrait> {
        if (rawJson.isNullOrBlank() || rawJson == "null") return emptyArray()
        return try {
            val arr = json.parseToJsonElement(rawJson) as? JsonArray ?: return emptyArray()
            arr.mapNotNull { el ->
                val obj = el as? JsonObject ?: return@mapNotNull null
                val id = obj["id"]?.jsonPrimitive?.contentOrNull ?: ""
                val name = obj["name"]?.jsonPrimitive?.contentOrNull ?: id
                val desc = obj["description"]?.jsonPrimitive?.contentOrNull ?: ""
                val mods = parseModifiersJson(obj["modifiers"]?.toString())
                CharacterTrait(id = id, name = name, description = desc, modifiers = mods)
            }.toTypedArray()
        } catch (e: Exception) {
            emptyArray()
        }
    }

    private fun loadClasses(conn: Connection): Array<RuleClass> {
        val list = mutableListOf<RuleClass>()
        conn.prepareStatement("SELECT * FROM classes ORDER BY name ASC").use { ps ->
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    val profJson = rs.getString("proficiencies")
                    var armor = emptyArray<String>()
                    var weapons = emptyArray<String>()
                    var tools = emptyArray<String>()
                    if (!profJson.isNullOrBlank()) {
                        val obj = json.parseToJsonElement(profJson) as? JsonObject
                        armor = (obj?.get("armor") as? JsonArray)?.mapNotNull { it.jsonPrimitive.contentOrNull }?.toTypedArray() ?: emptyArray()
                        weapons = (obj?.get("weapons") as? JsonArray)?.mapNotNull { it.jsonPrimitive.contentOrNull }?.toTypedArray() ?: emptyArray()
                        tools = (obj?.get("tools") as? JsonArray)?.mapNotNull { it.jsonPrimitive.contentOrNull }?.toTypedArray() ?: emptyArray()
                    }
                    val skillOptJson = rs.getString("skill_options")
                    var skillChoose = 2
                    var skillFrom = emptyArray<String>()
                    if (!skillOptJson.isNullOrBlank()) {
                        val obj = json.parseToJsonElement(skillOptJson) as? JsonObject
                        skillChoose = obj?.get("choose")?.jsonPrimitive?.intOrNull ?: 2
                        skillFrom = (obj?.get("from") as? JsonArray)?.mapNotNull { it.jsonPrimitive.contentOrNull }?.toTypedArray() ?: emptyArray()
                    }
                    list.add(
                        RuleClass(
                            id = rs.getString("id"),
                            name = rs.getString("name"),
                            hitDie = rs.getInt("hit_die"),
                            savingThrows = rs.getStringArray("saving_throws"),
                            spellcastingAbility = rs.getString("spellcasting_ability"),
                            spellcastingType = rs.getString("spellcasting_type") ?: "none",
                            spellPrepMode = rs.getString("spell_prep_mode") ?: "none",
                            armorProficiencies = armor,
                            weaponProficiencies = weapons,
                            toolProficiencies = tools,
                            skillOptionsCount = skillChoose,
                            skillOptionsFrom = skillFrom,
                            combatRiders = parseCombatRidersJson(rs.getString("combat_riders"))
                        )
                    )
                }
            }
        }
        return list.toTypedArray()
    }

    private fun loadSubclasses(conn: Connection): Array<Subclass> {
        val list = mutableListOf<Subclass>()
        conn.prepareStatement("SELECT * FROM subclasses ORDER BY name ASC").use { ps ->
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    list.add(
                        Subclass(
                            id = rs.getString("id"),
                            classId = rs.getString("class_id"),
                            name = rs.getString("name"),
                            description = rs.getString("description") ?: "",
                            spellcastingType = rs.getString("spellcasting_type"),
                            grantedSpells = parseGrantedSpellsJson(rs.getString("granted_spells")),
                            combatRiders = parseCombatRidersJson(rs.getString("combat_riders"))
                        )
                    )
                }
            }
        }
        return list.toTypedArray()
    }

    private fun loadProgression(conn: Connection): Array<RuleClassProgression> {
        val list = mutableListOf<RuleClassProgression>()
        conn.prepareStatement("SELECT * FROM class_progression ORDER BY class_id ASC, level ASC").use { ps ->
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    val lvl = rs.getInt("level")
                    val clsId = rs.getString("class_id")
                    val subId = rs.getString("subclass_id")
                    val featJson = rs.getString("features")
                    val features = if (!featJson.isNullOrBlank()) {
                        try {
                            val arr = json.parseToJsonElement(featJson) as? JsonArray ?: JsonArray(emptyList())
                            arr.mapIndexedNotNull { idx, el ->
                                val obj = el as? JsonObject ?: return@mapIndexedNotNull null
                                val name = obj["name"]?.jsonPrimitive?.contentOrNull ?: return@mapIndexedNotNull null
                                val desc = obj["description"]?.jsonPrimitive?.contentOrNull ?: ""
                                val mods = obj["modifiers"]?.toString()?.let { parseModifiersJson(it) }
                                RuleClassFeature(
                                    id = "${clsId}_${lvl}_${name.lowercase().replace(" ", "_")}",
                                    name = name,
                                    description = desc,
                                    level = lvl,
                                    displayOrder = idx,
                                    classId = clsId,
                                    subclassId = subId,
                                    modifiers = mods
                                )
                            }.toTypedArray()
                        } catch (e: Exception) {
                            emptyArray()
                        }
                    } else emptyArray()

                    val slotsJson = rs.getString("spell_slots")
                    val slotsMap = if (!slotsJson.isNullOrBlank()) {
                        try {
                            val obj = json.parseToJsonElement(slotsJson) as? JsonObject ?: JsonObject(emptyMap())
                            obj.mapNotNull { (k, v) -> v.jsonPrimitive.intOrNull?.let { k to it } }.toMap()
                        } catch (e: Exception) {
                            emptyMap()
                        }
                    } else emptyMap()

                    val skillGrantsJson = rs.getString("skill_grants")
                    val skillGrant = if (!skillGrantsJson.isNullOrBlank() && skillGrantsJson != "null") {
                        try {
                            json.decodeFromString<SkillGrant>(skillGrantsJson)
                        } catch (e: Exception) {
                            null
                        }
                    } else null

                    list.add(
                        RuleClassProgression(
                            id = rs.getInt("id"),
                            classId = clsId,
                            subclassId = subId,
                            level = lvl,
                            proficiencyBonus = rs.getInt("proficiency_bonus").takeIf { it > 0 } ?: 2,
                            features = features,
                            spellSlots = slotsMap,
                            cantripsKnown = rs.getInt("cantrips_known"),
                            spellsKnown = rs.getInt("spells_known"),
                            extraAttacks = rs.getInt("extra_attacks").takeIf { it > 0 } ?: 1,
                            skillGrants = skillGrant,
                            hasAsi = rs.getBoolean("has_asi")
                        )
                    )
                }
            }
        }
        return list.toTypedArray()
    }

    private fun loadResources(conn: Connection): Array<RuleResource> {
        val list = mutableListOf<RuleResource>()
        conn.prepareStatement("SELECT * FROM class_resources").use { ps ->
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    val onUseJson = rs.getString("on_use")
                    val onUse = if (!onUseJson.isNullOrBlank() && onUseJson != "null") {
                        try {
                            json.decodeFromString<Array<ResourceEffect>>(onUseJson)
                        } catch (e: Exception) {
                            null
                        }
                    } else null
                    list.add(
                        RuleResource(
                            id = rs.getString("id"),
                            classId = rs.getStringOrNull("class_id"),
                            subclassId = rs.getStringOrNull("subclass_id"),
                            sourceType = rs.getStringOrNull("source_type") ?: "class",
                            sourceId = rs.getStringOrNull("source_id"),
                            name = rs.getString("name"),
                            description = rs.getString("description"),
                            maxFormula = rs.getString("max_formula") ?: "1",
                            rechargeOn = rs.getString("recharge_on") ?: "long",
                            partialShortRestRecovery = rs.getIntOrDefault("partial_short_rest_recovery", 0),
                            unlockLevel = rs.getInt("unlock_level").takeIf { it > 0 } ?: 1,
                            onUse = onUse
                        )
                    )
                }
            }
        }
        return list.toTypedArray()
    }

    private fun loadRaces(conn: Connection): Array<RaceEntry> {
        val list = mutableListOf<RaceEntry>()
        conn.prepareStatement("SELECT * FROM races ORDER BY name ASC").use { ps ->
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    list.add(
                        RaceEntry(
                            id = rs.getString("id"),
                            name = rs.getString("name"),
                            modifiers = parseModifiersJson(rs.getString("modifiers"))
                        )
                    )
                }
            }
        }
        return list.toTypedArray()
    }

    private fun loadTraits(conn: Connection): Array<RuleTrait> {
        val list = mutableListOf<RuleTrait>()
        conn.prepareStatement("SELECT * FROM traits ORDER BY name ASC").use { ps ->
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    list.add(
                        RuleTrait(
                            id = rs.getString("id"),
                            name = rs.getString("name"),
                            description = rs.getString("description") ?: "",
                            race = rs.getString("race"),
                            modifiers = parseModifiersJson(rs.getString("modifiers")),
                            grantedSpells = parseGrantedSpellsJson(rs.getString("granted_spells")),
                            combatRiders = parseCombatRidersJson(rs.getString("combat_riders"))
                        )
                    )
                }
            }
        }
        return list.toTypedArray()
    }

    private fun loadBackgrounds(conn: Connection): Array<Background> {
        val list = mutableListOf<Background>()
        conn.prepareStatement("SELECT * FROM backgrounds ORDER BY name ASC").use { ps ->
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    list.add(
                        Background(
                            id = rs.getString("id"),
                            name = rs.getString("name"),
                            description = rs.getString("description"),
                            abilityOptions = rs.getStringArray("ability_options"),
                            originFeatId = rs.getString("origin_feat_id"),
                            originFeatClass = rs.getString("origin_feat_class"),
                            modifiers = parseModifiersJson(rs.getString("modifiers"))
                        )
                    )
                }
            }
        }
        return list.toTypedArray()
    }

    private fun loadFeats(conn: Connection): Array<RuleFeat> {
        val list = mutableListOf<RuleFeat>()
        conn.prepareStatement("SELECT * FROM feats ORDER BY name ASC").use { ps ->
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    val sgJson = rs.getString("skill_grants")
                    val sg = if (!sgJson.isNullOrBlank() && sgJson != "null") {
                        try { json.decodeFromString<SkillGrant>(sgJson) } catch (e: Exception) { null }
                    } else null
                    list.add(
                        RuleFeat(
                            id = rs.getString("id"),
                            name = rs.getString("name"),
                            category = rs.getStringOrNull("category") ?: "general",
                            repeatable = rs.getBooleanOrDefault("repeatable", false),
                            description = rs.getString("description") ?: "",
                            prerequisites = rs.getString("prerequisites"),
                            modifiers = parseModifiersJson(rs.getString("modifiers")),
                            grantedSpells = parseGrantedSpellsJson(rs.getString("granted_spells")),
                            combatRiders = parseCombatRidersJson(rs.getString("combat_riders")),
                            skillGrants = sg
                        )
                    )
                }
            }
        }
        return list.toTypedArray()
    }

    private fun loadConditions(conn: Connection): Array<RuleCondition> {
        val list = mutableListOf<RuleCondition>()
        conn.prepareStatement("SELECT * FROM conditions ORDER BY name ASC").use { ps ->
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    list.add(
                        RuleCondition(
                            id = rs.getString("id"),
                            name = rs.getString("name"),
                            description = rs.getString("description") ?: "",
                            modifiers = parseModifiersJson(rs.getString("modifiers"))
                        )
                    )
                }
            }
        }
        return list.toTypedArray()
    }

    private fun loadItems(conn: Connection): Array<Item> {
        val list = mutableListOf<Item>()
        conn.prepareStatement("SELECT * FROM items ORDER BY name ASC").use { ps ->
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    val ac = rs.getInt("armor_class").let { if (rs.wasNull()) null else it }
                    val strReq = rs.getInt("strength_requirement").let { if (rs.wasNull()) null else it }
                    val uses = rs.getInt("uses").let { if (rs.wasNull()) null else it }
                    val usesMax = rs.getInt("uses_max").let { if (rs.wasNull()) null else it }
                    list.add(
                        Item(
                            id = rs.getString("id"),
                            name = rs.getString("name"),
                            type = rs.getString("type") ?: "gear",
                            costAmount = rs.getInt("cost_amount"),
                            costCurrency = rs.getString("cost_currency") ?: "gp",
                            weightAmount = rs.getDouble("weight_amount"),
                            weightUnit = rs.getString("weight_unit") ?: "lb",
                            fixedWeight = rs.getBoolean("fixed_weight"),
                            category = rs.getString("category") ?: "misc",
                            slot = rs.getString("slot"),
                            armorClass = ac,
                            strengthRequirement = strReq,
                            stealthDisadvantage = rs.getBoolean("stealth_disadvantage"),
                            damageDice = rs.getString("damage_dice"),
                            versatileDice = rs.getString("versatile_dice"),
                            damageType = rs.getString("damage_type"),
                            weaponMastery = rs.getString("weapon_mastery"),
                            range = rs.getString("range"),
                            properties = rs.getStringArray("properties"),
                            rarity = rs.getString("rarity") ?: "common",
                            requiresAttunement = rs.getBoolean("requires_attunement"),
                            isMagical = rs.getBoolean("is_magical"),
                            isCursed = rs.getBoolean("is_cursed"),
                            trueName = rs.getString("true_name"),
                            shownEffect = rs.getString("shown_effect"),
                            trueEffect = rs.getString("true_effect"),
                            uses = uses,
                            usesMax = usesMax,
                            description = rs.getString("description"),
                            tags = rs.getStringArray("tags"),
                            modifiers = parseModifiersJson(rs.getString("modifiers"))
                        )
                    )
                }
            }
        }
        return list.toTypedArray()
    }

    private fun loadSpells(conn: Connection): Array<Spell> {
        val list = mutableListOf<Spell>()
        conn.prepareStatement("SELECT * FROM spells ORDER BY level ASC, name ASC").use { ps ->
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    val compJson = rs.getString("components")
                    val comp = if (!compJson.isNullOrBlank()) {
                        try { json.decodeFromString<SpellComponents>(compJson) } catch (e: Exception) { null }
                    } else null
                    val durJson = rs.getString("duration")
                    val dur = if (!durJson.isNullOrBlank()) {
                        try { json.decodeFromString<SpellDuration>(durJson) } catch (e: Exception) { null }
                    } else null
                    val mechJson = rs.getString("mechanics")
                    val mech = if (!mechJson.isNullOrBlank() && mechJson != "null") {
                        try { json.decodeFromString<SpellMechanics>(mechJson) } catch (e: Exception) { null }
                    } else null

                    list.add(
                        Spell(
                            id = rs.getString("id"),
                            name = rs.getString("name"),
                            level = rs.getInt("level"),
                            school = rs.getString("school") ?: "Evocation",
                            castingTime = rs.getString("casting_time") ?: "1 Action",
                            range = rs.getString("range") ?: "Self",
                            isRitual = rs.getBoolean("is_ritual"),
                            isConcentration = rs.getBoolean("is_concentration"),
                            description = rs.getString("description") ?: "",
                            classes = rs.getStringArray("classes"),
                            tags = rs.getStringArray("tags"),
                            components = comp,
                            duration = dur,
                            mechanics = mech
                        )
                    )
                }
            }
        }
        return list.toTypedArray()
    }

    private fun loadLanguages(conn: Connection): Array<RuleLanguage> {
        val list = mutableListOf<RuleLanguage>()
        conn.prepareStatement("SELECT * FROM languages ORDER BY name ASC").use { ps ->
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    list.add(
                        RuleLanguage(
                            id = rs.getString("id"),
                            name = rs.getString("name"),
                            script = rs.getString("script"),
                            type = rs.getString("type") ?: "Standard",
                            description = rs.getString("description")
                        )
                    )
                }
            }
        }
        return list.toTypedArray()
    }

    // --- Character Load & Atomic Command Persistence ---

    fun getCharacter(id: Int): Character? {
        val catalog = getRulesCatalog()
        dataSource.connection.use { conn ->
            conn.prepareStatement("SELECT * FROM characters WHERE id = ?").use { ps ->
                ps.setInt(1, id)
                ps.executeQuery().use { rs ->
                    if (!rs.next()) return null
                    return readCharacterRow(conn, rs, catalog)
                }
            }
        }
    }

    fun getAllCharacters(includeQuestsAndEvents: Boolean = true): List<ResolvedCharacterSheet> {
        val catalog = getRulesCatalog()
        val baseChars = mutableListOf<Character>()
        dataSource.connection.use { conn ->
            conn.prepareStatement("SELECT * FROM characters ORDER BY updated_at DESC").use { ps ->
                ps.executeQuery().use { rs ->
                    while (rs.next()) {
                        baseChars.add(readCharacterCoreRow(rs, catalog))
                    }
                }
            }
            if (baseChars.isEmpty()) return emptyList()

            val ids = baseChars.map { it.id }.toTypedArray()
            val idArray = conn.createArrayOf("integer", ids)

            val classesByChar = mutableMapOf<Int, MutableList<CharacterClass>>()
            conn.prepareStatement("SELECT * FROM character_classes WHERE character_id = ANY(?)").use { ps ->
                ps.setArray(1, idArray)
                ps.executeQuery().use { crs ->
                    while (crs.next()) {
                        val charId = crs.getInt("character_id")
                        val cId = crs.getString("class_id")
                        val sId = crs.getString("subclass_id")
                        val ruleClass = catalog.classes.find { it.id == cId }
                        val ruleSub = sId?.let { catalog.subclasses.find { s -> s.id == it } }
                        classesByChar.getOrPut(charId) { mutableListOf() }.add(
                            CharacterClass(
                                characterId = charId,
                                classId = cId,
                                subclassId = sId,
                                level = crs.getInt("level"),
                                className = ruleClass?.name ?: cId,
                                subclassName = ruleSub?.name,
                                hitDie = ruleClass?.hitDie ?: 8,
                                hitDiceUsed = crs.getIntOrDefault("hit_dice_used", 0)
                            )
                        )
                    }
                }
            }

            val spellsByChar = mutableMapOf<Int, MutableList<CharacterSpell>>()
            conn.prepareStatement("SELECT * FROM character_spells WHERE character_id = ANY(?)").use { ps ->
                ps.setArray(1, idArray)
                ps.executeQuery().use { srs ->
                    while (srs.next()) {
                        val charId = srs.getInt("character_id")
                        val spId = srs.getString("spell_id")
                        val ruleSp = catalog.spells.find { it.id == spId }
                        spellsByChar.getOrPut(charId) { mutableListOf() }.add(
                            CharacterSpell(
                                characterId = charId,
                                spellId = spId,
                                prepared = srs.getBoolean("prepared"),
                                isRitual = srs.getBoolean("is_ritual"),
                                isConcentrating = srs.getBoolean("is_concentrating"),
                                source = srs.getString("source") ?: "class",
                                alwaysPrepared = srs.getBoolean("always_prepared"),
                                spell = ruleSp,
                                spellName = ruleSp?.name ?: spId,
                                spellLevel = ruleSp?.level ?: 0
                            )
                        )
                    }
                }
            }

            val invByChar = mutableMapOf<Int, MutableList<CharacterInventoryItem>>()
            conn.prepareStatement("SELECT * FROM character_inventory WHERE character_id = ANY(?) ORDER BY id ASC").use { ps ->
                ps.setArray(1, idArray)
                ps.executeQuery().use { irs ->
                    while (irs.next()) {
                        val charId = irs.getInt("character_id")
                        val itemId = irs.getString("item_id")
                        val ruleItem = catalog.items.find { it.id == itemId }
                        val currUses = irs.getInt("current_uses").let { if (irs.wasNull()) null else it }
                        invByChar.getOrPut(charId) { mutableListOf() }.add(
                            CharacterInventoryItem(
                                id = irs.getInt("id"),
                                characterId = charId,
                                itemId = itemId,
                                quantity = irs.getInt("quantity"),
                                equipped = irs.getBoolean("equipped"),
                                isIdentified = irs.getBoolean("is_identified"),
                                isAttuned = irs.getBoolean("is_attuned"),
                                currentUses = currUses,
                                item = ruleItem,
                                itemName = ruleItem?.name ?: itemId,
                                itemCategory = ruleItem?.category ?: "misc"
                            )
                        )
                    }
                }
            }

            val condsByChar = mutableMapOf<Int, MutableList<CharacterCondition>>()
            conn.prepareStatement("SELECT * FROM character_conditions WHERE character_id = ANY(?)").use { ps ->
                ps.setArray(1, idArray)
                ps.executeQuery().use { crs ->
                    while (crs.next()) {
                        val charId = crs.getInt("character_id")
                        val condId = crs.getString("condition_id")
                        val ruleCond = catalog.conditions.find { it.id == condId }
                        condsByChar.getOrPut(charId) { mutableListOf() }.add(
                            CharacterCondition(
                                id = crs.getInt("id"),
                                characterId = charId,
                                conditionId = condId,
                                duration = crs.getString("duration"),
                                isPermanent = crs.getBoolean("is_permanent"),
                                source = crs.getString("source"),
                                condition = ruleCond,
                                conditionName = ruleCond?.name ?: condId
                            )
                        )
                    }
                }
            }

            val resByChar = mutableMapOf<Int, MutableList<CharacterResource>>()
            conn.prepareStatement("SELECT * FROM character_resources WHERE character_id = ANY(?)").use { ps ->
                ps.setArray(1, idArray)
                ps.executeQuery().use { rrs ->
                    while (rrs.next()) {
                        val charId = rrs.getInt("character_id")
                        val resId = rrs.getString("resource_id")
                        val ruleRes = catalog.resources.find { it.id == resId }
                        resByChar.getOrPut(charId) { mutableListOf() }.add(
                            CharacterResource(
                                characterId = charId,
                                resourceId = resId,
                                usedUses = rrs.getInt("used_uses"),
                                resource = ruleRes,
                                resourceName = ruleRes?.name ?: resId,
                                maxFormula = ruleRes?.maxFormula,
                                rechargeOn = ruleRes?.rechargeOn
                            )
                        )
                    }
                }
            }

            val langsByChar = mutableMapOf<Int, MutableList<CharacterLanguage>>()
            conn.prepareStatement("SELECT * FROM character_languages WHERE character_id = ANY(?)").use { ps ->
                ps.setArray(1, idArray)
                ps.executeQuery().use { lrs ->
                    while (lrs.next()) {
                        val charId = lrs.getInt("character_id")
                        val langId = lrs.getString("language_id")
                        val ruleLang = catalog.languages.find { it.id == langId }
                        langsByChar.getOrPut(charId) { mutableListOf() }.add(
                            CharacterLanguage(
                                id = 0,
                                characterId = charId,
                                languageId = langId,
                                languageName = ruleLang?.name ?: langId,
                                languageScript = ruleLang?.script
                            )
                        )
                    }
                }
            }

            val assembled = baseChars.map { c ->
                val quests = if (includeQuestsAndEvents) loadCharacterQuests(conn, c.id) else emptyArray()
                c.copy(
                    classes = (classesByChar[c.id] ?: emptyList()).toTypedArray(),
                    spells = (spellsByChar[c.id] ?: emptyList()).toTypedArray(),
                    inventory = (invByChar[c.id] ?: emptyList()).toTypedArray(),
                    conditions = (condsByChar[c.id] ?: emptyList()).toTypedArray(),
                    resources = (resByChar[c.id] ?: emptyList()).toTypedArray(),
                    languages = (langsByChar[c.id] ?: emptyList()).toTypedArray(),
                    quests = quests
                )
            }
            return assembled.map { GameEngine.resolve(it, catalog) }
        }
    }

    private fun readCharacterCoreRow(rs: ResultSet, catalog: RulesCatalog): Character {
        val id = rs.getInt("id")
        val raceId = rs.getString("race") ?: "human"
        val bgId = rs.getString("background_id")
        val ac = rs.getInt("armor_class").let { if (rs.wasNull()) null else it }

        val usedSlotsJson = rs.getString("used_spell_slots")
        val usedSlots = if (!usedSlotsJson.isNullOrBlank() && usedSlotsJson != "null") {
            try {
                val obj = json.parseToJsonElement(usedSlotsJson) as? JsonObject ?: JsonObject(emptyMap())
                SpellSlotMap(obj.mapNotNull { (k, v) -> v.jsonPrimitive.intOrNull?.let { k to it } }.toMap())
            } catch (e: Exception) { SpellSlotMap() }
        } else SpellSlotMap()

        val profsJson = rs.getString("proficiencies")
        val profs = if (!profsJson.isNullOrBlank() && profsJson != "null") {
            try { json.decodeFromString<CharacterProficiencies>(profsJson) } catch (e: Exception) { CharacterProficiencies() }
        } else CharacterProficiencies()

        val manualJson = rs.getString("manual_proficiencies")
        val manual = if (!manualJson.isNullOrBlank() && manualJson != "null") {
            try { json.decodeFromString<ManualProficiencies>(manualJson) } catch (e: Exception) { ManualProficiencies() }
        } else ManualProficiencies()

        val feats = parseCharacterFeatsJson(rs.getString("feats"))
        val traits = parseCharacterTraitsJson(rs.getString("traits"))

        val activeModsJson = rs.getString("active_modifiers")
        val activeMods = if (!activeModsJson.isNullOrBlank() && activeModsJson != "null") {
            try { json.decodeFromString<Array<ActiveModifier>>(activeModsJson) } catch (e: Exception) { emptyArray() }
        } else emptyArray()

        val hpRollsJson = rs.getStringOrNull("hp_rolls")
        val hpRolls = if (!hpRollsJson.isNullOrBlank() && hpRollsJson != "null") {
            try { json.decodeFromString<Array<HpRollEntry>>(hpRollsJson) } catch (e: Exception) { emptyArray() }
        } else emptyArray()

        return Character(
            id = id,
            name = rs.getString("name"),
            raceId = raceId,
            raceEntry = catalog.races.find { it.id == raceId },
            backgroundId = bgId,
            background = bgId?.let { catalog.backgrounds.find { b -> b.id == it } },
            alignment = rs.getString("alignment"),
            xp = rs.getInt("xp"),
            level = rs.getInt("level"),
            str = rs.getInt("str"),
            dex = rs.getInt("dex"),
            con = rs.getInt("con"),
            int = rs.getInt("int"),
            wis = rs.getInt("wis"),
            cha = rs.getInt("cha"),
            hpCurrent = rs.getInt("hp_current"),
            hpMax = rs.getInt("hp_max"),
            tempHp = rs.getInt("temp_hp"),
            hpRolls = hpRolls,
            resistances = rs.getStringArray("resistances"),
            immunities = rs.getStringArray("immunities"),
            vulnerabilities = rs.getStringArray("vulnerabilities"),
            speed = rs.getInt("speed"),
            initiativeBonus = rs.getInt("initiative_bonus"),
            armorClass = ac,
            hitDiceCurrent = rs.getInt("hit_dice_current"),
            hitDiceMax = rs.getInt("hit_dice_max"),
            deathSaveSuccess = rs.getInt("death_save_success"),
            deathSaveFailure = rs.getInt("death_save_failure"),
            inspiration = rs.getBoolean("inspiration"),
            exhaustion = rs.getInt("exhaustion"),
            usedSpellSlots = usedSlots,
            usedPactSlots = rs.getInt("used_pact_slots"),
            cp = rs.getInt("cp"),
            sp = rs.getInt("sp"),
            ep = rs.getInt("ep"),
            gp = rs.getInt("gp"),
            pp = rs.getInt("pp"),
            manualProficiencies = manual,
            proficiencies = profs,
            feats = feats,
            traits = traits,
            abilityPointPool = rs.getInt("ability_point_pool"),
            size = rs.getString("size") ?: "Medium",
            appearance = rs.getString("appearance"),
            backstory = rs.getString("backstory"),
            notes = rs.getString("notes"),
            imageUrl = rs.getString("image_url"),
            activeModifiers = activeMods,
            createdAt = rs.getTimestamp("created_at")?.toInstant()?.toString() ?: "",
            updatedAt = rs.getTimestamp("updated_at")?.toInstant()?.toString() ?: ""
        )
    }

    private fun readCharacterRow(conn: Connection, rs: ResultSet, catalog: RulesCatalog): Character {
        val id = rs.getInt("id")
        val raceId = rs.getString("race") ?: "human"
        val bgId = rs.getString("background_id")
        val ac = rs.getInt("armor_class").let { if (rs.wasNull()) null else it }

        val usedSlotsJson = rs.getString("used_spell_slots")
        val usedSlots = if (!usedSlotsJson.isNullOrBlank() && usedSlotsJson != "null") {
            try {
                val obj = json.parseToJsonElement(usedSlotsJson) as? JsonObject ?: JsonObject(emptyMap())
                SpellSlotMap(obj.mapNotNull { (k, v) -> v.jsonPrimitive.intOrNull?.let { k to it } }.toMap())
            } catch (e: Exception) { SpellSlotMap() }
        } else SpellSlotMap()

        val profsJson = rs.getString("proficiencies")
        val profs = if (!profsJson.isNullOrBlank() && profsJson != "null") {
            try { json.decodeFromString<CharacterProficiencies>(profsJson) } catch (e: Exception) { CharacterProficiencies() }
        } else CharacterProficiencies()

        val manualJson = rs.getString("manual_proficiencies")
        val manual = if (!manualJson.isNullOrBlank() && manualJson != "null") {
            try { json.decodeFromString<ManualProficiencies>(manualJson) } catch (e: Exception) { ManualProficiencies() }
        } else ManualProficiencies()

        val featsJson = rs.getString("feats")
        val feats = parseCharacterFeatsJson(featsJson)

        val traitsJson = rs.getString("traits")
        val traits = parseCharacterTraitsJson(traitsJson)

        val activeModsJson = rs.getString("active_modifiers")
        val activeMods = if (!activeModsJson.isNullOrBlank() && activeModsJson != "null") {
            try { json.decodeFromString<Array<ActiveModifier>>(activeModsJson) } catch (e: Exception) { emptyArray() }
        } else emptyArray()

        // Load joins
        val classes = mutableListOf<CharacterClass>()
        conn.prepareStatement("SELECT * FROM character_classes WHERE character_id = ?").use { ps ->
            ps.setInt(1, id)
            ps.executeQuery().use { crs ->
                while (crs.next()) {
                    val cId = crs.getString("class_id")
                    val sId = crs.getString("subclass_id")
                    val ruleClass = catalog.classes.find { it.id == cId }
                    val ruleSub = sId?.let { catalog.subclasses.find { s -> s.id == it } }
                    classes.add(
                        CharacterClass(
                            characterId = id,
                            classId = cId,
                            subclassId = sId,
                            level = crs.getInt("level"),
                            className = ruleClass?.name ?: cId,
                            subclassName = ruleSub?.name,
                            hitDie = ruleClass?.hitDie ?: 8,
                            hitDiceUsed = crs.getIntOrDefault("hit_dice_used", 0)
                        )
                    )
                }
            }
        }

        val spells = mutableListOf<CharacterSpell>()
        conn.prepareStatement("SELECT * FROM character_spells WHERE character_id = ?").use { ps ->
            ps.setInt(1, id)
            ps.executeQuery().use { srs ->
                while (srs.next()) {
                    val spId = srs.getString("spell_id")
                    val ruleSp = catalog.spells.find { it.id == spId }
                    spells.add(
                        CharacterSpell(
                            characterId = id,
                            spellId = spId,
                            prepared = srs.getBoolean("prepared"),
                            isRitual = srs.getBoolean("is_ritual"),
                            isConcentrating = srs.getBoolean("is_concentrating"),
                            source = srs.getString("source") ?: "class",
                            alwaysPrepared = srs.getBoolean("always_prepared"),
                            spell = ruleSp,
                            spellName = ruleSp?.name ?: spId,
                            spellLevel = ruleSp?.level ?: 0
                        )
                    )
                }
            }
        }

        val inventory = mutableListOf<CharacterInventoryItem>()
        conn.prepareStatement("SELECT * FROM character_inventory WHERE character_id = ? ORDER BY id ASC").use { ps ->
            ps.setInt(1, id)
            ps.executeQuery().use { irs ->
                while (irs.next()) {
                    val itemId = irs.getString("item_id")
                    val ruleItem = catalog.items.find { it.id == itemId }
                    val currUses = irs.getInt("current_uses").let { if (irs.wasNull()) null else it }
                    inventory.add(
                        CharacterInventoryItem(
                            id = irs.getInt("id"),
                            characterId = id,
                            itemId = itemId,
                            quantity = irs.getInt("quantity"),
                            equipped = irs.getBoolean("equipped"),
                            isIdentified = irs.getBoolean("is_identified"),
                            isAttuned = irs.getBoolean("is_attuned"),
                            currentUses = currUses,
                            item = ruleItem,
                            itemName = ruleItem?.name ?: itemId,
                            itemCategory = ruleItem?.category ?: "misc"
                        )
                    )
                }
            }
        }

        val conditions = mutableListOf<CharacterCondition>()
        conn.prepareStatement("SELECT * FROM character_conditions WHERE character_id = ?").use { ps ->
            ps.setInt(1, id)
            ps.executeQuery().use { crs ->
                while (crs.next()) {
                    val condId = crs.getString("condition_id")
                    val ruleCond = catalog.conditions.find { it.id == condId }
                    conditions.add(
                        CharacterCondition(
                            id = crs.getInt("id"),
                            characterId = id,
                            conditionId = condId,
                            duration = crs.getString("duration"),
                            isPermanent = crs.getBoolean("is_permanent"),
                            source = crs.getString("source"),
                            condition = ruleCond,
                            conditionName = ruleCond?.name ?: condId
                        )
                    )
                }
            }
        }

        val resources = mutableListOf<CharacterResource>()
        conn.prepareStatement("SELECT * FROM character_resources WHERE character_id = ?").use { ps ->
            ps.setInt(1, id)
            ps.executeQuery().use { rrs ->
                while (rrs.next()) {
                    val resId = rrs.getString("resource_id")
                    val ruleRes = catalog.resources.find { it.id == resId }
                    resources.add(
                        CharacterResource(
                            characterId = id,
                            resourceId = resId,
                            usedUses = rrs.getInt("used_uses"),
                            resource = ruleRes,
                            resourceName = ruleRes?.name ?: resId,
                            maxFormula = ruleRes?.maxFormula,
                            rechargeOn = ruleRes?.rechargeOn
                        )
                    )
                }
            }
        }

        val languages = mutableListOf<CharacterLanguage>()
        conn.prepareStatement("SELECT * FROM character_languages WHERE character_id = ?").use { ps ->
            ps.setInt(1, id)
            ps.executeQuery().use { lrs ->
                while (lrs.next()) {
                    val langId = lrs.getString("language_id")
                    val ruleLang = catalog.languages.find { it.id == langId }
                    languages.add(
                        CharacterLanguage(
                            id = 0,
                            characterId = id,
                            languageId = langId,
                            languageName = ruleLang?.name ?: langId,
                            languageScript = ruleLang?.script
                        )
                    )
                }
            }
        }

        val events = mutableListOf<CharacterEvent>()
        conn.prepareStatement("SELECT * FROM character_events WHERE character_id = ? ORDER BY id DESC LIMIT 40").use { ps ->
            ps.setInt(1, id)
            ps.executeQuery().use { ers ->
                while (ers.next()) {
                    events.add(
                        CharacterEvent(
                            id = ers.getInt("id"),
                            characterId = id,
                            eventType = ers.getString("event_type"),
                            title = ers.getString("title"),
                            summary = ers.getString("summary"),
                            payloadJson = ers.getString("payload"),
                            createdAt = ers.getTimestamp("created_at")?.toInstant()?.toString() ?: ""
                        )
                    )
                }
            }
        }

        val quests = loadCharacterQuests(conn, id)
        val hpRollsJson = rs.getStringOrNull("hp_rolls")
        val hpRolls = if (!hpRollsJson.isNullOrBlank() && hpRollsJson != "null") {
            try { json.decodeFromString<Array<HpRollEntry>>(hpRollsJson) } catch (e: Exception) { emptyArray() }
        } else emptyArray()

        return Character(
            id = id,
            name = rs.getString("name"),
            raceId = raceId,
            raceEntry = catalog.races.find { it.id == raceId },
            backgroundId = bgId,
            background = bgId?.let { catalog.backgrounds.find { b -> b.id == it } },
            alignment = rs.getString("alignment"),
            xp = rs.getInt("xp"),
            level = rs.getInt("level"),
            str = rs.getInt("str"),
            dex = rs.getInt("dex"),
            con = rs.getInt("con"),
            int = rs.getInt("int"),
            wis = rs.getInt("wis"),
            cha = rs.getInt("cha"),
            hpCurrent = rs.getInt("hp_current"),
            hpMax = rs.getInt("hp_max"),
            tempHp = rs.getInt("temp_hp"),
            hpRolls = hpRolls,
            resistances = rs.getStringArray("resistances"),
            immunities = rs.getStringArray("immunities"),
            vulnerabilities = rs.getStringArray("vulnerabilities"),
            speed = rs.getInt("speed"),
            initiativeBonus = rs.getInt("initiative_bonus"),
            armorClass = ac,
            hitDiceCurrent = rs.getInt("hit_dice_current"),
            hitDiceMax = rs.getInt("hit_dice_max"),
            deathSaveSuccess = rs.getInt("death_save_success"),
            deathSaveFailure = rs.getInt("death_save_failure"),
            inspiration = rs.getBoolean("inspiration"),
            exhaustion = rs.getInt("exhaustion"),
            usedSpellSlots = usedSlots,
            usedPactSlots = rs.getInt("used_pact_slots"),
            cp = rs.getInt("cp"),
            sp = rs.getInt("sp"),
            ep = rs.getInt("ep"),
            gp = rs.getInt("gp"),
            pp = rs.getInt("pp"),
            languages = languages.toTypedArray(),
            manualProficiencies = manual,
            proficiencies = profs,
            feats = feats,
            traits = traits,
            classes = classes.toTypedArray(),
            spells = spells.toTypedArray(),
            inventory = inventory.toTypedArray(),
            conditions = conditions.toTypedArray(),
            resources = resources.toTypedArray(),
            abilityPointPool = rs.getInt("ability_point_pool"),
            size = rs.getString("size") ?: "Medium",
            appearance = rs.getString("appearance"),
            backstory = rs.getString("backstory"),
            notes = rs.getString("notes"),
            imageUrl = rs.getString("image_url"),
            activeModifiers = activeMods,
            quests = quests,
            events = events.toTypedArray(),
            createdAt = rs.getTimestamp("created_at")?.toInstant()?.toString() ?: "",
            updatedAt = rs.getTimestamp("updated_at")?.toInstant()?.toString() ?: ""
        )
    }

    private fun loadCharacterQuests(conn: Connection, characterId: Int): Array<Quest> {
        val quests = mutableListOf<Quest>()
        conn.prepareStatement("SELECT * FROM quests WHERE character_id = ? ORDER BY updated_at DESC").use { ps ->
            ps.setInt(1, characterId)
            ps.executeQuery().use { qrs ->
                while (qrs.next()) {
                    val qId = qrs.getInt("id")
                    val objectives = mutableListOf<QuestObjective>()
                    conn.prepareStatement("SELECT * FROM quest_objectives WHERE quest_id = ? ORDER BY \"order\" ASC, id ASC").use { ops ->
                        ops.setInt(1, qId)
                        ops.executeQuery().use { ors ->
                            while (ors.next()) {
                                objectives.add(
                                    QuestObjective(
                                        id = ors.getInt("id"),
                                        questId = qId,
                                        description = ors.getString("description"),
                                        isCompleted = ors.getBoolean("is_completed"),
                                        order = ors.getInt("order")
                                    )
                                )
                            }
                        }
                    }
                    val logs = mutableListOf<QuestLog>()
                    conn.prepareStatement("SELECT * FROM quest_logs WHERE quest_id = ? ORDER BY created_at DESC").use { lps ->
                        lps.setInt(1, qId)
                        lps.executeQuery().use { lrs ->
                            while (lrs.next()) {
                                logs.add(
                                    QuestLog(
                                        id = lrs.getInt("id"),
                                        questId = qId,
                                        content = lrs.getString("content"),
                                        createdAt = lrs.getTimestamp("created_at")?.toInstant()?.toString() ?: ""
                                    )
                                )
                            }
                        }
                    }
                    quests.add(
                        Quest(
                            id = qId,
                            characterId = characterId,
                            title = qrs.getString("title"),
                            description = qrs.getString("description"),
                            status = qrs.getString("status") ?: "active",
                            isTracked = qrs.getBoolean("is_tracked"),
                            category = qrs.getString("category") ?: "main",
                            giver = qrs.getString("giver"),
                            location = qrs.getString("location"),
                            rewardXp = qrs.getInt("reward_xp"),
                            rewardGp = qrs.getInt("reward_gp"),
                            rewardNotes = qrs.getString("reward_notes"),
                            rewardsClaimed = qrs.getBoolean("rewards_claimed"),
                            objectives = objectives.toTypedArray(),
                            logs = logs.toTypedArray(),
                            createdAt = qrs.getTimestamp("created_at")?.toInstant()?.toString() ?: "",
                            updatedAt = qrs.getTimestamp("updated_at")?.toInstant()?.toString() ?: ""
                        )
                    )
                }
            }
        }
        return quests.toTypedArray()
    }

    /**
     * Persists the updated character state and any newly emitted CharacterEvents inside a single transaction.
     */
    fun saveEngineResult(result: EngineResult): EngineResult {
        val char = result.character
        dataSource.connection.use { conn ->
            conn.autoCommit = false
            try {
                // 1. Update core character row (including active_modifiers, defenses, feats, traits, proficiencies!)
                val resArr = conn.createArrayOf("text", char.resistances)
                val immArr = conn.createArrayOf("text", char.immunities)
                val vulnArr = conn.createArrayOf("text", char.vulnerabilities)
                conn.prepareStatement(
                    """
                    UPDATE characters SET
                        name = ?, race = ?, background_id = ?, alignment = ?,
                        xp = ?, level = ?,
                        str = ?, dex = ?, con = ?, int = ?, wis = ?, cha = ?,
                        hp_current = ?, hp_max = ?, temp_hp = ?, hp_rolls = ?::jsonb,
                        resistances = ?, immunities = ?, vulnerabilities = ?,
                        armor_class = ?, speed = ?, initiative_bonus = ?,
                        hit_dice_current = ?, hit_dice_max = ?,
                        death_save_success = ?, death_save_failure = ?,
                        inspiration = ?, exhaustion = ?,
                        used_spell_slots = ?::jsonb, used_pact_slots = ?,
                        cp = ?, sp = ?, ep = ?, gp = ?, pp = ?,
                        manual_proficiencies = ?::jsonb, proficiencies = ?::jsonb,
                        feats = ?::jsonb, traits = ?::jsonb, active_modifiers = ?::jsonb,
                        ability_point_pool = ?, size = ?, appearance = ?, backstory = ?, notes = ?,
                        updated_at = NOW()
                    WHERE id = ?
                    """.trimIndent()
                ).use { ps ->
                    ps.setString(1, char.name)
                    ps.setString(2, char.raceId)
                    ps.setString(3, char.backgroundId)
                    ps.setString(4, char.alignment)
                    ps.setInt(5, char.xp)
                    ps.setInt(6, char.level)
                    ps.setInt(7, char.str)
                    ps.setInt(8, char.dex)
                    ps.setInt(9, char.con)
                    ps.setInt(10, char.int)
                    ps.setInt(11, char.wis)
                    ps.setInt(12, char.cha)
                    ps.setInt(13, char.hpCurrent)
                    ps.setInt(14, char.hpMax)
                    ps.setInt(15, char.tempHp)
                    ps.setString(16, json.encodeToString(char.hpRolls))
                    ps.setArray(17, resArr)
                    ps.setArray(18, immArr)
                    ps.setArray(19, vulnArr)
                    if (char.armorClass != null) ps.setInt(20, char.armorClass!!) else ps.setNull(20, java.sql.Types.INTEGER)
                    ps.setInt(21, char.speed)
                    ps.setInt(22, char.initiativeBonus)
                    ps.setInt(23, char.hitDiceCurrent)
                    ps.setInt(24, char.hitDiceMax)
                    ps.setInt(25, char.deathSaveSuccess)
                    ps.setInt(26, char.deathSaveFailure)
                    ps.setBoolean(27, char.inspiration)
                    ps.setInt(28, char.exhaustion)
                    ps.setString(29, json.encodeToString(char.usedSpellSlots?.slots ?: emptyMap()))
                    ps.setInt(30, char.usedPactSlots)
                    ps.setInt(31, char.cp)
                    ps.setInt(32, char.sp)
                    ps.setInt(33, char.ep)
                    ps.setInt(34, char.gp)
                    ps.setInt(35, char.pp)
                    ps.setString(36, json.encodeToString(char.manualProficiencies ?: ManualProficiencies()))
                    ps.setString(37, json.encodeToString(char.proficiencies ?: CharacterProficiencies()))
                    ps.setString(38, json.encodeToString(char.feats ?: emptyArray()))
                    ps.setString(39, json.encodeToString(char.traits ?: emptyArray()))
                    ps.setString(40, json.encodeToString(char.activeModifiers ?: emptyArray()))
                    ps.setInt(41, char.abilityPointPool)
                    ps.setString(42, char.size)
                    ps.setString(43, char.appearance)
                    ps.setString(44, char.backstory)
                    ps.setString(45, char.notes)
                    ps.setInt(46, char.id)
                    ps.executeUpdate()
                }

                // 2. Upsert Character Classes + remove dropped classes (preserves per-class hit_dice_used)
                val classRows = (char.classes ?: emptyArray()).distinctBy { it.classId }
                if (classRows.isEmpty()) {
                    conn.prepareStatement("DELETE FROM character_classes WHERE character_id = ?").use { ps ->
                        ps.setInt(1, char.id)
                        ps.executeUpdate()
                    }
                } else {
                    val keepClassIds = conn.createArrayOf("text", classRows.map { it.classId }.toTypedArray())
                    conn.prepareStatement("DELETE FROM character_classes WHERE character_id = ? AND NOT (class_id = ANY(?))").use { ps ->
                        ps.setInt(1, char.id)
                        ps.setArray(2, keepClassIds)
                        ps.executeUpdate()
                    }
                    conn.prepareStatement(
                        """
                        INSERT INTO character_classes (character_id, class_id, subclass_id, level, hit_dice_used)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT (character_id, class_id) DO UPDATE SET
                            subclass_id = EXCLUDED.subclass_id,
                            level = EXCLUDED.level,
                            hit_dice_used = EXCLUDED.hit_dice_used
                        """.trimIndent()
                    ).use { ps ->
                        classRows.forEach { cls ->
                            ps.setInt(1, char.id)
                            ps.setString(2, cls.classId)
                            ps.setString(3, cls.subclassId)
                            ps.setInt(4, cls.level)
                            ps.setInt(5, cls.hitDiceUsed.coerceIn(0, cls.level))
                            ps.addBatch()
                        }
                        ps.executeBatch()
                    }
                }

                // 3. Upsert Character Spells + prune removed spells
                val spellRows = (char.spells ?: emptyArray()).distinctBy { it.spellId }
                if (spellRows.isEmpty()) {
                    conn.prepareStatement("DELETE FROM character_spells WHERE character_id = ?").use { ps ->
                        ps.setInt(1, char.id)
                        ps.executeUpdate()
                    }
                } else {
                    val keepSpellIds = conn.createArrayOf("text", spellRows.map { it.spellId }.toTypedArray())
                    conn.prepareStatement("DELETE FROM character_spells WHERE character_id = ? AND NOT (spell_id = ANY(?))").use { ps ->
                        ps.setInt(1, char.id)
                        ps.setArray(2, keepSpellIds)
                        ps.executeUpdate()
                    }
                    conn.prepareStatement(
                        """
                        INSERT INTO character_spells (character_id, spell_id, prepared, is_ritual, is_concentrating, source, always_prepared)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (character_id, spell_id) DO UPDATE SET
                            prepared = EXCLUDED.prepared,
                            is_ritual = EXCLUDED.is_ritual,
                            is_concentrating = EXCLUDED.is_concentrating,
                            source = EXCLUDED.source,
                            always_prepared = EXCLUDED.always_prepared
                        """.trimIndent()
                    ).use { ps ->
                        spellRows.forEach { sp ->
                            ps.setInt(1, char.id)
                            ps.setString(2, sp.spellId)
                            ps.setBoolean(3, sp.prepared)
                            ps.setBoolean(4, sp.isRitual)
                            ps.setBoolean(5, sp.isConcentrating)
                            ps.setString(6, sp.source)
                            ps.setBoolean(7, sp.alwaysPrepared)
                            ps.addBatch()
                        }
                        ps.executeBatch()
                    }
                }

                // 4. Delta Sync Character Inventory (no destructive DELETE-all and no concurrent-unsafe setval!)
                val dbInvIds = mutableSetOf<Int>()
                conn.prepareStatement("SELECT id FROM character_inventory WHERE character_id = ?").use { ps ->
                    ps.setInt(1, char.id)
                    ps.executeQuery().use { rs ->
                        while (rs.next()) dbInvIds.add(rs.getInt("id"))
                    }
                }
                val incomingInv = (char.inventory ?: emptyArray()).toList()
                val updateInvItems = incomingInv.filter { it.id > 0 && dbInvIds.contains(it.id) }
                val insertInvItems = incomingInv.filter { it.id <= 0 || !dbInvIds.contains(it.id) }
                val keepInvIds = updateInvItems.map { it.id }.toSet()
                val deleteInvIds = dbInvIds.filter { !keepInvIds.contains(it) }

                if (deleteInvIds.isNotEmpty()) {
                    val delArr = conn.createArrayOf("integer", deleteInvIds.toTypedArray())
                    conn.prepareStatement("DELETE FROM character_inventory WHERE character_id = ? AND id = ANY(?)").use { ps ->
                        ps.setInt(1, char.id)
                        ps.setArray(2, delArr)
                        ps.executeUpdate()
                    }
                }
                if (updateInvItems.isNotEmpty()) {
                    conn.prepareStatement(
                        """
                        UPDATE character_inventory SET
                            item_id = ?, quantity = ?, equipped = ?, is_identified = ?, is_attuned = ?, current_uses = ?
                        WHERE id = ? AND character_id = ?
                        """.trimIndent()
                    ).use { ps ->
                        updateInvItems.forEach { inv ->
                            ps.setString(1, inv.itemId)
                            ps.setInt(2, inv.quantity)
                            ps.setBoolean(3, inv.equipped)
                            ps.setBoolean(4, inv.isIdentified)
                            ps.setBoolean(5, inv.isAttuned)
                            if (inv.currentUses != null) ps.setInt(6, inv.currentUses!!) else ps.setNull(6, java.sql.Types.INTEGER)
                            ps.setInt(7, inv.id)
                            ps.setInt(8, char.id)
                            ps.addBatch()
                        }
                        ps.executeBatch()
                    }
                }
                if (insertInvItems.isNotEmpty()) {
                    conn.prepareStatement(
                        "INSERT INTO character_inventory (character_id, item_id, quantity, equipped, is_identified, is_attuned, current_uses) VALUES (?, ?, ?, ?, ?, ?, ?)"
                    ).use { ps ->
                        insertInvItems.forEach { inv ->
                            ps.setInt(1, char.id)
                            ps.setString(2, inv.itemId)
                            ps.setInt(3, inv.quantity)
                            ps.setBoolean(4, inv.equipped)
                            ps.setBoolean(5, inv.isIdentified)
                            ps.setBoolean(6, inv.isAttuned)
                            if (inv.currentUses != null) ps.setInt(7, inv.currentUses!!) else ps.setNull(7, java.sql.Types.INTEGER)
                            ps.addBatch()
                        }
                        ps.executeBatch()
                    }
                }

                // 5. Upsert Character Conditions + prune removed
                val condRows = (char.conditions ?: emptyArray()).distinctBy { it.conditionId }
                if (condRows.isEmpty()) {
                    conn.prepareStatement("DELETE FROM character_conditions WHERE character_id = ?").use { ps ->
                        ps.setInt(1, char.id)
                        ps.executeUpdate()
                    }
                } else {
                    val keepCondIds = conn.createArrayOf("text", condRows.map { it.conditionId }.toTypedArray())
                    conn.prepareStatement("DELETE FROM character_conditions WHERE character_id = ? AND NOT (condition_id = ANY(?))").use { ps ->
                        ps.setInt(1, char.id)
                        ps.setArray(2, keepCondIds)
                        ps.executeUpdate()
                    }
                    conn.prepareStatement(
                        """
                        INSERT INTO character_conditions (character_id, condition_id, duration, is_permanent, source)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT (character_id, condition_id) DO UPDATE SET
                            duration = EXCLUDED.duration,
                            is_permanent = EXCLUDED.is_permanent,
                            source = EXCLUDED.source
                        """.trimIndent()
                    ).use { ps ->
                        condRows.forEach { cond ->
                            ps.setInt(1, char.id)
                            ps.setString(2, cond.conditionId)
                            ps.setString(3, cond.duration)
                            ps.setBoolean(4, cond.isPermanent ?: false)
                            ps.setString(5, cond.source)
                            ps.addBatch()
                        }
                        ps.executeBatch()
                    }
                }

                // 6. Upsert Character Resources + prune removed
                val resRows = (char.resources ?: emptyArray()).distinctBy { it.resourceId }
                if (resRows.isEmpty()) {
                    conn.prepareStatement("DELETE FROM character_resources WHERE character_id = ?").use { ps ->
                        ps.setInt(1, char.id)
                        ps.executeUpdate()
                    }
                } else {
                    val keepResIds = conn.createArrayOf("text", resRows.map { it.resourceId }.toTypedArray())
                    conn.prepareStatement("DELETE FROM character_resources WHERE character_id = ? AND NOT (resource_id = ANY(?))").use { ps ->
                        ps.setInt(1, char.id)
                        ps.setArray(2, keepResIds)
                        ps.executeUpdate()
                    }
                    conn.prepareStatement(
                        """
                        INSERT INTO character_resources (character_id, resource_id, used_uses)
                        VALUES (?, ?, ?)
                        ON CONFLICT (character_id, resource_id) DO UPDATE SET
                            used_uses = EXCLUDED.used_uses
                        """.trimIndent()
                    ).use { ps ->
                        resRows.forEach { res ->
                            ps.setInt(1, char.id)
                            ps.setString(2, res.resourceId)
                            ps.setInt(3, res.usedUses.coerceAtLeast(0))
                            ps.addBatch()
                        }
                        ps.executeBatch()
                    }
                }

                // 7. Upsert Character Languages + prune removed
                val langRows = (char.languages ?: emptyArray()).distinctBy { it.languageId }
                if (langRows.isEmpty()) {
                    conn.prepareStatement("DELETE FROM character_languages WHERE character_id = ?").use { ps ->
                        ps.setInt(1, char.id)
                        ps.executeUpdate()
                    }
                } else {
                    val keepLangIds = conn.createArrayOf("text", langRows.map { it.languageId }.toTypedArray())
                    conn.prepareStatement("DELETE FROM character_languages WHERE character_id = ? AND NOT (language_id = ANY(?))").use { ps ->
                        ps.setInt(1, char.id)
                        ps.setArray(2, keepLangIds)
                        ps.executeUpdate()
                    }
                    conn.prepareStatement(
                        "INSERT INTO character_languages (character_id, language_id) VALUES (?, ?) ON CONFLICT (character_id, language_id) DO NOTHING"
                    ).use { ps ->
                        langRows.forEach { lang ->
                            ps.setInt(1, char.id)
                            ps.setString(2, lang.languageId)
                            ps.addBatch()
                        }
                        ps.executeBatch()
                    }
                }

                // 8. Append New Character Events
                if (result.events.isNotEmpty()) {
                    val payloadStr = result.lastRollOutcome?.let { json.encodeToString(it) }
                    conn.prepareStatement(
                        "INSERT INTO character_events (character_id, event_type, title, summary, payload) VALUES (?, ?, ?, ?, ?::jsonb)"
                    ).use { ps ->
                        result.events.forEach { evt ->
                            ps.setInt(1, char.id)
                            ps.setString(2, evt.eventType)
                            ps.setString(3, evt.title)
                            ps.setString(4, evt.summary)
                            ps.setString(5, evt.payloadJson ?: payloadStr)
                            ps.addBatch()
                        }
                        ps.executeBatch()
                    }
                }

                conn.commit()
            } catch (e: Exception) {
                conn.rollback()
                throw e
            } finally {
                conn.autoCommit = true
            }
        }

        // Reload fresh character from DB so all auto-generated IDs & timestamps are exact
        val freshChar = getCharacter(char.id) ?: char
        val freshSheet = GameEngine.resolve(freshChar, getRulesCatalog())
        return result.copy(character = freshSheet.character, sheet = freshSheet)
    }

    // --- Quest & DM Operations ---

    fun handleQuestCommand(characterId: Int, command: GameCommandPayload): ResolvedCharacterSheet? {
        dataSource.connection.use { conn ->
            when (command.type.uppercase()) {
                "ADD_QUEST" -> {
                    val title = command.textValue?.takeIf { it.isNotBlank() } ?: "New Quest"
                    val category = command.targetId?.takeIf { it.isNotBlank() } ?: "main"
                    // textValue3 can encode "giver|||location|||rewardNotes"
                    val metaParts = (command.textValue3 ?: "").split("|||")
                    val giver = metaParts.getOrNull(0)?.takeIf { it.isNotBlank() }
                    val location = metaParts.getOrNull(1)?.takeIf { it.isNotBlank() }
                    val rewardNotes = metaParts.getOrNull(2)?.takeIf { it.isNotBlank() }
                    val rewardXp = (command.intValue ?: 0).coerceAtLeast(0)
                    val rewardGp = (command.intValue2 ?: 0).coerceAtLeast(0)
                    val isTracked = command.boolValue ?: true

                    var createdQuestId: Int? = null
                    conn.prepareStatement(
                        """
                        INSERT INTO quests (
                            character_id, title, description, status, is_tracked,
                            category, giver, location, reward_xp, reward_gp, reward_notes, rewards_claimed
                        ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, false)
                        RETURNING id
                        """.trimIndent()
                    ).use { ps ->
                        ps.setInt(1, characterId)
                        ps.setString(2, title)
                        ps.setString(3, command.textValue2)
                        ps.setBoolean(4, isTracked)
                        ps.setString(5, category)
                        ps.setString(6, giver)
                        ps.setString(7, location)
                        ps.setInt(8, rewardXp)
                        ps.setInt(9, rewardGp)
                        ps.setString(10, rewardNotes)
                        ps.executeQuery().use { rs ->
                            if (rs.next()) createdQuestId = rs.getInt("id")
                        }
                    }

                    // If secondaryId contains newline-separated initial objectives, insert them
                    val initialObjectives = (command.secondaryId ?: "")
                        .lines()
                        .map { it.trim() }
                        .filter { it.isNotEmpty() }
                    if (createdQuestId != null && initialObjectives.isNotEmpty()) {
                        conn.prepareStatement(
                            "INSERT INTO quest_objectives (quest_id, description, is_completed, \"order\") VALUES (?, ?, false, ?)"
                        ).use { ops ->
                            initialObjectives.forEachIndexed { idx, objDesc ->
                                ops.setInt(1, createdQuestId!!)
                                ops.setString(2, objDesc)
                                ops.setInt(3, idx)
                                ops.addBatch()
                            }
                            ops.executeBatch()
                        }
                    }

                    conn.prepareStatement(
                        "INSERT INTO character_events (character_id, event_type, title, summary) VALUES (?, 'quest', ?, ?)"
                    ).use { eps ->
                        eps.setInt(1, characterId)
                        eps.setString(2, "New Quest: $title")
                        eps.setString(
                            3,
                            listOfNotNull(
                                category.uppercase(),
                                giver?.let { "Giver: $it" },
                                location?.let { "Location: $it" },
                                if (rewardXp > 0 || rewardGp > 0) "Rewards: +$rewardXp XP, +$rewardGp GP" else null
                            ).joinToString(" • ")
                        )
                        eps.executeUpdate()
                    }
                }
                "UPDATE_QUEST" -> {
                    val qId = command.intValue ?: return null
                    val metaParts = command.secondaryId?.split("|||")
                    val category = command.targetId?.takeIf { it.isNotBlank() }
                    val giver = metaParts?.getOrNull(0)?.takeIf { it.isNotBlank() }
                    val location = metaParts?.getOrNull(1)?.takeIf { it.isNotBlank() }
                    val rewardNotes = metaParts?.getOrNull(2)?.takeIf { it.isNotBlank() }

                    conn.prepareStatement(
                        """
                        UPDATE quests SET
                            title = COALESCE(?, title),
                            description = COALESCE(?, description),
                            status = COALESCE(?, status),
                            is_tracked = COALESCE(?, is_tracked),
                            category = COALESCE(?, category),
                            giver = COALESCE(?, giver),
                            location = COALESCE(?, location),
                            reward_xp = COALESCE(?, reward_xp),
                            reward_gp = COALESCE(?, reward_gp),
                            reward_notes = COALESCE(?, reward_notes),
                            updated_at = NOW()
                        WHERE id = ?
                        """.trimIndent()
                    ).use { ps ->
                        ps.setString(1, command.textValue)
                        ps.setString(2, command.textValue2)
                        ps.setString(3, command.textValue3)
                        if (command.boolValue != null) ps.setBoolean(4, command.boolValue!!) else ps.setNull(4, java.sql.Types.BOOLEAN)
                        ps.setString(5, category)
                        ps.setString(6, giver)
                        ps.setString(7, location)
                        if (command.amount != null) ps.setInt(8, command.amount!!) else ps.setNull(8, java.sql.Types.INTEGER)
                        if (command.intValue2 != null) ps.setInt(9, command.intValue2!!) else ps.setNull(9, java.sql.Types.INTEGER)
                        ps.setString(10, rewardNotes)
                        ps.setInt(11, qId)
                        ps.executeUpdate()
                    }
                }
                "CLAIM_QUEST_REWARDS" -> {
                    val qId = command.intValue ?: return null
                    var qTitle = "Quest"
                    var rewardXp = 0
                    var rewardGp = 0
                    var rewardNotes: String? = null
                    var alreadyClaimed = false

                    conn.prepareStatement("SELECT title, reward_xp, reward_gp, reward_notes, rewards_claimed FROM quests WHERE id = ? AND character_id = ?").use { ps ->
                        ps.setInt(1, qId)
                        ps.setInt(2, characterId)
                        ps.executeQuery().use { rs ->
                            if (rs.next()) {
                                qTitle = rs.getString("title") ?: "Quest"
                                rewardXp = rs.getInt("reward_xp")
                                rewardGp = rs.getInt("reward_gp")
                                rewardNotes = rs.getString("reward_notes")
                                alreadyClaimed = rs.getBoolean("rewards_claimed")
                            }
                        }
                    }

                    conn.prepareStatement(
                        "UPDATE quests SET status = 'completed', rewards_claimed = true, is_tracked = false, updated_at = NOW() WHERE id = ?"
                    ).use { ps ->
                        ps.setInt(1, qId)
                        ps.executeUpdate()
                    }
                    conn.prepareStatement("UPDATE quest_objectives SET is_completed = true WHERE quest_id = ?").use { ps ->
                        ps.setInt(1, qId)
                        ps.executeUpdate()
                    }

                    if (!alreadyClaimed && (rewardXp > 0 || rewardGp > 0)) {
                        conn.prepareStatement(
                            "UPDATE characters SET xp = xp + ?, gp = gp + ?, updated_at = NOW() WHERE id = ?"
                        ).use { ps ->
                            ps.setInt(1, rewardXp.coerceAtLeast(0))
                            ps.setInt(2, rewardGp.coerceAtLeast(0))
                            ps.setInt(3, characterId)
                            ps.executeUpdate()
                        }
                    }

                    val rewardSummary = buildList {
                        if (rewardXp > 0) add("+$rewardXp XP")
                        if (rewardGp > 0) add("+$rewardGp GP")
                        if (!rewardNotes.isNullOrBlank()) add(rewardNotes!!)
                    }.joinToString(" • ").ifBlank { "Quest Completed" }

                    conn.prepareStatement("INSERT INTO quest_logs (quest_id, content) VALUES (?, ?)").use { ps ->
                        ps.setInt(1, qId)
                        ps.setString(2, "[Completed] Quest completed & rewards claimed: $rewardSummary")
                        ps.executeUpdate()
                    }
                    conn.prepareStatement(
                        "INSERT INTO character_events (character_id, event_type, title, summary) VALUES (?, 'level_up', ?, ?)"
                    ).use { eps ->
                        eps.setInt(1, characterId)
                        eps.setString(2, "Quest Completed: $qTitle")
                        eps.setString(3, "Claimed Rewards: $rewardSummary")
                        eps.executeUpdate()
                    }
                }
                "DELETE_QUEST" -> {
                    val qId = command.intValue ?: return null
                    conn.prepareStatement("DELETE FROM quests WHERE id = ?").use { ps ->
                        ps.setInt(1, qId)
                        ps.executeUpdate()
                    }
                }
                "ADD_QUEST_OBJECTIVE" -> {
                    val qId = command.intValue ?: return null
                    conn.prepareStatement("INSERT INTO quest_objectives (quest_id, description, is_completed, \"order\") VALUES (?, ?, false, ?)").use { ps ->
                        ps.setInt(1, qId)
                        ps.setString(2, command.textValue ?: "")
                        ps.setInt(3, command.intValue2 ?: 0)
                        ps.executeUpdate()
                    }
                    conn.prepareStatement("UPDATE quests SET updated_at = NOW() WHERE id = ?").use { ps ->
                        ps.setInt(1, qId)
                        ps.executeUpdate()
                    }
                }
                "TOGGLE_QUEST_OBJECTIVE" -> {
                    val objId = command.intValue ?: return null
                    val nextCompleted = command.boolValue ?: true
                    conn.prepareStatement("UPDATE quest_objectives SET is_completed = ? WHERE id = ?").use { ps ->
                        ps.setBoolean(1, nextCompleted)
                        ps.setInt(2, objId)
                        ps.executeUpdate()
                    }
                }
                "DELETE_QUEST_OBJECTIVE" -> {
                    val objId = command.intValue ?: return null
                    conn.prepareStatement("DELETE FROM quest_objectives WHERE id = ?").use { ps ->
                        ps.setInt(1, objId)
                        ps.executeUpdate()
                    }
                }
                "ADD_QUEST_LOG" -> {
                    val qId = command.intValue ?: return null
                    conn.prepareStatement("INSERT INTO quest_logs (quest_id, content) VALUES (?, ?)").use { ps ->
                        ps.setInt(1, qId)
                        ps.setString(2, command.textValue ?: "")
                        ps.executeUpdate()
                    }
                    conn.prepareStatement("UPDATE quests SET updated_at = NOW() WHERE id = ?").use { ps ->
                        ps.setInt(1, qId)
                        ps.executeUpdate()
                    }
                }
                "DELETE_QUEST_LOG" -> {
                    val logId = command.intValue ?: return null
                    conn.prepareStatement("DELETE FROM quest_logs WHERE id = ?").use { ps ->
                        ps.setInt(1, logId)
                        ps.executeUpdate()
                    }
                }
            }
        }
        val char = getCharacter(characterId) ?: return null
        return GameEngine.resolve(char, getRulesCatalog())
    }

    fun createGlobalItem(item: Item): Item {
        val baseSlug = (item.trueName?.takeIf { it.isNotBlank() } ?: item.name)
            .lowercase()
            .replace(Regex("[^a-z0-9]+"), "-")
            .trim('-')
            .ifBlank { "custom-item" }
        val uniqueId = "$baseSlug-${System.currentTimeMillis() % 10000}"
        val saved = item.copy(id = item.id.ifBlank { uniqueId })

        dataSource.connection.use { conn ->
            val propsArr = conn.createArrayOf("text", saved.properties)
            val tagsArr = conn.createArrayOf("text", saved.tags)
            conn.prepareStatement(
                """
                INSERT INTO items (
                    id, name, type, cost_amount, cost_currency, weight_amount, weight_unit, fixed_weight,
                    category, slot, armor_class, strength_requirement, stealth_disadvantage,
                    damage_dice, versatile_dice, damage_type, weapon_mastery, range,
                    properties, rarity, requires_attunement, is_magical, is_cursed,
                    true_name, shown_effect, true_effect, uses, uses_max, description, tags, modifiers
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb)
                """.trimIndent()
            ).use { ps ->
                ps.setString(1, saved.id)
                ps.setString(2, saved.name)
                ps.setString(3, saved.type)
                ps.setInt(4, saved.costAmount)
                ps.setString(5, saved.costCurrency)
                ps.setDouble(6, saved.weightAmount)
                ps.setString(7, saved.weightUnit)
                ps.setBoolean(8, saved.fixedWeight)
                ps.setString(9, saved.category)
                ps.setString(10, saved.slot)
                if (saved.armorClass != null) ps.setInt(11, saved.armorClass!!) else ps.setNull(11, java.sql.Types.INTEGER)
                if (saved.strengthRequirement != null) ps.setInt(12, saved.strengthRequirement!!) else ps.setNull(12, java.sql.Types.INTEGER)
                ps.setBoolean(13, saved.stealthDisadvantage)
                ps.setString(14, saved.damageDice)
                ps.setString(15, saved.versatileDice)
                ps.setString(16, saved.damageType)
                ps.setString(17, saved.weaponMastery)
                ps.setString(18, saved.range)
                ps.setArray(19, propsArr)
                ps.setString(20, saved.rarity)
                ps.setBoolean(21, saved.requiresAttunement)
                ps.setBoolean(22, saved.isMagical)
                ps.setBoolean(23, saved.isCursed)
                ps.setString(24, saved.trueName)
                ps.setString(25, saved.shownEffect)
                ps.setString(26, saved.trueEffect)
                if (saved.uses != null) ps.setInt(27, saved.uses!!) else ps.setNull(27, java.sql.Types.INTEGER)
                if (saved.usesMax != null) ps.setInt(28, saved.usesMax!!) else ps.setNull(28, java.sql.Types.INTEGER)
                ps.setString(29, saved.description)
                ps.setArray(30, tagsArr)
                ps.setString(31, json.encodeToString(saved.modifiers))
                ps.executeUpdate()
            }
        }
        invalidateCatalogCache()
        return saved
    }

    fun createGlobalSpell(spell: Spell): Spell {
        val baseSlug = spell.name.lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-').ifBlank { "custom-spell" }
        val uniqueId = if (spell.id.isNotBlank()) spell.id else "$baseSlug-${System.currentTimeMillis() % 10000}"
        val saved = spell.copy(id = uniqueId)

        dataSource.connection.use { conn ->
            val classesArr = conn.createArrayOf("text", saved.classes)
            val tagsArr = conn.createArrayOf("text", saved.tags)
            conn.prepareStatement(
                """
                INSERT INTO spells (
                    id, name, level, school, casting_time, range,
                    components, duration, is_ritual, is_concentration,
                    description, classes, tags, mechanics
                ) VALUES (?, ?, ?, ?, ?::casting_time, ?, ?::jsonb, ?::jsonb, ?, ?, ?, ?, ?, ?::jsonb)
                """.trimIndent()
            ).use { ps ->
                ps.setString(1, saved.id)
                ps.setString(2, saved.name)
                ps.setInt(3, saved.level)
                ps.setString(4, saved.school)
                ps.setString(5, saved.castingTime.ifBlank { "1 Action" })
                ps.setString(6, saved.range.ifBlank { "60 feet" })
                ps.setString(7, json.encodeToString(saved.components ?: SpellComponents(v = true, s = true)))
                ps.setString(8, json.encodeToString(saved.duration ?: SpellDuration(type = "instant")))
                ps.setBoolean(9, saved.isRitual)
                ps.setBoolean(10, saved.isConcentration)
                ps.setString(11, saved.description)
                ps.setArray(12, classesArr)
                ps.setArray(13, tagsArr)
                ps.setString(14, json.encodeToString(saved.mechanics ?: SpellMechanics()))
                ps.executeUpdate()
            }
        }
        invalidateCatalogCache()
        return saved
    }

    fun updateAlignment(characterId: Int, alignment: String): Boolean {
        dataSource.connection.use { conn ->
            conn.prepareStatement("UPDATE characters SET alignment = ?, updated_at = NOW() WHERE id = ?").use { ps ->
                ps.setString(1, alignment)
                ps.setInt(2, characterId)
                return ps.executeUpdate() > 0
            }
        }
    }

    fun createCharacter(draft: Character): Character {
        var newId = 0
        dataSource.connection.use { conn ->
            conn.prepareStatement(
                """
                INSERT INTO characters (
                    name, race, background_id, alignment, xp, level,
                    str, dex, con, int, wis, cha,
                    hp_current, hp_max, temp_hp, speed, initiative_bonus,
                    hit_dice_current, hit_dice_max,
                    proficiencies, manual_proficiencies, feats, traits, active_modifiers
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?::jsonb, ?::jsonb, ?::jsonb)
                RETURNING id
                """.trimIndent()
            ).use { ps ->
                ps.setString(1, draft.name)
                ps.setString(2, draft.raceId)
                ps.setString(3, draft.backgroundId)
                ps.setString(4, draft.alignment)
                ps.setInt(5, draft.xp)
                ps.setInt(6, draft.level)
                ps.setInt(7, draft.str)
                ps.setInt(8, draft.dex)
                ps.setInt(9, draft.con)
                ps.setInt(10, draft.int)
                ps.setInt(11, draft.wis)
                ps.setInt(12, draft.cha)
                ps.setInt(13, draft.hpCurrent)
                ps.setInt(14, draft.hpMax)
                ps.setInt(15, draft.tempHp)
                ps.setInt(16, draft.speed)
                ps.setInt(17, draft.initiativeBonus)
                ps.setInt(18, draft.hitDiceCurrent)
                ps.setInt(19, draft.hitDiceMax)
                ps.setString(20, json.encodeToString(draft.proficiencies ?: CharacterProficiencies()))
                ps.setString(21, json.encodeToString(draft.manualProficiencies ?: ManualProficiencies()))
                ps.setString(22, json.encodeToString(draft.feats ?: emptyArray()))
                ps.setString(23, json.encodeToString(draft.traits ?: emptyArray()))
                ps.setString(24, json.encodeToString(draft.activeModifiers ?: emptyArray()))
                ps.executeQuery().use { rs ->
                    if (rs.next()) {
                        newId = rs.getInt("id")
                    }
                }
            }
        }
        val withId = draft.copy(
            id = newId,
            classes = draft.classes?.map { it.copy(characterId = newId) }?.toTypedArray(),
            spells = draft.spells?.map { it.copy(characterId = newId) }?.toTypedArray(),
            inventory = draft.inventory?.map { it.copy(characterId = newId) }?.toTypedArray(),
            resources = draft.resources?.map { it.copy(characterId = newId) }?.toTypedArray(),
            languages = draft.languages?.map { it.copy(characterId = newId) }?.toTypedArray()
        )
        val synced = GameEngine.syncAutoGrantedSpells(withId, getRulesCatalog())
        val resolved = GameEngine.resolve(synced, getRulesCatalog())
        val saved = saveEngineResult(
            EngineResult(
                character = resolved.character,
                sheet = resolved,
                events = arrayOf(
                    CharacterEvent(
                        id = 0,
                        characterId = newId,
                        eventType = "character_created",
                        title = "Character Created",
                        summary = "${draft.name} (Level ${draft.level}) joined the campaign."
                    )
                )
            )
        )
        return saved.character
    }

    fun deleteCharacter(id: Int): Boolean {
        dataSource.connection.use { conn ->
            conn.prepareStatement("DELETE FROM characters WHERE id = ?").use { ps ->
                ps.setInt(1, id)
                return ps.executeUpdate() > 0
            }
        }
    }

    // ==================== Real-Time Shared Battle Map Persistence ====================

    fun getBattleMapState(connectedClients: Int = 1, latestPing: BattleMapPing? = null): BattleMapStatePayload {
        val allSheets = getAllCharacters(includeQuestsAndEvents = false).associateBy { it.character.id }
        val summaries = mutableListOf<BattleMapSceneSummary>()
        var activeScene: BattleMapScene? = null

        dataSource.connection.use { conn ->
            conn.prepareStatement("SELECT * FROM battle_maps ORDER BY is_active DESC, updated_at DESC").use { ps ->
                ps.executeQuery().use { rs ->
                    while (rs.next()) {
                        val id = rs.getString("id")
                        val title = rs.getString("title")
                        val isActive = rs.getBoolean("is_active")
                        val widthFt = rs.getInt("width_ft")
                        val heightFt = rs.getInt("height_ft")
                        val cellSizeFt = rs.getInt("cell_size_ft")
                        summaries.add(
                            BattleMapSceneSummary(
                                id = id,
                                title = title,
                                isActive = isActive,
                                widthFt = widthFt,
                                heightFt = heightFt,
                                cellSizeFt = cellSizeFt
                            )
                        )
                        if (activeScene == null || isActive) {
                            val tokensRaw = rs.getString("tokens") ?: "[]"
                            val shapesRaw = rs.getString("shapes") ?: "[]"
                            val fogRaw = rs.getString("fog_zones") ?: "[]"
                            val aoeRaw = rs.getString("aoe_templates") ?: "[]"

                            val parsedTokens = try {
                                json.decodeFromString<Array<BattleMapToken>>(tokensRaw)
                            } catch (_: Exception) {
                                emptyArray()
                            }
                            // Sync live character AC, Speed, Conditions, and dead/downed state onto player tokens
                            val liveTokens = parsedTokens.map { tk ->
                                val charSheet = tk.characterId?.let { allSheets[it] }
                                if (charSheet != null && tk.tokenType == "player") {
                                    val c = charSheet.character
                                    val liveState = when {
                                        c.hpCurrent <= 0 -> "dead"
                                        c.hpMax > 0 && c.hpCurrent <= (c.hpMax / 2) -> "bloodied"
                                        else -> "alive"
                                    }
                                    val conds = buildList {
                                        charSheet.activeConditions.forEach { add(it.condition.name) }
                                        if (charSheet.concentrationSpellName != null) {
                                            add("Conc: ${charSheet.concentrationSpellName}")
                                        }
                                    }.toTypedArray()
                                    tk.copy(
                                        name = c.name,
                                        speedFt = charSheet.combatStats.speed,
                                        ac = charSheet.combatStats.armorClass,
                                        initiativeMod = charSheet.combatStats.initiative,
                                        state = liveState,
                                        conditions = conds
                                    )
                                } else tk
                            }.toTypedArray()

                            val parsedShapes = try {
                                json.decodeFromString<Array<BattleMapShape>>(shapesRaw)
                            } catch (_: Exception) {
                                emptyArray()
                            }
                            val parsedFog = try {
                                json.decodeFromString<Array<BattleMapFogZone>>(fogRaw)
                            } catch (_: Exception) {
                                emptyArray()
                            }
                            val parsedAoe = try {
                                json.decodeFromString<Array<BattleMapAoeTemplate>>(aoeRaw)
                            } catch (_: Exception) {
                                emptyArray()
                            }

                            if (isActive || activeScene == null) {
                                activeScene = BattleMapScene(
                                    id = id,
                                    title = title,
                                    isActive = isActive,
                                    widthFt = widthFt,
                                    heightFt = heightFt,
                                    cellSizeFt = cellSizeFt,
                                    diagonalRule = rs.getString("diagonal_rule") ?: "standard",
                                    backgroundUrl = rs.getString("background_url"),
                                    gridColor = rs.getString("grid_color") ?: "#475569",
                                    activeTurnTokenId = rs.getString("active_turn_token_id"),
                                    roundNumber = rs.getInt("round_number").coerceAtLeast(1),
                                    tokens = liveTokens,
                                    shapes = parsedShapes,
                                    fogZones = parsedFog,
                                    aoeTemplates = parsedAoe,
                                    lastPing = latestPing
                                )
                            }
                        }
                    }
                }
            }
        }

        val fallback = activeScene ?: BattleMapScene(
            id = "scene-default",
            title = "Default Encounter Arena (160×120 ft)",
            isActive = true
        )

        return BattleMapStatePayload(
            activeScene = fallback,
            scenes = summaries.toTypedArray(),
            connectedClients = connectedClients
        )
    }

    private fun saveBattleMapScene(scene: BattleMapScene) {
        dataSource.connection.use { conn ->
            conn.prepareStatement(
                """
                INSERT INTO battle_maps (
                    id, title, is_active, width_ft, height_ft, cell_size_ft, diagonal_rule,
                    background_url, grid_color, active_turn_token_id, round_number,
                    tokens, shapes, fog_zones, aoe_templates, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?::jsonb, ?::jsonb, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    is_active = EXCLUDED.is_active,
                    width_ft = EXCLUDED.width_ft,
                    height_ft = EXCLUDED.height_ft,
                    cell_size_ft = EXCLUDED.cell_size_ft,
                    diagonal_rule = EXCLUDED.diagonal_rule,
                    background_url = EXCLUDED.background_url,
                    grid_color = EXCLUDED.grid_color,
                    active_turn_token_id = EXCLUDED.active_turn_token_id,
                    round_number = EXCLUDED.round_number,
                    tokens = EXCLUDED.tokens,
                    shapes = EXCLUDED.shapes,
                    fog_zones = EXCLUDED.fog_zones,
                    aoe_templates = EXCLUDED.aoe_templates,
                    updated_at = NOW()
                """.trimIndent()
            ).use { ps ->
                ps.setString(1, scene.id)
                ps.setString(2, scene.title)
                ps.setBoolean(3, scene.isActive)
                ps.setInt(4, scene.widthFt.coerceIn(40, 600))
                ps.setInt(5, scene.heightFt.coerceIn(40, 600))
                ps.setInt(6, scene.cellSizeFt.coerceIn(5, 50))
                ps.setString(7, scene.diagonalRule)
                ps.setString(8, scene.backgroundUrl)
                ps.setString(9, scene.gridColor)
                ps.setString(10, scene.activeTurnTokenId)
                ps.setInt(11, scene.roundNumber.coerceAtLeast(1))
                ps.setString(12, json.encodeToString(scene.tokens))
                ps.setString(13, json.encodeToString(scene.shapes))
                ps.setString(14, json.encodeToString(scene.fogZones))
                ps.setString(15, json.encodeToString(scene.aoeTemplates))
                ps.executeUpdate()
            }
        }
    }

    fun handleBattleMapCommand(
        command: BattleMapCommand,
        connectedClients: Int = 1,
        latestPing: BattleMapPing? = null
    ): BattleMapStatePayload {
        val currentState = getBattleMapState(connectedClients, latestPing)
        var scene = currentState.activeScene

        when (command.type.uppercase()) {
            "MOVE_TOKEN" -> {
                val tId = command.tokenId ?: return currentState
                val nextX = (command.xFt ?: 0.0).coerceIn(0.0, scene.widthFt.toDouble())
                val nextY = (command.yFt ?: 0.0).coerceIn(0.0, scene.heightFt.toDouble())
                scene = scene.copy(
                    tokens = scene.tokens.map { tk ->
                        if (tk.id == tId) tk.copy(xFt = nextX, yFt = nextY) else tk
                    }.toTypedArray()
                )
                saveBattleMapScene(scene)
            }
            "UPSERT_TOKEN" -> {
                val incoming = command.token ?: return currentState
                val list = scene.tokens.toMutableList()
                val idx = list.indexOfFirst { it.id == incoming.id }
                if (idx >= 0) {
                    list[idx] = incoming
                } else {
                    list.add(incoming)
                }
                scene = scene.copy(tokens = list.toTypedArray())
                saveBattleMapScene(scene)
            }
            "SET_TOKEN_STATE" -> {
                val tId = command.tokenId ?: return currentState
                val nextState = command.state ?: "alive"
                scene = scene.copy(
                    tokens = scene.tokens.map { tk ->
                        if (tk.id == tId) tk.copy(state = nextState) else tk
                    }.toTypedArray()
                )
                saveBattleMapScene(scene)
            }
            "ASSIGN_TOKEN_CONTROLLER" -> {
                val tId = command.tokenId ?: return currentState
                // intValue: null or 0 => DM Only, -1 => Any Player (Shared), >0 => Specific Character ID
                val assignedCharId = command.intValue?.takeIf { it != 0 }
                scene = scene.copy(
                    tokens = scene.tokens.map { tk ->
                        if (tk.id == tId) tk.copy(characterId = assignedCharId) else tk
                    }.toTypedArray()
                )
                saveBattleMapScene(scene)
            }
            "TOGGLE_TOKEN_HIDDEN" -> {
                val tId = command.tokenId ?: return currentState
                scene = scene.copy(
                    tokens = scene.tokens.map { tk ->
                        if (tk.id == tId) tk.copy(isHidden = command.boolValue ?: !tk.isHidden) else tk
                    }.toTypedArray()
                )
                saveBattleMapScene(scene)
            }
            "DELETE_TOKEN" -> {
                val tId = command.tokenId ?: return currentState
                scene = scene.copy(tokens = scene.tokens.filter { it.id != tId }.toTypedArray())
                saveBattleMapScene(scene)
            }
            "SYNC_PARTY_TOKENS" -> {
                val allChars = getAllCharacters()
                val currentTokens = scene.tokens.toMutableList()
                val palette = listOf("#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#06b6d4", "#ec4899")
                allChars.forEachIndexed { idx, sheet ->
                    val c = sheet.character
                    val tokId = "char-${c.id}"
                    val initials = c.name
                        .split(" ")
                        .filter { it.isNotBlank() }
                        .take(2)
                        .joinToString("") { it.take(1).uppercase() }
                        .ifBlank { "P${c.id}" }
                    val existingIdx = currentTokens.indexOfFirst { it.id == tokId || it.characterId == c.id }
                    val sizeFt = when (c.size.lowercase()) {
                        "tiny" -> 2.5
                        "large" -> 10.0
                        "huge" -> 15.0
                        "gargantuan" -> 20.0
                        else -> 5.0
                    }
                    if (existingIdx < 0) {
                        currentTokens.add(
                            BattleMapToken(
                                id = tokId,
                                characterId = c.id,
                                name = c.name,
                                label = initials,
                                tokenType = "player",
                                sizeCategory = c.size,
                                sizeFt = sizeFt,
                                xFt = 25.0 + (idx * 10.0),
                                yFt = 40.0 + (idx * 10.0),
                                color = palette[idx % palette.size],
                                state = if (c.hpCurrent <= 0) "dead" else "alive",
                                isHidden = false,
                                speedFt = sheet.combatStats.speed,
                                ac = sheet.combatStats.armorClass
                            )
                        )
                    }
                    // Also sync active companion / Wild Shape if present!
                    val comp = sheet.activeCompanion
                    val compTokId = "comp-${c.id}"
                    val compIdx = currentTokens.indexOfFirst { it.id == compTokId }
                    if (comp != null && compIdx < 0) {
                        currentTokens.add(
                            BattleMapToken(
                                id = compTokId,
                                characterId = c.id,
                                name = "${comp.name} (${c.name})",
                                label = comp.name.take(2).uppercase(),
                                tokenType = "companion",
                                sizeCategory = "Medium",
                                sizeFt = 5.0,
                                xFt = 30.0 + (idx * 10.0),
                                yFt = 45.0 + (idx * 10.0),
                                color = "#10b981",
                                state = "alive",
                                isHidden = false,
                                speedFt = 40,
                                ac = comp.armorClass
                            )
                        )
                    } else if (comp == null && compIdx >= 0) {
                        currentTokens.removeAt(compIdx)
                    }
                }
                scene = scene.copy(tokens = currentTokens.toTypedArray())
                saveBattleMapScene(scene)
            }
            "ADD_SHAPE", "UPDATE_SHAPE" -> {
                val sh = command.shape ?: return currentState
                val list = scene.shapes.toMutableList()
                val idx = list.indexOfFirst { it.id == sh.id }
                if (idx >= 0) list[idx] = sh else list.add(sh)
                scene = scene.copy(shapes = list.toTypedArray())
                saveBattleMapScene(scene)
            }
            "TOGGLE_DOOR" -> {
                val shId = command.textValue ?: return currentState
                scene = scene.copy(
                    shapes = scene.shapes.map { sh ->
                        if (sh.id == shId) sh.copy(isOpen = !sh.isOpen) else sh
                    }.toTypedArray()
                )
                saveBattleMapScene(scene)
            }
            "DELETE_SHAPE" -> {
                val shId = command.textValue ?: return currentState
                scene = scene.copy(shapes = scene.shapes.filter { it.id != shId }.toTypedArray())
                saveBattleMapScene(scene)
            }
            "CLEAR_SHAPES" -> {
                scene = scene.copy(shapes = emptyArray())
                saveBattleMapScene(scene)
            }
            "ADD_FOG" -> {
                val fz = command.fogZone ?: return currentState
                val list = scene.fogZones.toMutableList()
                val idx = list.indexOfFirst { it.id == fz.id }
                if (idx >= 0) list[idx] = fz else list.add(fz)
                scene = scene.copy(fogZones = list.toTypedArray())
                saveBattleMapScene(scene)
            }
            "DELETE_FOG" -> {
                val fId = command.textValue ?: return currentState
                scene = scene.copy(fogZones = scene.fogZones.filter { it.id != fId }.toTypedArray())
                saveBattleMapScene(scene)
            }
            "CLEAR_FOG" -> {
                scene = scene.copy(fogZones = emptyArray())
                saveBattleMapScene(scene)
            }
            "UPSERT_AOE" -> {
                val aoe = command.aoeTemplate ?: return currentState
                val list = scene.aoeTemplates.toMutableList()
                val idx = list.indexOfFirst { it.id == aoe.id }
                if (idx >= 0) list[idx] = aoe else list.add(aoe)
                scene = scene.copy(aoeTemplates = list.toTypedArray())
                saveBattleMapScene(scene)
            }
            "DELETE_AOE" -> {
                val aoeId = command.textValue ?: return currentState
                scene = scene.copy(aoeTemplates = scene.aoeTemplates.filter { it.id != aoeId }.toTypedArray())
                saveBattleMapScene(scene)
            }
            "CLEAR_AOE" -> {
                scene = scene.copy(aoeTemplates = emptyArray())
                saveBattleMapScene(scene)
            }
            "UPDATE_MAP_SETTINGS" -> {
                scene = scene.copy(
                    title = command.textValue?.takeIf { it.isNotBlank() } ?: scene.title,
                    widthFt = (command.intValue ?: scene.widthFt).coerceIn(40, 600),
                    heightFt = (command.intValue2 ?: scene.heightFt).coerceIn(40, 600),
                    cellSizeFt = (command.intValue3 ?: scene.cellSizeFt).coerceIn(5, 50),
                    diagonalRule = command.textValue2?.takeIf { it.isNotBlank() } ?: scene.diagonalRule,
                    backgroundUrl = if (command.textValue3 != null) command.textValue3?.takeIf { it.isNotBlank() } else scene.backgroundUrl
                )
                saveBattleMapScene(scene)
            }
            "SET_ACTIVE_TURN" -> {
                scene = scene.copy(activeTurnTokenId = command.tokenId)
                saveBattleMapScene(scene)
            }
            "SET_TOKEN_INITIATIVE" -> {
                val tId = command.tokenId ?: return currentState
                val rollVal = command.intValue
                val updatedTokens = scene.tokens.map { tk ->
                    if (tk.id == tId || (command.intValue2 != null && tk.characterId == command.intValue2 && tk.tokenType == "player")) {
                        tk.copy(initiativeRoll = rollVal)
                    } else tk
                }.sortedWith(
                    compareByDescending<BattleMapToken> { it.initiativeRoll ?: Int.MIN_VALUE }
                        .thenByDescending { it.initiativeMod }
                        .thenBy { if (it.tokenType == "player") 0 else 1 }
                ).toTypedArray()
                val firstLiving = updatedTokens.firstOrNull { it.state != "dead" }?.id
                scene = scene.copy(
                    tokens = updatedTokens,
                    activeTurnTokenId = scene.activeTurnTokenId ?: firstLiving
                )
                saveBattleMapScene(scene)
            }
            "ROLL_ENCOUNTER_INITIATIVE" -> {
                val monstersOnly = command.boolValue == true
                val rolledTokens = scene.tokens.map { tk ->
                    if (tk.state == "dead") {
                        tk
                    } else if (monstersOnly && (tk.tokenType == "player" || tk.tokenType == "companion")) {
                        tk
                    } else {
                        val d20 = (1..20).random()
                        tk.copy(initiativeRoll = d20 + tk.initiativeMod)
                    }
                }.sortedWith(
                    compareByDescending<BattleMapToken> { it.initiativeRoll ?: Int.MIN_VALUE }
                        .thenByDescending { it.initiativeMod }
                        .thenBy { if (it.tokenType == "player") 0 else 1 }
                ).toTypedArray()
                val firstLiving = rolledTokens.firstOrNull { it.state != "dead" }?.id
                scene = scene.copy(
                    tokens = rolledTokens,
                    activeTurnTokenId = firstLiving,
                    roundNumber = 1
                )
                saveBattleMapScene(scene)
            }
            "RESET_COMBAT_TURNS" -> {
                val clearedTokens = scene.tokens.map { it.copy(initiativeRoll = null) }.toTypedArray()
                val firstLiving = clearedTokens.firstOrNull { it.state != "dead" }?.id
                scene = scene.copy(
                    tokens = clearedTokens,
                    activeTurnTokenId = firstLiving,
                    roundNumber = 1
                )
                saveBattleMapScene(scene)
            }
            "PREV_TURN" -> {
                val livingTokens = scene.tokens.filter { it.state != "dead" }
                if (livingTokens.isNotEmpty()) {
                    val currIdx = livingTokens.indexOfFirst { it.id == scene.activeTurnTokenId }
                    val prevIdx = if (currIdx <= 0) livingTokens.lastIndex else currIdx - 1
                    val prevRound = if (currIdx == 0 && scene.roundNumber > 1) scene.roundNumber - 1 else scene.roundNumber
                    scene = scene.copy(
                        activeTurnTokenId = livingTokens[prevIdx].id,
                        roundNumber = prevRound
                    )
                    saveBattleMapScene(scene)
                }
            }
            "NEXT_TURN" -> {
                val livingTokens = scene.tokens.filter { it.state != "dead" }
                if (livingTokens.isNotEmpty()) {
                    val currIdx = livingTokens.indexOfFirst { it.id == scene.activeTurnTokenId }
                    val nextIdx = if (currIdx < 0 || currIdx + 1 >= livingTokens.size) 0 else currIdx + 1
                    val nextRound = if (nextIdx == 0 && currIdx >= 0) scene.roundNumber + 1 else scene.roundNumber
                    scene = scene.copy(
                        activeTurnTokenId = livingTokens[nextIdx].id,
                        roundNumber = nextRound
                    )
                    saveBattleMapScene(scene)
                }
            }
            "SWITCH_SCENE" -> {
                val targetId = command.sceneId ?: command.textValue ?: return currentState
                dataSource.connection.use { conn ->
                    conn.prepareStatement("UPDATE battle_maps SET is_active = (id = ?), updated_at = CASE WHEN id = ? THEN NOW() ELSE updated_at END").use { ps ->
                        ps.setString(1, targetId)
                        ps.setString(2, targetId)
                        ps.executeUpdate()
                    }
                }
            }
            "CREATE_SCENE" -> {
                val title = command.textValue?.takeIf { it.isNotBlank() } ?: "New Tactical Map"
                val w = (command.intValue ?: 160).coerceIn(40, 600)
                val h = (command.intValue2 ?: 120).coerceIn(40, 600)
                val cell = (command.intValue3 ?: 5).coerceIn(5, 50)
                val slug = "scene-${System.currentTimeMillis() % 100000}"
                dataSource.connection.use { conn ->
                    conn.prepareStatement("UPDATE battle_maps SET is_active = false").use { it.executeUpdate() }
                }
                val newScene = BattleMapScene(
                    id = slug,
                    title = title,
                    isActive = true,
                    widthFt = w,
                    heightFt = h,
                    cellSizeFt = cell,
                    diagonalRule = command.textValue2 ?: "standard",
                    backgroundUrl = command.textValue3?.takeIf { it.isNotBlank() }
                )
                saveBattleMapScene(newScene)
                return handleBattleMapCommand(
                    BattleMapCommand(type = "SYNC_PARTY_TOKENS"),
                    connectedClients,
                    latestPing
                )
            }
            "DELETE_SCENE" -> {
                val targetId = command.sceneId ?: command.textValue ?: return currentState
                if (currentState.scenes.size > 1) {
                    dataSource.connection.use { conn ->
                        conn.prepareStatement("DELETE FROM battle_maps WHERE id = ?").use { ps ->
                            ps.setString(1, targetId)
                            ps.executeUpdate()
                        }
                        conn.prepareStatement(
                            "UPDATE battle_maps SET is_active = true WHERE id = (SELECT id FROM battle_maps ORDER BY updated_at DESC LIMIT 1)"
                        ).use { it.executeUpdate() }
                    }
                }
            }
        }

        return getBattleMapState(connectedClients, command.ping ?: latestPing)
    }
}
