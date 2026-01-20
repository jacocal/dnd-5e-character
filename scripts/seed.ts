import { db } from "../src/db";
import {
    classes, subclasses, classProgression, spells, items, races,
    traits, feats, languages, conditions, backgrounds, classResources
} from "../src/db/schema";
import { parseSrdData } from "../src/lib/import/parser";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

// Table mapping for file-based seeding
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
};

// Transform functions: JSON snake_case -> Drizzle camelCase
const TRANSFORMERS: Record<string, (data: any[]) => any[]> = {
    classes: (data) => data.map(c => ({
        id: c.id,
        name: c.name,
        hitDie: c.hit_die,
        savingThrows: c.saving_throws,
        proficiencies: c.proficiencies,
        spellcastingAbility: c.spellcasting_ability,
        spellcastingType: c.spellcasting_type || 'none',
        skillOptions: c.skill_options,
        startingEquipmentOptions: c.starting_equipment_options,
    })),
    subclasses: (data) => data.map(s => ({
        id: s.id,
        classId: s.class_id,
        name: s.name,
        description: s.description,
        spellcastingType: s.spellcasting_type,
    })),
    class_progression: (data) => data.map(p => ({
        classId: p.classId,
        subclassId: p.subclassId || null,
        level: p.level,
        proficiencyBonus: p.proficiencyBonus,
        spellSlots: p.spellSlots || {},
        features: p.features || [],
        hasAsi: p.hasAsi || false,
    })),
    races: (data) => data.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        traitOptions: r.trait_options,
        modifiers: r.modifiers,
    })),
    traits: (data) => data.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        race: t.race,
        parameters: t.parameters,
        modifiers: t.modifiers,
    })),
    backgrounds: (data) => data.map(b => ({
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
    languages: (data) => data, // Already correct format
    conditions: (data) => data, // Already correct format
    feats: (data) => data, // Already correct format
    class_resources: (data) => data.map(r => ({
        id: r.id,
        classId: r.class_id,
        name: r.name,
        description: r.description,
        maxFormula: r.max_formula,
        rechargeOn: r.recharge_on,
        unlockLevel: r.unlock_level || 1,
        onUse: r.onUse,
    })),
};

// Upsert configurations per table
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
            skillOptions: sql`excluded.skill_options`,
            startingEquipmentOptions: sql`excluded.starting_equipment_options`
        }
    },
    subclasses: {
        target: subclasses.id,
        set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            classId: sql`excluded.class_id`,
            spellcastingType: sql`excluded.spellcasting_type`
        }
    },
    races: {
        target: races.id,
        set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            traitOptions: sql`excluded.trait_options`
        }
    },
    traits: {
        target: traits.id,
        set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            race: sql`excluded.race`,
            parameters: sql`excluded.parameters`
        }
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
            startingEquipmentOptions: sql`excluded.starting_equipment_options`
        }
    },
    languages: {
        target: languages.id,
        set: {
            name: sql`excluded.name`,
            script: sql`excluded.script`,
            type: sql`excluded.type`,
            description: sql`excluded.description`
        }
    },
    conditions: {
        target: conditions.id,
        set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            modifiers: sql`excluded.modifiers`
        }
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
            category: sql`excluded.category`,
            slot: sql`excluded.slot`,
            armorClass: sql`excluded.armor_class`,
            strengthRequirement: sql`excluded.strength_requirement`,
            stealthDisadvantage: sql`excluded.stealth_disadvantage`,
            damageDice: sql`excluded.damage_dice`,
            damageType: sql`excluded.damage_type`,
            properties: sql`excluded.properties`,
            tags: sql`excluded.tags`,
            rarity: sql`excluded.rarity`,
            requiresAttunement: sql`excluded.requires_attunement`,
            description: sql`excluded.description`
        }
    },
    spells: {
        target: spells.id,
        set: {
            name: sql`excluded.name`,
            level: sql`excluded.level`,
            school: sql`excluded.school`,
            castingTime: sql`excluded.casting_time`,
            range: sql`excluded.range`,
            components: sql`excluded.components`,
            duration: sql`excluded.duration`,
            isRitual: sql`excluded.is_ritual`,
            isConcentration: sql`excluded.is_concentration`,
            description: sql`excluded.description`,
            tags: sql`excluded.tags`,
            classes: sql`excluded.classes`
        }
    },
    feats: {
        target: feats.id,
        set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            prerequisites: sql`excluded.prerequisites`,
            parameters: sql`excluded.parameters`,
            modifiers: sql`excluded.modifiers`
        }
    },
    class_resources: {
        target: classResources.id,
        set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            classId: sql`excluded.class_id`,
            maxFormula: sql`excluded.max_formula`,
            rechargeOn: sql`excluded.recharge_on`,
            unlockLevel: sql`excluded.unlock_level`,
            onUse: sql`excluded.on_use`
        }
    }
};


// Define explicit load order (items/feats before classes/backgrounds for FK integrity)
const LOAD_ORDER = [
    '07-languages.json',
    '08-conditions.json',
    '09-items.json',      // Items first - needed for starting equipment
    '11-feats.json',      // Feats before backgrounds - needed for origin feats
    '01-classes.json',
    '02-subclasses.json',
    '03-class-progression.json',
    '04-races.json',
    '05-traits.json',
    '06-backgrounds.json', // Backgrounds after items/feats
    '10-spells.json',
    '12-class-resources.json'
];

// Get files in explicit order, falling back to alphabetical for any new files
function getOrderedSeedFiles(seedDir: string): string[] {
    const allFiles = fs.readdirSync(seedDir)
        .filter(f => f.endsWith(".json"));

    const orderedFiles: string[] = [];

    // Add files in explicit order
    for (const file of LOAD_ORDER) {
        if (allFiles.includes(file)) {
            orderedFiles.push(file);
        }
    }

    // Add any remaining files not in explicit order (sorted alphabetically)
    const remainingFiles = allFiles
        .filter(f => !LOAD_ORDER.includes(f))
        .sort();

    return [...orderedFiles, ...remainingFiles];
}

async function seedFromModularFiles() {
    console.log("🌱 Starting Modular Seed...");

    const seedDir = path.join(process.cwd(), "data", "seed");

    if (!fs.existsSync(seedDir)) {
        console.error("❌ data/seed/ directory not found!");
        return false;
    }

    // Get all JSON files in explicit load order (for FK integrity)
    const files = getOrderedSeedFiles(seedDir);

    console.log(`📁 Found ${files.length} seed files (using explicit load order)`);

    for (const file of files) {
        const filePath = path.join(seedDir, file);
        const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));

        const tableName = content.$table;
        const data = content.data;

        if (!tableName || !data || !Array.isArray(data)) {
            console.warn(`⚠️ Skipping ${file}: missing $table or data array`);
            continue;
        }

        // Truncate class_progression before insert (no PK for upsert)
        if (tableName === "class_progression") {
            await db.execute(sql`TRUNCATE TABLE class_progression CASCADE`);
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
            // Transform data using table-specific transformer
            let transformedData = data;

            if (tableName === "spells" || tableName === "items") {
                // Use existing parser for complex transformations
                const mockSrdData = { classes: [], spells: [], [tableName]: data };
                const parsed = parseSrdData(mockSrdData);
                transformedData = parsed[tableName as keyof typeof parsed] || data;
            } else if (TRANSFORMERS[tableName]) {
                // Use simple transformer
                transformedData = TRANSFORMERS[tableName](data);
            }

            if (config) {
                await db.insert(table)
                    .values(transformedData)
                    .onConflictDoUpdate({
                        target: config.target,
                        set: config.set
                    });
            } else {
                await db.insert(table).values(transformedData).onConflictDoNothing();
            }

            console.log(`✅ ${file}: ${data.length} records`);
        } catch (error) {
            console.error(`❌ ${file}: Failed -`, error);
            throw error; // Stop on first error for debugging
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

