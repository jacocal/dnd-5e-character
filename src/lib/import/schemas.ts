import { z } from "zod";

// Helper to match Postgres Enums with Zod
export const AbilityEnumSchema = z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
export const CastingTimeEnumSchema = z.enum([
    "1 Action",
    "1 Bonus Action",
    "1 Reaction",
    "1 Minute",
    "10 Minutes",
    "1 Hour",
    "8 Hours",
    "12 Hours",
    "24 Hours",
    "Special",
]);
export const SpellcastingTypeEnumSchema = z.enum(["full", "half", "artificer", "third", "pact", "none"]);
export const FeatCategoryEnumSchema = z.enum(["origin", "general", "fighting_style", "epic_boon"]);

export const SubclassSchema = z.object({
    id: z.string(),
    class_id: z.string().optional(),
    name: z.string(),
    description: z.string(),
    spellcasting_type: SpellcastingTypeEnumSchema.nullable().optional(),
    granted_spells: z.record(z.string(), z.array(z.string())).optional(),
    combat_riders: z.array(z.any()).optional(),
});

export const ClassSchema = z.object({
    id: z.string(),
    name: z.string(),
    hit_die: z.number().int().min(4).max(12),
    saving_throws: z.array(AbilityEnumSchema),
    proficiencies: z.record(z.string(), z.any()).optional(),
    spellcasting_ability: AbilityEnumSchema.nullable().optional(),
    spellcasting_type: SpellcastingTypeEnumSchema.optional(),
    spell_prep_mode: z.string().optional(),
    skill_options: z.record(z.string(), z.any()).optional(),
    starting_equipment_options: z.record(z.string(), z.any()).optional(),
    combat_riders: z.array(z.any()).optional(),
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
    casting_time_trigger: z.string().nullable().optional(),
    range: z.string(),
    components: z.union([z.string(), SpellComponentsSchema]),
    duration: z.union([z.string(), SpellDurationSchema]),
    is_ritual: z.boolean().default(false),
    is_concentration: z.boolean().default(false),
    description: z.string(),
    classes: z.array(z.string()),
    tags: z.array(z.string()).optional(),
    mechanics: z.record(z.string(), z.any()).optional(),
});

export const ModifierSchema = z.object({
    type: z.enum([
        "bonus", "set", "override", "proficiency", "language", "expertise", "skill_proficiency",
        "ability_increase", "ability_point_grant", "saving_throw_proficiency",
        "armor_proficiency", "weapon_proficiency", "tool_proficiency",
        "damage_resistance", "damage_immunity", "damage_vulnerability", "condition_immunity",
    ]),
    target: z.string(),
    value: z.union([z.number(), z.boolean(), z.string()]),
    condition: z.string().optional(),
    formula: z.string().optional(),
    duration: z.string().optional(),
    max: z.number().optional(),
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
    versatile_dice: z.string().optional(),
    damage_type: z.string().optional(),
    weapon_mastery: z.string().optional(),
    armor_class: z.number().optional(),
    strength_requirement: z.number().optional(),
    stealth_disadvantage: z.boolean().optional(),
    properties: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    rarity: z.string().optional(),
    slot: z.string().optional(),
    range: z.string().optional(),
    category: z.string().optional(),

    // Magic Item Properties
    is_magical: z.boolean().optional(),
    is_cursed: z.boolean().optional(),
    requires_attunement: z.boolean().optional(),
    true_name: z.string().optional(),
    shown_effect: z.string().optional(),
    true_effect: z.string().optional(),

    // Consumable Properties
    uses: z.number().optional(),
    uses_max: z.number().optional(),
});

export const TraitSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    race: z.string().nullable().optional(),
    parameters: z.record(z.string(), z.any()).optional(),
    modifiers: z.array(ModifierSchema).optional(),
    granted_spells: z.record(z.string(), z.array(z.string())).optional(),
    combat_riders: z.array(z.any()).optional(),
});

export const RaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    trait_options: z.union([z.array(z.string()), z.record(z.string(), z.any())]).optional(),
    modifiers: z.array(ModifierSchema).optional(),
});

export const FeatSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: FeatCategoryEnumSchema.optional(),
    repeatable: z.boolean().optional(),
    description: z.string(),
    prerequisites: z.string().nullable().optional(),
    parameters: z.record(z.string(), z.any()).optional(),
    modifiers: z.array(ModifierSchema).optional(),
    granted_spells: z.record(z.string(), z.array(z.string())).optional(),
    combat_riders: z.array(z.any()).optional(),
    skill_grants: z.record(z.string(), z.any()).nullable().optional(),
});

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
    modifiers: z.array(ModifierSchema).nullable().optional(),
});

export const BackgroundSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    ability_options: z.array(AbilityEnumSchema).length(3), // 2024 rules: exactly 3 abilities
    modifiers: z.array(ModifierSchema).optional(),
    features: z.array(z.object({
        name: z.string(),
        description: z.string(),
    })).optional(),
    starting_equipment: z.array(z.string()).optional(),
    origin_feat_id: z.string().nullable().optional(),
    origin_feat_class: z.string().nullable().optional(),
    tool_proficiencies: z.record(z.string(), z.any()).optional(),
    starting_equipment_options: z.record(z.string(), z.any()).optional(),
});

export const ResourceEffectSchema = z.object({
    type: z.string(),
    target: z.string().optional(),
    mode: z.enum(["temporary", "bonus"]).optional(),
    formula: z.string().optional(),
    value: z.union([z.boolean(), z.number(), z.string()]).optional(),
    condition: z.string().optional(),
    duration: z.string().optional(),
});

export const ClassResourceSchema = z.object({
    id: z.string(),
    class_id: z.string().nullable().optional(),
    subclass_id: z.string().nullable().optional(),
    source_type: z.enum(["class", "subclass", "species", "feat"]).optional().default("class"),
    source_id: z.string().nullable().optional(),
    name: z.string(),
    description: z.string().optional(),
    max_formula: z.string(),
    recharge_on: z.enum(["short", "long"]),
    partial_short_rest_recovery: z.number().int().min(0).optional().default(0),
    unlock_level: z.number().int().min(1).max(20).default(1),
    onUse: z.array(ResourceEffectSchema).optional(),
});

export const CompanionSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    source_type: z.string().nullable().optional(),
    source_id: z.string().nullable().optional(),
    cr: z.number().optional().default(0),
    size: z.string().optional().default("Medium"),
    armor_class_formula: z.string(),
    max_hp_formula: z.string(),
    speed: z.string(),
    attack_name: z.string(),
    attack_bonus_formula: z.string().nullable().optional(),
    damage_dice: z.string(),
    damage_bonus_formula: z.string().nullable().optional(),
    damage_type: z.string(),
    notes: z.string().optional().default(""),
    statblock: z.record(z.string(), z.any()).optional(),
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
