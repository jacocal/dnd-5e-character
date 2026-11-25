@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.engine

import kotlin.js.JsExport
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min
import kotlin.random.Random
import org.dndcharacter.shared.model.*

/**
 * Deterministic & Physical/Simulated Dice Resolver for D&D 5e (2024).
 * Supports multi-skill/rider stacking, critical hit dice doubling,
 * advantage/disadvantage, upcast scaling, cantrip scaling, physical dice input,
 * and the full Causal Trigger Matrix (Feats, Class Features, Species Traits, 2024 Weapon Masteries).
 */
@JsExport
object RollResolver {

    data class DiceSpec(val count: Int, val sides: Int)

    fun parseDice(diceStr: String?): DiceSpec? {
        if (diceStr.isNullOrBlank()) return null
        val match = Regex("""(\d+)d(\d+)""").find(diceStr.trim().lowercase()) ?: return null
        val count = match.groupValues[1].toIntOrNull() ?: return null
        val sides = match.groupValues[2].toIntOrNull() ?: return null
        if (count <= 0 || sides <= 0) return null
        return DiceSpec(count, sides)
    }

    private fun rollDice(
        spec: DiceSpec,
        isCritical: Boolean,
        diceMode: String,
        physicalQueue: MutableList<Int>,
        rerollOnes: Boolean = false,
        triggeredEffects: MutableList<String>? = null,
        rerollSourceLabel: String? = null
    ): IntArray {
        val totalDice = if (isCritical) spec.count * 2 else spec.count
        val results = IntArray(totalDice)
        var rerolledCount = 0
        for (i in 0 until totalDice) {
            if (diceMode.equals("PHYSICAL", ignoreCase = true) && physicalQueue.isNotEmpty()) {
                val raw = physicalQueue.removeAt(0).coerceIn(1, spec.sides)
                results[i] = raw
            } else {
                var r = Random.nextInt(1, spec.sides + 1)
                if (rerollOnes && r == 1 && spec.sides > 1) {
                    r = Random.nextInt(1, spec.sides + 1)
                    rerolledCount++
                }
                results[i] = r
            }
        }
        if (rerolledCount > 0 && triggeredEffects != null && rerollSourceLabel != null) {
            triggeredEffects.add("$rerollSourceLabel: Automatically rerolled $rerolledCount die roll(s) of 1!")
        }
        return results
    }

    private fun rollD20(
        advantageMode: String,
        diceMode: String,
        physicalD20: Array<Int>,
        hasHalflingLucky: Boolean = false,
        triggeredEffects: MutableList<String>? = null
    ): Pair<Array<Int>, Int> {
        val needTwo = advantageMode.equals("ADVANTAGE", ignoreCase = true) ||
            advantageMode.equals("DISADVANTAGE", ignoreCase = true)

        fun rollSingle(physIdx: Int): Int {
            if (diceMode.equals("PHYSICAL", ignoreCase = true) && physicalD20.size > physIdx) {
                return physicalD20[physIdx].coerceIn(1, 20)
            }
            var r = Random.nextInt(1, 21)
            if (hasHalflingLucky && r == 1) {
                val reroll = Random.nextInt(1, 21)
                triggeredEffects?.add("Halfling Lucky (Species Trait): Natural 1 on d20 automatically rerolled to $reroll!")
                r = reroll
            }
            return r
        }

        val d1 = rollSingle(0)

        if (!needTwo) {
            return Pair(arrayOf(d1), d1)
        }

        if (diceMode.equals("PHYSICAL", ignoreCase = true) && physicalD20.size == 1) {
            return Pair(arrayOf(d1), d1)
        }

        val d2 = rollSingle(1)

        val chosen = if (advantageMode.equals("ADVANTAGE", ignoreCase = true)) {
            max(d1, d2)
        } else {
            min(d1, d2)
        }
        return Pair(arrayOf(d1, d2), chosen)
    }

    fun evaluateRiderDice(rider: CombatRider, char: Character): String? {
        if (!rider.dice.isNullOrBlank()) return rider.dice
        return when (rider.diceFormula) {
            "sneak_attack_d6" -> {
                val rogueLvl = char.classes?.find { it.classId == "rogue" }?.level ?: 1
                val count = ceil(rogueLvl / 2.0).toInt().coerceAtLeast(1)
                "${count}d6"
            }
            "martial_arts_die" -> {
                val monkLvl = char.classes?.find { it.classId == "monk" }?.level ?: 1
                val sides = when {
                    monkLvl >= 17 -> 12
                    monkLvl >= 11 -> 10
                    monkLvl >= 5 -> 8
                    else -> 6
                }
                "1d$sides"
            }
            "bardic_die" -> {
                val bardLvl = char.classes?.find { it.classId == "bard" }?.level ?: 1
                val sides = when {
                    bardLvl >= 15 -> 12
                    bardLvl >= 10 -> 10
                    bardLvl >= 5 -> 8
                    else -> 6
                }
                "1d$sides"
            }
            else -> null
        }
    }

    fun evaluateRiderFlatBonus(rider: CombatRider, sheet: ResolvedCharacterSheet): Int {
        val char = sheet.character
        val pb = sheet.combatStats.proficiencyBonus
        val getMod = { ab: String ->
            sheet.abilityScores.find { it.ability.equals(ab, ignoreCase = true) }?.modifier ?: 0
        }
        return when (rider.formula) {
            "rage_damage" -> {
                val barbLvl = char.classes?.find { it.classId == "barbarian" }?.level ?: 1
                when {
                    barbLvl >= 16 -> 4
                    barbLvl >= 9 -> 3
                    else -> 2
                }
            }
            "proficiency" -> pb
            "half_class_level" -> {
                val lvl = char.classes?.maxOfOrNull { it.level } ?: char.level
                max(1, lvl / 2)
            }
            "class_level" -> {
                char.classes?.maxOfOrNull { it.level } ?: char.level
            }
            "str_mod" -> max(1, getMod("str"))
            "dex_mod" -> max(1, getMod("dex"))
            "con_mod" -> max(1, getMod("con"))
            "int_mod" -> max(1, getMod("int"))
            "wis_mod" -> max(1, getMod("wis"))
            "cha_mod" -> max(1, getMod("cha"))
            else -> 0
        }
    }

    fun executeRoll(sheet: ResolvedCharacterSheet, request: RollRequest): RollOutcome {
        val char = sheet.character
        val physicalQueue = request.physicalDamageRolls.toMutableList()
        val selectedRiders = sheet.availableRiders.filter { request.selectedRiderIds.contains(it.id) }
        val triggeredEffects = mutableListOf<String>()

        // Detect character traits, feats, and class features for causal triggers
        val hasHalflingLucky = char.raceId.startsWith("halfling", ignoreCase = true) ||
            (char.traits?.any { it.id.contains("lucky", ignoreCase = true) || it.name.equals("Lucky", ignoreCase = true) } == true)
        val rogueLevel = char.classes?.find { it.classId == "rogue" }?.level ?: 0
        val hasReliableTalent = rogueLevel >= 7
        val fighterCls = char.classes?.find { it.classId == "fighter" }
        val isChampion = fighterCls?.subclassId?.contains("champion", ignoreCase = true) == true
        val critThreshold = when {
            isChampion && (fighterCls?.level ?: 0) >= 15 -> 18
            isChampion && (fighterCls?.level ?: 0) >= 3 -> 19
            else -> 20
        }
        val hasSavageAttacker = char.feats?.any { it.id == "savage-attacker" } == true ||
            selectedRiders.any { it.id == "savage-attacker" || it.id == "savage_attacker" }
        val hasTavernBrawler = char.feats?.any { it.id == "tavern-brawler" } == true
        val hasHealerFeat = char.feats?.any { it.id == "healer" } == true
        val hasGwmFeat = char.feats?.any { it.id == "great-weapon-master" } == true
        val isLifeCleric = char.classes?.any {
            it.classId == "cleric" && it.level >= 3 && (it.subclassId?.contains("life", ignoreCase = true) == true)
        } == true

        // Check if any selected rider grants advantage
        val effectiveAdvantage = when {
            request.advantageMode != "NORMAL" -> request.advantageMode
            selectedRiders.any { it.grantsAdvantage } -> {
                val advRider = selectedRiders.first { it.grantsAdvantage }
                triggeredEffects.add("${advRider.name}: Granted Advantage on d20 roll!")
                "ADVANTAGE"
            }
            else -> "NORMAL"
        }

        // Roll check-bonus riders (e.g., Bless +1d4, Guidance +1d4, Bardic Inspiration)
        var riderD20Bonus = 0
        val riderD20Strings = mutableListOf<String>()
        for (rider in selectedRiders) {
            if (rider.appliesTo in listOf("attack_roll", "attack_and_save", "skill", "save", "d20_test")) {
                val diceStr = evaluateRiderDice(rider, char)
                val spec = parseDice(diceStr)
                val flat = evaluateRiderFlatBonus(rider, sheet)
                var partSum = flat
                if (spec != null) {
                    val rolled = rollDice(spec, isCritical = false, request.diceMode, physicalQueue)
                    partSum += rolled.sum()
                    riderD20Strings.add("${rider.name} [${rolled.joinToString("+")}]")
                } else if (flat != 0) {
                    riderD20Strings.add("${rider.name} (${if (flat >= 0) "+$flat" else "$flat"})")
                }
                riderD20Bonus += partSum
            }
        }

        when (request.rollType.lowercase()) {
            "skill" -> {
                val skill = sheet.skills.find {
                    it.key.equals(request.targetId, ignoreCase = true) ||
                        it.name.equals(request.targetId, ignoreCase = true)
                }
                val mod = skill?.total ?: 0
                val title = "${skill?.name ?: request.targetId} Check"
                val adv = if (request.advantageMode != "NORMAL") request.advantageMode else (skill?.advantageState ?: effectiveAdvantage)
                val (d20Rolls, rawChosenD20) = rollD20(adv, request.diceMode, request.physicalD20Rolls, hasHalflingLucky, triggeredEffects)

                val chosenD20 = if (hasReliableTalent && (skill?.isProficient == true || skill?.isExpertise == true) && rawChosenD20 <= 9) {
                    triggeredEffects.add("Reliable Talent (Rogue Lv 7+): Proficient d20 roll of $rawChosenD20 treated as 10!")
                    10
                } else {
                    rawChosenD20
                }

                val total = chosenD20 + mod + riderD20Bonus
                val success = request.targetAcOrDc?.let { total >= it }
                val riderSuffix = if (riderD20Strings.isNotEmpty()) " + " + riderD20Strings.joinToString(" + ") else ""
                val formula = "d20($chosenD20) ${if (mod >= 0) "+ $mod" else "- ${-mod}"}$riderSuffix = $total"
                val dcText = request.targetAcOrDc?.let { " vs DC $it (${if (success == true) "SUCCESS" else "FAILURE"})" } ?: ""
                return RollOutcome(
                    rollType = "skill",
                    targetId = request.targetId,
                    title = title,
                    diceMode = request.diceMode,
                    advantageMode = adv,
                    d20Rolls = d20Rolls,
                    chosenD20 = chosenD20,
                    isCriticalHit = chosenD20 == 20,
                    isCriticalFail = rawChosenD20 == 1 && chosenD20 == 1,
                    toHitOrCheckModifier = mod,
                    riderCheckDiceTotal = riderD20Bonus,
                    totalD20Result = total,
                    targetAcOrDc = request.targetAcOrDc,
                    isSuccess = success,
                    triggeredEffects = triggeredEffects.toTypedArray(),
                    detailedFormula = formula,
                    summary = "$title: $total ($formula)$dcText"
                )
            }

            "saving_throw", "concentration_save" -> {
                val isConc = request.rollType.equals("concentration_save", ignoreCase = true)
                val targetAb = if (isConc) "con" else request.targetId.lowercase()
                val save = sheet.savingThrows.find { it.ability.equals(targetAb, ignoreCase = true) }
                val mod = save?.total ?: 0
                val title = if (isConc) "Concentration Saving Throw (CON)" else "${targetAb.uppercase()} Saving Throw"
                val hasWarCaster = isConc && (char.feats?.any { it.id.equals("war-caster", ignoreCase = true) } == true)
                val hasEldritchMind = isConc && (char.proficiencies?.featureChoices?.values?.any { it == "inv-eldritch-mind" } == true)
                val adv = when {
                    request.advantageMode != "NORMAL" -> request.advantageMode
                    hasWarCaster -> {
                        triggeredEffects.add("War Caster (Feat): Automatic Advantage on Concentration Saving Throw!")
                        "ADVANTAGE"
                    }
                    hasEldritchMind -> {
                        triggeredEffects.add("Eldritch Mind (Invocation): Automatic Advantage on Concentration Saving Throw!")
                        "ADVANTAGE"
                    }
                    else -> save?.advantageState ?: effectiveAdvantage
                }

                if (save?.advantageState == "ADVANTAGE" && request.advantageMode == "NORMAL") {
                    if (char.raceId.startsWith("gnome", ignoreCase = true) && targetAb in listOf("int", "wis", "cha")) {
                        triggeredEffects.add("Gnomish Cunning (Species Trait): Automatic Advantage on ${targetAb.uppercase()} Saving Throw!")
                    }
                }
                val paladinLvl = char.classes?.find { it.classId == "paladin" }?.level ?: 0
                if (paladinLvl >= 6) {
                    val chaMod = max(1, sheet.abilityScores.find { it.ability == "cha" }?.modifier ?: 1)
                    triggeredEffects.add("Aura of Protection (Paladin Lv 6+): +$chaMod bonus included in Saving Throw!")
                }

                val (d20Rolls, chosenD20) = rollD20(adv, request.diceMode, request.physicalD20Rolls, hasHalflingLucky, triggeredEffects)
                val total = if (save?.autoFail == true) 0 else (chosenD20 + mod + riderD20Bonus)
                val dc = request.targetAcOrDc ?: (if (isConc) 10 else null)
                val success = if (save?.autoFail == true) false else dc?.let { total >= it }
                val riderSuffix = if (riderD20Strings.isNotEmpty()) " + " + riderD20Strings.joinToString(" + ") else ""
                val formula = if (save?.autoFail == true) "AUTO-FAIL (Condition)" else "d20($chosenD20) ${if (mod >= 0) "+ $mod" else "- ${-mod}"}$riderSuffix = $total"
                val dcText = dc?.let { " vs DC $it (${if (success == true) "SUCCESS" else "FAILURE"})" } ?: ""
                return RollOutcome(
                    rollType = request.rollType,
                    targetId = targetAb,
                    title = title,
                    diceMode = request.diceMode,
                    advantageMode = adv,
                    d20Rolls = d20Rolls,
                    chosenD20 = chosenD20,
                    isCriticalHit = chosenD20 == 20,
                    isCriticalFail = chosenD20 == 1 || save?.autoFail == true,
                    toHitOrCheckModifier = mod,
                    riderCheckDiceTotal = riderD20Bonus,
                    totalD20Result = total,
                    targetAcOrDc = dc,
                    isSuccess = success,
                    triggeredEffects = triggeredEffects.toTypedArray(),
                    detailedFormula = formula,
                    summary = "$title: $total ($formula)$dcText"
                )
            }

            "ability_check", "initiative" -> {
                val isInit = request.rollType.equals("initiative", ignoreCase = true)
                val ab = if (isInit) "dex" else request.targetId.lowercase()
                val hasJackOfAllTrades = (char.classes?.find { it.classId == "bard" }?.level ?: 0) >= 2
                val exhPenalty = char.exhaustion * 2 // 2024 PHB: Exhaustion reduces all D20 Tests including Ability Checks & Initiative
                val mod = if (isInit) {
                    sheet.combatStats.initiative // Already includes Jack of All Trades & Exhaustion penalty from GameEngine.resolve
                } else {
                    val baseAbilMod = sheet.abilityScores.find { it.ability.equals(ab, ignoreCase = true) }?.modifier ?: 0
                    baseAbilMod + (if (hasJackOfAllTrades) sheet.combatStats.proficiencyBonus / 2 else 0) - exhPenalty
                }
                if (isInit && char.feats?.any { it.id == "alert" } == true) {
                    triggeredEffects.add("Alert (Origin Feat): +${sheet.combatStats.proficiencyBonus} Proficiency Bonus added to Initiative!")
                }
                // 2024 PHB Initiative Conditions: Invisible -> Advantage; Incapacitated / Surprised -> Disadvantage
                val activeCondIds = sheet.activeConditions.map { it.condition.id.lowercase() }.toSet()
                val isInvisible = activeCondIds.contains("invisible")
                val isSurprisedOrIncap = activeCondIds.any { it in setOf("surprised", "incapacitated", "paralyzed", "stunned", "unconscious", "petrified") }
                val checkAdv = when {
                    request.advantageMode != "NORMAL" -> request.advantageMode
                    isInit && isInvisible && !isSurprisedOrIncap -> {
                        triggeredEffects.add("Invisible (2024 PHB): Advantage on Initiative roll!")
                        "ADVANTAGE"
                    }
                    isInit && isSurprisedOrIncap && !isInvisible -> {
                        triggeredEffects.add("Surprised / Incapacitated (2024 PHB): Disadvantage on Initiative roll!")
                        "DISADVANTAGE"
                    }
                    else -> effectiveAdvantage
                }
                val title = if (isInit) "Initiative Roll" else "${ab.uppercase()} Ability Check"
                val (d20Rolls, chosenD20) = rollD20(checkAdv, request.diceMode, request.physicalD20Rolls, hasHalflingLucky, triggeredEffects)
                val total = chosenD20 + mod + riderD20Bonus
                val success = request.targetAcOrDc?.let { total >= it }
                val formula = "d20($chosenD20) ${if (mod >= 0) "+ $mod" else "- ${-mod}"} = $total"
                return RollOutcome(
                    rollType = request.rollType,
                    targetId = request.targetId,
                    title = title,
                    diceMode = request.diceMode,
                    advantageMode = checkAdv,
                    d20Rolls = d20Rolls,
                    chosenD20 = chosenD20,
                    isCriticalHit = chosenD20 == 20,
                    isCriticalFail = chosenD20 == 1,
                    toHitOrCheckModifier = mod,
                    riderCheckDiceTotal = riderD20Bonus,
                    totalD20Result = total,
                    targetAcOrDc = request.targetAcOrDc,
                    isSuccess = success,
                    triggeredEffects = triggeredEffects.toTypedArray(),
                    detailedFormula = formula,
                    summary = "$title: $total ($formula)"
                )
            }

            "weapon_attack" -> {
                val action = sheet.actions.find { it.id == request.targetId || it.name.equals(request.targetId, ignoreCase = true) }
                val title = action?.name ?: request.targetId
                val hitMod = action?.toHitBonus ?: 0
                val (d20Rolls, chosenD20) = rollD20(effectiveAdvantage, request.diceMode, request.physicalD20Rolls, hasHalflingLucky, triggeredEffects)
                val isCrit = chosenD20 >= critThreshold
                if (isCrit && chosenD20 < 20) {
                    triggeredEffects.add("Improved Critical (Champion Fighter): Scored Critical Hit on a $chosenD20!")
                }
                if (isCrit && hasGwmFeat) {
                    triggeredEffects.add("Great Weapon Master — Hew (Feat): Critical Hit! You can make 1 Melee Weapon Attack as a Bonus Action!")
                }
                val isFumble = chosenD20 == 1
                val totalAttack = chosenD20 + hitMod + riderD20Bonus
                val isHit = when {
                    isCrit -> true
                    isFumble -> false
                    request.targetAcOrDc != null -> totalAttack >= request.targetAcOrDc
                    else -> true
                }

                // Damage Roll (Weapon + Riders + Savage Attacker + Tavern Brawler + Weapon Masteries)
                val damageParts = mutableListOf<DamageBreakdownPart>()
                val baseDiceStr = if (request.useVersatileTwoHanded && !action?.versatileDamageDice.isNullOrBlank()) {
                    action?.versatileDamageDice
                } else {
                    action?.baseDamageDice ?: "1d6"
                }
                val baseSpec = parseDice(baseDiceStr) ?: DiceSpec(1, 6)
                val isUnarmed = action?.actionCategory == "unarmed" || action?.id == "unarmed-strike"
                val rerollOnes = isUnarmed && hasTavernBrawler

                val rawBaseRolls: Array<Int> = if (hasSavageAttacker && !isUnarmed && request.diceMode.equals("SIMULATED", ignoreCase = true)) {
                    val rollA = rollDice(baseSpec, isCrit, request.diceMode, physicalQueue)
                    val rollB = rollDice(baseSpec, isCrit, request.diceMode, physicalQueue)
                    val chosen = if (rollA.sum() >= rollB.sum()) rollA else rollB
                    triggeredEffects.add(
                        "Savage Attacker (Feat): Rolled [${rollA.joinToString("+")}] vs [${rollB.joinToString("+")}] → kept higher [${chosen.joinToString("+")}]!"
                    )
                    chosen.toTypedArray()
                } else {
                    rollDice(
                        baseSpec,
                        isCrit,
                        request.diceMode,
                        physicalQueue,
                        rerollOnes = rerollOnes,
                        triggeredEffects = triggeredEffects,
                        rerollSourceLabel = "Tavern Brawler (Feat)"
                    ).toTypedArray()
                }

                // Great Weapon Fighting (2024 Fighting Style): Treat any 1 or 2 on damage dice for a Two-Handed / Versatile (2H) melee weapon as a 3
                val hasGwfStyle = char.proficiencies?.featureChoices?.values?.any { it == "fs-gwf" } == true ||
                    char.feats?.any { it.id.contains("great-weapon-fighting", ignoreCase = true) } == true
                val isTwoHandedMelee = (action?.properties?.any { it.equals("two-handed", ignoreCase = true) } == true || request.useVersatileTwoHanded) &&
                    (action?.range?.contains("/") != true)
                var gwfUpgradedCount = 0
                val baseRolls: Array<Int> = if (hasGwfStyle && isTwoHandedMelee && baseSpec.sides >= 3) {
                    rawBaseRolls.map { r ->
                        if (r == 1 || r == 2) {
                            gwfUpgradedCount++
                            3
                        } else r
                    }.toTypedArray()
                } else rawBaseRolls
                if (gwfUpgradedCount > 0) {
                    triggeredEffects.add("Great Weapon Fighting (Fighting Style): Upgraded $gwfUpgradedCount die roll(s) of 1 or 2 to 3!")
                }

                val baseFlat = action?.damageBonus ?: 0
                val baseSubtotal = max(1, baseRolls.sum() + baseFlat)
                val baseDmgType = action?.damageType ?: "physical"

                val isRaging = sheet.activeConditions.any { it.condition.id.equals("raging", ignoreCase = true) } ||
                    (char.activeModifiers?.any { it.sourceId.equals("rage", ignoreCase = true) } == true)
                val isMeleeStr = action?.attackAbility == "STR" && (action.range.contains("/") != true)
                if (isRaging && isMeleeStr) {
                    val barbLvl = char.classes?.find { it.classId == "barbarian" }?.level ?: 1
                    val rageDmg = if (barbLvl >= 16) 4 else if (barbLvl >= 9) 3 else 2
                    triggeredEffects.add("Rage (Barbarian): +$rageDmg Rage damage automatically included in melee STR attack!")
                }
                if (hasGwmFeat && action?.properties?.any { it.equals("heavy", ignoreCase = true) } == true) {
                    triggeredEffects.add("Great Weapon Master (Feat): +${sheet.combatStats.proficiencyBonus} Proficiency Bonus included in Heavy weapon damage!")
                }

                damageParts.add(
                    DamageBreakdownPart(
                        source = title + (if (request.useVersatileTwoHanded) " (2H)" else ""),
                        diceFormula = "${if (isCrit) "${baseSpec.count * 2}d${baseSpec.sides}" else baseDiceStr ?: "1d6"}${if (baseFlat != 0) (if (baseFlat > 0) "+$baseFlat" else "$baseFlat") else ""}",
                        rolledValues = baseRolls,
                        flatBonus = baseFlat,
                        subtotal = baseSubtotal,
                        damageType = baseDmgType
                    )
                )

                // Paladin Level 11+ Radiant Strikes (+1d8 Radiant on every melee weapon / unarmed hit)
                val paladinLvl = char.classes?.find { it.classId == "paladin" }?.level ?: 0
                if (paladinLvl >= 11 && (action?.range?.contains("/") != true)) {
                    val radRolls = rollDice(DiceSpec(1, 8), isCrit, request.diceMode, physicalQueue).toTypedArray()
                    val radSub = radRolls.sum()
                    damageParts.add(
                        DamageBreakdownPart(
                            source = "Radiant Strikes (Paladin Lv 11+)",
                            diceFormula = if (isCrit) "2d8" else "1d8",
                            rolledValues = radRolls,
                            flatBonus = 0,
                            subtotal = radSub,
                            damageType = "radiant"
                        )
                    )
                    triggeredEffects.add("Radiant Strikes (Paladin Lv 11+): Automatically added +$radSub Radiant damage!")
                }

                var consumedSlot: Int? = null
                val consumedResources = mutableListOf<String>()

                for (rider in selectedRiders) {
                    if (rider.appliesTo in listOf("damage", "melee_damage", "weapon_damage", "finesse_or_ranged_damage", "heavy_weapon_damage")) {
                        val rDiceStr = evaluateRiderDice(rider, char)
                        val rSpec = parseDice(rDiceStr)
                        val rFlat = evaluateRiderFlatBonus(rider, sheet)
                        val rRolls = if (rSpec != null) {
                            rollDice(rSpec, isCrit, request.diceMode, physicalQueue).toTypedArray()
                        } else emptyArray()
                        val rSubtotal = rRolls.sum() + rFlat
                        if (rSubtotal > 0 || rSpec != null) {
                            damageParts.add(
                                DamageBreakdownPart(
                                    source = rider.name,
                                    diceFormula = listOfNotNull(
                                        rSpec?.let { "${if (isCrit) it.count * 2 else it.count}d${it.sides}" },
                                        if (rFlat != 0) "+$rFlat" else null
                                    ).joinToString(""),
                                    rolledValues = rRolls,
                                    flatBonus = rFlat,
                                    subtotal = rSubtotal,
                                    damageType = rider.damageType?.takeIf { it != "weapon" } ?: baseDmgType
                                )
                            )
                            triggeredEffects.add("${rider.name} (${rider.source.ifBlank { "Rider" }}): Added +$rSubtotal ${rider.damageType?.takeIf { it != "weapon" } ?: baseDmgType} damage!")
                        }
                        if (rider.consumesSlotLevel != null) consumedSlot = rider.consumesSlotLevel
                        if (!rider.consumesResourceId.isNullOrBlank()) consumedResources.add(rider.consumesResourceId)
                    }
                }

                // 2024 Weapon Mastery Causal Triggers
                val mastery = action?.weaponMastery
                if (!mastery.isNullOrBlank()) {
                    if (!isHit && mastery.equals("Graze", ignoreCase = true)) {
                        val grazeDmg = max(1, baseFlat)
                        damageParts.clear()
                        damageParts.add(
                            DamageBreakdownPart(
                                source = "$title (Graze Mastery on Miss)",
                                diceFormula = "+$grazeDmg",
                                rolledValues = emptyArray(),
                                flatBonus = grazeDmg,
                                subtotal = grazeDmg,
                                damageType = baseDmgType
                            )
                        )
                        triggeredEffects.add("Weapon Mastery — Graze: Even on a miss, dealt $grazeDmg $baseDmgType damage!")
                    } else if (isHit) {
                        when (mastery.lowercase()) {
                            "vex" -> triggeredEffects.add("Weapon Mastery — Vex: Hit! You have Advantage on your next attack roll against this target before the end of your next turn.")
                            "topple" -> {
                                val toppleDc = 8 + sheet.combatStats.proficiencyBonus + baseFlat
                                triggeredEffects.add("Weapon Mastery — Topple: Hit! Target must succeed on a DC $toppleDc CON Save or fall Prone.")
                            }
                            "sap" -> triggeredEffects.add("Weapon Mastery — Sap: Hit! Target has Disadvantage on its next attack roll before the start of your next turn.")
                            "push" -> triggeredEffects.add("Weapon Mastery — Push: Hit! You can push the target up to 10 ft. straight away (Large or smaller).")
                            "slow" -> triggeredEffects.add("Weapon Mastery — Slow: Hit! Target's Speed is reduced by 10 ft. until the start of your next turn.")
                            "nick" -> triggeredEffects.add("Weapon Mastery — Nick: Hit! Make your Light weapon extra attack as part of this Attack action instead of a Bonus Action.")
                            "cleave" -> triggeredEffects.add("Weapon Mastery — Cleave: Hit! Make a melee attack against a second creature within 5 ft. (weapon dice damage).")
                            "graze" -> triggeredEffects.add("Weapon Mastery — Graze: Active (deals ${max(1, baseFlat)} damage on missed attacks).")
                        }
                    }
                }

                val totalDamage = damageParts.sumOf { it.subtotal }
                val dmgBreakdownStr = damageParts.joinToString(" + ") { part ->
                    val rollsText = if (part.rolledValues.isNotEmpty()) "[${part.rolledValues.joinToString("+")}]" else ""
                    val flatText = if (part.flatBonus != 0) (if (part.flatBonus > 0) "+${part.flatBonus}" else "${part.flatBonus}") else ""
                    "${part.source}: $rollsText$flatText (${part.subtotal} ${part.damageType})"
                }
                val hitLabel = if (isCrit) "CRITICAL HIT!" else if (isFumble) "CRITICAL MISS!" else "To Hit: $totalAttack"

                return RollOutcome(
                    rollType = "weapon_attack",
                    targetId = request.targetId,
                    title = "$title Attack",
                    diceMode = request.diceMode,
                    advantageMode = effectiveAdvantage,
                    d20Rolls = d20Rolls,
                    chosenD20 = chosenD20,
                    isCriticalHit = isCrit,
                    isCriticalFail = isFumble,
                    toHitOrCheckModifier = hitMod,
                    riderCheckDiceTotal = riderD20Bonus,
                    totalD20Result = totalAttack,
                    targetAcOrDc = request.targetAcOrDc,
                    isSuccess = isHit,
                    damageParts = damageParts.toTypedArray(),
                    totalDamage = totalDamage,
                    consumedSlotLevel = consumedSlot,
                    consumedResourceIds = consumedResources.toTypedArray(),
                    triggeredEffects = triggeredEffects.toTypedArray(),
                    detailedFormula = "$hitLabel | Damage: $totalDamage ($dmgBreakdownStr)",
                    summary = "$title: $hitLabel → $totalDamage damage ($dmgBreakdownStr)"
                )
            }

            "spell" -> {
                val matchedAction = sheet.actions.find { it.id == request.targetId }
                val knownSpell = sheet.knownSpells.find { it.spell.id == request.targetId }
                    ?: sheet.availableClassSpells.find { it.id == request.targetId }?.let { KnownSpell(spell = it, prepared = true) }
                val spell = knownSpell?.spell
                val title = spell?.name ?: matchedAction?.name ?: request.targetId
                val baseLevel = spell?.level ?: matchedAction?.spellLevel ?: 0
                val castSlotLevel = if (baseLevel > 0) (request.slotLevel ?: baseLevel).coerceAtLeast(baseLevel) else 0
                val upcastLevels = if (baseLevel > 0) (castSlotLevel - baseLevel).coerceAtLeast(0) else 0
                val primaryCastStat = spell?.let { sp ->
                    sheet.spellcastingStats.find { stat ->
                        sp.classes.any { c -> c.equals(stat.classId, ignoreCase = true) } ||
                            (stat.classId in listOf("fighter", "rogue") && sp.classes.any { c -> c.equals("wizard", ignoreCase = true) })
                    }
                } ?: sheet.spellcastingStats.firstOrNull()
                val spellAbil = primaryCastStat?.ability ?: "INT"
                val pb = sheet.combatStats.proficiencyBonus
                val spellAtkBonus = matchedAction?.toHitBonus ?: primaryCastStat?.attackBonus ?: (pb + 3)
                val spellSaveDc = matchedAction?.saveDC ?: primaryCastStat?.saveDC ?: (8 + pb + 3)
                val spellMod = primaryCastStat?.modifier ?: 3

                val mech = spell?.mechanics
                val actionType = mech?.actionType ?: (if (matchedAction?.toHitBonus != null) "attack" else if (matchedAction?.saveDC != null) "save" else "utility")

                val isInnateSorcery = sheet.activeConditions.any { it.condition.id.equals("innate-sorcery", ignoreCase = true) } ||
                    (char.activeModifiers?.any { it.sourceId.equals("innate-sorcery", ignoreCase = true) } == true)
                val spellAdvantage = if (isInnateSorcery && actionType == "attack" && effectiveAdvantage == "NORMAL") {
                    triggeredEffects.add("Innate Sorcery (Sorcerer): Granted Advantage on spell attack roll & +1 Spell Save DC!")
                    "ADVANTAGE"
                } else effectiveAdvantage

                var d20Rolls: Array<Int> = emptyArray()
                var chosenD20: Int? = null
                var isCrit = false
                var isFumble = false
                var totalAttack: Int? = null
                var isSpellHit: Boolean? = null

                if (actionType == "attack") {
                    val pair = rollD20(spellAdvantage, request.diceMode, request.physicalD20Rolls, hasHalflingLucky, triggeredEffects)
                    d20Rolls = pair.first
                    chosenD20 = pair.second
                    isCrit = chosenD20 == 20
                    isFumble = chosenD20 == 1
                    totalAttack = chosenD20 + spellAtkBonus + riderD20Bonus
                    isSpellHit = when {
                        isCrit -> true
                        isFumble -> false
                        request.targetAcOrDc != null -> totalAttack >= request.targetAcOrDc
                        else -> null
                    }
                }

                val wizardCls = char.classes?.find { it.classId == "wizard" }
                val isEvokerPotentCantrip = (wizardCls?.level ?: 0) >= 3 &&
                    (wizardCls?.subclassId?.contains("evoker", ignoreCase = true) == true) &&
                    baseLevel == 0

                val damageParts = mutableListOf<DamageBreakdownPart>()
                var totalHealing = 0

                // Log any auto-included class/subclass/item spell damage triggers from matchedAction
                matchedAction?.activeTriggers?.filter {
                    it.contains("Agonizing Blast") ||
                        it.contains("Empowered Evocation") ||
                        it.contains("Elemental Affinity") ||
                        it.contains("Radiant Soul") ||
                        it.contains("Potent Spellcasting") ||
                        it.contains("Active/Item Spell Dmg Mod") ||
                        it.contains("Mod included in Damage")
                }?.forEach { trig ->
                    triggeredEffects.add("Spell Damage Modifier ($trig): Automatically applied!")
                }

                // Damage Calculation (Base + Cantrip Scaling + Upcast Scaling + Class/Item/Active Modifiers + Optional SpellMod Toggle + Riders)
                mech?.damage?.forEachIndexed { idx, dmgPart ->
                    val scaledDiceStr = if (baseLevel == 0 && mech.cantripScaling.isNotEmpty()) {
                        when {
                            char.level >= 17 -> mech.cantripScaling["17"] ?: dmgPart.dice
                            char.level >= 11 -> mech.cantripScaling["11"] ?: dmgPart.dice
                            char.level >= 5 -> mech.cantripScaling["5"] ?: dmgPart.dice
                            else -> dmgPart.dice
                        }
                    } else {
                        dmgPart.dice
                    }

                    val baseSpec = parseDice(scaledDiceStr)
                    if (baseSpec != null) {
                        val upcastBonusDiceCount = if (upcastLevels > 0 && !mech.upcast?.bonusDice.isNullOrBlank()) {
                            val upSpec = parseDice(mech.upcast?.bonusDice)
                            (upSpec?.count ?: 0) * (upcastLevels / max(1, mech.upcast?.perSlotLevel ?: 1))
                        } else 0
                        val combinedSpec = DiceSpec(baseSpec.count + upcastBonusDiceCount, baseSpec.sides)
                        val initialRolls = rollDice(combinedSpec, isCrit, request.diceMode, physicalQueue).toMutableList()

                        // Sorcerous Burst (5e 2024): Exploding d8s when rolling an 8 (up to spellMod extra dice)
                        if (spell.id == "sorcerous-burst" && combinedSpec.sides == 8 && request.diceMode.equals("SIMULATED", ignoreCase = true)) {
                            val maxExtra = max(1, spellMod)
                            var eightCount = initialRolls.count { it == 8 }
                            var extraRolled = 0
                            val extraValues = mutableListOf<Int>()
                            while (eightCount > 0 && extraRolled < maxExtra) {
                                val ex = Random.nextInt(1, 9)
                                initialRolls.add(ex)
                                extraValues.add(ex)
                                extraRolled++
                                eightCount--
                                if (ex == 8) eightCount++
                            }
                            if (extraValues.isNotEmpty()) {
                                triggeredEffects.add("Sorcerous Burst (Exploding d8s): Rolled 8(s)! Added ${extraValues.size} extra d8 [${extraValues.joinToString("+")}]!")
                            }
                        }

                        val rolled = initialRolls.toTypedArray()
                        val upcastFlat = if (upcastLevels > 0) (mech.upcast?.bonusFlat ?: 0) * upcastLevels else 0
                        val inherentSpellMod = dmgPart.addSpellMod ||
                            spell.id in setOf("true-strike", "shillelagh", "flame-blade", "spiritual-weapon")

                        // For primary damage part, matchedAction.damageBonus already includes flatBonus + inherentSpellMod + modSources + class features
                        val baseActionDmgMod = if (idx == 0 && matchedAction != null) {
                            matchedAction.damageBonus
                        } else {
                            dmgPart.flatBonus + (if (inherentSpellMod) spellMod else 0)
                        }
                        val manualSpellModBonus = if (idx == 0 && request.addSpellcastingModToDamage && !inherentSpellMod) {
                            triggeredEffects.add("Spellcasting Ability Modifier ($spellAbil): Added +$spellMod to spell damage!")
                            spellMod
                        } else 0

                        val flat = baseActionDmgMod + upcastFlat + manualSpellModBonus
                        var sub = max(1, rolled.sum() + flat)

                        if (isEvokerPotentCantrip && isSpellHit == false) {
                            sub = max(1, sub / 2)
                            triggeredEffects.add("Potent Cantrip (Evoker Wizard): Even on a missed attack roll, target takes half damage ($sub)!")
                        }

                        damageParts.add(
                            DamageBreakdownPart(
                                source = if (upcastLevels > 0) "$title (Lvl $castSlotLevel)" else title,
                                diceFormula = "${if (isCrit) combinedSpec.count * 2 else combinedSpec.count}d${combinedSpec.sides}${if (flat != 0) (if (flat > 0) "+$flat" else "$flat") else ""}",
                                rolledValues = rolled,
                                flatBonus = flat,
                                subtotal = sub,
                                damageType = dmgPart.type
                            )
                        )
                    }
                }

                // Spell Damage Riders (e.g. Agonizing Blast, Elemental Affinity, Empowered Evocation, Blessed Strikes)
                for (rider in selectedRiders) {
                    if (rider.appliesTo in listOf("damage", "cantrip_damage", "spell_damage")) {
                        val rDiceStr = evaluateRiderDice(rider, char)
                        val rSpec = parseDice(rDiceStr)
                        val rFlat = evaluateRiderFlatBonus(rider, sheet)
                        val rRolls = if (rSpec != null) rollDice(rSpec, isCrit, request.diceMode, physicalQueue).toTypedArray() else emptyArray()
                        val rSub = rRolls.sum() + rFlat
                        if (rSub > 0) {
                            damageParts.add(
                                DamageBreakdownPart(
                                    source = rider.name,
                                    diceFormula = listOfNotNull(
                                        rSpec?.let { "${it.count}d${it.sides}" },
                                        if (rFlat != 0) "+$rFlat" else null
                                    ).joinToString(""),
                                    rolledValues = rRolls,
                                    flatBonus = rFlat,
                                    subtotal = rSub,
                                    damageType = rider.damageType ?: (damageParts.firstOrNull()?.damageType ?: "force")
                                )
                            )
                            triggeredEffects.add("${rider.name}: Added +$rSub damage to spell!")
                        }
                    }
                }

                // Healing Calculation (+ Healer Feat reroll 1s + Life Cleric Disciple of Life)
                mech?.healing?.let { healPart ->
                    val baseSpec = parseDice(healPart.dice)
                    val upcastDiceCount = if (upcastLevels > 0 && !mech.upcast?.bonusDice.isNullOrBlank()) {
                        val upSpec = parseDice(mech.upcast?.bonusDice)
                        (upSpec?.count ?: 0) * (upcastLevels / max(1, mech.upcast?.perSlotLevel ?: 1))
                    } else 0
                    val upcastFlat = if (upcastLevels > 0) (mech.upcast?.bonusFlat ?: 0) * upcastLevels else 0
                    val discipleBonus = if (isLifeCleric && baseLevel > 0) {
                        val b = 2 + castSlotLevel
                        triggeredEffects.add("Disciple of Life (Life Domain Cleric): Added +$b bonus HP to healing spell!")
                        b
                    } else 0
                    val flat = healPart.flatBonus + upcastFlat + (if (healPart.addSpellMod) spellMod else 0) + discipleBonus
                    val rolled = if (baseSpec != null) {
                        val combined = DiceSpec(baseSpec.count + upcastDiceCount, baseSpec.sides)
                        rollDice(
                            combined,
                            isCritical = false,
                            request.diceMode,
                            physicalQueue,
                            rerollOnes = hasHealerFeat,
                            triggeredEffects = triggeredEffects,
                            rerollSourceLabel = "Healer (Origin Feat)"
                        ).toTypedArray()
                    } else emptyArray()
                    totalHealing = max(1, rolled.sum() + flat)
                }

                // Check if this spell was cast using a 1/Long Rest Free Cast from a Feat/Species grant
                val matchingGrantSlot = sheet.spellGrantSlots.find {
                    it.selectedSpellId == spell?.id && it.grantsFreeCastPerLongRest && !it.freeCastUsed
                }
                val usedFreeCast = (request.useFreeCast || (matchingGrantSlot != null && castSlotLevel == baseLevel)) && matchingGrantSlot != null
                val consumedFreeSlotId = if (usedFreeCast) {
                    triggeredEffects.add("${matchingGrantSlot!!.sourceName}: Used 1/Long Rest Free Cast (0 Spell Slots expended)!")
                    matchingGrantSlot.slotId
                } else null

                val totalDamage = damageParts.sumOf { it.subtotal }
                val consumedSlot = if (baseLevel > 0 && !request.isRitualCast && !request.usePactSlot && !usedFreeCast) castSlotLevel else null
                val consumedPact = baseLevel > 0 && !request.isRitualCast && request.usePactSlot && !usedFreeCast
                val summaryParts = mutableListOf<String>()
                summaryParts.add(
                    if (baseLevel > 0) {
                        "Cast $title (Lvl $castSlotLevel${if (usedFreeCast) " Free Cast" else if (request.isRitualCast) " Ritual" else ""})"
                    } else {
                        "Cast $title (Cantrip)"
                    }
                )
                if (totalAttack != null) {
                    val riderText = if (riderD20Strings.isNotEmpty()) " + ${riderD20Strings.joinToString(" + ")}" else ""
                    val hitFormula = "d20($chosenD20) + $spellAtkBonus [$spellAbil ${if (spellMod >= 0) "+$spellMod" else "$spellMod"}, PB +$pb]$riderText = $totalAttack"
                    summaryParts.add(if (isCrit) "CRITICAL HIT ($hitFormula)" else "Spell Attack: $hitFormula")
                }
                if (mech?.saveAbility != null) {
                    summaryParts.add("Target Save: DC $spellSaveDc ${mech.saveAbility} [8 + $spellAbil ${if (spellMod >= 0) "+$spellMod" else "$spellMod"} + PB +$pb]${if (mech.saveHalfDamage || isEvokerPotentCantrip) " (Half on save)" else ""}")
                }
                if (totalDamage > 0) {
                    val dmgDetail = damageParts.joinToString(" + ") { p ->
                        val rStr = if (p.rolledValues.isNotEmpty()) "[${p.rolledValues.joinToString("+")}]" else ""
                        val fStr = if (p.flatBonus != 0) (if (p.flatBonus > 0) "+${p.flatBonus}" else "${p.flatBonus}") else ""
                        "$rStr$fStr (${p.subtotal} ${p.damageType})"
                    }
                    summaryParts.add("Damage: $totalDamage ($dmgDetail)")
                }
                if (totalHealing > 0) summaryParts.add("Healing: $totalHealing HP")
                if (spell?.isConcentration == true) summaryParts.add("Concentrating on $title")

                return RollOutcome(
                    rollType = "spell",
                    targetId = request.targetId,
                    title = title,
                    diceMode = request.diceMode,
                    advantageMode = spellAdvantage,
                    d20Rolls = d20Rolls,
                    chosenD20 = chosenD20,
                    isCriticalHit = isCrit,
                    isCriticalFail = isFumble,
                    toHitOrCheckModifier = if (actionType == "attack") spellAtkBonus else 0,
                    riderCheckDiceTotal = riderD20Bonus,
                    totalD20Result = totalAttack,
                    targetAcOrDc = request.targetAcOrDc,
                    isSuccess = isSpellHit,
                    saveAbility = mech?.saveAbility,
                    saveDC = if (mech?.saveAbility != null) spellSaveDc else null,
                    damageParts = damageParts.toTypedArray(),
                    totalDamage = totalDamage,
                    totalHealing = totalHealing,
                    consumedSlotLevel = consumedSlot,
                    consumedPactSlot = consumedPact,
                    consumedFreeCastSlotId = consumedFreeSlotId,
                    appliedCondition = mech?.appliesCondition,
                    concentrationSpellId = if (spell?.isConcentration == true) spell.id else null,
                    triggeredEffects = triggeredEffects.toTypedArray(),
                    detailedFormula = summaryParts.joinToString(" • "),
                    summary = summaryParts.joinToString(" • ")
                )
            }

            "death_save" -> {
                val paladinLvl = char.classes?.find { it.classId == "paladin" }?.level ?: 0
                val auraBonus = if (paladinLvl >= 6) {
                    val chaMod = max(1, sheet.abilityScores.find { it.ability == "cha" }?.modifier ?: 1)
                    triggeredEffects.add("Aura of Protection (Paladin Lv 6+): +$chaMod bonus applied to Death Saving Throw!")
                    chaMod
                } else 0
                val (d20Rolls, chosenD20) = rollD20(effectiveAdvantage, request.diceMode, request.physicalD20Rolls, hasHalflingLucky, triggeredEffects)
                val total = chosenD20 + auraBonus + riderD20Bonus
                val isNat20 = chosenD20 == 20
                val isNat1 = chosenD20 == 1
                val isPass = isNat20 || (!isNat1 && total >= 10)

                when {
                    isNat20 -> triggeredEffects.add("CRITICAL RECOVERY (Natural 20)! You immediately regain 1 HP and wake up!")
                    isNat1 -> triggeredEffects.add("CRITICAL FAILURE (Natural 1)! Counts as 2 Death Save Failures!")
                    isPass -> triggeredEffects.add("Death Save Success ($total vs DC 10)! (+1 Success)")
                    else -> triggeredEffects.add("Death Save Failure ($total vs DC 10)! (+1 Failure)")
                }

                val riderSuffix = if (riderD20Strings.isNotEmpty()) " + ${riderD20Strings.joinToString(" + ")}" else ""
                val auraSuffix = if (auraBonus > 0) " + $auraBonus (Aura)" else ""
                val formula = "d20($chosenD20)$auraSuffix$riderSuffix = $total vs DC 10"
                val statusLabel = when {
                    isNat20 -> "NAT 20 — REGAIN 1 HP!"
                    isNat1 -> "NAT 1 — 2 FAILURES!"
                    isPass -> "SUCCESS (+1)"
                    else -> "FAILURE (+1)"
                }

                return RollOutcome(
                    rollType = "death_save",
                    targetId = "death_save",
                    title = "Death Saving Throw",
                    diceMode = request.diceMode,
                    advantageMode = effectiveAdvantage,
                    d20Rolls = d20Rolls,
                    chosenD20 = chosenD20,
                    isCriticalHit = isNat20,
                    isCriticalFail = isNat1,
                    toHitOrCheckModifier = auraBonus,
                    riderCheckDiceTotal = riderD20Bonus,
                    totalD20Result = total,
                    targetAcOrDc = 10,
                    isSuccess = isPass,
                    totalHealing = if (isNat20) 1 else 0,
                    triggeredEffects = triggeredEffects.toTypedArray(),
                    detailedFormula = "$formula ($statusLabel)",
                    summary = "Death Saving Throw: $total ($formula) → $statusLabel"
                )
            }

            "companion_attack" -> {
                val comp = sheet.availableCompanions.find { it.id == request.targetId } ?: sheet.activeCompanion
                val compName = comp?.name ?: "Companion"
                val atkName = comp?.attackName ?: "Strike"
                val hitMod = comp?.attackBonus ?: 4
                val dmgDiceStr = comp?.damageDice ?: "1d8"
                val dmgFlat = comp?.damageBonus ?: 2
                val dmgType = comp?.damageType ?: "physical"

                val (d20Rolls, chosenD20) = rollD20(effectiveAdvantage, request.diceMode, request.physicalD20Rolls, false, triggeredEffects)
                val isCrit = chosenD20 == 20
                val isFumble = chosenD20 == 1
                val totalAttack = chosenD20 + hitMod + riderD20Bonus
                val isHit = when {
                    isCrit -> true
                    isFumble -> false
                    request.targetAcOrDc != null -> totalAttack >= request.targetAcOrDc
                    else -> true
                }

                val spec = parseDice(dmgDiceStr) ?: DiceSpec(1, 8)
                val rolled = rollDice(spec, isCrit, request.diceMode, physicalQueue).toTypedArray()
                val sub = max(1, rolled.sum() + dmgFlat)
                val part = DamageBreakdownPart(
                    source = "$compName — $atkName",
                    diceFormula = "${if (isCrit) "${spec.count * 2}d${spec.sides}" else dmgDiceStr}${if (dmgFlat >= 0) "+$dmgFlat" else "$dmgFlat"}",
                    rolledValues = rolled,
                    flatBonus = dmgFlat,
                    subtotal = sub,
                    damageType = dmgType
                )
                val hitText = if (isCrit) "CRITICAL HIT ($totalAttack)" else "To Hit: d20($chosenD20) + $hitMod = $totalAttack"
                return RollOutcome(
                    rollType = "companion_attack",
                    targetId = request.targetId,
                    title = "$compName: $atkName",
                    diceMode = request.diceMode,
                    advantageMode = effectiveAdvantage,
                    d20Rolls = d20Rolls,
                    chosenD20 = chosenD20,
                    isCriticalHit = isCrit,
                    isCriticalFail = isFumble,
                    toHitOrCheckModifier = hitMod,
                    riderCheckDiceTotal = riderD20Bonus,
                    totalD20Result = totalAttack,
                    targetAcOrDc = request.targetAcOrDc,
                    isSuccess = isHit,
                    damageParts = arrayOf(part),
                    totalDamage = sub,
                    triggeredEffects = triggeredEffects.toTypedArray(),
                    detailedFormula = "$hitText • Damage: $sub ([${rolled.joinToString("+")}]+$dmgFlat $dmgType)",
                    summary = "$compName ($atkName): $hitText → $sub $dmgType damage"
                )
            }

            "custom_dice" -> {
                val expr = request.targetId.trim().lowercase().ifBlank { "1d20" }
                val match = Regex("""(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?""").find(expr)
                val count = (match?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 1).coerceIn(1, 50)
                val sides = (match?.groupValues?.getOrNull(2)?.toIntOrNull() ?: 20).coerceIn(2, 1000)
                val sign = if (match?.groupValues?.getOrNull(3) == "-") -1 else 1
                val flat = (match?.groupValues?.getOrNull(4)?.toIntOrNull() ?: 0) * sign

                val rolled = rollDice(DiceSpec(count, sides), isCritical = false, request.diceMode, physicalQueue).toTypedArray()
                val total = rolled.sum() + flat + riderD20Bonus
                val flatStr = if (flat != 0) (if (flat > 0) "+$flat" else "$flat") else ""
                val formulaStr = "${count}d${sides}$flatStr"
                val part = DamageBreakdownPart(
                    source = "Dice Tray ($formulaStr)",
                    diceFormula = formulaStr,
                    rolledValues = rolled,
                    flatBonus = flat,
                    subtotal = total,
                    damageType = "total"
                )
                return RollOutcome(
                    rollType = "custom_dice",
                    targetId = formulaStr,
                    title = "Custom Roll: $formulaStr",
                    diceMode = request.diceMode,
                    advantageMode = "NORMAL",
                    d20Rolls = if (sides == 20) rolled else emptyArray(),
                    chosenD20 = if (sides == 20) rolled.firstOrNull() else null,
                    isCriticalHit = sides == 20 && count == 1 && rolled.firstOrNull() == 20,
                    isCriticalFail = sides == 20 && count == 1 && rolled.firstOrNull() == 1,
                    toHitOrCheckModifier = flat,
                    riderCheckDiceTotal = riderD20Bonus,
                    totalD20Result = total,
                    damageParts = arrayOf(part),
                    totalDamage = total,
                    triggeredEffects = triggeredEffects.toTypedArray(),
                    detailedFormula = "$formulaStr → [${rolled.joinToString(" + ")}]$flatStr = $total",
                    summary = "Rolled $formulaStr: $total ([${rolled.joinToString("+")}]$flatStr)"
                )
            }

            "hit_die" -> {
                val matchedCls = char.classes?.find {
                    it.classId.equals(request.targetId, ignoreCase = true) && it.hitDiceUsed < it.level
                } ?: char.classes?.find { it.hitDiceUsed < it.level }
                    ?: char.classes?.find { it.classId.equals(request.targetId, ignoreCase = true) }
                    ?: char.classes?.firstOrNull()
                val hdSides = matchedCls?.hitDie ?: 8
                val clsName = matchedCls?.className ?: matchedCls?.classId?.replaceFirstChar { it.uppercase() } ?: "Class"
                val conMod = sheet.abilityScores.find { it.ability.equals("con", ignoreCase = true) }?.modifier ?: 0
                val hasDurableFeat = char.feats?.any { it.id.equals("durable", ignoreCase = true) } == true

                val rolledArr = rollDice(
                    DiceSpec(1, hdSides),
                    isCritical = false,
                    diceMode = request.diceMode,
                    physicalQueue = physicalQueue,
                    rerollOnes = hasHealerFeat,
                    triggeredEffects = triggeredEffects,
                    rerollSourceLabel = "Healer (Feat)"
                )
                var rawDie = rolledArr.firstOrNull() ?: ((hdSides / 2) + 1)
                if (hasDurableFeat && rawDie < max(2, conMod * 2)) {
                    val floorVal = max(2, conMod * 2).coerceAtMost(hdSides)
                    if (rawDie < floorVal) {
                        triggeredEffects.add("Durable (Feat): Hit Die roll of $rawDie elevated to minimum $floorVal!")
                        rawDie = floorVal
                    }
                }

                val healed = max(1, rawDie + conMod)
                val conStr = if (conMod >= 0) "+$conMod" else "$conMod"
                val formulaStr = "1d$hdSides$conStr"
                val part = DamageBreakdownPart(
                    source = "$clsName Hit Die (1d$hdSides)",
                    diceFormula = formulaStr,
                    rolledValues = arrayOf(rawDie),
                    flatBonus = conMod,
                    subtotal = healed,
                    damageType = "healing"
                )
                val newHpPreview = (char.hpCurrent + healed).coerceAtMost(char.hpMax)
                triggeredEffects.add("Automatic HP Recovery: Restored +$healed HP (${char.hpCurrent} → $newHpPreview / ${char.hpMax} HP)!")

                return RollOutcome(
                    rollType = "hit_die",
                    targetId = matchedCls?.classId ?: "hit_die",
                    title = "Spend $clsName Hit Die (1d$hdSides)",
                    diceMode = request.diceMode,
                    advantageMode = "NORMAL",
                    d20Rolls = arrayOf(rawDie),
                    chosenD20 = rawDie,
                    isCriticalHit = rawDie == hdSides,
                    isCriticalFail = rawDie == 1,
                    toHitOrCheckModifier = conMod,
                    totalD20Result = healed,
                    damageParts = arrayOf(part),
                    totalDamage = 0,
                    totalHealing = healed,
                    triggeredEffects = triggeredEffects.toTypedArray(),
                    detailedFormula = "1d$hdSides [$rawDie] ${if (conMod >= 0) "+ $conMod" else "- ${-conMod}"} (CON) = +$healed HP",
                    summary = "Spent $clsName Hit Die (1d$hdSides): Rolled [$rawDie] $conStr (CON) → Restored +$healed HP ($newHpPreview/${char.hpMax} HP)"
                )
            }

            else -> {
                val (d20Rolls, chosenD20) = rollD20(effectiveAdvantage, request.diceMode, request.physicalD20Rolls, hasHalflingLucky, triggeredEffects)
                return RollOutcome(
                    rollType = request.rollType,
                    targetId = request.targetId,
                    title = "d20 Roll",
                    diceMode = request.diceMode,
                    advantageMode = effectiveAdvantage,
                    d20Rolls = d20Rolls,
                    chosenD20 = chosenD20,
                    totalD20Result = chosenD20,
                    triggeredEffects = triggeredEffects.toTypedArray(),
                    detailedFormula = "d20($chosenD20)",
                    summary = "Rolled d20: $chosenD20"
                )
            }
        }
    }
}
