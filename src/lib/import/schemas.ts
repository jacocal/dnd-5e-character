import { z } from "zod";
import { abilityEnum, sizeEnum, castingTimeEnum } from "../../db/enums";

// Helper to match Postgres Enums with Zod
// We'll use simple string validation for checking against the JSON, 
// but ensure it matches the values allowed in the DB.

export const AbilityEnumSchema = z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
export const CastingTimeEnumSchema = z.enum([
    "1 Action",
    "1 Bonus Action",
    "1 Reaction",
    "1 Minute",
    "10 Minutes",
    "1 Hour",
    "8 Hours",
    "24 Hours",
]);
export const SpellcastingTypeEnumSchema = z.enum(["full", "half", "artificer", "third", "pact", "none"]);

export const SubclassSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    spellcasting_type: SpellcastingTypeEnumSchema.optional(), // For third-casters like Arcane Trickster
});

export const ClassSchema = z.object({
    id: z.string(),
    name: z.string(),
    hit_die: z.number().int().min(4).max(12),
    saving_throws: z.array(AbilityEnumSchema),
    proficiencies: z.record(z.string(), z.any()).optional(), // { armor: [], weapons: [] }
    spellcasting_ability: AbilityEnumSchema.optional(),
    spellcasting_type: SpellcastingTypeEnumSchema.optional(), // Multiclass slot calculation type
    subclasses: z.array(SubclassSchema).optional(),
});

export const SpellComponentsSchema = z.object({
    v: z.boolean(),
    s: z.boolean(),
    m: z.boolean(),
    material_description: z.string().optional(),
});

export const SpellDurationSchema = z.object({
    type: z.enum(["instant", "concentration", "timed", "special", "permanent"]),
    value: z.number().optional(),
    unit: z.enum(["round", "minute", "hour", "day"]).optional(),
});

export const SpellSchema = z.object({
    id: z.string(),
    name: z.string(),
    level: z.number().int().min(0).max(9),
    school: z.string(),
    casting_time: CastingTimeEnumSchema,
    range: z.string(),
    // Allow string input for backward compatibility during parse transform
    components: z.union([z.string(), SpellComponentsSchema]),
    duration: z.union([z.string(), SpellDurationSchema]),
    is_ritual: z.boolean().default(false),
    is_concentration: z.boolean().default(false),
    description: z.string(),
    classes: z.array(z.string()),
    tags: z.array(z.string()).optional(),
});

export const ModifierSchema = z.object({
    type: z.enum([
        'bonus', 'set', 'override', 'proficiency', 'language', 'expertise', 'skill_proficiency',
        // New modifier types
        'ability_increase', 'saving_throw_proficiency', 'armor_proficiency', 'weapon_proficiency'
    ]),
    target: z.string(), // e.g. 'str', 'ac', 'athletics', 'light' (for armor), 'longsword' (for weapon)
    value: z.union([z.number(), z.boolean(), z.string()]),
    condition: z.string().optional(),
    max: z.number().optional() // Maximum cap for ability_increase modifiers (e.g., 20)
});

export const ItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    cost: z.string(),
    weight: z.string().optional(),
    fixed_weight: z.boolean().optional(),
    description: z.string().optional(),
    modifiers: z.array(ModifierSchema).optional(),

    // Combat & Equipment Stats
    damage_dice: z.string().optional(),
    damage_type: z.string().optional(),
    armor_class: z.number().optional(),
    strength_requirement: z.number().optional(),
    stealth_disadvantage: z.boolean().optional(),
    properties: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    rarity: z.string().optional(),
    slot: z.string().optional(),
    range: z.string().optional(),

    // Magic Item Properties
    is_magical: z.boolean().optional(),
    is_cursed: z.boolean().optional(),
    requires_attunement: z.boolean().optional(),
    true_name: z.string().optional(), // Revealed after identification
    shown_effect: z.string().optional(), // Displayed before identification
    true_effect: z.string().optional(), // Revealed after identification

    // Consumable Properties
    uses: z.number().optional(), // Max uses for charge-based items
    uses_max: z.number().optional(), // Maximum uses
});


export const TraitSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    race: z.string().optional(),
    parameters: z.record(z.string(), z.any()).optional(),
    modifiers: z.array(ModifierSchema).optional(),
});

export const RaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    trait_options: z.record(z.string(), z.any()).optional(),
    modifiers: z.array(ModifierSchema).optional(),
});

export const FeatSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    prerequisites: z.string().optional(),
    parameters: z.record(z.string(), z.any()).optional(),
    modifiers: z.array(ModifierSchema).optional(),
});

// ... existing schemas

export const LanguageSchema = z.object({
    id: z.string(),
    name: z.string(),
    script: z.string().nullable().optional(),
    type: z.string(),
    description: z.string().optional(),
});

export const ConditionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    modifiers: z.array(ModifierSchema).optional(),
});

export const BackgroundSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    ability_options: z.array(AbilityEnumSchema).length(3), // 2024 rules: exactly 3 abilities
    modifiers: z.array(ModifierSchema).optional(),
    features: z.array(z.object({
        name: z.string(),
        description: z.string()
    })).optional(),
    starting_equipment: z.array(z.string()).optional()
});

export const ResourceEffectSchema = z.object({
    type: z.enum(['grant_hp']),
    mode: z.enum(['temporary', 'bonus']), // 'temporary' = standard 5e, 'bonus' = healable + max hp boost
    formula: z.string(),
    duration: z.enum(['long_rest', 'short_rest', 'permanent']).optional()
});

export const ClassResourceSchema = z.object({
    id: z.string(),
    class_id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    max_formula: z.string(), // "proficiency", "level", "cha_mod", "1", etc.
    recharge_on: z.enum(["short", "long"]),
    unlock_level: z.number().int().min(1).max(20).default(1),
    onUse: z.array(ResourceEffectSchema).optional()
});

export const SrdDataSchema = z.object({

    classes: z.array(ClassSchema),
    spells: z.array(SpellSchema),
    items: z.array(ItemSchema).optional().default([]),
    races: z.array(RaceSchema).optional().default([]),
    traits: z.array(TraitSchema).optional().default([]),
    feats: z.array(FeatSchema).optional().default([]),
    languages: z.array(LanguageSchema).optional().default([]),
    conditions: z.array(ConditionSchema).optional().default([]),
    backgrounds: z.array(BackgroundSchema).optional().default([]),
});

export type SrdData = z.infer<typeof SrdDataSchema>;
