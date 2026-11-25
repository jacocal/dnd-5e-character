import { db } from "../src/db";
import {
    classes, subclasses, classProgression, spells, items, races,
    traits, feats, languages, conditions, backgrounds, classResources, companions,
} from "../src/db/schema";
import { parseSrdData } from "../src/lib/import/parser";
import {
    ClassSchema, SubclassSchema, RaceSchema, TraitSchema,
    BackgroundSchema, LanguageSchema, ConditionSchema, FeatSchema,
    ClassResourceSchema, CompanionSchema,
} from "../src/lib/import/schemas";
import { sql } from "drizzle-orm";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

// Table mapping for file-based seeding
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TABLE_MAP: Record<string, any> = {
    classes,
    subclasses,
    class_progression: classProgression,
    class_resources: classResources,
    races,
    traits,
    backgrounds,
    languages,
    conditions,
    items,
    spells,
    feats,
    companions,
};

// Optional Zod validators per table
const VALIDATORS: Record<string, z.ZodTypeAny> = {
    classes: z.array(ClassSchema),
    subclasses: z.array(SubclassSchema),
    races: z.array(RaceSchema),
    traits: z.array(TraitSchema),
    backgrounds: z.array(BackgroundSchema),
    languages: z.array(LanguageSchema),
    conditions: z.array(ConditionSchema),
    feats: z.array(FeatSchema),
    class_resources: z.array(ClassResourceSchema),
    companions: z.array(CompanionSchema),
};

// Transform functions: JSON snake_case -> Drizzle camelCase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TRANSFORMERS: Record<string, (data: any[]) => any[]> = {
    classes: (data) => data.map((c) => ({
        id: c.id,
        name: c.name,
        hitDie: c.hit_die,
        savingThrows: c.saving_throws,
        proficiencies: c.proficiencies,
        spellcastingAbility: c.spellcasting_ability,
        spellcastingType: c.spellcasting_type || "none",
        spellPrepMode: c.spell_prep_mode || "none",
        skillOptions: c.skill_options,
        startingEquipmentOptions: c.starting_equipment_options,
        combatRiders: c.combat_riders || [],
    })),
    subclasses: (data) => data.map((s) => ({
        id: s.id,
        classId: s.class_id,
        name: s.name,
        description: s.description,
        spellcastingType: s.spellcasting_type,
        grantedSpells: s.granted_spells || {},
        combatRiders: s.combat_riders || [],
    })),
    class_progression: (data) => data.map((p) => ({
        classId: p.classId,
        subclassId: p.subclassId || null,
        level: p.level,
        proficiencyBonus: p.proficiencyBonus,
        spellSlots: p.spellSlots || {},
        features: p.features || [],
        cantripsKnown: p.cantripsKnown || 0,
        spellsKnown: p.spellsKnown || 0,
        extraAttacks: p.extraAttacks || 1,
        skillGrants: p.skillGrants || null,
        hasAsi: p.hasAsi || false,
    })),
    races: (data) => data.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        traitOptions: r.trait_options,
        modifiers: r.modifiers,
    })),
    traits: (data) => data.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        race: t.race ?? null,
        parameters: t.parameters,
        modifiers: t.modifiers,
        grantedSpells: t.granted_spells || {},
        combatRiders: t.combat_riders || [],
    })),
    backgrounds: (data) => data.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        abilityOptions: b.ability_options,
        modifiers: b.modifiers,
        features: b.features,
        startingEquipment: b.starting_equipment,
        originFeatId: b.origin_feat_id,
        originFeatClass: b.origin_feat_class,
        toolProficiencies: b.tool_proficiencies,
        startingEquipmentOptions: b.starting_equipment_options,
    })),
    languages: (data) => data,
    conditions: (data) => data,
    feats: (data) => data.map((f) => ({
        id: f.id,
        name: f.name,
        category: f.category || "general",
        repeatable: f.repeatable ?? false,
        description: f.description,
        prerequisites: f.prerequisites,
        parameters: f.parameters,
        modifiers: f.modifiers,
        grantedSpells: f.granted_spells || {},
        combatRiders: f.combat_riders || [],
        skillGrants: f.skill_grants || null,
    })),
    class_resources: (data) => data.map((r) => ({
        id: r.id,
        classId: r.class_id ?? null,
        subclassId: r.subclass_id ?? null,
        sourceType: r.source_type || (r.subclass_id ? "subclass" : "class"),
        sourceId: r.source_id ?? r.subclass_id ?? r.class_id ?? null,
        name: r.name,
        description: r.description,
        maxFormula: r.max_formula,
        rechargeOn: r.recharge_on,
        partialShortRestRecovery: r.partial_short_rest_recovery ?? 0,
        unlockLevel: r.unlock_level || 1,
        onUse: r.onUse ?? null,
    })),
    companions: (data) => data.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        sourceType: c.source_type ?? null,
        sourceId: c.source_id ?? null,
        cr: c.cr ?? 0,
        size: c.size || "Medium",
        armorClassFormula: c.armor_class_formula,
        maxHpFormula: c.max_hp_formula,
        speed: c.speed,
        attackName: c.attack_name,
        attackBonusFormula: c.attack_bonus_formula ?? null,
        damageDice: c.damage_dice,
        damageBonusFormula: c.damage_bonus_formula ?? null,
        damageType: c.damage_type,
        notes: c.notes || "",
        statblock: c.statblock ?? null,
    })),
};

// Upsert configurations per table (includes ALL columns so re-seeding never drops updates)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const UPSERT_CONFIG: Record<string, { target: any; set: Record<string, any> }> = {
    classes: {
        target: classes.id,
        set: {
            name: sql`excluded.name`,
            hitDie: sql`excluded.hit_die`,
            savingThrows: sql`excluded.saving_throws`,
            proficiencies: sql`excluded.proficiencies`,
            spellcastingAbility: sql`excluded.spellcasting_ability`,
            spellcastingType: sql`excluded.spellcasting_type`,
            spellPrepMode: sql`excluded.spell_prep_mode`,
            skillOptions: sql`excluded.skill_options`,
            startingEquipmentOptions: sql`excluded.starting_equipment_options`,
            combatRiders: sql`excluded.combat_riders`,
        },
    },
    subclasses: {
        target: subclasses.id,
        set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            classId: sql`excluded.class_id`,
            spellcastingType: sql`excluded.spellcasting_type`,
            grantedSpells: sql`excluded.granted_spells`,
            combatRiders: sql`excluded.combat_riders`,
        },
    },
    races: {
        target: races.id,
        set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            traitOptions: sql`excluded.trait_options`,
            modifiers: sql`excluded.modifiers`,
        },
    },
    traits: {
        target: traits.id,
        set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            race: sql`excluded.race`,
            parameters: sql`excluded.parameters`,
            modifiers: sql`excluded.modifiers`,
            grantedSpells: sql`excluded.granted_spells`,
            combatRiders: sql`excluded.combat_riders`,
        },
    },
    backgrounds: {
        target: backgrounds.id,
        set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            abilityOptions: sql`excluded.ability_options`,
            modifiers: sql`excluded.modifiers`,
            features: sql`excluded.features`,
            startingEquipment: sql`excluded.starting_equipment`,
            originFeatId: sql`excluded.origin_feat_id`,
            originFeatClass: sql`excluded.origin_feat_class`,
            toolProficiencies: sql`excluded.tool_proficiencies`,
            startingEquipmentOptions: sql`excluded.starting_equipment_options`,
        },
    },
    languages: {
        target: languages.id,
        set: {
            name: sql`excluded.name`,
            script: sql`excluded.script`,
            type: sql`excluded.type`,
            description: sql`excluded.description`,
        },
    },
    conditions: {
        target: conditions.id,
        set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            modifiers: sql`excluded.modifiers`,
        },
    },
    items: {
        target: items.id,
        set: {
            name: sql`excluded.name`,
            type: sql`excluded.type`,
            costAmount: sql`excluded.cost_amount`,
            costCurrency: sql`excluded.cost_currency`,
            weightAmount: sql`excluded.weight_amount`,
            weightUnit: sql`excluded.weight_unit`,
            fixedWeight: sql`excluded.fixed_weight`,
            category: sql`excluded.category`,
            slot: sql`excluded.slot`,
            armorClass: sql`excluded.armor_class`,
            strengthRequirement: sql`excluded.strength_requirement`,
            stealthDisadvantage: sql`excluded.stealth_disadvantage`,
            damageDice: sql`excluded.damage_dice`,
            versatileDice: sql`excluded.versatile_dice`,
            damageType: sql`excluded.damage_type`,
            weaponMastery: sql`excluded.weapon_mastery`,
            range: sql`excluded.range`,
            properties: sql`excluded.properties`,
            tags: sql`excluded.tags`,
            rarity: sql`excluded.rarity`,
            requiresAttunement: sql`excluded.requires_attunement`,
            isMagical: sql`excluded.is_magical`,
            isCursed: sql`excluded.is_cursed`,
            trueName: sql`excluded.true_name`,
            shownEffect: sql`excluded.shown_effect`,
            trueEffect: sql`excluded.true_effect`,
            uses: sql`excluded.uses`,
            usesMax: sql`excluded.uses_max`,
            description: sql`excluded.description`,
            modifiers: sql`excluded.modifiers`,
        },
    },
    spells: {
        target: spells.id,
        set: {
            name: sql`excluded.name`,
            level: sql`excluded.level`,
            school: sql`excluded.school`,
            castingTime: sql`excluded.casting_time`,
            castingTimeTrigger: sql`excluded.casting_time_trigger`,
            range: sql`excluded.range`,
            components: sql`excluded.components`,
            duration: sql`excluded.duration`,
            isRitual: sql`excluded.is_ritual`,
            isConcentration: sql`excluded.is_concentration`,
            description: sql`excluded.description`,
            tags: sql`excluded.tags`,
            classes: sql`excluded.classes`,
            mechanics: sql`excluded.mechanics`,
        },
    },
    feats: {
        target: feats.id,
        set: {
            name: sql`excluded.name`,
            category: sql`excluded.category`,
            repeatable: sql`excluded.repeatable`,
            description: sql`excluded.description`,
            prerequisites: sql`excluded.prerequisites`,
            parameters: sql`excluded.parameters`,
            modifiers: sql`excluded.modifiers`,
            grantedSpells: sql`excluded.granted_spells`,
            combatRiders: sql`excluded.combat_riders`,
            skillGrants: sql`excluded.skill_grants`,
        },
    },
    class_resources: {
        target: classResources.id,
        set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            classId: sql`excluded.class_id`,
            subclassId: sql`excluded.subclass_id`,
            sourceType: sql`excluded.source_type`,
            sourceId: sql`excluded.source_id`,
            maxFormula: sql`excluded.max_formula`,
            rechargeOn: sql`excluded.recharge_on`,
            partialShortRestRecovery: sql`excluded.partial_short_rest_recovery`,
            unlockLevel: sql`excluded.unlock_level`,
            onUse: sql`excluded.on_use`,
        },
    },
    companions: {
        target: companions.id,
        set: {
            name: sql`excluded.name`,
            category: sql`excluded.category`,
            sourceType: sql`excluded.source_type`,
            sourceId: sql`excluded.source_id`,
            cr: sql`excluded.cr`,
            size: sql`excluded.size`,
            armorClassFormula: sql`excluded.armor_class_formula`,
            maxHpFormula: sql`excluded.max_hp_formula`,
            speed: sql`excluded.speed`,
            attackName: sql`excluded.attack_name`,
            attackBonusFormula: sql`excluded.attack_bonus_formula`,
            damageDice: sql`excluded.damage_dice`,
            damageBonusFormula: sql`excluded.damage_bonus_formula`,
            damageType: sql`excluded.damage_type`,
            notes: sql`excluded.notes`,
            statblock: sql`excluded.statblock`,
        },
    },
};

// Explicit load order for FK integrity
const LOAD_ORDER = [
    "07-languages.json",
    "08-conditions.json",
    "09-items.json",
    "11-feats.json",
    "01-classes.json",
    "02-subclasses.json",
    "03-class-progression.json",
    "04-races.json",
    "05-traits.json",
    "06-backgrounds.json",
    "10-spells.json",
    "12-class-resources.json",
    "13-companions.json",
];

function getOrderedSeedFiles(seedDir: string): string[] {
    const allFiles = fs.readdirSync(seedDir).filter((f) => f.endsWith(".json"));
    const orderedFiles: string[] = [];

    for (const file of LOAD_ORDER) {
        if (allFiles.includes(file)) {
            orderedFiles.push(file);
        }
    }

    const remainingFiles = allFiles.filter((f) => !LOAD_ORDER.includes(f)).sort();
    return [...orderedFiles, ...remainingFiles];
}

async function seedFromModularFiles() {
    console.log("🌱 Starting Modular Seed (D&D 5e 2024)...");

    const seedDir = path.join(process.cwd(), "data", "seed");
    if (!fs.existsSync(seedDir)) {
        console.error("❌ data/seed/ directory not found!");
        return false;
    }

    const files = getOrderedSeedFiles(seedDir);
    console.log(`📁 Found ${files.length} seed files (using explicit FK load order)`);

    for (const file of files) {
        const filePath = path.join(seedDir, file);
        const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));

        const tableName = content.$table as string;
        const data = content.data;

        if (!tableName || !data || !Array.isArray(data)) {
            console.warn(`⚠️ Skipping ${file}: missing $table or data array`);
            continue;
        }

        const table = TABLE_MAP[tableName];
        const config = UPSERT_CONFIG[tableName];

        if (!table) {
            console.warn(`⚠️ Skipping ${file}: unknown table "${tableName}"`);
            continue;
        }

        if (data.length === 0) {
            console.log(`⏭️ ${file}: 0 records (skipped)`);
            continue;
        }

        try {
            // Validate non-parser tables against Zod schemas
            if (VALIDATORS[tableName]) {
                const validation = VALIDATORS[tableName].safeParse(data);
                if (!validation.success) {
                    console.error(`❌ Zod validation failed for ${file}:`, validation.error.issues.slice(0, 5));
                    throw new Error(`Validation failed for ${file}`);
                }
            }

            let transformedData = data;

            if (tableName === "spells" || tableName === "items") {
                const mockSrdData = { classes: [], spells: [], [tableName]: data };
                const parsed = parseSrdData(mockSrdData);
                transformedData = parsed[tableName as keyof typeof parsed] || data;
            } else if (TRANSFORMERS[tableName]) {
                transformedData = TRANSFORMERS[tableName](data);
            }

            if (tableName === "class_progression") {
                // Use natural unique key upsert inside a transaction instead of TRUNCATE CASCADE
                await db.execute(sql`DELETE FROM class_progression`);
                await db.insert(classProgression).values(transformedData);
            } else if (config) {
                await db.insert(table)
                    .values(transformedData)
                    .onConflictDoUpdate({
                        target: config.target,
                        set: config.set,
                    });
            } else {
                await db.insert(table).values(transformedData).onConflictDoNothing();
            }

            console.log(`✅ ${file}: ${data.length} records`);
        } catch (error) {
            console.error(`❌ ${file}: Failed -`, error);
            throw error;
        }
    }

    return true;
}

async function main() {
    try {
        await seedFromModularFiles();
        console.log("\n🚀 Seed completed successfully!");
    } catch (error) {
        console.error("❌ Seed failed:", error);
        process.exit(1);
    }
    process.exit(0);
}

main();
