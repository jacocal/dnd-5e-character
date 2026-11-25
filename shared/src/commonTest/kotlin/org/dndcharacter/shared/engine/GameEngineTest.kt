package org.dndcharacter.shared.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue
import org.dndcharacter.shared.model.*

class GameEngineTest {

    private fun sampleCatalog(): RulesCatalog {
        val rogueClass = RuleClass(
            id = "rogue",
            name = "Rogue",
            hitDie = 8,
            savingThrows = arrayOf("DEX", "INT"),
            armorProficiencies = arrayOf("Light"),
            weaponProficiencies = arrayOf("Simple", "Martial"),
            combatRiders = arrayOf(
                CombatRider(
                    id = "rider-sneak-attack",
                    name = "Sneak Attack",
                    diceFormula = "sneak_attack_d6",
                    damageType = "weapon",
                    appliesTo = "finesse_or_ranged_damage"
                )
            )
        )
        val clericClass = RuleClass(
            id = "cleric",
            name = "Cleric",
            hitDie = 8,
            savingThrows = arrayOf("WIS", "CHA"),
            spellcastingAbility = "WIS",
            spellcastingType = "full",
            spellPrepMode = "prepared_class_list",
            armorProficiencies = arrayOf("Light", "Medium", "Shields"),
            weaponProficiencies = arrayOf("Simple")
        )
        val lifeSubclass = Subclass(
            id = "cleric-life",
            classId = "cleric",
            name = "Life Domain",
            description = "Healer domain",
            grantedSpells = mapOf("3" to arrayOf("bless", "cure-wounds"))
        )
        val rapier = Item(
            id = "rapier",
            name = "Rapier",
            type = "Martial Melee Weapon",
            category = "weapon",
            slot = "main_hand",
            damageDice = "1d8",
            damageType = "piercing",
            weaponMastery = "Vex",
            properties = arrayOf("finesse"),
            tags = arrayOf("weapon:martial", "weapon:melee")
        )
        val blessSpell = Spell(
            id = "bless",
            name = "Bless",
            level = 1,
            school = "Enchantment",
            isConcentration = true,
            classes = arrayOf("cleric", "paladin"),
            mechanics = SpellMechanics(
                actionType = "buff",
                rider = CombatRider(
                    id = "spell-bless",
                    name = "Bless (+1d4)",
                    dice = "1d4",
                    appliesTo = "attack_and_save"
                )
            )
        )
        val cureWoundsSpell = Spell(
            id = "cure-wounds",
            name = "Cure Wounds",
            level = 1,
            school = "Abjuration",
            classes = arrayOf("cleric", "druid", "bard"),
            mechanics = SpellMechanics(
                actionType = "heal",
                healing = SpellHealingPart(dice = "2d8", addSpellMod = true),
                upcast = SpellUpcastRule(perSlotLevel = 1, bonusDice = "2d8")
            )
        )
        val drowTrait = RuleTrait(
            id = "drow-lineage",
            name = "Drow Lineage",
            description = "Superior darkvision & innate magic",
            race = "elf-drow",
            modifiers = arrayOf(Modifier(type = "set", target = "darkvision", value = 120))
        )

        return RulesCatalog(
            classes = arrayOf(rogueClass, clericClass),
            subclasses = arrayOf(lifeSubclass),
            items = arrayOf(rapier),
            spells = arrayOf(blessSpell, cureWoundsSpell),
            traits = arrayOf(drowTrait)
        )
    }

    @Test
    fun testAutoGrantedSubclassSpellsAndEffectiveStats() {
        val catalog = sampleCatalog()
        val char = Character(
            id = 1,
            name = "Lyra",
            raceId = "elf-drow",
            level = 3,
            str = 10,
            dex = 18, // +4
            con = 14, // +2
            int = 12, // +1
            wis = 16, // +3
            cha = 10,
            hpCurrent = 24,
            hpMax = 24,
            classes = arrayOf(
                CharacterClass(characterId = 1, classId = "cleric", subclassId = "cleric-life", level = 3, hitDie = 8)
            ),
            traits = arrayOf(CharacterTrait(id = "drow-lineage", name = "Drow Lineage", description = "")),
            inventory = arrayOf(
                CharacterInventoryItem(id = 10, characterId = 1, itemId = "rapier", quantity = 1, equipped = true)
            )
        )

        val sheet = GameEngine.resolve(char, catalog)

        // Subclass level 3 spells ("bless", "cure-wounds") should be auto-granted and alwaysPrepared
        val knownIds = sheet.knownSpells.map { it.spell.id }.toSet()
        assertTrue(knownIds.contains("bless"), "Life Cleric Lvl 3 should auto-receive Bless")
        assertTrue(knownIds.contains("cure-wounds"), "Life Cleric Lvl 3 should auto-receive Cure Wounds")
        assertTrue(sheet.knownSpells.all { it.alwaysPrepared && it.prepared })

        // Darkvision from drow-lineage should be 120 ft
        assertEquals(120, sheet.combatStats.darkvision)
    }

    @Test
    fun testPhysicalDiceAndMultiRiderWeaponAttack() {
        val catalog = sampleCatalog()
        val char = Character(
            id = 2,
            name = "Vax",
            raceId = "elf-drow",
            level = 3,
            str = 10,
            dex = 18, // +4 mod
            con = 14,
            int = 12,
            wis = 14,
            cha = 12,
            hpCurrent = 24,
            hpMax = 24,
            classes = arrayOf(
                CharacterClass(characterId = 2, classId = "rogue", level = 3, hitDie = 8) // Sneak attack = 2d6
            ),
            inventory = arrayOf(
                CharacterInventoryItem(id = 1, characterId = 2, itemId = "rapier", quantity = 1, equipped = true)
            )
        )

        // Physical Roll: d20 = 15, Rapier 1d8 = [7], Sneak Attack 2d6 = [5, 6]
        val rollReq = RollRequest(
            rollType = "weapon_attack",
            targetId = "rapier",
            diceMode = "PHYSICAL",
            advantageMode = "NORMAL",
            physicalD20Rolls = arrayOf(15),
            physicalDamageRolls = arrayOf(7, 5, 6),
            selectedRiderIds = arrayOf("rider-sneak-attack"),
            targetAcOrDc = 18
        )

        val res = GameEngine.dispatch(char, catalog, GameCommandPayload(type = "EXECUTE_ROLL", rollRequest = rollReq))
        val outcome = res.lastRollOutcome
        assertNotNull(outcome)
        // To Hit: 15 (physical d20) + 4 (DEX) + 2 (PB) = 21 vs AC 18 -> Hit!
        assertEquals(21, outcome.totalD20Result)
        assertEquals(true, outcome.isSuccess)
        // Damage: Rapier (7 + 4 DEX = 11) + Sneak Attack (5 + 6 = 11) = 22 total
        assertEquals(22, outcome.totalDamage)
        assertEquals(2, outcome.damageParts.size)
    }

    @Test
    fun test2024HalfCasterLevel1AndMulticlassSpellSlots() {
        val catalog = RulesCatalog(
            classes = arrayOf(
                RuleClass(id = "paladin", name = "Paladin", hitDie = 10, savingThrows = arrayOf("WIS", "CHA"), spellcastingAbility = "CHA", spellcastingType = "half", spellPrepMode = "prepared_class_list"),
                RuleClass(id = "ranger", name = "Ranger", hitDie = 10, savingThrows = arrayOf("STR", "DEX"), spellcastingAbility = "WIS", spellcastingType = "half", spellPrepMode = "prepared_class_list")
            )
        )
        val lv1Paladin = Character(
            id = 10, name = "Uther", raceId = "human", level = 1,
            hpCurrent = 12, hpMax = 12,
            classes = arrayOf(CharacterClass(characterId = 10, classId = "paladin", level = 1, hitDie = 10))
        )
        val sheet = GameEngine.resolve(lv1Paladin, catalog)
        // 2024 PHB: Level 1 Paladin gets 2 Level 1 spell slots (ECL = ceil(1/2) = 1)
        assertEquals(1, sheet.spellSlots.casterLevel)
        assertEquals(2, sheet.spellSlots.slots[1])
    }

    @Test
    fun test2024ArmorClassRulesDraconicDanceMonkShield() {
        val catalog = RulesCatalog(
            classes = arrayOf(
                RuleClass(id = "sorcerer", name = "Sorcerer", hitDie = 6, savingThrows = arrayOf("CON", "CHA")),
                RuleClass(id = "bard", name = "Bard", hitDie = 8, savingThrows = arrayOf("DEX", "CHA")),
                RuleClass(id = "monk", name = "Monk", hitDie = 8, savingThrows = arrayOf("STR", "DEX"))
            ),
            items = arrayOf(
                Item(id = "shield", name = "Shield", type = "Shield", category = "armor", slot = "off_hand", armorClass = 2, tags = arrayOf("armor:shield")),
                Item(id = "dagger", name = "Dagger", type = "Simple Melee Weapon", category = "weapon", slot = "off_hand", damageDice = "1d4", properties = arrayOf("light", "finesse"))
            )
        )
        // 1. Draconic Sorcery (2024): 10 + DEX (+2) + CHA (+4) = 16
        val draconic = Character(
            id = 11, name = "Ignis", raceId = "human", level = 3, dex = 14, cha = 18, hpCurrent = 20, hpMax = 20,
            classes = arrayOf(CharacterClass(characterId = 11, classId = "sorcerer", subclassId = "sorcerer-draconic", level = 3, hitDie = 6))
        )
        assertEquals(16, GameEngine.resolve(draconic, catalog).combatStats.armorClass)

        // 2. College of Dance Bard (2024): 10 + DEX (+3) + CHA (+4) = 17, and off-hand Dagger must NOT grant +2 shield AC
        val dancer = Character(
            id = 12, name = "Sera", raceId = "human", level = 3, dex = 16, cha = 18, hpCurrent = 24, hpMax = 24,
            classes = arrayOf(CharacterClass(characterId = 12, classId = "bard", subclassId = "bard-dance", level = 3, hitDie = 8)),
            inventory = arrayOf(CharacterInventoryItem(id = 1, characterId = 12, itemId = "dagger", equipped = true))
        )
        assertEquals(17, GameEngine.resolve(dancer, catalog).combatStats.armorClass)

        // 3. Monk wielding a Shield loses Unarmored Defense (falls back to 10 + DEX + 2 Shield = 15, NOT 10 + DEX + WIS + 2 = 19)
        val shieldedMonk = Character(
            id = 13, name = "Kensai", raceId = "human", level = 3, dex = 16, wis = 18, hpCurrent = 24, hpMax = 24,
            classes = arrayOf(CharacterClass(characterId = 13, classId = "monk", level = 3, hitDie = 8)),
            inventory = arrayOf(CharacterInventoryItem(id = 1, characterId = 13, itemId = "shield", equipped = true))
        )
        assertEquals(15, GameEngine.resolve(shieldedMonk, catalog).combatStats.armorClass)
    }

    @Test
    fun test2024WeaponProficienciesAndThirdCasterSpellsAndHighElf() {
        val catalog = RulesCatalog(
            classes = arrayOf(
                RuleClass(id = "monk", name = "Monk", hitDie = 8, savingThrows = arrayOf("STR", "DEX"), weaponProficiencies = arrayOf("Simple", "Martial (Light)")),
                RuleClass(id = "fighter", name = "Fighter", hitDie = 10, savingThrows = arrayOf("STR", "CON"), weaponProficiencies = arrayOf("Simple", "Martial"))
            ),
            subclasses = arrayOf(
                Subclass(id = "fighter-eldritch", classId = "fighter", name = "Eldritch Knight", description = "", spellcastingType = "third")
            ),
            items = arrayOf(
                Item(id = "greatsword", name = "Greatsword", type = "Martial Melee Weapon", category = "weapon", damageDice = "2d6", properties = arrayOf("heavy", "two-handed"), tags = arrayOf("weapon:martial", "weapon:melee")),
                Item(id = "shortsword", name = "Shortsword", type = "Martial Melee Weapon", category = "weapon", damageDice = "1d6", properties = arrayOf("finesse", "light"), tags = arrayOf("weapon:martial", "weapon:melee"))
            ),
            spells = arrayOf(
                Spell(id = "fire-bolt", name = "Fire Bolt", level = 0, school = "Evocation", classes = arrayOf("wizard")),
                Spell(id = "shield", name = "Shield", level = 1, school = "Abjuration", classes = arrayOf("wizard"))
            )
        )
        // Monk is proficient with Shortsword (Martial Light), NOT Greatsword (Martial Heavy)
        val monk = Character(
            id = 14, name = "Li", raceId = "elf-high", level = 3, hpCurrent = 24, hpMax = 24,
            classes = arrayOf(CharacterClass(characterId = 14, classId = "monk", level = 3, hitDie = 8)),
            inventory = arrayOf(
                CharacterInventoryItem(id = 1, characterId = 14, itemId = "greatsword", equipped = false),
                CharacterInventoryItem(id = 2, characterId = 14, itemId = "shortsword", equipped = true)
            )
        )
        val monkSheet = GameEngine.resolve(monk, catalog)
        assertEquals(false, monkSheet.inventoryItems.find { it.item.id == "greatsword" }?.isProficient)
        assertEquals(true, monkSheet.inventoryItems.find { it.item.id == "shortsword" }?.isProficient)
        // High Elf ("elf-high") should expose its swappable Wizard cantrip slot!
        assertTrue(monkSheet.spellGrantSlots.any { it.slotId == "species:high-elf:cantrip:1" })

        // Eldritch Knight should see Wizard spells in availableClassSpells
        val ek = Character(
            id = 15, name = "Aldric", raceId = "human", level = 3, int = 16, hpCurrent = 28, hpMax = 28,
            classes = arrayOf(CharacterClass(characterId = 15, classId = "fighter", subclassId = "fighter-eldritch", level = 3, hitDie = 10))
        )
        val ekSheet = GameEngine.resolve(ek, catalog)
        assertTrue(ekSheet.availableClassSpells.any { it.id == "shield" })
    }

    @Test
    fun test2024ConditionsResistancesExhaustionAndAttunementCap() {
        val catalog = RulesCatalog(
            classes = arrayOf(
                RuleClass(id = "bard", name = "Bard", hitDie = 8, savingThrows = arrayOf("DEX", "CHA"), spellcastingAbility = "CHA", spellcastingType = "full")
            ),
            spells = arrayOf(
                Spell(id = "bless", name = "Bless", level = 1, school = "Enchantment", isConcentration = true, classes = arrayOf("bard"))
            ),
            items = (1..4).map { idx ->
                Item(id = "ring-$idx", name = "Ring $idx", type = "Ring", category = "magic_item", requiresAttunement = true, isMagical = true)
            }.toTypedArray()
        )
        val tiefling = Character(
            id = 16, name = "Nyx", raceId = "tiefling-abyssal", level = 4, dex = 14, cha = 16,
            hpCurrent = 30, hpMax = 30, exhaustion = 2,
            classes = arrayOf(CharacterClass(characterId = 16, classId = "bard", level = 4, hitDie = 8)),
            spells = arrayOf(CharacterSpell(characterId = 16, spellId = "bless", prepared = true, isConcentrating = true)),
            inventory = (1..4).map { idx ->
                CharacterInventoryItem(id = idx, characterId = 16, itemId = "ring-$idx", equipped = true, isAttuned = idx <= 3)
            }.toTypedArray()
        )
        val sheet = GameEngine.resolve(tiefling, catalog)
        // Initiative: DEX (+2) + Jack of All Trades (PB 2 / 2 = +1) - Exhaustion (2 * 2 = -4) = -1
        assertEquals(-1, sheet.combatStats.initiative)

        // Tiefling (Abyssal) has Poison resistance (halves 10 -> 5), NOT Fire resistance (takes full 10)
        val poisonRes = GameEngine.dispatch(tiefling, catalog, GameCommandPayload(type = "TAKE_DAMAGE", amount = 10, damageType = "poison"))
        assertEquals(25, poisonRes.character.hpCurrent)
        val fireRes = GameEngine.dispatch(tiefling, catalog, GameCommandPayload(type = "TAKE_DAMAGE", amount = 10, damageType = "fire"))
        assertEquals(20, fireRes.character.hpCurrent)

        // Applying Incapacitated immediately drops Concentration!
        val incapRes = GameEngine.dispatch(tiefling, catalog, GameCommandPayload(type = "TOGGLE_CONDITION", targetId = "incapacitated"))
        assertEquals(null, incapRes.sheet.concentrationSpellName)

        // Attuning a 4th magic item is blocked by the max-3 attunement limit
        val attuneRes = GameEngine.dispatch(tiefling, catalog, GameCommandPayload(type = "UPDATE_ITEM_STATE", intValue = 4, boolValue2 = true))
        assertEquals(false, attuneRes.character.inventory?.find { it.id == 4 }?.isAttuned)
    }

    @Test
    fun testRolledHpPersistenceAndEpicBoonCap() {
        val catalog = RulesCatalog(
            classes = arrayOf(
                RuleClass(id = "fighter", name = "Fighter", hitDie = 10, savingThrows = arrayOf("STR", "CON"))
            ),
            feats = arrayOf(
                RuleFeat(id = "boon-combat-prowess", name = "Boon of Combat Prowess", category = "epic_boon", description = "Epic Boon")
            )
        )
        val fighter = Character(
            id = 20, name = "Garrick", raceId = "human", level = 1,
            str = 20, con = 14, // +2 CON -> Lv 1 HP = 10 + 2 = 12
            hpCurrent = 12, hpMax = 12,
            classes = arrayOf(CharacterClass(characterId = 20, classId = "fighter", level = 1, hitDie = 10))
        )
        // Level up to 2 with a manual rolled die of 10 (+2 CON = +12 HP -> 24 HP total, NOT overwritten by average 20!)
        val leveled = GameEngine.dispatch(
            fighter,
            catalog,
            GameCommandPayload(
                type = "LEVEL_UP",
                levelUpData = LevelUpData(
                    characterId = 20,
                    classId = "fighter",
                    hpIncrease = 12,
                    hpMode = "manual",
                    featId = "boon-combat-prowess",
                    asi = AbilityScoreImprovement(str = 1)
                )
            )
        )
        assertEquals(24, leveled.character.hpMax)
        assertEquals(1, leveled.character.hpRolls.size)
        assertEquals(10, leveled.character.hpRolls[0].rolled)
        // Epic Boon raises STR past 20 to 21!
        assertEquals(21, leveled.character.str)

        // Repeated resolve() calls with Aid (+5 hp_max) must NOT compound hpMax
        val withAid = leveled.character.copy(
            activeModifiers = arrayOf(
                ActiveModifier(sourceId = "aid", sourceName = "Aid", modifier = Modifier(type = "bonus", target = "hp_max", value = 5), expiresOn = "long_rest")
            )
        )
        val r1 = GameEngine.resolve(withAid, catalog)
        val r2 = GameEngine.resolve(r1.character, catalog)
        assertEquals(29, r1.character.hpMax)
        assertEquals(29, r2.character.hpMax)
    }

    @Test
    fun testDamageDefenseToggleAndMulticlassHitDieSelection() {
        val catalog = RulesCatalog(
            classes = arrayOf(
                RuleClass(id = "fighter", name = "Fighter", hitDie = 10, savingThrows = arrayOf("STR", "CON")),
                RuleClass(id = "wizard", name = "Wizard", hitDie = 6, savingThrows = arrayOf("INT", "WIS"))
            )
        )
        val multi = Character(
            id = 21, name = "Kael", raceId = "human", level = 3,
            con = 12, // +1 CON
            hpCurrent = 10, hpMax = 25,
            hitDiceCurrent = 3, hitDiceMax = 3,
            classes = arrayOf(
                CharacterClass(characterId = 21, classId = "fighter", level = 2, hitDie = 10, hitDiceUsed = 0),
                CharacterClass(characterId = 21, classId = "wizard", level = 1, hitDie = 6, hitDiceUsed = 0)
            )
        )

        // Toggle fire immunity, verify 12 fire damage deals 0
        val withImm = GameEngine.dispatch(multi, catalog, GameCommandPayload(type = "TOGGLE_DAMAGE_DEFENSE", targetId = "fire", textValue = "immunity"))
        assertTrue(withImm.character.immunities.contains("fire"))
        val fireHit = GameEngine.dispatch(withImm.character, catalog, GameCommandPayload(type = "TAKE_DAMAGE", amount = 12, damageType = "fire"))
        assertEquals(10, fireHit.character.hpCurrent)

        // Toggle cold vulnerability, verify 4 cold damage deals 8
        val withVuln = GameEngine.dispatch(fireHit.character, catalog, GameCommandPayload(type = "TOGGLE_DAMAGE_DEFENSE", targetId = "cold", textValue = "vulnerability"))
        val coldHit = GameEngine.dispatch(withVuln.character, catalog, GameCommandPayload(type = "TAKE_DAMAGE", amount = 4, damageType = "cold"))
        assertEquals(2, coldHit.character.hpCurrent)

        // Spend specifically the Wizard Hit Die (targetId = "wizard", manual roll 5 + 1 CON = +6 HP)
        val spent = GameEngine.dispatch(coldHit.character, catalog, GameCommandPayload(type = "SPEND_HIT_DIE", targetId = "wizard", amount = 5))
        assertEquals(8, spent.character.hpCurrent)
        assertEquals(2, spent.character.hitDiceCurrent)
        assertEquals(0, spent.character.classes?.find { it.classId == "fighter" }?.hitDiceUsed)
        assertEquals(1, spent.character.classes?.find { it.classId == "wizard" }?.hitDiceUsed)
    }
}
