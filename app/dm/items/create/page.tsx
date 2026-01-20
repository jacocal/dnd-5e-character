"use client";

import { useState } from "react";
import { createGlobalItem } from "@/app/dm-actions";
import { Loader2, ArrowLeft, Wand2, Sword, Shield, Coins, FlaskConical, Gem } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Forms
import { BaseItemForm, BaseItemData } from "@/components/dm/forms/BaseItemForm";
import { WeaponForm, WeaponData } from "@/components/dm/forms/WeaponForm";
import { ArmorForm, ArmorData } from "@/components/dm/forms/ArmorForm";
import { MagicItemForm, MagicData } from "@/components/dm/forms/MagicItemForm";
import { ConsumableForm, ConsumableData } from "@/components/dm/forms/ConsumableForm";

type ItemCategory = 'weapon' | 'armor' | 'wondrous' | 'consumable' | 'treasure';

export default function CreateItemPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [category, setCategory] = useState<ItemCategory>('wondrous');

    // --- State Management ---
    const [baseData, setBaseData] = useState<BaseItemData>({
        name: "", costAmount: 0, costCurrency: "gp", weight: "0", rarity: "common", description: ""
    });

    const [weaponData, setWeaponData] = useState<WeaponData>({
        damageDice: "", damageType: "", properties: [], range: "", slot: "main_hand"
    });

    const [armorData, setArmorData] = useState<ArmorData>({
        armorClass: "", strengthRequirement: "", stealthDisadvantage: false, slot: "chest", armorType: "medium"
    });

    const [consumableData, setConsumableData] = useState<ConsumableData>({
        consumableType: "potion", uses: 1, usesMax: 1
    });

    const [magicData, setMagicData] = useState<MagicData>({
        isMagical: true,
        requiresAttunement: false,
        isCursed: false,
        trueName: "",
        trueEffect: "",
        modifiers: [],
        usesMax: "",
        slot: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Construct Payload based on Category
        const payload: any = {
            name: baseData.name,
            cost: `${baseData.costAmount} ${baseData.costCurrency}`,
            weight: baseData.weight,
            description: baseData.description,
            rarity: baseData.rarity,

            // Magic Properties (Shared)
            is_magical: magicData.isMagical,
            requires_attunement: magicData.requiresAttunement,
            is_cursed: magicData.isCursed,
            true_name: magicData.trueName || undefined,
            true_effect: magicData.trueEffect || undefined,
            modifiers: magicData.modifiers.length > 0 ? magicData.modifiers : undefined,

            // Charges (from Magic Form)
            uses_max: magicData.usesMax ? Number(magicData.usesMax) : undefined,
            uses: magicData.usesMax ? Number(magicData.usesMax) : undefined, // Start full
        };

        // Category Specifics
        if (category === 'weapon') {
            payload.type = "Weapon";
            payload.category = "weapon";
            payload.damage_dice = weaponData.damageDice;
            payload.damage_type = weaponData.damageType;
            payload.properties = weaponData.properties;
            payload.range = weaponData.range;
            payload.slot = weaponData.slot;
        }
        else if (category === 'armor') {
            payload.type = armorData.armorType === 'shield' ? "Shield" : "Armor";
            payload.category = "armor";
            payload.armor_class = armorData.armorClass ? Number(armorData.armorClass) : undefined;
            payload.strength_requirement = armorData.strengthRequirement ? Number(armorData.strengthRequirement) : undefined;
            payload.stealth_disadvantage = armorData.stealthDisadvantage;
            payload.slot = armorData.slot;
            payload.tags = [`armor:${armorData.armorType}`];
        }
        else if (category === 'consumable') {
            payload.type = consumableData.consumableType === 'potion' ? "Potion" : "Consumable";
            payload.category = "consumable";
            payload.uses = consumableData.uses;
            payload.uses_max = consumableData.usesMax;
            payload.tags = [consumableData.consumableType];
        }
        else if (category === 'wondrous') {
            payload.type = "Wondrous Item";
            payload.category = "misc"; // or 'wondrous' if DB supports
            // Wondrous items might have a specific slot (Ring, boots, etc)
            if (magicData.slot) payload.slot = magicData.slot;
        }
        else if (category === 'treasure') {
            payload.type = "Treasure";
            payload.category = "misc";
            payload.is_magical = false; // Override default
        }

        try {
            const result = await createGlobalItem(payload);
            if (result.success) {
                router.push("/dm");
                router.refresh();
            } else {
                setError(result.error || "Failed to create item");
                if (result.details) {
                    console.error("Validation details:", result.details);
                }
            }
        } catch (err) {
            setError("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto pb-32">
            <Link href="/dm" className="inline-flex items-center text-zinc-400 hover:text-white mb-6 text-sm">
                <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
            </Link>

            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Item Creator</h1>
                <p className="text-zinc-400">Design custom equipment, magic items, and artifacts.</p>
            </header>

            {/* Category Selector */}
            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                <CategoryButton
                    active={category === 'weapon'}
                    onClick={() => setCategory('weapon')}
                    icon={Sword}
                    label="Weapon"
                />
                <CategoryButton
                    active={category === 'armor'}
                    onClick={() => setCategory('armor')}
                    icon={Shield}
                    label="Armor"
                />
                <CategoryButton
                    active={category === 'consumable'}
                    onClick={() => setCategory('consumable')}
                    icon={FlaskConical}
                    label="Consumable"
                />
                <CategoryButton
                    active={category === 'wondrous'}
                    onClick={() => setCategory('wondrous')}
                    icon={Wand2}
                    label="Wondrous"
                />
                <CategoryButton
                    active={category === 'treasure'}
                    onClick={() => setCategory('treasure')}
                    icon={Gem}
                    label="Treasure"
                />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. Base Info */}
                <BaseItemForm data={baseData} onChange={setBaseData} />

                {/* 2. Type Specific Forms */}
                {category === 'weapon' && (
                    <WeaponForm data={weaponData} onChange={setWeaponData} />
                )}

                {category === 'armor' && (
                    <ArmorForm data={armorData} onChange={setArmorData} />
                )}

                {category === 'consumable' && (
                    <ConsumableForm data={consumableData} onChange={setConsumableData} />
                )}

                {/* 3. Magic & Modifiers (Hidden for generic treasure, optional for others) */}
                {category !== 'treasure' && (
                    <MagicItemForm data={magicData} onChange={setMagicData} />
                )}

                {/* Errors */}
                {error && (
                    <div className="p-3 bg-red-900/30 border border-red-800 rounded text-red-200 text-sm">
                        {error}
                        <p className="text-xs mt-1 text-red-300/60">Check console for validation details.</p>
                    </div>
                )}

                {/* Check: submit */}
                <div className="fixed bottom-0 left-64 right-0 p-4 bg-[#111111]/90 border-t border-zinc-800 backdrop-blur-sm flex justify-between items-center z-10">
                    <div className="text-sm text-zinc-500">
                        Creating {baseData.name || "New Item"} ({category})
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-2 px-8 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded transition-colors disabled:opacity-50"
                    >
                        {isLoading && <Loader2 className="animate-spin" size={16} />}
                        Save to Database
                    </button>
                </div>
            </form>
        </div>
    );
}

function CategoryButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all whitespace-nowrap ${active
                    ? "bg-amber-900/20 border-amber-600 text-amber-500 ring-1 ring-amber-600/50"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700"
                }`}
        >
            <Icon size={18} />
            <span className="font-medium text-sm">{label}</span>
        </button>
    );
}
