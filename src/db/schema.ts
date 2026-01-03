import { pgTable, text, serial, integer, boolean, jsonb, timestamp, real } from "drizzle-orm/pg-core";
import { abilityEnum, skillEnum, sizeEnum, castingTimeEnum, spellcastingTypeEnum } from "./enums";
export * from "./enums";

// --- Rules Content (Read-Only references from SRD) ---

export const classes = pgTable("classes", {
    id: text("id").primaryKey(), // e.g., 'wizard', 'fighter'
    name: text("name").notNull(),
    hitDie: integer("hit_die").notNull(), // e.g., 6, 8, 10, 12
    savingThrows: abilityEnum("saving_throws").array().notNull(),
    proficiencies: jsonb("proficiencies"), // { armor: [], weapons: [] }
    spellcastingAbility: abilityEnum("spellcasting_ability"), // 'INT', 'WIS', 'CHA', nullable for non-casters
    spellcastingType: spellcastingTypeEnum("spellcasting_type").default("none").notNull(), // Multiclass slot calculation

    // Character Creation Options
    skillOptions: jsonb("skill_options"), // { choose: number, from: string[] }
    startingEquipmentOptions: jsonb("starting_equipment_options"), // { A: { items: [], gp: N }, B: {...}, C?: {...} }
});

export const subclasses = pgTable("subclasses", {
    id: text("id").primaryKey(), // e.g., 'wizard-evocation'
    classId: text("class_id").references(() => classes.id, { onDelete: 'cascade' }).notNull(),
    name: text("name").notNull(), // e.g., 'School of Evocation'
    description: text("description").notNull(),
    spellcastingType: spellcastingTypeEnum("spellcasting_type"), // Nullable: inherits from class if not set, for third-casters
});

export const classProgression = pgTable("class_progression", {
    id: serial("id").primaryKey(),
    classId: text("class_id").references(() => classes.id, { onDelete: 'cascade' }).notNull(),
    subclassId: text("subclass_id").references(() => subclasses.id, { onDelete: 'cascade' }), // Nullable
    level: integer("level").notNull(),

    // Features
    proficiencyBonus: integer("proficiency_bonus"), // Nullable if inheriting
    features: jsonb("features"),

    // Spell Slots
    spellSlots: jsonb("spell_slots").default({}),

    // Metadata
    cantripsKnown: integer("cantrips_known").default(0),
    spellsKnown: integer("spells_known").default(0),

    hasAsi: boolean("has_asi").default(false).notNull(),
}, (table) => ({
    // Removed unique constraint to allow flexibility for now
}));

// Class Resources (Rage, Ki, Wild Shape, Channel Divinity, etc.)
export const classResources = pgTable("class_resources", {
    id: text("id").primaryKey(), // e.g., 'rage', 'ki-points', 'wild-shape'
    classId: text("class_id").references(() => classes.id, { onDelete: 'cascade' }).notNull(),
    name: text("name").notNull(), // Display name: "Rage", "Ki Points"
    description: text("description"),

    // Formula for max uses: "proficiency", "level", "cha_mod", "wis_mod", or a number as string
    maxFormula: text("max_formula").notNull(),

    // When resource recharges: "short", "long"
    rechargeOn: text("recharge_on").notNull(),

    // Level at which this resource unlocks
    unlockLevel: integer("unlock_level").default(1).notNull(),

    // Resource Effects (Bonus HP, Temp HP, etc.)
    onUse: jsonb("on_use"), // Array of ResourceEffect
});

export const spells = pgTable("spells", {

    id: text("id").primaryKey(), // e.g., 'fireball'
    name: text("name").notNull(),
    level: integer("level").notNull(), // 0 = Cantrip
    school: text("school").notNull(), // e.g., 'Evocation'
    castingTime: castingTimeEnum("casting_time").notNull(),
    range: text("range").notNull(),
    components: jsonb("components").notNull(), // { v, s, m, material_description }
    duration: jsonb("duration").notNull(), // { type, value, unit }
    isRitual: boolean("is_ritual").default(false).notNull(),
    isConcentration: boolean("is_concentration").default(false).notNull(),
    description: text("description").notNull(),
    classes: text("classes").array().notNull(), // IDs of classes that can cast this
    tags: text("tags").array().default([]).notNull(),
});

export const backgrounds = pgTable("backgrounds", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    abilityOptions: text("ability_options").array(), // 2024 rules: 3 abilities for bonus allocation
    modifiers: jsonb("modifiers"), // Array of { type, target, value, ... }
    features: jsonb("features"), // Array of { name, description }
    startingEquipment: jsonb("starting_equipment"), // Array of item IDs (legacy)

    // Origin Feat (2024 rules)
    originFeatId: text("origin_feat_id").references(() => feats.id), // FK to feats table
    originFeatClass: text("origin_feat_class"), // For Magic Initiate: 'cleric', 'druid', 'wizard'

    // Tool Proficiencies
    toolProficiencies: jsonb("tool_proficiencies"), // { fixed?: string[], choice?: { count: N, category: string } }

    // Starting Equipment Options (2024 rules)
    startingEquipmentOptions: jsonb("starting_equipment_options"), // { A: { items: [], gp: N }, B: {...} }
});

export const items = pgTable("items", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(), // 'weapon', 'armor', 'gear'

    // Structured Cost
    costAmount: integer("cost_amount").default(0).notNull(),
    costCurrency: text("cost_currency").default("gp").notNull(),

    // Structured Weight
    weightAmount: real("weight_amount").default(0),
    weightUnit: text("weight_unit").default("lb").notNull(),
    fixedWeight: boolean("fixed_weight").default(false),

    // Combat & Equipment Stats
    category: text("category").notNull().default("misc"), // weapon, armor, consumable, tool
    slot: text("slot"), // head, chest, main_hand, etc.

    armorClass: integer("armor_class"), // Base AC or bonus? handled by modifiers mostly now, but keep for base
    strengthRequirement: integer("strength_requirement"),
    stealthDisadvantage: boolean("stealth_disadvantage").default(false),

    damageDice: text("damage_dice"), // "1d8"
    damageType: text("damage_type"), // "slashing"
    range: text("range"), // "20/60"

    properties: text("properties").array(), // ["finesse", "light"]
    rarity: text("rarity").default("common"),
    requiresAttunement: boolean("requires_attunement").default(false),

    // Magic Item Properties
    isMagical: boolean("is_magical").default(false).notNull(),
    isCursed: boolean("is_cursed").default(false).notNull(),
    trueName: text("true_name"), // Revealed after identification (e.g., "Bag of Devouring")
    shownEffect: text("shown_effect"), // Displayed before identification
    trueEffect: text("true_effect"), // Revealed after identification

    // Consumable Properties
    uses: integer("uses"), // Current uses (for charge-based items)
    usesMax: integer("uses_max"), // Maximum uses

    description: text("description"),
    tags: text("tags").array().default([]).notNull(),
    modifiers: jsonb("modifiers"), // Unified modifiers
});

// --- User Data (Characters) ---

export const characters = pgTable("characters", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),

    // Core Stats
    race: text("race").notNull().references(() => races.id),
    backgroundId: text("background_id").references(() => backgrounds.id), // New FK
    // background: text("background").notNull(), // REMOVED
    alignment: text("alignment"),

    // Progression
    xp: integer("xp").default(0).notNull(),
    level: integer("level").default(1).notNull(), // Cached Total Level (sum of classes)

    // Ability Scores (Base values, modifiers applied on top)
    str: integer("str").default(10).notNull(),
    dex: integer("dex").default(10).notNull(),
    con: integer("con").default(10).notNull(),
    int: integer("int").default(10).notNull(),
    wis: integer("wis").default(10).notNull(),
    cha: integer("cha").default(10).notNull(),

    // Vitals
    hpCurrent: integer("hp_current").notNull(),
    hpMax: integer("hp_max").notNull(),
    tempHp: integer("temp_hp").default(0).notNull(),

    // Combat Stats
    armorClass: integer("armor_class"), // Null = Auto-calc
    speed: integer("speed").default(30).notNull(),
    initiativeBonus: integer("initiative_bonus").default(0).notNull(),

    // Hit Dice & Death Saves
    hitDiceCurrent: integer("hit_dice_current").default(1).notNull(),
    hitDiceMax: integer("hit_dice_max").default(1).notNull(),
    deathSaveSuccess: integer("death_save_success").default(0).notNull(),
    deathSaveFailure: integer("death_save_failure").default(0).notNull(),

    // Conditions & States
    inspiration: boolean("inspiration").default(false).notNull(),
    exhaustion: integer("exhaustion").default(0).notNull(),

    // Spell Slots (JSON: { "1": 2, "2": 0 } - Key is slot level, Value is USED count)
    usedSpellSlots: jsonb("used_spell_slots"),
    // Pact Magic (Warlock) - Number of used pact slots
    usedPactSlots: integer("used_pact_slots").default(0).notNull(),

    // Economy
    cp: integer("cp").default(0).notNull(),
    sp: integer("sp").default(0).notNull(),
    ep: integer("ep").default(0).notNull(),
    gp: integer("gp").default(0).notNull(),
    pp: integer("pp").default(0).notNull(),

    // Manual Proficiencies (JSON: { armor: string[], weapons: string[], tools: string[] })
    manualProficiencies: jsonb("manual_proficiencies"),

    // Proficiencies & Traits
    proficiencies: jsonb("proficiencies"), // { languages: [], tools: [], skills: [] }
    feats: jsonb("feats"), // Array of { name, description }
    traits: jsonb("traits"), // Array of { name, description }

    // Ability Point Pool (ASI points to distribute)
    abilityPointPool: integer("ability_point_pool").default(0).notNull(),

    // Bio & Description
    size: text("size").default("Medium"),
    appearance: text("appearance"),
    backstory: text("backstory"),
    notes: text("notes"),

    imageUrl: text("image_url"),

    // Modifiers & Effects
    resourceModifiers: jsonb("resource_modifiers"), // Array of { id, modifications, duration }

    // Meta
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const characterClasses = pgTable("character_classes", {
    characterId: integer("character_id").references(() => characters.id, { onDelete: 'cascade' }).notNull(),
    classId: text("class_id").references(() => classes.id).notNull(),
    subclassId: text("subclass_id").references(() => subclasses.id), // Nullable until level 3 usually
    level: integer("level").notNull(),
}, (table) => {
    return {
        pk: [table.characterId, table.classId] // Composite PK
    }
});

export const characterSpells = pgTable("character_spells", {
    characterId: integer("character_id").references(() => characters.id, { onDelete: 'cascade' }).notNull(),
    spellId: text("spell_id").references(() => spells.id).notNull(),
    prepared: boolean("prepared").default(false).notNull(),
    isRitual: boolean("is_ritual").default(false).notNull(),
}, (table) => ({
    pk: [table.characterId, table.spellId]
}));

export const characterInventory = pgTable("character_inventory", {
    id: serial("id").primaryKey(),
    characterId: integer("character_id").references(() => characters.id, { onDelete: 'cascade' }).notNull(),
    itemId: text("item_id").references(() => items.id).notNull(),
    quantity: integer("quantity").default(1).notNull(),
    equipped: boolean("equipped").default(false).notNull(),

    // Magic Item State (per-character)
    isIdentified: boolean("is_identified").default(true).notNull(), // Default true for non-magical items
    isAttuned: boolean("is_attuned").default(false).notNull(), // Attunement tracking

    // Consumable State (per-character instance)
    currentUses: integer("current_uses"), // Tracks remaining uses for this instance
});

// Track used class resources per character
export const characterResources = pgTable("character_resources", {
    characterId: integer("character_id").references(() => characters.id, { onDelete: 'cascade' }).notNull(),
    resourceId: text("resource_id").references(() => classResources.id, { onDelete: 'cascade' }).notNull(),
    usedUses: integer("used_uses").default(0).notNull(), // How many uses have been spent
}, (table) => ({
    pk: [table.characterId, table.resourceId]
}));

// --- Relations ---


import { relations } from "drizzle-orm";

export const characterRelations = relations(characters, ({ many, one }) => ({
    classes: many(characterClasses),
    spells: many(characterSpells),
    inventory: many(characterInventory),
    languages: many(characterLanguages),
    conditions: many(characterConditions),
    background: one(backgrounds, {
        fields: [characters.backgroundId],
        references: [backgrounds.id],
    }),
    raceEntry: one(races, {
        fields: [characters.race],
        references: [races.id],
    }),
    quests: many(quests),
}));

export const classRelations = relations(classes, ({ many }) => ({
    subclasses: many(subclasses),
    characterClasses: many(characterClasses),
    progression: many(classProgression),
}));

export const classProgressionRelations = relations(classProgression, ({ one }) => ({
    class: one(classes, {
        fields: [classProgression.classId],
        references: [classes.id],
    }),
}));

export const characterClassRelations = relations(characterClasses, ({ one }) => ({
    character: one(characters, {
        fields: [characterClasses.characterId],
        references: [characters.id],
    }),
    class: one(classes, {
        fields: [characterClasses.classId],
        references: [classes.id],
    }),
    subclass: one(subclasses, {
        fields: [characterClasses.subclassId],
        references: [subclasses.id],
    }),
}));

export const characterSpellRelations = relations(characterSpells, ({ one }) => ({
    character: one(characters, {
        fields: [characterSpells.characterId],
        references: [characters.id],
    }),
    spell: one(spells, {
        fields: [characterSpells.spellId],
        references: [spells.id],
    }),
}));

export const characterInventoryRelations = relations(characterInventory, ({ one }) => ({
    character: one(characters, {
        fields: [characterInventory.characterId],
        references: [characters.id],
    }),
    item: one(items, {
        fields: [characterInventory.itemId],
        references: [items.id],
    }),
}));

export const subclassRelations = relations(subclasses, ({ one }) => ({
    class: one(classes, {
        fields: [subclasses.classId],
        references: [classes.id],
    }),
}));

export const races = pgTable("races", {
    id: text("id").primaryKey(), // e.g., 'human', 'elf'
    name: text("name").notNull(),
    description: text("description").default("").notNull(),
    traitOptions: jsonb("trait_options"),
    modifiers: jsonb("modifiers"), // Racial bonuses
});

export const feats = pgTable("feats", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    prerequisites: text("prerequisites"),
    parameters: jsonb("parameters"),
    modifiers: jsonb("modifiers"),
});

export const traits = pgTable("traits", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    race: text("race"),
    parameters: jsonb("parameters"),
    modifiers: jsonb("modifiers"),
});

// ... existing imports

export const languages = pgTable("languages", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    script: text("script"),
    type: text("type").default("Standard"),
    description: text("description"),
});

export const characterLanguages = pgTable("character_languages", {
    characterId: integer("character_id").references(() => characters.id, { onDelete: 'cascade' }).notNull(),
    languageId: text("language_id").references(() => languages.id).notNull(),
}, (table) => ({
    pk: [table.characterId, table.languageId]
}));

export const conditions = pgTable("conditions", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    modifiers: jsonb("modifiers"), // Unified modifiers
    // effects: jsonb("effects"), // Unifying to modifiers
});

export const characterConditions = pgTable("character_conditions", {
    id: serial("id").primaryKey(),
    characterId: integer("character_id").references(() => characters.id, { onDelete: 'cascade' }).notNull(),
    conditionId: text("condition_id").references(() => conditions.id).notNull(),
    duration: text("duration"),
    isPermanent: boolean("is_permanent").default(false),
    source: text("source"),
});

export const quests = pgTable("quests", {
    id: serial("id").primaryKey(),
    characterId: integer("character_id").references(() => characters.id, { onDelete: 'cascade' }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").default("active").notNull(), // active, completed, failed, paused
    isTracked: boolean("is_tracked").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const questObjectives = pgTable("quest_objectives", {
    id: serial("id").primaryKey(),
    questId: integer("quest_id").references(() => quests.id, { onDelete: 'cascade' }).notNull(),
    description: text("description").notNull(),
    isCompleted: boolean("is_completed").default(false).notNull(),
    order: integer("order").default(0).notNull(),
});

export const questLogs = pgTable("quest_logs", {
    id: serial("id").primaryKey(),
    questId: integer("quest_id").references(() => quests.id, { onDelete: 'cascade' }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ... existing code ...

export const characterLanguageRelations = relations(characterLanguages, ({ one }) => ({
    character: one(characters, {
        fields: [characterLanguages.characterId],
        references: [characters.id],
    }),
    language: one(languages, {
        fields: [characterLanguages.languageId],
        references: [languages.id],
    }),
}));

export const questRelations = relations(quests, ({ one, many }) => ({
    character: one(characters, {
        fields: [quests.characterId],
        references: [characters.id],
    }),
    objectives: many(questObjectives),
    logs: many(questLogs),
}));

export const questObjectiveRelations = relations(questObjectives, ({ one }) => ({
    quest: one(quests, {
        fields: [questObjectives.questId],
        references: [quests.id],
    }),
}));

export const questLogRelations = relations(questLogs, ({ one }) => ({
    quest: one(quests, {
        fields: [questLogs.questId],
        references: [quests.id],
    }),
}));

export const characterConditionRelations = relations(characterConditions, ({ one }) => ({
    character: one(characters, {
        fields: [characterConditions.characterId],
        references: [characters.id],
    }),
    condition: one(conditions, {
        fields: [characterConditions.conditionId],
        references: [conditions.id],
    }),
}));

