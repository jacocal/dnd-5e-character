import {
    pgTable,
    text,
    serial,
    integer,
    boolean,
    jsonb,
    timestamp,
    real,
    primaryKey,
    index,
    uniqueIndex,
    check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
    abilityEnum,
    castingTimeEnum,
    spellcastingTypeEnum,
    featCategoryEnum,
} from "./enums";
export * from "./enums";

// --- Rules Content (Read-Only references from SRD / 2024 PHB) ---

export const classes = pgTable("classes", {
    id: text("id").primaryKey(), // e.g., 'wizard', 'fighter'
    name: text("name").notNull(),
    hitDie: integer("hit_die").notNull(), // e.g., 6, 8, 10, 12
    savingThrows: abilityEnum("saving_throws").array().notNull(),
    proficiencies: jsonb("proficiencies"), // { armor: [], weapons: [], tools?: [] }
    spellcastingAbility: abilityEnum("spellcasting_ability"), // 'INT', 'WIS', 'CHA', nullable for non-casters
    spellcastingType: spellcastingTypeEnum("spellcasting_type").default("none").notNull(), // Multiclass slot calculation
    spellPrepMode: text("spell_prep_mode").default("none").notNull(), // 'prepared_class_list' | 'spellbook' | 'known' | 'none'

    // Character Creation Options & Combat Riders
    skillOptions: jsonb("skill_options"), // { choose: number, from: string[] }
    startingEquipmentOptions: jsonb("starting_equipment_options"), // { A: { items: [], gp: N }, B: {...}, C?: {...} }
    combatRiders: jsonb("combat_riders"), // Array of CombatRider definitions
});

export const subclasses = pgTable("subclasses", {
    id: text("id").primaryKey(), // e.g., 'wizard-evoker'
    classId: text("class_id").references(() => classes.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(), // e.g., 'Evoker'
    description: text("description").notNull(),
    spellcastingType: spellcastingTypeEnum("spellcasting_type"), // Nullable: inherits from class if not set, for third-casters
    grantedSpells: jsonb("granted_spells"), // { "3": ["cure-wounds", "bless"], "5": [...] }
    combatRiders: jsonb("combat_riders"), // Subclass combat riders
}, (table) => [
    index("idx_subclasses_class_id").on(table.classId),
]);

export const classProgression = pgTable("class_progression", {
    id: serial("id").primaryKey(),
    classId: text("class_id").references(() => classes.id, { onDelete: "cascade" }).notNull(),
    subclassId: text("subclass_id").references(() => subclasses.id, { onDelete: "cascade" }), // Nullable
    level: integer("level").notNull(),

    // Features
    proficiencyBonus: integer("proficiency_bonus"), // Nullable if inheriting
    features: jsonb("features"),

    // Spell Slots
    spellSlots: jsonb("spell_slots").default({}),

    // Metadata
    cantripsKnown: integer("cantrips_known").default(0),
    spellsKnown: integer("spells_known").default(0),
    extraAttacks: integer("extra_attacks").default(1).notNull(),
    skillGrants: jsonb("skill_grants"), // { type: 'expertise' | 'proficiency', count: number, from?: string[] }

    hasAsi: boolean("has_asi").default(false).notNull(),
}, (table) => [
    index("idx_class_progression_lookup").on(table.classId, table.subclassId, table.level),
    uniqueIndex("uq_class_progression_natural").on(
        table.classId,
        sql`COALESCE(${table.subclassId}, '')`,
        table.level
    ),
    check("chk_class_progression_level", sql`${table.level} >= 1 AND ${table.level} <= 20`),
]);

// Unified Trackable Resources (Class, Subclass, Species, and Feat limited-use features)
export const classResources = pgTable("class_resources", {
    id: text("id").primaryKey(), // e.g., 'rage', 'ki-points', 'wild-shape', 'breath-weapon'
    classId: text("class_id").references(() => classes.id, { onDelete: "cascade" }), // Nullable for species/feat resources
    subclassId: text("subclass_id").references(() => subclasses.id, { onDelete: "cascade" }), // Optional subclass scope
    sourceType: text("source_type").default("class").notNull(), // 'class' | 'subclass' | 'species' | 'feat'
    sourceId: text("source_id"), // e.g., 'dragonborn', 'goliath', 'orc', 'aasimar', 'lucky'
    name: text("name").notNull(), // Display name: "Rage", "Focus Points"
    description: text("description"),

    // Formula for max uses: "proficiency", "level", "cha_mod", "wis_mod", or a number as string
    maxFormula: text("max_formula").notNull(),

    // When resource recharges: "short", "long"
    rechargeOn: text("recharge_on").notNull(),

    // 2024 PHB partial short rest recovery (e.g., 1 use for Rage, Second Wind, Wild Shape, Channel Divinity)
    partialShortRestRecovery: integer("partial_short_rest_recovery").default(0).notNull(),

    // Level at which this resource unlocks
    unlockLevel: integer("unlock_level").default(1).notNull(),

    // Resource Effects (Bonus HP, Temp HP, Active Modifiers, etc.)
    onUse: jsonb("on_use"), // Array of ResourceEffect
}, (table) => [
    index("idx_class_resources_class_id").on(table.classId),
    index("idx_class_resources_subclass_id").on(table.subclassId),
    index("idx_class_resources_source").on(table.sourceType, table.sourceId),
]);

export const spells = pgTable("spells", {
    id: text("id").primaryKey(), // e.g., 'fireball'
    name: text("name").notNull(),
    level: integer("level").notNull(), // 0 = Cantrip
    school: text("school").notNull(), // e.g., 'Evocation'
    castingTime: castingTimeEnum("casting_time").notNull(),
    castingTimeTrigger: text("casting_time_trigger"), // Reaction trigger condition if applicable
    range: text("range").notNull(),
    components: jsonb("components").notNull(), // { v, s, m, material_description }
    duration: jsonb("duration").notNull(), // { type, value, unit }
    isRitual: boolean("is_ritual").default(false).notNull(),
    isConcentration: boolean("is_concentration").default(false).notNull(),
    description: text("description").notNull(),
    classes: text("classes").array().notNull(), // IDs of classes that can cast this
    tags: text("tags").array().default([]).notNull(),
    mechanics: jsonb("mechanics"), // Structured attack/save/damage/heal/upcast/cantrip/condition/rider data
}, (table) => [
    index("idx_spells_level_name").on(table.level, table.name),
    check("chk_spells_level", sql`${table.level} >= 0 AND ${table.level} <= 9`),
]);

export const feats = pgTable("feats", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: featCategoryEnum("category").default("general").notNull(), // 2024: origin | general | fighting_style | epic_boon
    repeatable: boolean("repeatable").default(false).notNull(), // 2024: Skilled, Magic Initiate, Elemental Adept, etc.
    description: text("description").notNull(),
    prerequisites: text("prerequisites"),
    parameters: jsonb("parameters"),
    modifiers: jsonb("modifiers"),
    grantedSpells: jsonb("granted_spells"),
    combatRiders: jsonb("combat_riders"),
    skillGrants: jsonb("skill_grants"),
}, (table) => [
    index("idx_feats_category").on(table.category),
]);

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
    type: text("type").notNull(), // 'Simple Melee Weapon', 'Light Armor', 'Gear', etc.

    // Structured Cost
    costAmount: integer("cost_amount").default(0).notNull(),
    costCurrency: text("cost_currency").default("gp").notNull(),

    // Structured Weight
    weightAmount: real("weight_amount").default(0),
    weightUnit: text("weight_unit").default("lb").notNull(),
    fixedWeight: boolean("fixed_weight").default(false),

    // Combat & Equipment Stats
    category: text("category").notNull().default("misc"), // weapon, armor, consumable, tool, ammunition, gear, magic_item, treasure
    slot: text("slot"), // head, chest, main_hand, off_hand, two_handed, etc.

    armorClass: integer("armor_class"),
    strengthRequirement: integer("strength_requirement"),
    stealthDisadvantage: boolean("stealth_disadvantage").default(false),

    damageDice: text("damage_dice"), // "1d8"
    versatileDice: text("versatile_dice"), // "1d10"
    damageType: text("damage_type"), // "slashing"
    weaponMastery: text("weapon_mastery"), // "Sap", "Vex", "Nick", "Topple", "Push", "Slow", "Graze", "Cleave"
    range: text("range"), // "20/60"

    properties: text("properties").array(), // ["finesse", "light"]
    rarity: text("rarity").default("common"),
    requiresAttunement: boolean("requires_attunement").default(false),

    // Magic Item Properties
    isMagical: boolean("is_magical").default(false).notNull(),
    isCursed: boolean("is_cursed").default(false).notNull(),
    trueName: text("true_name"),
    shownEffect: text("shown_effect"),
    trueEffect: text("true_effect"),

    // Consumable Properties
    uses: integer("uses"),
    usesMax: integer("uses_max"),

    description: text("description"),
    tags: text("tags").array().default([]).notNull(),
    modifiers: jsonb("modifiers"),
}, (table) => [
    index("idx_items_category").on(table.category),
    index("idx_items_rarity").on(table.rarity),
]);

export const races = pgTable("races", {
    id: text("id").primaryKey(), // e.g., 'human', 'elf-high'
    name: text("name").notNull(),
    description: text("description").default("").notNull(),
    traitOptions: jsonb("trait_options"),
    modifiers: jsonb("modifiers"),
});

export const traits = pgTable("traits", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    race: text("race"),
    parameters: jsonb("parameters"),
    modifiers: jsonb("modifiers"),
    grantedSpells: jsonb("granted_spells"),
    combatRiders: jsonb("combat_riders"),
}, (table) => [
    index("idx_traits_race").on(table.race),
]);

export const languages = pgTable("languages", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    script: text("script"),
    type: text("type").default("Standard"),
    description: text("description"),
});

export const conditions = pgTable("conditions", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    modifiers: jsonb("modifiers"),
});

// Bestiary / Companions / Wild Shape / Familiars / Summons Reference Table
export const companions = pgTable("companions", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(), // 'Wild Shape Beast' | 'Primal Companion' | 'Familiar' | 'Find Steed' | 'Summoned Spirit' | 'Monster'
    sourceType: text("source_type"), // 'class' | 'subclass' | 'spell' | 'bestiary'
    sourceId: text("source_id"), // e.g., 'druid', 'ranger-beast', 'find-steed', 'find-familiar'
    cr: real("cr").default(0),
    size: text("size").default("Medium").notNull(),
    armorClassFormula: text("armor_class_formula").notNull(),
    maxHpFormula: text("max_hp_formula").notNull(),
    speed: text("speed").notNull(),
    attackName: text("attack_name").notNull(),
    attackBonusFormula: text("attack_bonus_formula"),
    damageDice: text("damage_dice").notNull(),
    damageBonusFormula: text("damage_bonus_formula"),
    damageType: text("damage_type").notNull(),
    notes: text("notes").default("").notNull(),
    statblock: jsonb("statblock"), // Optional full monster/companion abilities, senses, traits
}, (table) => [
    index("idx_companions_category").on(table.category),
    index("idx_companions_source").on(table.sourceType, table.sourceId),
]);

// --- Campaigns (Optional Grouping / Multi-Campaign Support) ---

export const campaigns = pgTable("campaigns", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    dmName: text("dm_name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- User Data (Characters) ---

export const characters = pgTable("characters", {
    id: serial("id").primaryKey(),
    campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    name: text("name").notNull(),

    // Core Stats
    race: text("race").notNull().references(() => races.id),
    backgroundId: text("background_id").references(() => backgrounds.id),
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
    hpRolls: jsonb("hp_rolls"), // Optional per-level rolled HP history: Array<{ classId: string, level: number, rolled: number }>

    // Defenses (Explicit overrides / DM grants in addition to derived species/class resistances)
    resistances: text("resistances").array().default([]).notNull(),
    immunities: text("immunities").array().default([]).notNull(),
    vulnerabilities: text("vulnerabilities").array().default([]).notNull(),

    // Combat Stats
    armorClass: integer("armor_class"), // Null = Auto-calc
    speed: integer("speed").default(30).notNull(),
    initiativeBonus: integer("initiative_bonus").default(0).notNull(),

    // Hit Dice & Death Saves (total cached; per-class pool tracked in character_classes.hit_dice_used)
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

    // Proficiencies & Traits (legacy JSONB caches kept in sync with normalized tables)
    proficiencies: jsonb("proficiencies"), // { languages: [], tools: [], skills: [] }
    feats: jsonb("feats"), // Array of { id, name, description, modifiers }
    traits: jsonb("traits"), // Array of { id, name, description, modifiers }

    // Ability Point Pool (ASI points to distribute)
    abilityPointPool: integer("ability_point_pool").default(0).notNull(),

    // Bio & Description
    size: text("size").default("Medium"),
    appearance: text("appearance"),
    backstory: text("backstory"),
    notes: text("notes"),

    imageUrl: text("image_url"),

    // Modifiers & Effects (activeModifiers is canonical; resourceModifiers retained for GraphQL compatibility)
    resourceModifiers: jsonb("resource_modifiers"),
    activeModifiers: jsonb("active_modifiers"),

    // Meta
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("idx_characters_campaign_id").on(table.campaignId),
    index("idx_characters_updated_at").on(table.updatedAt),
    check("chk_characters_level", sql`${table.level} >= 1 AND ${table.level} <= 20`),
    check("chk_characters_exhaustion", sql`${table.exhaustion} >= 0 AND ${table.exhaustion} <= 6`),
    check("chk_characters_hp_current", sql`${table.hpCurrent} >= 0`),
    check("chk_characters_temp_hp", sql`${table.tempHp} >= 0`),
]);

export const characterClasses = pgTable("character_classes", {
    characterId: integer("character_id").references(() => characters.id, { onDelete: "cascade" }).notNull(),
    classId: text("class_id").references(() => classes.id).notNull(),
    subclassId: text("subclass_id").references(() => subclasses.id),
    level: integer("level").notNull(),
    hitDiceUsed: integer("hit_dice_used").default(0).notNull(), // Per-class spent Hit Dice for accurate multiclass pools
}, (table) => [
    primaryKey({ columns: [table.characterId, table.classId] }),
    index("idx_character_classes_character_id").on(table.characterId),
    check("chk_character_classes_level", sql`${table.level} >= 1 AND ${table.level} <= 20`),
    check("chk_character_classes_hit_dice_used", sql`${table.hitDiceUsed} >= 0`),
]);

export const characterSpells = pgTable("character_spells", {
    characterId: integer("character_id").references(() => characters.id, { onDelete: "cascade" }).notNull(),
    spellId: text("spell_id").references(() => spells.id).notNull(),
    prepared: boolean("prepared").default(false).notNull(),
    isRitual: boolean("is_ritual").default(false).notNull(),
    isConcentrating: boolean("is_concentrating").default(false).notNull(),
    source: text("source").default("class").notNull(), // 'class' | 'spellbook' | 'subclass_fixed' | 'species_fixed' | 'choice:...'
    alwaysPrepared: boolean("always_prepared").default(false).notNull(),
}, (table) => [
    primaryKey({ columns: [table.characterId, table.spellId] }),
    index("idx_character_spells_character_id").on(table.characterId),
]);

export const characterInventory = pgTable("character_inventory", {
    id: serial("id").primaryKey(),
    characterId: integer("character_id").references(() => characters.id, { onDelete: "cascade" }).notNull(),
    itemId: text("item_id").references(() => items.id).notNull(),
    quantity: integer("quantity").default(1).notNull(),
    equipped: boolean("equipped").default(false).notNull(),

    // Magic Item State (per-character)
    isIdentified: boolean("is_identified").default(true).notNull(),
    isAttuned: boolean("is_attuned").default(false).notNull(),

    // Consumable State (per-character instance)
    currentUses: integer("current_uses"),
}, (table) => [
    index("idx_character_inventory_character_id").on(table.characterId),
    index("idx_character_inventory_char_item").on(table.characterId, table.itemId),
    check("chk_character_inventory_quantity", sql`${table.quantity} >= 0`),
]);

// Track used resources per character (Class, Subclass, Species, and Feat resources)
export const characterResources = pgTable("character_resources", {
    characterId: integer("character_id").references(() => characters.id, { onDelete: "cascade" }).notNull(),
    resourceId: text("resource_id").references(() => classResources.id, { onDelete: "cascade" }).notNull(),
    usedUses: integer("used_uses").default(0).notNull(),
}, (table) => [
    primaryKey({ columns: [table.characterId, table.resourceId] }),
    index("idx_character_resources_character_id").on(table.characterId),
    check("chk_character_resources_used", sql`${table.usedUses} >= 0`),
]);

export const characterLanguages = pgTable("character_languages", {
    characterId: integer("character_id").references(() => characters.id, { onDelete: "cascade" }).notNull(),
    languageId: text("language_id").references(() => languages.id).notNull(),
}, (table) => [
    primaryKey({ columns: [table.characterId, table.languageId] }),
    index("idx_character_languages_character_id").on(table.characterId),
]);

export const characterConditions = pgTable("character_conditions", {
    id: serial("id").primaryKey(),
    characterId: integer("character_id").references(() => characters.id, { onDelete: "cascade" }).notNull(),
    conditionId: text("condition_id").references(() => conditions.id).notNull(),
    duration: text("duration"),
    isPermanent: boolean("is_permanent").default(false),
    source: text("source"),
}, (table) => [
    index("idx_character_conditions_character_id").on(table.characterId),
    uniqueIndex("uq_character_conditions_char_cond").on(table.characterId, table.conditionId),
]);

// Normalized Feature Choices (Fighting Styles, Invocations, Metamagic, Maneuvers, Orders, Weapon Masteries, Mystic Arcanum)
export const characterFeatureChoices = pgTable("character_feature_choices", {
    characterId: integer("character_id").references(() => characters.id, { onDelete: "cascade" }).notNull(),
    slotId: text("slot_id").notNull(), // e.g., 'fighter:fighting-style:1', 'warlock:invocation:1', 'weapon-mastery:longsword'
    choiceId: text("choice_id").notNull(),
    metadata: jsonb("metadata"),
}, (table) => [
    primaryKey({ columns: [table.characterId, table.slotId] }),
    index("idx_character_feature_choices_char_id").on(table.characterId),
]);

// Normalized Character Feats (supports repeatable 2024 feats + chosen ability/class metadata)
export const characterFeats = pgTable("character_feats", {
    id: serial("id").primaryKey(),
    characterId: integer("character_id").references(() => characters.id, { onDelete: "cascade" }).notNull(),
    featId: text("feat_id").references(() => feats.id, { onDelete: "cascade" }).notNull(),
    source: text("source").default("level_up").notNull(), // 'background' | 'species' | 'level_up' | 'epic_boon' | 'manual'
    chosenAbility: text("chosen_ability"), // e.g., 'STR', 'WIS'
    chosenClass: text("chosen_class"), // e.g., 'wizard' for Magic Initiate
    metadata: jsonb("metadata"),
}, (table) => [
    index("idx_character_feats_character_id").on(table.characterId),
]);

// Normalized Character Traits
export const characterTraits = pgTable("character_traits", {
    characterId: integer("character_id").references(() => characters.id, { onDelete: "cascade" }).notNull(),
    traitId: text("trait_id").references(() => traits.id, { onDelete: "cascade" }).notNull(),
    metadata: jsonb("metadata"),
}, (table) => [
    primaryKey({ columns: [table.characterId, table.traitId] }),
    index("idx_character_traits_character_id").on(table.characterId),
]);

export const quests = pgTable("quests", {
    id: serial("id").primaryKey(),
    characterId: integer("character_id").references(() => characters.id, { onDelete: "cascade" }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").default("active").notNull(), // active, completed, failed, paused
    isTracked: boolean("is_tracked").default(true).notNull(),
    category: text("category").default("main").notNull(), // main, side, faction, personal, bounty
    giver: text("giver"),
    location: text("location"),
    rewardXp: integer("reward_xp").default(0).notNull(),
    rewardGp: integer("reward_gp").default(0).notNull(),
    rewardNotes: text("reward_notes"),
    rewardsClaimed: boolean("rewards_claimed").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("idx_quests_character_id").on(table.characterId),
]);

export const questObjectives = pgTable("quest_objectives", {
    id: serial("id").primaryKey(),
    questId: integer("quest_id").references(() => quests.id, { onDelete: "cascade" }).notNull(),
    description: text("description").notNull(),
    isCompleted: boolean("is_completed").default(false).notNull(),
    order: integer("order").default(0).notNull(),
}, (table) => [
    index("idx_quest_objectives_quest_id").on(table.questId),
]);

export const questLogs = pgTable("quest_logs", {
    id: serial("id").primaryKey(),
    questId: integer("quest_id").references(() => quests.id, { onDelete: "cascade" }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    index("idx_quest_logs_quest_id").on(table.questId),
]);

export const characterEvents = pgTable("character_events", {
    id: serial("id").primaryKey(),
    characterId: integer("character_id").references(() => characters.id, { onDelete: "cascade" }).notNull(),
    eventType: text("event_type").notNull(), // 'roll', 'attack', 'spell_cast', 'damage', 'heal', 'rest', 'level_up', 'resource', 'condition'
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    payload: jsonb("payload"), // Full RollResult / Command details
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    index("idx_character_events_char_id_desc").on(table.characterId, table.id),
]);

export const battleMaps = pgTable("battle_maps", {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    widthFt: integer("width_ft").default(160).notNull(),
    heightFt: integer("height_ft").default(120).notNull(),
    cellSizeFt: integer("cell_size_ft").default(5).notNull(),
    diagonalRule: text("diagonal_rule").default("standard").notNull(),
    backgroundUrl: text("background_url"),
    gridColor: text("grid_color").default("#475569").notNull(),
    activeTurnTokenId: text("active_turn_token_id"),
    roundNumber: integer("round_number").default(1).notNull(),
    tokens: jsonb("tokens").default([]).notNull(),
    shapes: jsonb("shapes").default([]).notNull(),
    fogZones: jsonb("fog_zones").default([]).notNull(),
    aoeTemplates: jsonb("aoe_templates").default([]).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("idx_battle_maps_campaign_id").on(table.campaignId),
]);

// --- Relations ---

export const campaignRelations = relations(campaigns, ({ many }) => ({
    characters: many(characters),
    battleMaps: many(battleMaps),
}));

export const characterRelations = relations(characters, ({ many, one }) => ({
    campaign: one(campaigns, {
        fields: [characters.campaignId],
        references: [campaigns.id],
    }),
    classes: many(characterClasses),
    spells: many(characterSpells),
    inventory: many(characterInventory),
    languages: many(characterLanguages),
    conditions: many(characterConditions),
    featureChoices: many(characterFeatureChoices),
    characterFeats: many(characterFeats),
    characterTraits: many(characterTraits),
    background: one(backgrounds, {
        fields: [characters.backgroundId],
        references: [backgrounds.id],
    }),
    raceEntry: one(races, {
        fields: [characters.race],
        references: [races.id],
    }),
    quests: many(quests),
    resources: many(characterResources),
    events: many(characterEvents),
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
    subclass: one(subclasses, {
        fields: [classProgression.subclassId],
        references: [subclasses.id],
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

export const characterFeatureChoiceRelations = relations(characterFeatureChoices, ({ one }) => ({
    character: one(characters, {
        fields: [characterFeatureChoices.characterId],
        references: [characters.id],
    }),
}));

export const characterFeatRelations = relations(characterFeats, ({ one }) => ({
    character: one(characters, {
        fields: [characterFeats.characterId],
        references: [characters.id],
    }),
    feat: one(feats, {
        fields: [characterFeats.featId],
        references: [feats.id],
    }),
}));

export const characterTraitRelations = relations(characterTraits, ({ one }) => ({
    character: one(characters, {
        fields: [characterTraits.characterId],
        references: [characters.id],
    }),
    trait: one(traits, {
        fields: [characterTraits.traitId],
        references: [traits.id],
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

export const characterResourceRelations = relations(characterResources, ({ one }) => ({
    character: one(characters, {
        fields: [characterResources.characterId],
        references: [characters.id],
    }),
    resource: one(classResources, {
        fields: [characterResources.resourceId],
        references: [classResources.id],
    }),
}));

export const characterEventRelations = relations(characterEvents, ({ one }) => ({
    character: one(characters, {
        fields: [characterEvents.characterId],
        references: [characters.id],
    }),
}));

export const battleMapRelations = relations(battleMaps, ({ one }) => ({
    campaign: one(campaigns, {
        fields: [battleMaps.campaignId],
        references: [campaigns.id],
    }),
}));
