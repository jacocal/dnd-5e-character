import { SrdData, SrdDataSchema } from "./schemas";
import { classes, subclasses, spells, items, races, feats, traits, backgrounds } from "../../db/schema";
import { InferInsertModel } from "drizzle-orm";

// Types derived from Drizzle Schema
type ClassInsert = InferInsertModel<typeof classes>;
type SubclassInsert = InferInsertModel<typeof subclasses>;
type SpellInsert = InferInsertModel<typeof spells>;
type ItemInsert = InferInsertModel<typeof items>;
type RaceInsert = InferInsertModel<typeof races>;
type TraitInsert = InferInsertModel<typeof traits>;
type FeatInsert = InferInsertModel<typeof feats>;
type BackgroundInsert = InferInsertModel<typeof backgrounds>;

export function parseSrdData(rawData: unknown) {
    // 1. Validate JSON against Zod Schema
    const result = SrdDataSchema.safeParse(rawData);
    if (!result.success) {
        console.error("Validation Errors:", result.error.issues);
        throw new Error("Invalid SRD Data format.");
    }

    const data = result.data;
    const classesToInsert: ClassInsert[] = [];
    const subclassesToInsert: SubclassInsert[] = [];
    const spellsToInsert: SpellInsert[] = [];

    // 2. Transform Classes
    for (const c of data.classes) {
        classesToInsert.push({
            id: c.id,
            name: c.name,
            hitDie: c.hit_die,
            savingThrows: c.saving_throws,
            proficiencies: c.proficiencies,
            spellcastingAbility: c.spellcasting_ability,
            spellcastingType: c.spellcasting_type || 'none',
        });

        if (c.subclasses) {
            for (const sc of c.subclasses) {
                subclassesToInsert.push({
                    id: sc.id,
                    classId: c.id, // Foreign Key
                    name: sc.name,
                    description: sc.description,
                    // Only set spellcastingType if explicitly provided (for third-casters)
                    ...(sc.spellcasting_type && { spellcastingType: sc.spellcasting_type }),
                });
            }
        }
    }

    // 3. Transform Spells
    for (const s of data.spells) {
        // --- Parse Components ---
        let componentsJson = {
            v: false,
            s: false,
            m: false,
            material_description: undefined as string | undefined
        };

        if (typeof s.components === 'string') {
            componentsJson.v = s.components.includes('V');
            componentsJson.s = s.components.includes('S');
            componentsJson.m = s.components.includes('M');

            const match = s.components.match(/\(([^)]+)\)/);
            if (match) {
                componentsJson.material_description = match[1];
            }
        } else {
            // Already structured (future proofing)
            componentsJson = s.components as any;
        }

        const isRitual = (typeof s.components === 'string' && s.components.toLowerCase().includes('ritual')) || false;

        // --- Parse Duration ---
        let durationJson = {
            type: "instant",
            value: undefined as number | undefined,
            unit: undefined as string | undefined
        };
        let isConcentration = false;

        if (typeof s.duration === 'string') {
            const lowerDur = s.duration.toLowerCase();
            isConcentration = lowerDur.includes('concentration');

            if (lowerDur.includes('instantaneous')) {
                durationJson.type = 'instant';
            } else if (lowerDur.includes('special')) {
                durationJson.type = 'special';
            } else if (lowerDur.includes('until dispelled') || lowerDur.includes('permanent')) {
                durationJson.type = 'permanent';
            } else {
                // Time Span: "1 Minute", "8 Hours"
                if (isConcentration) {
                    durationJson.type = 'concentration';
                } else {
                    durationJson.type = 'timed';
                }

                const timeMatch = lowerDur.match(/(\d+)\s*(round|minute|hour|day)/);
                if (timeMatch) {
                    durationJson.value = parseInt(timeMatch[1]);
                    durationJson.unit = timeMatch[2] as any;
                }
            }
        } else {
            // Already structured
            durationJson = s.duration as any;
            isConcentration = durationJson.type === 'concentration';
        }

        spellsToInsert.push({
            id: s.id,
            name: s.name,
            level: s.level,
            school: s.school,
            castingTime: s.casting_time,
            range: s.range,
            components: componentsJson,
            duration: durationJson,
            isRitual: isRitual,
            isConcentration: isConcentration,
            description: s.description,
            classes: s.classes,
            tags: s.tags || [],
        });
    }

    // 4. Transform Items
    const rawItems = data.items || []; // Using data.items directly as it's typed by Zod
    const itemsToInsert: ItemInsert[] = rawItems.map((item) => {
        // Parse Cost: "15 gp" -> 15, "gp"
        let costAmount = 0;
        let costCurrency = "gp";
        if (item.cost) {
            const match = item.cost.match(/(\d+)\s*([a-z]+)/i);
            if (match) {
                costAmount = parseInt(match[1]);
                costCurrency = match[2].toLowerCase(); // gp, sp, cp
            }
        }

        // Parse Weight: "3 lb." -> 3
        let weightAmount = 0;
        if (item.weight) {
            const match = item.weight.match(/(\d*\.?\d+)/);
            if (match) {
                weightAmount = parseFloat(match[1]);
            }
        }

        // Initialize new fields
        let category = "misc";
        let slot: string | undefined;
        let armorClass: number | undefined;
        let damageDice: string | undefined;
        let damageType: string | undefined;
        let properties: string[] = [];
        let tags: string[] = []; // New Tags
        let stealthDisadvantage = false;
        let strengthRequirement: number | undefined;

        const lowerType = item.type.toLowerCase();
        const desc = item.description || "";

        // Determine Category & Slot & Tags
        if (lowerType.includes("weapon")) {
            category = "weapon";
            slot = lowerType.includes("two-handed") ? "two_handed" : "main_hand";

            // Weapon Tags
            if (lowerType.includes("simple")) tags.push("weapon:simple");
            if (lowerType.includes("martial")) tags.push("weapon:martial");
            if (lowerType.includes("improvised")) tags.push("weapon:improvised");
            if (lowerType.includes("melee")) tags.push("weapon:melee");
            if (lowerType.includes("ranged")) tags.push("weapon:ranged");

            // Parse Damage: "1d8 slashing" or "Versatile (1d10)"
            const damageMatch = desc.match(/(\d+d\d+)/);
            if (damageMatch) damageDice = damageMatch[1];

            if (desc.includes("slashing")) damageType = "slashing";
            else if (desc.includes("piercing")) damageType = "piercing";
            else if (desc.includes("bludgeoning")) damageType = "bludgeoning";

            // Parse Properties
            if (desc.toLowerCase().includes("finesse")) properties.push("finesse");
            if (desc.toLowerCase().includes("light")) properties.push("light");
            if (desc.toLowerCase().includes("thrown")) properties.push("thrown");
            if (desc.toLowerCase().includes("versatile")) properties.push("versatile");

        } else if (lowerType.includes("armor") || lowerType.includes("shield")) {
            if (lowerType.includes("shield")) {
                category = "armor";
                slot = "off_hand";
                tags.push("armor:shield");
            } else {
                category = "armor";
                slot = "chest";
            }

            // Armor Tags
            if (lowerType.includes("light")) tags.push("armor:light");
            if (lowerType.includes("medium")) tags.push("armor:medium");
            if (lowerType.includes("heavy")) tags.push("armor:heavy");

            // Parse AC: "AC 18" or "11 + Dex modifier"
            const acMatch = desc.match(/(?:AC\s*)?(\d+)/);
            if (acMatch) armorClass = parseInt(acMatch[1]);

            if (desc.toLowerCase().includes("stealth")) stealthDisadvantage = true;

            const strMatch = desc.match(/Str (\d+)/);
            if (strMatch) strengthRequirement = parseInt(strMatch[1]);

        } else if (lowerType.includes("potion") || lowerType.includes("scroll")) {
            category = "consumable";
        } else if (lowerType.includes("treasure") || lowerType.includes("gem") || lowerType.includes("art object")) {
            category = "treasure";
        }

        // Determine if item is magical (explicit flag or from type/name)
        const isMagical = item.is_magical ?? (
            lowerType.includes("magic") ||
            item.name.includes("+") ||
            (item.modifiers && item.modifiers.length > 0)
        );

        return {
            id: item.id,
            name: item.name,
            type: item.type,
            costAmount,
            costCurrency,
            weightAmount,
            weightUnit: "lb",
            fixedWeight: item.fixed_weight,
            category,
            slot,
            armorClass,
            strengthRequirement,
            stealthDisadvantage,
            damageDice,
            damageType,
            properties,
            tags, // Added tags
            description: item.description,
            modifiers: item.modifiers,
            // Magic Item Properties
            isMagical: isMagical,
            isCursed: item.is_cursed ?? false,
            trueName: item.true_name,
            shownEffect: item.shown_effect,
            trueEffect: item.true_effect,
            // Consumable Properties
            uses: item.uses,
            usesMax: item.uses_max,
        };
    });

    // 5. Transform Races
    const racesToInsert: RaceInsert[] = (data.races || []).map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        traitOptions: r.trait_options,
        modifiers: r.modifiers
    }));

    // 6. Transform Traits
    const traitsToInsert: TraitInsert[] = (data.traits || []).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        race: t.race,
        parameters: t.parameters,
        modifiers: t.modifiers,
    }));

    // 7. Transform Feats
    const featsToInsert: FeatInsert[] = (data.feats || []).map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        prerequisites: f.prerequisites,
        parameters: f.parameters,
        modifiers: f.modifiers,
    }));

    // 8. Transform Backgrounds
    const backgroundsToInsert: BackgroundInsert[] = (data.backgrounds || []).map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        abilityOptions: b.ability_options, // 2024 rules: 3 allowed abilities
        modifiers: b.modifiers,
        features: b.features,
        startingEquipment: b.starting_equipment
    }));

    return {
        classes: classesToInsert,
        subclasses: subclassesToInsert,
        spells: spellsToInsert,
        items: itemsToInsert,
        races: racesToInsert,
        traits: traitsToInsert,
        feats: featsToInsert,
        backgrounds: backgroundsToInsert,
    };
}
