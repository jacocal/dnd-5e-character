"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { RollRequestPayload } from "@/components/character/ActionRollComposer";

/**
 * Applies a 0ms optimistic update to the resolved sheet in memory so rapid clicks,
 * direct quantity edits, equips, spell prep, and resource changes appear instantaneously.
 */
function applyOptimisticCommand(prevSheet: any, command: any, catalog: any): any {
    if (!prevSheet || !prevSheet.character || !command?.type) return prevSheet;
    const type = String(command.type).toUpperCase();
    const char = { ...prevSheet.character };
    const nextSheet = { ...prevSheet, character: char };

    switch (type) {
        case "UPDATE_ITEM_STATE": {
            const instanceId = command.intValue;
            const nextQty = command.intValue2;
            const nextEquip = command.boolValue;
            const nextAttune = command.boolValue2;
            const nextIdentify = command.boolValue3;

            nextSheet.inventoryItems = (prevSheet.inventoryItems || []).map((inv: any) => {
                if (inv.instanceId !== instanceId) return inv;
                return {
                    ...inv,
                    quantity: nextQty != null ? Math.max(1, nextQty) : inv.quantity,
                    equipped: nextEquip != null ? nextEquip : inv.equipped,
                    isAttuned: nextAttune != null ? nextAttune : inv.isAttuned,
                    isIdentified: nextIdentify != null ? nextIdentify : inv.isIdentified
                };
            });
            break;
        }
        case "REMOVE_ITEM": {
            const instanceId = command.intValue;
            nextSheet.inventoryItems = (prevSheet.inventoryItems || []).filter(
                (inv: any) => inv.instanceId !== instanceId
            );
            break;
        }
        case "ADD_ITEM": {
            const itemId = command.targetId;
            const addQty = command.intValue ?? 1;
            const existingIdx = (prevSheet.inventoryItems || []).findIndex(
                (inv: any) => inv.item?.id === itemId
            );
            if (existingIdx >= 0) {
                nextSheet.inventoryItems = (prevSheet.inventoryItems || []).map((inv: any, idx: number) =>
                    idx === existingIdx ? { ...inv, quantity: (inv.quantity || 1) + addQty } : inv
                );
            } else {
                const ruleItem = (catalog?.items || []).find((i: any) => i.id === itemId) || {
                    id: itemId,
                    name: itemId,
                    type: "gear",
                    category: "misc",
                    costAmount: 0,
                    weightAmount: 0
                };
                nextSheet.inventoryItems = [
                    ...(prevSheet.inventoryItems || []),
                    {
                        item: ruleItem,
                        quantity: addQty,
                        equipped: false,
                        isIdentified: true,
                        isAttuned: false,
                        instanceId: -(Date.now() % 100000)
                    }
                ];
            }
            break;
        }
        case "HEAL": {
            const amt = command.amount ?? 0;
            char.hpCurrent = Math.min(char.hpMax, (char.hpCurrent || 0) + amt);
            break;
        }
        case "TAKE_DAMAGE": {
            const amt = command.amount ?? 0;
            const tempAbsorbed = Math.min(char.tempHp || 0, amt);
            const rem = amt - tempAbsorbed;
            char.tempHp = (char.tempHp || 0) - tempAbsorbed;
            char.hpCurrent = Math.max(0, (char.hpCurrent || 0) - rem);
            break;
        }
        case "SET_TEMP_HP": {
            char.tempHp = Math.max(0, command.amount ?? 0);
            break;
        }
        case "TOGGLE_INSPIRATION": {
            char.inspiration = !char.inspiration;
            break;
        }
        case "SET_EXHAUSTION": {
            char.exhaustion = Math.max(0, Math.min(6, command.intValue ?? 0));
            break;
        }
        case "TOGGLE_DAMAGE_DEFENSE": {
            const dmgType = String(command.targetId || "").trim().toLowerCase();
            const kind = String(command.textValue || "resistance").trim().toLowerCase();
            if (dmgType) {
                const key =
                    kind === "immunity"
                        ? "immunities"
                        : kind === "vulnerability"
                          ? "vulnerabilities"
                          : "resistances";
                const prevList: string[] = Array.isArray(char[key]) ? char[key] : [];
                const exists = prevList.some((x) => x.toLowerCase() === dmgType);
                char[key] = exists
                    ? prevList.filter((x) => x.toLowerCase() !== dmgType)
                    : [...prevList, dmgType];
            }
            break;
        }
        case "ADD_XP": {
            char.xp = Math.max(0, (char.xp || 0) + (command.amount ?? 0));
            break;
        }
        case "SET_LEVEL": {
            const nextLvl = Math.max(1, Math.min(20, command.intValue ?? char.level ?? 1));
            char.level = nextLvl;
            break;
        }
        case "UPDATE_CURRENCY": {
            if (command.cp != null) char.cp = command.cp;
            if (command.sp != null) char.sp = command.sp;
            if (command.ep != null) char.ep = command.ep;
            if (command.gp != null) char.gp = command.gp;
            if (command.pp != null) char.pp = command.pp;
            break;
        }
        case "PREPARE_SPELL": {
            const spellId = command.targetId;
            const prepared = !!command.boolValue;
            nextSheet.knownSpells = (prevSheet.knownSpells || []).map((ks: any) =>
                ks.spell?.id === spellId ? { ...ks, prepared } : ks
            );
            nextSheet.preparedSpellsCount = (nextSheet.knownSpells || []).filter(
                (ks: any) =>
                    ks.spell?.level > 0 &&
                    ks.prepared &&
                    !ks.alwaysPrepared &&
                    !String(ks.source || "").startsWith("choice:") &&
                    !String(ks.source || "").endsWith("_fixed")
            ).length;
            break;
        }
        case "RESTORE_RESOURCE": {
            const resId = command.targetId;
            const amt = command.amount ?? 1;
            nextSheet.trackedResources = (prevSheet.trackedResources || []).map((tr: any) =>
                tr.resource?.id === resId
                    ? { ...tr, used: Math.max(0, (tr.used || 0) - amt) }
                    : tr
            );
            break;
        }
        case "USE_RESOURCE": {
            const resId = command.targetId;
            const amt = command.amount ?? 1;
            nextSheet.trackedResources = (prevSheet.trackedResources || []).map((tr: any) =>
                tr.resource?.id === resId
                    ? { ...tr, used: Math.min(tr.max || 1, (tr.used || 0) + amt) }
                    : tr
            );
            break;
        }
        default:
            break;
    }

    return nextSheet;
}

interface KmpContextType {
    viewModel: any;
    state: any;
    sheet: any | null;
    catalog: any | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    dispatchCommand: (command: any) => Promise<any>;
    openRollComposer: (request: RollRequestPayload) => void;
    executeQuickRoll: (request: RollRequestPayload) => Promise<void>;
    executeInstantRoll: (request: RollRequestPayload) => Promise<void>;
    composerOpen: boolean;
    setComposerOpen: (open: boolean) => void;
    composerRequest: RollRequestPayload | null;
    lastRollOutcome: any | null;
    toastRollOutcome: any | null;
    lastInstantRequest: RollRequestPayload | null;
    dismissToastRoll: () => void;
    concentrationCheckDc: number | null;
    dismissConcentrationCheck: () => void;
}

const KmpContext = createContext<KmpContextType | undefined>(undefined);

function mapSheetToState(sheet: any, catalog: any, isLoading: boolean, error: string | null) {
    if (!sheet) {
        return {
            character: null,
            catalog: catalog || null,
            resolvedItems: [],
            resolvedSpells: [],
            availableClassSpells: [],
            resolvedConditions: [],
            resolvedResources: [],
            resolvedAbilityScores: [],
            resolvedSkills: [],
            resolvedSavingThrows: [],
            resolvedCombatStats: null,
            resolvedSpellcastingStats: [],
            resolvedSpellSlots: null,
            resolvedFeatures: [],
            resolvedProficiencies: { armor: [], weapons: [], tools: [] },
            activeModifiers: [],
            spellGrantSlots: [],
            activeTriggerMatrix: [],
            featureChoiceSlots: [],
            weaponMasteryLimit: 0,
            masteredWeaponIds: [],
            availableCompanions: [],
            activeCompanion: null,
            companionHpCurrent: 0,
            knownCantripsCount: 0,
            preparedSpellsCount: 0,
            maxPreparedSpells: 0,
            maxCantrips: 0,
            spellPrepMode: "none",
            hasArmorPenalty: false,
            isLoading,
            error
        };
    }

    return {
        character: sheet.character,
        catalog: catalog || null,
        resolvedItems: sheet.inventoryItems || [],
        resolvedSpells: sheet.knownSpells || [],
        availableClassSpells: sheet.availableClassSpells || [],
        resolvedConditions: sheet.activeConditions || [],
        resolvedResources: sheet.trackedResources || [],
        resolvedAbilityScores: sheet.abilityScores || [],
        resolvedSkills: sheet.skills || [],
        resolvedSavingThrows: sheet.savingThrows || [],
        resolvedCombatStats: sheet.combatStats || null,
        resolvedSpellcastingStats: sheet.spellcastingStats || [],
        resolvedSpellSlots: sheet.spellSlots || null,
        resolvedFeatures: sheet.classFeatures || [],
        resolvedProficiencies: sheet.proficiencies || { armor: [], weapons: [], tools: [] },
        activeModifiers: sheet.character?.activeModifiers || [],
        spellGrantSlots: sheet.spellGrantSlots || [],
        activeTriggerMatrix: sheet.activeTriggerMatrix || [],
        featureChoiceSlots: sheet.featureChoiceSlots || [],
        weaponMasteryLimit: sheet.weaponMasteryLimit ?? 0,
        masteredWeaponIds: sheet.masteredWeaponIds || [],
        availableCompanions: sheet.availableCompanions || [],
        activeCompanion: sheet.activeCompanion || null,
        companionHpCurrent: sheet.companionHpCurrent ?? 0,
        hasArmorPenalty: sheet.hasArmorPenalty || false,
        knownCantripsCount: sheet.knownCantripsCount || 0,
        preparedSpellsCount: sheet.preparedSpellsCount || 0,
        maxPreparedSpells: sheet.maxPreparedSpells || 0,
        maxCantrips: sheet.maxCantrips || 0,
        spellPrepMode: sheet.spellPrepMode || "none",
        actions: sheet.actions || [],
        availableRiders: sheet.availableRiders || [],
        concentrationSpellName: sheet.concentrationSpellName || null,
        isLoading,
        error
    };
}

export function KmpCharacterProvider({
    children,
    characterId
}: {
    children: React.ReactNode;
    characterId: number;
}) {
    const [sheet, setSheet] = useState<any | null>(null);
    const [catalog, setCatalog] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [composerOpen, setComposerOpen] = useState(false);
    const [composerRequest, setComposerRequest] = useState<RollRequestPayload | null>(null);
    const [lastRollOutcome, setLastRollOutcome] = useState<any | null>(null);
    const [toastRollOutcome, setToastRollOutcome] = useState<any | null>(null);
    const [lastInstantRequest, setLastInstantRequest] = useState<RollRequestPayload | null>(null);
    const [concentrationCheckDc, setConcentrationCheckDc] = useState<number | null>(null);
    const inFlightCountRef = useRef<number>(0);
    const latestSeqRef = useRef<number>(0);

    const loadSheet = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [charResp, rulesResp] = await Promise.all([
                fetch(`/api/engine/characters/${characterId}`, { cache: "no-store" }),
                catalog ? Promise.resolve(null) : fetch(`/api/engine/rules`, { cache: "force-cache" })
            ]);
            if (!charResp.ok) {
                throw new Error(`Failed to load character #${characterId} (HTTP ${charResp.status})`);
            }
            const data = await charResp.json();
            setSheet(data);
            if (rulesResp && rulesResp.ok) {
                const rulesData = await rulesResp.json();
                setCatalog(rulesData);
            }
        } catch (e: any) {
            console.error("[KmpCharacterProvider] Load error:", e);
            setError(e.message || "Failed to load character sheet");
        } finally {
            setIsLoading(false);
        }
    }, [characterId, catalog]);

    useEffect(() => {
        loadSheet();
    }, [characterId]);

    const dispatchCommand = useCallback(
        async (command: any) => {
            // 1. Apply 0ms optimistic state update immediately so UI responds instantaneously
            setSheet((prev: any) => applyOptimisticCommand(prev, command, catalog));

            const seq = ++latestSeqRef.current;
            inFlightCountRef.current += 1;

            try {
                const resp = await fetch(`/api/engine/characters/${characterId}/commands`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(command)
                });
                if (!resp.ok) {
                    throw new Error(`Command ${command.type} failed (HTTP ${resp.status})`);
                }
                const result = await resp.json();
                // Only apply server sheet snapshot when this is the latest in-flight mutation,
                // preventing an earlier response from clobbering newer optimistic clicks!
                if (result.sheet && seq === latestSeqRef.current) {
                    setSheet(result.sheet);
                }
                if (result.lastRollOutcome) {
                    setLastRollOutcome(result.lastRollOutcome);
                    if (!composerOpen) {
                        setToastRollOutcome(result.lastRollOutcome);
                    }
                }
                if (result.concentrationCheckRequiredDc) {
                    setConcentrationCheckDc(result.concentrationCheckRequiredDc);
                    setComposerRequest({
                        rollType: "concentration_save",
                        targetId: "con",
                        targetAcOrDc: result.concentrationCheckRequiredDc,
                        label: `Concentration CON Save (DC ${result.concentrationCheckRequiredDc})`
                    });
                    setComposerOpen(true);
                }
                return result;
            } catch (e: any) {
                console.error("[KmpCharacterProvider] Command error:", e);
                setError(e.message);
                // Re-sync with server on error
                loadSheet();
                throw e;
            } finally {
                inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1);
            }
        },
        [characterId, catalog, composerOpen, loadSheet]
    );

    const openRollComposer = useCallback((request: RollRequestPayload) => {
        setComposerRequest(request);
        setComposerOpen(true);
    }, []);

    const executeQuickRoll = useCallback(
        async (request: RollRequestPayload) => {
            setComposerRequest(request);
            setComposerOpen(true);
            await dispatchCommand({
                type: "EXECUTE_ROLL",
                rollRequest: {
                    rollType: request.rollType,
                    targetId: request.targetId,
                    diceMode: request.diceMode || "SIMULATED",
                    advantageMode: request.advantageMode || "NORMAL",
                    physicalD20Rolls: request.physicalD20Rolls || [],
                    physicalDamageRolls: request.physicalDamageRolls || [],
                    selectedRiderIds: request.selectedRiderIds || [],
                    useVersatileTwoHanded: request.useVersatileTwoHanded || false,
                    slotLevel: request.slotLevel ?? null,
                    usePactSlot: request.usePactSlot || false,
                    isRitualCast: request.isRitualCast || false,
                    useFreeCast: request.useFreeCast || false,
                    addSpellcastingModToDamage: request.addSpellcastingModToDamage || false,
                    targetAcOrDc: request.targetAcOrDc ?? null
                }
            });
        },
        [dispatchCommand]
    );

    const executeInstantRoll = useCallback(
        async (request: RollRequestPayload) => {
            setLastInstantRequest(request);
            const result = await dispatchCommand({
                type: "EXECUTE_ROLL",
                rollRequest: {
                    rollType: request.rollType,
                    targetId: request.targetId,
                    diceMode: "SIMULATED",
                    advantageMode: request.advantageMode || "NORMAL",
                    physicalD20Rolls: [],
                    physicalDamageRolls: [],
                    selectedRiderIds: request.selectedRiderIds || [],
                    useVersatileTwoHanded: request.useVersatileTwoHanded || false,
                    slotLevel: request.slotLevel ?? null,
                    usePactSlot: request.usePactSlot || false,
                    isRitualCast: request.isRitualCast || false,
                    useFreeCast: request.useFreeCast || false,
                    addSpellcastingModToDamage: request.addSpellcastingModToDamage || false,
                    targetAcOrDc: request.targetAcOrDc ?? null
                }
            });
            if (result?.lastRollOutcome) {
                setToastRollOutcome(result.lastRollOutcome);
            }
        },
        [dispatchCommand]
    );

    const viewModel = React.useMemo(() => {
        return {
            loadCharacter: () => loadSheet(),
            getEffectiveMaxHp: () => sheet?.character?.hpMax ?? 10,
            isProficient: (entry: any) => entry?.isProficient !== false,

            // Vitals & Rests
            takeDamage: (amount: number, damageType?: string) =>
                dispatchCommand({ type: "TAKE_DAMAGE", amount, damageType }),
            heal: (amount: number) =>
                dispatchCommand({ type: "HEAL", amount }),
            setTempHp: (amount: number) =>
                dispatchCommand({ type: "SET_TEMP_HP", amount }),
            setDeathSaves: (successes: number, failures: number) =>
                dispatchCommand({ type: "SET_DEATH_SAVES", intValue: successes, intValue2: failures }),
            spendHitDie: (rollAmount?: number | null, classId?: string | null) =>
                dispatchCommand({ type: "SPEND_HIT_DIE", targetId: classId ?? null, amount: rollAmount ?? null }),
            shortRest: () =>
                dispatchCommand({ type: "SHORT_REST" }),
            longRest: () =>
                dispatchCommand({ type: "LONG_REST" }),
            toggleInspiration: () =>
                dispatchCommand({ type: "TOGGLE_INSPIRATION" }),
            setExhaustion: (level: number) =>
                dispatchCommand({ type: "SET_EXHAUSTION", intValue: level }),
            toggleDamageDefense: (damageType: string, kind: "resistance" | "immunity" | "vulnerability") =>
                dispatchCommand({ type: "TOGGLE_DAMAGE_DEFENSE", targetId: damageType, textValue: kind }),

            // Resources & Active Effects
            useResource: (resourceId: string, amount?: number) =>
                dispatchCommand({ type: "USE_RESOURCE", targetId: resourceId, amount: amount ?? null }),
            updateResource: (resourceId: string, newUsed: number) => {
                const current = (sheet?.trackedResources || []).find((r: any) => r.resource.id === resourceId);
                if (!current) return;
                const clampedUsed = Math.max(0, Math.min(current.max, newUsed));
                if (clampedUsed === current.used) return;
                if (clampedUsed > current.used) {
                    return dispatchCommand({
                        type: "USE_RESOURCE",
                        targetId: resourceId,
                        amount: clampedUsed - current.used
                    });
                } else {
                    return dispatchCommand({
                        type: "RESTORE_RESOURCE",
                        targetId: resourceId,
                        amount: current.used - clampedUsed
                    });
                }
            },
            deactivateResourceEffect: (sourceId: string) =>
                dispatchCommand({ type: "DEACTIVATE_EFFECT", targetId: sourceId }),

            // Conditions
            toggleCondition: (conditionId: string) =>
                dispatchCommand({ type: "TOGGLE_CONDITION", targetId: conditionId }),

            // Spell Slots, Spells & Granted Choice Slots
            consumeSpellSlot: (level: number) =>
                dispatchCommand({ type: "CONSUME_SPELL_SLOT", intValue: level }),
            restoreSpellSlot: (level: number) =>
                dispatchCommand({ type: "RESTORE_SPELL_SLOT", intValue: level }),
            consumePactSlot: () =>
                dispatchCommand({ type: "CONSUME_PACT_SLOT" }),
            restorePactSlot: () =>
                dispatchCommand({ type: "RESTORE_PACT_SLOT" }),
            prepareSpell: (spellId: string, prepared: boolean) =>
                dispatchCommand({ type: "PREPARE_SPELL", targetId: spellId, boolValue: prepared }),
            learnSpell: (spellId: string) =>
                dispatchCommand({ type: "LEARN_SPELL", targetId: spellId }),
            selectGrantedSpell: (slotId: string, spellId: string) =>
                dispatchCommand({ type: "SELECT_GRANTED_SPELL", targetId: slotId, secondaryId: spellId }),
            selectFeatureChoice: (slotId: string, optionId: string) =>
                dispatchCommand({ type: "SELECT_FEATURE_CHOICE", targetId: slotId, secondaryId: optionId }),
            toggleWeaponMastery: (weaponId: string) =>
                dispatchCommand({ type: "TOGGLE_WEAPON_MASTERY", targetId: weaponId }),
            setCompanionForm: (formId: string | null) =>
                dispatchCommand({ type: "SET_COMPANION_FORM", targetId: formId }),
            updateCompanionHp: (delta: number) =>
                dispatchCommand({ type: "UPDATE_COMPANION_HP", amount: delta }),
            useConsumableItem: (instanceId: number) =>
                dispatchCommand({ type: "USE_CONSUMABLE_ITEM", intValue: instanceId }),
            forgetSpell: (spellId: string) =>
                dispatchCommand({ type: "FORGET_SPELL", targetId: spellId }),
            toggleSpellRitual: (spellId: string, isRitual: boolean) =>
                dispatchCommand({ type: "TOGGLE_RITUAL", targetId: spellId, boolValue: isRitual }),
            setConcentration: (spellId: string, _spellName?: string) => {
                const currentlyConc = (sheet?.knownSpells || []).find((s: any) => s.isConcentrating);
                const nextId = currentlyConc?.spell?.id === spellId ? null : spellId;
                return dispatchCommand({ type: "SET_CONCENTRATION", targetId: nextId });
            },

            // Inventory & Currency
            addCharacterItem: (itemId: string, quantity: number = 1) =>
                dispatchCommand({ type: "ADD_ITEM", targetId: itemId, intValue: quantity }),
            removeCharacterItem: (instanceId: number) =>
                dispatchCommand({ type: "REMOVE_ITEM", intValue: instanceId }),
            updateCharacterItemState: (
                instanceId: number,
                equipped: boolean | null,
                isAttuned: boolean | null,
                isIdentified: boolean | null,
                quantity: number | null
            ) =>
                dispatchCommand({
                    type: "UPDATE_ITEM_STATE",
                    intValue: instanceId,
                    intValue2: quantity,
                    boolValue: equipped,
                    boolValue2: isAttuned,
                    boolValue3: isIdentified
                }),
            identifyItem: (instanceId: number) =>
                dispatchCommand({
                    type: "UPDATE_ITEM_STATE",
                    intValue: instanceId,
                    boolValue3: true
                }),
            breakCurse: (instanceId: number) =>
                dispatchCommand({
                    type: "UPDATE_ITEM_STATE",
                    intValue: instanceId,
                    boolValue: false,
                    boolValue2: false
                }),
            updateCurrency: (cp: number, sp: number, ep: number, gp: number, pp: number) =>
                dispatchCommand({ type: "UPDATE_CURRENCY", cp, sp, ep, gp, pp }),
            updateCharacterCurrency: (cp: number, sp: number, ep: number, gp: number, pp: number) =>
                dispatchCommand({ type: "UPDATE_CURRENCY", cp, sp, ep, gp, pp }),

            // Skills, Saves, Proficiencies, Languages, Bio
            updateBio: (size: string, appearance: string, backstory: string, notes?: string) =>
                dispatchCommand({
                    type: "UPDATE_BIO",
                    textValue: size,
                    textValue2: appearance,
                    textValue3: backstory,
                    secondaryId: notes ?? null
                }),
            updateCharacterSkill: (skillName: string, proficiency: string) =>
                dispatchCommand({ type: "UPDATE_SKILL", targetId: skillName, textValue: proficiency }),
            toggleSavingThrowProficiency: (ability: string) =>
                dispatchCommand({
                    type: "TOGGLE_SAVING_THROW",
                    targetId: ability.toLowerCase()
                }),
            addManualProficiency: (category: string, name: string) =>
                dispatchCommand({ type: "ADD_PROFICIENCY", targetId: category, textValue: name }),
            removeManualProficiency: (category: string, name: string) =>
                dispatchCommand({ type: "REMOVE_PROFICIENCY", targetId: category, textValue: name }),
            addLanguage: (languageId: string) =>
                dispatchCommand({ type: "ADD_LANGUAGE", targetId: languageId }),
            addCharacterLanguage: (languageId: string) =>
                dispatchCommand({ type: "ADD_LANGUAGE", targetId: languageId }),
            removeLanguage: (languageId: string) =>
                dispatchCommand({ type: "REMOVE_LANGUAGE", targetId: languageId }),
            removeCharacterLanguage: (languageId: string) =>
                dispatchCommand({ type: "REMOVE_LANGUAGE", targetId: languageId }),

            // Level Up & Progression
            levelUp: (levelUpData: any) =>
                dispatchCommand({ type: "LEVEL_UP", levelUpData }),
            addXp: (amount: number) =>
                dispatchCommand({ type: "ADD_XP", amount }),
            addExperience: (amount: number) =>
                dispatchCommand({ type: "ADD_XP", amount }),
            setLevel: (level: number) =>
                dispatchCommand({ type: "SET_LEVEL", intValue: level }),

            // Quests
            addQuest: (
                title: string,
                description?: string,
                category: string = "main",
                giver?: string,
                location?: string,
                rewardXp: number = 0,
                rewardGp: number = 0,
                rewardNotes?: string,
                initialObjectives?: string[]
            ) =>
                dispatchCommand({
                    type: "ADD_QUEST",
                    textValue: title,
                    textValue2: description,
                    targetId: category,
                    textValue3: `${giver || ""}|||${location || ""}|||${rewardNotes || ""}`,
                    intValue: rewardXp,
                    intValue2: rewardGp,
                    boolValue: true,
                    secondaryId: (initialObjectives || []).join("\n")
                }),
            updateQuest: (
                questId: number,
                title?: string | null,
                description?: string | null,
                status?: string | null,
                isTracked?: boolean | null,
                category?: string | null,
                giver?: string | null,
                location?: string | null,
                rewardXp?: number | null,
                rewardGp?: number | null,
                rewardNotes?: string | null
            ) =>
                dispatchCommand({
                    type: "UPDATE_QUEST",
                    intValue: questId,
                    textValue: title ?? null,
                    textValue2: description ?? null,
                    textValue3: status ?? null,
                    boolValue: isTracked ?? null,
                    targetId: category ?? null,
                    secondaryId:
                        giver != null || location != null || rewardNotes != null
                            ? `${giver || ""}|||${location || ""}|||${rewardNotes || ""}`
                            : null,
                    amount: rewardXp ?? null,
                    intValue2: rewardGp ?? null
                }),
            claimQuestRewards: (questId: number) =>
                dispatchCommand({ type: "CLAIM_QUEST_REWARDS", intValue: questId }),
            deleteQuest: (questId: number) =>
                dispatchCommand({ type: "DELETE_QUEST", intValue: questId }),
            addQuestObjective: (questId: number, description: string, order: number = 0) =>
                dispatchCommand({
                    type: "ADD_QUEST_OBJECTIVE",
                    intValue: questId,
                    textValue: description,
                    intValue2: order
                }),
            toggleQuestObjective: (objectiveId: number, isCompleted: boolean) =>
                dispatchCommand({
                    type: "TOGGLE_QUEST_OBJECTIVE",
                    intValue: objectiveId,
                    boolValue: isCompleted
                }),
            deleteQuestObjective: (objectiveId: number) =>
                dispatchCommand({ type: "DELETE_QUEST_OBJECTIVE", intValue: objectiveId }),
            addQuestLog: (questId: number, content: string) =>
                dispatchCommand({ type: "ADD_QUEST_LOG", intValue: questId, textValue: content }),
            deleteQuestLog: (logId: number) =>
                dispatchCommand({ type: "DELETE_QUEST_LOG", intValue: logId })
        };
    }, [sheet, loadSheet, dispatchCommand]);

    const mappedState = React.useMemo(
        () => mapSheetToState(sheet, catalog, isLoading, error),
        [sheet, catalog, isLoading, error]
    );

    return (
        <KmpContext.Provider
            value={{
                viewModel,
                state: mappedState,
                sheet,
                catalog,
                isLoading,
                error,
                refresh: loadSheet,
                dispatchCommand,
                openRollComposer,
                executeQuickRoll,
                executeInstantRoll,
                composerOpen,
                setComposerOpen,
                composerRequest,
                lastRollOutcome,
                toastRollOutcome,
                lastInstantRequest,
                dismissToastRoll: () => setToastRollOutcome(null),
                concentrationCheckDc,
                dismissConcentrationCheck: () => setConcentrationCheckDc(null)
            }}
        >
            {children}
        </KmpContext.Provider>
    );
}

export function useKmpCharacter() {
    const context = useContext(KmpContext);
    if (context === undefined) {
        throw new Error("useKmpCharacter must be used within a KmpCharacterProvider");
    }
    return context;
}
