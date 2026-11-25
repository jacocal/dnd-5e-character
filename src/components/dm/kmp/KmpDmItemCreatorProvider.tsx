"use client";

import React, { createContext, useContext, useState } from "react";

interface KmpDmItemCreatorContextType {
    viewModel: any;
    state: any;
    isLoading: boolean;
    error: string | null;
}

const KmpDmItemCreatorContext = createContext<KmpDmItemCreatorContextType | undefined>(undefined);

const INITIAL_STATE = {
    name: "",
    description: "",
    type: "Weapon",
    rarity: "Common",
    costAmount: 0,
    costCurrency: "gp",
    weightAmount: 1.0,
    weightUnit: "lb",
    fixedWeight: false,
    damageDice: "1d8",
    versatileDice: "",
    damageType: "Slashing",
    weaponMastery: "",
    range: "5 ft.",
    armorClass: null as number | null,
    strengthRequirement: null as number | null,
    stealthDisadvantage: false,
    slot: "",
    uses: null as number | null,
    usesMax: null as number | null,
    isMagical: false,
    requiresAttunement: false,
    isCursed: false,
    trueName: "",
    shownEffect: "",
    trueEffect: "",
    tags: [] as string[],
    modifiers: [] as any[],
    isSubmitting: false,
    submissionError: null as string | null,
    submissionSuccess: false,
    createdItemId: null as string | null
};

export function KmpDmItemCreatorProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState(INITIAL_STATE);

    const viewModel = React.useMemo(
        () => ({
            updateName: (name: string) => setState((s) => ({ ...s, name })),
            updateDescription: (description: string) => setState((s) => ({ ...s, description })),
            updateType: (type: string) => setState((s) => ({ ...s, type })),
            updateRarity: (rarity: string) => setState((s) => ({ ...s, rarity })),
            updateCostAmount: (costAmount: number | null) =>
                setState((s) => ({ ...s, costAmount: costAmount ?? 0 })),
            updateCostCurrency: (costCurrency: string) => setState((s) => ({ ...s, costCurrency })),
            updateWeightAmount: (weightAmount: number | null) =>
                setState((s) => ({ ...s, weightAmount: weightAmount ?? 0 })),
            toggleFixedWeight: () => setState((s) => ({ ...s, fixedWeight: !s.fixedWeight })),
            updateSlot: (slot: string) => setState((s) => ({ ...s, slot })),
            updateDamageDice: (damageDice: string) => setState((s) => ({ ...s, damageDice })),
            updateDamageType: (damageType: string) => setState((s) => ({ ...s, damageType })),
            updateRange: (range: string) => setState((s) => ({ ...s, range })),
            updateArmorClass: (armorClass: number | null) => setState((s) => ({ ...s, armorClass })),
            updateStrength: (strengthRequirement: number | null) =>
                setState((s) => ({ ...s, strengthRequirement })),
            toggleStealthDisadvantage: () =>
                setState((s) => ({ ...s, stealthDisadvantage: !s.stealthDisadvantage })),
            updateUses: (uses: number | null) => setState((s) => ({ ...s, uses })),
            updateUsesMax: (usesMax: number | null) => setState((s) => ({ ...s, usesMax })),
            toggleMagical: () => setState((s) => ({ ...s, isMagical: !s.isMagical })),
            toggleAttunement: () =>
                setState((s) => ({ ...s, requiresAttunement: !s.requiresAttunement })),
            toggleCursed: () => setState((s) => ({ ...s, isCursed: !s.isCursed })),
            updateTrueName: (trueName: string) => setState((s) => ({ ...s, trueName })),
            updateShownEffect: (shownEffect: string) => setState((s) => ({ ...s, shownEffect })),
            updateTrueEffect: (trueEffect: string) => setState((s) => ({ ...s, trueEffect })),
            addTag: (tag: string) =>
                setState((s) => ({
                    ...s,
                    tags: s.tags.includes(tag) ? s.tags : [...s.tags, tag]
                })),
            removeTag: (tag: string) =>
                setState((s) => ({ ...s, tags: s.tags.filter((t) => t !== tag) })),
            addModifier: (mod: any) =>
                setState((s) => ({ ...s, modifiers: [...s.modifiers, mod] })),
            removeModifier: (index: number) =>
                setState((s) => ({
                    ...s,
                    modifiers: s.modifiers.filter((_, i) => i !== index)
                })),
            reset: () => setState(INITIAL_STATE),
            submit: async () => {
                setState((s) => ({ ...s, isSubmitting: true, submissionError: null }));
                try {
                    const current = state;
                    const category =
                        current.type === "Weapon"
                            ? "weapon"
                            : current.type === "Armor"
                            ? "armor"
                            : current.type === "Consumable"
                            ? "consumable"
                            : "misc";

                    const payload = {
                        id: "",
                        name: current.name,
                        type: current.type,
                        category,
                        rarity: current.rarity.toLowerCase(),
                        costAmount: current.costAmount || 0,
                        costCurrency: current.costCurrency || "gp",
                        weightAmount: current.weightAmount || 0,
                        weightUnit: "lb",
                        fixedWeight: current.fixedWeight,
                        slot: current.slot || null,
                        damageDice: current.type === "Weapon" ? current.damageDice : null,
                        damageType: current.type === "Weapon" ? current.damageType : null,
                        range: current.type === "Weapon" ? current.range : null,
                        armorClass: current.type === "Armor" ? current.armorClass : null,
                        strengthRequirement: current.type === "Armor" ? current.strengthRequirement : null,
                        stealthDisadvantage: current.stealthDisadvantage,
                        uses: current.uses,
                        usesMax: current.usesMax,
                        isMagical: current.isMagical,
                        requiresAttunement: current.requiresAttunement,
                        isCursed: current.isCursed,
                        trueName: current.trueName || null,
                        shownEffect: current.shownEffect || null,
                        trueEffect: current.trueEffect || null,
                        description: current.description,
                        properties: current.tags,
                        tags: current.tags,
                        modifiers: current.modifiers
                    };

                    const resp = await fetch("/api/engine/dm/items", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    if (!resp.ok) {
                        throw new Error(`HTTP ${resp.status}`);
                    }
                    const created = await resp.json();
                    setState((s) => ({
                        ...s,
                        isSubmitting: false,
                        submissionSuccess: true,
                        createdItemId: created.id
                    }));
                } catch (err: any) {
                    setState((s) => ({
                        ...s,
                        isSubmitting: false,
                        submissionError: err.message || "Failed to create item"
                    }));
                }
            }
        }),
        [state]
    );

    return (
        <KmpDmItemCreatorContext.Provider
            value={{
                viewModel,
                state,
                isLoading: false,
                error: state.submissionError
            }}
        >
            {children}
        </KmpDmItemCreatorContext.Provider>
    );
}

export function useKmpDmItemCreator() {
    const context = useContext(KmpDmItemCreatorContext);
    if (context === undefined) {
        throw new Error("useKmpDmItemCreator must be used within a KmpDmItemCreatorProvider");
    }
    return context;
}
