@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.ui.viewmodel

import kotlinx.coroutines.launch
import org.dndcharacter.shared.data.CharacterRepository
import org.dndcharacter.shared.data.RulesRepository
import org.dndcharacter.shared.model.Character
import org.dndcharacter.shared.model.InventoryItem
import org.dndcharacter.shared.model.KnownSpell
import org.dndcharacter.shared.model.ActiveCondition
import org.dndcharacter.shared.model.TrackedResource
import kotlin.js.JsExport
import org.dndcharacter.shared.model.CharacterCondition
import org.dndcharacter.shared.model.CharacterResource
import org.dndcharacter.shared.model.ResolvedSkill
import org.dndcharacter.shared.model.ResolvedSavingThrow
import org.dndcharacter.shared.model.ResolvedSpellcastingStats
import org.dndcharacter.shared.model.ResolvedCombatStats
import org.dndcharacter.shared.model.ResolvedAbilityScore
import org.dndcharacter.shared.mechanics.ModifierCalculator
import org.dndcharacter.shared.mechanics.ModifierSource


@JsExport

data class CharacterSheetState(
    val character: Character? = null,
    // Resolved Data for UI Rendering
    val resolvedItems: Array<InventoryItem> = emptyArray(), 
    val resolvedSpells: Array<KnownSpell> = emptyArray(),
    val resolvedConditions: Array<ActiveCondition> = emptyArray(),
    val resolvedResources: Array<TrackedResource> = emptyArray(),
    val resolvedSkills: Array<ResolvedSkill> = emptyArray(),
    // Logic Results
    val resolvedSpellSlots: org.dndcharacter.shared.mechanics.SpellSlotResult? = null,
    val resolvedSpellcastingStats: Array<ResolvedSpellcastingStats> = emptyArray(),
    val resolvedSavingThrows: Array<ResolvedSavingThrow> = emptyArray(),
    val resolvedFeatures: Array<org.dndcharacter.shared.model.RuleClassFeature> = emptyArray(),
    val resolvedProficiencies: org.dndcharacter.shared.model.ResolvedProficiencies? = null,
    val activeModifiers: Array<org.dndcharacter.shared.model.ActiveModifier> = emptyArray(),
    val resolvedRace: org.dndcharacter.shared.mechanics.RaceResolution? = null,
    val resolvedCombatStats: ResolvedCombatStats? = null,
    val resolvedAbilityScores: Array<ResolvedAbilityScore> = emptyArray(),
    val cachedModifierSources: Array<org.dndcharacter.shared.mechanics.ModifierSource> = emptyArray(),
    val hasArmorPenalty: Boolean = false,
    val canLevelUp: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null || this::class != other::class) return false
        other as CharacterSheetState
        if (character != other.character) return false
        if (!resolvedItems.contentEquals(other.resolvedItems)) return false
        if (!resolvedSpells.contentEquals(other.resolvedSpells)) return false
        if (!resolvedConditions.contentEquals(other.resolvedConditions)) return false
        if (!resolvedResources.contentEquals(other.resolvedResources)) return false
        if (hasArmorPenalty != other.hasArmorPenalty) return false
        if (canLevelUp != other.canLevelUp) return false
        if (isLoading != other.isLoading) return false
        if (error != other.error) return false
        return true
    }

    override fun hashCode(): Int {
        var result = character?.hashCode() ?: 0
        result = 31 * result + resolvedItems.contentHashCode()
        result = 31 * result + resolvedSpells.contentHashCode()
        result = 31 * result + resolvedConditions.contentHashCode()
        result = 31 * result + resolvedResources.contentHashCode()
        result = 31 * result + hasArmorPenalty.hashCode()
        result = 31 * result + canLevelUp.hashCode()
        result = 31 * result + isLoading.hashCode()
        result = 31 * result + (error?.hashCode() ?: 0)
        return result
    }
}

@JsExport
class CharacterSheetViewModel @Suppress("NON_EXPORTABLE_TYPE") constructor(
    private val repository: CharacterRepository,
    private val rulesRepository: RulesRepository
) : BaseViewModel<CharacterSheetState>(CharacterSheetState()) {

    private suspend fun resolveProficiencies(char: Character, resolvedItems: Array<InventoryItem>): org.dndcharacter.shared.model.ResolvedProficiencies {
        val armorList = mutableListOf<org.dndcharacter.shared.model.ResolvedProficiency>()
        val weaponList = mutableListOf<org.dndcharacter.shared.model.ResolvedProficiency>()
        val toolList = mutableListOf<org.dndcharacter.shared.model.ResolvedProficiency>()

        // 1. Manual Proficiencies
        char.manualProficiencies?.armor?.forEach { 
             armorList.add(org.dndcharacter.shared.model.ResolvedProficiency(it, "Manual", "Armor"))
        }
        char.manualProficiencies?.weapons?.forEach {
             weaponList.add(org.dndcharacter.shared.model.ResolvedProficiency(it, "Manual", "Weapon"))
        }
        // Tools in manualProficiencies are stored as array
        char.manualProficiencies?.tools?.forEach {
             toolList.add(org.dndcharacter.shared.model.ResolvedProficiency(it, "Manual", "Tool"))
        }

        // 1b. Embedded Proficiencies (Legacy/Creation)
        char.proficiencies?.tools?.forEach {
             toolList.add(org.dndcharacter.shared.model.ResolvedProficiency(it, "Character", "Tool"))
        }

        // 2. Class Proficiencies
        char.classes?.forEach { cls ->
            val ruleClass = rulesRepository.getClass(cls.classId)
            if (ruleClass != null) {
                // Determine source label
                val source = "Class: ${ruleClass.name}"
                ruleClass.armorProficiencies.forEach { 
                    armorList.add(org.dndcharacter.shared.model.ResolvedProficiency(it, source, "Armor"))
                }
                ruleClass.weaponProficiencies.forEach {
                    weaponList.add(org.dndcharacter.shared.model.ResolvedProficiency(it, source, "Weapon"))
                }
                ruleClass.toolProficiencies.forEach {
                    toolList.add(org.dndcharacter.shared.model.ResolvedProficiency(it, source, "Tool"))
                }
            }
        }

        // 3. Race & Feat Proficiencies (via Traits/Modifiers)
        // Traits
        char.traits?.forEach { trait ->
            trait.modifiers?.forEach { mod ->
                if (mod.type == "proficiency") {
                    val name = mod.target
                    // Simple heuristic for type based on name
                    val lower = name.lowercase()
                    val type = when {
                        lower.contains("armor") || lower.contains("shield") -> "Armor"
                        lower.contains("weapon") || lower.contains("axe") || lower.contains("sword") || lower.contains("bow") -> "Weapon"
                        else -> "Tool" // Default/Fallback
                    }
                    if (type == "Armor") armorList.add(org.dndcharacter.shared.model.ResolvedProficiency(name, "Trait: ${trait.name}", type))
                    else if (type == "Weapon") weaponList.add(org.dndcharacter.shared.model.ResolvedProficiency(name, "Trait: ${trait.name}", type))
                    else toolList.add(org.dndcharacter.shared.model.ResolvedProficiency(name, "Trait: ${trait.name}", type))
                }
            }
        }
        
        // Feats
        char.feats?.forEach { feat ->
            feat.modifiers?.forEach { mod ->
                if (mod.type == "proficiency") {
                    val name = mod.target
                     val lower = name.lowercase()
                    val type = when {
                        lower.contains("armor") || lower.contains("shield") -> "Armor"
                        lower.contains("weapon") || lower.contains("axe") || lower.contains("sword") || lower.contains("bow") -> "Weapon"
                        else -> "Tool"
                    }
                    if (type == "Armor") armorList.add(org.dndcharacter.shared.model.ResolvedProficiency(name, "Feat: ${feat.name}", type))
                    else if (type == "Weapon") weaponList.add(org.dndcharacter.shared.model.ResolvedProficiency(name, "Feat: ${feat.name}", type))
                    else toolList.add(org.dndcharacter.shared.model.ResolvedProficiency(name, "Feat: ${feat.name}", type))
                }
            }
        }

        // 4. Item Proficiencies (from equipped items with proficiency modifiers)
        resolvedItems.forEach { invItem ->
            if (invItem.equipped) {
                val item = invItem.item
                item.modifiers?.forEach { mod ->
                    val source = "Item: ${item.name}"
                    // Proficiency modifiers use value=1 or valueString="true" to indicate enabled
                    val isEnabled = (mod.value != null && mod.value != 0) || 
                                    mod.valueString?.equals("true", ignoreCase = true) == true
                    when (mod.type) {
                        "weapon_proficiency" -> {
                            if (isEnabled) {
                                weaponList.add(org.dndcharacter.shared.model.ResolvedProficiency(mod.target, source, "Weapon"))
                            }
                        }
                        "armor_proficiency" -> {
                            if (isEnabled) {
                                armorList.add(org.dndcharacter.shared.model.ResolvedProficiency(mod.target, source, "Armor"))
                            }
                        }
                        "tool_proficiency" -> {
                            if (isEnabled) {
                                toolList.add(org.dndcharacter.shared.model.ResolvedProficiency(mod.target, source, "Tool"))
                            }
                        }
                    }
                }
            }
        }

        // 5. Deduplication
        // Requirement: "Duplicate proficiencies from different sources must be merged."
        // We will just distinct by name.
        val distinctArmor = armorList.distinctBy { it.name.lowercase() }.toTypedArray()
        val distinctWeapons = weaponList.distinctBy { it.name.lowercase() }.toTypedArray()
        val distinctTools = toolList.distinctBy { it.name.lowercase() }.toTypedArray()

        return org.dndcharacter.shared.model.ResolvedProficiencies(
            armor = distinctArmor,
            weapons = distinctWeapons,
            tools = distinctTools
        )
    }

    private suspend fun resolveClassFeatures(char: Character): Array<org.dndcharacter.shared.model.RuleClassFeature> {
        val features = mutableListOf<org.dndcharacter.shared.model.RuleClassFeature>()
        
        char.classes?.forEach { cls ->
            val classFeats = rulesRepository.getClassFeatures(cls.classId)
            val subClassFeats = if (cls.subclassId != null) rulesRepository.getSubclassFeatures(cls.classId, cls.subclassId) else emptyList()
            
            // Filter by level
            features.addAll(classFeats.filter { it.level <= cls.level })
            features.addAll(subClassFeats.filter { it.level <= cls.level })
        }
        
        // Sort by Level then Name
        return features.sortedWith(compareBy({ it.level }, { it.name })).toTypedArray()
    }

    fun isProficient(itemEntry: InventoryItem): Boolean {
        val profs = state.value.resolvedProficiencies ?: return false
        return checkProficiency(itemEntry.item, profs)
    }

    private fun checkProficiency(item: org.dndcharacter.shared.model.Item?, profs: org.dndcharacter.shared.model.ResolvedProficiencies): Boolean {
        if (item == null) return false
        
        val nameLower = item.name.lowercase()
        val typeLower = item.type.lowercase()
        val categoryLower = item.category.lowercase() 

        // 1. Armor Check
        if (categoryLower == "armor") {
             // Direct name check
             if (profs.armor.any { it.name.lowercase() == nameLower }) return true
             if (profs.armor.any { it.name.lowercase() == "all armor" }) return true
             
             // Tags
             item.tags.forEach { tag ->
                 if (tag == "armor:light" && profs.armor.any { it.name.lowercase().let { n -> n == "light" || n == "light armor" } }) return true
                 if (tag == "armor:medium" && profs.armor.any { it.name.lowercase().let { n -> n == "medium" || n == "medium armor" } }) return true
                 if (tag == "armor:heavy" && profs.armor.any { it.name.lowercase().let { n -> n == "heavy" || n == "heavy armor" } }) return true
                 if (tag == "armor:shield" && profs.armor.any { it.name.lowercase().let { n -> n == "shield" || n == "shields" } }) return true
             }
             
             // Fallback Type Inference
             var armorType = ""
             if (typeLower.contains("plate") || typeLower.contains("splint") || typeLower.contains("heavy")) armorType = "heavy"
             else if (typeLower.contains("medium") || typeLower.contains("breastplate") || typeLower.contains("scale")) armorType = "medium"
             else if (typeLower.contains("light") || typeLower.contains("leather")) armorType = "light"
             else if (typeLower.contains("shield")) armorType = "shield"
             
             if (armorType.isNotEmpty()) {
                 if (profs.armor.any { 
                     val pName = it.name.lowercase()
                     pName == armorType || pName == "$armorType armor" || (armorType == "shield" && pName == "shields")
                 }) return true
             }
             
             return false
        }
        
        // 2. Weapon Check
        if (categoryLower == "weapon") {
             if (profs.weapons.any { it.name.lowercase() == nameLower }) return true
             if (profs.weapons.any { it.name.lowercase() == "all weapons" }) return true
             
             item.tags.forEach { tag ->
                 if (tag == "weapon:simple" && profs.weapons.any { it.name.lowercase().let { n -> n == "simple" || n == "simple weapons" } }) return true
                 if (tag == "weapon:martial" && profs.weapons.any { it.name.lowercase().let { n -> n == "martial" || n == "martial weapons" } }) return true
                 if (tag == "weapon:improvised" && profs.weapons.any { it.name.lowercase().let { n -> n == "improvised" || n == "improvised weapons" } }) return true
             }
             
             // Inference
             var weaponCat = "simple"
             if (typeLower.contains("martial")) weaponCat = "martial"
             
             if (profs.weapons.any {
                 val pName = it.name.lowercase()
                 pName == weaponCat || pName == "$weaponCat weapons"
             }) return true
             
             return false
        }
        
        // 3. Tools / Misc
        if (categoryLower == "tool" || categoryLower == "misc") {
             if (profs.tools.any { it.name.lowercase() == nameLower }) return true
        }
        
        // Default to true for items that don't require proficiency (like potions, etc)
        // But if it was mismatched Armor/Weapon, we returned false above.
        return true
    }

    fun loadCharacter(id: Int) {
        setState { it.copy(isLoading = true, error = null) }
        
        viewModelScope.launch {
            try {
                val newState = internalLoadCharacter(id)
                if (newState != null) {
                    setState { newState }
                } else {
                    setState { it.copy(isLoading = false, error = "Character not found") }
                }
            } catch (e: Throwable) {
                setState { 
                    it.copy(isLoading = false, error = e.message ?: "Unknown error") 
                }
            }
        }
    }

    private suspend fun internalLoadCharacter(id: Int): CharacterSheetState? {
        // Fetch Base Character
        val rawChar = repository.getCharacter(id)
        
        // Fetch Race Details and Hydrate Feats
        var char = if (rawChar != null) {
            val raceEntry = rulesRepository.getRace(rawChar.raceId)
            val background = rawChar.backgroundId?.let { rulesRepository.getBackground(it) }
            
            // Hydrate Feats
            val hydratedFeats = rawChar.feats?.map { feat ->
                val ruleFeat = rulesRepository.getFeat(feat.id)
                if (ruleFeat?.modifiers != null) {
                    feat.copy(modifiers = ruleFeat.modifiers)
                } else {
                    feat
                }
            }?.toTypedArray()
            
            rawChar.copy(
                raceEntry = raceEntry, 
                background = background,
                feats = hydratedFeats
            )
        } else null

        if (char == null) return null

        var items: Array<InventoryItem> = emptyArray()
        var spells: Array<KnownSpell> = emptyArray()
        var conditions: Array<ActiveCondition> = emptyArray()
        var resources: Array<TrackedResource> = emptyArray()
        var spellcastingStats: Array<ResolvedSpellcastingStats> = emptyArray()
        var resolvedSavingThrows: Array<org.dndcharacter.shared.model.ResolvedSavingThrow> = emptyArray()
        
        var canLevelUp = state.value.canLevelUp // Preserve or recalculate?
        
        
        // 1. Resolve Inventory
            val invList = mutableListOf<InventoryItem>()
            char.inventory?.forEach { joinItem ->
                val ruleItem = rulesRepository.getItem(joinItem.itemId)
                    ?: org.dndcharacter.shared.model.Item(
                        id = joinItem.itemId,
                        name = joinItem.itemId,
                        type = "Unknown",
                        rarity = "Common",
                        weightAmount = 0.0,
                        costAmount = 0,
                        description = "Loading or Not Found",
                        tags = emptyArray()
                    )

                invList.add(
                    InventoryItem(
                        item = ruleItem,
                        quantity = joinItem.quantity,
                        equipped = joinItem.equipped,
                        isIdentified = joinItem.isIdentified,
                        isAttuned = joinItem.isAttuned,
                        currentUses = joinItem.currentUses,
                        instanceId = joinItem.id
                    )
                )
            }
            items = invList.toTypedArray()
            
            // 2. Resolve Spells
            val spellList = mutableListOf<KnownSpell>()
            char.spells?.forEach { joinSpell ->
                val ruleSpell = rulesRepository.getSpell(joinSpell.spellId) 
                    ?: org.dndcharacter.shared.model.Spell(
                        id = joinSpell.spellId, 
                        name = joinSpell.spellId, 
                        level = 0, 
                        school = "Unknown", 
                        castingTime = "?", 
                        range = "?", 
                        description = "Loading or Not Found",
                        classes = emptyArray(),
                        tags = emptyArray()
                    )
                
                spellList.add(
                    KnownSpell(
                        spell = ruleSpell,
                        prepared = joinSpell.prepared,
                        isRitual = joinSpell.isRitual,
                        isConcentrating = joinSpell.isConcentrating
                    )
                )
            }
            spells = spellList.toTypedArray()
            
            // 3. Resolve Conditions
            val condList = mutableListOf<ActiveCondition>()
            char.conditions?.forEach { joinCond ->
                val ruleCond = rulesRepository.getCondition(joinCond.conditionId) 
                    ?: org.dndcharacter.shared.model.RuleCondition(
                        id = joinCond.conditionId, 
                        name = joinCond.conditionId, 
                        description = "Loading...", 
                        modifiers = null
                    )
                
                condList.add(
                    ActiveCondition(
                        condition = ruleCond,
                        duration = joinCond.duration,
                        isPermanent = joinCond.isPermanent ?: false,
                        source = joinCond.source
                    )
                )
            }
            conditions = condList.toTypedArray()
            
            // 4. Resolve Resources
            val resList = mutableListOf<TrackedResource>()
            char.resources?.forEach { joinRes ->
                val ruleRes = rulesRepository.getResource(joinRes.resourceId)
                if (ruleRes != null) {
                    // Calculate max uses
                    var max = 1
                    val classLevel = char.classes?.find { it.classId == ruleRes.classId }?.level ?: 0
                    val totalLevel = char.level
                    val pb = kotlin.math.ceil(totalLevel.toDouble() / 4.0).toInt() + 1
                    
                    val getMod = { score: Int -> kotlin.math.floor((score - 10) / 2.0).toInt() }

                    max = when (ruleRes.maxFormula) {
                        "proficiency" -> {
                            if (ruleRes.name.equals("Rage", ignoreCase = true)) {
                                getRageCharges(classLevel)
                            } else {
                                pb
                            }
                        }
                        "level" -> classLevel
                        "level_x5" -> classLevel * 5
                        "cha_mod" -> kotlin.math.max(1, getMod(char.cha))
                        "wis_mod" -> kotlin.math.max(1, getMod(char.wis))
                        "int_mod" -> kotlin.math.max(1, getMod(char.int))
                        else -> ruleRes.maxFormula.toIntOrNull() ?: 1
                    }
                    
                    resList.add(
                        TrackedResource(
                            resource = ruleRes,
                            used = joinRes.usedUses,
                            max = max
                        )
                    )
                }
            }
            resources = resList.toTypedArray()
            
            // 5. Calculate Spell Slots
            val spellcastingMap = mapOf(
                "wizard" to "full", "sorcerer" to "full", "bard" to "full",
                "cleric" to "full", "druid" to "full",
                "paladin" to "half", "ranger" to "half",
                "artificer" to "artificer",
                "warlock" to "pact",
                "rogue" to "third", "fighter" to "third"
            )
            
            val classInfos = char.classes?.map { cls ->
                val type = spellcastingMap[cls.classId] ?: "none"
                org.dndcharacter.shared.mechanics.ClassSpellcastingInfo(
                    classId = cls.classId,
                    level = cls.level,
                    spellcastingType = type
                )
            }?.toTypedArray() ?: emptyArray()
            
            val slots = org.dndcharacter.shared.mechanics.SpellSlotCalculator.calculate(classInfos)

            // 5a. Resolve Spellcasting Stats
            val spellAbilityMap = mapOf(
                "wizard" to "int", "artificer" to "int", "rogue" to "int", "fighter" to "int",
                "cleric" to "wis", "druid" to "wis", "ranger" to "wis",
                "bard" to "cha", "sorcerer" to "cha", "warlock" to "cha", "paladin" to "cha"
            )

            val pb = kotlin.math.ceil((char.level.toDouble() / 4.0)).toInt() + 1
            
            spellcastingStats = char.classes?.mapNotNull { cls ->
                val ability = spellAbilityMap[cls.classId]
                if (ability != null) {
                    val score = when(ability) {
                        "int" -> char.int
                        "wis" -> char.wis
                        "cha" -> char.cha
                        else -> 10
                    }
                    val mod = kotlin.math.floor((score - 10) / 2.0).toInt()
                    val dc = 8 + pb + mod
                    val atk = pb + mod
                    
                    ResolvedSpellcastingStats(
                        classId = cls.classId,
                        className = cls.classId.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() },
                        ability = ability.uppercase(),
                        modifier = mod,
                        saveDC = dc,
                        attackBonus = atk
                    )
                } else null
            }?.toTypedArray() ?: emptyArray<ResolvedSpellcastingStats>()
        
        
        // 6. Resolve Skills
        val allSources = getModifierSources(char, items)
        
        var resolvedSkillsResult = resolveSkills(char, allSources)
        
        // 7. Resolve Saving Throws

        resolvedSavingThrows = listOf("str", "dex", "con", "int", "wis", "cha").map { ab ->
            val baseStat = when(ab) {
                "str" -> char.str
                "dex" -> char.dex
                "con" -> char.con
                "int" -> char.int
                "wis" -> char.wis
                "cha" -> char.cha
                else -> 10
            }
            // Helper to calculate effective stat (simplified)
            val effStat = org.dndcharacter.shared.mechanics.ModifierCalculator.calculateStatWithModifiers(baseStat, ab, allSources)
            val abilityMod = kotlin.math.floor((effStat - 10) / 2.0).toInt()
            
            val classSaves = getStandardClassSavingThrows()
            val charClassSaves = char.classes?.flatMap { 
                classSaves[it.classId.lowercase()] ?: emptyList() 
            }?.toSet() ?: emptySet()
            
            val explicitProf = char.proficiencies?.savingThrows?.get(ab) == true
            val modProf = org.dndcharacter.shared.mechanics.ModifierCalculator.getSavingThrowProficiency(ab, allSources)
            val isClassProf = charClassSaves.contains(ab)
            val isProficient = explicitProf || modProf || isClassProf
            
            val bonus = org.dndcharacter.shared.mechanics.ModifierCalculator.getSavingThrowBonus(ab, allSources)
            
            var total = abilityMod + bonus
            if (isProficient) total += pb
            
            org.dndcharacter.shared.model.ResolvedSavingThrow(
                ability = ab,
                total = total,
                isProficient = isProficient,
                hasBonus = bonus > 0
            )
        }.toTypedArray()

        // 7b. Resolve Ability Scores (with modifiers applied)
        val resolvedAbilityScoresResult = listOf("str", "dex", "con", "int", "wis", "cha").map { ab ->
            val baseStat = when(ab) {
                "str" -> char.str
                "dex" -> char.dex
                "con" -> char.con
                "int" -> char.int
                "wis" -> char.wis
                "cha" -> char.cha
                else -> 10
            }
            val effStat = org.dndcharacter.shared.mechanics.ModifierCalculator.calculateStatWithModifiers(baseStat, ab, allSources)
            val mod = kotlin.math.floor((effStat - 10) / 2.0).toInt()
            
            ResolvedAbilityScore(
                ability = ab,
                baseValue = baseStat,
                effectiveValue = effStat,
                modifier = mod
            )
        }.toTypedArray()

        // 7c. Resolve Combat Stats (AC, Init, Speed)
        val acResult = org.dndcharacter.shared.mechanics.ArmorClassCalculator.calculateArmorClass(char, items, allSources)
        val dexMod = kotlin.math.floor((char.dex - 10) / 2.0).toInt()
        val initBonus = org.dndcharacter.shared.mechanics.ModifierCalculator.calculateStatWithModifiers(0, "initiative", allSources)
        val speedValue = org.dndcharacter.shared.mechanics.RaceLogic.resolve(char)?.speed ?: char.speed
        
        val resolvedCombatStatsResult = ResolvedCombatStats(
            armorClass = acResult.value,
            armorClassBreakdown = acResult.breakdown,
            armorClassSource = acResult.source,
            initiative = dexMod + char.initiativeBonus + initBonus,
            speed = speedValue
        )

        // 8. Resolve Class Features & Proficiencies
        val resolvedFeaturesResult = resolveClassFeatures(char)
        val resolvedProficienciesResult = resolveProficiencies(char, items)
        
        canLevelUp = org.dndcharacter.shared.mechanics.Leveling.canLevelUp(
             char.classes ?: emptyArray(),
             char.xp
        )

        return CharacterSheetState(
            isLoading = false,
            character = char,
            resolvedItems = items,
            resolvedSpells = spells,
            resolvedConditions = conditions,
            resolvedResources = resources,
            resolvedSkills = resolvedSkillsResult,
            resolvedSpellcastingStats = spellcastingStats,
            resolvedSavingThrows = resolvedSavingThrows,
            resolvedFeatures = resolvedFeaturesResult,
            resolvedProficiencies = resolvedProficienciesResult,
            resolvedSpellSlots = slots,
            resolvedRace = org.dndcharacter.shared.mechanics.RaceLogic.resolve(char),
            resolvedCombatStats = resolvedCombatStatsResult,
            resolvedAbilityScores = resolvedAbilityScoresResult,
            cachedModifierSources = allSources,
            hasArmorPenalty = calculateArmorPenalty(items, resolvedProficienciesResult),
            canLevelUp = canLevelUp,
            error = null
        ) 

        
        return null
    }

    fun updateName(newName: String) {
        val currentChar = state.value.character ?: return
        val updated = currentChar.copy(name = newName)
        
        // Optimistic Update
        setState { it.copy(character = updated) }
        
        viewModelScope.launch {
            try {
                repository.saveCharacter(updated)
            } catch (e: Throwable) {
                setState { it.copy(error = "Failed to save name: ${e.message}") }
            }
        }
    }

    fun updateBio(size: String?, appearance: String?, backstory: String?) {
        val currentChar = state.value.character ?: return
        
        var updated = currentChar.copy()
        if (size != null) updated = updated.copy(size = size)
        if (appearance != null) updated = updated.copy(appearance = appearance)
        if (backstory != null) updated = updated.copy(backstory = backstory)
        
        setState { it.copy(character = updated) }
        
        viewModelScope.launch {
            try {
                repository.saveCharacter(updated)
            } catch (e: Throwable) {
                setState { it.copy(error = "Failed to save bio: ${e.message}") }
            }
        }
    }
    
    fun toggleInspiration() {
        val currentChar = state.value.character ?: return
        val updated = currentChar.copy(inspiration = !currentChar.inspiration)
        
        setState { it.copy(character = updated) }
        viewModelScope.launch {
            repository.saveCharacter(updated)
        }
    }
    
    fun addTestData() {
        val currentChar = state.value.character ?: return
        
        val newConditions = currentChar.conditions?.toMutableList() ?: mutableListOf()
        if (newConditions.none { it.conditionId == "blinded" }) {
            newConditions.add(
                org.dndcharacter.shared.model.CharacterCondition(
                    characterId = currentChar.id,
                    conditionId = "blinded",
                    duration = "1 minute",
                    source = "Test Button"
                )
            )
        }
        
        val newResources = currentChar.resources?.toMutableList() ?: mutableListOf()
        if (newResources.none { it.resourceId == "rage" }) {
            newResources.add(
                org.dndcharacter.shared.model.CharacterResource(
                    characterId = currentChar.id,
                    resourceId = "rage",
                    usedUses = 1
                )
            )
        }
        
        val updated = currentChar.copy(
            conditions = newConditions.toTypedArray(),
            resources = newResources.toTypedArray()
        )
        
        saveAndReload(updated)
    }

    // --- New HP & Condition Management ---

    fun heal(amount: Int) {
        val currentChar = state.value.character ?: return
        val newHp = (currentChar.hpCurrent + amount).coerceAtMost(getEffectiveMaxHp())
        val updated = currentChar.copy(hpCurrent = newHp)
        saveOptimistic(updated)
    }

    fun takeDamage(amount: Int) {
        val currentChar = state.value.character ?: return
        // Logic: TempHP first
        var remainingDmg = amount
        var newTemp = currentChar.tempHp
        
        if (newTemp > 0) {
            val absorbed = minOf(remainingDmg, newTemp)
            newTemp -= absorbed
            remainingDmg -= absorbed
        }
        
        val newHp = (currentChar.hpCurrent - remainingDmg).coerceAtLeast(0)
        
        val updated = currentChar.copy(hpCurrent = newHp, tempHp = newTemp)
        saveOptimistic(updated)
    }

    fun setTempHp(amount: Int) {
        val currentChar = state.value.character ?: return
        saveOptimistic(currentChar.copy(tempHp = amount))
    }

    fun setDeathSaves(success: Int, failure: Int) {
        val currentChar = state.value.character ?: return
        saveOptimistic(currentChar.copy(deathSaveSuccess = success, deathSaveFailure = failure))
    }



    fun toggleCondition(conditionId: String) {
        val currentChar = state.value.character ?: return
        
        // Check if already active
        val existing = currentChar.conditions?.find { it.conditionId == conditionId }
        val isActive = existing != null
        
        // Optimistic Update
        val updatedConditions = if (isActive) {
            currentChar.conditions?.filter { it.conditionId != conditionId }?.toTypedArray() ?: emptyArray()
        } else {
            // Optimistic Add
            val newCond = org.dndcharacter.shared.model.CharacterCondition(
                 id = 0,
                 characterId = currentChar.id,
                 conditionId = conditionId,
                 duration = null,
                 isPermanent = false,
                 source = null,
                 conditionName = conditionId 
            )
            (currentChar.conditions?.toList() ?: emptyList()).plus(newCond).toTypedArray()
        }
        
        val optimisticChar = currentChar.copy(conditions = updatedConditions)
        
        setState { it.copy(character = optimisticChar) } 

        viewModelScope.launch {
            try {
                val updatedChar = if (isActive) {
                    repository.removeCharacterCondition(currentChar.id, conditionId)
                } else {
                    repository.addCharacterCondition(currentChar.id, conditionId)
                }
                
                if (updatedChar != null) {
                    val hydrated = hydrateCharacter(updatedChar, currentChar)
                    loadCharacter(hydrated.id)
                } else {
                    setState { it.copy(error = "Failed to toggle condition") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Toggle Condition Failed: ${e.message}") }
            }
        }
    }

    private fun calculateArmorPenalty(items: Array<InventoryItem>, profs: org.dndcharacter.shared.model.ResolvedProficiencies): Boolean {
        return items.any { 
            it.equipped && 
            (it.item.category.lowercase() == "armor" || it.item.type.lowercase().contains("armor") || it.item.type.lowercase().contains("shield")) && 
            !checkProficiency(it.item, profs) 
        }
    }

    fun addManualProficiency(type: String, value: String) {
        val currentChar = state.value.character ?: return
        val currentManual = currentChar.manualProficiencies ?: org.dndcharacter.shared.model.ManualProficiencies()
        
        val newManual = when (type.lowercase()) {
            "armor" -> currentManual.copy(armor = currentManual.armor.plus(value).distinct().toTypedArray())
            "weapon" -> currentManual.copy(weapons = currentManual.weapons.plus(value).distinct().toTypedArray())
            "tool" -> currentManual.copy(tools = currentManual.tools.plus(value).distinct().toTypedArray())
            else -> currentManual
        }
        
        val updatedChar = currentChar.copy(manualProficiencies = newManual)
        
        // Optimistic Update of Resolved Proficiencies
        val currentResolved = state.value.resolvedProficiencies ?: org.dndcharacter.shared.model.ResolvedProficiencies()
        
        val newResolved = when(type.lowercase()) {
             "armor" -> currentResolved.copy(
                 armor = currentResolved.armor.plus(org.dndcharacter.shared.model.ResolvedProficiency(value, "Manual", "Armor")).distinctBy { it.name.lowercase() }.toTypedArray()
             )
             "weapon" -> currentResolved.copy(
                 weapons = currentResolved.weapons.plus(org.dndcharacter.shared.model.ResolvedProficiency(value, "Manual", "Weapon")).distinctBy { it.name.lowercase() }.toTypedArray()
             )
             "tool" -> currentResolved.copy(
                 tools = currentResolved.tools.plus(org.dndcharacter.shared.model.ResolvedProficiency(value, "Manual", "Tool")).distinctBy { it.name.lowercase() }.toTypedArray()
             )
             else -> currentResolved
        }

        // Recalculate Penalty
        val newPenalty = calculateArmorPenalty(state.value.resolvedItems, newResolved)

        setState { it.copy(character = updatedChar, resolvedProficiencies = newResolved, hasArmorPenalty = newPenalty) }
        
        viewModelScope.launch {
             try {
                 repository.saveCharacter(updatedChar)
                 // Full reload to ensure consistency
                 loadCharacter(updatedChar.id)
             } catch (e: Throwable) {
                 setState { it.copy(error = "Failed to add proficiency: ${e.message}") }
             }
        }
    }

    fun removeManualProficiency(type: String, value: String) {
        val currentChar = state.value.character ?: return
        val currentManual = currentChar.manualProficiencies ?: return
        
        val newManual = when (type.lowercase()) {
            "armor" -> currentManual.copy(armor = currentManual.armor.filter { it != value }.toTypedArray())
            "weapon" -> currentManual.copy(weapons = currentManual.weapons.filter { it != value }.toTypedArray())
            "tool" -> currentManual.copy(tools = currentManual.tools.filter { it != value }.toTypedArray())
            else -> currentManual
        }
        
        val updatedChar = currentChar.copy(manualProficiencies = newManual)
        
        
        // Optimistic Update of Resolved Proficiencies
        val currentResolved = state.value.resolvedProficiencies ?: org.dndcharacter.shared.model.ResolvedProficiencies()
        
        val newResolved = when(type.lowercase()) {
            "armor" -> currentResolved.copy(
                armor = currentResolved.armor.filter { it.name != value }.toTypedArray()
            )
            "weapon" -> currentResolved.copy(
                weapons = currentResolved.weapons.filter { it.name != value }.toTypedArray()
            )
            "tool" -> currentResolved.copy(
                tools = currentResolved.tools.filter { it.name != value }.toTypedArray()
            )
            else -> currentResolved
        }
        
        // Recalculate Penalty
        val newPenalty = calculateArmorPenalty(state.value.resolvedItems, newResolved)
        
        setState { it.copy(character = updatedChar, resolvedProficiencies = newResolved, hasArmorPenalty = newPenalty) }
        
        viewModelScope.launch {
             try {
                 repository.saveCharacter(updatedChar)
                 // Full reload to ensure consistency
                 loadCharacter(updatedChar.id)
             } catch (e: Throwable) {
                 setState { it.copy(error = "Failed to remove proficiency: ${e.message}") }
             }
        }
    }

    fun updateResource(resourceId: String, used: Int) {
        val currentChar = state.value.character ?: return
        val currentList = currentChar.resources?.toList() ?: emptyList()

        val updatedList = currentList.map { 
            if (it.resourceId == resourceId) it.copy(usedUses = used) else it 
        }

        val updated = currentChar.copy(resources = updatedList.toTypedArray())
        
        // Sync Resolved Resources
        val newResolved = state.value.resolvedResources.map { resolved ->
            if (resolved.resource.id == resourceId) {
                resolved.copy(used = used)
            } else resolved
        }.toTypedArray()

        // Optimistic Update
        setState { it.copy(character = updated, resolvedResources = newResolved) }
        
        viewModelScope.launch {
            try {
                repository.saveCharacter(updated)
            } catch (e: Throwable) {
                setState { it.copy(error = "Failed to update resource: ${e.message}") }
            }
        }
    }

    private fun getRageCharges(level: Int): Int {
        return when (level) {
            in 1..2 -> 2
            in 3..5 -> 3
            in 6..11 -> 4
            in 12..16 -> 5
            in 17..19 -> 6
            20 -> 999 // Unlimited
            else -> 0
        }
    }

    // --- Spell Management ---

    fun learnSpell(spellId: String) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val newSpell = repository.learnSpell(currentChar.id, spellId)
                if (newSpell != null) {
                    val currentSpells = currentChar.spells?.toMutableList() ?: mutableListOf()
                    currentSpells.add(newSpell)
                    val updated = currentChar.copy(spells = currentSpells.toTypedArray())
                    // Reload to resolve spell details (name, level, etc.)
                    loadCharacter(updated.id)
                } else {
                     setState { it.copy(error = "Failed to learn spell") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Learn Spell Failed: ${e.message}") }
            }
        }
    }

    fun forgetSpell(spellId: String) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val success = repository.forgetSpell(currentChar.id, spellId)
                if (success) {
                    val currentSpells = currentChar.spells?.filter { it.spellId != spellId }?.toTypedArray() ?: emptyArray()
                    val updated = currentChar.copy(spells = currentSpells)
                    
                    // Remove from resolved list too
                    val currentResolved = state.value.resolvedSpells.filter { it.spell.id != spellId }.toTypedArray()
                    
                    setState { it.copy(character = updated, resolvedSpells = currentResolved) }
                } else {
                    setState { it.copy(error = "Failed to forget spell") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Forget Spell Failed: ${e.message}") }
            }
        }
    }

    fun prepareSpell(spellId: String, prepared: Boolean) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val updatedSpell = repository.prepareSpell(currentChar.id, spellId, prepared)
                if (updatedSpell != null) {
                    val currentSpells = currentChar.spells?.map { 
                        if (it.spellId == spellId) updatedSpell else it
                    }?.toTypedArray() ?: emptyArray()
                    
                    val updatedChar = currentChar.copy(spells = currentSpells)
                    loadCharacter(updatedChar.id) 
                } else {
                    setState { it.copy(error = "Failed to update spell preparation") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Prepare Spell Failed: ${e.message}") }
            }
        }
    }

    fun toggleSpellRitual(spellId: String, isRitual: Boolean) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val updatedSpell = repository.toggleSpellRitual(currentChar.id, spellId, isRitual)
                if (updatedSpell != null) {
                    val currentSpells = currentChar.spells?.map { 
                        if (it.spellId == spellId) updatedSpell else it
                    }?.toTypedArray() ?: emptyArray()
                    
                    val updatedChar = currentChar.copy(spells = currentSpells)
                    loadCharacter(updatedChar.id)
                } else {
                    setState { it.copy(error = "Failed to update spell ritual") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Toggle Ritual Failed: ${e.message}") }
            }
        }
    }
    
    fun setConcentration(spellId: String?, spellName: String?) {
        val currentChar = state.value.character ?: return
        
        // If spellId is null, we are just clearing concentration? 
        // Or if toggling? The previous UI logic relied on setConcentration(id, name) to SET, and null to CLEAR.
        // New logic: toggleSpellConcentration(spellId, isConcentrating).
        // Since we are enforcing single concentration, if we set one, others clear.
        
        if (spellId != null) {
            // Determine if we are turning it ON or OFF.
            // Check current status.
            val currentSpell = currentChar.spells?.find { it.spellId == spellId }
            val currentStatus = currentSpell?.isConcentrating ?: false
            val newStatus = !currentStatus
            
            // Optimistic Update: Set this spell to newStatus, others to false.
            val updatedSpells = currentChar.spells?.map { 
                if (it.spellId == spellId) it.copy(isConcentrating = newStatus) 
                else if (newStatus) it.copy(isConcentrating = false) // Clear others if setting true
                else it
            }?.toTypedArray() ?: emptyArray()
            
            val updatedChar = currentChar.copy(spells = updatedSpells)
            
            // Also update resolvedSpells
            val updatedResolved = state.value.resolvedSpells.map { ks ->
                if (ks.spell.id == spellId) ks.copy(isConcentrating = newStatus)
                else if (newStatus) ks.copy(isConcentrating = false)
                else ks
            }.toTypedArray()
            
            setState { it.copy(character = updatedChar, resolvedSpells = updatedResolved) }
            
            viewModelScope.launch {
                try {
                    repository.toggleSpellConcentration(currentChar.id, spellId, newStatus)
                    // Reload to confirm server state (optional, but good for consistency)
                    // loadCharacter(currentChar.id) 
                } catch (e: Throwable) {
                    setState { it.copy(error = "Failed to update concentration: ${e.message}") }
                }
            }
        } else {
             // Clear all? If spellId is null, maybe the intent was "stop concentrating on everything"
             // Not strictly supported by the simple "toggle" signature unless we manually find the active one.
             val active = currentChar.spells?.find { it.isConcentrating }
             if (active != null) {
                 setConcentration(active.spellId, active.spellName)
             }
        }
    }
    
    fun spendHitDie(classId: String? = null) { // classId placeholder for future per-class tracking
        val currentChar = state.value.character ?: return
        if (currentChar.hitDiceCurrent > 0) {
            val updated = currentChar.copy(hitDiceCurrent = currentChar.hitDiceCurrent - 1)
            saveOptimistic(updated)
        }
    }

    fun setExhaustion(level: Int) {
        val currentChar = state.value.character ?: return
        val newLevel = level.coerceIn(0, 6)
        saveOptimistic(currentChar.copy(exhaustion = newLevel))
    }

    // --- Spell Slot Management ---

    fun consumeSpellSlot(level: Int) {
        val currentChar = state.value.character ?: return
        val currentMap = currentChar.usedSpellSlots ?: org.dndcharacter.shared.model.SpellSlotMap(emptyMap())
        val currentSlots = currentMap.slots.toMutableMap()
        val currentUsed = currentSlots[level.toString()] ?: 0
        
        currentSlots[level.toString()] = currentUsed + 1
        
        val updated = currentChar.copy(usedSpellSlots = org.dndcharacter.shared.model.SpellSlotMap(currentSlots))
        saveOptimistic(updated)
    }

    fun restoreSpellSlot(level: Int) {
        val currentChar = state.value.character ?: return
        val currentMap = currentChar.usedSpellSlots ?: return
        val currentSlots = currentMap.slots.toMutableMap()
        val currentUsed = currentSlots[level.toString()] ?: 0
        
        if (currentUsed > 0) {
            currentSlots[level.toString()] = currentUsed - 1
            val updated = currentChar.copy(usedSpellSlots = org.dndcharacter.shared.model.SpellSlotMap(currentSlots))
            saveOptimistic(updated)
        }
    }

    fun consumePactSlot() {
        val currentChar = state.value.character ?: return
        val updated = currentChar.copy(usedPactSlots = currentChar.usedPactSlots + 1)
        saveOptimistic(updated)
    }

    fun restorePactSlot() {
        val currentChar = state.value.character ?: return
        if (currentChar.usedPactSlots > 0) {
            val updated = currentChar.copy(usedPactSlots = currentChar.usedPactSlots - 1)
            saveOptimistic(updated)
        }
    }

    fun performShortRest() {
        val currentChar = state.value.character ?: return
        val currentResolved = state.value.resolvedResources
        
        // 1. Reset Pact Slots (Warlock)
        var updated = currentChar.copy(usedPactSlots = 0)
        
        // 2. Reset Short Rest Resources
        // We use resolvedResources to check "rechargeOn" property without suspending
        val shortRestResourceIds = currentResolved
            .filter { it.resource.rechargeOn.equals("short", ignoreCase = true) }
            .map { it.resource.id }
            .toSet()

        if (!currentChar.resources.isNullOrEmpty()) {
            val newResources = currentChar.resources!!.map { res ->
                if (shortRestResourceIds.contains(res.resourceId)) {
                    res.copy(usedUses = 0)
                } else res
            }.toTypedArray()
            updated = updated.copy(resources = newResources)
        }
        
        // 3. Clear active modifiers that expire on short rest
        val remainingActiveModifiers = currentChar.activeModifiers?.filter { activeMod ->
            activeMod.getExpiration() != org.dndcharacter.shared.model.ExpirationTrigger.SHORT_REST
        }?.toTypedArray() ?: emptyArray()
        
        updated = updated.copy(activeModifiers = remainingActiveModifiers)
        
        // Ensure HP is not greater than new Max (if modifiers expired)
        val newEffectiveMax = getEffectiveMaxHp(updated)
        if (updated.hpCurrent > newEffectiveMax) {
            updated = updated.copy(hpCurrent = newEffectiveMax)
        }
        
        // Sync Resolved Resources
        val newResolved = state.value.resolvedResources.map { resolved ->
            val matching = updated.resources?.find { it.resourceId == resolved.resource.id }
            resolved.copy(used = matching?.usedUses ?: 0)
        }.toTypedArray()

        setState { it.copy(character = updated, resolvedResources = newResolved, activeModifiers = remainingActiveModifiers) }
        
        viewModelScope.launch {
            repository.saveCharacter(updated)
        }
    }

    fun performLongRest() {
        val currentChar = state.value.character ?: return
        
        // 1. Clear active modifiers that expire on long rest (or short rest)
        val remainingActiveModifiers = currentChar.activeModifiers?.filter { activeMod ->
            val expiration = activeMod.getExpiration()
            expiration != org.dndcharacter.shared.model.ExpirationTrigger.LONG_REST &&
            expiration != org.dndcharacter.shared.model.ExpirationTrigger.SHORT_REST
        }?.toTypedArray() ?: emptyArray()
        
        // 2. Refresh Resources/Slots/HitDice
        val maxHitDice = currentChar.hitDiceMax
        val newHitDice = maxHitDice // Regain all
        val newExhaustion = (currentChar.exhaustion - 1).coerceAtLeast(0)
        
        val newResources = currentChar.resources?.map { 
            it.copy(usedUses = 0) 
        }?.toTypedArray()
        
        // Construct updated character state PRE-HP calculation
        var updated = currentChar.copy(
            // hpMax = adjustedHpMax,  <-- REMOVED: Do not mutate base HP
            // hpCurrent will be set momentarily
            tempHp = 0,
            hitDiceCurrent = newHitDice,
            exhaustion = newExhaustion,
            usedSpellSlots = org.dndcharacter.shared.model.SpellSlotMap(emptyMap()),
            usedPactSlots = 0,
            resources = newResources,
            activeModifiers = remainingActiveModifiers
        )
        
        // 3. Calculate Full HP based on CLEARED modifiers
        // This ensures temporary HP buffs like Aid (if they were set to expire) don't count towards the heal
        val newFullHp = getEffectiveMaxHp(updated)
        
        updated = updated.copy(hpCurrent = newFullHp)
        
        val newResolved = state.value.resolvedResources.map { resolved ->
            val matching = updated.resources?.find { it.resourceId == resolved.resource.id }
            resolved.copy(used = matching?.usedUses ?: 0)
        }.toTypedArray()
        
        setState { it.copy(character = updated, resolvedResources = newResolved, activeModifiers = remainingActiveModifiers) }
        
        viewModelScope.launch {
            repository.saveCharacter(updated)
        }
    }

    
    // --- Resource Effect Management ---
    
    /**
     * Activates a resource effect, adding its modifiers to activeModifiers.
     * 
     * @param resourceId The resource ID (e.g., "rage")
     * @param modifiers The modifiers to apply
     * @param sourceName Display name for the source (e.g., "Rage")
     * @param expiresOn When the effect expires
     */
    fun activateResourceEffect(
        resourceId: String,
        modifiers: Array<org.dndcharacter.shared.model.Modifier>,
        sourceName: String,
        expiresOn: org.dndcharacter.shared.model.ExpirationTrigger
    ) {
        val currentChar = state.value.character ?: return
        
        // Check if this resource effect is already active
        val existingActive: List<org.dndcharacter.shared.model.ActiveModifier> = currentChar.activeModifiers?.filter { 
            it.sourceId == resourceId 
        } ?: emptyList()
        
        // Same resource cannot stack - if already active, skip
        if (existingActive.isNotEmpty()) {
            return
        }
        
        // Check for transformations (SET or OVERRIDE hp_max) to persist Original HP
        val hasSetHpMax = modifiers.any { 
            it.target.equals("hp_max", ignoreCase = true) && 
            (it.type.equals("set", ignoreCase = true) || it.type.equals("override", ignoreCase = true)) 
        }
        
        // Use MutableList to clearly define type and avoid List<Any> inference
        val modifiersToApply = modifiers.toMutableList()
        if (hasSetHpMax) {
            val originalHp = currentChar.hpCurrent
            val originalHpMax = currentChar.hpMax
            
            val metaModHp = org.dndcharacter.shared.model.Modifier(
                type = "meta",
                target = "original_hp",
                valueString = originalHp.toString(),
                value = originalHp,
                condition = null,
                max = null
            )
            val metaModMax = org.dndcharacter.shared.model.Modifier(
                type = "meta",
                target = "original_hp_max",
                valueString = originalHpMax.toString(),
                value = originalHpMax,
                condition = null,
                max = null
            )
            modifiersToApply.add(metaModHp)
            modifiersToApply.add(metaModMax)
        }

        // Create new active modifiers
        val newActiveModifiers = modifiersToApply.map { mod ->
            org.dndcharacter.shared.model.ActiveModifier(
                sourceId = resourceId,
                sourceName = sourceName,
                modifier = mod,
                expiresOn = expiresOn?.key ?: "", // Fallback to empty string if null, assuming repo handles it or key is not nullable in DB
                activatedAt = null
            )
        }
        
        val allActiveModifiers = (currentChar.activeModifiers?.toList() ?: emptyList()) + newActiveModifiers
        var updated = currentChar.copy(activeModifiers = allActiveModifiers.toTypedArray())
        
        // Calculate HP Impact
        // Removed duplicate declaration 'hasSetHpMax'
        
        val preEffectiveMax = getEffectiveMaxHp(currentChar)
        val postEffectiveMax = getEffectiveMaxHp(updated)
        
        if (hasSetHpMax) {
            // Transformation: Reset HP to new Max
            updated = updated.copy(hpCurrent = postEffectiveMax)
        } else {
            // Buff/Bonus: Increase current by delta
            val delta = postEffectiveMax - preEffectiveMax
            if (delta != 0) {
                 updated = updated.copy(hpCurrent = updated.hpCurrent + delta)
            }
        }
        
        setState { it.copy(character = updated, activeModifiers = allActiveModifiers.toTypedArray()) }
        
        viewModelScope.launch {
            repository.saveCharacter(updated)
        }
    }
    
    /**
     * Deactivates a resource effect, removing its modifiers from activeModifiers.
     * 
     * @param resourceId The resource ID to deactivate
     */
    fun deactivateResourceEffect(resourceId: String) {
        val currentChar = state.value.character ?: return
        
        // Retrieve Original HP from Meta Modifier (if exists)
        val removedMods = currentChar.activeModifiers?.filter { it.sourceId == resourceId } ?: emptyList()
        val originalHpMeta = removedMods.find { 
             it.modifier.type == "meta" && it.modifier.target == "original_hp" 
        }
        val originalHpMaxMeta = removedMods.find { 
             it.modifier.type == "meta" && it.modifier.target == "original_hp_max" 
        }
        
        val originalHp = originalHpMeta?.modifier?.valueString?.toIntOrNull()
            ?: originalHpMeta?.modifier?.value?.toString()?.toIntOrNull()
            
        val originalHpMax = originalHpMaxMeta?.modifier?.valueString?.toIntOrNull()
            ?: originalHpMaxMeta?.modifier?.value?.toString()?.toIntOrNull()
        
        val remainingActive = currentChar.activeModifiers?.filter { 
            it.sourceId != resourceId 
        }?.toTypedArray() ?: emptyArray()
        
        var updated = currentChar.copy(activeModifiers = remainingActive)
        
        // Restore Max HP First if snapshot exists
        if (originalHpMax != null) {
            updated = updated.copy(hpMax = originalHpMax)
        }
        
        if (originalHp != null) {
            // Transformation Revert: Restore Original HP
            // This handles "Wild Shape" ending -> return to humanoid HP
            updated = updated.copy(hpCurrent = originalHp)
        } else {
            // Standard Buff Removal (e.g. Aid, Wild Shape bonus, Constitution potion wear off)
            // Calculate the HP delta that was granted by the removed modifiers
            val preEffectiveMax = getEffectiveMaxHp(currentChar)
            val postEffectiveMax = getEffectiveMaxHp(updated)
            val delta = preEffectiveMax - postEffectiveMax
            
            // Reduce current HP by the delta (the bonus that was removed)
            val newHpCurrent = (updated.hpCurrent - delta).coerceIn(1, postEffectiveMax)
            updated = updated.copy(hpCurrent = newHpCurrent)
        }
        
        setState { it.copy(character = updated, activeModifiers = remainingActive) }
        
        viewModelScope.launch {
            repository.saveCharacter(updated)
        }
    }
    
    /**
     * Clears all active modifiers with the specified expiration trigger.
     */
    private fun clearExpiredModifiers(trigger: org.dndcharacter.shared.model.ExpirationTrigger): Array<org.dndcharacter.shared.model.ActiveModifier> {
        val currentChar = state.value.character ?: return emptyArray()
        
        return currentChar.activeModifiers?.filter { activeMod ->
            activeMod.getExpiration() != trigger
        }?.toTypedArray() ?: emptyArray()
    }

    fun levelUp(input: org.dndcharacter.shared.model.LevelUpData) {
        val currentChar = state.value.character ?: return
        setState { it.copy(isLoading = true) }
        
        // 1. Capture Pre-Level HP
        // We use getEffectiveMaxHp to account for Feats/Bonuses that might scale with level
        val preMaxHp = getEffectiveMaxHp(currentChar)
        val preCurrentHp = currentChar.hpCurrent
        
        viewModelScope.launch {
            try {
                // 2. Perform Backend Mutation
                val updatedChar = repository.levelUp(input)
                
                if (updatedChar != null) {
                    // 3. Load new state internally to get hydrated feats/modifiers and calculated stats
                    val intermediateState = internalLoadCharacter(updatedChar.id)
                    
                    if (intermediateState?.character != null) {
                        // 4. Calculate Post-Level Max HP using the new state
                        val postMaxHp = getEffectiveMaxHp(intermediateState.character)
                        
                        // 5. Calculate Total Gain (Class HP + Feat HP + Con Mod interactions)
                        // This ensures that if Tough feat gives +2 for the new level, it's included here.
                        val totalGain = postMaxHp - preMaxHp
                        val newCurrentHp = preCurrentHp + totalGain
                        
                        // 6. Update Character with new Current HP
                        val finalChar = intermediateState.character.copy(hpCurrent = newCurrentHp)
                        
                        // 7. Save Consistency and Final Load
                        repository.saveCharacter(finalChar)
                        
                        // Reload to ensure UI is perfectly synced
                        val finalState = internalLoadCharacter(finalChar.id)
                        if (finalState != null) {
                             setState { finalState }
                        } else {
                             setState { it.copy(isLoading = false, error = "Final Load Failed") }
                        }
                    } else {
                        setState { it.copy(isLoading = false, error = "Intermediate Load Failed") }
                    }
                } else {
                    setState { it.copy(isLoading = false, error = "Level Up Failed") }
                }
            } catch (e: Throwable) {
                setState { it.copy(isLoading = false, error = "Level Up Exception: ${e.message}") }
            }
        }
    }

    fun removeResourceModifier(id: String) {
        val currentChar = state.value.character ?: return
        val currentMods = currentChar.resourceModifiers ?: return
        
        val updatedMods = currentMods.filter { it.id != id }.toTypedArray()
        saveOptimistic(currentChar.copy(resourceModifiers = updatedMods))
    }

    fun consumeResource(resourceId: String) {
        val currentChar = state.value.character ?: return
        val currentRes = currentChar.resources ?: return
        
        val updatedRes = currentRes.map { 
            if (it.resourceId == resourceId) it.copy(usedUses = it.usedUses + 1) else it
        }.toTypedArray()

        val updatedChar = currentChar.copy(resources = updatedRes)
        
        // Sync Resolved Resources
        val newResolved = state.value.resolvedResources.map { resolved ->
            if (resolved.resource.id == resourceId) resolved.copy(used = resolved.used + 1) else resolved
        }.toTypedArray()
        
        setState { it.copy(character = updatedChar, resolvedResources = newResolved) }
        
        viewModelScope.launch {
            repository.saveCharacter(updatedChar)
        }
    }

    fun restoreResource(resourceId: String) {
        val currentChar = state.value.character ?: return
        val currentRes = currentChar.resources ?: return
        
        val updatedRes = currentRes.map { 
            if (it.resourceId == resourceId && it.usedUses > 0) it.copy(usedUses = it.usedUses - 1) else it
        }.toTypedArray()
        
        val updatedChar = currentChar.copy(resources = updatedRes)

        // Sync Resolved Resources
        val newResolved = state.value.resolvedResources.map { resolved ->
            if (resolved.resource.id == resourceId && resolved.used > 0) resolved.copy(used = resolved.used - 1) else resolved
        }.toTypedArray()
        
        setState { it.copy(character = updatedChar, resolvedResources = newResolved) }

        viewModelScope.launch {
            repository.saveCharacter(updatedChar)
        }
    }

    /**
     * Use a resource: consumes one use AND applies any onUse effects.
     * This is the preferred method for KmpResourceList to call.
     */
    fun useResource(resourceId: String) {
        val currentState = state.value
        val currentChar = currentState.character ?: return
        
        // Check if this effect is already active (no stacking)
        val alreadyActive = currentChar.activeModifiers?.any { it.sourceId == resourceId } ?: false
        if (alreadyActive) {
            return // Effect already active, cannot stack
        }
        
        // Find the resolved resource to get onUse effects
        val trackedResource = currentState.resolvedResources.find { it.resource.id == resourceId }
        if (trackedResource == null || trackedResource.used >= trackedResource.max) {
            return // Resource not found or already depleted
        }
        
        // First, consume the resource (decrement uses)
        consumeResource(resourceId)
        
        // Then, apply onUse effects if present
        val onUseEffects = trackedResource.resource.onUse
        if (!onUseEffects.isNullOrEmpty()) {
            val currentChar = state.value.character ?: return
            
            // Convert ResourceEffect to Modifier array for activateResourceEffect
            val modifiers = onUseEffects.mapNotNull { effect ->
                // Evaluate formula if present
                val modValue = when {
                    effect.formula != null -> {
                        // Simple formula evaluation - pass resource's classId for class_level formulas
                        evaluateSimpleFormula(effect.formula, currentChar, trackedResource.resource.classId)
                    }
                    effect.value != null -> if (effect.value) 1 else 0
                    else -> 0
                }
                
                // For effects like grant_hp that don't have target, use the type as target
                val target = effect.target ?: effect.type
                
                org.dndcharacter.shared.model.Modifier(
                    type = effect.type,
                    target = target,
                    value = modValue,
                    condition = effect.condition,
                    duration = effect.duration
                )
            }.toTypedArray()
            
            if (modifiers.isNotEmpty()) {
                // Determine expiration from the first effect's duration
                val expirationKey = onUseEffects.firstOrNull()?.duration ?: "manual_disable"
                val expiration = org.dndcharacter.shared.model.ExpirationTrigger.fromKey(expirationKey)
                
                activateResourceEffect(resourceId, modifiers, trackedResource.resource.name, expiration)
            }
        }
    }

    /**
     * Simple formula evaluator for common resource effect formulas.
     * @param classId Optional class ID for class_level lookups (e.g., for Wild Shape using druid level)
     */
    private fun evaluateSimpleFormula(formula: String, char: Character, classId: String? = null): Int {
        val level = char.level
        val classLevels = char.classes?.associate { it.classId to it.level } ?: emptyMap()
        val classLevel = classId?.let { classLevels[it] } ?: level // Fallback to total level if class not found
        
        return when {
            // "3 * class_level" pattern - uses the owning class's level
            formula.contains("*") && formula.contains("class_level") -> {
                val parts = formula.split("*").map { it.trim() }
                val multiplier = parts.find { it.toIntOrNull() != null }?.toInt() ?: 1
                multiplier * classLevel
            }
            // "class_level" alone
            formula.equals("class_level", ignoreCase = true) -> classLevel
            // "3 * level" pattern - uses total character level
            formula.contains("*") && formula.contains("level") -> {
                val parts = formula.split("*").map { it.trim() }
                val multiplier = parts.find { it.toIntOrNull() != null }?.toInt() ?: 1
                multiplier * level
            }
            // "level" alone
            formula.equals("level", ignoreCase = true) -> level
            // "proficiency" or "prof"
            formula.equals("proficiency", ignoreCase = true) || formula.equals("prof", ignoreCase = true) -> {
                kotlin.math.ceil(level.toDouble() / 4.0).toInt() + 1
            }
            // Direct number
            else -> formula.toIntOrNull() ?: 0
        }
    }

    /**
     * Calculates the "Natural" Max HP of the character based on their class, level, constitution,
     * and static modifiers (Feats, Race, Items). 
     * STRICTLY EXCLUDES temporary active effects or transformations.
     */
    companion object {
        private val CLASS_HIT_DICE = mapOf(
            "barbarian" to 12,
            "bard" to 8, "cleric" to 8, "druid" to 8, "monk" to 8, "rogue" to 8, "warlock" to 8,
            "fighter" to 10, "paladin" to 10, "ranger" to 10,
            "sorcerer" to 6, "wizard" to 6
        )
    }

    /**
     * Reconstructs the Base HP (Class Levels + Con) to ignore any persistence pollution in stored hpMax.
     */
    private fun calculateBaseHp(char: org.dndcharacter.shared.model.Character): Int {
        if (char.classes.isNullOrEmpty()) return char.hpMax
        
        val conMod = (char.con - 10) / 2
        var totalHp = 0
        var isFirstLevel = true
        
        char.classes.forEach { cls ->
            val hd = cls.hitDie ?: CLASS_HIT_DICE[cls.classId.lowercase()] ?: 8
            val levels = cls.level
            
            for (i in 1..levels) {
                if (isFirstLevel) {
                    totalHp += hd + conMod
                    isFirstLevel = false
                } else {
                    val avg = (hd / 2) + 1
                    totalHp += avg + conMod
                }
            }
        }
        
        // Safety: If for some reason calc results in 0 (e.g. weird data), fallback
        return if (totalHp > 0) totalHp else char.hpMax
    }

    private fun calculateNaturalMaxHp(char: org.dndcharacter.shared.model.Character): Int {
        // LAYER 1: Base HP (Recalculated)
        val baseHp = calculateBaseHp(char)
        
        // LAYER 2: Static Modifiers (Feats, Race, Items)
        // Explicitly active=false to prevent double counting
        val rawStaticSources = getModifierSources(char, includeActive = false)
        
        // FAILSAFE: Explicitly filter out "Wild Shape" if it sneaks in via Class Features
        // This acts as a firebreak against any source polluted with Active Logic.
        val staticSources = rawStaticSources.filter { 
             !it.name.contains("Wild Shape", ignoreCase = true) 
        }.toTypedArray()
        
        // Apply hp_per_level modifiers (e.g., Tough feat, Hill Dwarf)
        val hpPerLevelBonus = org.dndcharacter.shared.mechanics.ModifierCalculator
            .getHpPerLevelBonus(staticSources)
            
        // Apply flat hp_max modifiers from items/feats
        val flatBonus = org.dndcharacter.shared.mechanics.ModifierCalculator
            .getHpMaxBonus(staticSources)
            
        return baseHp + (hpPerLevelBonus * char.level) + flatBonus
    }

    fun getEffectiveMaxHp(charOverride: org.dndcharacter.shared.model.Character? = null): Int {
        val char = charOverride ?: state.value.character ?: return 0
        
        // LAYER 3: Active Modifiers (Transformations & Buffs)
        
        // 3a. Check for Transformations (Overrides)
        val setHpMod = char.activeModifiers?.find { 
             it.modifier.target.equals("hp_max", ignoreCase = true) && 
             (it.modifier.type.equals("set", ignoreCase = true) || it.modifier.type.equals("override", ignoreCase = true)) 
        }
        
        // Determine Baseline
        val baseline = if (setHpMod != null) {
            // Transformation Mode: Replaces Natural HP completely
            setHpMod.modifier.value ?: setHpMod.modifier.valueString?.toIntOrNull() ?: char.hpMax
        } else {
            // Normal Mode: Uses Natural HP (Static Build)
            calculateNaturalMaxHp(char)
        }
            
        // 3b. Apply Active Bonuses (Buffs like Aid, or Wild Shape as Bonus)
        // These are added on top of the baseline (whether Natural or Transformed)
        val activeHpBonus = char.activeModifiers?.filter { 
             it.modifier.target.equals("hp_max", ignoreCase = true) && 
             it.modifier.type.equals("bonus", ignoreCase = true) 
        }?.sumOf { it.modifier.value ?: it.modifier.valueString?.toIntOrNull() ?: 0 } ?: 0
        
        return baseline + activeHpBonus
    }

    private fun saveOptimistic(updated: Character) {
        setState { it.copy(character = updated) }
        viewModelScope.launch {
            repository.saveCharacter(updated)
        }
    }

    private fun saveAndReload(updated: Character) {
        setState { it.copy(character = updated, isLoading = true) }
        viewModelScope.launch {
            repository.saveCharacter(updated)
            loadCharacter(updated.id)
        }
    }

    private suspend fun hydrateCharacter(fresh: Character, old: Character?): Character {
        // Hydrate Background
        val background = if (old != null && old.backgroundId == fresh.backgroundId && old.background != null) {
            old.background
        } else {
             fresh.backgroundId?.let { rulesRepository.getBackground(it) }
        }

        // Hydrate Race (RaceEntry usually mapped by repo but good to be safe/consistent)
        val raceEntry = if (old != null && old.raceId == fresh.raceId && old.raceEntry != null) {
            old.raceEntry
        } else {
             rulesRepository.getRace(fresh.raceId)
        }

        return fresh.copy(background = background, raceEntry = raceEntry)
    }

    // --- Experience & Level Management ---

    fun setExperience(xp: Int) {
        val currentChar = state.value.character ?: return
        val newXp = xp.coerceAtLeast(0)
        saveOptimistic(currentChar.copy(xp = newXp))
    }

    fun addExperience(amount: Int) {
        val currentChar = state.value.character ?: return
        val newXp = (currentChar.xp + amount).coerceAtLeast(0)
        saveOptimistic(currentChar.copy(xp = newXp))
    }

    fun setLevel(level: Int) {
        println("CharacterSheetViewModel: setLevel called with $level")
        val currentChar = state.value.character ?: return
        val newLevel = level.coerceIn(1, 20)

        // Logic: Scaling level implies updating class level to match, otherwise backend recalculation might revert it.
        // Strategy: Update the first class (primary) to absorb the difference.
        val currentClasses = currentChar.classes ?: emptyArray()
        val updatedChar = if (currentClasses.isNotEmpty()) {
            val primaryClass = currentClasses[0]
            val otherClassesLevel = currentClasses.drop(1).sumOf { it.level }
            val newPrimaryLevel = (newLevel - otherClassesLevel).coerceAtLeast(1)
            
            println("CharacterSheetViewModel: Updating primary class ${primaryClass.classId} to level $newPrimaryLevel")
            
            val updatedClass = primaryClass.copy(level = newPrimaryLevel)
            
            // Reconstruct classes array
            val newClasses = currentClasses.map { 
                if (it.classId == primaryClass.classId && it.subclassId == primaryClass.subclassId) updatedClass else it 
            }.toTypedArray()
            
            currentChar.copy(level = newLevel, classes = newClasses)
        } else {
            println("CharacterSheetViewModel: No classes found, setting global level only.")
            currentChar.copy(level = newLevel)
        }
        
        // Use saveAndReload because Level changes affect Proficiency Bonus and other stats that need server calculation
        saveAndReload(updatedChar)
    }

    // Level Up Logic
    // Level Up Logic replaced by levelUp(input: LevelUpData)

    // JS Interop: Expose state subscription explicitly
    fun subscribe(callback: (CharacterSheetState) -> Unit): () -> Unit {
        return watchState(callback)
    }

    // JS Interop: Expose current state value directly
    fun getStateValue(): CharacterSheetState {
        return state.value
    }

    // JS Interop: Expose cleanup
    fun dispose() {
        onCleared()
    }

    // --- Character Management ---

    fun createCharacter(name: String, raceId: String, classId: String) {
        setState { it.copy(isLoading = true) }
        viewModelScope.launch {
            try {
                val newChar = repository.createCharacter(name, raceId, classId)
                if (newChar != null) {
                    // Automatically load the new character
                    loadCharacter(newChar.id)
                } else {
                    setState { it.copy(isLoading = false, error = "Failed to create character") }
                }
            } catch (e: Throwable) {
                setState { it.copy(isLoading = false, error = "Create Failed: ${e.message}") }
            }
        }
    }

    fun deleteCharacter(id: Int) {
        setState { it.copy(isLoading = true) }
        viewModelScope.launch {
            try {
                repository.deleteCharacter(id)
                // Clear state or handle navigation externally
                setState { CharacterSheetState() }
            } catch (e: Throwable) {
                setState { it.copy(isLoading = false, error = "Delete Failed: ${e.message}") }
            }
        }
    }

    // --- Inventory Management ---

    fun addCharacterItem(itemId: String, quantity: Int) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val newItem = repository.addCharacterItem(currentChar.id, itemId, quantity)
                if (newItem != null) {
                    val currentInventory = currentChar.inventory?.toMutableList() ?: mutableListOf()
                    currentInventory.add(newItem)
                    val updated = currentChar.copy(inventory = currentInventory.toTypedArray())
                    
                    // Specific logic for resolution, for now reload is safest to get full item details
                     loadCharacter(updated.id)
                } else {
                    setState { it.copy(error = "Failed to add item") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Add Item Failed: ${e.message}") }
            }
        }
    }

    fun removeCharacterItem(inventoryId: Int) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val success = repository.removeCharacterItem(inventoryId)
                if (success) {
                     val currentInventory = currentChar.inventory?.filter { it.id != inventoryId }?.toTypedArray() ?: emptyArray()
                     val updated = currentChar.copy(inventory = currentInventory)
                     
                     // Helper to also remove from resolved items
                     val currentResolved = state.value.resolvedItems.filter { it.instanceId != inventoryId }.toTypedArray()
                     
                     setState { it.copy(character = updated, resolvedItems = currentResolved) }
                } else {
                    setState { it.copy(error = "Failed to remove item") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Remove Item Failed: ${e.message}") }
            }
        }
    }

    fun updateCharacterItemState(inventoryId: Int, equipped: Boolean?, isAttuned: Boolean?, isIdentified: Boolean?, quantity: Int?) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val updatedItem = repository.updateCharacterItemState(inventoryId, equipped, isAttuned, isIdentified, quantity)
                if (updatedItem != null) {
                    // Update in list
                    val currentInventory = currentChar.inventory?.map { 
                        if (it.id == inventoryId) updatedItem else it 
                    }?.toTypedArray() ?: emptyArray()
                    
                    val updatedChar = currentChar.copy(inventory = currentInventory)
                    
                    // Update resolved list if necessary (quantity or equipped might change stats)
                    // For now, reload to ensure consistency with rules
                    loadCharacter(updatedChar.id)
                } else {
                    setState { it.copy(error = "Failed to update item state") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Update Item Failed: ${e.message}") }
            }
        }
    }

    fun identifyItem(inventoryId: Int) {
        updateCharacterItemState(inventoryId, null, null, true, null)
    }

    fun breakCurse(inventoryId: Int) {
        // Force unequip and unattune
        updateCharacterItemState(inventoryId, false, false, null, null)
    }

    // --- Currency, Language, Proficiency ---

    fun updateCharacterCurrency(cp: Int, sp: Int, ep: Int, gp: Int, pp: Int) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val rawUpdated = repository.updateCharacterCurrency(currentChar.id, cp, sp, ep, gp, pp)
                if (rawUpdated != null) {
                    val updatedChar = hydrateCharacter(rawUpdated, currentChar)
                    setState { it.copy(character = updatedChar) }
                } else {
                    setState { it.copy(error = "Failed to update currency") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Update Currency Failed: ${e.message}") }
            }
        }
    }

    fun addCharacterLanguage(languageId: String) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val rawUpdated = repository.addCharacterLanguage(currentChar.id, languageId)
                if (rawUpdated != null) {
                    val updatedChar = hydrateCharacter(rawUpdated, currentChar)
                    setState { it.copy(character = updatedChar) }
                } else {
                    setState { it.copy(error = "Failed to add language") }
                }
            } catch (e: Throwable) {
                 setState { it.copy(error = "Add Language Failed: ${e.message}") }
            }
        }
    }

    fun removeCharacterLanguage(languageId: String) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val rawUpdated = repository.removeCharacterLanguage(currentChar.id, languageId)
                if (rawUpdated != null) {
                    val updatedChar = hydrateCharacter(rawUpdated, currentChar)
                    setState { it.copy(character = updatedChar) }
                } else {
                    setState { it.copy(error = "Failed to remove language") }
                }
            } catch (e: Throwable) {
                 setState { it.copy(error = "Remove Language Failed: ${e.message}") }
            }
        }
    }

    private fun getModifierSources(
        char: org.dndcharacter.shared.model.Character, 
        inventory: Array<InventoryItem>? = null, 
        race: org.dndcharacter.shared.model.RaceEntry? = null,
        classFeatures: Array<org.dndcharacter.shared.model.RuleClassFeature>? = null,
        includeActive: Boolean = true
    ): Array<ModifierSource> {
        val modSources = mutableListOf<ModifierSource>()
        
        // ... (existing item/race/feat/trait/background/feature logic) ...
        // Items
        val effectiveInventory = inventory ?: state.value.resolvedItems
        effectiveInventory?.forEach { inv ->
             if (inv.equipped && inv.item.modifiers.isNotEmpty() && (!inv.item.requiresAttunement || inv.isAttuned)) {
                val ruleMods = inv.item.modifiers.map { 
                    org.dndcharacter.shared.mechanics.RuleModifier(it.type, it.target, it.value?.toString() ?: it.valueString ?: "0", it.condition) 
                }.toTypedArray()
                modSources.add(ModifierSource(inv.item.id, inv.item.name, ruleMods))
            }
        }
        
        // Race
        val effectiveRace = race ?: char.raceEntry
        effectiveRace?.modifiers?.let { mods ->
           val ruleMods = mods.map { 
               org.dndcharacter.shared.mechanics.RuleModifier(it.type, it.target, it.value?.toString() ?: it.valueString ?: "0", it.condition) 
           }.toTypedArray()
           modSources.add(ModifierSource(effectiveRace.id, effectiveRace.name, ruleMods))
        }
        
        // Feats
        char.feats?.forEach { feat ->
            if (!feat.modifiers.isNullOrEmpty()) {
                val ruleMods = feat.modifiers.map { 
                    org.dndcharacter.shared.mechanics.RuleModifier(it.type, it.target, it.value?.toString() ?: it.valueString ?: "0", it.condition) 
                }.toTypedArray()
                modSources.add(ModifierSource(feat.id, feat.name, ruleMods))
            }
        }

        // Traits
        char.traits?.forEach { trait ->
            if (!trait.modifiers.isNullOrEmpty()) {
                val ruleMods = trait.modifiers.map { 
                    org.dndcharacter.shared.mechanics.RuleModifier(it.type, it.target, it.value?.toString() ?: it.valueString ?: "0", it.condition) 
                }.toTypedArray()
                modSources.add(ModifierSource(trait.id, trait.name, ruleMods))
            }
        }
        
        // Background
        char.background?.let { bg ->
            bg.modifiers?.let { mods ->
                val ruleMods = mods.map { 
                    org.dndcharacter.shared.mechanics.RuleModifier(it.type, it.target, it.value?.toString() ?: it.valueString ?: "0", it.condition) 
                }.toTypedArray()
                modSources.add(ModifierSource(bg.id, bg.name, ruleMods))
            }
        }
        
        // Class Features
        val effectiveFeatures = classFeatures ?: state.value.resolvedFeatures
        effectiveFeatures.forEach { feature ->
            if (!feature.modifiers.isNullOrEmpty()) {
                val ruleMods = feature.modifiers.map { 
                    org.dndcharacter.shared.mechanics.RuleModifier(it.type, it.target, it.value?.toString() ?: it.valueString ?: "0", it.condition) 
                }.toTypedArray()
                modSources.add(ModifierSource(feature.id, feature.name, ruleMods))
            }
        }
        
        // Active Resource Modifiers - Only if requested
        if (includeActive) {
            char.activeModifiers?.forEach { activeMod ->
                val ruleMod = org.dndcharacter.shared.mechanics.RuleModifier(
                    activeMod.modifier.type,
                    activeMod.modifier.target,
                    activeMod.modifier.value?.toString() ?: activeMod.modifier.valueString ?: "0",
                    activeMod.modifier.condition
                )
                modSources.add(ModifierSource(activeMod.sourceId, activeMod.sourceName, arrayOf(ruleMod)))
            }
        }
        
        return modSources.toTypedArray()
    }

    private fun resolveSkills(char: org.dndcharacter.shared.model.Character, allSources: Array<ModifierSource>): Array<ResolvedSkill> {
        val skillList = listOf(
            Triple("Acrobatics", "acrobatics", "dex"),
            Triple("Animal Handling", "animal_handling", "wis"),
            Triple("Arcana", "arcana", "int"),
            Triple("Athletics", "athletics", "str"),
            Triple("Deception", "deception", "cha"),
            Triple("History", "history", "int"),
            Triple("Insight", "insight", "wis"),
            Triple("Intimidation", "intimidation", "cha"),
            Triple("Investigation", "investigation", "int"),
            Triple("Medicine", "medicine", "wis"),
            Triple("Nature", "nature", "int"),
            Triple("Perception", "perception", "wis"),
            Triple("Performance", "performance", "cha"),
            Triple("Persuasion", "persuasion", "cha"),
            Triple("Religion", "religion", "int"),
            Triple("Sleight of Hand", "sleight_of_hand", "dex"),
            Triple("Stealth", "stealth", "dex"),
            Triple("Survival", "survival", "wis")
        )

        val pb = kotlin.math.ceil((char.level.toDouble() / 4.0)).toInt() + 1
        
        return skillList.map { (name, key, ability) ->
            // Base Ability Score
            val baseScore = when(ability) {
                "str" -> char.str
                "dex" -> char.dex
                "con" -> char.con
                "int" -> char.int
                "wis" -> char.wis
                "cha" -> char.cha
                else -> 10
            }
            // Use calculateStatWithModifiers? Or simplistic for now as per original code. 
            // Original code used char.str directly, but modifier application (e.g. Headband of Intellect) affects skills too.
            // But let's stick to original behavior which used char.str. 
            // WAIT, original loop had: val baseScore = when... char.str.
            val abilityMod = kotlin.math.floor((baseScore - 10) / 2.0).toInt()
            
            // Check Proficiency
            val skillValue = char.proficiencies?.skills?.get(name)
            val manualProf = skillValue == "proficient" || skillValue == "expertise"
            val modProf = ModifierCalculator.getProficiencyModifiers(key, allSources)
            val isProficient = manualProf || modProf
            
            val manualExp = skillValue == "expertise"
            val modExp = ModifierCalculator.getExpertiseModifiers(key, allSources)
            val isExpertise = manualExp || modExp
            
            val bonus = ModifierCalculator.getSkillBonus(key, allSources)
            
            var total = abilityMod + bonus
            if (isExpertise) total += (pb * 2)
            else if (isProficient) total += pb
            
            ResolvedSkill(
                name = name,
                key = key,
                ability = ability,
                total = total,
                isProficient = isProficient,
                isExpertise = isExpertise,
                hasBonus = bonus > 0,
                passive = 10 + total
            )
        }.toTypedArray()
    }

    fun updateCharacterSkill(skill: String, proficiency: String) {
        val currentChar = state.value.character ?: return
        
        // Optimistic Update
        val currentSkills = currentChar.proficiencies?.skills?.toMutableMap() ?: mutableMapOf()
        currentSkills[skill] = proficiency
        
        val updatedProficiencies = currentChar.proficiencies?.copy(skills = currentSkills) 
            ?: org.dndcharacter.shared.model.CharacterProficiencies(skills = currentSkills)
            
        val optimisticChar = currentChar.copy(proficiencies = updatedProficiencies)
        
        // Resolve using current state modifiers
        val allSources = getModifierSources(optimisticChar)
        val newResolvedSkills = resolveSkills(optimisticChar, allSources)
        
        setState { it.copy(character = optimisticChar, resolvedSkills = newResolvedSkills) }

        viewModelScope.launch {
            try {
                val rawUpdated = repository.updateCharacterSkill(currentChar.id, skill, proficiency)
                 if (rawUpdated != null) {
                    val updatedChar = hydrateCharacter(rawUpdated, currentChar)
                    val serverSources = getModifierSources(updatedChar)
                    val serverResolvedSkills = resolveSkills(updatedChar, serverSources)
                    setState { it.copy(character = updatedChar, resolvedSkills = serverResolvedSkills) }
                } else {
                    // Revert on failure
                    val currentSources = getModifierSources(currentChar)
                    val revertedSkills = resolveSkills(currentChar, currentSources)
                    setState { it.copy(character = currentChar, resolvedSkills = revertedSkills, error = "Failed to update skill") }
                }
            } catch (e: Throwable) {
                val currentSources = getModifierSources(currentChar)
                val revertedSkills = resolveSkills(currentChar, currentSources)
                setState { it.copy(character = currentChar, resolvedSkills = revertedSkills, error = "Update Skill Failed: ${e.message}") }
            }
        }
    }

    fun addCharacterTool(tool: String) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                 val rawUpdated = repository.addCharacterTool(currentChar.id, tool)
                 if (rawUpdated != null) {
                    val updatedChar = hydrateCharacter(rawUpdated, currentChar)
                    setState { it.copy(character = updatedChar) }
                } else {
                    setState { it.copy(error = "Failed to add tool") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Add Tool Failed: ${e.message}") }
            }
        }
    }

    fun removeCharacterTool(tool: String) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                 val rawUpdated = repository.removeCharacterTool(currentChar.id, tool)
                 if (rawUpdated != null) {
                    val updatedChar = hydrateCharacter(rawUpdated, currentChar)
                    setState { it.copy(character = updatedChar) }
                } else {
                    setState { it.copy(error = "Failed to remove tool") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Remove Tool Failed: ${e.message}") }
            }
        }
    }

    // --- Quest Management ---

    fun addQuest(title: String, description: String?) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val newQuest = repository.addQuest(currentChar.id, title, description)
                if (newQuest != null) {
                    // Start Optimistic Update (Assuming we want to avoid full reload if possible, but safe fallback is reload)
                    // For simply adding to a top-level list, we can append.
                    val currentQuests = currentChar.quests?.toMutableList() ?: mutableListOf()
                    currentQuests.add(newQuest)
                    // prepend usually better for new stuff
                    val updatedQuests = (listOf(newQuest) + (currentChar.quests?.toList() ?: emptyList())).toTypedArray()
                    
                    val updatedChar = currentChar.copy(quests = updatedQuests)
                    setState { it.copy(character = updatedChar) }
                } else {
                    setState { it.copy(error = "Failed to add quest") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Add Quest Failed: ${e.message}") }
            }
        }
    }

    fun updateQuest(questId: Int, title: String?, description: String?, status: String?, isTracked: Boolean?) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val updatedQuest = repository.updateQuest(questId, title, description, status, isTracked)
                if (updatedQuest != null) {
                    val currentQuests = currentChar.quests?.map { 
                        if (it.id == questId) updatedQuest else it 
                    }?.toTypedArray()
                    
                    if (currentQuests != null) {
                        val updatedChar = currentChar.copy(quests = currentQuests)
                        setState { it.copy(character = updatedChar) }
                    } else {
                         // Fallback reload if something weird happened
                         loadCharacter(currentChar.id)
                    }
                } else {
                    setState { it.copy(error = "Failed to update quest") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Update Quest Failed: ${e.message}") }
            }
        }
    }

    fun deleteQuest(questId: Int) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val success = repository.deleteQuest(questId)
                if (success) {
                    val currentQuests = currentChar.quests?.filter { it.id != questId }?.toTypedArray()
                    val updatedChar = currentChar.copy(quests = currentQuests)
                    setState { it.copy(character = updatedChar) }
                } else {
                    setState { it.copy(error = "Failed to delete quest") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Delete Quest Failed: ${e.message}") }
            }
        }
    }

    fun addQuestObjective(questId: Int, description: String, order: Int?) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val newObjective = repository.addQuestObjective(questId, description, order)
                if (newObjective != null) {
                    // Deep update helper
                    val currentQuests = currentChar.quests?.map { q ->
                        if (q.id == questId) {
                            val newObjectives = (q.objectives.toList() + newObjective).toTypedArray()
                            q.copy(objectives = newObjectives)
                        } else q
                    }?.toTypedArray()
                    
                    val updatedChar = currentChar.copy(quests = currentQuests)
                    setState { it.copy(character = updatedChar) }
                } else {
                     setState { it.copy(error = "Failed to add objective") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Add Objective Failed: ${e.message}") }
            }
        }
    }

    fun toggleQuestObjective(objectiveId: Int, isCompleted: Boolean) {
        val currentChar = state.value.character ?: return
        // Optimistic update tricky without knowing questId easily from UI sometimes, 
        // but let's assume valid ID.
        // We need to find the quest that contains this objective.
        
        // Optimistic Update First (UI feels faster)
        val optimisticQuests = currentChar.quests?.map { q ->
            if (q.objectives.any { it.id == objectiveId }) {
                val newObjs = q.objectives.map { obj ->
                    if (obj.id == objectiveId) obj.copy(isCompleted = isCompleted) else obj
                }
                q.copy(objectives = newObjs.toTypedArray())
            } else q
        }?.toTypedArray()
        
        if (optimisticQuests != null) {
             setState { it.copy(character = currentChar.copy(quests = optimisticQuests)) }
        }

        viewModelScope.launch {
            try {
                val updatedObjective = repository.toggleQuestObjective(objectiveId, isCompleted)
                if (updatedObjective == null) {
                    // Revert if failed
                     setState { it.copy(error = "Failed to toggle objective", character = currentChar) }
                }
                // If successful, our optimistic update matches the server state (mostly), 
                // but strictly we might want to replace with server result if there are side effects.
                // for toggle, it's usually fine.
            } catch (e: Throwable) {
                setState { it.copy(error = "Toggle Objective Failed: ${e.message}", character = currentChar) }
            }
        }
    }

    fun addQuestLog(questId: Int, content: String) {
        val currentChar = state.value.character ?: return
         viewModelScope.launch {
            try {
                val newLog = repository.addQuestLog(questId, content)
                if (newLog != null) {
                    val currentQuests = currentChar.quests?.map { q ->
                        if (q.id == questId) {
                            // Prepend log usually? Or append. Order by date desc in query.
                            // If we add it, it's newest, so prepend or append depending on UI.
                            // Query says: orderBy: (ql, { desc }) => [desc(ql.createdAt)] -> Newest first.
                            val newLogs = (listOf(newLog) + q.logs).toTypedArray()
                            q.copy(logs = newLogs)
                        } else q
                    }?.toTypedArray()
                    
                    val updatedChar = currentChar.copy(quests = currentQuests)
                    setState { it.copy(character = updatedChar) }
                } else {
                    setState { it.copy(error = "Failed to add log") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Add Log Failed: ${e.message}") }
            }
        }
    }

    fun deleteQuestObjective(objectiveId: Int) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val success = repository.deleteQuestObjective(objectiveId)
                if (success) {
                    val currentQuests = currentChar.quests?.map { q ->
                        if (q.objectives.any { it.id == objectiveId }) {
                            val newObjs = q.objectives.filter { it.id != objectiveId }
                            q.copy(objectives = newObjs.toTypedArray())
                        } else q
                    }?.toTypedArray()
                    
                    if (currentQuests != null) {
                         setState { it.copy(character = currentChar.copy(quests = currentQuests)) }
                    }
                } else {
                    setState { it.copy(error = "Failed to delete objective") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Delete Objective Failed: ${e.message}") }
            }
        }
    }

    fun deleteQuestLog(logId: Int) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
            try {
                val success = repository.deleteQuestLog(logId)
                if (success) {
                    val currentQuests = currentChar.quests?.map { q ->
                        if (q.logs.any { it.id == logId }) {
                            val newLogs = q.logs.filter { it.id != logId }
                            q.copy(logs = newLogs.toTypedArray())
                        } else q
                    }?.toTypedArray()
                    
                    if (currentQuests != null) {
                         setState { it.copy(character = currentChar.copy(quests = currentQuests)) }
                    }
                } else {
                    setState { it.copy(error = "Failed to delete log") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Delete Log Failed: ${e.message}") }
            }
        }
    }


    fun createCustomItem(name: String, type: String, weight: Double, cost: Int, currency: String, description: String?) {
        val currentChar = state.value.character ?: return
        viewModelScope.launch {
             try {
                val newItem = repository.createCustomItem(currentChar.id, name, type, weight, cost, currency, description)
                if (newItem != null) {
                    loadCharacter(currentChar.id)
                } else {
                    setState { it.copy(error = "Failed to create custom item (Not Implemented)") }
                }
            } catch (e: Throwable) {
                setState { it.copy(error = "Create Custom Item Failed: ${e.message}") }
            }
        }
    }

    fun toggleSavingThrowProficiency(ability: String) {
        val currentChar = state.value.character ?: return
        
        val currentProficiencies = currentChar.proficiencies ?: org.dndcharacter.shared.model.CharacterProficiencies(
             skills = emptyMap(),
             savingThrows = emptyMap(),
             languages = emptyArray(),
             tools = emptyArray()
        )
        val currentSaves = currentProficiencies.savingThrows?.toMutableMap() ?: mutableMapOf()
        
        // Toggle: If true -> remove/false. If false/null -> true.
        if (currentSaves[ability] == true) {
            currentSaves.remove(ability)
        } else {
            currentSaves[ability] = true
        }
        
        val updatedProficiencies = currentProficiencies.copy(savingThrows = currentSaves)
        val updatedChar = currentChar.copy(proficiencies = updatedProficiencies)
        
        // Optimistic Update
        // We probably need to re-resolve the saving throws numbers immediately
        // Copying logic from loadCharacter is tedious, better to rely on loadCharacter or extract logic.
        // For now, let's just save and reload to be safe and correct.
        saveAndReload(updatedChar)
    }

    private fun getStandardClassSavingThrows(): Map<String, List<String>> {
        return mapOf(
            "barbarian" to listOf("str", "con"),
            "bard" to listOf("dex", "cha"),
            "cleric" to listOf("wis", "cha"),
            "druid" to listOf("int", "wis"),
            "fighter" to listOf("str", "con"),
            "monk" to listOf("str", "dex"),
            "paladin" to listOf("wis", "cha"),
            "ranger" to listOf("str", "dex"),
            "rogue" to listOf("dex", "int"),
            "sorcerer" to listOf("con", "cha"),
            "warlock" to listOf("wis", "cha"),
            "wizard" to listOf("int", "wis"),
            "artificer" to listOf("con", "int"),
            "blood hunter" to listOf("dex", "int")
        )
    }

}
