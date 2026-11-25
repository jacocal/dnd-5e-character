@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.engine

import kotlin.js.JsExport
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import org.dndcharacter.shared.mechanics.*
import org.dndcharacter.shared.model.*

/**
 * Pure Deterministic D&D 5e (2024) Rules & Command Engine.
 * Zero network I/O. Compiled to JVM (Ktor + JetBrains Koog tools) and JS (Next.js UI).
 */
@JsExport
object GameEngine {

    private val SKILLS_META = listOf(
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

    /**
     * Synchronizes auto-granted Always-Prepared spells from Subclasses, Species Traits, and Feats.
     * Distinguishes between:
     * 1) Fixed Grants (locked: source = "subclass_fixed" or "species_fixed")
     * 2) Player-Choice Grants (swappable: source = "choice:<slotId>", e.g. Magic Initiate or High Elf Cantrip)
     */
    fun syncAutoGrantedSpells(char: Character, catalog: RulesCatalog): Character {
        val currentSpells = (char.spells?.toList() ?: emptyList()).toMutableList()
        val spellIdsInCatalog = catalog.spells.associateBy { it.id }
        val bg = catalog.backgrounds.find { it.id == char.backgroundId } ?: char.background
        val raceEntry = catalog.races.find { it.id == char.raceId } ?: char.raceEntry

        fun ensureFixedSpellGranted(spellId: String, fixedSource: String) {
            if (!spellIdsInCatalog.containsKey(spellId)) return
            val existingIdx = currentSpells.indexOfFirst { it.spellId == spellId }
            if (existingIdx == -1) {
                val ruleSpell = spellIdsInCatalog[spellId]
                currentSpells.add(
                    CharacterSpell(
                        characterId = char.id,
                        spellId = spellId,
                        prepared = true,
                        isRitual = ruleSpell?.isRitual ?: false,
                        isConcentrating = false,
                        source = fixedSource,
                        alwaysPrepared = true,
                        spell = ruleSpell,
                        spellName = ruleSpell?.name,
                        spellLevel = ruleSpell?.level
                    )
                )
            } else {
                val ex = currentSpells[existingIdx]
                if (!ex.source.startsWith("choice:")) {
                    currentSpells[existingIdx] = ex.copy(
                        prepared = true,
                        source = fixedSource,
                        alwaysPrepared = true
                    )
                }
            }
        }

        // 1. Subclass Fixed Always-Prepared Spells (Domain / Oath / Patron tables)
        char.classes?.forEach { cls ->
            if (!cls.subclassId.isNullOrBlank()) {
                val subclass = catalog.subclasses.find { it.id == cls.subclassId }
                subclass?.grantedSpells?.forEach { (unlockLvlStr, spellIds) ->
                    val unlockLvl = unlockLvlStr.toIntOrNull() ?: 99
                    if (cls.level >= unlockLvl) {
                        spellIds.forEach { ensureFixedSpellGranted(it, "subclass_fixed") }
                    }
                }
            }
        }

        // 2. Species Trait Spells (Fixed vs Choice: High Elf Lv 1 cantrip is player choice!)
        val charTraitIds = (char.traits?.map { it.id } ?: emptyList()).toSet()
        val isHighElf = char.raceId.equals("elf-high", ignoreCase = true) ||
            char.raceId.equals("high-elf", ignoreCase = true) ||
            charTraitIds.contains("high-elf-lineage") ||
            charTraitIds.contains("high-elf-cantrip")
        catalog.traits.filter {
            charTraitIds.contains(it.id) || (it.race != null && char.raceId.startsWith(it.race))
        }.forEach { trait ->
            trait.grantedSpells.forEach { (unlockLvlStr, spellIds) ->
                val unlockLvl = unlockLvlStr.toIntOrNull() ?: 1
                if (char.level >= unlockLvl) {
                    spellIds.forEach { spId ->
                        val ruleSp = spellIdsInCatalog[spId]
                        if (isHighElf && unlockLvl == 1 && ruleSp?.level == 0) {
                            // High Elf Lv 1 Wizard cantrip is a player-choice slot, not a locked fixed spell
                            val slotKey = "choice:species:high-elf:cantrip:1"
                            if (currentSpells.none { it.source == slotKey }) {
                                val legacyIdx = currentSpells.indexOfFirst { it.spellId == spId && it.source == "species" }
                                if (legacyIdx >= 0) {
                                    currentSpells[legacyIdx] = currentSpells[legacyIdx].copy(source = slotKey, alwaysPrepared = true, prepared = true)
                                }
                            }
                        } else {
                            ensureFixedSpellGranted(spId, "species_fixed")
                        }
                    }
                }
            }
        }

        // 3. Migrate legacy "feat" spells (e.g., from Magic Initiate) into swappable "choice:feat:..." slots
        val hasMagicInitiate = char.feats?.any { it.id == "magic-initiate" } == true || bg?.originFeatId == "magic-initiate"
        if (hasMagicInitiate) {
            val miClass = bg?.originFeatClass ?: "cleric"
            val c1Slot = "choice:feat:magic-initiate:$miClass:cantrip:1"
            val c2Slot = "choice:feat:magic-initiate:$miClass:cantrip:2"
            val l1Slot = "choice:feat:magic-initiate:$miClass:lvl1:1"

            val legacyFeatSpells = currentSpells.mapIndexedNotNull { idx, sp ->
                if (sp.source == "feat") idx to sp else null
            }
            var cantripAssigned = currentSpells.count { it.source == c1Slot || it.source == c2Slot }
            var lvl1Assigned = currentSpells.count { it.source == l1Slot }

            for ((idx, sp) in legacyFeatSpells) {
                val lvl = sp.spell?.level ?: spellIdsInCatalog[sp.spellId]?.level ?: 0
                if (lvl == 0) {
                    val targetSlot = if (currentSpells.none { it.source == c1Slot }) c1Slot
                    else if (currentSpells.none { it.source == c2Slot }) c2Slot
                    else null
                    if (targetSlot != null) {
                        currentSpells[idx] = sp.copy(source = targetSlot, alwaysPrepared = true, prepared = true)
                        cantripAssigned++
                    }
                } else if (lvl == 1 && lvl1Assigned == 0 && currentSpells.none { it.source == l1Slot }) {
                    currentSpells[idx] = sp.copy(source = l1Slot, alwaysPrepared = true, prepared = true)
                    lvl1Assigned++
                }
            }
        }

        return char.copy(
            spells = currentSpells.toTypedArray(),
            raceEntry = raceEntry ?: char.raceEntry,
            background = bg ?: char.background
        )
    }

    private fun buildSpellGrantSlots(char: Character, catalog: RulesCatalog): Array<SpellGrantSlot> {
        val slots = mutableListOf<SpellGrantSlot>()
        val bg = catalog.backgrounds.find { it.id == char.backgroundId } ?: char.background
        val currentSpells = char.spells ?: emptyArray()
        val spellMap = catalog.spells.associateBy { it.id }
        val usedFreeMap = char.usedSpellSlots?.slots ?: emptyMap()

        fun addChoiceSlot(
            slotId: String,
            sourceType: String,
            sourceId: String,
            sourceName: String,
            spellClassFilter: String,
            spellLevel: Int,
            grantsFreeCast: Boolean
        ) {
            val bound = currentSpells.find { it.source == "choice:$slotId" }
            val spName = bound?.let { it.spell?.name ?: spellMap[it.spellId]?.name ?: it.spellName ?: it.spellId }
            val freeUsed = (usedFreeMap["free:$slotId"] ?: 0) > 0
            slots.add(
                SpellGrantSlot(
                    slotId = slotId,
                    sourceType = sourceType,
                    sourceId = sourceId,
                    sourceName = sourceName,
                    spellClassFilter = spellClassFilter,
                    spellLevel = spellLevel,
                    selectedSpellId = bound?.spellId,
                    selectedSpellName = spName,
                    grantsFreeCastPerLongRest = grantsFreeCast,
                    freeCastUsed = freeUsed
                )
            )
        }

        // 1. Magic Initiate (Origin Feat or Chosen Feat) -> 2 Cantrips + 1 Level 1 Spell (with 1/LR Free Cast)
        val hasMagicInitiate = char.feats?.any { it.id == "magic-initiate" } == true || bg?.originFeatId == "magic-initiate"
        if (hasMagicInitiate) {
            val miClass = (bg?.originFeatClass ?: "cleric").lowercase()
            val classLabel = miClass.replaceFirstChar { it.uppercase() }
            addChoiceSlot(
                slotId = "feat:magic-initiate:$miClass:cantrip:1",
                sourceType = "feat",
                sourceId = "magic-initiate",
                sourceName = "Magic Initiate ($classLabel) — Cantrip 1",
                spellClassFilter = miClass,
                spellLevel = 0,
                grantsFreeCast = false
            )
            addChoiceSlot(
                slotId = "feat:magic-initiate:$miClass:cantrip:2",
                sourceType = "feat",
                sourceId = "magic-initiate",
                sourceName = "Magic Initiate ($classLabel) — Cantrip 2",
                spellClassFilter = miClass,
                spellLevel = 0,
                grantsFreeCast = false
            )
            addChoiceSlot(
                slotId = "feat:magic-initiate:$miClass:lvl1:1",
                sourceType = "feat",
                sourceId = "magic-initiate",
                sourceName = "Magic Initiate ($classLabel) — Level 1 Spell",
                spellClassFilter = miClass,
                spellLevel = 1,
                grantsFreeCast = true
            )
        }

        // 2. High Elf Species Cantrip Choice (2024 PHB: swappable Wizard cantrip after Long Rest)
        val charTraitIds = (char.traits?.map { it.id } ?: emptyList()).toSet()
        if (char.raceId.equals("elf-high", ignoreCase = true) ||
            char.raceId.equals("high-elf", ignoreCase = true) ||
            charTraitIds.contains("high-elf-lineage") ||
            charTraitIds.contains("high-elf-cantrip")
        ) {
            addChoiceSlot(
                slotId = "species:high-elf:cantrip:1",
                sourceType = "species",
                sourceId = "elf-high",
                sourceName = "High Elf Lineage — Wizard Cantrip",
                spellClassFilter = "wizard",
                spellLevel = 0,
                grantsFreeCast = false
            )
        }

        // 2b. Warlock Mystic Arcanum (2024 PHB: 1/Long Rest 6th/7th/8th/9th level Warlock spell at Lv 11/13/15/17)
        val warlockLvl = char.classes?.find { it.classId.equals("warlock", ignoreCase = true) }?.level ?: 0
        val arcanumUnlocks = listOf(11 to 6, 13 to 7, 15 to 8, 17 to 9)
        for ((reqLvl, spLvl) in arcanumUnlocks) {
            if (warlockLvl >= reqLvl) {
                addChoiceSlot(
                    slotId = "class:warlock:mystic-arcanum:$spLvl",
                    sourceType = "class",
                    sourceId = "warlock",
                    sourceName = "Mystic Arcanum (Level $spLvl Warlock Spell)",
                    spellClassFilter = "warlock",
                    spellLevel = spLvl,
                    grantsFreeCast = true
                )
            }
        }

        // 3. Fey Touched / Shadow Touched Feat Choice Slots
        if (char.feats?.any { it.id == "fey-touched" } == true) {
            addChoiceSlot(
                slotId = "feat:fey-touched:lvl1:1",
                sourceType = "feat",
                sourceId = "fey-touched",
                sourceName = "Fey Touched — Level 1 Spell",
                spellClassFilter = "any",
                spellLevel = 1,
                grantsFreeCast = true
            )
        }
        if (char.feats?.any { it.id == "shadow-touched" } == true) {
            addChoiceSlot(
                slotId = "feat:shadow-touched:lvl1:1",
                sourceType = "feat",
                sourceId = "shadow-touched",
                sourceName = "Shadow Touched — Level 1 Spell",
                spellClassFilter = "any",
                spellLevel = 1,
                grantsFreeCast = true
            )
        }

        return slots.toTypedArray()
    }

    private val FIGHTING_STYLE_OPTIONS = arrayOf(
        FeatureChoiceOption("fs-defense", "Defense", "While wearing Light, Medium, or Heavy armor, you gain a +1 bonus to Armor Class.", "+1 AC while wearing armor"),
        FeatureChoiceOption("fs-dueling", "Dueling", "When wielding a melee weapon in one hand and no other weapons, gain a +2 bonus to damage rolls with that weapon.", "+2 Damage with 1H melee weapon"),
        FeatureChoiceOption("fs-archery", "Archery", "You gain a +2 bonus to attack rolls you make with Ranged weapons.", "+2 To-Hit with Ranged weapons"),
        FeatureChoiceOption("fs-gwf", "Great Weapon Fighting", "When you roll a 1 or 2 on a damage die for a Two-Handed or Versatile (2H) melee weapon, treat the die as a 3.", "Min 3 on 2H melee damage dice"),
        FeatureChoiceOption("fs-twf", "Two-Weapon Fighting", "Add your ability modifier to the damage of your extra Light weapon attack.", "+Ability Mod on off-hand Light attack"),
        FeatureChoiceOption("fs-thrown", "Thrown Weapon Fighting", "Whenever you hit with a Ranged attack using a Thrown weapon, gain a +2 bonus to the damage roll.", "+2 Damage with Thrown weapons"),
        FeatureChoiceOption("fs-unarmed", "Unarmed Fighting", "Unarmed Strikes deal 1d6 + STR (1d8 + STR if no weapons or shield equipped) Bludgeoning damage.", "1d6 / 1d8 Unarmed Strike die"),
        FeatureChoiceOption("fs-interception", "Interception", "Reaction: Reduce damage dealt to an adjacent ally by 1d10 + Proficiency Bonus while wielding a shield or weapon.", "Reaction: -1d10-PB ally damage"),
        FeatureChoiceOption("fs-protection", "Protection", "Reaction: Impose Disadvantage on attack rolls against an adjacent ally while wielding a shield.", "Reaction: Disadvantage vs ally"),
        FeatureChoiceOption("fs-blind-fighting", "Blind Fighting", "You have Blindsight with a range of 10 feet.", "10 ft. Blindsight")
    )

    private val ELDRITCH_INVOCATION_OPTIONS = arrayOf(
        FeatureChoiceOption("inv-agonizing-blast", "Agonizing Blast", "Add your Charisma modifier to the damage rolls of your Warlock damaging cantrips.", "+CHA Mod to Warlock Cantrip Damage"),
        FeatureChoiceOption("inv-pact-of-the-blade", "Pact of the Blade", "Conjure or bond a melee Pact weapon and use your Charisma modifier for its attack and damage rolls.", "Use CHA for melee weapon Hit & Dmg"),
        FeatureChoiceOption("inv-devils-sight", "Devil's Sight", "You can see normally in Dim Light and Darkness—both magical and nonmagical—within 120 feet.", "120 ft. Magical & Normal Darkvision"),
        FeatureChoiceOption("inv-armor-of-shadows", "Armor of Shadows", "Cast Mage Armor on yourself at will without expending a spell slot (AC 13 + DEX while Unarmored).", "+3 Unarmored AC (Mage Armor at will)"),
        FeatureChoiceOption("inv-fiendish-vigor", "Fiendish Vigor", "Cast False Life on yourself at will for maximum roll (12 Temporary HP).", "At-will 12 Temp HP"),
        FeatureChoiceOption("inv-repelling-blast", "Repelling Blast", "When you hit a Large or smaller creature with a Warlock attack cantrip, push it up to 10 ft. straight away.", "Push 10 ft. on Cantrip Hit"),
        FeatureChoiceOption("inv-eldritch-spear", "Eldritch Spear", "Increases the range of your Warlock damaging cantrips by +(30 × Warlock Level) feet.", "+30×Lvl ft. Cantrip Range"),
        FeatureChoiceOption("inv-pact-of-the-chain", "Pact of the Chain", "Learn Find Familiar and summon special forms (Imp, Pseudodragon, Quasit, Sprite) that can attack.", "Unlocks Imp & Chain Familiars"),
        FeatureChoiceOption("inv-pact-of-the-tome", "Pact of the Tome", "Conjure a Book of Shadows granting 3 cantrips and 2 Level 1 ritual spells from any class list.", "Book of Shadows Cantrips & Rituals"),
        FeatureChoiceOption("inv-eldritch-mind", "Eldritch Mind", "You have Advantage on Constitution saving throws that you make to maintain Concentration.", "Advantage on Concentration Saves"),
        FeatureChoiceOption("inv-lessons-first-ones", "Lessons of the First Ones (Lv 2+)", "You gain an Origin feat of your choice (Repeatable).", "+1 Origin Feat"),
        FeatureChoiceOption("inv-mask-of-many-faces", "Mask of Many Faces (Lv 2+)", "You can cast Disguise Self without expending a spell slot.", "At-will Disguise Self"),
        FeatureChoiceOption("inv-misty-visions", "Misty Visions (Lv 2+)", "You can cast Silent Image without expending a spell slot.", "At-will Silent Image"),
        FeatureChoiceOption("inv-thirsting-blade", "Thirsting Blade (Lv 5+)", "You gain Extra Attack with your Pact weapon (attack twice instead of once).", "Extra Attack (2 attacks)"),
        FeatureChoiceOption("inv-eldritch-smite", "Eldritch Smite (Lv 5+)", "Once per turn on a Pact weapon hit, expend a Pact Magic slot to deal +1d8 + 1d8/slot Force damage and knock Huge or smaller target Prone.", "+Force Smite & Prone"),
        FeatureChoiceOption("inv-lifedrinker", "Lifedrinker (Lv 9+)", "Once per turn when you hit with your Pact weapon, deal extra +1d6 Necrotic, Psychic, or Radiant damage.", "+1d6 Pact Weapon Damage Rider"),
        FeatureChoiceOption("inv-devouring-blade", "Devouring Blade (Lv 12+)", "The Extra Attack of your Thirsting Blade invocation confers two extra attacks rather than one (3 total).", "Extra Attack (3 attacks)")
    )

    private val METAMAGIC_OPTIONS = arrayOf(
        FeatureChoiceOption("mm-empowered", "Empowered Spell (1 SP)", "Reroll up to your CHA modifier of spell damage dice and must use the new rolls.", "Reroll lowest spell damage dice"),
        FeatureChoiceOption("mm-quickened", "Quickened Spell (2 SP)", "Change a 1 Action spell's casting time to 1 Bonus Action.", "Cast 1 Action spell as Bonus Action"),
        FeatureChoiceOption("mm-twinned", "Twinned Spell (1 SP)", "Spend 1 Sorcery Point to upcast a spell by 1 level to target an additional creature.", "Target +1 creature for 1 SP"),
        FeatureChoiceOption("mm-heightened", "Heightened Spell (2 SP)", "One target of your spell has Disadvantage on saving throws against the spell.", "Target has Disadvantage on Save"),
        FeatureChoiceOption("mm-seeking", "Seeking Spell (1 SP)", "If you miss with a spell attack roll, spend 1 SP to reroll the d20.", "Advantage / Reroll on Spell Attack"),
        FeatureChoiceOption("mm-subtle", "Subtle Spell (1 SP)", "Cast a spell without Verbal, Somatic, or Material components.", "No V/S/M components required"),
        FeatureChoiceOption("mm-careful", "Careful Spell (1 SP)", "Up to CHA modifier creatures automatically succeed on their save against your spell and take 0 damage.", "Protect allies from AoE spell"),
        FeatureChoiceOption("mm-transmuted", "Transmuted Spell (1 SP)", "Change an elemental spell's damage type to Acid, Cold, Fire, Lightning, Poison, or Thunder.", "Change Elemental Damage Type"),
        FeatureChoiceOption("mm-distant", "Distant Spell (1 SP)", "Double a spell's range (or change Touch range to 30 ft.).", "2× Spell Range"),
        FeatureChoiceOption("mm-extended", "Extended Spell (1 SP)", "Double a spell's duration and gain Advantage on Concentration saves to maintain it.", "2× Duration + Adv on Conc. Saves")
    )

    private val MANEUVER_OPTIONS = arrayOf(
        FeatureChoiceOption("man-precision", "Precision Attack", "Expend 1 Superiority Die and add it (+1d8/1d10/1d12) to a weapon attack roll.", "+Superiority Die to Attack Roll"),
        FeatureChoiceOption("man-trip", "Trip Attack", "Add Superiority Die to weapon damage and force Large or smaller target to pass a STR Save or fall Prone.", "+Superiority Die Dmg + Prone"),
        FeatureChoiceOption("man-menacing", "Menacing Attack", "Add Superiority Die to weapon damage and force target to pass a WIS Save or become Frightened.", "+Superiority Die Dmg + Frightened"),
        FeatureChoiceOption("man-pushing", "Pushing Attack", "Add Superiority Die to weapon damage and push Large or smaller target up to 15 ft. away on STR Save fail.", "+Superiority Die Dmg + Push 15 ft."),
        FeatureChoiceOption("man-riposte", "Riposte", "When a creature misses you with a melee attack, use Reaction to attack and add Superiority Die to damage.", "Reaction Attack + Superiority Die Dmg"),
        FeatureChoiceOption("man-feinting", "Feinting Attack", "Bonus Action: Gain Advantage on your next attack roll against adjacent target and add Superiority Die to damage.", "Advantage + Superiority Die Dmg"),
        FeatureChoiceOption("man-disarming", "Disarming Attack", "Add Superiority Die to weapon damage and force target to pass a STR Save or drop one held item.", "+Superiority Die Dmg + Disarm"),
        FeatureChoiceOption("man-goading", "Goading Attack", "Add Superiority Die to weapon damage; target has Disadvantage on attacks against others on WIS Save fail.", "+Superiority Die Dmg + Taunt"),
        FeatureChoiceOption("man-ambush", "Ambush", "Add Superiority Die to a Stealth check or Initiative roll.", "+Superiority Die to Stealth/Init"),
        FeatureChoiceOption("man-bait-and-switch", "Bait and Switch", "Swap places with a willing ally within 5 ft. and add Superiority Die to your or their AC until next turn.", "Swap + Superiority Die AC"),
        FeatureChoiceOption("man-commanders-strike", "Commander's Strike", "Forego one attack to let an ally make a Reaction weapon attack adding your Superiority Die to damage.", "Ally Reaction Attack + Die"),
        FeatureChoiceOption("man-evasive-footwork", "Evasive Footwork", "Bonus Action: Roll Superiority Die and add to AC until the start of your next turn.", "Bonus Action +Die to AC"),
        FeatureChoiceOption("man-lunging-attack", "Lunging Attack", "Bonus Action Dash + add Superiority Die to melee weapon damage if you move 5+ ft.", "BA Dash + Superiority Die Dmg"),
        FeatureChoiceOption("man-parry", "Parry", "Reaction: Reduce melee damage taken by Superiority Die + DEX modifier.", "Reaction Damage Reduction"),
        FeatureChoiceOption("man-sweeping-attack", "Sweeping Attack", "On a melee hit, deal Superiority Die damage to a second creature within 5 ft.", "Cleave Superiority Die Dmg"),
        FeatureChoiceOption("man-tactical-assessment", "Tactical Assessment", "Add Superiority Die to an Investigation, History, or Insight check.", "+Superiority Die to Knowledge Check")
    )

    private fun buildFeatureChoiceSlots(char: Character): Array<FeatureChoiceSlot> {
        val slots = mutableListOf<FeatureChoiceSlot>()
        val selectedMap = char.proficiencies?.featureChoices ?: emptyMap()

        fun addSlot(slotId: String, category: String, sourceClass: String, unlockLevel: Int, options: Array<FeatureChoiceOption>, defaultOptionId: String? = null) {
            val chosenId = selectedMap[slotId] ?: defaultOptionId
            val opt = options.find { it.id == chosenId }
            slots.add(
                FeatureChoiceSlot(
                    slotId = slotId,
                    category = category,
                    sourceClass = sourceClass,
                    unlockLevel = unlockLevel,
                    selectedOptionId = opt?.id,
                    selectedOptionName = opt?.name,
                    selectedOptionSummary = opt?.effectSummary,
                    options = options
                )
            )
        }

        char.classes?.forEach { cls ->
            val lvl = cls.level
            when (cls.classId.lowercase()) {
                "fighter" -> {
                    addSlot("fighter:fighting-style:1", "Fighting Style", "Fighter", 1, FIGHTING_STYLE_OPTIONS, "fs-defense")
                    // 2024 PHB: Champion Fighter Additional Fighting Style unlocks at Level 10
                    if (cls.subclassId?.contains("champion", ignoreCase = true) == true && lvl >= 10) {
                        addSlot("fighter:fighting-style:2", "Additional Fighting Style (Champion)", "Fighter (Champion)", 10, FIGHTING_STYLE_OPTIONS)
                    }
                    if (cls.subclassId?.contains("battle", ignoreCase = true) == true && lvl >= 3) {
                        val manCount = if (lvl >= 15) 9 else if (lvl >= 10) 7 else if (lvl >= 7) 5 else 3
                        val defaults = listOf("man-precision", "man-trip", "man-menacing", "man-riposte", "man-pushing")
                        for (i in 1..manCount) {
                            val unlock = if (i <= 3) 3 else if (i <= 5) 7 else if (i <= 7) 10 else 15
                            addSlot("fighter:maneuver:$i", "Battle Master Maneuver #$i", "Fighter (Battle Master)", unlock, MANEUVER_OPTIONS, defaults.getOrNull(i - 1))
                        }
                    }
                }
                "paladin" -> {
                    if (lvl >= 2) {
                        addSlot("paladin:fighting-style:1", "Fighting Style", "Paladin", 2, FIGHTING_STYLE_OPTIONS, "fs-defense")
                    }
                }
                "ranger" -> {
                    if (lvl >= 2) {
                        addSlot("ranger:fighting-style:1", "Fighting Style", "Ranger", 2, FIGHTING_STYLE_OPTIONS, "fs-archery")
                    }
                }
                "warlock" -> {
                    val invCount = when {
                        lvl >= 18 -> 10
                        lvl >= 15 -> 9
                        lvl >= 12 -> 8
                        lvl >= 9 -> 7
                        lvl >= 7 -> 6
                        lvl >= 5 -> 5
                        lvl >= 2 -> 3
                        else -> 1
                    }
                    val defaults = listOf("inv-agonizing-blast", "inv-pact-of-the-blade", "inv-devils-sight", "inv-armor-of-shadows", "inv-thirsting-blade")
                    for (i in 1..invCount) {
                        val unlock = if (i == 1) 1 else if (i <= 3) 2 else if (i <= 5) 5 else if (i == 6) 7 else if (i == 7) 9 else if (i == 8) 12 else if (i == 9) 15 else 18
                        addSlot("warlock:invocation:$i", "Eldritch Invocation #$i", "Warlock", unlock, ELDRITCH_INVOCATION_OPTIONS, defaults.getOrNull(i - 1))
                    }
                }
                "sorcerer" -> {
                    if (lvl >= 2) {
                        val mmCount = if (lvl >= 17) 6 else if (lvl >= 10) 4 else 2
                        val defaults = listOf("mm-quickened", "mm-empowered", "mm-twinned", "mm-heightened", "mm-subtle", "mm-seeking")
                        for (i in 1..mmCount) {
                            val unlock = if (i <= 2) 2 else if (i <= 4) 10 else 17
                            addSlot("sorcerer:metamagic:$i", "Metamagic Option #$i", "Sorcerer", unlock, METAMAGIC_OPTIONS, defaults.getOrNull(i - 1))
                        }
                    }
                }
                "cleric" -> {
                    addSlot(
                        "cleric:divine-order:1",
                        "Divine Order",
                        "Cleric",
                        1,
                        arrayOf(
                            FeatureChoiceOption("cleric-protector", "Protector", "Trained for battle: Gain proficiency with Heavy Armor and Martial Weapons.", "Heavy Armor & Martial Weapons"),
                            FeatureChoiceOption("cleric-thaumaturge", "Thaumaturge", "Learn +1 extra Cleric Cantrip and add your Wisdom modifier (+WIS) to Arcana and Religion checks.", "+1 Cantrip & +WIS to Arcana/Religion")
                        ),
                        "cleric-protector"
                    )
                    if (lvl >= 7) {
                        addSlot(
                            "cleric:blessed-strikes:7",
                            "Blessed Strikes",
                            "Cleric",
                            7,
                            arrayOf(
                                FeatureChoiceOption("cleric-divine-strike", "Divine Strike", "Once per turn on a weapon hit, deal extra +1d8 (+2d8 at Lv 14) Radiant or Necrotic damage.", "+1d8 Weapon Damage Rider"),
                                FeatureChoiceOption("cleric-potent-spellcasting", "Potent Spellcasting", "Add your Wisdom modifier (+WIS) to the damage you deal with any Cleric cantrip.", "+WIS Mod to Cleric Cantrip Damage")
                            ),
                            "cleric-potent-spellcasting"
                        )
                    }
                }
                "druid" -> {
                    addSlot(
                        "druid:primal-order:1",
                        "Primal Order",
                        "Druid",
                        1,
                        arrayOf(
                            FeatureChoiceOption("druid-warden", "Warden", "Trained for battle: Gain proficiency with Medium Armor and Martial Weapons.", "Medium Armor & Martial Weapons"),
                            FeatureChoiceOption("druid-magician", "Magician", "Learn +1 extra Druid Cantrip and add your Wisdom modifier (+WIS) to Arcana and Nature checks.", "+1 Cantrip & +WIS to Arcana/Nature")
                        ),
                        "druid-magician"
                    )
                    if (lvl >= 7) {
                        addSlot(
                            "druid:elemental-fury:7",
                            "Elemental Fury",
                            "Druid",
                            7,
                            arrayOf(
                                FeatureChoiceOption("druid-primal-strike", "Primal Strike", "Once per turn on a weapon or Beast-form hit, deal extra +1d8 (+2d8 at Lv 15) Cold, Fire, Lightning, or Thunder damage.", "+1d8 Weapon/Beast Damage Rider"),
                                FeatureChoiceOption("druid-potent-spellcasting", "Potent Spellcasting", "Add your Wisdom modifier (+WIS) to the damage you deal with any Druid cantrip.", "+WIS Mod to Druid Cantrip Damage")
                            ),
                            "druid-potent-spellcasting"
                        )
                    }
                }
            }
        }
        return slots.toTypedArray()
    }

    /**
     * D&D 5e (2024) Weapon Mastery Limit by Class & Level (+ Weapon Master Feat).
     * Non-martial classes (Wizard, Sorcerer, Warlock, Cleric, Druid, Bard, Monk) have 0 Weapon Masteries unless they take Weapon Master.
     */
    private fun calculateWeaponMasteryLimit(char: Character): Int {
        var total = 0
        char.classes?.forEach { cls ->
            val l = cls.level
            total += when (cls.classId.lowercase()) {
                "fighter" -> if (l >= 16) 6 else if (l >= 10) 5 else if (l >= 4) 4 else 3
                "barbarian" -> if (l >= 10) 4 else if (l >= 4) 3 else 2
                "paladin", "ranger", "rogue" -> 2
                else -> 0
            }
        }
        if (char.feats?.any { it.id.contains("weapon-master", ignoreCase = true) } == true) {
            total += 1
        }
        return total
    }

    private fun buildAvailableCompanions(
        char: Character,
        knownSpells: Array<KnownSpell>,
        spellcastingStats: Array<ResolvedSpellcastingStats>,
        effModMap: Map<String, Int>,
        pb: Int,
        activeChosenFeatureIds: Set<String>
    ): Array<CompanionForm> {
        val forms = mutableListOf<CompanionForm>()
        val primarySpellStat = spellcastingStats.firstOrNull()
        val spellAtk = primarySpellStat?.attackBonus ?: (pb + 3)
        val wisMod = effModMap["wis"] ?: 2

        val druidCls = char.classes?.find { it.classId == "druid" }
        val druidLvl = druidCls?.level ?: 0
        val isMoonDruid = druidLvl >= 3 && (druidCls?.subclassId?.contains("moon", ignoreCase = true) == true)
        val rangerCls = char.classes?.find { it.classId == "ranger" }
        val isBeastMaster = (rangerCls?.level ?: 0) >= 3 && (rangerCls?.subclassId?.contains("beast", ignoreCase = true) == true)
        val paladinLvl = char.classes?.find { it.classId == "paladin" }?.level ?: 0
        val wizardLvl = char.classes?.find { it.classId == "wizard" }?.level ?: 0
        val hasChainPact = activeChosenFeatureIds.contains("inv-pact-of-the-chain")
        val knownSpellIds = knownSpells.map { it.spell.id }.toSet()

        if (druidLvl >= 2) {
            // 2024 PHB: Standard Druid Wild Shape = Druid Level Temp HP; Circle of the Moon = 3 * Druid Level Temp HP & AC max(base, 13 + WIS)
            val wsTempHp = if (isMoonDruid) 3 * druidLvl else druidLvl
            val moonAcFloor = if (isMoonDruid) 13 + wisMod else 0
            val wsLabel = if (isMoonDruid) "Circle of the Moon Wild Shape: +$wsTempHp Temp HP, AC max(base, 13+WIS)" else "2024 Wild Shape: +$wsTempHp Temp HP"
            forms.add(
                CompanionForm(
                    id = "ws-brown-bear",
                    name = "Wild Shape: Brown Bear",
                    category = "Wild Shape Beast",
                    maxHp = max(22, wsTempHp),
                    armorClass = max(11, moonAcFloor),
                    speed = "40 ft., Climb 30 ft.",
                    attackName = "Multiattack (Bite & Claws)",
                    attackBonus = max(5, spellAtk),
                    damageDice = "2d6",
                    damageBonus = 4,
                    damageType = "slashing",
                    notes = "$wsLabel; Claws inflict Prone."
                )
            )
            forms.add(
                CompanionForm(
                    id = "ws-dire-wolf",
                    name = "Wild Shape: Dire Wolf",
                    category = "Wild Shape Beast",
                    maxHp = max(22, wsTempHp),
                    armorClass = max(14, moonAcFloor),
                    speed = "50 ft.",
                    attackName = "Bite (Pack Tactics & Prone)",
                    attackBonus = max(5, spellAtk),
                    damageDice = "1d10",
                    damageBonus = 3,
                    damageType = "piercing",
                    notes = "$wsLabel; Pack Tactics (Advantage near ally) & knocks target Prone."
                )
            )
            forms.add(
                CompanionForm(
                    id = "ws-giant-spider",
                    name = "Wild Shape: Giant Spider",
                    category = "Wild Shape Beast",
                    maxHp = max(26, wsTempHp),
                    armorClass = max(14, moonAcFloor),
                    speed = "30 ft., Climb 30 ft.",
                    attackName = "Venomous Bite & Web",
                    attackBonus = max(5, spellAtk),
                    damageDice = "1d8",
                    damageBonus = 3,
                    damageType = "piercing",
                    notes = "$wsLabel; +2d6 Poison on hit, Spider Climb, Web Walker, Darkvision 60 ft."
                )
            )
        }

        if (isBeastMaster) {
            val rLvl = rangerCls?.level ?: 3
            val beastAc = 13 + max(0, wisMod) // 2024 PHB: 13 + WIS mod
            forms.add(
                CompanionForm(
                    id = "bm-beast-land",
                    name = "Primal Companion: Beast of the Land",
                    category = "Primal Companion",
                    maxHp = 5 + (5 * rLvl),
                    armorClass = beastAc,
                    speed = "40 ft., Climb 40 ft.",
                    attackName = "Beast's Strike (Charge +1d6 & Prone)",
                    attackBonus = spellAtk,
                    damageDice = "1d8",
                    damageBonus = 2 + max(1, wisMod),
                    damageType = "slashing",
                    notes = "Primal Bond: Add +$pb (PB) to all ability checks and saving throws the Beast makes."
                )
            )
            forms.add(
                CompanionForm(
                    id = "bm-beast-sea",
                    name = "Primal Companion: Beast of the Sea",
                    category = "Primal Companion",
                    maxHp = 5 + (5 * rLvl),
                    armorClass = beastAc,
                    speed = "5 ft., Swim 60 ft.",
                    attackName = "Binding Strike (Auto-Grapple)",
                    attackBonus = spellAtk,
                    damageDice = "1d6",
                    damageBonus = 2 + max(1, wisMod),
                    damageType = "piercing",
                    notes = "Amphibious; hit automatically Grapples target (escape DC = Spell Save DC). Primal Bond: +$pb to checks & saves."
                )
            )
            forms.add(
                CompanionForm(
                    id = "bm-beast-sky",
                    name = "Primal Companion: Beast of the Sky",
                    category = "Primal Companion",
                    maxHp = 4 + (4 * rLvl),
                    armorClass = beastAc,
                    speed = "10 ft., Fly 60 ft.",
                    attackName = "Beast's Strike (Flyby)",
                    attackBonus = spellAtk,
                    damageDice = "1d4",
                    damageBonus = 3 + max(1, wisMod),
                    damageType = "slashing",
                    notes = "Flyby: Doesn't provoke Opportunity Attacks when flying out of an enemy's reach. Primal Bond: +$pb to checks & saves."
                )
            )
        }

        if (paladinLvl >= 5 || knownSpellIds.contains("find-steed")) {
            forms.add(
                CompanionForm(
                    id = "steed-otherworldly",
                    name = "Otherworldly Steed (Find Steed)",
                    category = "Find Steed",
                    maxHp = 25,
                    armorClass = 12 + pb,
                    speed = "60 ft.",
                    attackName = "Otherworldly Slam",
                    attackBonus = spellAtk,
                    damageDice = "1d8",
                    damageBonus = 2,
                    damageType = "radiant",
                    notes = "Celestial/Fey/Fiend Mount; Fey Step (60 ft. Bonus Action teleport 1/Long Rest)."
                )
            )
        }

        if (wizardLvl >= 1 || hasChainPact || knownSpellIds.contains("find-familiar")) {
            forms.add(
                CompanionForm(
                    id = "fam-owl",
                    name = "Familiar: Owl (Flyby & Help)",
                    category = "Familiar",
                    maxHp = 3,
                    armorClass = 11,
                    speed = "5 ft., Fly 60 ft.",
                    attackName = "Talons / Help Action (Grant Advantage)",
                    attackBonus = spellAtk,
                    damageDice = "1d4",
                    damageBonus = 1,
                    damageType = "slashing",
                    notes = "Flyby + Help Action: Swoops in to grant you Advantage on your next attack roll without provoking OA."
                )
            )
        }
        if (hasChainPact) {
            forms.add(
                CompanionForm(
                    id = "fam-imp",
                    name = "Pact of the Chain: Imp Familiar",
                    category = "Familiar",
                    maxHp = 21,
                    armorClass = 13,
                    speed = "20 ft., Fly 40 ft.",
                    attackName = "Venomous Sting",
                    attackBonus = spellAtk,
                    damageDice = "3d6",
                    damageBonus = 3,
                    damageType = "poison",
                    notes = "Invisibility at will, Devil's Sight (120 ft.), Magic Resistance, Fire Immunity."
                )
            )
        }

        knownSpells.filter { it.spell.id.startsWith("summon-") && it.prepared }.forEach { ks ->
            val sp = ks.spell
            val firstDmg = sp.mechanics?.damage?.firstOrNull()
            forms.add(
                CompanionForm(
                    id = "spirit-${sp.id}",
                    name = "Summoned Spirit (${sp.name})",
                    category = "Summoned Spirit",
                    maxHp = 20 + (10 * sp.level),
                    armorClass = 11 + sp.level + pb,
                    speed = "40 ft.",
                    attackName = "${sp.name} Strike",
                    attackBonus = spellAtk,
                    damageDice = firstDmg?.dice ?: "1d8",
                    damageBonus = (firstDmg?.flatBonus ?: 3) + sp.level,
                    damageType = firstDmg?.type ?: "force",
                    notes = "Requires Concentration; attacks ${max(1, sp.level / 2)} time(s) per turn on your initiative."
                )
            )
        }

        return forms.toTypedArray()
    }

    /**
     * D&D 5e (2024) Total Prepared Spells limit across all spell levels 1-9 combined.
     */
    private fun get2024PreparedSpellsCap(classId: String, level: Int, subclassId: String?): Int {
        val l = level.coerceIn(1, 20)
        return when (classId.lowercase()) {
            "bard", "cleric", "druid", "sorcerer", "wizard" -> {
                val table = intArrayOf(0, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22)
                table[l]
            }
            "paladin", "ranger" -> {
                val table = intArrayOf(0, 2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15)
                table[l]
            }
            "warlock" -> {
                val table = intArrayOf(0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15)
                table[l]
            }
            "fighter", "rogue" -> {
                if (l >= 3 && (subclassId?.contains("eldritch", ignoreCase = true) == true || subclassId?.contains("arcane", ignoreCase = true) == true)) {
                    val table = intArrayOf(0, 0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13)
                    table[l]
                } else 0
            }
            else -> 0
        }
    }

    private fun get2024CantripsCap(classId: String, level: Int, subclassId: String?): Int {
        val l = level.coerceIn(1, 20)
        return when (classId.lowercase()) {
            "sorcerer" -> if (l >= 10) 6 else if (l >= 4) 5 else 4
            "cleric", "wizard" -> if (l >= 10) 5 else if (l >= 4) 4 else 3
            "bard", "druid", "warlock" -> if (l >= 10) 4 else if (l >= 4) 3 else 2
            "fighter", "rogue" -> {
                if (l >= 3 && (subclassId?.contains("eldritch", ignoreCase = true) == true || subclassId?.contains("arcane", ignoreCase = true) == true)) {
                    if (l >= 10) 3 else 2
                } else 0
            }
            else -> 0
        }
    }

    /**
     * Resolves the entire character sheet deterministically from Character + RulesCatalog.
     */
    fun resolve(rawCharacter: Character, catalog: RulesCatalog): ResolvedCharacterSheet {
        val char = syncAutoGrantedSpells(rawCharacter, catalog)
        val itemMap = catalog.items.associateBy { it.id }
        val spellMap = catalog.spells.associateBy { it.id }
        val conditionMap = catalog.conditions.associateBy { it.id }
        val resourceMap = catalog.resources.associateBy { it.id }
        val classMap = catalog.classes.associateBy { it.id }
        val subclassMap = catalog.subclasses.associateBy { it.id }
        val featMap = catalog.feats.associateBy { it.id }
        val traitMap = catalog.traits.associateBy { it.id }

        val totalLevel = (char.classes?.sumOf { it.level } ?: char.level).coerceAtLeast(1)
        val pb = Leveling.calculateProficiencyBonus(totalLevel)

        // 1. Resolve Inventory (preliminary, proficiency filled after proficiencies resolved)
        val prelimInventory = (char.inventory ?: emptyArray()).map { joinItem ->
            val ruleItem = joinItem.item ?: itemMap[joinItem.itemId] ?: Item(
                id = joinItem.itemId,
                name = joinItem.itemName ?: joinItem.itemId,
                type = "gear",
                category = joinItem.itemCategory ?: "misc"
            )
            InventoryItem(
                item = ruleItem,
                quantity = joinItem.quantity,
                equipped = joinItem.equipped,
                isIdentified = joinItem.isIdentified,
                isAttuned = joinItem.isAttuned,
                currentUses = joinItem.currentUses,
                instanceId = joinItem.id
            )
        }.toTypedArray()

        // 2. Resolve Class Features & Progression
        val classFeatures = mutableListOf<RuleClassFeature>()
        var maxExtraAttacks = 1
        var maxCantrips = 0
        var maxPreparedSpells = 0
        val pendingGrants = mutableListOf<SkillGrant>()

        char.classes?.forEach { cls ->
            val progRows = catalog.progression.filter {
                it.classId == cls.classId &&
                    it.level <= cls.level &&
                    (it.subclassId == null || it.subclassId == cls.subclassId)
            }.sortedBy { it.level }

            progRows.forEach { row ->
                row.features.forEach { feat ->
                    classFeatures.add(feat.copy(level = row.level, classId = cls.classId, subclassId = row.subclassId))
                }
                if (row.extraAttacks > maxExtraAttacks) maxExtraAttacks = row.extraAttacks
                if (row.subclassId == null && row.level == cls.level) {
                    val rowCantrips = if (row.cantripsKnown > 0) row.cantripsKnown else get2024CantripsCap(cls.classId, cls.level, cls.subclassId)
                    val rowPrepared = if (row.spellsKnown > 0) row.spellsKnown else get2024PreparedSpellsCap(cls.classId, cls.level, cls.subclassId)
                    maxCantrips += rowCantrips
                    maxPreparedSpells += rowPrepared
                }
                row.skillGrants?.let { pendingGrants.add(it) }
            }
            if (progRows.none { it.subclassId == null && it.level == cls.level }) {
                maxCantrips += get2024CantripsCap(cls.classId, cls.level, cls.subclassId)
                maxPreparedSpells += get2024PreparedSpellsCap(cls.classId, cls.level, cls.subclassId)
            }
        }
        val distinctFeatures = classFeatures.distinctBy { "${it.classId}:${it.name}" }.sortedWith(compareBy({ it.level }, { it.name })).toTypedArray()
        val featureChoiceSlots = buildFeatureChoiceSlots(char)
        val activeChosenFeatureIds = featureChoiceSlots.mapNotNull { it.selectedOptionId }.toSet()
        if (activeChosenFeatureIds.contains("cleric-thaumaturge")) maxCantrips += 1
        if (activeChosenFeatureIds.contains("druid-magician")) maxCantrips += 1
        if (activeChosenFeatureIds.contains("inv-thirsting-blade") && maxExtraAttacks < 2) maxExtraAttacks = 2
        if (activeChosenFeatureIds.contains("inv-devouring-blade") &&
            (char.classes?.find { it.classId == "warlock" }?.level ?: 0) >= 12 &&
            maxExtraAttacks < 3
        ) {
            maxExtraAttacks = 3
        }
        val isValorBard6 = char.classes?.any {
            it.classId == "bard" && it.level >= 6 && (it.subclassId?.contains("valor", ignoreCase = true) == true)
        } == true
        if (isValorBard6 && maxExtraAttacks < 2) maxExtraAttacks = 2

        // 3. Build Condition Context & Collect Modifier Sources
        val conditionContext = ConditionEvaluator.buildContext(char, prelimInventory)
        val modSources = buildModifierSources(char, prelimInventory, distinctFeatures, catalog, includeActive = true, activeChosenFeatureIds = activeChosenFeatureIds)

        // 4. Resolve Effective Ability Scores (with ConditionContext applied)
        val abilityScores = listOf("str", "dex", "con", "int", "wis", "cha").map { ab ->
            val baseStat = when (ab) {
                "str" -> char.str
                "dex" -> char.dex
                "con" -> char.con
                "int" -> char.int
                "wis" -> char.wis
                "cha" -> char.cha
                else -> 10
            }
            val effective = ModifierCalculator.calculateStatWithModifiers(baseStat, ab, modSources, conditionContext)
            val mod = floor((effective - 10) / 2.0).toInt()
            ResolvedAbilityScore(ability = ab, baseValue = baseStat, effectiveValue = effective, modifier = mod)
        }.toTypedArray()

        val effModMap = abilityScores.associate { it.ability.lowercase() to it.modifier }
        val effScoreMap = abilityScores.associate { it.ability.lowercase() to it.effectiveValue }
        val effChar = char.copy(
            str = effScoreMap["str"] ?: char.str,
            dex = effScoreMap["dex"] ?: char.dex,
            con = effScoreMap["con"] ?: char.con,
            int = effScoreMap["int"] ?: char.int,
            wis = effScoreMap["wis"] ?: char.wis,
            cha = effScoreMap["cha"] ?: char.cha
        )
        val formulaContext = FormulaEvaluator.buildContext(effChar)

        // 5. Resolve Proficiencies & 2024 Weapon Mastery Loadout
        val resolvedProfs = resolveProficiencies(char, prelimInventory, catalog, activeChosenFeatureIds)
        val resolvedInventory = prelimInventory.map { inv ->
            inv.copy(isProficient = checkItemProficiency(inv.item, resolvedProfs))
        }.toTypedArray()
        val hasArmorPenalty = resolvedInventory.any {
            it.equipped && (it.item.category.equals("armor", ignoreCase = true) || it.item.type.lowercase().contains("armor") || it.item.type.lowercase().contains("shield")) && !it.isProficient
        }
        val weaponMasteryLimit = calculateWeaponMasteryLimit(char)
        val storedMasteredIds = (char.proficiencies?.masteredWeaponIds ?: emptyArray()).toList()
        val masteredWeaponIds: Array<String> = if (weaponMasteryLimit <= 0) {
            emptyArray()
        } else if (storedMasteredIds.isNotEmpty()) {
            storedMasteredIds.take(weaponMasteryLimit).toTypedArray()
        } else {
            resolvedInventory
                .filter { it.isProficient && !it.item.weaponMastery.isNullOrBlank() }
                .map { it.item.id }
                .distinct()
                .take(weaponMasteryLimit)
                .toTypedArray()
        }
        val masteredWeaponIdSet = masteredWeaponIds.toSet()

        // 6. Active Conditions
        val activeConditions = (char.conditions ?: emptyArray()).map { jc ->
            val ruleCond = jc.condition ?: conditionMap[jc.conditionId] ?: RuleCondition(
                id = jc.conditionId,
                name = jc.conditionName ?: jc.conditionId,
                description = ""
            )
            ActiveCondition(
                condition = ruleCond,
                duration = jc.duration,
                isPermanent = jc.isPermanent ?: false,
                source = jc.source
            )
        }.toTypedArray()
        val activeCondIds = activeConditions.map { it.condition.id.lowercase() }.toSet()
        val isPoisoned = activeCondIds.contains("poisoned")
        val isFrightened = activeCondIds.contains("frightened")
        val isParalyzedOrStunnedOrUnconscious = activeCondIds.any { it in listOf("paralyzed", "stunned", "unconscious", "petrified") }
        val isRestrained = activeCondIds.contains("restrained")
        val isGrappled = activeCondIds.contains("grappled")
        val isRaging = activeCondIds.contains("raging") || (char.activeModifiers?.any { it.sourceId == "rage" } == true)

        // 7. Resolve Skills (using Effective Ability Scores, Fey Wanderer Otherworldly Glamour & Condition Advantage/Disadvantage)
        val stealthDisadvFromArmor = resolvedInventory.any { it.equipped && it.item.stealthDisadvantage }
        val isFeyWanderer = char.classes?.any {
            it.classId == "ranger" && it.level >= 3 && (it.subclassId?.contains("fey", ignoreCase = true) == true)
        } == true
        val feyGlamourBonus = if (isFeyWanderer) max(1, effModMap["wis"] ?: 0) else 0
        val wisSkillBonus = max(1, effModMap["wis"] ?: 0)
        val hasThaumaturge = activeChosenFeatureIds.contains("cleric-thaumaturge")
        val hasDruidMagician = activeChosenFeatureIds.contains("druid-magician")
        val hasBoonOfSkill = char.feats?.any { it.id.equals("boon-skill", ignoreCase = true) } == true
        val hasJackOfAllTrades = (char.classes?.find { it.classId == "bard" }?.level ?: 0) >= 2

        val skills = SKILLS_META.map { (name, key, ability) ->
            val abilityMod = effModMap[ability] ?: 0
            val skillVal = char.proficiencies?.skills?.entries?.find {
                it.key.equals(name, ignoreCase = true) || it.key.equals(key, ignoreCase = true)
            }?.value
            val manualProf = skillVal == "proficient" || skillVal == "expertise" || skillVal == "true"
            val modProf = ModifierCalculator.getProficiencyModifiers(key, modSources) || ModifierCalculator.getProficiencyModifiers(name, modSources)
            val isProficient = manualProf || modProf || hasBoonOfSkill

            val manualExp = skillVal == "expertise"
            val modExp = ModifierCalculator.getExpertiseModifiers(key, modSources) || ModifierCalculator.getExpertiseModifiers(name, modSources)
            val isExpertise = manualExp || modExp

            val orderBonus = when {
                hasThaumaturge && (key == "arcana" || key == "religion") -> wisSkillBonus
                hasDruidMagician && (key == "arcana" || key == "nature") -> wisSkillBonus
                else -> 0
            }
            val bonus = ModifierCalculator.getSkillBonus(key, modSources) + (if (ability == "cha") feyGlamourBonus else 0) + orderBonus
            val exhPenalty = char.exhaustion * 2 // 2024 rules: -2 per Exhaustion level to all d20 tests
            var total = abilityMod + bonus - exhPenalty
            if (isExpertise) total += (pb * 2)
            else if (isProficient) total += pb
            else if (hasJackOfAllTrades) total += (pb / 2) // 2024 PHB: Bard Lv 2 Jack of All Trades (+floor(PB/2))

            val advState = when {
                isPoisoned || isFrightened || (key == "stealth" && stealthDisadvFromArmor) -> "DISADVANTAGE"
                isRaging && ability == "str" -> "ADVANTAGE"
                else -> "NORMAL"
            }

            ResolvedSkill(
                name = name,
                key = key,
                ability = ability,
                total = total,
                isProficient = isProficient,
                isExpertise = isExpertise,
                hasBonus = bonus != 0,
                passive = 10 + total,
                advantageState = advState
            )
        }.toTypedArray()

        // 8. Resolve Saving Throws (using Effective Ability Scores, DB Class savingThrows, Paladin Aura of Protection, Gnome Cunning)
        val classSaves = char.classes?.flatMap { cls ->
            classMap[cls.classId]?.savingThrows?.map { it.lowercase() } ?: emptyList()
        }?.toSet() ?: emptySet()
        val paladinLevel = char.classes?.find { it.classId == "paladin" }?.level ?: 0
        val auraOfProtectionBonus = if (paladinLevel >= 6) max(1, effModMap["cha"] ?: 0) else 0
        val hasGnomishCunning = char.raceId.startsWith("gnome", ignoreCase = true) ||
            (char.traits?.any { it.id.contains("gnomish-cunning", ignoreCase = true) || it.name.contains("Gnomish Cunning", ignoreCase = true) } == true)

        val savingThrows = listOf("str", "dex", "con", "int", "wis", "cha").map { ab ->
            val abilityMod = effModMap[ab] ?: 0
            val explicitOverride = char.proficiencies?.savingThrows?.entries?.find {
                it.key.equals(ab, ignoreCase = true)
            }?.value
            val modProf = ModifierCalculator.getSavingThrowProficiency(ab, modSources)
            val isProficient = explicitOverride ?: (modProf || classSaves.contains(ab))
            val bonus = ModifierCalculator.getSavingThrowBonus(ab, modSources) + auraOfProtectionBonus
            val exhPenalty = char.exhaustion * 2
            var total = abilityMod + bonus - exhPenalty
            if (isProficient) total += pb

            val autoFail = isParalyzedOrStunnedOrUnconscious && (ab == "str" || ab == "dex")
            val advState = when {
                isRestrained && ab == "dex" -> "DISADVANTAGE"
                isRaging && ab == "str" -> "ADVANTAGE"
                hasGnomishCunning && ab in listOf("int", "wis", "cha") -> "ADVANTAGE"
                else -> "NORMAL"
            }

            ResolvedSavingThrow(
                ability = ab,
                total = total,
                isProficient = isProficient,
                hasBonus = bonus != 0,
                advantageState = advState,
                autoFail = autoFail
            )
        }.toTypedArray()

        // 9. Resolve Spell Slots & Spellcasting Stats (from DB Class & Subclass rules)
        val classSpellInfos = (char.classes ?: emptyArray()).map { cls ->
            val ruleClass = classMap[cls.classId]
            val sub = cls.subclassId?.let { subclassMap[it] }
            val effectiveType = sub?.spellcastingType?.takeIf { it.isNotBlank() && it != "none" }
                ?: ruleClass?.spellcastingType
                ?: "none"
            ClassSpellcastingInfo(classId = cls.classId, level = cls.level, spellcastingType = effectiveType)
        }.toTypedArray()
        val spellSlots = SpellSlotCalculator.calculate(classSpellInfos)

        val isInnateSorceryActive = activeCondIds.contains("innate-sorcery") ||
            (char.activeModifiers?.any { it.sourceId.equals("innate-sorcery", ignoreCase = true) } == true)

        val spellcastingStats = (char.classes ?: emptyArray()).mapNotNull { cls ->
            val ruleClass = classMap[cls.classId]
            val sub = cls.subclassId?.let { subclassMap[it] }
            val effectiveType = sub?.spellcastingType?.takeIf { it.isNotBlank() && it != "none" }
                ?: ruleClass?.spellcastingType
                ?: "none"
            if (effectiveType == "none") return@mapNotNull null
            val ability = (ruleClass?.spellcastingAbility ?: if (cls.classId in listOf("fighter", "rogue")) "INT" else null)?.lowercase() ?: return@mapNotNull null
            val mod = effModMap[ability] ?: 0
            val dcBonus = ModifierCalculator.calculateStatWithModifiers(0, "spell_save_dc", modSources, conditionContext) +
                (if (cls.classId == "sorcerer" && isInnateSorceryActive) 1 else 0)
            val atkBonus = ModifierCalculator.calculateStatWithModifiers(0, "spell_attack", modSources, conditionContext)
            ResolvedSpellcastingStats(
                classId = cls.classId,
                className = ruleClass?.name ?: cls.className ?: cls.classId,
                ability = ability.uppercase(),
                modifier = mod,
                saveDC = 8 + pb + mod + dcBonus,
                attackBonus = pb + mod + atkBonus - (char.exhaustion * 2)
            )
        }.toTypedArray()

        // 10. Resolve Spells & Available Class Spell List
        val knownSpells = (char.spells ?: emptyArray()).map { js ->
            val ruleSpell = js.spell ?: spellMap[js.spellId] ?: Spell(
                id = js.spellId,
                name = js.spellName ?: js.spellId,
                level = js.spellLevel ?: 0
            )
            KnownSpell(
                spell = ruleSpell,
                prepared = js.prepared || js.alwaysPrepared || ruleSpell.level == 0,
                isRitual = js.isRitual || ruleSpell.isRitual,
                isConcentrating = js.isConcentrating,
                source = js.source,
                alwaysPrepared = js.alwaysPrepared
            )
        }.sortedWith(compareBy({ it.spell.level }, { it.spell.name })).toTypedArray()

        val primaryClass = char.classes?.firstOrNull()?.let { classMap[it.classId] }
        val spellPrepMode = primaryClass?.spellPrepMode ?: "none"
        val standardHighestSlot = (1..9).lastOrNull { spellSlots.slots.getOrElse(it) { 0 } > 0 } ?: 0
        val warlockLvlForArcanum = char.classes?.find { it.classId.equals("warlock", ignoreCase = true) }?.level ?: 0
        val mysticArcanumMaxLvl = when {
            warlockLvlForArcanum >= 17 -> 9
            warlockLvlForArcanum >= 15 -> 8
            warlockLvlForArcanum >= 13 -> 7
            warlockLvlForArcanum >= 11 -> 6
            else -> 0
        }
        val highestSlotLevel = max(standardHighestSlot, max(spellSlots.pactSlotLevel, mysticArcanumMaxLvl))

        // Include "wizard" spell list for 2024 Third-Casters (Eldritch Knight & Arcane Trickster)
        val spellListClassIds = (char.classes?.map { it.classId } ?: emptyList()).toMutableSet()
        char.classes?.forEach { cls ->
            val isThirdCaster = cls.level >= 3 && (
                cls.subclassId?.contains("eldritch", ignoreCase = true) == true ||
                    cls.subclassId?.contains("trickster", ignoreCase = true) == true ||
                    subclassMap[cls.subclassId ?: ""]?.spellcastingType == "third"
                )
            if (isThirdCaster) {
                spellListClassIds.add("wizard")
            }
        }
        val availableClassSpells = catalog.spells.filter { sp ->
            sp.level <= highestSlotLevel && sp.classes.any { spellListClassIds.contains(it) }
        }.sortedWith(compareBy({ it.level }, { it.name })).toTypedArray()

        val spellGrantSlots = buildSpellGrantSlots(char, catalog)
        // Only count non-granted class cantrips & non-always-prepared leveled spells against class preparation caps!
        val knownCantripsCount = knownSpells.count {
            it.spell.level == 0 && !it.alwaysPrepared && !it.source.startsWith("choice:") && !it.source.endsWith("_fixed")
        }
        val preparedCount = knownSpells.count {
            it.spell.level > 0 && it.prepared && !it.alwaysPrepared && !it.source.startsWith("choice:") && !it.source.endsWith("_fixed")
        }

        // 11. Resolve Tracked Resources (Class, Subclass, Species, and Feat resources with full 2024 Level Scaling)
        val existingResourceUsage = (char.resources ?: emptyArray()).associateBy { it.resourceId }
        val trackedResources = mutableListOf<TrackedResource>()
        val addedResourceIds = mutableSetOf<String>()

        fun computeResourceMax(res: RuleResource, refLevel: Int): Int {
            return when {
                res.id == "rage" -> getRageCharges(refLevel)
                res.id == "action-surge" || res.maxFormula == "action_surge_charges" -> if (refLevel >= 17) 2 else 1
                res.id == "second-wind" || res.maxFormula == "second_wind_charges" -> if (refLevel >= 10) 4 else if (refLevel >= 4) 3 else 2
                res.id == "channel-divinity-cleric" || res.maxFormula == "channel_divinity_cleric" -> if (refLevel >= 18) 4 else if (refLevel >= 6) 3 else 2
                res.id == "channel-divinity-paladin" || res.maxFormula == "channel_divinity_paladin" -> if (refLevel >= 11) 3 else 2
                res.id == "wild-shape" || res.maxFormula == "wild_shape_charges" -> if (refLevel >= 17) 4 else if (refLevel >= 6) 3 else 2
                res.id == "indomitable" || res.maxFormula == "indomitable_charges" -> if (refLevel >= 17) 3 else if (refLevel >= 13) 2 else 1
                res.id == "superiority-dice" || res.maxFormula == "superiority_dice" -> if (refLevel >= 15) 6 else if (refLevel >= 7) 5 else 4
                res.maxFormula == "psionic_energy_dice" -> if (refLevel >= 17) 12 else if (refLevel >= 13) 10 else if (refLevel >= 9) 8 else if (refLevel >= 5) 6 else 4
                res.id == "favored-enemy" || res.maxFormula == "favored_enemy_charges" -> if (refLevel >= 17) 6 else if (refLevel >= 13) 5 else if (refLevel >= 9) 4 else if (refLevel >= 5) 3 else 2
                res.maxFormula == "proficiency" -> pb
                res.maxFormula == "level" -> refLevel
                res.maxFormula == "level_plus_1" -> refLevel + 1
                res.maxFormula == "level_x5" -> refLevel * 5
                res.maxFormula == "cha_mod" -> max(1, effModMap["cha"] ?: 0)
                res.maxFormula == "wis_mod" -> max(1, effModMap["wis"] ?: 0)
                res.maxFormula == "int_mod" -> max(1, effModMap["int"] ?: 0)
                else -> FormulaEvaluator.evaluate(res.maxFormula, formulaContext) ?: res.maxFormula.toIntOrNull() ?: 1
            }
        }

        // 11a. Class & Subclass Resources
        char.classes?.forEach { cls ->
            catalog.resources.filter { res ->
                res.classId == cls.classId &&
                    cls.level >= res.unlockLevel &&
                    (res.subclassId == null || res.subclassId.equals(cls.subclassId, ignoreCase = true)) &&
                    (res.id != "superiority-dice" || cls.subclassId?.contains("battle", ignoreCase = true) == true)
            }.forEach { res ->
                if (addedResourceIds.add(res.id)) {
                    val l = cls.level
                    val maxUses = computeResourceMax(res, l)
                    val used = existingResourceUsage[res.id]?.usedUses ?: 0
                    val effectiveRes = when {
                        res.id == "bardic-inspiration" && l >= 5 -> res.copy(rechargeOn = "short")
                        res.id == "warding-flare" && l >= 6 -> res.copy(rechargeOn = "short")
                        else -> res
                    }
                    trackedResources.add(TrackedResource(resource = effectiveRes, used = used, max = maxUses))
                }
            }
        }

        // 11b. Species & Feat Resources (2024 PHB: Dragonborn Breath Weapon, Goliath Giant Ancestry, Orc Adrenaline Rush, Aasimar, Lucky feat)
        val charFeatIds = (char.feats?.map { it.id.lowercase() } ?: emptyList()).toSet()
        catalog.resources.filter { res ->
            res.sourceType == "species" || res.sourceType == "feat"
        }.forEach { res ->
            val srcId = (res.sourceId ?: "").lowercase()
            val matches = when (res.sourceType) {
                "species" -> srcId.isNotBlank() && char.raceId.lowercase().startsWith(srcId) && totalLevel >= res.unlockLevel
                "feat" -> srcId.isNotBlank() && charFeatIds.contains(srcId) && totalLevel >= res.unlockLevel
                else -> false
            }
            if (matches && addedResourceIds.add(res.id)) {
                val maxUses = computeResourceMax(res, totalLevel)
                val used = existingResourceUsage[res.id]?.usedUses ?: 0
                trackedResources.add(TrackedResource(resource = res, used = used, max = maxUses))
            }
        }

        // 12. Resolve Combat Stats (AC, Initiative, Speed, Darkvision, Encumbrance)
        val acResult = ArmorClassCalculator.calculateArmorClass(effChar, resolvedInventory, modSources, conditionContext)
        val dexMod = effModMap["dex"] ?: 0
        val initModBonus = ModifierCalculator.calculateStatWithModifiers(0, "initiative", modSources, conditionContext)
        // Alert feat already has { type: 'bonus', target: 'initiative', value: 'proficiency' } in 11-feats.json; avoid double-adding!
        val hasAlertFeat = char.feats?.any { it.id == "alert" } == true
        val alertAlreadyInMods = modSources.any { src ->
            src.id == "alert" && src.modifiers.any { it.target.equals("initiative", ignoreCase = true) }
        }
        val alertProfBonus = if (hasAlertFeat && !alertAlreadyInMods) pb else 0
        val isGloomStalker = char.classes?.any {
            it.classId == "ranger" && it.level >= 3 && (it.subclassId?.contains("gloom", ignoreCase = true) == true)
        } == true
        val gloomInitBonus = if (isGloomStalker) max(0, effModMap["wis"] ?: 0) else 0
        val joatInitBonus = if (hasJackOfAllTrades) (pb / 2) else 0
        val initExhPenalty = char.exhaustion * 2 // 2024 PHB: Initiative is a D20 Test, reduced by Exhaustion!
        val initiative = dexMod + char.initiativeBonus + initModBonus + alertProfBonus + gloomInitBonus + joatInitBonus - initExhPenalty

        val baseRaceSpeed = RaceLogic.resolve(char).speed
        val rawSpeed = ModifierCalculator.calculateStatWithModifiers(baseRaceSpeed, "speed", modSources, conditionContext)
        val speed = if (isGrappled || isRestrained || isParalyzedOrStunnedOrUnconscious || char.exhaustion >= 6) {
            0
        } else {
            max(0, rawSpeed - (char.exhaustion * 5))
        }

        val darkvision = calculateDarkvision(char, resolvedInventory, catalog, activeChosenFeatureIds)
        val currentWeight = resolvedInventory.sumOf {
            if (it.item.fixedWeight) it.item.weightAmount else it.item.weightAmount * it.quantity
        }
        val strScore = effScoreMap["str"] ?: 10
        val powerfulBuildMultiplier = if (char.traits?.any { it.id == "powerful-build" } == true) 2 else 1
        val maxCarryWeight = strScore * 15.0 * powerfulBuildMultiplier
        val passivePerception = skills.find { it.key == "perception" }?.passive ?: (10 + (effModMap["wis"] ?: 0))

        val combatStats = ResolvedCombatStats(
            armorClass = char.armorClass ?: acResult.value,
            armorClassBreakdown = acResult.breakdown,
            armorClassSource = acResult.source,
            initiative = initiative,
            speed = speed,
            proficiencyBonus = pb,
            passivePerception = passivePerception,
            extraAttacks = maxExtraAttacks,
            darkvision = darkvision,
            currentWeight = currentWeight,
            maxCarryWeight = maxCarryWeight
        )

        // 13. Collect Available Combat Riders, Causal Trigger Matrix, Companion Forms & Build Action Catalog
        val availableRiders = collectAvailableRiders(char, knownSpells, catalog, activeChosenFeatureIds)
        val activeTriggerMatrix = buildCausalTriggerMatrix(
            char,
            resolvedInventory,
            distinctFeatures,
            availableRiders,
            catalog,
            masteredWeaponIdSet,
            activeChosenFeatureIds
        )
        val availableCompanions = buildAvailableCompanions(
            char,
            knownSpells,
            spellcastingStats,
            effModMap,
            pb,
            activeChosenFeatureIds
        )
        val activeCompanion = availableCompanions.find { it.id == char.proficiencies?.activeCompanionId }
        val companionHpCurrent = if (activeCompanion != null) {
            (char.proficiencies?.companionHpCurrent ?: activeCompanion.maxHp).coerceIn(0, activeCompanion.maxHp)
        } else 0

        val actions = buildActionCatalog(
            char = effChar,
            effModMap = effModMap,
            pb = pb,
            inventory = resolvedInventory,
            knownSpells = knownSpells,
            spellcastingStats = spellcastingStats,
            availableRiders = availableRiders,
            spellGrantSlots = spellGrantSlots,
            modSources = modSources,
            conditionContext = conditionContext,
            masteredWeaponIds = masteredWeaponIdSet,
            activeChosenFeatureIds = activeChosenFeatureIds
        )

        val effectiveMaxHp = calculateEffectiveMaxHp(effChar, resolvedInventory, distinctFeatures, catalog)
        val syncedChar = char.copy(
            level = totalLevel,
            hpMax = effectiveMaxHp,
            hpCurrent = char.hpCurrent.coerceIn(0, max(effectiveMaxHp, char.hpCurrent))
        )

        return ResolvedCharacterSheet(
            character = syncedChar,
            abilityScores = abilityScores,
            combatStats = combatStats,
            skills = skills,
            savingThrows = savingThrows,
            spellcastingStats = spellcastingStats,
            spellSlots = spellSlots,
            knownCantripsCount = knownCantripsCount,
            preparedSpellsCount = preparedCount,
            maxPreparedSpells = maxPreparedSpells,
            maxCantrips = maxCantrips,
            spellPrepMode = spellPrepMode,
            spellGrantSlots = spellGrantSlots,
            inventoryItems = resolvedInventory,
            knownSpells = knownSpells,
            availableClassSpells = availableClassSpells,
            activeConditions = activeConditions,
            trackedResources = trackedResources.toTypedArray(),
            classFeatures = distinctFeatures,
            proficiencies = resolvedProfs,
            actions = actions,
            availableRiders = availableRiders,
            activeTriggerMatrix = activeTriggerMatrix,
            featureChoiceSlots = featureChoiceSlots,
            weaponMasteryLimit = weaponMasteryLimit,
            masteredWeaponIds = masteredWeaponIds,
            availableCompanions = availableCompanions,
            activeCompanion = activeCompanion,
            companionHpCurrent = companionHpCurrent,
            pendingSkillGrants = pendingGrants.toTypedArray(),
            hasArmorPenalty = hasArmorPenalty,
            canLevelUp = Leveling.canLevelUp(char.classes ?: emptyArray(), char.xp),
            nextLevelXp = Leveling.getXpForLevel((totalLevel + 1).coerceAtMost(20)),
            concentrationSpellName = knownSpells.find { it.isConcentrating }?.spell?.name
        )
    }

    /**
     * Dispatches a deterministic command against Character + RulesCatalog,
     * returning the updated Character, freshly resolved sheet, and new events.
     */
    fun dispatch(rawCharacter: Character, catalog: RulesCatalog, command: GameCommandPayload): EngineResult {
        val preSheet = resolve(rawCharacter, catalog)
        var char = preSheet.character
        val emittedEvents = mutableListOf<CharacterEvent>()
        var rollOutcome: RollOutcome? = null
        var concDcRequired: Int? = null

        fun logEvent(type: String, title: String, summary: String) {
            val evt = CharacterEvent(
                id = 0,
                characterId = char.id,
                eventType = type,
                title = title,
                summary = summary
            )
            emittedEvents.add(evt)
        }

        when (command.type.uppercase()) {
            "EXECUTE_ROLL" -> {
                val req = command.rollRequest ?: return EngineResult(char, preSheet)
                val outcome = RollResolver.executeRoll(preSheet, req)
                rollOutcome = outcome

                // 1. Consume Spell Slot, Pact Slot, or 1/Long Rest Free Cast if applicable
                if (outcome.consumedFreeCastSlotId != null) {
                    val freeKey = "free:${outcome.consumedFreeCastSlotId}"
                    val currentSlots = (char.usedSpellSlots?.slots ?: emptyMap()).toMutableMap()
                    currentSlots[freeKey] = 1
                    char = char.copy(usedSpellSlots = SpellSlotMap(currentSlots))
                } else if (outcome.consumedSlotLevel != null && outcome.consumedSlotLevel > 0) {
                    val lvlKey = outcome.consumedSlotLevel.toString()
                    val currentSlots = (char.usedSpellSlots?.slots ?: emptyMap()).toMutableMap()
                    currentSlots[lvlKey] = (currentSlots[lvlKey] ?: 0) + 1
                    char = char.copy(usedSpellSlots = SpellSlotMap(currentSlots))
                }
                if (outcome.consumedPactSlot) {
                    char = char.copy(usedPactSlots = char.usedPactSlots + 1)
                }

                // 2. Consume Class Resources if applicable
                if (outcome.consumedResourceIds.isNotEmpty()) {
                    val currentRes = (char.resources?.toList() ?: emptyList()).toMutableList()
                    outcome.consumedResourceIds.forEach { rId ->
                        val idx = currentRes.indexOfFirst { it.resourceId == rId }
                        if (idx >= 0) {
                            currentRes[idx] = currentRes[idx].copy(usedUses = currentRes[idx].usedUses + 1)
                        } else {
                            currentRes.add(CharacterResource(characterId = char.id, resourceId = rId, usedUses = 1))
                        }
                    }
                    char = char.copy(resources = currentRes.toTypedArray())
                }

                // 3. Apply Self-Healing if spell is a heal, Hit Die is rolled, or Death Save outcomes
                if (outcome.totalHealing > 0 && req.rollType == "spell") {
                    val newHp = (char.hpCurrent + outcome.totalHealing).coerceAtMost(char.hpMax)
                    char = char.copy(hpCurrent = newHp, deathSaveSuccess = 0, deathSaveFailure = 0)
                }
                if (req.rollType.equals("hit_die", ignoreCase = true)) {
                    if (char.hitDiceCurrent > 0) {
                        val newHp = (char.hpCurrent + outcome.totalHealing).coerceAtMost(char.hpMax)
                        val updatedClasses = incrementClassHitDiceUsed(char.classes, req.targetId)
                        char = char.copy(
                            classes = updatedClasses,
                            hitDiceCurrent = (char.hitDiceCurrent - 1).coerceAtLeast(0),
                            hpCurrent = newHp,
                            deathSaveSuccess = if (newHp > 0) 0 else char.deathSaveSuccess,
                            deathSaveFailure = if (newHp > 0) 0 else char.deathSaveFailure
                        )
                    }
                }
                if (req.rollType.equals("death_save", ignoreCase = true)) {
                    when {
                        outcome.isCriticalHit -> {
                            char = char.copy(hpCurrent = max(1, char.hpCurrent), deathSaveSuccess = 0, deathSaveFailure = 0)
                        }
                        outcome.isCriticalFail -> {
                            char = char.copy(deathSaveFailure = (char.deathSaveFailure + 2).coerceAtMost(3))
                        }
                        outcome.isSuccess == true -> {
                            char = char.copy(deathSaveSuccess = (char.deathSaveSuccess + 1).coerceAtMost(3))
                        }
                        else -> {
                            char = char.copy(deathSaveFailure = (char.deathSaveFailure + 1).coerceAtMost(3))
                        }
                    }
                }

                // 4. Update Concentration if spell requires concentration & Apply Buff Spell Modifiers
                if (outcome.concentrationSpellId != null) {
                    val updatedSpells = (char.spells ?: emptyArray()).map { sp ->
                        sp.copy(isConcentrating = sp.spellId == outcome.concentrationSpellId)
                    }.toTypedArray()
                    val cleanedActive = (char.activeModifiers ?: emptyArray()).filter {
                        it.expiresOn != "concentration" || it.sourceId == outcome.concentrationSpellId
                    }.toMutableList()
                    char = char.copy(spells = updatedSpells, activeModifiers = cleanedActive.toTypedArray())
                }

                if (req.rollType == "spell") {
                    val castSpell = preSheet.knownSpells.find { it.spell.id == req.targetId }?.spell
                        ?: catalog.spells.find { it.id == req.targetId }
                    val appliedMods = castSpell?.mechanics?.appliesModifiers
                    if (!appliedMods.isNullOrEmpty()) {
                        val baseLvl = castSpell.level
                        val castLvl = if (baseLvl > 0) (req.slotLevel ?: baseLvl).coerceAtLeast(baseLvl) else 0
                        val upLevels = (castLvl - baseLvl).coerceAtLeast(0)
                        val upFlat = upLevels * (castSpell.mechanics?.upcast?.bonusFlat ?: 0)
                        val activeList = (char.activeModifiers ?: emptyArray())
                            .filter { it.sourceId != castSpell.id }
                            .toMutableList()
                        var hpMaxBoost = 0
                        appliedMods.forEach { m ->
                            val cleanType = m.type.trim()
                            val cleanTarget = m.target.trim()
                            val baseVal = m.value ?: m.valueString?.toIntOrNull() ?: 0
                            val effectiveVal = if (cleanTarget.equals("hp_max", ignoreCase = true)) baseVal + upFlat else baseVal
                            if (cleanTarget.equals("hp_max", ignoreCase = true) && effectiveVal > 0) {
                                hpMaxBoost += effectiveVal
                            }
                            activeList.add(
                                ActiveModifier(
                                    sourceId = castSpell.id,
                                    sourceName = castSpell.name,
                                    modifier = m.copy(type = cleanType, target = cleanTarget, value = effectiveVal),
                                    expiresOn = m.duration ?: (if (castSpell.isConcentration) "concentration" else "long_rest")
                                )
                            )
                        }
                        char = char.copy(
                            activeModifiers = activeList.toTypedArray(),
                            hpCurrent = if (hpMaxBoost > 0) char.hpCurrent + hpMaxBoost else char.hpCurrent
                        )
                    }
                }

                val evtType = when (req.rollType) {
                    "weapon_attack" -> "attack"
                    "spell" -> "spell_cast"
                    else -> "roll"
                }
                logEvent(evtType, outcome.title, outcome.summary)
            }

            "TAKE_DAMAGE" -> {
                val rawInputDmg = (command.amount ?: 0).coerceAtLeast(0)
                val dmgType = (command.damageType ?: "physical").lowercase()
                val isPhysicalDmg = dmgType in listOf("physical", "bludgeoning", "piercing", "slashing")
                val hasHeavyArmorMaster = char.feats?.any { it.id.equals("heavy-armor-master", ignoreCase = true) } == true
                val wearingHeavyArmor = preSheet.inventoryItems.any {
                    it.equipped && (it.item.type.contains("heavy", ignoreCase = true) || it.item.tags.any { t -> t.equals("armor:heavy", ignoreCase = true) })
                }
                val hamReduction = if (hasHeavyArmorMaster && wearingHeavyArmor && isPhysicalDmg && rawInputDmg > 0) {
                    preSheet.combatStats.proficiencyBonus
                } else 0
                val afterHamDmg = (rawInputDmg - hamReduction).coerceAtLeast(0)

                val isRaging = preSheet.activeConditions.any { it.condition.id.equals("raging", ignoreCase = true) } ||
                    (char.activeModifiers?.any { it.sourceId == "rage" } == true)
                val isPetrified = preSheet.activeConditions.any { it.condition.id.equals("petrified", ignoreCase = true) }
                val isDwarf = char.raceId.startsWith("dwarf", ignoreCase = true) ||
                    (char.traits?.any { it.id.contains("dwarven-resilience", ignoreCase = true) } == true)
                val isAasimar = char.raceId.startsWith("aasimar", ignoreCase = true) ||
                    (char.traits?.any { it.id.contains("celestial-resistance", ignoreCase = true) } == true)
                val raceIdLower = char.raceId.lowercase()
                val dragonbornElement = when {
                    raceIdLower.startsWith("dragonborn-black") || raceIdLower.startsWith("dragonborn-copper") -> "acid"
                    raceIdLower.startsWith("dragonborn-blue") || raceIdLower.startsWith("dragonborn-bronze") -> "lightning"
                    raceIdLower.startsWith("dragonborn-brass") || raceIdLower.startsWith("dragonborn-gold") || raceIdLower.startsWith("dragonborn-red") -> "fire"
                    raceIdLower.startsWith("dragonborn-green") -> "poison"
                    raceIdLower.startsWith("dragonborn-silver") || raceIdLower.startsWith("dragonborn-white") -> "cold"
                    else -> null
                }
                val tieflingElement = when {
                    raceIdLower.startsWith("tiefling-abyssal") -> "poison"
                    raceIdLower.startsWith("tiefling-chthonic") -> "necrotic"
                    raceIdLower.startsWith("tiefling-infernal") || raceIdLower == "tiefling" -> "fire"
                    else -> null
                }

                // Collect dynamic damage resistances/immunities/vulnerabilities from explicit character fields & trait/feat/item modifiers
                val hasExplicitImmunity = char.immunities.any { it.equals(dmgType, ignoreCase = true) || it.equals("all", ignoreCase = true) }
                val hasExplicitResistance = char.resistances.any { it.equals(dmgType, ignoreCase = true) || it.equals("all", ignoreCase = true) }
                val hasExplicitVulnerability = char.vulnerabilities.any { it.equals(dmgType, ignoreCase = true) }
                val traitResMatch = (char.traits ?: emptyArray()).any { tr ->
                    (tr.modifiers ?: catalog.traits.find { it.id == tr.id }?.modifiers ?: emptyArray()).any { m ->
                        m.type.equals("damage_resistance", ignoreCase = true) &&
                            (m.target.equals(dmgType, ignoreCase = true) || m.target.equals("all", ignoreCase = true))
                    }
                }

                val resistReason = when {
                    hasExplicitImmunity -> "Damage Immunity"
                    isPetrified -> "Petrified (Resistance to All Damage)"
                    isRaging && isPhysicalDmg -> "Rage Resistance"
                    isDwarf && dmgType == "poison" -> "Dwarven Resilience (Poison Resistance)"
                    isAasimar && (dmgType == "necrotic" || dmgType == "radiant") -> "Celestial Resistance (${dmgType.replaceFirstChar { it.uppercase() }})"
                    tieflingElement != null && dmgType == tieflingElement -> "Fiendish Legacy (${tieflingElement.replaceFirstChar { it.uppercase() }} Resistance)"
                    dragonbornElement != null && dmgType == dragonbornElement -> "Draconic Resistance (${dragonbornElement.replaceFirstChar { it.uppercase() }})"
                    hasExplicitResistance || traitResMatch -> "Damage Resistance (${dmgType.replaceFirstChar { it.uppercase() }})"
                    else -> null
                }
                val rawDmg = when {
                    hasExplicitImmunity -> 0
                    else -> {
                        var dmg = afterHamDmg
                        if (resistReason != null && dmg > 0) dmg /= 2
                        if (hasExplicitVulnerability && dmg > 0) dmg *= 2
                        dmg
                    }
                }

                var remaining = rawDmg
                var newTemp = char.tempHp
                if (newTemp > 0) {
                    val absorbed = min(remaining, newTemp)
                    newTemp -= absorbed
                    remaining -= absorbed
                }
                var newHp = (char.hpCurrent - remaining).coerceAtLeast(0)

                // Orc / Half-Orc Relentless Endurance (Drop to 1 HP instead of 0 HP once per Long Rest)
                val hasRelentlessEndurance = char.raceId.contains("orc", ignoreCase = true) ||
                    (char.traits?.any { it.id.contains("relentless-endurance", ignoreCase = true) } == true)
                val relentlessUsed = (char.usedSpellSlots?.slots?.get("free:relentless-endurance") ?: 0) > 0
                var relentlessTriggered = false
                if (newHp == 0 && char.hpCurrent > 0 && hasRelentlessEndurance && !relentlessUsed) {
                    newHp = 1
                    relentlessTriggered = true
                    val updatedSlots = (char.usedSpellSlots?.slots ?: emptyMap()).toMutableMap()
                    updatedSlots["free:relentless-endurance"] = 1
                    char = char.copy(usedSpellSlots = SpellSlotMap(updatedSlots))
                }

                char = char.copy(hpCurrent = newHp, tempHp = newTemp)

                val extraNotes = buildList {
                    if (hamReduction > 0) add("Heavy Armor Master (-$hamReduction dmg)")
                    if (hasExplicitImmunity) {
                        add("Damage Immunity negated $afterHamDmg → 0")
                    } else {
                        if (resistReason != null) add("$resistReason halved damage")
                        if (hasExplicitVulnerability) add("Vulnerability (${dmgType.replaceFirstChar { it.uppercase() }}) doubled damage")
                    }
                    if (relentlessTriggered) add("Relentless Endurance Triggered (1 HP instead of 0)!")
                }.joinToString(" • ")

                // Check if concentrating on a spell -> trigger Concentration Save DC = max(10, damage / 2)
                val concSpell = preSheet.knownSpells.find { it.isConcentrating }
                if (concSpell != null && rawDmg > 0) {
                    concDcRequired = max(10, rawDmg / 2)
                    logEvent(
                        "damage",
                        "Took $rawDmg Damage (Concentration Check!)",
                        "HP: ${char.hpCurrent}/${char.hpMax}. ${if (extraNotes.isNotEmpty()) "$extraNotes. " else ""}Concentrating on ${concSpell.spell.name}: DC $concDcRequired CON Save required!"
                    )
                } else {
                    logEvent(
                        "damage",
                        "Took $rawDmg Damage",
                        "HP: ${char.hpCurrent}/${char.hpMax} (Temp HP: $newTemp)${if (extraNotes.isNotEmpty()) " • $extraNotes" else ""}"
                    )
                }
            }

            "HEAL" -> {
                val healAmt = (command.amount ?: 0).coerceAtLeast(0)
                val wasZero = char.hpCurrent == 0
                val newHp = (char.hpCurrent + healAmt).coerceAtMost(char.hpMax)
                char = char.copy(
                    hpCurrent = newHp,
                    deathSaveSuccess = if (wasZero && newHp > 0) 0 else char.deathSaveSuccess,
                    deathSaveFailure = if (wasZero && newHp > 0) 0 else char.deathSaveFailure
                )
                logEvent("heal", "Healed $healAmt HP", "HP restored to ${char.hpCurrent}/${char.hpMax}")
            }

            "SET_TEMP_HP" -> {
                val amt = (command.amount ?: 0).coerceAtLeast(0)
                char = char.copy(tempHp = amt)
                logEvent("heal", "Temporary HP Set", "Temporary HP is now $amt")
            }

            "SET_DEATH_SAVES" -> {
                val s = (command.intValue ?: char.deathSaveSuccess).coerceIn(0, 3)
                val f = (command.intValue2 ?: char.deathSaveFailure).coerceIn(0, 3)
                char = char.copy(deathSaveSuccess = s, deathSaveFailure = f)
                logEvent("roll", "Death Saves Updated", "Successes: $s/3, Failures: $f/3")
            }

            "TOGGLE_DAMAGE_DEFENSE" -> {
                val dmgType = command.targetId?.trim()?.lowercase()
                val kind = command.textValue?.trim()?.lowercase() ?: "resistance"
                if (!dmgType.isNullOrBlank()) {
                    fun toggleIn(arr: Array<String>, value: String): Pair<Array<String>, Boolean> {
                        val exists = arr.any { it.equals(value, ignoreCase = true) }
                        val updated = if (exists) {
                            arr.filterNot { it.equals(value, ignoreCase = true) }.toTypedArray()
                        } else {
                            (arr.toList() + value).distinctBy { it.lowercase() }.toTypedArray()
                        }
                        return updated to !exists
                    }
                    val (added, label) = when (kind) {
                        "immunity" -> {
                            val (next, isAdded) = toggleIn(char.immunities, dmgType)
                            char = char.copy(immunities = next)
                            isAdded to "Immunity"
                        }
                        "vulnerability" -> {
                            val (next, isAdded) = toggleIn(char.vulnerabilities, dmgType)
                            char = char.copy(vulnerabilities = next)
                            isAdded to "Vulnerability"
                        }
                        else -> {
                            val (next, isAdded) = toggleIn(char.resistances, dmgType)
                            char = char.copy(resistances = next)
                            isAdded to "Resistance"
                        }
                    }
                    val typeLabel = dmgType.replaceFirstChar { it.uppercase() }
                    logEvent(
                        "condition",
                        "${if (added) "Added" else "Removed"} $typeLabel $label",
                        "Damage $label to $typeLabel is now ${if (added) "active" else "inactive"}."
                    )
                }
            }

            "SPEND_HIT_DIE" -> {
                if (char.hitDiceCurrent > 0) {
                    val targetClsId = command.targetId ?: char.classes?.firstOrNull()?.classId ?: "hit_die"
                    val outcome = if (command.amount != null && command.amount > 0) {
                        RollResolver.executeRoll(
                            preSheet,
                            RollRequest(
                                rollType = "hit_die",
                                targetId = targetClsId,
                                diceMode = "PHYSICAL",
                                physicalDamageRolls = arrayOf(command.amount)
                            )
                        )
                    } else {
                        RollResolver.executeRoll(
                            preSheet,
                            RollRequest(
                                rollType = "hit_die",
                                targetId = targetClsId,
                                diceMode = "SIMULATED"
                            )
                        )
                    }
                    rollOutcome = outcome
                    val healed = outcome.totalHealing
                    val newHp = (char.hpCurrent + healed).coerceAtMost(char.hpMax)
                    val updatedClasses = incrementClassHitDiceUsed(char.classes, targetClsId)
                    char = char.copy(
                        classes = updatedClasses,
                        hitDiceCurrent = (char.hitDiceCurrent - 1).coerceAtLeast(0),
                        hpCurrent = newHp,
                        deathSaveSuccess = if (newHp > 0) 0 else char.deathSaveSuccess,
                        deathSaveFailure = if (newHp > 0) 0 else char.deathSaveFailure
                    )
                    logEvent(
                        "heal",
                        "Rolled Hit Die (+$healed HP)",
                        "${outcome.detailedFormula} • HP: $newHp/${char.hpMax} (${char.hitDiceCurrent}/${char.hitDiceMax} Hit Dice left)"
                    )
                }
            }

            "SHORT_REST" -> {
                val bardLvl = char.classes?.find { it.classId == "bard" }?.level ?: 0
                val lightClericLvl = char.classes?.find {
                    it.classId == "cleric" && it.subclassId?.contains("light", ignoreCase = true) == true
                }?.level ?: 0
                val shortRestResIds = catalog.resources
                    .filter { it.rechargeOn.equals("short", ignoreCase = true) }
                    .map { it.id }
                    .toMutableSet()
                if (bardLvl >= 5) {
                    shortRestResIds.add("bardic-inspiration") // 2024 Font of Inspiration (Lv 5+)
                }
                if (lightClericLvl >= 6) {
                    shortRestResIds.add("warding-flare") // 2024 Improved Warding Flare (Lv 6+)
                }
                // 2024 PHB Partial Short Rest Recovery: Recover 1 expended use of Rage, Second Wind, Wild Shape, Cleric/Paladin Channel Divinity, Psionic Energy Dice, or any resource declaring partialShortRestRecovery > 0
                val defaultPartialRecoveryIds = setOf(
                    "rage", "second-wind", "wild-shape",
                    "channel-divinity-cleric", "channel-divinity-paladin",
                    "psionic-energy-dice-fighter", "psionic-energy-dice-rogue"
                )
                val catalogPartialMap = catalog.resources
                    .filter { it.partialShortRestRecovery > 0 }
                    .associate { it.id to it.partialShortRestRecovery }

                val newResources = (char.resources ?: emptyArray()).map { res ->
                    val partialRecover = catalogPartialMap[res.resourceId]
                        ?: (if (defaultPartialRecoveryIds.contains(res.resourceId)) 1 else 0)
                    when {
                        shortRestResIds.contains(res.resourceId) -> res.copy(usedUses = 0)
                        partialRecover > 0 -> res.copy(usedUses = (res.usedUses - partialRecover).coerceAtLeast(0))
                        else -> res
                    }
                }.toTypedArray()
                val remainingActive = (char.activeModifiers ?: emptyArray()).filter {
                    it.getExpiration() != ExpirationTrigger.SHORT_REST
                }.toTypedArray()
                char = char.copy(
                    usedPactSlots = 0,
                    resources = newResources,
                    activeModifiers = remainingActive
                )
                logEvent(
                    "rest",
                    "Completed Short Rest (2024 Rules)",
                    "Recovered Pact Magic slots, Short Rest resources, and +1 use of Rage / Second Wind / Wild Shape / Channel Divinity / Psionic Dice."
                )
            }

            "LONG_REST" -> {
                val newResources = (char.resources ?: emptyArray()).map { it.copy(usedUses = 0) }.toTypedArray()
                val resetClasses = (char.classes ?: emptyArray()).map { it.copy(hitDiceUsed = 0) }.toTypedArray()
                val remainingActive = (char.activeModifiers ?: emptyArray()).filter {
                    val exp = it.getExpiration()
                    exp != ExpirationTrigger.LONG_REST && exp != ExpirationTrigger.SHORT_REST
                }.toTypedArray()
                val newExh = (char.exhaustion - 1).coerceAtLeast(0)
                // 2024 Human "Resourceful" Trait: Automatically gain Heroic Inspiration when finishing a Long Rest!
                val isHumanResourceful = char.raceId.startsWith("human", ignoreCase = true) ||
                    (char.traits?.any { it.id.contains("resourceful", ignoreCase = true) } == true)
                val nextInspiration = if (isHumanResourceful) true else char.inspiration
                char = char.copy(
                    classes = resetClasses,
                    hpCurrent = char.hpMax,
                    tempHp = 0,
                    hitDiceCurrent = char.hitDiceMax,
                    deathSaveSuccess = 0,
                    deathSaveFailure = 0,
                    exhaustion = newExh,
                    inspiration = nextInspiration,
                    usedSpellSlots = SpellSlotMap(emptyMap()),
                    usedPactSlots = 0,
                    resources = newResources,
                    activeModifiers = remainingActive
                )
                logEvent(
                    "rest",
                    "Completed Long Rest (2024 Rules)",
                    "Restored full HP (${char.hpMax}), all ${char.hitDiceMax} Hit Dice, Spell Slots, and Class Resources${if (isHumanResourceful) " • Human Resourceful: Gained Heroic Inspiration!" else ""}."
                )
            }

            "USE_RESOURCE" -> {
                val resId = command.targetId ?: return EngineResult(char, preSheet)
                val tracked = preSheet.trackedResources.find { it.resource.id == resId } ?: return EngineResult(char, preSheet)
                if (tracked.used < tracked.max) {
                    val currentList = (char.resources?.toList() ?: emptyList()).toMutableList()
                    val idx = currentList.indexOfFirst { it.resourceId == resId }
                    val spendAmount = if (resId == "lay-on-hands") {
                        min(command.amount ?: 5, tracked.max - tracked.used).coerceAtLeast(1)
                    } else {
                        min(command.amount ?: 1, tracked.max - tracked.used).coerceAtLeast(1)
                    }

                    if (idx >= 0) {
                        currentList[idx] = currentList[idx].copy(usedUses = currentList[idx].usedUses + spendAmount)
                    } else {
                        currentList.add(CharacterResource(characterId = char.id, resourceId = resId, usedUses = spendAmount))
                    }

                    // Activate onUse modifiers if any
                    val onUse = tracked.resource.onUse
                    val activeMods = (char.activeModifiers?.toList() ?: emptyList()).toMutableList()
                    val formulaCtx = FormulaEvaluator.buildContext(char)
                    if (!onUse.isNullOrEmpty() && activeMods.none { it.sourceId == resId }) {
                        onUse.forEach { effect ->
                            val effectiveFormula = if (resId == "rage" && effect.target == "str_damage") "rage_damage" else effect.formula
                            val modVal = when {
                                !effectiveFormula.isNullOrBlank() -> {
                                    if (effectiveFormula.contains("class_level")) {
                                        val clsLvl = char.classes?.find { it.classId == tracked.resource.classId }?.level ?: char.level
                                        clsLvl
                                    } else {
                                        FormulaEvaluator.evaluate(effectiveFormula, formulaCtx) ?: 1
                                    }
                                }
                                effect.value == true -> 1
                                else -> 0
                            }
                            activeMods.add(
                                ActiveModifier(
                                    sourceId = resId,
                                    sourceName = tracked.resource.name,
                                    modifier = Modifier(
                                        type = effect.type.trim(),
                                        target = (effect.target ?: effect.type).trim(),
                                        value = modVal,
                                        condition = effect.condition,
                                        duration = effect.duration
                                    ),
                                    expiresOn = effect.duration ?: "manual_disable"
                                )
                            )
                        }
                    }

                    // Keep Rage Resource and Raging Condition 100% synchronized
                    var updatedConditions = char.conditions ?: emptyArray()
                    if (resId == "rage" && updatedConditions.none { it.conditionId.equals("raging", ignoreCase = true) }) {
                        val ruleCond = catalog.conditions.find { it.id.equals("raging", ignoreCase = true) }
                        updatedConditions = updatedConditions + CharacterCondition(
                            id = 0,
                            characterId = char.id,
                            conditionId = "raging",
                            condition = ruleCond,
                            conditionName = ruleCond?.name ?: "Raging"
                        )
                    }

                    // Execute Automatic Mechanical Effects for Healing / Slot Recovery / Buff Class Resources
                    var newHp = char.hpCurrent
                    var newUsedPact = char.usedPactSlots
                    var newUsedSlots = char.usedSpellSlots
                    var extraEffectSummary = "${tracked.max - tracked.used - spendAmount}/${tracked.max} uses remaining."

                    when (resId) {
                        "second-wind" -> {
                            val fighterLvl = char.classes?.find { it.classId == "fighter" }?.level ?: char.level
                            val swOutcome = RollResolver.executeRoll(
                                preSheet,
                                RollRequest(rollType = "custom_dice", targetId = "1d10+$fighterLvl", diceMode = "SIMULATED")
                            )
                            val healed = max(1, swOutcome.totalDamage)
                            newHp = (char.hpCurrent + healed).coerceAtMost(char.hpMax)
                            rollOutcome = swOutcome.copy(
                                title = "Second Wind (1d10 + $fighterLvl)",
                                totalHealing = healed,
                                summary = "Second Wind: Rolled ${swOutcome.detailedFormula} → Restored +$healed HP ($newHp/${char.hpMax} HP)"
                            )
                            extraEffectSummary = "Rolled ${swOutcome.detailedFormula} → Restored +$healed HP ($newHp/${char.hpMax} HP) • $extraEffectSummary"
                        }
                        "uncanny-metabolism" -> {
                            val monkLvl = char.classes?.find { it.classId == "monk" }?.level ?: char.level
                            val maSides = if (monkLvl >= 17) 12 else if (monkLvl >= 11) 10 else if (monkLvl >= 5) 8 else 6
                            val umOutcome = RollResolver.executeRoll(
                                preSheet,
                                RollRequest(rollType = "custom_dice", targetId = "1d$maSides+$monkLvl", diceMode = "SIMULATED")
                            )
                            val healed = max(1, umOutcome.totalDamage)
                            newHp = (char.hpCurrent + healed).coerceAtMost(char.hpMax)
                            // Restore all expended Ki/Focus points!
                            val kiIdx = currentList.indexOfFirst { it.resourceId == "ki-points" }
                            if (kiIdx >= 0) {
                                currentList[kiIdx] = currentList[kiIdx].copy(usedUses = 0)
                            }
                            rollOutcome = umOutcome.copy(
                                title = "Uncanny Metabolism (1d$maSides + $monkLvl)",
                                totalHealing = healed,
                                summary = "Uncanny Metabolism: Restored all Focus/Ki Points & healed +$healed HP ($newHp/${char.hpMax} HP)!"
                            )
                            extraEffectSummary = "Restored all Focus/Ki Points & healed +$healed HP ($newHp/${char.hpMax} HP)!"
                        }
                        "lay-on-hands" -> {
                            newHp = (char.hpCurrent + spendAmount).coerceAtMost(char.hpMax)
                            extraEffectSummary = "Restored +$spendAmount HP ($newHp/${char.hpMax} HP) • $extraEffectSummary"
                        }
                        "magical-cunning" -> {
                            val maxPact = preSheet.spellSlots.pactSlots.coerceAtLeast(1)
                            val rec = ceil(maxPact / 2.0).toInt().coerceAtLeast(1)
                            newUsedPact = (char.usedPactSlots - rec).coerceAtLeast(0)
                            extraEffectSummary = "Recovered $rec Pact Magic Slot(s)!"
                        }
                        "arcane-recovery" -> {
                            val wizLvl = char.classes?.find { it.classId == "wizard" }?.level ?: char.level
                            var budget = ceil(wizLvl / 2.0).toInt().coerceAtLeast(1)
                            val slotsMap = (char.usedSpellSlots?.slots ?: emptyMap()).toMutableMap()
                            val recoveredLevels = mutableListOf<Int>()
                            for (lvl in 5 downTo 1) {
                                val k = lvl.toString()
                                while ((slotsMap[k] ?: 0) > 0 && budget >= lvl) {
                                    slotsMap[k] = (slotsMap[k] ?: 0) - 1
                                    budget -= lvl
                                    recoveredLevels.add(lvl)
                                }
                            }
                            newUsedSlots = SpellSlotMap(slotsMap)
                            extraEffectSummary = if (recoveredLevels.isNotEmpty()) {
                                "Recovered Spell Slot(s): Level ${recoveredLevels.joinToString(", ")}"
                            } else "All Spell Slots already full!"
                        }
                        "innate-sorcery" -> {
                            if (activeMods.none { it.sourceId == "innate-sorcery" }) {
                                activeMods.add(
                                    ActiveModifier(
                                        sourceId = "innate-sorcery",
                                        sourceName = "Innate Sorcery",
                                        modifier = Modifier(type = "bonus", target = "spell_save_dc", value = 1, duration = "manual_disable"),
                                        expiresOn = "manual_disable"
                                    )
                                )
                            }
                            extraEffectSummary = "Active: +1 Sorcerer Spell Save DC & Advantage on Sorcerer Spell Attacks!"
                        }
                    }

                    char = char.copy(
                        hpCurrent = newHp,
                        deathSaveSuccess = if (newHp > 0 && char.hpCurrent == 0) 0 else char.deathSaveSuccess,
                        deathSaveFailure = if (newHp > 0 && char.hpCurrent == 0) 0 else char.deathSaveFailure,
                        usedPactSlots = newUsedPact,
                        usedSpellSlots = newUsedSlots,
                        resources = currentList.toTypedArray(),
                        activeModifiers = activeMods.toTypedArray(),
                        conditions = updatedConditions
                    )
                    logEvent("resource", "Used ${tracked.resource.name}", extraEffectSummary)
                }
            }

            "RESTORE_RESOURCE" -> {
                val resId = command.targetId ?: return EngineResult(char, preSheet)
                val change = command.amount ?: 1
                val currentList = (char.resources?.toList() ?: emptyList()).map {
                    if (it.resourceId == resId) it.copy(usedUses = (it.usedUses - change).coerceAtLeast(0)) else it
                }.toTypedArray()
                char = char.copy(resources = currentList)
            }

            "DEACTIVATE_EFFECT" -> {
                val sourceId = command.targetId ?: return EngineResult(char, preSheet)
                val remaining = (char.activeModifiers ?: emptyArray()).filter { it.sourceId != sourceId }.toTypedArray()
                val updatedConditions = if (sourceId.equals("rage", ignoreCase = true)) {
                    (char.conditions ?: emptyArray()).filter { !it.conditionId.equals("raging", ignoreCase = true) }.toTypedArray()
                } else {
                    char.conditions
                }
                char = char.copy(activeModifiers = remaining, conditions = updatedConditions)
                logEvent("resource", "Deactivated Effect", "Ended active effect: $sourceId")
            }

            "TOGGLE_CONDITION" -> {
                val condId = command.targetId ?: return EngineResult(char, preSheet)
                val current = (char.conditions?.toList() ?: emptyList())
                val exists = current.any { it.conditionId.equals(condId, ignoreCase = true) }
                val ruleCond = catalog.conditions.find { it.id.equals(condId, ignoreCase = true) }
                val updated = if (exists) {
                    current.filter { !it.conditionId.equals(condId, ignoreCase = true) }
                } else {
                    current + CharacterCondition(
                        id = 0,
                        characterId = char.id,
                        conditionId = condId,
                        condition = ruleCond,
                        conditionName = ruleCond?.name ?: condId
                    )
                }

                // Sync Raging Condition with Rage Active Modifiers
                var activeMods = (char.activeModifiers?.toList() ?: emptyList()).toMutableList()
                if (condId.equals("raging", ignoreCase = true)) {
                    if (exists) {
                        activeMods.removeAll { it.sourceId.equals("rage", ignoreCase = true) }
                    } else if (activeMods.none { it.sourceId.equals("rage", ignoreCase = true) }) {
                        val formulaCtx = FormulaEvaluator.buildContext(char)
                        val rageDmg = FormulaEvaluator.evaluate("rage_damage", formulaCtx) ?: 2
                        activeMods.add(
                            ActiveModifier(
                                sourceId = "rage",
                                sourceName = "Rage",
                                modifier = Modifier(type = "bonus", target = "str_damage", value = rageDmg, condition = "raging", duration = "manual_disable"),
                                expiresOn = "manual_disable"
                            )
                        )
                    }
                }

                // 2024 PHB: Incapacitated (and Paralyzed/Stunned/Unconscious/Petrified) immediately breaks Concentration!
                val breaksConcentration = !exists && condId.lowercase() in setOf(
                    "incapacitated", "paralyzed", "stunned", "unconscious", "petrified"
                )
                var updatedSpells = char.spells
                if (breaksConcentration) {
                    updatedSpells = (char.spells ?: emptyArray()).map { it.copy(isConcentrating = false) }.toTypedArray()
                    activeMods.removeAll { it.expiresOn.equals("concentration", ignoreCase = true) }
                }

                char = char.copy(
                    conditions = updated.toTypedArray(),
                    activeModifiers = activeMods.toTypedArray(),
                    spells = updatedSpells
                )
                val concNote = if (breaksConcentration && preSheet.concentrationSpellName != null) {
                    " • Lost Concentration on ${preSheet.concentrationSpellName}!"
                } else ""
                logEvent("condition", "${if (exists) "Removed" else "Applied"} Condition: ${ruleCond?.name ?: condId}", (ruleCond?.description ?: "") + concNote)
            }

            "SET_EXHAUSTION" -> {
                val lvl = (command.intValue ?: 0).coerceIn(0, 6)
                char = char.copy(exhaustion = lvl)
                logEvent("condition", "Exhaustion Level $lvl", "d20 Tests penalty: -${lvl * 2}, Speed penalty: -${lvl * 5} ft.")
            }

            "TOGGLE_INSPIRATION" -> {
                char = char.copy(inspiration = !char.inspiration)
                logEvent("resource", if (char.inspiration) "Gained Heroic Inspiration" else "Spent Heroic Inspiration", "")
            }

            "CONSUME_SPELL_SLOT" -> {
                val lvl = (command.intValue ?: 1).coerceIn(1, 9).toString()
                val slots = (char.usedSpellSlots?.slots ?: emptyMap()).toMutableMap()
                slots[lvl] = (slots[lvl] ?: 0) + 1
                char = char.copy(usedSpellSlots = SpellSlotMap(slots))
            }

            "RESTORE_SPELL_SLOT" -> {
                val lvl = (command.intValue ?: 1).coerceIn(1, 9).toString()
                val slots = (char.usedSpellSlots?.slots ?: emptyMap()).toMutableMap()
                val curr = slots[lvl] ?: 0
                if (curr > 0) slots[lvl] = curr - 1
                char = char.copy(usedSpellSlots = SpellSlotMap(slots))
            }

            "CONSUME_PACT_SLOT" -> {
                char = char.copy(usedPactSlots = char.usedPactSlots + 1)
            }

            "RESTORE_PACT_SLOT" -> {
                char = char.copy(usedPactSlots = (char.usedPactSlots - 1).coerceAtLeast(0))
            }

            "PREPARE_SPELL" -> {
                val spellId = command.targetId ?: return EngineResult(char, preSheet)
                val prep = command.boolValue ?: true
                val current = (char.spells?.toList() ?: emptyList()).toMutableList()
                val idx = current.indexOfFirst { it.spellId == spellId }
                val ruleSpell = catalog.spells.find { it.id == spellId } ?: current.getOrNull(idx)?.spell
                val spellLvl = ruleSpell?.level ?: current.getOrNull(idx)?.spellLevel ?: 1

                // Enforce Total Prepared Spells limit across all levels 1-9 combined (not per level!)
                if (prep && spellLvl > 0 && preSheet.maxPreparedSpells > 0 && preSheet.preparedSpellsCount >= preSheet.maxPreparedSpells) {
                    val alreadyPrep = idx >= 0 && current[idx].prepared
                    if (!alreadyPrep) {
                        logEvent(
                            "spell_cast",
                            "Preparation Limit Reached (${preSheet.maxPreparedSpells}/${preSheet.maxPreparedSpells})",
                            "Unprepare one of your currently prepared leveled spells before preparing ${ruleSpell?.name ?: spellId}."
                        )
                        return EngineResult(char, preSheet, emittedEvents.toTypedArray())
                    }
                }

                if (idx >= 0) {
                    if (!current[idx].alwaysPrepared && !current[idx].source.endsWith("_fixed") && !current[idx].source.startsWith("choice:")) {
                        current[idx] = current[idx].copy(prepared = prep)
                    }
                } else if (ruleSpell != null) {
                    current.add(
                        CharacterSpell(
                            characterId = char.id,
                            spellId = spellId,
                            prepared = prep,
                            isRitual = ruleSpell.isRitual,
                            source = "class",
                            alwaysPrepared = false,
                            spell = ruleSpell,
                            spellName = ruleSpell.name,
                            spellLevel = ruleSpell.level
                        )
                    )
                }
                char = char.copy(spells = current.toTypedArray())
            }

            "LEARN_SPELL" -> {
                // Adding a spell to Spellbook / Known list != Preparing it!
                // Cantrips (level 0) are active when learned (respecting maxCantrips); leveled spells (level > 0) are added with prepared = false.
                val spellId = command.targetId ?: return EngineResult(char, preSheet)
                val source = command.textValue ?: "class"
                val current = (char.spells?.toList() ?: emptyList()).toMutableList()
                if (current.none { it.spellId == spellId }) {
                    val ruleSpell = catalog.spells.find { it.id == spellId }
                    val lvl = ruleSpell?.level ?: 0
                    if (lvl == 0 && preSheet.maxCantrips > 0 && preSheet.knownCantripsCount >= preSheet.maxCantrips && !source.startsWith("choice:")) {
                        logEvent(
                            "spell_cast",
                            "Cantrip Limit Reached (${preSheet.maxCantrips}/${preSheet.maxCantrips})",
                            "Forget an existing class cantrip before learning ${ruleSpell?.name ?: spellId}."
                        )
                        return EngineResult(char, preSheet, emittedEvents.toTypedArray())
                    }
                    current.add(
                        CharacterSpell(
                            characterId = char.id,
                            spellId = spellId,
                            prepared = (lvl == 0), // Leveled spells start Unprepared when added!
                            isRitual = ruleSpell?.isRitual ?: false,
                            source = source,
                            alwaysPrepared = false,
                            spell = ruleSpell,
                            spellName = ruleSpell?.name ?: spellId,
                            spellLevel = lvl
                        )
                    )
                    char = char.copy(spells = current.toTypedArray())
                    logEvent(
                        "spell_cast",
                        if (lvl == 0) "Learned Cantrip: ${ruleSpell?.name ?: spellId}" else "Added to Spellbook: ${ruleSpell?.name ?: spellId}",
                        if (lvl == 0) "Cantrip ready to cast" else "Added as Unprepared — click Prepare to add to today's prepared pool (${preSheet.preparedSpellsCount}/${preSheet.maxPreparedSpells})"
                    )
                }
            }

            "SELECT_GRANTED_SPELL" -> {
                // Player-Choice Grant Slot (e.g. Magic Initiate 2 cantrips + 1 Lv 1 spell, High Elf Wizard cantrip, Fey/Shadow Touched)
                val slotId = command.targetId ?: return EngineResult(char, preSheet)
                val newSpellId = command.secondaryId ?: command.textValue
                val choiceSource = "choice:$slotId"
                val current = (char.spells?.toList() ?: emptyList()).filter { it.source != choiceSource }.toMutableList()
                if (!newSpellId.isNullOrBlank()) {
                    val ruleSpell = catalog.spells.find { it.id == newSpellId }
                    if (ruleSpell != null) {
                        // If the character already had that spell as a normal class spell, upgrade/replace it with the granted choice slot
                        current.removeAll { it.spellId == newSpellId && !it.source.endsWith("_fixed") }
                        current.add(
                            CharacterSpell(
                                characterId = char.id,
                                spellId = ruleSpell.id,
                                prepared = true,
                                isRitual = ruleSpell.isRitual,
                                isConcentrating = false,
                                source = choiceSource,
                                alwaysPrepared = true,
                                spell = ruleSpell,
                                spellName = ruleSpell.name,
                                spellLevel = ruleSpell.level
                            )
                        )
                        logEvent("spell_cast", "Selected Granted Spell: ${ruleSpell.name}", "Bound to $slotId (Always Prepared)")
                    }
                }
                char = char.copy(spells = current.toTypedArray())
            }

            "FORGET_SPELL" -> {
                // Only fixed subclass/species grants ("subclass_fixed", "species_fixed") are truly locked!
                // Player-choice grants ("choice:...") and class/spellbook spells can be removed/changed.
                val spellId = command.targetId ?: return EngineResult(char, preSheet)
                val current = (char.spells ?: emptyArray()).filter {
                    it.spellId != spellId || it.source.endsWith("_fixed")
                }.toTypedArray()
                char = char.copy(spells = current)
            }

            "TOGGLE_RITUAL" -> {
                val spellId = command.targetId ?: return EngineResult(char, preSheet)
                val isRit = command.boolValue ?: false
                val current = (char.spells ?: emptyArray()).map {
                    if (it.spellId == spellId) it.copy(isRitual = isRit) else it
                }.toTypedArray()
                char = char.copy(spells = current)
            }

            "SET_CONCENTRATION" -> {
                val spellId = command.targetId // null clears concentration
                val current = (char.spells ?: emptyArray()).map {
                    if (spellId != null && it.spellId == spellId) {
                        it.copy(isConcentrating = !it.isConcentrating)
                    } else {
                        it.copy(isConcentrating = false)
                    }
                }.toTypedArray()
                char = char.copy(spells = current)
            }

            "ADD_ITEM" -> {
                val itemId = command.targetId ?: return EngineResult(char, preSheet)
                val qty = (command.amount ?: command.intValue ?: 1).coerceAtLeast(1)
                val ruleItem = catalog.items.find { it.id == itemId }
                val current = (char.inventory?.toList() ?: emptyList()).toMutableList()
                val existingIdx = current.indexOfFirst { it.itemId == itemId && !it.equipped }
                if (existingIdx >= 0 && ruleItem?.isMagical != true) {
                    val ex = current[existingIdx]
                    current[existingIdx] = ex.copy(quantity = ex.quantity + qty)
                } else {
                    val nextTempId = (current.maxOfOrNull { it.id } ?: 0) + 1
                    current.add(
                        CharacterInventoryItem(
                            id = nextTempId,
                            characterId = char.id,
                            itemId = itemId,
                            quantity = qty,
                            equipped = false,
                            isIdentified = !(ruleItem?.isMagical ?: false),
                            isAttuned = false,
                            item = ruleItem,
                            itemName = ruleItem?.name ?: itemId,
                            itemCategory = ruleItem?.category ?: "misc"
                        )
                    )
                }
                char = char.copy(inventory = current.toTypedArray())
                logEvent("resource", "Added Item: ${ruleItem?.name ?: itemId} x$qty", "")
            }

            "REMOVE_ITEM" -> {
                val invId = command.intValue ?: return EngineResult(char, preSheet)
                val current = (char.inventory ?: emptyArray()).filter { it.id != invId }.toTypedArray()
                char = char.copy(inventory = current)
            }

            "UPDATE_ITEM_STATE" -> {
                val invId = command.intValue ?: return EngineResult(char, preSheet)
                val equip = command.boolValue
                val attune = command.boolValue2
                val identify = command.boolValue3
                val qty = command.amount ?: command.intValue2

                val current = (char.inventory?.toList() ?: emptyList()).toMutableList()
                val targetIdx = current.indexOfFirst { it.id == invId }
                if (targetIdx >= 0) {
                    val target = current[targetIdx]
                    val ruleItem = target.item ?: catalog.items.find { it.id == target.itemId }

                    if (qty != null && qty <= 0) {
                        current.removeAt(targetIdx)
                    } else {
                        // Auto-unequip conflicting slots if equipping
                        if (equip == true && !ruleItem?.slot.isNullOrBlank()) {
                            val slot = ruleItem!!.slot!!
                            for (i in current.indices) {
                                if (i == targetIdx || !current[i].equipped) continue
                                val otherRule = current[i].item ?: catalog.items.find { it.id == current[i].itemId }
                                val otherSlot = otherRule?.slot
                                val conflict = (otherSlot == slot) ||
                                    (slot == "two_handed" && (otherSlot == "main_hand" || otherSlot == "off_hand")) ||
                                    ((slot == "main_hand" || slot == "off_hand") && otherSlot == "two_handed")
                                if (conflict) {
                                    current[i] = current[i].copy(equipped = false)
                                }
                            }
                        }
                        // Enforce D&D 5e Attunement Limit (Max 3 attuned items)
                        if (attune == true && !target.isAttuned) {
                            val currentlyAttunedCount = current.count { it.isAttuned }
                            if (currentlyAttunedCount >= 3) {
                                logEvent(
                                    "resource",
                                    "Attunement Limit Reached (3/3)",
                                    "Unattune an existing magic item before attuning to ${ruleItem?.name ?: target.itemId}."
                                )
                                return EngineResult(char, preSheet, emittedEvents.toTypedArray())
                            }
                        }
                        current[targetIdx] = target.copy(
                            equipped = equip ?: target.equipped,
                            isAttuned = attune ?: target.isAttuned,
                            isIdentified = identify ?: target.isIdentified,
                            quantity = qty ?: target.quantity
                        )
                    }
                    char = char.copy(inventory = current.toTypedArray())
                }
            }

            "UPDATE_CURRENCY" -> {
                char = char.copy(
                    cp = command.cp ?: char.cp,
                    sp = command.sp ?: char.sp,
                    ep = command.ep ?: char.ep,
                    gp = command.gp ?: char.gp,
                    pp = command.pp ?: char.pp
                )
            }

            "UPDATE_SKILL" -> {
                val skill = command.targetId ?: return EngineResult(char, preSheet)
                val prof = (command.textValue ?: "proficient").lowercase()
                val skillKey = skill.lowercase().replace(" ", "_")
                val currentSkills = (char.proficiencies?.skills ?: emptyMap()).toMutableMap()
                currentSkills.keys.toList().filter {
                    it.equals(skill, ignoreCase = true) || it.lowercase().replace(" ", "_") == skillKey
                }.forEach { currentSkills.remove(it) }
                if (prof != "none") {
                    currentSkills[skill] = prof
                }
                val updatedProfs = (char.proficiencies ?: CharacterProficiencies()).copy(skills = currentSkills)
                char = char.copy(proficiencies = updatedProfs)
            }

            "TOGGLE_SAVING_THROW" -> {
                val ab = (command.targetId ?: command.secondaryId ?: return EngineResult(char, preSheet)).lowercase()
                val currentlyProficient = preSheet.savingThrows.find { it.ability.equals(ab, ignoreCase = true) }?.isProficient ?: false
                val nextProf = command.boolValue ?: !currentlyProficient
                val currentSaves = (char.proficiencies?.savingThrows ?: emptyMap()).toMutableMap()
                currentSaves.keys.toList().filter { it.equals(ab, ignoreCase = true) }.forEach { currentSaves.remove(it) }
                currentSaves[ab] = nextProf
                val updatedProfs = (char.proficiencies ?: CharacterProficiencies()).copy(savingThrows = currentSaves)
                char = char.copy(proficiencies = updatedProfs)
            }

            "ADD_PROFICIENCY" -> {
                val pType = (command.targetId ?: "tool").lowercase()
                if (pType == "saving_throw") {
                    val ab = (command.secondaryId ?: command.textValue ?: return EngineResult(char, preSheet)).lowercase()
                    val currentlyProficient = preSheet.savingThrows.find { it.ability.equals(ab, ignoreCase = true) }?.isProficient ?: false
                    val nextProf = command.boolValue ?: !currentlyProficient
                    val currentSaves = (char.proficiencies?.savingThrows ?: emptyMap()).toMutableMap()
                    currentSaves.keys.toList().filter { it.equals(ab, ignoreCase = true) }.forEach { currentSaves.remove(it) }
                    currentSaves[ab] = nextProf
                    val updatedProfs = (char.proficiencies ?: CharacterProficiencies()).copy(savingThrows = currentSaves)
                    char = char.copy(proficiencies = updatedProfs)
                } else {
                    val pVal = command.textValue ?: return EngineResult(char, preSheet)
                    val manual = char.manualProficiencies ?: ManualProficiencies()
                    val updated = when (pType) {
                        "armor" -> manual.copy(armor = (manual.armor.toList() + pVal).distinct().toTypedArray())
                        "weapon" -> manual.copy(weapons = (manual.weapons.toList() + pVal).distinct().toTypedArray())
                        else -> manual.copy(tools = (manual.tools.toList() + pVal).distinct().toTypedArray())
                    }
                    char = char.copy(manualProficiencies = updated)
                }
            }

            "REMOVE_PROFICIENCY" -> {
                val pType = (command.targetId ?: "tool").lowercase()
                val pVal = command.textValue ?: return EngineResult(char, preSheet)
                val manual = char.manualProficiencies ?: ManualProficiencies()
                val updated = when (pType) {
                    "armor" -> manual.copy(armor = manual.armor.filter { it != pVal }.toTypedArray())
                    "weapon" -> manual.copy(weapons = manual.weapons.filter { it != pVal }.toTypedArray())
                    else -> manual.copy(tools = manual.tools.filter { it != pVal }.toTypedArray())
                }
                char = char.copy(manualProficiencies = updated)
            }

            "ADD_LANGUAGE" -> {
                val langId = (command.targetId ?: return EngineResult(char, preSheet)).lowercase()
                val ruleLang = catalog.languages.find { it.id == langId }
                val current = (char.languages?.toList() ?: emptyList())
                if (current.none { it.languageId == langId }) {
                    val updated = current + CharacterLanguage(
                        id = 0,
                        characterId = char.id,
                        languageId = langId,
                        languageName = ruleLang?.name ?: langId.replaceFirstChar { it.uppercase() },
                        languageScript = ruleLang?.script
                    )
                    char = char.copy(languages = updated.toTypedArray())
                }
            }

            "REMOVE_LANGUAGE" -> {
                val langId = (command.targetId ?: return EngineResult(char, preSheet)).lowercase()
                val updated = (char.languages ?: emptyArray()).filter { it.languageId != langId }.toTypedArray()
                char = char.copy(languages = updated)
            }

            "UPDATE_BIO" -> {
                char = char.copy(
                    size = command.textValue ?: char.size,
                    appearance = command.textValue2 ?: char.appearance,
                    backstory = command.textValue3 ?: char.backstory,
                    notes = command.secondaryId ?: char.notes
                )
            }

            "ADD_XP" -> {
                val delta = command.amount ?: 0
                val newXp = (char.xp + delta).coerceAtLeast(0)
                char = char.copy(xp = newXp)
                logEvent("level_up", "Gained $delta XP", "Total XP: $newXp")
            }

            "SET_LEVEL" -> {
                val newLvl = (command.intValue ?: command.amount ?: char.level).coerceIn(1, 20)
                val currentClasses = (char.classes?.toList() ?: emptyList()).toMutableList()
                if (currentClasses.isNotEmpty()) {
                    currentClasses[0] = currentClasses[0].copy(level = newLvl)
                }
                char = char.copy(
                    level = newLvl,
                    classes = currentClasses.toTypedArray(),
                    hitDiceMax = newLvl,
                    hitDiceCurrent = char.hitDiceCurrent.coerceAtMost(newLvl)
                )
            }

            "LEVEL_UP" -> {
                val data = command.levelUpData ?: return EngineResult(char, preSheet)
                val currentClasses = (char.classes?.toList() ?: emptyList()).toMutableList()
                val existingIdx = currentClasses.indexOfFirst { it.classId == data.classId }
                val ruleClass = catalog.classes.find { it.id == data.classId }
                val sub = data.subclassId?.let { sId -> catalog.subclasses.find { it.id == sId } }

                val newClassLevel = if (existingIdx >= 0) {
                    val ex = currentClasses[existingIdx]
                    val nextLvl = ex.level + 1
                    currentClasses[existingIdx] = ex.copy(
                        level = nextLvl,
                        subclassId = data.subclassId ?: ex.subclassId,
                        subclassName = sub?.name ?: ex.subclassName
                    )
                    nextLvl
                } else {
                    currentClasses.add(
                        CharacterClass(
                            characterId = char.id,
                            classId = data.classId,
                            subclassId = data.subclassId,
                            level = 1,
                            className = ruleClass?.name ?: data.classId,
                            subclassName = sub?.name,
                            hitDie = ruleClass?.hitDie ?: 8
                        )
                    )
                    1
                }

                val newTotalLevel = currentClasses.sumOf { it.level }
                val ruleFeat = data.featId?.takeIf { it.isNotBlank() }?.let { fId ->
                    catalog.feats.find { it.id == fId }
                }
                // 2024 PHB: Epic Boons can increase ability scores up to 30; General Feats & ASIs cap at 20
                val abilityCap = if (ruleFeat?.category.equals("epic_boon", ignoreCase = true) ||
                    data.featId?.startsWith("boon-", ignoreCase = true) == true
                ) 30 else 20

                val asi = data.asi
                val newStr = (char.str + (asi?.str ?: 0)).coerceAtMost(max(char.str, abilityCap))
                val newDex = (char.dex + (asi?.dex ?: 0)).coerceAtMost(max(char.dex, abilityCap))
                val newCon = (char.con + (asi?.con ?: 0)).coerceAtMost(max(char.con, abilityCap))
                val newInt = (char.int + (asi?.int ?: 0)).coerceAtMost(max(char.int, abilityCap))
                val newWis = (char.wis + (asi?.wis ?: 0)).coerceAtMost(max(char.wis, abilityCap))
                val newCha = (char.cha + (asi?.cha ?: 0)).coerceAtMost(max(char.cha, abilityCap))

                val currentFeats = (char.feats?.toList() ?: emptyList()).toMutableList()
                if (ruleFeat != null && (ruleFeat.repeatable || currentFeats.none { it.id == ruleFeat.id })) {
                    currentFeats.add(
                        CharacterFeat(
                            id = ruleFeat.id,
                            name = ruleFeat.name,
                            description = ruleFeat.description,
                            modifiers = ruleFeat.modifiers
                        )
                    )
                }

                // Persist per-level raw Hit Die roll so custom rolled HP survives deterministic Max HP recomputation
                val hd = ruleClass?.hitDie ?: 8
                val preConMod = floor((char.con - 10) / 2.0).toInt()
                val rawRolledDie = if (data.hpMode.equals("manual", ignoreCase = true)) {
                    (data.hpIncrease - preConMod).coerceIn(1, hd)
                } else {
                    if (newTotalLevel == 1) hd else (hd / 2) + 1
                }
                val updatedHpRolls = (char.hpRolls.filterNot {
                    it.classId.equals(data.classId, ignoreCase = true) && it.level == newClassLevel
                } + HpRollEntry(classId = data.classId, level = newClassLevel, rolled = rawRolledDie)).toTypedArray()

                char = char.copy(
                    level = newTotalLevel,
                    classes = currentClasses.toTypedArray(),
                    str = newStr,
                    dex = newDex,
                    con = newCon,
                    int = newInt,
                    wis = newWis,
                    cha = newCha,
                    hpMax = char.hpMax + data.hpIncrease,
                    hpCurrent = char.hpCurrent + data.hpIncrease,
                    hpRolls = updatedHpRolls,
                    hitDiceMax = newTotalLevel,
                    hitDiceCurrent = char.hitDiceCurrent + 1,
                    feats = currentFeats.toTypedArray()
                )
                logEvent("level_up", "Leveled Up to Level $newTotalLevel!", "Advanced in ${ruleClass?.name ?: data.classId} (+${data.hpIncrease} HP)")
            }

            "SELECT_FEATURE_CHOICE" -> {
                val slotId = command.targetId ?: return EngineResult(char, preSheet)
                val optId = command.secondaryId ?: command.textValue ?: return EngineResult(char, preSheet)
                val currentChoices = (char.proficiencies?.featureChoices ?: emptyMap()).toMutableMap()
                currentChoices[slotId] = optId
                val updatedProfs = (char.proficiencies ?: CharacterProficiencies()).copy(featureChoices = currentChoices)
                char = char.copy(proficiencies = updatedProfs)
                val matchedSlot = preSheet.featureChoiceSlots.find { it.slotId == slotId }
                val matchedOpt = matchedSlot?.options?.find { it.id == optId }
                logEvent(
                    "level_up",
                    "Selected ${matchedSlot?.category ?: "Feature Choice"}: ${matchedOpt?.name ?: optId}",
                    matchedOpt?.effectSummary ?: ""
                )
            }

            "TOGGLE_WEAPON_MASTERY" -> {
                val weaponId = command.targetId ?: return EngineResult(char, preSheet)
                val limit = preSheet.weaponMasteryLimit
                if (limit <= 0) return EngineResult(char, preSheet)
                val currentMastered = preSheet.masteredWeaponIds.toMutableList()
                if (currentMastered.contains(weaponId)) {
                    currentMastered.remove(weaponId)
                } else {
                    if (currentMastered.size >= limit) {
                        currentMastered.removeAt(0)
                    }
                    currentMastered.add(weaponId)
                }
                val updatedProfs = (char.proficiencies ?: CharacterProficiencies()).copy(
                    masteredWeaponIds = currentMastered.toTypedArray()
                )
                char = char.copy(proficiencies = updatedProfs)
                val ruleWeapon = catalog.items.find { it.id == weaponId }
                logEvent(
                    "resource",
                    "Updated Weapon Mastery Loadout (${currentMastered.size}/$limit)",
                    "Active Masteries: ${currentMastered.joinToString(", ") { id -> catalog.items.find { it.id == id }?.let { "${it.name} (${it.weaponMastery})" } ?: id }}"
                )
            }

            "SET_COMPANION_FORM" -> {
                val formId = command.targetId?.takeIf { it.isNotBlank() }
                val matchedForm = formId?.let { id -> preSheet.availableCompanions.find { it.id == id } }
                val updatedProfs = (char.proficiencies ?: CharacterProficiencies()).copy(
                    activeCompanionId = matchedForm?.id,
                    companionHpCurrent = matchedForm?.maxHp
                )
                val druidCls = char.classes?.find { it.classId == "druid" }
                val druidLvl = druidCls?.level ?: 0
                val isMoonDruid = druidLvl >= 3 && (druidCls?.subclassId?.contains("moon", ignoreCase = true) == true)
                val isWildShape = matchedForm?.id?.startsWith("ws-") == true && druidLvl >= 2
                // 2024 PHB: Standard Druid Wild Shape = druidLvl Temp HP; Circle of the Moon = 3 * druidLvl Temp HP
                val wsTempHp = if (isMoonDruid) 3 * druidLvl else druidLvl
                val newTempHp = if (isWildShape) max(char.tempHp, wsTempHp) else char.tempHp
                char = char.copy(proficiencies = updatedProfs, tempHp = newTempHp)
                if (matchedForm != null) {
                    logEvent(
                        "resource",
                        "Activated ${matchedForm.category}: ${matchedForm.name}",
                        "HP ${matchedForm.maxHp} • AC ${matchedForm.armorClass} • ${matchedForm.attackName} (+${matchedForm.attackBonus}, ${matchedForm.damageDice}+${matchedForm.damageBonus})"
                    )
                } else {
                    logEvent("resource", "Dismissed Companion / Wild Shape Form", "")
                }
            }

            "UPDATE_COMPANION_HP" -> {
                val activeComp = preSheet.activeCompanion ?: return EngineResult(char, preSheet)
                val delta = command.amount ?: command.intValue ?: 0
                val nextHp = (preSheet.companionHpCurrent + delta).coerceIn(0, activeComp.maxHp)
                val updatedProfs = (char.proficiencies ?: CharacterProficiencies()).copy(
                    companionHpCurrent = nextHp
                )
                char = char.copy(proficiencies = updatedProfs)
                logEvent(
                    if (delta >= 0) "heal" else "damage",
                    "${activeComp.name}: ${if (delta >= 0) "+$delta HP" else "$delta HP"}",
                    "Companion HP: $nextHp / ${activeComp.maxHp}${if (nextHp == 0) " (Form Dropped to 0 HP!)" else ""}"
                )
            }

            "USE_CONSUMABLE_ITEM" -> {
                val invId = command.intValue ?: return EngineResult(char, preSheet)
                val currentInv = (char.inventory?.toList() ?: emptyList()).toMutableList()
                val idx = currentInv.indexOfFirst { it.id == invId }
                if (idx >= 0) {
                    val entry = currentInv[idx]
                    val ruleItem = entry.item ?: catalog.items.find { it.id == entry.itemId }
                    val itemName = ruleItem?.name ?: entry.itemName ?: entry.itemId
                    val idLower = entry.itemId.lowercase()
                    val nameLower = itemName.lowercase()
                    val descLower = (ruleItem?.description ?: "").lowercase()

                    // Detect Healing Potion formula (5e 2024: Healing 2d4+2, Greater 4d4+4, Superior 8d4+8, Supreme 10d4+20)
                    val healFormula: Pair<String, Int>? = when {
                        idLower.contains("supreme") || nameLower.contains("supreme") -> "10d4" to 20
                        idLower.contains("superior") || nameLower.contains("superior") -> "8d4" to 8
                        idLower.contains("greater") || nameLower.contains("greater") -> "4d4" to 4
                        idLower.contains("healing") || nameLower.contains("healing") || descLower.contains("regain") || descLower.contains("restore") -> {
                            val m = Regex("""(\d+d\d+)\s*(?:\+\s*(\d+))?""").find(descLower)
                            if (m != null) {
                                m.groupValues[1] to (m.groupValues.getOrNull(2)?.toIntOrNull() ?: 0)
                            } else "2d4" to 2
                        }
                        else -> null
                    }

                    if (healFormula != null) {
                        val (diceStr, flat) = healFormula
                        val outcome = RollResolver.executeRoll(
                            preSheet,
                            RollRequest(
                                rollType = "custom_dice",
                                targetId = if (flat > 0) "$diceStr+$flat" else diceStr,
                                diceMode = "SIMULATED"
                            )
                        )
                        val healed = max(1, outcome.totalDamage)
                        val wasZero = char.hpCurrent == 0
                        val newHp = (char.hpCurrent + healed).coerceAtMost(char.hpMax)
                        char = char.copy(
                            hpCurrent = newHp,
                            deathSaveSuccess = if (wasZero && newHp > 0) 0 else char.deathSaveSuccess,
                            deathSaveFailure = if (wasZero && newHp > 0) 0 else char.deathSaveFailure
                        )
                        rollOutcome = outcome.copy(
                            title = "Used $itemName",
                            totalHealing = healed,
                            summary = "Used $itemName → Restored +$healed HP (${outcome.detailedFormula}) • HP: $newHp/${char.hpMax}"
                        )
                        logEvent("heal", "Used $itemName (+$healed HP)", "Rolled ${outcome.detailedFormula} • HP restored to $newHp/${char.hpMax}")
                    } else {
                        logEvent("resource", "Used Consumable: $itemName", ruleItem?.description ?: "")
                    }

                    if (entry.quantity > 1) {
                        currentInv[idx] = entry.copy(quantity = entry.quantity - 1)
                    } else {
                        currentInv.removeAt(idx)
                    }
                    char = char.copy(inventory = currentInv.toTypedArray())
                }
            }
        }

        val allEvents = (emittedEvents + (char.events?.toList() ?: emptyList())).take(50).toTypedArray()
        val finalChar = char.copy(events = allEvents)
        val postSheet = resolve(finalChar, catalog)

        return EngineResult(
            character = postSheet.character,
            sheet = postSheet,
            events = emittedEvents.toTypedArray(),
            lastRollOutcome = rollOutcome,
            concentrationCheckRequiredDc = concDcRequired
        )
    }

    // --- Internal Helper Functions ---

    private fun incrementClassHitDiceUsed(classes: Array<CharacterClass>?, targetClassId: String?): Array<CharacterClass>? {
        if (classes.isNullOrEmpty()) return classes
        val list = classes.toMutableList()
        val preferredIdx = if (!targetClassId.isNullOrBlank()) {
            list.indexOfFirst { it.classId.equals(targetClassId, ignoreCase = true) && it.hitDiceUsed < it.level }
        } else -1
        val fallbackIdx = if (preferredIdx >= 0) preferredIdx else list.indexOfFirst { it.hitDiceUsed < it.level }
        if (fallbackIdx >= 0) {
            list[fallbackIdx] = list[fallbackIdx].copy(hitDiceUsed = (list[fallbackIdx].hitDiceUsed + 1).coerceAtMost(list[fallbackIdx].level))
        }
        return list.toTypedArray()
    }

    private fun getRageCharges(level: Int): Int = when (level) {
        in 1..2 -> 2
        in 3..5 -> 3
        in 6..11 -> 4
        in 12..16 -> 5
        in 17..19 -> 6
        20 -> 99
        else -> 2
    }

    private fun buildModifierSources(
        char: Character,
        inventory: Array<InventoryItem>,
        classFeatures: Array<RuleClassFeature>,
        catalog: RulesCatalog,
        includeActive: Boolean,
        activeChosenFeatureIds: Set<String> = emptySet()
    ): Array<ModifierSource> {
        val sources = mutableListOf<ModifierSource>()
        val formulaCtx = FormulaEvaluator.buildContext(char)

        fun toRuleMod(m: Modifier): RuleModifier {
            val evaluatedVal: String = when {
                !m.formula.isNullOrBlank() -> (FormulaEvaluator.evaluate(m.formula, formulaCtx) ?: m.value ?: 0).toString()
                m.value != null -> m.value.toString()
                !m.valueString.isNullOrBlank() -> {
                    val tokenVal = FormulaEvaluator.evaluate(m.valueString, formulaCtx)
                    tokenVal?.toString() ?: m.valueString
                }
                else -> "0"
            }
            return RuleModifier(m.type.trim(), m.target.trim(), evaluatedVal, m.condition, m.max)
        }

        // 0. Selected Class Feature Sub-Choices (Defense Fighting Style +1 AC in armor, Armor of Shadows +3 AC unarmored)
        if (activeChosenFeatureIds.contains("fs-defense")) {
            sources.add(
                ModifierSource(
                    "fs-defense",
                    "Fighting Style: Defense",
                    arrayOf(RuleModifier("bonus", "ac", "1", "wearing_armor", null))
                )
            )
        }
        if (activeChosenFeatureIds.contains("inv-armor-of-shadows")) {
            sources.add(
                ModifierSource(
                    "inv-armor-of-shadows",
                    "Eldritch Invocation: Armor of Shadows",
                    arrayOf(RuleModifier("bonus", "ac", "3", "unarmored", null))
                )
            )
        }

        // 1. Equipped Items (respecting attunement)
        inventory.forEach { inv ->
            if (inv.equipped && inv.item.modifiers.isNotEmpty() && (!inv.item.requiresAttunement || inv.isAttuned)) {
                val mods = inv.item.modifiers.map { toRuleMod(it) }.toTypedArray()
                sources.add(ModifierSource(inv.item.id, inv.item.name, mods))
            }
        }

        // 2. Race
        val race = catalog.races.find { it.id == char.raceId } ?: char.raceEntry
        race?.modifiers?.let { mods ->
            val rMods = mods.map { toRuleMod(it) }.toTypedArray()
            sources.add(ModifierSource(race.id, race.name, rMods))
        }

        // 3. Feats
        char.feats?.forEach { charFeat ->
            val ruleFeat = catalog.feats.find { it.id == charFeat.id }
            val modsToUse = ruleFeat?.modifiers ?: charFeat.modifiers
            if (!modsToUse.isNullOrEmpty()) {
                val rMods = modsToUse.map { toRuleMod(it) }.toTypedArray()
                sources.add(ModifierSource(charFeat.id, charFeat.name, rMods))
            }
        }

        // 4. Traits
        char.traits?.forEach { charTrait ->
            val ruleTrait = catalog.traits.find { it.id == charTrait.id }
            val modsToUse = ruleTrait?.modifiers ?: charTrait.modifiers
            if (!modsToUse.isNullOrEmpty()) {
                val rMods = modsToUse.map { toRuleMod(it) }.toTypedArray()
                sources.add(ModifierSource(charTrait.id, charTrait.name, rMods))
            }
        }

        // 5. Background
        val bg = catalog.backgrounds.find { it.id == char.backgroundId } ?: char.background
        bg?.modifiers?.let { mods ->
            val rMods = mods.map { toRuleMod(it) }.toTypedArray()
            sources.add(ModifierSource(bg.id, bg.name, rMods))
        }

        // 6. Class Features
        classFeatures.forEach { feat ->
            if (!feat.modifiers.isNullOrEmpty()) {
                val rMods = feat.modifiers.map { toRuleMod(it) }.toTypedArray()
                sources.add(ModifierSource(feat.id, feat.name, rMods))
            }
        }

        // 7. Active Resource / Spell Modifiers
        if (includeActive) {
            char.activeModifiers?.forEach { activeMod ->
                val rMod = toRuleMod(activeMod.modifier)
                sources.add(ModifierSource(activeMod.sourceId, activeMod.sourceName, arrayOf(rMod)))
            }
        }

        return sources.toTypedArray()
    }

    private fun calculateEffectiveMaxHp(
        char: Character,
        inventory: Array<InventoryItem>,
        classFeatures: Array<RuleClassFeature>,
        catalog: RulesCatalog
    ): Int {
        val classMap = catalog.classes.associateBy { it.id }
        val conMod = floor((char.con - 10) / 2.0).toInt()
        val rollLookup = char.hpRolls.associateBy { "${it.classId.lowercase()}:${it.level}" }
        var baseHp = 0
        var isFirst = true
        char.classes?.forEach { cls ->
            val hd = cls.hitDie ?: classMap[cls.classId]?.hitDie ?: 8
            for (lvl in 1..cls.level) {
                val explicitRoll = rollLookup["${cls.classId.lowercase()}:$lvl"]?.rolled
                val levelGain = if (explicitRoll != null) {
                    max(1, explicitRoll + conMod)
                } else if (isFirst) {
                    max(1, hd + conMod)
                } else {
                    max(1, (hd / 2) + 1 + conMod)
                }
                baseHp += levelGain
                isFirst = false
            }
        }
        val staticSources = buildModifierSources(char, inventory, classFeatures, catalog, includeActive = false)
            .filter { !it.name.contains("Wild Shape", ignoreCase = true) }
            .toTypedArray()
        val hpPerLevel = ModifierCalculator.getHpPerLevelBonus(staticSources)
        val flatBonus = ModifierCalculator.getHpMaxBonus(staticSources)
        val totalLevel = (char.classes?.sumOf { it.level } ?: char.level).coerceAtLeast(1)
        // Compute deterministically from class hit dice + CON + static bonuses (Tough, Dwarven Toughness, Boon of Fortitude)
        // so active buffs like Aid never compound/ratchet hpMax across repeated resolve() calls.
        val baseline = if (baseHp > 0) {
            (baseHp + (hpPerLevel * totalLevel) + flatBonus).coerceAtLeast(1)
        } else {
            char.hpMax.coerceAtLeast(1)
        }

        val activeBonus = (char.activeModifiers ?: emptyArray())
            .filter { it.modifier.target.equals("hp_max", ignoreCase = true) && it.modifier.type.equals("bonus", ignoreCase = true) }
            .sumOf { it.modifier.value ?: it.modifier.valueString?.toIntOrNull() ?: 0 }

        return (baseline + activeBonus).coerceAtLeast(1)
    }

    private fun calculateDarkvision(
        char: Character,
        inventory: Array<InventoryItem>,
        catalog: RulesCatalog,
        activeChosenFeatureIds: Set<String> = emptySet()
    ): Int {
        val allMods = mutableListOf<Modifier>()
        if (activeChosenFeatureIds.contains("inv-devils-sight")) {
            allMods.add(Modifier(type = "set", target = "darkvision", value = 120))
        }
        val race = catalog.races.find { it.id == char.raceId } ?: char.raceEntry
        race?.modifiers?.let { allMods.addAll(it) }
        char.traits?.forEach { ct ->
            val rt = catalog.traits.find { it.id == ct.id }
            (rt?.modifiers ?: ct.modifiers)?.let { allMods.addAll(it) }
        }
        char.feats?.forEach { cf ->
            val rf = catalog.feats.find { it.id == cf.id }
            (rf?.modifiers ?: cf.modifiers)?.let { allMods.addAll(it) }
        }
        inventory.filter { it.equipped }.forEach { allMods.addAll(it.item.modifiers) }

        val dvMods = allMods.filter { it.target.equals("darkvision", ignoreCase = true) }
        val maxSet = dvMods.filter { it.type == "set" }.maxOfOrNull { it.value ?: it.valueString?.toIntOrNull() ?: 0 } ?: 0
        val bonus = dvMods.filter { it.type == "bonus" }.sumOf { it.value ?: it.valueString?.toIntOrNull() ?: 0 }
        return maxSet + bonus
    }

    private fun resolveProficiencies(
        char: Character,
        inventory: Array<InventoryItem>,
        catalog: RulesCatalog,
        activeChosenFeatureIds: Set<String> = emptySet()
    ): ResolvedProficiencies {
        val armorList = mutableListOf<ResolvedProficiency>()
        val weaponList = mutableListOf<ResolvedProficiency>()
        val toolList = mutableListOf<ResolvedProficiency>()

        char.manualProficiencies?.armor?.forEach { armorList.add(ResolvedProficiency(it, "Manual", "Armor")) }
        char.manualProficiencies?.weapons?.forEach { weaponList.add(ResolvedProficiency(it, "Manual", "Weapon")) }
        char.manualProficiencies?.tools?.forEach { toolList.add(ResolvedProficiency(it, "Manual", "Tool")) }
        char.proficiencies?.tools?.forEach { toolList.add(ResolvedProficiency(it, "Background", "Tool")) }

        if (activeChosenFeatureIds.contains("cleric-protector")) {
            armorList.add(ResolvedProficiency("Heavy", "Divine Order: Protector", "Armor"))
            weaponList.add(ResolvedProficiency("Martial", "Divine Order: Protector", "Weapon"))
        }
        if (activeChosenFeatureIds.contains("druid-warden")) {
            armorList.add(ResolvedProficiency("Medium", "Primal Order: Warden", "Armor"))
            weaponList.add(ResolvedProficiency("Martial", "Primal Order: Warden", "Weapon"))
        }
        // 2024 PHB: College of Valor Bard (Lv 3+) gains Medium Armor, Shields, and Martial Weapons
        if (char.classes?.any { it.classId == "bard" && it.level >= 3 && (it.subclassId?.contains("valor", ignoreCase = true) == true) } == true) {
            armorList.add(ResolvedProficiency("Medium", "Subclass: College of Valor", "Armor"))
            armorList.add(ResolvedProficiency("Shields", "Subclass: College of Valor", "Armor"))
            weaponList.add(ResolvedProficiency("Martial", "Subclass: College of Valor", "Weapon"))
        }
        // Grant armor/weapon/tool proficiencies from feats (e.g., Lightly/Moderately/Heavily Armored, Martial Weapon Training, Poisoner)
        char.feats?.forEach { cf ->
            val rf = catalog.feats.find { it.id == cf.id }
            (rf?.modifiers ?: cf.modifiers)?.forEach { mod ->
                val enabled = (mod.value != null && mod.value != 0) || mod.valueString.equals("true", ignoreCase = true)
                if (enabled) {
                    val src = "Feat: ${cf.name}"
                    when (mod.type) {
                        "armor_proficiency" -> armorList.add(ResolvedProficiency(mod.target, src, "Armor"))
                        "weapon_proficiency" -> weaponList.add(ResolvedProficiency(mod.target, src, "Weapon"))
                        "tool_proficiency" -> toolList.add(ResolvedProficiency(mod.target, src, "Tool"))
                    }
                }
            }
        }

        char.classes?.forEach { cls ->
            val ruleClass = catalog.classes.find { it.id == cls.classId }
            if (ruleClass != null) {
                val src = "Class: ${ruleClass.name}"
                ruleClass.armorProficiencies.forEach { armorList.add(ResolvedProficiency(it, src, "Armor")) }
                ruleClass.weaponProficiencies.forEach { weaponList.add(ResolvedProficiency(it, src, "Weapon")) }
                ruleClass.toolProficiencies.forEach { toolList.add(ResolvedProficiency(it, src, "Tool")) }
            }
        }

        inventory.filter { it.equipped }.forEach { inv ->
            val src = "Item: ${inv.item.name}"
            inv.item.modifiers.forEach { mod ->
                val enabled = (mod.value != null && mod.value != 0) || mod.valueString.equals("true", ignoreCase = true)
                if (enabled) {
                    when (mod.type) {
                        "armor_proficiency" -> armorList.add(ResolvedProficiency(mod.target, src, "Armor"))
                        "weapon_proficiency" -> weaponList.add(ResolvedProficiency(mod.target, src, "Weapon"))
                        "tool_proficiency" -> toolList.add(ResolvedProficiency(mod.target, src, "Tool"))
                    }
                }
            }
        }

        return ResolvedProficiencies(
            armor = armorList.distinctBy { it.name.lowercase() }.toTypedArray(),
            weapons = weaponList.distinctBy { it.name.lowercase() }.toTypedArray(),
            tools = toolList.distinctBy { it.name.lowercase() }.toTypedArray()
        )
    }

    private fun checkItemProficiency(item: Item, profs: ResolvedProficiencies): Boolean {
        val nameLower = item.name.lowercase()
        val typeLower = item.type.lowercase()
        val catLower = item.category.lowercase()

        if (catLower == "armor") {
            if (profs.armor.any { it.name.equals(nameLower, ignoreCase = true) || it.name.equals("all armor", ignoreCase = true) }) return true
            val tags = item.tags.map { it.lowercase() }
            if ((tags.contains("armor:light") || typeLower.contains("light")) && profs.armor.any { it.name.lowercase().startsWith("light") }) return true
            if ((tags.contains("armor:medium") || typeLower.contains("medium")) && profs.armor.any { it.name.lowercase().startsWith("medium") }) return true
            if ((tags.contains("armor:heavy") || typeLower.contains("heavy")) && profs.armor.any { it.name.lowercase().startsWith("heavy") }) return true
            if ((tags.contains("armor:shield") || typeLower.contains("shield")) && profs.armor.any { it.name.lowercase().startsWith("shield") }) return true
            return false
        }

        if (catLower == "weapon") {
            if (profs.weapons.any { it.name.equals(nameLower, ignoreCase = true) || it.name.equals("all weapons", ignoreCase = true) }) return true
            val tags = item.tags.map { it.lowercase() }
            val props = item.properties.map { it.lowercase() }
            val isSimple = tags.contains("weapon:simple") || typeLower.contains("simple")
            val isMartial = tags.contains("weapon:martial") || typeLower.contains("martial")
            if (isSimple && profs.weapons.any { it.name.lowercase().startsWith("simple") }) return true
            if (isMartial) {
                // Full Martial proficiency (exclude restricted strings like "Martial (Light)" or "Martial (Finesse/Light)")
                val hasFullMartial = profs.weapons.any {
                    val n = it.name.lowercase().trim()
                    n == "martial" || n == "martial weapons"
                }
                if (hasFullMartial) return true
                // 2024 Monk: "Martial (Light)" — only Martial Melee weapons with the Light property
                val hasMartialLight = profs.weapons.any {
                    val n = it.name.lowercase()
                    n.contains("martial") && n.contains("light") && !n.contains("finesse")
                }
                if (hasMartialLight && props.contains("light") && !typeLower.contains("ranged")) return true
                // 2024 Rogue: "Martial (Finesse/Light)" — only Martial weapons with Finesse or Light property
                val hasMartialFinesseOrLight = profs.weapons.any {
                    val n = it.name.lowercase()
                    n.contains("martial") && n.contains("finesse")
                }
                if (hasMartialFinesseOrLight && (props.contains("finesse") || props.contains("light"))) return true
            }
            return false
        }

        return true
    }

    private fun collectAvailableRiders(
        char: Character,
        knownSpells: Array<KnownSpell>,
        catalog: RulesCatalog,
        activeChosenFeatureIds: Set<String> = emptySet()
    ): Array<CombatRider> {
        val riders = mutableListOf<CombatRider>()

        // 1. Class Riders
        char.classes?.forEach { cls ->
            val ruleClass = catalog.classes.find { it.id == cls.classId }
            ruleClass?.combatRiders?.filter { cls.level >= it.minLevel }?.forEach {
                riders.add(it.copy(source = "Class: ${ruleClass.name}"))
            }
            if (!cls.subclassId.isNullOrBlank()) {
                val sub = catalog.subclasses.find { it.id == cls.subclassId }
                sub?.combatRiders?.filter { cls.level >= it.minLevel }?.forEach {
                    riders.add(it.copy(source = "Subclass: ${sub.name}"))
                }
            }
        }

        // 1b. Selected Feature Choice Riders (Battle Master Maneuvers, Lifedrinker, Primal Strike, Seeking Spell)
        val fighterLvl = char.classes?.find { it.classId == "fighter" }?.level ?: 0
        val supDie = if (fighterLvl >= 18) "1d12" else if (fighterLvl >= 10) "1d10" else "1d8"
        if (activeChosenFeatureIds.contains("man-precision")) {
            riders.add(CombatRider("man-precision", "Maneuver: Precision Attack (+$supDie To-Hit)", "Fighter (Battle Master)", dice = supDie, appliesTo = "attack_roll"))
        }
        if (activeChosenFeatureIds.contains("man-trip")) {
            riders.add(CombatRider("man-trip", "Maneuver: Trip Attack (+$supDie + Prone)", "Fighter (Battle Master)", dice = supDie, damageType = "weapon", appliesTo = "weapon_damage"))
        }
        if (activeChosenFeatureIds.contains("man-menacing")) {
            riders.add(CombatRider("man-menacing", "Maneuver: Menacing Attack (+$supDie + Frightened)", "Fighter (Battle Master)", dice = supDie, damageType = "weapon", appliesTo = "weapon_damage"))
        }
        if (activeChosenFeatureIds.contains("man-pushing")) {
            riders.add(CombatRider("man-pushing", "Maneuver: Pushing Attack (+$supDie + Push 15ft)", "Fighter (Battle Master)", dice = supDie, damageType = "weapon", appliesTo = "weapon_damage"))
        }
        if (activeChosenFeatureIds.contains("man-feinting")) {
            riders.add(CombatRider("man-feinting", "Maneuver: Feinting Attack (Adv + $supDie)", "Fighter (Battle Master)", dice = supDie, damageType = "weapon", appliesTo = "weapon_damage", grantsAdvantage = true))
        }
        if (activeChosenFeatureIds.contains("inv-lifedrinker")) {
            riders.add(CombatRider("inv-lifedrinker", "Lifedrinker (+1d6 Necrotic/Radiant)", "Eldritch Invocation", dice = "1d6", damageType = "necrotic", appliesTo = "melee_damage"))
        }
        if (activeChosenFeatureIds.contains("druid-primal-strike")) {
            val druidLvl = char.classes?.find { it.classId == "druid" }?.level ?: 7
            val pDie = if (druidLvl >= 15) "2d8" else "1d8"
            riders.add(CombatRider("druid-primal-strike", "Elemental Fury: Primal Strike (+$pDie Elemental)", "Class: Druid", dice = pDie, damageType = "fire", appliesTo = "weapon_damage"))
        }
        if (activeChosenFeatureIds.contains("mm-seeking")) {
            riders.add(CombatRider("mm-seeking", "Metamagic: Seeking Spell (Reroll Attack)", "Class: Sorcerer", grantsAdvantage = true, appliesTo = "attack_roll"))
        }

        // 2. Feat Riders
        char.feats?.forEach { cf ->
            val rf = catalog.feats.find { it.id == cf.id }
            rf?.combatRiders?.forEach {
                riders.add(it.copy(source = "Feat: ${rf.name}"))
            }
        }

        // 3. Trait Riders
        char.traits?.forEach { ct ->
            val rt = catalog.traits.find { it.id == ct.id }
            rt?.combatRiders?.forEach {
                riders.add(it.copy(source = "Trait: ${rt.name}"))
            }
        }

        // 4. Active / Prepared Spell Riders (Hex, Hunter's Mark, Bless, Guidance, Divine Favor, Divine Smite)
        knownSpells.filter { it.prepared || it.isConcentrating }.forEach { ks ->
            ks.spell.mechanics?.rider?.let { spRider ->
                riders.add(spRider.copy(source = "Spell: ${ks.spell.name}"))
            }
        }

        return riders.distinctBy { it.id }.toTypedArray()
    }

    private fun buildCausalTriggerMatrix(
        char: Character,
        inventory: Array<InventoryItem>,
        classFeatures: Array<RuleClassFeature>,
        availableRiders: Array<CombatRider>,
        catalog: RulesCatalog,
        masteredWeaponIds: Set<String> = emptySet(),
        activeChosenFeatureIds: Set<String> = emptySet()
    ): Array<CausalTriggerInfo> {
        val triggers = mutableListOf<CausalTriggerInfo>()

        // 1. Equipped Weapon Masteries (2024 Rules — only active if weapon is in character's masteredWeaponIds!)
        inventory.filter { it.equipped && !it.item.weaponMastery.isNullOrBlank() && masteredWeaponIds.contains(it.item.id) }.forEach { inv ->
            val m = inv.item.weaponMastery!!
            val effect = when (m.lowercase()) {
                "graze" -> "On a missed attack roll, automatically deals damage equal to your Attack Ability Modifier."
                "vex" -> "On a hit, grants you Advantage on your next attack roll against that target before the end of your next turn."
                "topple" -> "On a hit, forces target to make a CON Save (DC 8 + PB + Attack Mod) or fall Prone."
                "sap" -> "On a hit, target has Disadvantage on its next attack roll before the start of your next turn."
                "push" -> "On a hit, pushes target up to 10 ft. straight away (Large or smaller)."
                "slow" -> "On a hit, reduces target's Speed by 10 ft. until the start of your next turn."
                "nick" -> "On a hit, allows your Light weapon extra attack as part of the Attack action instead of a Bonus Action."
                "cleave" -> "On a hit, allows a melee attack roll against a second creature within 5 ft. (weapon dice damage)."
                else -> "Triggers 2024 Weapon Mastery effect on attack."
            }
            triggers.add(
                CausalTriggerInfo(
                    id = "mastery-${inv.item.id}",
                    sourceType = "Weapon Mastery",
                    sourceName = "${inv.item.name} ($m)",
                    triggerCondition = if (m.equals("Graze", ignoreCase = true)) "On Weapon Miss" else "On Weapon Hit",
                    effectSummary = effect
                )
            )
        }

        // 2. Feat Triggers
        char.feats?.forEach { cf ->
            when (cf.id) {
                "savage-attacker" -> triggers.add(
                    CausalTriggerInfo(
                        id = "feat-savage-attacker",
                        sourceType = "Feat",
                        sourceName = "Savage Attacker",
                        triggerCondition = "On Weapon Damage Roll",
                        effectSummary = "Automatically rolls weapon damage dice twice and uses the higher total."
                    )
                )
                "great-weapon-master" -> triggers.add(
                    CausalTriggerInfo(
                        id = "feat-gwm",
                        sourceType = "Feat",
                        sourceName = "Great Weapon Master",
                        triggerCondition = "On Heavy Weapon Attack / Critical Hit",
                        effectSummary = "Adds +Proficiency Bonus to Heavy weapon damage, and triggers Hew (1 Bonus Action Melee Attack) on a Critical Hit."
                    )
                )
                "alert" -> triggers.add(
                    CausalTriggerInfo(
                        id = "feat-alert",
                        sourceType = "Feat",
                        sourceName = "Alert",
                        triggerCondition = "On Initiative Roll",
                        effectSummary = "Automatically adds +Proficiency Bonus to Initiative."
                    )
                )
                "healer" -> triggers.add(
                    CausalTriggerInfo(
                        id = "feat-healer",
                        sourceType = "Feat",
                        sourceName = "Healer",
                        triggerCondition = "On Healing Dice Roll",
                        effectSummary = "Automatically rerolls any 1s rolled on healing dice."
                    )
                )
                "tavern-brawler" -> triggers.add(
                    CausalTriggerInfo(
                        id = "feat-tavern-brawler",
                        sourceType = "Feat",
                        sourceName = "Tavern Brawler",
                        triggerCondition = "On Unarmed Strike",
                        effectSummary = "Upgrades Unarmed Strike damage die to 1d4 + STR and automatically rerolls 1s on damage."
                    )
                )
                "tough" -> triggers.add(
                    CausalTriggerInfo(
                        id = "feat-tough",
                        sourceType = "Feat",
                        sourceName = "Tough",
                        triggerCondition = "Passive / On Level Up",
                        effectSummary = "Automatically increases Maximum HP by +2 per character level (+${char.level * 2} HP)."
                    )
                )
                "magic-initiate" -> triggers.add(
                    CausalTriggerInfo(
                        id = "feat-magic-initiate",
                        sourceType = "Feat",
                        sourceName = "Magic Initiate",
                        triggerCondition = "On Casting Chosen Level 1 Spell",
                        effectSummary = "Grants 2 swappable Cantrips + 1 Level 1 Spell with 1 Free Cast per Long Rest (0 spell slots expended)."
                    )
                )
                "war-caster" -> triggers.add(
                    CausalTriggerInfo(
                        id = "feat-war-caster",
                        sourceType = "Feat",
                        sourceName = "War Caster",
                        triggerCondition = "On Concentration CON Saving Throw",
                        effectSummary = "Automatically grants Advantage on Constitution saving throws made to maintain Concentration."
                    )
                )
                "heavy-armor-master" -> triggers.add(
                    CausalTriggerInfo(
                        id = "feat-heavy-armor-master",
                        sourceType = "Feat",
                        sourceName = "Heavy Armor Master",
                        triggerCondition = "On Taking Physical Damage in Heavy Armor",
                        effectSummary = "Automatically reduces incoming Bludgeoning, Piercing, and Slashing damage by your Proficiency Bonus."
                    )
                )
            }
        }

        // 3. Species Trait Triggers
        val raceId = char.raceId.lowercase()
        val traitIds = (char.traits?.map { it.id.lowercase() } ?: emptyList()).toSet()
        if (raceId.startsWith("halfling") || traitIds.any { it.contains("lucky") }) {
            triggers.add(
                CausalTriggerInfo(
                    id = "trait-halfling-lucky",
                    sourceType = "Species Trait",
                    sourceName = "Halfling Lucky",
                    triggerCondition = "On Natural 1 (Any d20 Test)",
                    effectSummary = "Automatically rerolls any Natural 1 rolled on an Attack, Ability Check, or Saving Throw."
                )
            )
        }
        if (raceId.startsWith("gnome") || traitIds.any { it.contains("gnomish-cunning") }) {
            triggers.add(
                CausalTriggerInfo(
                    id = "trait-gnomish-cunning",
                    sourceType = "Species Trait",
                    sourceName = "Gnomish Cunning",
                    triggerCondition = "On INT / WIS / CHA Saving Throw",
                    effectSummary = "Automatically grants Advantage on Intelligence, Wisdom, and Charisma saving throws."
                )
            )
        }
        if (raceId.startsWith("dwarf") || traitIds.any { it.contains("dwarven-resilience") }) {
            triggers.add(
                CausalTriggerInfo(
                    id = "trait-dwarven-resilience",
                    sourceType = "Species Trait",
                    sourceName = "Dwarven Resilience",
                    triggerCondition = "On Taking Poison Damage",
                    effectSummary = "Automatically halves incoming Poison damage and grants Advantage against the Poisoned condition."
                )
            )
        }
        if (raceId.contains("orc") || traitIds.any { it.contains("relentless-endurance") }) {
            val used = (char.usedSpellSlots?.slots?.get("free:relentless-endurance") ?: 0) > 0
            triggers.add(
                CausalTriggerInfo(
                    id = "trait-relentless-endurance",
                    sourceType = "Species Trait",
                    sourceName = "Relentless Endurance",
                    triggerCondition = "On Dropping to 0 HP (1/Long Rest)",
                    effectSummary = if (used) "Used this Long Rest." else "Ready: Automatically drops you to 1 HP instead of 0 HP when taking lethal damage.",
                    isActive = !used
                )
            )
        }

        // 4. Class & Subclass Feature Triggers
        char.classes?.forEach { cls ->
            when (cls.classId) {
                "paladin" -> {
                    if (cls.level >= 2) {
                        triggers.add(
                            CausalTriggerInfo(
                                id = "class-divine-smite",
                                sourceType = "Class Feature",
                                sourceName = "Divine Smite",
                                triggerCondition = "On Melee Weapon Hit",
                                effectSummary = "Stackable Combat Rider: Expend a spell slot to add +2d8 (+1d8/slot level) Radiant damage (doubled on Critical Hit)."
                            )
                        )
                    }
                    if (cls.level >= 6) {
                        triggers.add(
                            CausalTriggerInfo(
                                id = "class-aura-of-protection",
                                sourceType = "Class Feature",
                                sourceName = "Aura of Protection",
                                triggerCondition = "On Any Saving Throw",
                                effectSummary = "Automatically adds your Charisma modifier (min +1) to all 6 Saving Throws and Concentration checks."
                            )
                        )
                    }
                }
                "rogue" -> {
                    triggers.add(
                        CausalTriggerInfo(
                            id = "class-sneak-attack",
                            sourceType = "Class Feature",
                            sourceName = "Sneak Attack (${ceil(cls.level / 2.0).toInt()}d6)",
                            triggerCondition = "On Finesse or Ranged Weapon Hit",
                            effectSummary = "Stackable Combat Rider: Adds +${ceil(cls.level / 2.0).toInt()}d6 damage once per turn (doubled on Critical Hit)."
                        )
                    )
                    if (cls.level >= 7) {
                        triggers.add(
                            CausalTriggerInfo(
                                id = "class-reliable-talent",
                                sourceType = "Class Feature",
                                sourceName = "Reliable Talent",
                                triggerCondition = "On Proficient Skill / Tool Check",
                                effectSummary = "Any d20 roll of 9 or lower on a proficient skill check is automatically elevated to 10."
                            )
                        )
                    }
                }
                "barbarian" -> {
                    val isRaging = (char.activeModifiers?.any { it.sourceId == "rage" } == true)
                    triggers.add(
                        CausalTriggerInfo(
                            id = "class-rage",
                            sourceType = "Class Feature",
                            sourceName = "Rage",
                            triggerCondition = "While Raging (Melee Attacks / Physical Damage / STR Tests)",
                            effectSummary = "Grants Advantage on STR Checks & Saves, halves Bludgeoning/Piercing/Slashing damage, and adds Rage Damage rider.",
                            isActive = isRaging
                        )
                    )
                }
                "fighter" -> {
                    if (cls.subclassId?.contains("champion", ignoreCase = true) == true && cls.level >= 3) {
                        val range = if (cls.level >= 15) "18–20" else "19–20"
                        triggers.add(
                            CausalTriggerInfo(
                                id = "subclass-improved-critical",
                                sourceType = "Class Feature",
                                sourceName = "Improved Critical (Champion)",
                                triggerCondition = "On Weapon Attack d20 Roll ($range)",
                                effectSummary = "Weapon attacks automatically score a Critical Hit (doubling all damage dice) on a roll of $range."
                            )
                        )
                    }
                }
                "cleric" -> {
                    if (cls.subclassId?.contains("life", ignoreCase = true) == true && cls.level >= 3) {
                        triggers.add(
                            CausalTriggerInfo(
                                id = "subclass-disciple-of-life",
                                sourceType = "Class Feature",
                                sourceName = "Disciple of Life (Life Domain)",
                                triggerCondition = "On Casting a Leveled Healing Spell",
                                effectSummary = "Automatically adds +(2 + Spell Slot Level) bonus HP to any leveled healing spell."
                            )
                        )
                    }
                }
            }
        }

        // 5. Active Spell Riders (Bless, Guidance, Hex, Hunter's Mark)
        availableRiders.filter { it.source.startsWith("Spell:") }.forEach { spRider ->
            triggers.add(
                CausalTriggerInfo(
                    id = "spell-rider-${spRider.id}",
                    sourceType = "Active Spell",
                    sourceName = spRider.name,
                    triggerCondition = "On ${spRider.appliesTo.replace("_", " ")}",
                    effectSummary = "Available in Action Composer: Adds ${spRider.dice ?: spRider.formula ?: ""} ${spRider.damageType ?: "bonus"}."
                )
            )
        }

        return triggers.toTypedArray()
    }

    private fun buildActionCatalog(
        char: Character,
        effModMap: Map<String, Int>,
        pb: Int,
        inventory: Array<InventoryItem>,
        knownSpells: Array<KnownSpell>,
        spellcastingStats: Array<ResolvedSpellcastingStats>,
        availableRiders: Array<CombatRider>,
        spellGrantSlots: Array<SpellGrantSlot>,
        modSources: Array<ModifierSource>,
        conditionContext: ConditionEvaluator.ConditionContext,
        masteredWeaponIds: Set<String> = emptySet(),
        activeChosenFeatureIds: Set<String> = emptySet()
    ): Array<ResolvedAttackAction> {
        val actions = mutableListOf<ResolvedAttackAction>()
        val strMod = effModMap["str"] ?: 0
        val dexMod = effModMap["dex"] ?: 0
        val intMod = effModMap["int"] ?: 0
        val wisMod = effModMap["wis"] ?: 0
        val chaMod = effModMap["cha"] ?: 0
        val exhPenalty = char.exhaustion * 2

        val hasSavageAttacker = char.feats?.any { it.id == "savage-attacker" } == true
        val hasGwm = char.feats?.any { it.id == "great-weapon-master" } == true
        val hasHalflingLucky = char.raceId.startsWith("halfling", ignoreCase = true)
        val isChampion = char.classes?.any { it.classId == "fighter" && it.level >= 3 && it.subclassId?.contains("champion", ignoreCase = true) == true } == true

        val barbarianLvl = char.classes?.find { it.classId == "barbarian" }?.level ?: 0
        val monkLvl = char.classes?.find { it.classId == "monk" }?.level ?: 0
        val isMonk = monkLvl > 0
        val paladinLvl = char.classes?.find { it.classId == "paladin" }?.level ?: 0
        val warlockLvl = char.classes?.find { it.classId == "warlock" }?.level ?: 0
        val wizardCls = char.classes?.find { it.classId == "wizard" }
        val wizardLvl = wizardCls?.level ?: 0
        val isEvoker = wizardCls?.subclassId?.contains("evoker", ignoreCase = true) == true
        val sorcererCls = char.classes?.find { it.classId == "sorcerer" }
        val sorcererLvl = sorcererCls?.level ?: 0
        val isDraconicSorcerer = sorcererCls?.subclassId?.contains("draconic", ignoreCase = true) == true
        val isCelestialWarlock = char.classes?.any { it.classId == "warlock" && it.subclassId?.contains("celestial", ignoreCase = true) == true } == true
        val clericLvl = char.classes?.find { it.classId == "cleric" }?.level ?: 0
        val druidLvl = char.classes?.find { it.classId == "druid" }?.level ?: 0

        val isRaging = conditionContext.isRaging
        val rageBonusValue = when {
            barbarianLvl >= 16 -> 4
            barbarianLvl >= 9 -> 3
            else -> 2
        }
        val activeRageHasStrDmgMod = char.activeModifiers?.any {
            it.sourceId.equals("rage", ignoreCase = true) && it.modifier.target.equals("str_damage", ignoreCase = true)
        } == true

        val hasDuelingStyle = activeChosenFeatureIds.contains("fs-dueling") || char.feats?.any { it.id.contains("dueling", ignoreCase = true) } == true
        val hasArcheryStyle = activeChosenFeatureIds.contains("fs-archery") || char.feats?.any { it.id.contains("archery", ignoreCase = true) } == true
        val hasGwfStyle = activeChosenFeatureIds.contains("fs-gwf") || char.feats?.any { it.id.contains("great-weapon-fighting", ignoreCase = true) } == true
        val hasUnarmedFightingStyle = activeChosenFeatureIds.contains("fs-unarmed")
        val hasPactOfTheBlade = activeChosenFeatureIds.contains("inv-pact-of-the-blade")

        val monkMartialArtsDieSides = when {
            monkLvl >= 17 -> 12
            monkLvl >= 11 -> 10
            monkLvl >= 5 -> 8
            monkLvl >= 1 -> 6
            else -> 0
        }

        // 1. Equipped Weapons
        val equippedWeapons = inventory.filter {
            it.equipped && (it.item.category.equals("weapon", ignoreCase = true) || it.item.type.lowercase().contains("weapon"))
        }

        equippedWeapons.forEach { inv ->
            val item = inv.item
            val props = item.properties.map { it.lowercase() }
            val isFinesse = props.contains("finesse") || (item.description?.lowercase()?.contains("finesse") == true)
            val isRanged = item.type.lowercase().contains("ranged") || (item.tags.any { it.equals("weapon:ranged", ignoreCase = true) })
            val isHeavy = props.contains("heavy")
            val isTwoHanded = props.contains("two-handed")
            val isLight = props.contains("light")
            val isSimple = item.type.lowercase().contains("simple") || item.tags.any { it.equals("weapon:simple", ignoreCase = true) }

            // Monk Weapon rule (5e 2024): Any Simple Melee weapon or Martial Melee weapon with Light property
            val isMonkWeapon = isMonk && !isRanged && !isHeavy && !isTwoHanded && (isSimple || isLight)

            val useCha = hasPactOfTheBlade && !isRanged && chaMod > max(strMod, if (isFinesse || isMonkWeapon) dexMod else -10)
            val useDex = !useCha && (isRanged || ((isFinesse || isMonkWeapon) && dexMod > strMod))
            val abil = if (useCha) "CHA" else if (useDex) "DEX" else "STR"
            val abilMod = if (useCha) chaMod else if (useDex) dexMod else strMod
            val activeMastery = item.weaponMastery?.takeIf { it.isNotBlank() && masteredWeaponIds.contains(item.id) }

            val itemHitBonus = item.modifiers.filter { it.type.trim() == "bonus" && (it.target.trim() == "attack" || it.target.trim() == "weapon_attack") }
                .sumOf { it.value ?: it.valueString?.toIntOrNull() ?: 0 }
            val itemDmgBonus = item.modifiers.filter { it.type.trim() == "bonus" && (it.target.trim() == "damage" || it.target.trim() == "weapon_damage") }
                .sumOf { it.value ?: it.valueString?.toIntOrNull() ?: 0 }

            val globalHitBonus = ModifierCalculator.getAttackBonus(
                modSources,
                conditionContext,
                isMelee = !isRanged,
                isRanged = isRanged,
                abilityUsed = abil,
                excludeSourceId = item.id
            ) + (if (hasArcheryStyle && isRanged) 2 else 0)

            var globalDmgBonus = ModifierCalculator.getWeaponDamageBonus(
                modSources,
                conditionContext,
                isMelee = !isRanged,
                isRanged = isRanged,
                abilityUsed = abil,
                excludeSourceId = item.id
            )
            // Ensure Barbarian Rage damage (+2/+3/+4) is ALWAYS applied when Raging with a Melee STR weapon
            val rageApplied = isRaging && !isRanged && abil == "STR"
            if (rageApplied && !activeRageHasStrDmgMod) {
                globalDmgBonus += rageBonusValue
            }
            // Great Weapon Master (2024): +PB damage on Heavy weapons
            val gwmBonus = if (hasGwm && isHeavy) pb else 0
            // Dueling Fighting Style: +2 damage on single one-handed melee weapon
            val duelingBonus = if (hasDuelingStyle && !isRanged && !isTwoHanded && equippedWeapons.size == 1) 2 else 0

            val toHit = abilMod + (if (inv.isProficient) pb else 0) + itemHitBonus + globalHitBonus - exhPenalty
            val dmgBonus = abilMod + itemDmgBonus + globalDmgBonus + gwmBonus + duelingBonus

            // Upgrade Monk weapon base die if Martial Arts die is larger
            val rawWeaponDice = item.damageDice ?: "1d6"
            val rawSpec = RollResolver.parseDice(rawWeaponDice)
            val effectiveDamageDice = if (isMonkWeapon && rawSpec != null && rawSpec.count == 1 && monkMartialArtsDieSides > rawSpec.sides) {
                "1d$monkMartialArtsDieSides"
            } else {
                rawWeaponDice
            }

            // Exclude rider-rage from eligibleRiders when Rage is already active in base damageBonus to prevent double-counting
            val eligibleRiders = availableRiders.filter { r ->
                if (r.id == "rider-rage" && rageApplied) return@filter false
                when (r.appliesTo) {
                    "damage", "weapon_damage", "attack_roll", "attack_and_save", "d20_test" -> true
                    "melee_damage", "melee_attack" -> !isRanged
                    "finesse_or_ranged_damage" -> isFinesse || isRanged
                    "heavy_weapon_damage" -> isHeavy
                    else -> false
                }
            }.toTypedArray()

            val weaponTriggers = buildList {
                activeMastery?.let { add("Mastery: $it") }
                if (useCha) add("Pact of the Blade (Using CHA)")
                if (hasGwfStyle && (isTwoHanded || !item.versatileDice.isNullOrBlank())) add("Style: Great Weapon Fighting (Min 3 on Dice)")
                if (rageApplied) add("Rage Active (+$rageBonusValue STR Melee Dmg)")
                if (isMonkWeapon && effectiveDamageDice != rawWeaponDice) add("Martial Arts Die ($effectiveDamageDice)")
                if (hasSavageAttacker) add("Feat: Savage Attacker (Reroll Dmg)")
                if (hasGwm && isHeavy) add("Feat: Great Weapon Master (+$pb Dmg / Hew on Crit)")
                if (paladinLvl >= 11 && !isRanged) add("Feature: Radiant Strikes (+1d8 Radiant)")
                if (isChampion) add("Feature: Improved Critical (19-20)")
                if (hasHalflingLucky) add("Trait: Halfling Lucky (Reroll Nat 1)")
                eligibleRiders.forEach { r -> add("${r.name} (${r.dice ?: r.diceFormula ?: r.formula ?: "Rider"})") }
            }.toTypedArray()

            val dmgModParts = buildList {
                add("$abil (${if (abilMod >= 0) "+$abilMod" else "$abilMod"})")
                if (itemDmgBonus != 0) add("Item (+$itemDmgBonus)")
                if (rageApplied) add("Rage (+$rageBonusValue)")
                val otherGlobalDmg = globalDmgBonus - (if (rageApplied) rageBonusValue else 0)
                if (otherGlobalDmg != 0) add("Mods (${if (otherGlobalDmg > 0) "+$otherGlobalDmg" else "$otherGlobalDmg"})")
                if (gwmBonus > 0) add("GWM (+$gwmBonus)")
                if (duelingBonus > 0) add("Dueling (+$duelingBonus)")
            }.joinToString(" + ")

            actions.add(
                ResolvedAttackAction(
                    id = item.id,
                    name = if (!inv.isIdentified && item.isMagical) item.name else (item.trueName ?: item.name),
                    actionCategory = "weapon",
                    castingTime = "1 Action",
                    range = item.range ?: (if (isRanged) "80/320 ft." else if (props.contains("reach")) "10 ft." else "5 ft."),
                    isProficient = inv.isProficient,
                    attackAbility = abil,
                    toHitBonus = toHit,
                    baseDamageDice = effectiveDamageDice,
                    versatileDamageDice = item.versatileDice,
                    damageBonus = dmgBonus,
                    damageType = item.damageType ?: "physical",
                    weaponMastery = activeMastery,
                    properties = item.properties,
                    eligibleRiders = eligibleRiders,
                    activeTriggers = weaponTriggers,
                    breakdown = "Hit: $abil (${if (abilMod >= 0) "+$abilMod" else "$abilMod"})${if (inv.isProficient) " + PB (+$pb)" else ""}${if (itemHitBonus + globalHitBonus != 0) " + Mods (+${itemHitBonus + globalHitBonus})" else ""} • Dmg: $effectiveDamageDice + [$dmgModParts]"
                )
            )
        }

        // 2. Always include Unarmed Strike
        val hasTavernBrawler = char.feats?.any { it.id == "tavern-brawler" } == true
        val unarmedAbil = if (isMonk && dexMod > strMod) "DEX" else "STR"
        val unarmedMod = if (unarmedAbil == "DEX") dexMod else strMod
        val unarmedDice = when {
            isMonk -> "1d$monkMartialArtsDieSides"
            hasUnarmedFightingStyle -> if (equippedWeapons.isEmpty() && !conditionContext.isWieldingShield) "1d8" else "1d6"
            hasTavernBrawler -> "1d4"
            else -> "1d1"
        }
        val unarmedRageApplied = isRaging && unarmedAbil == "STR"
        var unarmedGlobalDmg = ModifierCalculator.getWeaponDamageBonus(
            modSources,
            conditionContext,
            isMelee = true,
            isRanged = false,
            abilityUsed = unarmedAbil
        )
        if (unarmedRageApplied && !activeRageHasStrDmgMod) {
            unarmedGlobalDmg += rageBonusValue
        }
        val unarmedGlobalHit = ModifierCalculator.getAttackBonus(
            modSources,
            conditionContext,
            isMelee = true,
            isRanged = false,
            abilityUsed = unarmedAbil
        )
        val unarmedTriggers = buildList {
            if (isMonk) add("Feature: Martial Arts ($unarmedDice)")
            if (unarmedRageApplied) add("Rage Active (+$rageBonusValue STR Melee Dmg)")
            if (hasTavernBrawler) add("Feat: Tavern Brawler (1d4 + Reroll 1s)")
            if (paladinLvl >= 11) add("Feature: Radiant Strikes (+1d8 Radiant)")
            if (hasHalflingLucky) add("Trait: Halfling Lucky (Reroll Nat 1)")
        }.toTypedArray()

        actions.add(
            ResolvedAttackAction(
                id = "unarmed-strike",
                name = "Unarmed Strike",
                actionCategory = "unarmed",
                castingTime = "1 Action",
                range = "5 ft.",
                isProficient = true,
                attackAbility = unarmedAbil,
                toHitBonus = unarmedMod + pb + unarmedGlobalHit - exhPenalty,
                baseDamageDice = unarmedDice,
                damageBonus = unarmedMod + unarmedGlobalDmg,
                damageType = "bludgeoning",
                eligibleRiders = availableRiders.filter {
                    if (it.id == "rider-rage" && unarmedRageApplied) return@filter false
                    it.appliesTo in listOf("damage", "melee_damage", "attack_roll", "attack_and_save")
                }.toTypedArray(),
                activeTriggers = unarmedTriggers,
                breakdown = "Hit: $unarmedAbil (${if (unarmedMod >= 0) "+$unarmedMod" else "$unarmedMod"}) + PB (+$pb) • Dmg: $unarmedDice + $unarmedAbil (${if (unarmedMod >= 0) "+$unarmedMod" else "$unarmedMod"})${if (unarmedRageApplied) " + Rage (+$rageBonusValue)" else ""}"
            )
        )

        // 3. Prepared Combat & Healing Spells + Cantrips
        val primarySpellStat = spellcastingStats.firstOrNull()
        val hasHealerFeat = char.feats?.any { it.id == "healer" } == true
        val isLifeCleric = char.classes?.any { it.classId == "cleric" && it.level >= 3 && it.subclassId?.contains("life", ignoreCase = true) == true } == true
        val hasAgonizingBlastChoice = activeChosenFeatureIds.contains("inv-agonizing-blast")
        val hasClericPotentChoice = activeChosenFeatureIds.contains("cleric-potent-spellcasting")
        val hasDruidPotentChoice = activeChosenFeatureIds.contains("druid-potent-spellcasting")

        knownSpells.filter { it.spell.level == 0 || it.prepared }.forEach { ks ->
            val sp = ks.spell
            val mech = sp.mechanics
            val actType = mech?.actionType ?: "utility"
            if (actType in listOf("attack", "save", "auto_damage", "heal") || sp.level == 0) {
                // Multiclass-aware spellcasting stat lookup: match the spell's class list to the character's caster classes
                val matchedCastStat = spellcastingStats.find { stat ->
                    sp.classes.any { c -> c.equals(stat.classId, ignoreCase = true) } ||
                        (stat.classId in listOf("fighter", "rogue") && sp.classes.any { c -> c.equals("wizard", ignoreCase = true) })
                } ?: primarySpellStat
                val spellAbilName = matchedCastStat?.ability ?: "INT"
                val spellToHit = matchedCastStat?.attackBonus ?: (pb + 3)
                val spellDc = matchedCastStat?.saveDC ?: (8 + pb + 3)
                val spellMod = matchedCastStat?.modifier ?: 3

                val firstDmg = mech?.damage?.firstOrNull()
                val scaledDice = if (sp.level == 0 && firstDmg != null && !mech.cantripScaling.isNullOrEmpty()) {
                    when {
                        char.level >= 17 -> mech.cantripScaling["17"] ?: firstDmg.dice
                        char.level >= 11 -> mech.cantripScaling["11"] ?: firstDmg.dice
                        char.level >= 5 -> mech.cantripScaling["5"] ?: firstDmg.dice
                        else -> firstDmg.dice
                    }
                } else firstDmg?.dice

                // Global Spell Damage & Healing Modifiers from modSources (Items, Active Buffs, Feats, Class Features)
                val globalSpellDmg = if (firstDmg != null) {
                    ModifierCalculator.getSpellDamageBonus(
                        modSources,
                        conditionContext,
                        isCantrip = sp.level == 0,
                        damageType = firstDmg.type,
                        school = sp.school
                    )
                } else 0
                val globalSpellHeal = if (mech?.healing != null) {
                    ModifierCalculator.getSpellHealingBonus(modSources, conditionContext)
                } else 0

                // Automatic Class & Subclass Spell Damage Modifiers (strictly gated on chosen 2024 options!)
                val autoAgonizingBlast = hasAgonizingBlastChoice && warlockLvl >= 2 && sp.level == 0 && firstDmg != null && sp.classes.any { it.equals("warlock", ignoreCase = true) }
                val autoEmpoweredEvocation = isEvoker && wizardLvl >= 10 && firstDmg != null && sp.school.equals("Evocation", ignoreCase = true)
                val autoElementalAffinity = isDraconicSorcerer && sorcererLvl >= 6 && firstDmg != null &&
                    firstDmg.type.lowercase() in listOf("acid", "cold", "fire", "lightning", "poison")
                val autoRadiantSoul = isCelestialWarlock && warlockLvl >= 6 && firstDmg != null &&
                    firstDmg.type.lowercase() in listOf("radiant", "fire")
                val autoPotentSpellcasting = firstDmg != null && sp.level == 0 && (
                    (hasClericPotentChoice && clericLvl >= 7 && sp.classes.any { it.equals("cleric", ignoreCase = true) }) ||
                        (hasDruidPotentChoice && druidLvl >= 7 && sp.classes.any { it.equals("druid", ignoreCase = true) })
                    )

                var classFeatureSpellDmg = 0
                val classFeatureDmgLabels = mutableListOf<String>()
                if (autoAgonizingBlast) {
                    val b = max(1, chaMod)
                    classFeatureSpellDmg += b
                    classFeatureDmgLabels.add("Agonizing Blast +$b CHA")
                }
                if (autoEmpoweredEvocation) {
                    val b = max(1, intMod)
                    classFeatureSpellDmg += b
                    classFeatureDmgLabels.add("Empowered Evocation +$b INT")
                }
                if (autoElementalAffinity) {
                    val b = max(1, chaMod)
                    classFeatureSpellDmg += b
                    classFeatureDmgLabels.add("Elemental Affinity +$b CHA")
                }
                if (autoRadiantSoul && !autoAgonizingBlast) {
                    val b = max(1, chaMod)
                    classFeatureSpellDmg += b
                    classFeatureDmgLabels.add("Radiant Soul +$b CHA")
                }
                if (autoPotentSpellcasting) {
                    val b = max(1, wisMod)
                    classFeatureSpellDmg += b
                    classFeatureDmgLabels.add("Potent Spellcasting +$b WIS")
                }

                val inherentSpellModOnDmg = firstDmg?.addSpellMod == true ||
                    sp.id in setOf("true-strike", "shillelagh", "flame-blade", "spiritual-weapon")
                val inherentSpellModOnHeal = mech?.healing?.addSpellMod == true ||
                    sp.id in setOf("cure-wounds", "healing-word", "mass-cure-wounds", "mass-healing-word", "prayer-of-healing", "arcane-vigor")

                val totalSpellDmgBonus = (firstDmg?.flatBonus ?: 0) +
                    (if (inherentSpellModOnDmg) spellMod else 0) +
                    globalSpellDmg +
                    classFeatureSpellDmg

                val totalSpellHealBonus = (mech?.healing?.flatBonus ?: 0) +
                    (if (inherentSpellModOnHeal) spellMod else 0) +
                    globalSpellHeal +
                    (if (isLifeCleric && sp.level > 0 && mech?.healing != null) (2 + sp.level) else 0)

                // Filter out riders already auto-applied above so they aren't double-counted
                val eligibleRiders = availableRiders.filter { r ->
                    if (r.id == "rider-agonizing-blast" && autoAgonizingBlast) return@filter false
                    if (r.id == "rider-empowered-evocation" && autoEmpoweredEvocation) return@filter false
                    if (r.id == "rider-elemental-affinity" && autoElementalAffinity) return@filter false
                    when (r.appliesTo) {
                        "spell_damage" -> true
                        "cantrip_damage" -> sp.level == 0
                        "attack_roll", "attack_and_save" -> actType == "attack"
                        else -> false
                    }
                }.toTypedArray()

                val grantSlot = spellGrantSlots.find { it.selectedSpellId == sp.id }
                val freeCastAvail = grantSlot != null && grantSlot.grantsFreeCastPerLongRest && !grantSlot.freeCastUsed

                val spellTriggers = buildList {
                    if (freeCastAvail) add("${grantSlot!!.sourceName}: 1/LR Free Cast Ready")
                    if (inherentSpellModOnDmg) add("+$spellMod $spellAbilName Mod included in Damage")
                    classFeatureDmgLabels.forEach { add(it) }
                    if (globalSpellDmg != 0) add("Active/Item Spell Dmg Mod (+$globalSpellDmg)")
                    if (isEvoker && wizardLvl >= 3 && sp.level == 0 && firstDmg != null) add("Potent Cantrip (Half Dmg on Miss/Save)")
                    if (sp.id == "sorcerous-burst") add("Exploding d8s on rolled 8s")
                    if (actType == "heal" && hasHealerFeat) add("Feat: Healer (Reroll 1s)")
                    if (actType == "heal" && isLifeCleric && sp.level > 0) add("Feature: Disciple of Life (+${2 + sp.level} HP)")
                    eligibleRiders.forEach { r -> add("${r.name} (${r.dice ?: r.formula ?: "Rider"})") }
                }.toTypedArray()

                val breakdownStr = when {
                    actType == "attack" -> "Spell Attack +$spellToHit ($spellAbilName ${if (spellMod >= 0) "+$spellMod" else "$spellMod"}, PB +$pb)${if (scaledDice != null) " • Dmg: $scaledDice${if (totalSpellDmgBonus > 0) "+$totalSpellDmgBonus" else ""}" else ""}"
                    mech?.saveAbility != null -> "Save DC $spellDc ${mech.saveAbility} (8 + $spellAbilName ${if (spellMod >= 0) "+$spellMod" else "$spellMod"} + PB +$pb)${if (scaledDice != null) " • Dmg: $scaledDice${if (totalSpellDmgBonus > 0) "+$totalSpellDmgBonus" else ""}" else ""}"
                    scaledDice != null -> "Auto-Hit • Dmg: $scaledDice${if (totalSpellDmgBonus > 0) "+$totalSpellDmgBonus" else ""}"
                    mech?.healing != null -> "Heal: ${mech.healing.dice}${if (totalSpellHealBonus > 0) "+$totalSpellHealBonus" else ""}"
                    else -> sp.school
                }

                actions.add(
                    ResolvedAttackAction(
                        id = sp.id,
                        name = sp.name,
                        actionCategory = if (sp.level == 0) "cantrip" else "spell",
                        castingTime = sp.castingTime,
                        range = sp.range,
                        isProficient = true,
                        attackAbility = spellAbilName,
                        toHitBonus = if (actType == "attack") spellToHit else null,
                        saveAbility = mech?.saveAbility,
                        saveDC = if (mech?.saveAbility != null) spellDc else null,
                        saveHalfDamage = mech?.saveHalfDamage ?: (isEvoker && wizardLvl >= 3 && sp.level == 0),
                        baseDamageDice = scaledDice,
                        damageBonus = totalSpellDmgBonus,
                        damageType = firstDmg?.type,
                        healingDice = mech?.healing?.dice,
                        healingBonus = totalSpellHealBonus,
                        spellLevel = sp.level,
                        isConcentration = sp.isConcentration,
                        isRitual = sp.isRitual,
                        eligibleRiders = eligibleRiders,
                        activeTriggers = spellTriggers,
                        freeCastAvailable = freeCastAvail,
                        grantSlotId = grantSlot?.slotId,
                        breakdown = breakdownStr
                    )
                )
            }
        }

        return actions.toTypedArray()
    }
}
