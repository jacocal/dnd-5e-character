import { SrdDataSchema } from "./schemas";
import { classes, subclasses, spells, items, races, feats, traits, backgrounds } from "../../db/schema";
import { InferInsertModel } from "drizzle-orm";

type ClassInsert = InferInsertModel<typeof classes>;
type SubclassInsert = InferInsertModel<typeof subclasses>;
type SpellInsert = InferInsertModel<typeof spells>;
type ItemInsert = InferInsertModel<typeof items>;
type RaceInsert = InferInsertModel<typeof races>;
type TraitInsert = InferInsertModel<typeof traits>;
type FeatInsert = InferInsertModel<typeof feats>;
type BackgroundInsert = InferInsertModel<typeof backgrounds>;

export function parseSrdData(rawData: unknown) {
    const result = SrdDataSchema.safeParse(rawData);
    if (!result.success) {
        console.error("Validation Errors:", result.error.issues);
        throw new Error("Invalid SRD Data format.");
    }

    const data = result.data;
    const classesToInsert: ClassInsert[] = [];
    const subclassesToInsert: SubclassInsert[] = [];
    const spellsToInsert: SpellInsert[] = [];

    // 2. Transform Classes (preserving all 2024 fields)
    for (const c of data.classes) {
        classesToInsert.push({
            id: c.id,
            name: c.name,
            hitDie: c.hit_die,
            savingThrows: c.saving_throws,
            proficiencies: c.proficiencies,
            spellcastingAbility: c.spellcasting_ability ?? null,
            spellcastingType: c.spellcasting_type || "none",
            spellPrepMode: c.spell_prep_mode || "none",
            skillOptions: c.skill_options ?? null,
            startingEquipmentOptions: c.starting_equipment_options ?? null,
            combatRiders: c.combat_riders || [],
        });

        if (c.subclasses) {
            for (const sc of c.subclasses) {
                subclassesToInsert.push({
                    id: sc.id,
                    classId: c.id,
                    name: sc.name,
                    description: sc.description,
                    ...(sc.spellcasting_type ? { spellcastingType: sc.spellcasting_type } : {}),
                    grantedSpells: sc.granted_spells || {},
                    combatRiders: sc.combat_riders || [],
                });
            }
        }
    }

    // 3. Transform Spells
    for (const s of data.spells) {
        let componentsJson = {
            v: false,
            s: false,
            m: false,
            material_description: undefined as string | undefined,
        };

        if (typeof s.components === "string") {
            componentsJson.v = s.components.includes("V");
            componentsJson.s = s.components.includes("S");
            componentsJson.m = s.components.includes("M");

            const match = s.components.match(/\(([^)]+)\)/);
            if (match) {
                componentsJson.material_description = match[1];
            }
        } else {
            componentsJson = s.components as typeof componentsJson;
        }

        const isRitual = (typeof s.components === "string" && s.components.toLowerCase().includes("ritual")) || false;

        let durationJson = {
            type: "instant",
            value: undefined as number | undefined,
            unit: undefined as string | undefined,
        };
        let isConcentration = false;

        if (typeof s.duration === "string") {
            const lowerDur = s.duration.toLowerCase();
            isConcentration = lowerDur.includes("concentration");

            if (lowerDur.includes("instantaneous")) {
                durationJson.type = "instant";
            } else if (lowerDur.includes("special")) {
                durationJson.type = "special";
            } else if (lowerDur.includes("until dispelled") || lowerDur.includes("permanent")) {
                durationJson.type = "permanent";
            } else {
                durationJson.type = isConcentration ? "concentration" : "timed";
                const timeMatch = lowerDur.match(/(\d+)\s*(round|minute|hour|day)/);
                if (timeMatch) {
                    durationJson.value = parseInt(timeMatch[1], 10);
                    durationJson.unit = timeMatch[2];
                }
            }
        } else {
            durationJson = s.duration as typeof durationJson;
            isConcentration = durationJson.type === "concentration";
        }

        spellsToInsert.push({
            id: s.id,
            name: s.name,
            level: s.level,
            school: s.school,
            castingTime: s.casting_time,
            castingTimeTrigger: s.casting_time_trigger ?? null,
            range: s.range,
            components: componentsJson,
            duration: durationJson,
            isRitual: s.is_ritual || isRitual,
            isConcentration: s.is_concentration || isConcentration,
            description: s.description,
            classes: s.classes,
            tags: s.tags || [],
            mechanics: s.mechanics || null,
        });
    }

    // 4. Transform Items
    const rawItems = data.items || [];
    const itemsToInsert: ItemInsert[] = rawItems.map((item) => {
        let costAmount = 0;
        let costCurrency = "gp";
        if (item.cost) {
            const match = item.cost.match(/(\d+)\s*([a-z]+)/i);
            if (match) {
                costAmount = parseInt(match[1], 10);
                costCurrency = match[2].toLowerCase();
            }
        }

        let weightAmount = 0;
        if (item.weight) {
            const match = item.weight.match(/(\d*\.?\d+)/);
            if (match) {
                weightAmount = parseFloat(match[1]);
            }
        }

        let category = "misc";
        let slot: string | undefined;
        let armorClass: number | undefined;
        let damageDice: string | undefined;
        let damageType: string | undefined;
        const properties: string[] = [];
        const tags: string[] = [];
        let stealthDisadvantage = false;
        let strengthRequirement: number | undefined;

        const lowerType = item.type.toLowerCase();
        const desc = item.description || "";

        if (lowerType.includes("weapon")) {
            category = "weapon";
            slot = lowerType.includes("two-handed") ? "two_handed" : "main_hand";

            if (lowerType.includes("simple")) tags.push("weapon:simple");
            if (lowerType.includes("martial")) tags.push("weapon:martial");
            if (lowerType.includes("improvised")) tags.push("weapon:improvised");
            if (lowerType.includes("melee")) tags.push("weapon:melee");
            if (lowerType.includes("ranged")) tags.push("weapon:ranged");

            const damageMatch = desc.match(/(\d+d\d+)/);
            if (damageMatch) damageDice = damageMatch[1];

            if (desc.includes("slashing")) damageType = "slashing";
            else if (desc.includes("piercing")) damageType = "piercing";
            else if (desc.includes("bludgeoning")) damageType = "bludgeoning";

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

            if (lowerType.includes("light")) tags.push("armor:light");
            if (lowerType.includes("medium")) tags.push("armor:medium");
            if (lowerType.includes("heavy")) tags.push("armor:heavy");

            const acMatch = desc.match(/(?:AC\s*)?(\d+)/);
            if (acMatch) armorClass = parseInt(acMatch[1], 10);

            if (desc.toLowerCase().includes("stealth")) stealthDisadvantage = true;

            const strMatch = desc.match(/Str (\d+)/);
            if (strMatch) strengthRequirement = parseInt(strMatch[1], 10);
        } else if (lowerType.includes("potion") || lowerType.includes("scroll") || lowerType.includes("consumable")) {
            category = "consumable";
        } else if (lowerType.includes("tool")) {
            category = "tool";
        } else if (lowerType.includes("ammunition")) {
            category = "ammunition";
        } else if (lowerType.includes("wondrous") || lowerType.includes("ring")) {
            category = "magic_item";
        } else if (lowerType.includes("gear")) {
            category = "gear";
        } else if (lowerType.includes("treasure") || lowerType.includes("gem") || lowerType.includes("art object")) {
            category = "treasure";
        }

        const isMagical = item.is_magical ?? (
            lowerType.includes("magic") ||
            lowerType.includes("wondrous") ||
            lowerType.includes("ring") ||
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
            fixedWeight: item.fixed_weight ?? false,
            category: item.category || category,
            slot: item.slot || slot,
            armorClass: item.armor_class ?? armorClass,
            strengthRequirement: item.strength_requirement ?? strengthRequirement,
            stealthDisadvantage: item.stealth_disadvantage ?? stealthDisadvantage,
            damageDice: item.damage_dice || damageDice,
            versatileDice: item.versatile_dice || null,
            damageType: item.damage_type || damageType,
            weaponMastery: item.weapon_mastery || null,
            range: item.range || null,
            properties: item.properties && item.properties.length > 0 ? item.properties : properties,
            tags: item.tags && item.tags.length > 0 ? item.tags : tags,
            rarity: item.rarity || "common",
            requiresAttunement: item.requires_attunement ?? false,
            description: item.description,
            modifiers: item.modifiers,
            isMagical: Boolean(isMagical),
            isCursed: item.is_cursed ?? false,
            trueName: item.true_name,
            shownEffect: item.shown_effect,
            trueEffect: item.true_effect,
            uses: item.uses,
            usesMax: item.uses_max,
        };
    });

    const racesToInsert: RaceInsert[] = (data.races || []).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        traitOptions: r.trait_options,
        modifiers: r.modifiers,
    }));

    const traitsToInsert: TraitInsert[] = (data.traits || []).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        race: t.race ?? null,
        parameters: t.parameters,
        modifiers: t.modifiers,
        grantedSpells: t.granted_spells || {},
        combatRiders: t.combat_riders || [],
    }));

    const featsToInsert: FeatInsert[] = (data.feats || []).map((f) => ({
        id: f.id,
        name: f.name,
        category: f.category || "general",
        repeatable: f.repeatable ?? false,
        description: f.description,
        prerequisites: f.prerequisites ?? null,
        parameters: f.parameters,
        modifiers: f.modifiers,
        grantedSpells: f.granted_spells || {},
        combatRiders: f.combat_riders || [],
        skillGrants: f.skill_grants ?? null,
    }));

    const backgroundsToInsert: BackgroundInsert[] = (data.backgrounds || []).map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        abilityOptions: b.ability_options,
        modifiers: b.modifiers,
        features: b.features,
        startingEquipment: b.starting_equipment,
        originFeatId: b.origin_feat_id ?? null,
        originFeatClass: b.origin_feat_class ?? null,
        toolProficiencies: b.tool_proficiencies ?? null,
        startingEquipmentOptions: b.starting_equipment_options ?? null,
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
