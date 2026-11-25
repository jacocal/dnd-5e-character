import * as fs from "fs";
import * as path from "path";

const SEED_DIR = path.join(process.cwd(), "data", "seed");

function readSeed(fileName: string): any {
    const filePath = path.join(SEED_DIR, fileName);
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeSeed(fileName: string, content: any) {
    const filePath = path.join(SEED_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 4) + "\n", "utf-8");
    console.log(`✅ Enriched ${fileName} (${content.data?.length ?? 0} records)`);
}

// 1. Complete SRD 5.2 (2024) Weapon Table
const WEAPON_STATS: Record<string, {
    damage_dice: string;
    versatile_dice?: string;
    damage_type: string;
    weapon_mastery: string;
    range?: string;
    properties: string[];
    slot: string;
}> = {
    "club": { damage_dice: "1d4", damage_type: "bludgeoning", weapon_mastery: "Slow", properties: ["light"], slot: "main_hand" },
    "dagger": { damage_dice: "1d4", damage_type: "piercing", weapon_mastery: "Nick", range: "20/60", properties: ["finesse", "light", "thrown"], slot: "main_hand" },
    "greatclub": { damage_dice: "1d8", damage_type: "bludgeoning", weapon_mastery: "Push", properties: ["two-handed"], slot: "two_handed" },
    "handaxe": { damage_dice: "1d6", damage_type: "slashing", weapon_mastery: "Vex", range: "20/60", properties: ["light", "thrown"], slot: "main_hand" },
    "javelin": { damage_dice: "1d6", damage_type: "piercing", weapon_mastery: "Slow", range: "30/120", properties: ["thrown"], slot: "main_hand" },
    "light-hammer": { damage_dice: "1d4", damage_type: "bludgeoning", weapon_mastery: "Nick", range: "20/60", properties: ["light", "thrown"], slot: "main_hand" },
    "mace": { damage_dice: "1d6", damage_type: "bludgeoning", weapon_mastery: "Sap", properties: [], slot: "main_hand" },
    "quarterstaff": { damage_dice: "1d6", versatile_dice: "1d8", damage_type: "bludgeoning", weapon_mastery: "Topple", properties: ["versatile"], slot: "main_hand" },
    "sickle": { damage_dice: "1d4", damage_type: "slashing", weapon_mastery: "Nick", properties: ["light"], slot: "main_hand" },
    "spear": { damage_dice: "1d6", versatile_dice: "1d8", damage_type: "piercing", weapon_mastery: "Sap", range: "20/60", properties: ["thrown", "versatile"], slot: "main_hand" },
    "dart": { damage_dice: "1d4", damage_type: "piercing", weapon_mastery: "Vex", range: "20/60", properties: ["finesse", "thrown"], slot: "main_hand" },
    "light-crossbow": { damage_dice: "1d8", damage_type: "piercing", weapon_mastery: "Slow", range: "80/320", properties: ["ammunition", "loading", "two-handed"], slot: "two_handed" },
    "shortbow": { damage_dice: "1d6", damage_type: "piercing", weapon_mastery: "Vex", range: "80/320", properties: ["ammunition", "two-handed"], slot: "two_handed" },
    "sling": { damage_dice: "1d4", damage_type: "bludgeoning", weapon_mastery: "Slow", range: "30/120", properties: ["ammunition"], slot: "main_hand" },
    "battleaxe": { damage_dice: "1d8", versatile_dice: "1d10", damage_type: "slashing", weapon_mastery: "Topple", properties: ["versatile"], slot: "main_hand" },
    "flail": { damage_dice: "1d8", damage_type: "bludgeoning", weapon_mastery: "Sap", properties: [], slot: "main_hand" },
    "glaive": { damage_dice: "1d10", damage_type: "slashing", weapon_mastery: "Graze", properties: ["heavy", "reach", "two-handed"], slot: "two_handed" },
    "greataxe": { damage_dice: "1d12", damage_type: "slashing", weapon_mastery: "Cleave", properties: ["heavy", "two-handed"], slot: "two_handed" },
    "greatsword": { damage_dice: "2d6", damage_type: "slashing", weapon_mastery: "Graze", properties: ["heavy", "two-handed"], slot: "two_handed" },
    "halberd": { damage_dice: "1d10", damage_type: "slashing", weapon_mastery: "Cleave", properties: ["heavy", "reach", "two-handed"], slot: "two_handed" },
    "lance": { damage_dice: "1d10", damage_type: "piercing", weapon_mastery: "Topple", properties: ["heavy", "reach"], slot: "two_handed" },
    "longsword": { damage_dice: "1d8", versatile_dice: "1d10", damage_type: "slashing", weapon_mastery: "Sap", properties: ["versatile"], slot: "main_hand" },
    "maul": { damage_dice: "2d6", damage_type: "bludgeoning", weapon_mastery: "Topple", properties: ["heavy", "two-handed"], slot: "two_handed" },
    "morningstar": { damage_dice: "1d8", damage_type: "piercing", weapon_mastery: "Sap", properties: [], slot: "main_hand" },
    "pike": { damage_dice: "1d10", damage_type: "piercing", weapon_mastery: "Push", properties: ["heavy", "reach", "two-handed"], slot: "two_handed" },
    "rapier": { damage_dice: "1d8", damage_type: "piercing", weapon_mastery: "Vex", properties: ["finesse"], slot: "main_hand" },
    "scimitar": { damage_dice: "1d6", damage_type: "slashing", weapon_mastery: "Nick", properties: ["finesse", "light"], slot: "main_hand" },
    "shortsword": { damage_dice: "1d6", damage_type: "piercing", weapon_mastery: "Vex", properties: ["finesse", "light"], slot: "main_hand" },
    "trident": { damage_dice: "1d8", versatile_dice: "1d10", damage_type: "piercing", weapon_mastery: "Topple", range: "20/60", properties: ["thrown", "versatile"], slot: "main_hand" },
    "war-pick": { damage_dice: "1d8", versatile_dice: "1d10", damage_type: "piercing", weapon_mastery: "Sap", properties: ["versatile"], slot: "main_hand" },
    "warhammer": { damage_dice: "1d8", versatile_dice: "1d10", damage_type: "bludgeoning", weapon_mastery: "Push", properties: ["versatile"], slot: "main_hand" },
    "whip": { damage_dice: "1d4", damage_type: "slashing", weapon_mastery: "Slow", properties: ["finesse", "reach"], slot: "main_hand" },
    "blowgun": { damage_dice: "1d1", damage_type: "piercing", weapon_mastery: "Vex", range: "25/100", properties: ["ammunition", "loading"], slot: "main_hand" },
    "hand-crossbow": { damage_dice: "1d6", damage_type: "piercing", weapon_mastery: "Vex", range: "30/120", properties: ["ammunition", "light", "loading"], slot: "main_hand" },
    "heavy-crossbow": { damage_dice: "1d10", damage_type: "piercing", weapon_mastery: "Push", range: "100/400", properties: ["ammunition", "heavy", "loading", "two-handed"], slot: "two_handed" },
    "longbow": { damage_dice: "1d8", damage_type: "piercing", weapon_mastery: "Slow", range: "150/600", properties: ["ammunition", "heavy", "two-handed"], slot: "two_handed" },
    "musket": { damage_dice: "1d12", damage_type: "piercing", weapon_mastery: "Slow", range: "40/120", properties: ["ammunition", "loading", "two-handed"], slot: "two_handed" },
    "pistol": { damage_dice: "1d10", damage_type: "piercing", weapon_mastery: "Vex", range: "30/90", properties: ["ammunition", "loading"], slot: "main_hand" },
    "broken-bottle": { damage_dice: "1d4", damage_type: "slashing", weapon_mastery: "Nick", properties: ["light"], slot: "main_hand" },
};

const ARMOR_STATS: Record<string, {
    armor_class: number;
    slot: string;
    stealth_disadvantage: boolean;
    strength_requirement?: number;
}> = {
    "padded-armor": { armor_class: 11, slot: "chest", stealth_disadvantage: true },
    "leather-armor": { armor_class: 11, slot: "chest", stealth_disadvantage: false },
    "studded-leather": { armor_class: 12, slot: "chest", stealth_disadvantage: false },
    "hide-armor": { armor_class: 12, slot: "chest", stealth_disadvantage: false },
    "chain-shirt": { armor_class: 13, slot: "chest", stealth_disadvantage: false },
    "scale-mail": { armor_class: 14, slot: "chest", stealth_disadvantage: true },
    "breastplate": { armor_class: 14, slot: "chest", stealth_disadvantage: false },
    "half-plate": { armor_class: 15, slot: "chest", stealth_disadvantage: true },
    "ring-mail": { armor_class: 14, slot: "chest", stealth_disadvantage: true },
    "chain-mail": { armor_class: 16, slot: "chest", stealth_disadvantage: true, strength_requirement: 13 },
    "splint-armor": { armor_class: 17, slot: "chest", stealth_disadvantage: true, strength_requirement: 15 },
    "plate-armor": { armor_class: 18, slot: "chest", stealth_disadvantage: true, strength_requirement: 15 },
    "plate-plus-1": { armor_class: 18, slot: "chest", stealth_disadvantage: true, strength_requirement: 15 },
    "armor-vulnerability": { armor_class: 18, slot: "chest", stealth_disadvantage: true, strength_requirement: 15 },
    "shield": { armor_class: 2, slot: "off_hand", stealth_disadvantage: false },
    "shield-plus-1": { armor_class: 3, slot: "off_hand", stealth_disadvantage: false },
};

function enrichItems() {
    const file = readSeed("09-items.json");
    file.data = file.data.map((item: any) => {
        const w = WEAPON_STATS[item.id];
        if (w) {
            const lowerType = item.type.toLowerCase();
            const tags = new Set<string>(item.tags || []);
            if (lowerType.includes("simple")) tags.add("weapon:simple");
            if (lowerType.includes("martial")) tags.add("weapon:martial");
            if (lowerType.includes("improvised")) tags.add("weapon:improvised");
            if (lowerType.includes("melee")) tags.add("weapon:melee");
            if (lowerType.includes("ranged")) tags.add("weapon:ranged");
            return {
                ...item,
                category: "weapon",
                damage_dice: w.damage_dice,
                ...(w.versatile_dice ? { versatile_dice: w.versatile_dice } : {}),
                damage_type: w.damage_type,
                weapon_mastery: w.weapon_mastery,
                ...(w.range ? { range: w.range } : {}),
                properties: w.properties,
                slot: w.slot,
                tags: Array.from(tags),
            };
        }
        const a = ARMOR_STATS[item.id];
        if (a) {
            const lowerType = item.type.toLowerCase();
            const tags = new Set<string>(item.tags || []);
            if (lowerType.includes("light")) tags.add("armor:light");
            if (lowerType.includes("medium")) tags.add("armor:medium");
            if (lowerType.includes("heavy")) tags.add("armor:heavy");
            if (lowerType.includes("shield")) tags.add("armor:shield");
            return {
                ...item,
                category: "armor",
                armor_class: a.armor_class,
                slot: a.slot,
                stealth_disadvantage: a.stealth_disadvantage,
                ...(a.strength_requirement ? { strength_requirement: a.strength_requirement } : {}),
                tags: Array.from(tags),
            };
        }
        return item;
    });
    writeSeed("09-items.json", file);
}

// 2. Enrich Spells with Structured Mechanics
const CURATED_SPELL_MECHANICS: Record<string, any> = {
    "fire-bolt": {
        actionType: "attack",
        attackType: "ranged_spell",
        damage: [{ dice: "1d10", type: "fire" }],
        cantripScaling: { "5": "2d10", "11": "3d10", "17": "4d10" }
    },
    "eldritch-blast": {
        actionType: "attack",
        attackType: "ranged_spell",
        damage: [{ dice: "1d10", type: "force" }],
        cantripScaling: { "5": "2d10", "11": "3d10", "17": "4d10" }
    },
    "ray-of-frost": {
        actionType: "attack",
        attackType: "ranged_spell",
        damage: [{ dice: "1d8", type: "cold" }],
        cantripScaling: { "5": "2d8", "11": "3d8", "17": "4d8" }
    },
    "chill-touch": {
        actionType: "attack",
        attackType: "melee_spell",
        damage: [{ dice: "1d10", type: "necrotic" }],
        cantripScaling: { "5": "2d10", "11": "3d10", "17": "4d10" }
    },
    "shocking-grasp": {
        actionType: "attack",
        attackType: "melee_spell",
        damage: [{ dice: "1d8", type: "lightning" }],
        cantripScaling: { "5": "2d8", "11": "3d8", "17": "4d8" }
    },
    "sacred-flame": {
        actionType: "save",
        saveAbility: "DEX",
        saveHalfDamage: false,
        damage: [{ dice: "1d8", type: "radiant" }],
        cantripScaling: { "5": "2d8", "11": "3d8", "17": "4d8" }
    },
    "toll-the-dead": {
        actionType: "save",
        saveAbility: "WIS",
        saveHalfDamage: false,
        damage: [{ dice: "1d12", type: "necrotic" }],
        cantripScaling: { "5": "2d12", "11": "3d12", "17": "4d12" }
    },
    "vicious-mockery": {
        actionType: "save",
        saveAbility: "WIS",
        saveHalfDamage: false,
        damage: [{ dice: "1d6", type: "psychic" }],
        cantripScaling: { "5": "2d6", "11": "3d6", "17": "4d6" }
    },
    "acid-splash": {
        actionType: "save",
        saveAbility: "DEX",
        saveHalfDamage: false,
        damage: [{ dice: "1d6", type: "acid" }],
        cantripScaling: { "5": "2d6", "11": "3d6", "17": "4d6" }
    },
    "poison-spray": {
        actionType: "attack",
        attackType: "ranged_spell",
        damage: [{ dice: "1d12", type: "poison" }],
        cantripScaling: { "5": "2d12", "11": "3d12", "17": "4d12" }
    },
    "produce-flame": {
        actionType: "attack",
        attackType: "ranged_spell",
        damage: [{ dice: "1d8", type: "fire" }],
        cantripScaling: { "5": "2d8", "11": "3d8", "17": "4d8" }
    },
    "thorn-whip": {
        actionType: "attack",
        attackType: "melee_spell",
        damage: [{ dice: "1d6", type: "piercing" }],
        cantripScaling: { "5": "2d6", "11": "3d6", "17": "4d6" }
    },
    "starry-wisp": {
        actionType: "attack",
        attackType: "ranged_spell",
        damage: [{ dice: "1d8", type: "radiant" }],
        cantripScaling: { "5": "2d8", "11": "3d8", "17": "4d8" }
    },
    "sorcerous-burst": {
        actionType: "attack",
        attackType: "ranged_spell",
        damage: [{ dice: "1d8", type: "fire" }],
        cantripScaling: { "5": "2d8", "11": "3d8", "17": "4d8" }
    },
    "mind-sliver": {
        actionType: "save",
        saveAbility: "INT",
        saveHalfDamage: false,
        damage: [{ dice: "1d6", type: "psychic" }],
        cantripScaling: { "5": "2d6", "11": "3d6", "17": "4d6" }
    },
    "magic-missile": {
        actionType: "auto_damage",
        damage: [{ dice: "3d4", flatBonus: 3, type: "force" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d4", bonusFlat: 1 }
    },
    "guiding-bolt": {
        actionType: "attack",
        attackType: "ranged_spell",
        damage: [{ dice: "4d6", type: "radiant" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d6" }
    },
    "inflict-wounds": {
        actionType: "save",
        saveAbility: "CON",
        saveHalfDamage: false,
        damage: [{ dice: "2d10", type: "necrotic" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d10" }
    },
    "chromatic-orb": {
        actionType: "attack",
        attackType: "ranged_spell",
        damage: [{ dice: "3d8", type: "elemental" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d8" }
    },
    "burning-hands": {
        actionType: "save",
        saveAbility: "DEX",
        saveHalfDamage: true,
        damage: [{ dice: "3d6", type: "fire" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d6" }
    },
    "thunderwave": {
        actionType: "save",
        saveAbility: "CON",
        saveHalfDamage: true,
        damage: [{ dice: "2d8", type: "thunder" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d8" }
    },
    "hellish-rebuke": {
        actionType: "save",
        saveAbility: "DEX",
        saveHalfDamage: true,
        damage: [{ dice: "2d10", type: "fire" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d10" }
    },
    "cure-wounds": {
        actionType: "heal",
        healing: { dice: "2d8", addSpellMod: true },
        upcast: { perSlotLevel: 1, bonusDice: "2d8" }
    },
    "healing-word": {
        actionType: "heal",
        healing: { dice: "2d4", addSpellMod: true },
        upcast: { perSlotLevel: 1, bonusDice: "2d4" }
    },
    "prayer-of-healing": {
        actionType: "heal",
        healing: { dice: "2d8", addSpellMod: false },
        upcast: { perSlotLevel: 1, bonusDice: "1d8" }
    },
    "mass-healing-word": {
        actionType: "heal",
        healing: { dice: "2d4", addSpellMod: true },
        upcast: { perSlotLevel: 1, bonusDice: "1d4" }
    },
    "mass-cure-wounds": {
        actionType: "heal",
        healing: { dice: "5d8", addSpellMod: true },
        upcast: { perSlotLevel: 1, bonusDice: "1d8" }
    },
    "heal": {
        actionType: "heal",
        healing: { dice: "0d0", flatBonus: 70, addSpellMod: false },
        upcast: { perSlotLevel: 1, bonusFlat: 10 }
    },
    "bless": {
        actionType: "buff",
        appliesModifiers: [
            { type: "bonus", target: "attack_roll_dice", valueString: "1d4", duration: "concentration" },
            { type: "bonus", target: "saving_throw_dice", valueString: "1d4", duration: "concentration" }
        ],
        rider: { id: "spell-bless", name: "Bless (+1d4 Hit/Save)", dice: "1d4", appliesTo: "attack_and_save" }
    },
    "guidance": {
        actionType: "buff",
        appliesModifiers: [
            { type: "bonus", target: "skill_check_dice", valueString: "1d4", duration: "concentration" }
        ],
        rider: { id: "spell-guidance", name: "Guidance (+1d4 Skill)", dice: "1d4", appliesTo: "skill" }
    },
    "resistance": {
        actionType: "buff",
        appliesModifiers: [
            { type: "bonus", target: "saving_throw_dice", valueString: "1d4", duration: "concentration" }
        ],
        rider: { id: "spell-resistance", name: "Resistance (+1d4 Save)", dice: "1d4", appliesTo: "save" }
    },
    "shield": {
        actionType: "buff",
        appliesModifiers: [{ type: "bonus", target: "ac", value: 5, duration: "manual_disable" }]
    },
    "shield-of-faith": {
        actionType: "buff",
        appliesModifiers: [{ type: "bonus", target: "ac", value: 2, duration: "concentration" }]
    },
    "mage-armor": {
        actionType: "buff",
        appliesModifiers: [{ type: " bonus", target: "ac", value: 3, condition: "unarmored", duration: "long_rest" }]
    },
    "aid": {
        actionType: "buff",
        appliesModifiers: [{ type: "bonus", target: "hp_max", value: 5, duration: "long_rest" }],
        upcast: { perSlotLevel: 1, bonusFlat: 5 }
    },
    "hex": {
        actionType: "buff",
        rider: { id: "spell-hex", name: "Hex (+1d6 Necrotic)", dice: "1d6", damageType: "necrotic", appliesTo: "damage" }
    },
    "hunters-mark": {
        actionType: "buff",
        rider: { id: "spell-hunters-mark", name: "Hunter's Mark (+1d6 Force)", dice: "1d6", damageType: "force", appliesTo: "damage" }
    },
    "divine-favor": {
        actionType: "buff",
        rider: { id: "spell-divine-favor", name: "Divine Favor (+1d4 Radiant)", dice: "1d4", damageType: "radiant", appliesTo: "damage" }
    },
    "divine-smite": {
        actionType: "buff",
        damage: [{ dice: "2d8", type: "radiant" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d8" },
        rider: { id: "spell-divine-smite", name: "Divine Smite (+2d8 Radiant)", dice: "2d8", damageType: "radiant", appliesTo: "damage" }
    },
    "scorching-ray": {
        actionType: "attack",
        attackType: "ranged_spell",
        damage: [{ dice: "6d6", type: "fire" }],
        upcast: { perSlotLevel: 1, bonusDice: "2d6" }
    },
    "shatter": {
        actionType: "save",
        saveAbility: "CON",
        saveHalfDamage: true,
        damage: [{ dice: "3d8", type: "thunder" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d8" }
    },
    "spiritual-weapon": {
        actionType: "attack",
        attackType: "melee_spell",
        damage: [{ dice: "1d8", addSpellMod: true, type: "force" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d8" }
    },
    "fireball": {
        actionType: "save",
        saveAbility: "DEX",
        saveHalfDamage: true,
        damage: [{ dice: "8d6", type: "fire" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d6" }
    },
    "lightning-bolt": {
        actionType: "save",
        saveAbility: "DEX",
        saveHalfDamage: true,
        damage: [{ dice: "8d6", type: "lightning" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d6" }
    },
    "spirit-guardians": {
        actionType: "save",
        saveAbility: "WIS",
        saveHalfDamage: true,
        damage: [{ dice: "3d8", type: "radiant" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d8" }
    },
    "call-lightning": {
        actionType: "save",
        saveAbility: "DEX",
        saveHalfDamage: true,
        damage: [{ dice: "3d10", type: "lightning" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d10" }
    },
    "blight": {
        actionType: "save",
        saveAbility: "CON",
        saveHalfDamage: true,
        damage: [{ dice: "8d8", type: "necrotic" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d8" }
    },
    "ice-storm": {
        actionType: "save",
        saveAbility: "DEX",
        saveHalfDamage: true,
        damage: [{ dice: "2d8", type: "bludgeoning" }, { dice: "4d6", type: "cold" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d8" }
    },
    "cone-of-cold": {
        actionType: "save",
        saveAbility: "CON",
        saveHalfDamage: true,
        damage: [{ dice: "8d8", type: "cold" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d8" }
    },
    "flame-strike": {
        actionType: "save",
        saveAbility: "DEX",
        saveHalfDamage: true,
        damage: [{ dice: "5d6", type: "fire" }, { dice: "5d6", type: "radiant" }],
        upcast: { perSlotLevel: 1, bonusDice: "1d6" }
    },
    "disintegrate": {
        actionType: "save",
        saveAbility: "DEX",
        saveHalfDamage: false,
        damage: [{ dice: "10d6", flatBonus: 40, type: "force" }],
        upcast: { perSlotLevel: 1, bonusDice: "3d6" }
    },
    "chain-lightning": {
        actionType: "save",
        saveAbility: "DEX",
        saveHalfDamage: true,
        damage: [{ dice: "10d8", type: "lightning" }]
    },
    "finger-of-death": {
        actionType: "save",
        saveAbility: "CON",
        saveHalfDamage: true,
        damage: [{ dice: "7d8", flatBonus: 30, type: "necrotic" }]
    },
    "meteor-swarm": {
        actionType: "save",
        saveAbility: "DEX",
        saveHalfDamage: true,
        damage: [{ dice: "20d6", type: "fire" }, { dice: "20d6", type: "bludgeoning" }]
    }
};

function inferSpellMechanics(spell: any): any {
    if (CURATED_SPELL_MECHANICS[spell.id]) {
        return CURATED_SPELL_MECHANICS[spell.id];
    }
    const desc = (spell.description || "");
    const lower = desc.toLowerCase();

    // Detect Save Ability
    let saveAbility: string | null = null;
    const saveMatch = desc.match(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Str|Dex|Con|Int|Wis|Cha)\s+sav/i);
    if (saveMatch) {
        saveAbility = saveMatch[1].substring(0, 3).toUpperCase();
    }

    // Detect Dice & Damage Type
    const dmgMatch = desc.match(/(\d+d\d+)\s+(Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder)/i);
    const genericDiceMatch = desc.match(/(\d+d\d+)/);

    if (lower.includes("regain") || lower.includes("heal") || lower.includes("restore") && genericDiceMatch) {
        if (genericDiceMatch && !dmgMatch) {
            return {
                actionType: "heal",
                healing: { dice: genericDiceMatch[1], addSpellMod: lower.includes("spellcasting") || lower.includes("modifier") }
            };
        }
    }

    if (dmgMatch) {
        const dice = dmgMatch[1];
        const dmgType = dmgMatch[2].toLowerCase();
        const isCantrip = spell.level === 0;
        const dieSideMatch = dice.match(/\d+d(\d+)/);
        const dieSide = dieSideMatch ? dieSideMatch[1] : "6";

        const cantripScaling = isCantrip ? {
            "5": `2d${dieSide}`,
            "11": `3d${dieSide}`,
            "17": `4d${dieSide}`
        } : undefined;

        if (saveAbility) {
            return {
                actionType: "save",
                saveAbility,
                saveHalfDamage: !isCantrip,
                damage: [{ dice, type: dmgType }],
                ...(cantripScaling ? { cantripScaling } : { upcast: { perSlotLevel: 1, bonusDice: `1d${dieSide}` } })
            };
        } else {
            const isMelee = spell.range.toLowerCase().includes("touch") || spell.range.toLowerCase().includes("self") || lower.includes("melee");
            return {
                actionType: "attack",
                attackType: isMelee ? "melee_spell" : "ranged_spell",
                damage: [{ dice, type: dmgType }],
                ...(cantripScaling ? { cantripScaling } : { upcast: { perSlotLevel: 1, bonusDice: `1d${dieSide}` } })
            };
        }
    }

    if (saveAbility) {
        // Control/debuff spell with a save
        const conditions = ["blinded", "charmed", "deafened", "frightened", "grappled", "incapacitated", "invisible", "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious"];
        const appliedCond = conditions.find(c => lower.includes(c)) || null;
        return {
            actionType: "save",
            saveAbility,
            saveHalfDamage: false,
            ...(appliedCond ? { appliesCondition: appliedCond } : {})
        };
    }

    if (spell.is_concentration) {
        return { actionType: "buff" };
    }

    return { actionType: "utility" };
}

function enrichSpells(): Set<string> {
    const file = readSeed("10-spells.json");
    const validIds = new Set<string>();
    file.data = file.data.map((spell: any) => {
        validIds.add(spell.id);
        const mechanics = inferSpellMechanics(spell);
        const tags = new Set<string>(spell.tags || []);
        if (mechanics.actionType === "attack" || mechanics.actionType === "save" || mechanics.actionType === "auto_damage") {
            if (mechanics.damage) tags.add("attack");
        }
        if (mechanics.actionType === "heal") tags.add("healing");
        if (mechanics.actionType === "buff") tags.add("buff");
        return {
            ...spell,
            tags: Array.from(tags),
            mechanics,
        };
    });
    writeSeed("10-spells.json", file);
    return validIds;
}

// 3. Enrich Classes
const CLASS_SPELL_PREP_MODE: Record<string, string> = {
    "barbarian": "none",
    "bard": "known",
    "cleric": "prepared_class_list",
    "druid": "prepared_class_list",
    "fighter": "none",
    "monk": "none",
    "paladin": "prepared_class_list",
    "ranger": "known",
    "rogue": "none",
    "sorcerer": "known",
    "warlock": "known",
    "wizard": "spellbook",
};

const CLASS_COMBAT_RIDERS: Record<string, any[]> = {
    "barbarian": [
        { id: "rider-rage", name: "Rage Damage", formula: "rage_damage", damageType: "weapon", appliesTo: "melee_damage", description: "+2 (+3 at Lvl 9, +4 at Lvl 16) melee STR damage while Raging" },
        { id: "rider-reckless", name: "Reckless Attack", grantsAdvantage: true, appliesTo: "melee_attack", description: "Gain Advantage on melee STR attacks this turn" }
    ],
    "rogue": [
        { id: "rider-sneak-attack", name: "Sneak Attack", diceFormula: "sneak_attack_d6", damageType: "weapon", appliesTo: "finesse_or_ranged_damage", description: "Once per turn extra 1d6 per 2 Rogue levels (rounded up) with Finesse/Ranged weapon" }
    ],
    "paladin": [
        { id: "rider-divine-smite", name: "Divine Smite (Lvl 1 Slot)", dice: "2d8", damageType: "radiant", consumesSlotLevel: 1, appliesTo: "melee_damage", description: "Expend a Level 1 spell slot for +2d8 Radiant damage (+1d8 vs Undead/Fiends)" },
        { id: "rider-divine-smite-2", name: "Divine Smite (Lvl 2 Slot)", dice: "3d8", damageType: "radiant", consumesSlotLevel: 2, appliesTo: "melee_damage", description: "Expend a Level 2 spell slot for +3d8 Radiant damage" }
    ],
    "ranger": [
        { id: "rider-hunters-mark", name: "Hunter's Mark", dice: "1d6", damageType: "force", appliesTo: "weapon_damage", description: "+1d6 Force damage to marked target" }
    ],
    "monk": [
        { id: "rider-martial-arts", name: "Martial Arts Die", diceFormula: "martial_arts_die", damageType: "bludgeoning", appliesTo: "unarmed_or_monk_weapon", description: "Use Martial Arts die (1d6 -> 1d12) and DEX for Unarmed/Monk weapons" }
    ],
    "warlock": [
        { id: "rider-agonizing-blast", name: "Agonizing Blast", formula: "cha_mod", damageType: "force", appliesTo: "cantrip_damage", minLevel: 2, description: "Add CHA modifier to Warlock cantrip damage" }
    ],
    "cleric": [
        { id: "rider-divine-strike", name: "Divine Strike / Blessed Strikes", dice: "1d8", damageType: "radiant", appliesTo: "damage", minLevel: 7, description: "Once per turn +1d8 Radiant or Necrotic damage on weapon hit or cantrip" }
    ],
    "bard": [
        { id: "rider-bardic-inspiration", name: "Bardic Inspiration Die", diceFormula: "bardic_die", appliesTo: "d20_test", description: "Add Bardic Inspiration die (1d6 -> 1d12) to d20 roll" }
    ]
};

function enrichClasses() {
    const file = readSeed("01-classes.json");
    file.data = file.data.map((cls: any) => ({
        ...cls,
        spell_prep_mode: CLASS_SPELL_PREP_MODE[cls.id] || "none",
        combat_riders: CLASS_COMBAT_RIDERS[cls.id] || []
    }));
    writeSeed("01-classes.json", file);
}

// 4. Enrich Subclasses with 2024 Always-Prepared Spells & Combat Riders
const SUBCLASS_GRANTED_SPELLS: Record<string, Record<string, string[]>> = {
    "cleric-life": {
        "3": ["aid", "bless", "cure-wounds", "lesser-restoration"],
        "5": ["mass-healing-word", "revivify"],
        "7": ["aura-of-life", "death-ward"],
        "9": ["greater-restoration", "mass-cure-wounds"]
    },
    "cleric-light": {
        "3": ["burning-hands", "faerie-fire", "scorching-ray", "see-invisibility"],
        "5": ["daylight", "fireball"],
        "7": ["arcane-eye", "wall-of-fire"],
        "9": ["flame-strike", "scrying"]
    },
    "cleric-trickery": {
        "3": ["charm-person", "disguise-self", "invisibility", "pass-without-trace"],
        "5": ["hypnotic-pattern", "nondetection"],
        "7": ["confusion", "dimension-door"],
        "9": ["dominate-person", "modify-memory"]
    },
    "cleric-war": {
        "3": ["guiding-bolt", "magic-weapon", "shield-of-faith", "spiritual-weapon"],
        "5": ["crusaders-mantle", "spirit-guardians"],
        "7": ["fire-shield", "freedom-of-movement"],
        "9": ["hold-monster", "steel-wind-strike"]
    },
    "druid-land": {
        "3": ["aid", "blur", "burning-hands", "hold-person"],
        "5": ["fireball", "lightning-bolt"],
        "7": ["blight", "ice-storm"],
        "9": ["cone-of-cold", "scrying"]
    },
    "druid-moon": {
        "3": ["cure-wounds", "moonbeam", "starry-wisp"],
        "5": ["conjure-animals", "daylight"],
        "7": ["fount-of-moonlight", "freedom-of-movement"],
        "9": ["dawn", "mass-cure-wounds"]
    },
    "druid-sea": {
        "3": ["fog-cloud", "gust-of-wind", "ray-of-frost", "shatter", "thunderwave"],
        "5": ["lightning-bolt", "water-breathing"],
        "7": ["control-water", "ice-storm"],
        "9": ["conjure-elemental", "hold-monster"]
    },
    "druid-stars": {
        "1": ["guidance", "guiding-bolt"]
    },
    "paladin-devotion": {
        "3": ["protection-from-evil-and-good", "shield-of-faith"],
        "5": ["aid", "zone-of-truth"],
        "9": ["beacon-of-hope", "dispel-magic"],
        "13": ["freedom-of-movement", "guardian-of-faith"],
        "17": ["commune", "flame-strike"]
    },
    "paladin-glory": {
        "3": ["guiding-bolt", "heroism"],
        "5": ["enhance-ability", "magic-weapon"],
        "9": ["haste", "protection-from-energy"],
        "13": ["compulsion", "freedom-of-movement"],
        "17": ["commune", "flame-strike"]
    },
    "paladin-ancients": {
        "3": ["ensnaring-strike", "speak-with-animals"],
        "5": ["misty-step", "moonbeam"],
        "9": ["plant-growth", "protection-from-energy"],
        "13": ["ice-storm", "stoneskin"],
        "17": ["commune-with-nature", "tree-stride"]
    },
    "paladin-vengeance": {
        "3": ["bane", "hunters-mark"],
        "5": ["hold-person", "misty-step"],
        "9": ["haste", "protection-from-energy"],
        "13": ["banishment", "dimension-door"],
        "17": ["hold-monster", "scrying"]
    },
    "ranger-fey": {
        "3": ["charm-person"],
        "5": ["misty-step"],
        "9": ["summon-fey"],
        "13": ["dimension-door"],
        "17": ["mislead"]
    },
    "ranger-gloom": {
        "3": ["disguise-self"],
        "5": ["rope-trick"],
        "9": ["fear"],
        "13": ["greater-invisibility"],
        "17": ["seeming"]
    },
    "sorcerer-aberrant": {
        "3": ["arms-of-hadar", "calm-emotions", "detect-thoughts", "dissonant-whispers", "mind-sliver"],
        "5": ["hunger-of-hadar", "sending"],
        "7": ["evards-black-tentacles", "summon-aberration"],
        "9": ["rarys-telepathic-bond", "telekinesis"]
    },
    "sorcerer-clockwork": {
        "3": ["aid", "alarm", "lesser-restoration", "protection-from-evil-and-good"],
        "5": ["dispel-magic", "protection-from-energy"],
        "7": ["freedom-of-movement", "summon-construct"],
        "9": ["greater-restoration", "wall-of-force"]
    },
    "sorcerer-draconic": {
        "3": ["alter-self", "chromatic-orb", "command", "Compelled-Duel"],
        "5": ["fear", "fly"],
        "7": ["arcane-eye", "charm-monster"],
        "9": ["legend-lore", "summon-dragon"]
    },
    "warlock-archfey": {
        "3": ["calm-emotions", "faerie-fire", "misty-step", "phantasmal-force", "sleep"],
        "5": ["blink", "plant-growth"],
        "7": ["dominate-beast", "greater-invisibility"],
        "9": ["dominate-person", "seeming"]
    },
    "warlock-celestial": {
        "3": ["aid", "cure-wounds", "guiding-bolt", "lesser-restoration", "light", "sacred-flame"],
        "5": ["daylight", "revivify"],
        "7": ["guardian-of-faith", "wall-of-fire"],
        "9": ["greater-restoration", "summon-celestial"]
    },
    "warlock-fiend": {
        "3": ["burning-hands", "command", "scorching-ray", "suggestion"],
        "5": ["fireball", "stinking-cloud"],
        "7": ["fire-shield", "wall-of-fire"],
        "9": ["geas", "insect-plague"]
    },
    "warlock-greatoldone": {
        "3": ["detect-thoughts", "dissonant-whispers", "phantasmal-force", "tashas-hideous-laughter"],
        "5": ["clairvoyance", "hunger-of-hadar"],
        "7": ["confusion", "summon-aberration"],
        "9": ["modify-memory", "telekinesis"]
    },
    "bard-glamour": {
        "3": ["charm-person", "mirror-image", "command"]
    }
};

const SUBCLASS_COMBAT_RIDERS: Record<string, any[]> = {
    "barbarian-zealot": [
        { id: "rider-divine-fury", name: "Divine Fury", dice: "1d6", formula: "half_class_level", damageType: "radiant", appliesTo: "melee_damage", description: "First hit each turn while Raging deals +1d6 + half Barbarian level Radiant or Necrotic damage" }
    ],
    "barbarian-berserker": [
        { id: "rider-frenzy", name: "Frenzy", dice: "2d6", damageType: "weapon", appliesTo: "melee_damage", description: "First hit on Reckless Attack while Raging deals extra Rage d6s" }
    ],
    "fighter-battlemaster": [
        { id: "rider-maneuver", name: "Combat Superiority Maneuver", dice: "1d8", damageType: "weapon", appliesTo: "damage", description: "Expend a Superiority Die (+1d8/+1d10/+1d12) on hit or attack roll" }
    ],
    "fighter-psi": [
        { id: "rider-psionic-strike", name: "Psionic Strike", dice: "1d8", formula: "int_mod", damageType: "force", appliesTo: "damage", description: "Expend Psionic Energy die for +1d8 + INT mod Force damage" }
    ],
    "monk-mercy": [
        { id: "rider-hand-of-harm", name: "Hand of Harm", dice: "1d6", formula: "wis_mod", damageType: "necrotic", appliesTo: "damage", description: "Spend 1 Focus Point on Unarmed Strike for extra Martial Arts die + WIS mod Necrotic damage" }
    ],
    "paladin-devotion": [
        { id: "rider-sacred-weapon", name: "Sacred Weapon (+CHA to Hit)", formula: "cha_mod", appliesTo: "attack_roll", description: "Channel Divinity: add CHA modifier (min +1) to attack rolls" }
    ],
    "paladin-vengeance": [
        { id: "rider-vow-of-enmity", name: "Vow of Enmity", grantsAdvantage: true, appliesTo: "attack_roll", description: "Channel Divinity: Advantage on attack rolls against marked creature" }
    ],
    "ranger-fey": [
        { id: "rider-dreadful-strikes", name: "Dreadful Strikes", dice: "1d4", damageType: "psychic", appliesTo: "weapon_damage", description: "Once per turn per target +1d4 Psychic damage (1d6 at Lvl 11)" }
    ],
    "ranger-gloom": [
        { id: "rider-dread-ambusher", name: "Dread Ambusher", dice: "2d6", damageType: "psychic", appliesTo: "weapon_damage", description: "+2d6 Psychic damage on Dread Ambusher strike" }
    ],
    "ranger-hunter": [
        { id: "rider-colossus-slayer", name: "Colossus Slayer", dice: "1d8", damageType: "weapon", appliesTo: "weapon_damage", description: "Once per turn +1d8 weapon damage if target is below max HP" }
    ],
    "rogue-assassin": [
        { id: "rider-assassinate", name: "Assassinate", formula: "class_level", damageType: "weapon", appliesTo: "weapon_damage", description: "First round hit deals extra damage equal to Rogue level" }
    ],
    "sorcerer-draconic": [
        { id: "rider-elemental-affinity", name: "Elemental Affinity (+CHA)", formula: "cha_mod", appliesTo: "spell_damage", minLevel: 6, description: "Add CHA modifier to one damage roll of a spell matching draconic element" }
    ],
    "wizard-evoker": [
        { id: "rider-empowered-evocation", name: "Empowered Evocation (+INT)", formula: "int_mod", appliesTo: "spell_damage", minLevel: 10, description: "Add INT modifier to one damage roll of any Wizard Evocation spell" }
    ]
};

function enrichSubclasses(validSpellIds: Set<string>) {
    const file = readSeed("02-subclasses.json");
    file.data = file.data.map((sub: any) => {
        const rawGrants = SUBCLASS_GRANTED_SPELLS[sub.id] || {};
        const filteredGrants: Record<string, string[]> = {};
        for (const [lvl, spellList] of Object.entries(rawGrants)) {
            const valid = spellList.filter(id => validSpellIds.has(id));
            if (valid.length > 0) filteredGrants[lvl] = valid;
        }
        return {
            ...sub,
            granted_spells: filteredGrants,
            combat_riders: SUBCLASS_COMBAT_RIDERS[sub.id] || []
        };
    });
    writeSeed("02-subclasses.json", file);
}

// 5. Enrich Class Progression (cantripsKnown, spellsKnown/Prepared, extraAttacks, skillGrants)
function getCantripsKnown(classId: string, level: number): number {
    switch (classId) {
        case "bard":
        case "druid":
        case "warlock":
            return level >= 10 ? 4 : level >= 4 ? 3 : 2;
        case "cleric":
        case "wizard":
            return level >= 10 ? 5 : level >= 4 ? 4 : 3;
        case "sorcerer":
            return level >= 10 ? 6 : level >= 4 ? 5 : 4;
        default:
            return 0;
    }
}

function getSpellsPreparedLimit(classId: string, level: number): number {
    // 2024 PHB Prepared Spells Table
    const FULL_CASTER_PREP: Record<number, number> = {
        1: 4, 2: 5, 3: 6, 4: 7, 5: 9, 6: 10, 7: 11, 8: 12, 9: 14, 10: 15,
        11: 16, 12: 16, 13: 17, 14: 17, 15: 18, 16: 18, 17: 19, 18: 20, 19: 21, 20: 22
    };
    const HALF_CASTER_PREP: Record<number, number> = {
        1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 6, 7: 7, 8: 7, 9: 9, 10: 9,
        11: 10, 12: 10, 13: 11, 14: 11, 15: 12, 16: 12, 17: 14, 18: 14, 19: 15, 20: 15
    };
    const WARLOCK_PREP: Record<number, number> = {
        1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 10,
        11: 11, 12: 11, 13: 12, 14: 12, 15: 13, 16: 13, 17: 14, 18: 14, 19: 15, 20: 15
    };
    if (["bard", "cleric", "druid", "sorcerer", "wizard"].includes(classId)) {
        return FULL_CASTER_PREP[level] || 0;
    }
    if (["paladin", "ranger"].includes(classId)) {
        return HALF_CASTER_PREP[level] || 0;
    }
    if (classId === "warlock") {
        return WARLOCK_PREP[level] || 0;
    }
    return 0;
}

function getExtraAttacks(classId: string, level: number): number {
    if (classId === "fighter") {
        if (level >= 20) return 4;
        if (level >= 11) return 3;
        if (level >= 5) return 2;
        return 1;
    }
    if (["barbarian", "monk", "paladin", "ranger"].includes(classId)) {
        return level >= 5 ? 2 : 1;
    }
    return 1;
}

function getSkillGrants(classId: string, level: number): any {
    if (classId === "rogue" && (level === 1 || level === 6)) {
        return { type: "expertise", count: 2 };
    }
    if (classId === "bard" && (level === 2 || level === 9)) {
        return { type: "expertise", count: 2 };
    }
    if (classId === "ranger" && (level === 2 || level === 9)) {
        return { type: "expertise", count: 2 };
    }
    if (classId === "wizard" && level === 2) {
        return { type: "expertise", count: 1, from: ["arcana", "history", "investigation", "medicine", "nature", "religion"] };
    }
    return null;
}

function enrichClassProgression() {
    const file = readSeed("03-class-progression.json");
    file.data = file.data.map((row: any) => ({
        ...row,
        cantripsKnown: row.subclassId ? (row.cantripsKnown || 0) : getCantripsKnown(row.classId, row.level),
        spellsKnown: row.subclassId ? (row.spellsKnown || 0) : getSpellsPreparedLimit(row.classId, row.level),
        extraAttacks: getExtraAttacks(row.classId, row.level),
        skillGrants: getSkillGrants(row.classId, row.level),
    }));
    writeSeed("03-class-progression.json", file);
}

// 6. Enrich Traits & Feats
function enrichTraitsAndFeats(validSpellIds: Set<string>) {
    const traitsFile = readSeed("05-traits.json");
    const TRAIT_SPELLS: Record<string, Record<string, string[]>> = {
        "light-bearer": { "1": ["light"] },
        "drow-lineage": { "1": ["dancing-lights"], "3": ["faerie-fire"], "5": ["darkness"] },
        "high-elf-lineage": { "1": ["prestidigitation"], "3": ["detect-magic"], "5": ["misty-step"] },
        "wood-elf-lineage": { "1": ["druidcraft"], "3": ["longstrider"], "5": ["pass-without-trace"] },
        "gnomish-lineage-forest": { "1": ["minor-illusion"] },
        "gnomish-lineage-rock": { "1": ["prestidigitation", "mending"] },
        "otherworldly-presence": { "1": ["thaumaturgy"] },
    };
    const TRAIT_RIDERS: Record<string, any[]> = {
        "fires-burn": [
            { id: "rider-fires-burn", name: "Fire's Burn (+PB Fire)", formula: "proficiency", damageType: "fire", appliesTo: "damage", description: "Deal extra Fire damage equal to Proficiency Bonus on hit" }
        ],
        "heavenly-wings": [
            { id: "rider-heavenly-wings", name: "Celestial Revelation (+PB Radiant)", formula: "proficiency", damageType: "radiant", appliesTo: "damage", description: "Once per turn deal extra Radiant damage equal to Proficiency Bonus" }
        ],
        "necrotic-shroud": [
            { id: "rider-necrotic-shroud", name: "Necrotic Shroud (+PB Necrotic)", formula: "proficiency", damageType: "necrotic", appliesTo: "damage", description: "Once per turn deal extra Necrotic damage equal to Proficiency Bonus" }
        ]
    };

    traitsFile.data = traitsFile.data.map((t: any) => {
        const rawSpells = TRAIT_SPELLS[t.id] || {};
        const filteredSpells: Record<string, string[]> = {};
        for (const [lvl, list] of Object.entries(rawSpells)) {
            const valid = list.filter(id => validSpellIds.has(id));
            if (valid.length > 0) filteredSpells[lvl] = valid;
        }
        return {
            ...t,
            granted_spells: filteredSpells,
            combat_riders: TRAIT_RIDERS[t.id] || []
        };
    });
    writeSeed("05-traits.json", traitsFile);

    const featsFile = readSeed("11-feats.json");
    const FEAT_SPELLS: Record<string, Record<string, string[]>> = {
        "fey-touched": { "1": ["misty-step", "bless"] },
        "shadow-touched": { "1": ["invisibility", "disguise-self"] },
        "magic-initiate": {
            "cleric": ["guidance", "sacred-flame", "bless"],
            "druid": ["guidance", "starry-wisp", "cure-wounds"],
            "wizard": ["fire-bolt", "mage-hand", "shield"]
        }
    };
    const FEAT_RIDERS: Record<string, any[]> = {
        "great-weapon-master": [
            { id: "rider-gwm", name: "Heavy Weapon Mastery (+PB Damage)", formula: "proficiency", damageType: "weapon", appliesTo: "heavy_weapon_damage", description: "Add Proficiency Bonus to damage with Heavy weapons" }
        ],
        "charger": [
            { id: "rider-charger", name: "Charge Attack (+1d8)", dice: "1d8", damageType: "weapon", appliesTo: "melee_damage", description: "+1d8 damage after moving at least 10 ft straight toward target" }
        ]
    };
    const FEAT_SKILL_GRANTS: Record<string, any> = {
        "skilled": { type: "proficiency", count: 3 }
    };

    featsFile.data = featsFile.data.map((f: any) => ({
        ...f,
        granted_spells: FEAT_SPELLS[f.id] || {},
        combat_riders: FEAT_RIDERS[f.id] || [],
        ...(FEAT_SKILL_GRANTS[f.id] ? { skill_grants: FEAT_SKILL_GRANTS[f.id] } : {})
    }));
    writeSeed("11-feats.json", featsFile);
}

function main() {
    console.log("🔧 Enriching D&D 5e (2024) Seed Files...");
    enrichItems();
    const validSpellIds = enrichSpells();
    enrichClasses();
    enrichSubclasses(validSpellIds);
    enrichClassProgression();
    enrichTraitsAndFeats(validSpellIds);
    console.log("🎉 All seed files enriched with structured mechanics!");
}

main();
