import SchemaBuilder from "@pothos/core";
import { db } from "@/db";
import { eq, and, ne, arrayContains, inArray, lte } from "drizzle-orm";
import {
    characters,
    classes,
    races,
    backgrounds,
    spells,
    items,
    feats,
    traits,
    conditions,
    languages,
    classProgression,
    classResources,
    characterInventory,
    characterSpells,
    characterClasses,
    characterConditions,
    characterResources,
    characterLanguages,
    quests,
    questObjectives,
    questLogs,
} from "@/db/schema";
import { sql } from "drizzle-orm";

// Helper to fetch full character for GraphQL return
const getFullCharacter = async (characterId: number) => {
    return await db.query.characters.findFirst({
        where: eq(characters.id, characterId),
        with: {
            classes: { with: { class: true, subclass: true } },
            spells: { with: { spell: true } },
            inventory: { with: { item: true } },
            languages: { with: { language: true } },
            conditions: { with: { condition: true } },
            raceEntry: true,
            background: true,
            resources: { with: { resource: true } },
        }
    });
};

// === Schema Builder ===
const builder = new SchemaBuilder<{
    Scalars: {
        JSON: { Input: unknown; Output: unknown };
    };
}>({});

// === Scalar Types ===
builder.scalarType("JSON", {
    serialize: (value) => value,
    parseValue: (value) => value,
});

// === Object Types ===

const LevelUpInput = builder.inputType("LevelUpInput", {
    fields: (t) => ({
        characterId: t.int({ required: true }),
        classId: t.string({ required: true }),
        hpIncrease: t.int({ required: true }),
        hpMode: t.string({ required: true }),
        subclassId: t.string({ required: false }),
        featId: t.string({ required: false }),
        asi: t.field({ type: "JSON", required: false }),
    }),
});

const CreateItemInput = builder.inputType("CreateItemInput", {
    fields: (t) => ({
        name: t.string({ required: true }),
        description: t.string({ required: false }),
        type: t.string({ required: true }), // Weapon, Armor, Potion, etc.
        category: t.string({ required: false }), // weapon, armor, consumable, misc
        rarity: t.string({ required: false }),

        // Structured Cost
        costAmount: t.int({ required: false }),
        costCurrency: t.string({ required: false }),

        // Structured Weight
        weightAmount: t.float({ required: false }),
        weightUnit: t.string({ required: false }),
        fixedWeight: t.boolean({ required: false }),

        // Combat
        damageDice: t.string({ required: false }),
        damageType: t.string({ required: false }),
        armorClass: t.int({ required: false }),
        strengthRequirement: t.int({ required: false }),
        stealthDisadvantage: t.boolean({ required: false }),
        properties: t.stringList({ required: false }),
        range: t.string({ required: false }),
        slot: t.string({ required: false }),

        // Magic
        isMagical: t.boolean({ required: false }),
        isCursed: t.boolean({ required: false }),
        requiresAttunement: t.boolean({ required: false }),
        trueName: t.string({ required: false }),
        shownEffect: t.string({ required: false }),
        trueEffect: t.string({ required: false }),
        modifiers: t.field({ type: "JSON", required: false }), // Array of modifiers

        // Consumable
        uses: t.int({ required: false }),
        usesMax: t.int({ required: false }),

        tags: t.stringList({ required: false }),
    }),
});

// Race Type
const RaceType = builder.objectRef<{
    id: string;
    name: string;
    description: string;
    traitOptions: unknown;
    modifiers: unknown;
}>("Race");

builder.objectType(RaceType, {
    fields: (t) => ({
        id: t.exposeString("id"),
        name: t.exposeString("name"),
        description: t.exposeString("description"),
        traitOptions: t.field({ type: "JSON", resolve: (r) => r.traitOptions }),
        modifiers: t.field({ type: "JSON", resolve: (r) => r.modifiers }),
    }),
});

// Background Type
const BackgroundType = builder.objectRef<{
    id: string;
    name: string;
    description: string;
    abilityOptions: string[] | null;
    modifiers: unknown;
    features: unknown;
    originFeatId: string | null;
    originFeatClass: string | null;
    toolProficiencies: unknown;
    startingEquipmentOptions: unknown;
}>("Background");

builder.objectType(BackgroundType, {
    fields: (t) => ({
        id: t.exposeString("id"),
        name: t.exposeString("name"),
        description: t.exposeString("description"),
        abilityOptions: t.exposeStringList("abilityOptions", { nullable: true }),
        modifiers: t.field({ type: "JSON", resolve: (b) => b.modifiers }),
        features: t.field({ type: "JSON", resolve: (b) => b.features }),
        originFeatId: t.exposeString("originFeatId", { nullable: true }),
        originFeatClass: t.exposeString("originFeatClass", { nullable: true }),
        toolProficiencies: t.field({ type: "JSON", resolve: (b) => b.toolProficiencies }),
        startingEquipmentOptions: t.field({ type: "JSON", resolve: (b) => b.startingEquipmentOptions }),
    }),
});

// Class Type
const ClassType = builder.objectRef<{
    id: string;
    name: string;
    hitDie: number;
    savingThrows: string[];
    proficiencies: unknown;
    spellcastingAbility: string | null;
    spellcastingType: string;
    skillOptions: unknown;
    startingEquipmentOptions: unknown;
}>("Class");

builder.objectType(ClassType, {
    fields: (t) => ({
        id: t.exposeString("id"),
        name: t.exposeString("name"),
        hitDie: t.exposeInt("hitDie"),
        savingThrows: t.exposeStringList("savingThrows"),
        proficiencies: t.field({ type: "JSON", resolve: (c) => c.proficiencies }),
        spellcastingAbility: t.exposeString("spellcastingAbility", { nullable: true }),
        spellcastingType: t.exposeString("spellcastingType"),
        skillOptions: t.field({ type: "JSON", resolve: (c) => c.skillOptions }),
        startingEquipmentOptions: t.field({ type: "JSON", resolve: (c) => c.startingEquipmentOptions }),
    }),
});

// Spell Type
const SpellType = builder.objectRef<{
    id: string;
    name: string;
    level: number;
    school: string;
    castingTime: string;
    range: string;
    components: unknown;
    duration: unknown;
    isRitual: boolean;
    isConcentration: boolean;
    description: string;
    classes: string[];
    tags: string[];
}>("Spell");

builder.objectType(SpellType, {
    fields: (t) => ({
        id: t.exposeString("id"),
        name: t.exposeString("name"),
        level: t.exposeInt("level"),
        school: t.exposeString("school"),
        castingTime: t.exposeString("castingTime"),
        range: t.exposeString("range"),
        components: t.field({ type: "JSON", resolve: (s) => s.components }),
        duration: t.field({ type: "JSON", resolve: (s) => s.duration }),
        isRitual: t.exposeBoolean("isRitual"),
        isConcentration: t.exposeBoolean("isConcentration"),
        description: t.exposeString("description"),
        classes: t.exposeStringList("classes"),
        tags: t.exposeStringList("tags"),
    }),
});

// Item Type
const ItemType = builder.objectRef<{
    id: string;
    name: string;
    type: string;
    costAmount: number;
    costCurrency: string;
    weightAmount: number | null;
    weightUnit: string;
    fixedWeight: boolean | null;
    category: string;
    slot: string | null;
    armorClass: number | null;
    strengthRequirement: number | null;
    stealthDisadvantage: boolean | null;
    damageDice: string | null;
    damageType: string | null;
    range: string | null;
    properties: string[] | null;
    rarity: string | null;
    requiresAttunement: boolean | null;
    isMagical: boolean;
    isCursed: boolean;
    trueName: string | null;
    shownEffect: string | null;
    trueEffect: string | null;
    uses: number | null;
    usesMax: number | null;
    description: string | null;
    tags: string[];
    modifiers: unknown;
}>("Item");

builder.objectType(ItemType, {
    fields: (t) => ({
        id: t.exposeString("id"),
        name: t.exposeString("name"),
        type: t.exposeString("type"),
        costAmount: t.exposeInt("costAmount"),
        costCurrency: t.exposeString("costCurrency"),
        weightAmount: t.exposeFloat("weightAmount", { nullable: true }),
        weightUnit: t.exposeString("weightUnit"),
        fixedWeight: t.exposeBoolean("fixedWeight", { nullable: true }),
        category: t.exposeString("category"),
        slot: t.exposeString("slot", { nullable: true }),
        armorClass: t.exposeInt("armorClass", { nullable: true }),
        strengthRequirement: t.exposeInt("strengthRequirement", { nullable: true }),
        stealthDisadvantage: t.exposeBoolean("stealthDisadvantage", { nullable: true }),
        damageDice: t.exposeString("damageDice", { nullable: true }),
        damageType: t.exposeString("damageType", { nullable: true }),
        range: t.exposeString("range", { nullable: true }),
        properties: t.exposeStringList("properties", { nullable: true }),
        rarity: t.exposeString("rarity", { nullable: true }),
        requiresAttunement: t.exposeBoolean("requiresAttunement", { nullable: true }),
        isMagical: t.exposeBoolean("isMagical"),
        isCursed: t.exposeBoolean("isCursed"),
        trueName: t.exposeString("trueName", { nullable: true }),
        shownEffect: t.exposeString("shownEffect", { nullable: true }),
        trueEffect: t.exposeString("trueEffect", { nullable: true }),
        uses: t.exposeInt("uses", { nullable: true }),
        usesMax: t.exposeInt("usesMax", { nullable: true }),
        description: t.exposeString("description", { nullable: true }),
        tags: t.exposeStringList("tags"),
        modifiers: t.field({ type: "JSON", resolve: (i) => i.modifiers }),
    }),
});

// Feat Type
const FeatType = builder.objectRef<{
    id: string;
    name: string;
    description: string;
    prerequisites: string | null;
    modifiers: unknown;
}>("Feat");

builder.objectType(FeatType, {
    fields: (t) => ({
        id: t.exposeString("id"),
        name: t.exposeString("name"),
        description: t.exposeString("description"),
        prerequisites: t.exposeString("prerequisites", { nullable: true }),
        modifiers: t.expose("modifiers", { type: "JSON", nullable: true }),
    }),
});

// Character Class (join relationship)
const SubclassType = builder.objectRef<{
    id: string;
    classId: string;
    name: string;
    description: string;
    spellcastingType: string | null;
}>("Subclass");

const CharacterClassType = builder.objectRef<{
    classId: string;
    subclassId: string | null;
    level: number;
    class?: { id: string; name: string; hitDie: number };
    subclass?: { id: string; classId: string; name: string; description: string; spellcastingType: string | null };
}>("CharacterClass");

builder.objectType(SubclassType, {
    fields: (t) => ({
        id: t.exposeString("id"),
        classId: t.exposeString("classId"),
        name: t.exposeString("name"),
        description: t.exposeString("description"),
        spellcastingType: t.exposeString("spellcastingType", { nullable: true }),
    }),
});

builder.objectType(CharacterClassType, {
    fields: (t) => ({
        classId: t.exposeString("classId"),
        subclassId: t.exposeString("subclassId", { nullable: true }),
        level: t.exposeInt("level"),
        className: t.string({
            resolve: (cc) => cc.class?.name ?? cc.classId,
        }),
        subclass: t.field({
            type: SubclassType,
            nullable: true,
            resolve: (parent) => parent.subclass ?? null,
        }),
        hitDie: t.int({
            nullable: true,
            resolve: (cc) => cc.class?.hitDie ?? null,
        }),
    }),
});

// Character Spell (join relationship)
const CharacterSpellType = builder.objectRef<{
    spellId: string;
    prepared: boolean;
    isRitual: boolean;
    isConcentrating: boolean;
    spell?: { id: string; name: string; level: number; school: string };
}>("CharacterSpell");

builder.objectType(CharacterSpellType, {
    fields: (t) => ({
        spellId: t.exposeString("spellId"),
        prepared: t.exposeBoolean("prepared"),
        isRitual: t.exposeBoolean("isRitual"),
        isConcentrating: t.exposeBoolean("isConcentrating", { nullable: true }),
        spellName: t.string({
            nullable: true,
            resolve: (cs) => cs.spell?.name ?? null,
        }),
        spellLevel: t.int({
            nullable: true,
            resolve: (cs) => cs.spell?.level ?? null,
        }),
    }),
});

// Character Inventory Item (join relationship)
const CharacterInventoryType = builder.objectRef<{
    id: number;
    itemId: string;
    quantity: number;
    equipped: boolean;
    isIdentified: boolean;
    isAttuned: boolean;
    currentUses: number | null;
    item?: { id: string; name: string; category: string };
}>("CharacterInventory");

builder.objectType(CharacterInventoryType, {
    fields: (t) => ({
        id: t.exposeInt("id"),
        itemId: t.exposeString("itemId"),
        quantity: t.exposeInt("quantity"),
        equipped: t.exposeBoolean("equipped"),
        isIdentified: t.exposeBoolean("isIdentified"),
        isAttuned: t.exposeBoolean("isAttuned"),
        currentUses: t.exposeInt("currentUses", { nullable: true }),
        itemName: t.string({
            nullable: true,
            resolve: (ci) => ci.item?.name ?? null,
        }),
        itemCategory: t.string({
            nullable: true,
            resolve: (ci) => ci.item?.category ?? null,
        }),
    }),
});

// Character Condition (join relationship)
const CharacterConditionType = builder.objectRef<{
    id: number;
    conditionId: string;
    duration: string | null;
    isPermanent: boolean | null;
    source: string | null;
    condition?: { id: string; name: string; description: string };
}>("CharacterCondition");

builder.objectType(CharacterConditionType, {
    fields: (t) => ({
        id: t.exposeInt("id"),
        conditionId: t.exposeString("conditionId"),
        duration: t.exposeString("duration", { nullable: true }),
        isPermanent: t.exposeBoolean("isPermanent", { nullable: true }),
        source: t.exposeString("source", { nullable: true }),
        conditionName: t.string({
            nullable: true,
            resolve: (cc) => cc.condition?.name ?? null,
        }),
    }),
});

// Character Resource (join relationship)
const CharacterResourceType = builder.objectRef<{
    resourceId: string;
    usedUses: number;
    resource?: { id: string; name: string; maxFormula: string; rechargeOn: string; onUse: unknown };
}>("CharacterResource");

builder.objectType(CharacterResourceType, {
    fields: (t) => ({
        resourceId: t.exposeString("resourceId"),
        usedUses: t.exposeInt("usedUses"),
        resourceName: t.string({
            nullable: true,
            resolve: (cr) => cr.resource?.name ?? null,
        }),
        maxFormula: t.string({
            nullable: true,
            resolve: (cr) => cr.resource?.maxFormula ?? null,
        }),
        rechargeOn: t.string({
            nullable: true,
            resolve: (cr) => cr.resource?.rechargeOn ?? null,
        }),
        onUse: t.field({
            type: "JSON",
            nullable: true,
            resolve: (cr) => cr.resource?.onUse ?? null,
        }),
    }),
});

// Language Reference Type
const LanguageType = builder.objectRef<{
    id: string;
    name: string;
    script: string | null;
    type: string | null;
}>("Language");

builder.objectType(LanguageType, {
    fields: (t) => ({
        id: t.exposeString("id"),
        name: t.exposeString("name"),
        script: t.exposeString("script", { nullable: true }),
        type: t.exposeString("type", { nullable: true }),
    }),
});

// Character Language (join relationship)
const CharacterLanguageType = builder.objectRef<{
    languageId: string;
    characterId: number;
    language?: { id: string; name: string; script: string | null; type: string | null };
}>("CharacterLanguage");

builder.objectType(CharacterLanguageType, {
    fields: (t) => ({
        id: t.exposeInt("id" as never, { nullable: true }),
        characterId: t.exposeInt("characterId"),
        languageId: t.exposeString("languageId"),
        // Expose nested language object for queries that traverse deeper
        language: t.field({
            type: LanguageType, // We need to ensure LanguageType is defined or define it
            nullable: true,
            resolve: (cl) => cl.language ?? null,
        }),
        // Keep these flat fields as helpers if the client uses them
        languageName: t.string({
            nullable: true,
            resolve: (cl) => cl.language?.name ?? null,
        }),
        languageScript: t.string({
            nullable: true,
            resolve: (cl) => cl.language?.script ?? null,
        }),
    }),
});

// Condition Type (rule reference)
const ConditionType = builder.objectRef<{
    id: string;
    name: string;
    description: string;
    modifiers: unknown;
}>("Condition");

builder.objectType(ConditionType, {
    fields: (t) => ({
        id: t.exposeString("id"),
        name: t.exposeString("name"),
        description: t.exposeString("description"),
        modifiers: t.field({ type: "JSON", resolve: (c) => c.modifiers }),
    }),
});

// ClassResource Type (rule reference)
const ClassResourceType = builder.objectRef<{
    id: string;
    classId: string;
    name: string;
    description: string | null;
    maxFormula: string;
    rechargeOn: string;
    unlockLevel: number;
    onUse: unknown;
}>("ClassResource");

builder.objectType(ClassResourceType, {
    fields: (t) => ({
        id: t.exposeString("id"),
        classId: t.exposeString("classId"),
        name: t.exposeString("name"),
        description: t.exposeString("description", { nullable: true }),
        maxFormula: t.exposeString("maxFormula"),
        rechargeOn: t.exposeString("rechargeOn"),
        unlockLevel: t.exposeInt("unlockLevel"),
        onUse: t.field({ type: "JSON", resolve: (r) => r.onUse }),
    }),
});

// Quest Types
const QuestObjectiveType = builder.objectRef<{
    id: number;
    questId: number;
    description: string;
    isCompleted: boolean;
    order: number;
}>("QuestObjective");

builder.objectType(QuestObjectiveType, {
    fields: (t) => ({
        id: t.exposeInt("id"),
        questId: t.exposeInt("questId"),
        description: t.exposeString("description"),
        isCompleted: t.exposeBoolean("isCompleted"),
        order: t.exposeInt("order"),
    }),
});

const QuestLogType = builder.objectRef<{
    id: number;
    questId: number;
    content: string;
    createdAt: Date;
}>("QuestLog");

builder.objectType(QuestLogType, {
    fields: (t) => ({
        id: t.exposeInt("id"),
        questId: t.exposeInt("questId"),
        content: t.exposeString("content"),
        createdAt: t.string({ resolve: (l) => l.createdAt.toISOString() }),
    }),
});

const QuestType = builder.objectRef<{
    id: number;
    characterId: number;
    title: string;
    description: string | null;
    status: string;
    isTracked: boolean;
    createdAt: Date;
    updatedAt: Date;
    objectives?: Array<{ id: number; questId: number; description: string; isCompleted: boolean; order: number; }>;
    logs?: Array<{ id: number; questId: number; content: string; createdAt: Date; }>;
}>("Quest");

builder.objectType(QuestType, {
    fields: (t) => ({
        id: t.exposeInt("id"),
        characterId: t.exposeInt("characterId"),
        title: t.exposeString("title"),
        description: t.exposeString("description", { nullable: true }),
        status: t.exposeString("status"),
        isTracked: t.exposeBoolean("isTracked"),
        createdAt: t.string({ resolve: (q) => q.createdAt.toISOString() }),
        updatedAt: t.string({ resolve: (q) => q.updatedAt.toISOString() }),
        objectives: t.field({
            type: [QuestObjectiveType],
            resolve: async (q) => {
                if (q.objectives) return q.objectives;
                return await db.query.questObjectives.findMany({
                    where: eq(questObjectives.questId, q.id),
                    orderBy: (qo, { asc }) => [asc(qo.order)],
                });
            }
        }),
        logs: t.field({
            type: [QuestLogType],
            resolve: async (q) => {
                if (q.logs) return q.logs;
                return await db.query.questLogs.findMany({
                    where: eq(questLogs.questId, q.id),
                    orderBy: (ql, { desc }) => [desc(ql.createdAt)],
                });
            }
        }),
    }),
});


const DmPlayerType = builder.objectRef<{
    id: number;
    name: string;
    alignment: string | null;
}>("DmPlayer");

builder.objectType(DmPlayerType, {
    fields: (t) => ({
        id: t.exposeInt("id"),
        name: t.exposeString("name"),
        alignment: t.exposeString("alignment", { nullable: true }),
    }),
});

const CreateItemResultType = builder.objectRef<{
    success: boolean;
    itemId: string | null;
    error: string | null;
}>("CreateItemResult");

builder.objectType(CreateItemResultType, {
    fields: (t) => ({
        success: t.exposeBoolean("success"),
        itemId: t.exposeString("itemId", { nullable: true }),
        error: t.exposeString("error", { nullable: true }),
    }),
});


// Character Type (main entity)


const CharacterType = builder.objectRef<{
    id: number;
    name: string;
    race: string;
    backgroundId: string | null;
    alignment: string | null;
    xp: number;
    level: number;
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
    hpCurrent: number;
    hpMax: number;
    tempHp: number;
    armorClass: number | null;
    speed: number;
    initiativeBonus: number;
    hitDiceCurrent: number;
    hitDiceMax: number;
    deathSaveSuccess: number;
    deathSaveFailure: number;
    inspiration: boolean;
    exhaustion: number;
    usedSpellSlots: unknown;
    usedPactSlots: number;
    cp: number;
    sp: number;
    ep: number;
    gp: number;
    pp: number;
    manualProficiencies: unknown;
    proficiencies: unknown;
    feats: unknown;
    traits: unknown;
    abilityPointPool: number;
    size: string | null;
    appearance: string | null;
    backstory: string | null;
    notes: string | null;
    imageUrl: string | null;
    resourceModifiers: unknown;
    activeModifiers: unknown; // Array of ActiveModifier

    // Relations
    raceEntry?: { id: string; name: string } | null;
    background?: { id: string; name: string } | null;
    classes?: Array<{ classId: string; subclassId: string | null; level: number; class?: { id: string; name: string; hitDie: number } }>;
    spells?: Array<{ spellId: string; prepared: boolean; isRitual: boolean; isConcentrating: boolean; spell?: { id: string; name: string; level: number; school: string } }>;
    inventory?: Array<{ id: number; itemId: string; quantity: number; equipped: boolean; isIdentified: boolean; isAttuned: boolean; currentUses: number | null; item?: { id: string; name: string; category: string } }>;
    conditions?: Array<{ id: number; conditionId: string; duration: string | null; isPermanent: boolean | null; source: string | null; condition?: { id: string; name: string; description: string } }>;
    resources?: Array<{ resourceId: string; usedUses: number; resource?: { id: string; name: string; maxFormula: string; rechargeOn: string; onUse: unknown } }>;
    languages?: Array<{ id?: number; languageId: string; characterId: number; language?: { id: string; name: string; script: string | null; type: string | null } }>;
}>("Character");

builder.objectType(CharacterType, {
    fields: (t) => ({
        id: t.exposeInt("id"),
        name: t.exposeString("name"),
        raceId: t.exposeString("race"),
        backgroundId: t.exposeString("backgroundId", { nullable: true }),
        alignment: t.exposeString("alignment", { nullable: true }),
        xp: t.exposeInt("xp"),
        level: t.exposeInt("level"),
        str: t.exposeInt("str"),
        dex: t.exposeInt("dex"),
        con: t.exposeInt("con"),
        int: t.exposeInt("int"),
        wis: t.exposeInt("wis"),
        cha: t.exposeInt("cha"),
        hpCurrent: t.exposeInt("hpCurrent"),
        hpMax: t.exposeInt("hpMax"),
        tempHp: t.exposeInt("tempHp"),
        armorClass: t.exposeInt("armorClass", { nullable: true }),
        speed: t.exposeInt("speed"),
        initiativeBonus: t.exposeInt("initiativeBonus"),
        hitDiceCurrent: t.exposeInt("hitDiceCurrent"),
        hitDiceMax: t.exposeInt("hitDiceMax"),
        deathSaveSuccess: t.exposeInt("deathSaveSuccess"),
        deathSaveFailure: t.exposeInt("deathSaveFailure"),
        inspiration: t.exposeBoolean("inspiration"),
        exhaustion: t.exposeInt("exhaustion"),
        usedSpellSlots: t.field({ type: "JSON", resolve: (c) => c.usedSpellSlots }),
        usedPactSlots: t.exposeInt("usedPactSlots"),
        cp: t.exposeInt("cp"),
        sp: t.exposeInt("sp"),
        ep: t.exposeInt("ep"),
        gp: t.exposeInt("gp"),
        pp: t.exposeInt("pp"),
        manualProficiencies: t.field({ type: "JSON", resolve: (c) => c.manualProficiencies }),
        proficiencies: t.field({ type: "JSON", resolve: (c) => c.proficiencies }),
        feats: t.field({ type: "JSON", resolve: (c) => c.feats }),
        traits: t.field({ type: "JSON", resolve: (c) => c.traits }),
        abilityPointPool: t.exposeInt("abilityPointPool"),
        size: t.exposeString("size", { nullable: true }),
        appearance: t.exposeString("appearance", { nullable: true }),
        backstory: t.exposeString("backstory", { nullable: true }),
        notes: t.exposeString("notes", { nullable: true }),
        imageUrl: t.exposeString("imageUrl", { nullable: true }),
        resourceModifiers: t.field({ type: "JSON", resolve: (c) => c.resourceModifiers }),
        activeModifiers: t.field({ type: "JSON", resolve: (c) => c.activeModifiers }),

        // Relations
        raceName: t.string({
            nullable: true,
            resolve: (c) => c.raceEntry?.name ?? null,
        }),
        backgroundName: t.string({
            nullable: true,
            resolve: (c) => c.background?.name ?? null,
        }),
        classes: t.field({
            type: [CharacterClassType],
            resolve: (c) => c.classes ?? [],
        }),
        spells: t.field({
            type: [CharacterSpellType],
            resolve: (c) => c.spells ?? [],
        }),
        inventory: t.field({
            type: [CharacterInventoryType],
            resolve: (c) => c.inventory ?? [],
        }),
        conditions: t.field({
            type: [CharacterConditionType],
            resolve: (c) => c.conditions ?? [],
        }),
        resources: t.field({
            type: [CharacterResourceType],
            resolve: async (c) => {
                // Start with existing DB rows (usage data)
                const dbResources = c.resources ?? [];

                // If classes (and levels) aren't loaded, we can't calculate unlocks
                // Return with onUse: null since we don't have resource definitions loaded
                if (!c.classes || c.classes.length === 0) {
                    return dbResources.map(r => ({
                        ...r,
                        resource: r.resource ? { ...r.resource, onUse: r.resource.onUse ?? null } : undefined
                    }));
                }

                // Fetch definitions for all resources potentially available to these classes
                const classIds = c.classes.map((cl) => cl.classId);
                const allClassResources = await db
                    .select()
                    .from(classResources)
                    .where(inArray(classResources.classId, classIds));

                // Merge definition with usage, filtering by level
                const result = [];

                for (const res of allClassResources) {
                    const charClass = c.classes.find((cl) => cl.classId === res.classId);

                    // Check if unlocked at this class level
                    if (charClass && charClass.level >= res.unlockLevel) {
                        const existing = dbResources.find((r) => r.resourceId === res.id);

                        result.push({
                            resourceId: res.id,
                            usedUses: existing ? existing.usedUses : 0,
                            resource: res,
                        });
                    }
                }

                return result;
            },
        }),
        quests: t.field({
            type: [QuestType],
            resolve: async (c) => {
                console.log(`[GraphQL] Resolving quests for character ${c.id}`);
                const result = await db.query.quests.findMany({
                    where: eq(quests.characterId, c.id),
                    orderBy: (q, { desc }) => [desc(q.updatedAt)],
                    with: {
                        objectives: true,
                        // logs: true, // Typically fetch logs on detail view, but allowed here
                    }
                });
                console.log(`[GraphQL] Found ${result.length} quests for character ${c.id}`);
                return result;
            }
        }),
        languages: t.field({
            type: [CharacterLanguageType],
            resolve: (c) => c.languages ?? [],
        }),
    }),
});

// Class Progression Type
const ClassProgressionType = builder.objectRef<{
    id: number;
    classId: string;
    subclassId: string | null;
    level: number;
    proficiencyBonus: number | null;
    features: unknown; // JSON
    spellSlots: unknown; // JSON
    cantripsKnown: number | null;
    spellsKnown: number | null;
    hasAsi: boolean;
}>("ClassProgression");

builder.objectType(ClassProgressionType, {
    fields: (t) => ({
        id: t.exposeInt("id"),
        classId: t.exposeString("classId"),
        subclassId: t.exposeString("subclassId", { nullable: true }),
        level: t.exposeInt("level"),
        proficiencyBonus: t.exposeInt("proficiencyBonus", { nullable: true }),
        features: t.field({ type: "JSON", resolve: (cp) => cp.features }),
        spellSlots: t.field({ type: "JSON", resolve: (cp) => cp.spellSlots }),
        cantripsKnown: t.exposeInt("cantripsKnown", { nullable: true }),
        spellsKnown: t.exposeInt("spellsKnown", { nullable: true }),
        hasAsi: t.exposeBoolean("hasAsi"),
    }),
});

// === Query Type ===
builder.queryType({
    fields: (t) => ({

        // DM Tools
        activePlayers: t.field({
            type: [DmPlayerType],
            resolve: async () => {
                const players = await db.query.characters.findMany({
                    columns: {
                        id: true,
                        name: true,
                        alignment: true,
                    }
                });
                return players;
            }
        }),

        // Rules queries

        classProgression: t.field({
            type: [ClassProgressionType],
            args: {
                classId: t.arg.string({ required: true }),
            },
            resolve: async (_, { classId }) => {
                return await db.select().from(classProgression).where(eq(classProgression.classId, classId));
            }
        }),

        // Character queries
        character: t.field({
            type: CharacterType,
            nullable: true,
            args: {
                id: t.arg.int({ required: true }),
            },
            resolve: async (_, { id }) => {
                console.log(`[GraphQL] Querying character with ID: ${id}`);
                const character = await db.query.characters.findFirst({
                    where: eq(characters.id, id),
                    with: {
                        classes: { with: { class: true, subclass: true } },
                        spells: { with: { spell: true } },
                        inventory: { with: { item: true } },
                        languages: { with: { language: true } },
                        conditions: { with: { condition: true } },
                        raceEntry: true,
                        background: true,
                        resources: { with: { resource: true } },
                    },
                });
                console.log(`[GraphQL] Found character:`, character ? character.name : "null");
                return character ?? null;
            },
        }),

        characters: t.field({
            type: [CharacterType],
            resolve: async () => {
                return await db.query.characters.findMany({
                    with: {
                        classes: { with: { class: true } },
                    },
                    orderBy: (characters, { desc }) => [desc(characters.updatedAt)],
                });
            },
        }),

        // Reference data queries
        classes: t.field({
            type: [ClassType],
            resolve: async () => {
                return await db.query.classes.findMany({
                    orderBy: (classes, { asc }) => [asc(classes.name)],
                });
            },
        }),

        subclasses: t.field({
            type: [SubclassType],
            resolve: async () => {
                return await db.query.subclasses.findMany({
                    orderBy: (subclasses, { asc }) => [asc(subclasses.name)],
                });
            },
        }),

        races: t.field({
            type: [RaceType],
            resolve: async () => {
                return await db.query.races.findMany({
                    orderBy: (races, { asc }) => [asc(races.name)],
                });
            },
        }),

        backgrounds: t.field({
            type: [BackgroundType],
            resolve: async () => {
                return await db.query.backgrounds.findMany({
                    orderBy: (backgrounds, { asc }) => [asc(backgrounds.name)],
                });
            },
        }),

        spells: t.field({
            type: [SpellType],
            args: {
                classId: t.arg.string({ required: false }),
                level: t.arg.int({ required: false }),
            },
            resolve: async (_, { classId, level }) => {
                return await db.query.spells.findMany({
                    where: (spells, { and, eq }) => {
                        const conditions: any[] = [];
                        if (classId) {
                            conditions.push(arrayContains(spells.classes, [classId]));
                        }
                        if (level !== null && level !== undefined) {
                            conditions.push(eq(spells.level, level));
                        }
                        return conditions.length > 0 ? and(...conditions) : undefined;
                    },
                    orderBy: (spells, { asc }) => [asc(spells.level), asc(spells.name)],
                });
            },
        }),

        items: t.field({
            type: [ItemType],
            args: {
                category: t.arg.string({ required: false }),
            },
            resolve: async (_, { category }) => {
                return await db.query.items.findMany({
                    where: category ? (items, { eq }) => eq(items.category, category) : undefined,
                    orderBy: (items, { asc }) => [asc(items.name)],
                });
            },
        }),

        // Single-item lookups (for RulesRepository)
        item: t.field({
            type: ItemType,
            nullable: true,
            args: {
                id: t.arg.string({ required: true }),
            },
            resolve: async (_, { id }) => {
                return await db.query.items.findFirst({
                    where: eq(items.id, id),
                });
            },
        }),

        spell: t.field({
            type: SpellType,
            nullable: true,
            args: {
                id: t.arg.string({ required: true }),
            },
            resolve: async (_, { id }) => {
                return await db.query.spells.findFirst({
                    where: eq(spells.id, id),
                });
            },
        }),

        condition: t.field({
            type: ConditionType,
            nullable: true,
            args: {
                id: t.arg.string({ required: true }),
            },
            resolve: async (_, { id }) => {
                return await db.query.conditions.findFirst({
                    where: eq(conditions.id, id),
                }) ?? null;
            },
        }),

        race: t.field({
            type: RaceType,
            nullable: true,
            args: {
                id: t.arg.string({ required: true }),
            },
            resolve: async (_, { id }) => {
                return await db.query.races.findFirst({
                    where: eq(races.id, id),
                });
            },
        }),


        resource: t.field({
            type: ClassResourceType,
            nullable: true,
            args: {
                id: t.arg.string({ required: true }),
            },
            resolve: async (_, { id }) => {
                return await db.query.classResources.findFirst({
                    where: eq(classResources.id, id),
                });
            },
        }),

        feat: t.field({
            type: FeatType,
            nullable: true,
            args: {
                id: t.arg.string({ required: true }),
            },
            resolve: async (_, { id }) => {
                return await db.query.feats.findFirst({
                    where: eq(feats.id, id),
                });
            },
        }),

        // Quest Queries
        quests: t.field({
            type: [QuestType],
            args: {
                characterId: t.arg.int({ required: true }),
            },
            resolve: async (_, { characterId }) => {
                return await db.query.quests.findMany({
                    where: eq(quests.characterId, characterId),
                    with: { objectives: true },
                    orderBy: (q, { desc }) => [desc(q.updatedAt)],
                });
            }
        }),
        quest: t.field({
            type: QuestType,
            nullable: true,
            args: {
                id: t.arg.int({ required: true }),
            },
            resolve: async (_, { id }) => {
                return await db.query.quests.findFirst({
                    where: eq(quests.id, id),
                    with: { objectives: true, logs: true },
                });
            }
        }),
    }),
});

// === Input Types ===

const CreateCharacterInput = builder.inputType("CreateCharacterInput", {
    fields: (t) => ({
        name: t.string({ required: true }),
        raceId: t.string({ required: true }),
        classId: t.string({ required: true }), // Initial Class
    }),
});

const CharacterClassInput = builder.inputType("CharacterClassInput", {
    fields: (t) => ({
        classId: t.string({ required: true }),
        subclassId: t.string({ required: false }),
        level: t.int({ required: true }),
    }),
});

const CharacterSpellInput = builder.inputType("CharacterSpellInput", {
    fields: (t) => ({
        spellId: t.string({ required: true }),
        prepared: t.boolean({ required: true }),
        isRitual: t.boolean({ required: true }),
    }),
});

const CharacterInventoryInput = builder.inputType("CharacterInventoryInput", {
    fields: (t) => ({
        itemId: t.string({ required: true }),
        quantity: t.int({ required: true }),
        equipped: t.boolean({ required: true }),
        isIdentified: t.boolean({ required: true }),
        isAttuned: t.boolean({ required: true }),
        currentUses: t.int({ required: false }),
    }),
});

const CharacterConditionInput = builder.inputType("CharacterConditionInput", {
    fields: (t) => ({
        conditionId: t.string({ required: true }),
        duration: t.string({ required: false }),
        isPermanent: t.boolean({ required: false }),
        source: t.string({ required: false }),
    }),
});

const CharacterResourceInput = builder.inputType("CharacterResourceInput", {
    fields: (t) => ({
        resourceId: t.string({ required: true }),
        usedUses: t.int({ required: true }),
    }),
});

const UpdateCharacterInput = builder.inputType("UpdateCharacterInput", {
    fields: (t) => ({
        name: t.string({ required: true }),
        raceId: t.string({ required: true }),
        backgroundId: t.string({ required: false }),
        alignment: t.string({ required: false }),
        xp: t.int({ required: true }),
        level: t.int({ required: true }),
        str: t.int({ required: true }),
        dex: t.int({ required: true }),
        con: t.int({ required: true }),
        int: t.int({ required: true }),
        wis: t.int({ required: true }),
        cha: t.int({ required: true }),
        hpCurrent: t.int({ required: true }),
        hpMax: t.int({ required: true }),
        tempHp: t.int({ required: true }),
        armorClass: t.int({ required: false }),
        speed: t.int({ required: true }),
        initiativeBonus: t.int({ required: true }),
        hitDiceCurrent: t.int({ required: true }),
        hitDiceMax: t.int({ required: true }),
        deathSaveSuccess: t.int({ required: true }),
        deathSaveFailure: t.int({ required: true }),
        inspiration: t.boolean({ required: true }),
        exhaustion: t.int({ required: true }),
        usedPactSlots: t.int({ required: true }),
        cp: t.int({ required: true }),
        sp: t.int({ required: true }),
        ep: t.int({ required: true }),
        gp: t.int({ required: true }),
        pp: t.int({ required: true }),
        abilityPointPool: t.int({ required: true }),
        size: t.string({ required: false }),
        appearance: t.string({ required: false }),
        backstory: t.string({ required: false }),
        notes: t.string({ required: false }),
        imageUrl: t.string({ required: false }),



        // JSON fields
        usedSpellSlots: t.field({ type: "JSON", required: false }),
        manualProficiencies: t.field({ type: "JSON", required: false }),
        proficiencies: t.field({ type: "JSON", required: false }),
        feats: t.field({ type: "JSON", required: false }),
        traits: t.field({ type: "JSON", required: false }),
        resourceModifiers: t.field({ type: "JSON", required: false }),

        // Relations
        classes: t.field({ type: [CharacterClassInput], required: false }),
        spells: t.field({ type: [CharacterSpellInput], required: false }),
        inventory: t.field({ type: [CharacterInventoryInput], required: false }),
        conditions: t.field({ type: [CharacterConditionInput], required: false }),
        resources: t.field({ type: [CharacterResourceInput], required: false }),
    }),
});

// === Mutation Type ===
builder.mutationType({
    fields: (t) => ({
        createCharacter: t.field({
            type: CharacterType,
            args: {
                input: t.arg({ type: CreateCharacterInput, required: true }),
            },
            resolve: async (_, { input }) => {
                // Determine Hit Die (Mock: assumed d8 for now if simpler, or fetch class)
                // In real implementation we'd fetch the class to get the hit die
                // Let's assume standard rules handling later, insert defaults.

                const [newChar] = await db.insert(characters).values({
                    name: input.name,
                    race: input.raceId,
                    level: 1,
                    xp: 0,
                    // Default stats (standard array or 10s)
                    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
                    hpCurrent: 8, hpMax: 8, // Placeholder
                    hitDiceCurrent: 1, hitDiceMax: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }).returning();

                // Insert Initial Class
                await db.insert(characterClasses).values({
                    characterId: newChar.id,
                    classId: input.classId,
                    level: 1
                });

                return await db.query.characters.findFirst({
                    where: eq(characters.id, newChar.id),
                    with: {
                        classes: { with: { class: true, subclass: true } },
                        raceEntry: true,
                        // ... other relations empty
                    },
                });
            }
        }),
        deleteCharacter: t.field({
            type: "Boolean",
            args: {
                id: t.arg.int({ required: true }),
            },
            resolve: async (_, { id }) => {
                const deleted = await db.delete(characters).where(eq(characters.id, id)).returning();
                return deleted.length > 0;
            }
        }),




        updateCharacter: t.field({
            type: CharacterType,
            nullable: true,
            args: {
                id: t.arg.int({ required: true }),
                input: t.arg({ type: UpdateCharacterInput, required: true }),
            },
            resolve: async (_, { id, input }) => {
                console.log(`[GraphQL] UpdateCharacter called for ID: ${id}`);
                console.log(`[GraphQL] Payload classes:`, JSON.stringify(input.classes, null, 2));
                console.log(`[GraphQL] Payload level: ${input.level}`);

                await db.transaction(async (tx) => {
                    // 1. Update Main Character Fields
                    const updateResult = await tx.update(characters)
                        .set({
                            name: input.name,
                            race: input.raceId,
                            backgroundId: input.backgroundId || null,
                            alignment: input.alignment || null,
                            xp: input.xp,
                            level: input.level,
                            str: input.str,
                            dex: input.dex,
                            con: input.con,
                            int: input.int,
                            wis: input.wis,
                            cha: input.cha,
                            hpCurrent: input.hpCurrent,
                            hpMax: input.hpMax,
                            tempHp: input.tempHp,
                            armorClass: input.armorClass || null,
                            speed: input.speed,
                            initiativeBonus: input.initiativeBonus,
                            hitDiceCurrent: input.hitDiceCurrent,
                            hitDiceMax: input.hitDiceMax,
                            deathSaveSuccess: input.deathSaveSuccess,
                            deathSaveFailure: input.deathSaveFailure,
                            inspiration: input.inspiration,
                            exhaustion: input.exhaustion,
                            usedPactSlots: input.usedPactSlots,
                            cp: input.cp,
                            sp: input.sp,
                            ep: input.ep,
                            gp: input.gp,
                            pp: input.pp,
                            abilityPointPool: input.abilityPointPool,
                            size: input.size || "Medium",
                            appearance: input.appearance || null,
                            backstory: input.backstory || null,
                            notes: input.notes || null,
                            imageUrl: input.imageUrl || null,

                            // JSON Fields
                            usedSpellSlots: input.usedSpellSlots,
                            manualProficiencies: input.manualProficiencies,
                            proficiencies: input.proficiencies,
                            feats: input.feats,
                            traits: input.traits,
                            resourceModifiers: input.resourceModifiers,
                            updatedAt: new Date(),
                        })
                        .where(eq(characters.id, id))
                        .returning({ id: characters.id });

                    console.log(`[GraphQL] Update modified ${updateResult.length} rows.`);

                    // 2. Update Relations if provided (Replace Strategy)

                    // Classes
                    if (input.classes) {
                        await tx.delete(characterClasses).where(eq(characterClasses.characterId, id));
                        if (input.classes.length > 0) {
                            await tx.insert(characterClasses).values(input.classes.map(c => ({
                                characterId: id,
                                classId: c.classId,
                                subclassId: c.subclassId,
                                level: c.level
                            })));
                        }
                    }

                    // Spells
                    if (input.spells) {
                        await tx.delete(characterSpells).where(eq(characterSpells.characterId, id));
                        if (input.spells.length > 0) {
                            await tx.insert(characterSpells).values(input.spells.map(s => ({
                                characterId: id,
                                spellId: s.spellId,
                                prepared: s.prepared,
                                isRitual: s.isRitual
                            })));
                        }
                    }

                    // Inventory
                    if (input.inventory) {
                        await tx.delete(characterInventory).where(eq(characterInventory.characterId, id));
                        if (input.inventory.length > 0) {
                            await tx.insert(characterInventory).values(input.inventory.map(i => ({
                                characterId: id,
                                itemId: i.itemId,
                                quantity: i.quantity,
                                equipped: i.equipped,
                                isIdentified: i.isIdentified,
                                isAttuned: i.isAttuned,
                                currentUses: i.currentUses || null
                            })));
                        }
                    }

                    // Conditions
                    if (input.conditions) {
                        await tx.delete(characterConditions).where(eq(characterConditions.characterId, id));
                        if (input.conditions.length > 0) {
                            await tx.insert(characterConditions).values(input.conditions.map(c => ({
                                characterId: id,
                                conditionId: c.conditionId,
                                duration: c.duration || null,
                                isPermanent: c.isPermanent || false,
                                source: c.source || null
                            })));
                        }
                    }

                    // Resources
                    if (input.resources) {
                        await tx.delete(characterResources).where(eq(characterResources.characterId, id));
                        if (input.resources.length > 0) {
                            await tx.insert(characterResources).values(input.resources.map(r => ({
                                characterId: id,
                                resourceId: r.resourceId,
                                usedUses: r.usedUses
                            })));
                        }
                    }
                });

                // Return updated character
                return await db.query.characters.findFirst({
                    where: eq(characters.id, id),
                    with: {
                        classes: { with: { class: true, subclass: true } },
                        spells: { with: { spell: true } },
                        inventory: { with: { item: true } },
                        languages: { with: { language: true } },
                        conditions: { with: { condition: true } },
                        raceEntry: true,
                        background: true,
                        resources: { with: { resource: true } },
                    },
                });
            },
        }),
        addCharacterItem: t.field({
            type: CharacterInventoryType,
            args: {
                characterId: t.arg.int({ required: true }),
                itemId: t.arg.string({ required: true }),
                quantity: t.arg.int({ required: true }),
            },
            resolve: async (_, { characterId, itemId, quantity }) => {
                const [entry] = await db.insert(characterInventory).values({
                    characterId,
                    itemId,
                    quantity,
                    equipped: false,
                    isIdentified: false,
                    isAttuned: false,
                    currentUses: null,
                }).returning();

                return await db.query.characterInventory.findFirst({
                    where: eq(characterInventory.id, entry.id),
                    with: { item: true }
                });
            }
        }),

        removeCharacterItem: t.field({
            type: "Boolean",
            args: {
                inventoryId: t.arg.int({ required: true }),
            },
            resolve: async (_, { inventoryId }) => {
                const deleted = await db.delete(characterInventory).where(eq(characterInventory.id, inventoryId)).returning();
                return deleted.length > 0;
            }
        }),

        updateCharacterItemState: t.field({
            type: CharacterInventoryType,
            args: {
                inventoryId: t.arg.int({ required: true }),
                equipped: t.arg.boolean({ required: false }),
                isIdentified: t.arg.boolean({ required: false }),
                isAttuned: t.arg.boolean({ required: false }),
                quantity: t.arg.int({ required: false }),
            },
            resolve: async (_, { inventoryId, equipped, isIdentified, isAttuned, quantity }) => {
                const updates: any = {};
                if (equipped !== undefined && equipped !== null) updates.equipped = equipped;
                if (isIdentified !== undefined && isIdentified !== null) updates.isIdentified = isIdentified;
                if (isAttuned !== undefined && isAttuned !== null) updates.isAttuned = isAttuned;
                if (quantity !== undefined && quantity !== null) updates.quantity = quantity;

                // Auto-Unequip Logic
                if (equipped === true) {
                    const currentEntry = await db.query.characterInventory.findFirst({
                        where: eq(characterInventory.id, inventoryId),
                        with: { item: true }
                    });

                    if (currentEntry?.item?.slot) {
                        const conflictingItems = await db.query.characterInventory.findMany({
                            where: and(
                                eq(characterInventory.characterId, currentEntry.characterId),
                                eq(characterInventory.equipped, true),
                                ne(characterInventory.id, inventoryId) // Don't unequip self if already equipped
                            ),
                            with: { item: true }
                        });

                        const itemsToUnequip = conflictingItems.filter(i => i.item?.slot === currentEntry.item.slot);

                        for (const item of itemsToUnequip) {
                            await db.update(characterInventory)
                                .set({ equipped: false })
                                .where(eq(characterInventory.id, item.id));
                        }
                    }
                }

                await db.update(characterInventory)
                    .set(updates)
                    .where(eq(characterInventory.id, inventoryId));

                return await db.query.characterInventory.findFirst({
                    where: eq(characterInventory.id, inventoryId),
                    with: { item: true }
                });
            }
        }),

        learnSpell: t.field({
            type: CharacterSpellType,
            args: {
                characterId: t.arg.int({ required: true }),
                spellId: t.arg.string({ required: true }),
            },
            resolve: async (_, { characterId, spellId }) => {
                const [entry] = await db.insert(characterSpells).values({
                    characterId,
                    spellId,
                    prepared: false,
                    isRitual: false,
                }).returning();

                return await db.query.characterSpells.findFirst({
                    where: and(
                        eq(characterSpells.characterId, characterId),
                        eq(characterSpells.spellId, spellId)
                    ),
                    with: { spell: true }
                });
            }
        }),

        forgetSpell: t.field({
            type: "Boolean",
            args: {
                characterId: t.arg.int({ required: true }),
                spellId: t.arg.string({ required: true }),
            },
            resolve: async (_, { characterId, spellId }) => {
                const deleted = await db.delete(characterSpells)
                    .where(and(
                        eq(characterSpells.characterId, characterId),
                        eq(characterSpells.spellId, spellId)
                    ))
                    .returning();
                return deleted.length > 0;
            }
        }),

        prepareSpell: t.field({
            type: CharacterSpellType,
            args: {
                characterId: t.arg.int({ required: true }),
                spellId: t.arg.string({ required: true }),
                prepared: t.arg.boolean({ required: true }),
            },
            resolve: async (_, { characterId, spellId, prepared }) => {
                await db.update(characterSpells)
                    .set({ prepared })
                    .where(and(
                        eq(characterSpells.characterId, characterId),
                        eq(characterSpells.spellId, spellId)
                    ));

                return await db.query.characterSpells.findFirst({
                    where: and(
                        eq(characterSpells.characterId, characterId),
                        eq(characterSpells.spellId, spellId)
                    ),
                    with: { spell: true }
                });
            }
        }),

        toggleSpellRitual: t.field({
            type: CharacterSpellType,
            args: {
                characterId: t.arg.int({ required: true }),
                spellId: t.arg.string({ required: true }),
                isRitual: t.arg.boolean({ required: true }),
            },
            resolve: async (_, { characterId, spellId, isRitual }) => {
                await db.update(characterSpells)
                    .set({ isRitual })
                    .where(and(
                        eq(characterSpells.characterId, characterId),
                        eq(characterSpells.spellId, spellId)
                    ));

                return await db.query.characterSpells.findFirst({
                    where: and(
                        eq(characterSpells.characterId, characterId),
                        eq(characterSpells.spellId, spellId)
                    ),
                    with: { spell: true }
                });
            }
        }),

        toggleSpellConcentration: t.field({
            type: CharacterSpellType,
            args: {
                characterId: t.arg.int({ required: true }),
                spellId: t.arg.string({ required: true }),
                isConcentrating: t.arg.boolean({ required: true }),
            },
            resolve: async (_, { characterId, spellId, isConcentrating }) => {
                const { eq, and } = await import("drizzle-orm");

                if (isConcentrating) {
                    await db.transaction(async (tx) => {
                        // Clear all other concentration flags
                        await tx.update(characterSpells)
                            .set({ isConcentrating: false })
                            .where(and(
                                eq(characterSpells.characterId, characterId),
                                eq(characterSpells.isConcentrating, true)
                            ));

                        // Set the target spell
                        await tx.update(characterSpells)
                            .set({ isConcentrating: true })
                            .where(and(
                                eq(characterSpells.characterId, characterId),
                                eq(characterSpells.spellId, spellId)
                            ));
                    });
                } else {
                    await db.update(characterSpells)
                        .set({ isConcentrating: false })
                        .where(and(
                            eq(characterSpells.characterId, characterId),
                            eq(characterSpells.spellId, spellId)
                        ));
                }

                return await db.query.characterSpells.findFirst({
                    where: and(
                        eq(characterSpells.characterId, characterId),
                        eq(characterSpells.spellId, spellId)
                    ),
                    with: { spell: true }
                });
            }
        }),



        updateCharacterCurrency: t.field({
            type: CharacterType,
            args: {
                characterId: t.arg.int({ required: true }),
                cp: t.arg.int({ required: true }),
                sp: t.arg.int({ required: true }),
                ep: t.arg.int({ required: true }),
                gp: t.arg.int({ required: true }),
                pp: t.arg.int({ required: true }),
            },
            resolve: async (_, { characterId, cp, sp, ep, gp, pp }) => {
                await db.update(characters)
                    .set({ cp, sp, ep, gp, pp })
                    .where(eq(characters.id, characterId));

                return await getFullCharacter(characterId);
            }
        }),

        addCharacterLanguage: t.field({
            type: CharacterType,
            args: {
                characterId: t.arg.int({ required: true }),
                languageId: t.arg.string({ required: true }),
            },
            resolve: async (_, { characterId, languageId }) => {
                await db.insert(characterLanguages)
                    .values({ characterId, languageId })
                    .onConflictDoNothing();

                return await getFullCharacter(characterId);
            }
        }),

        removeCharacterLanguage: t.field({
            type: CharacterType,
            args: {
                characterId: t.arg.int({ required: true }),
                languageId: t.arg.string({ required: true }),
            },
            resolve: async (_, { characterId, languageId }) => {
                await db.delete(characterLanguages)
                    .where(and(
                        eq(characterLanguages.characterId, characterId),
                        eq(characterLanguages.languageId, languageId)
                    ));

                return await getFullCharacter(characterId);
            }
        }),

        addCharacterCondition: t.field({
            type: CharacterType,
            args: {
                characterId: t.arg.int({ required: true }),
                conditionId: t.arg.string({ required: true }),
                level: t.arg.int({ required: false }), // For exhaustion
            },
            resolve: async (_, { characterId, conditionId, level }) => {
                await db.insert(characterConditions)
                    .values({
                        characterId,
                        conditionId,
                        // Default values
                        duration: null,
                        isPermanent: false,
                        source: null
                    })
                    .onConflictDoNothing(); // Basic toggle logic might handle dupes on client, but safe here

                return await getFullCharacter(characterId);
            }
        }),

        removeCharacterCondition: t.field({
            type: CharacterType,
            args: {
                characterId: t.arg.int({ required: true }),
                conditionId: t.arg.string({ required: true }),
            },
            resolve: async (_, { characterId, conditionId }) => {
                await db.delete(characterConditions)
                    .where(and(
                        eq(characterConditions.characterId, characterId),
                        eq(characterConditions.conditionId, conditionId)
                    ));

                return await getFullCharacter(characterId);
            }
        }),

        // Handling Proficiencies JSON: { skills: { [key: string]: boolean | string }, tools: string[] }
        // For simplicity, we'll have separate mutations for Skills and Tools or a generic one.
        // Let's do a generic "update" for now, or distinct add/remove for list-based ones.
        // Since `proficiencies` is a generic JSON blob in the schema, we might need a specific input type or just basic manipulation.
        // Let's implement `addCharacterToolProficiency` and `removeCharacterToolProficiency`.
        // Skill proficiencies are often more complex (proficiency/expertise), so `updateCharacterSkill` might be better.

        updateCharacterSkill: t.field({
            type: CharacterType,
            args: {
                characterId: t.arg.int({ required: true }),
                skill: t.arg.string({ required: true }),
                proficiency: t.arg.string({ required: true }), // "none", "proficient", "expertise" - simplified to boolean/string logic inside
            },
            resolve: async (_, { characterId, skill, proficiency }) => {
                const char = await db.query.characters.findFirst({
                    where: eq(characters.id, characterId),
                });
                if (!char) throw new Error("Character not found");

                const currentProfs = (char.proficiencies as any) || { skills: {}, tools: [] };
                const newSkills = { ...currentProfs.skills };

                if (proficiency === "none") {
                    delete newSkills[skill];
                } else {
                    newSkills[skill] = proficiency === "expertise" ? "expertise" : true;
                }

                const newProfs = { ...currentProfs, skills: newSkills };

                await db.update(characters)
                    .set({ proficiencies: newProfs })
                    .where(eq(characters.id, characterId));

                return await getFullCharacter(characterId);
            }
        }),

        addCharacterTool: t.field({
            type: CharacterType,
            args: {
                characterId: t.arg.int({ required: true }),
                tool: t.arg.string({ required: true }),
            },
            resolve: async (_, { characterId, tool }) => {
                const char = await db.query.characters.findFirst({
                    where: eq(characters.id, characterId),
                });
                if (!char) throw new Error("Character not found");

                const currentProfs = (char.proficiencies as any) || { skills: {}, tools: [] };
                const toolList = currentProfs.tools || [];
                if (!toolList.includes(tool)) {
                    toolList.push(tool);
                }
                const newProfs = { ...currentProfs, tools: toolList };

                await db.update(characters)
                    .set({ proficiencies: newProfs })
                    .where(eq(characters.id, characterId));

                return await getFullCharacter(characterId);
            }
        }),

        removeCharacterTool: t.field({
            type: CharacterType,
            args: {
                characterId: t.arg.int({ required: true }),
                tool: t.arg.string({ required: true }),
            },
            resolve: async (_, { characterId, tool }) => {
                const char = await db.query.characters.findFirst({
                    where: eq(characters.id, characterId),
                });
                if (!char) throw new Error("Character not found");

                const currentProfs = (char.proficiencies as any) || { skills: {}, tools: [] };
                const toolList = (currentProfs.tools || []).filter((t: string) => t !== tool);
                const newProfs = { ...currentProfs, tools: toolList };

                await db.update(characters)
                    .set({ proficiencies: newProfs })
                    .where(eq(characters.id, characterId));

                return await getFullCharacter(characterId);
            }
        }),

        createGlobalItem: t.field({
            type: CreateItemResultType,
            args: {
                input: t.arg({ type: CreateItemInput, required: true }),
            },
            resolve: async (_, { input }) => {
                try {
                    // Generate ID from name: "Sword of Truth" -> "sword-of-truth"
                    const sourceName = input.trueName || input.name;
                    let slug = sourceName
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '');

                    if (!slug) slug = "item";

                    // Check for existing ID
                    let uniqueId = slug;
                    let counter = 1;
                    while (true) {
                        const existing = await db.query.items.findFirst({
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                            where: (items, { eq }) => eq(items.id, uniqueId)
                        });
                        if (!existing) break;
                        uniqueId = `${slug}-${counter}`;
                        counter++;
                    }

                    // Insert Item
                    await db.insert(items).values({
                        id: uniqueId,
                        name: input.name,
                        type: input.type,

                        // Cost & Weight
                        costAmount: input.costAmount ?? 0,
                        costCurrency: input.costCurrency ?? "gp",
                        weightAmount: input.weightAmount ?? 0,
                        weightUnit: input.weightUnit ?? "lb",
                        fixedWeight: input.fixedWeight ?? false,

                        // Common
                        description: input.description,
                        rarity: input.rarity ?? "common",
                        category: input.category ?? "misc",
                        slot: input.slot,

                        // Combat
                        damageDice: input.damageDice,
                        damageType: input.damageType,
                        armorClass: input.armorClass,
                        strengthRequirement: input.strengthRequirement,
                        stealthDisadvantage: input.stealthDisadvantage ?? false,
                        properties: input.properties ?? [],
                        range: input.range,

                        // Magic
                        isMagical: input.isMagical ?? false,
                        isCursed: input.isCursed ?? false,
                        requiresAttunement: input.requiresAttunement ?? false,
                        trueName: input.trueName,
                        shownEffect: input.shownEffect,
                        trueEffect: input.trueEffect,
                        modifiers: input.modifiers ?? [],

                        // Consumable
                        uses: input.uses,
                        usesMax: input.usesMax,

                        tags: input.tags ?? [],
                    });

                    return { success: true, itemId: uniqueId, error: null };
                } catch (e) {
                    console.error("Failed to create item:", e);
                    return { success: false, itemId: null, error: String(e) };
                }
            },
        }),
        updateCharacterAlignment: t.field({
            type: "Boolean",
            args: {
                characterId: t.arg.int({ required: true }),
                alignment: t.arg.string({ required: true }),
            },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            resolve: async (_, { characterId, alignment }) => {
                try {
                    await db.update(characters)
                        .set({ alignment })
                        .where(eq(characters.id, characterId));
                    return true;
                } catch (e) {
                    console.error(e);
                    return false;
                }
            },
        }),
        levelUp: t.field({
            type: CharacterType,
            args: {
                input: t.arg({ type: LevelUpInput, required: true }),
            },
            resolve: async (_, { input }) => {
                const { eq, and } = await import("drizzle-orm");

                // 1. Fetch Character & Classes
                const char = await db.query.characters.findFirst({
                    where: eq(characters.id, input.characterId),
                    with: { classes: true }
                });

                if (!char) throw new Error("Character not found");

                // 2. XP Check
                const { calculateTotalLevel } = await import("@/lib/mechanics/leveling");
                const currentTotalLevel = calculateTotalLevel(char.classes);
                if (currentTotalLevel >= 20) throw new Error("Max level reached");

                // 3. Perform Transaction
                return await db.transaction(async (tx) => {
                    // Update Class Level
                    const existingClass = char.classes.find(c => c.classId === input.classId);
                    if (existingClass) {
                        await tx.update(characterClasses)
                            .set({
                                level: existingClass.level + 1,
                                subclassId: input.subclassId || existingClass.subclassId
                            })
                            .where(and(
                                eq(characterClasses.characterId, input.characterId),
                                eq(characterClasses.classId, input.classId)
                            ));
                    } else {
                        await tx.insert(characterClasses).values({
                            characterId: input.characterId,
                            classId: input.classId,
                            level: 1,
                            subclassId: input.subclassId || null
                        });
                    }

                    // Prepare Stats Update
                    let newStr = char.str;
                    let newDex = char.dex;
                    let newCon = char.con;
                    let newInt = char.int;
                    let newWis = char.wis;
                    let newCha = char.cha;
                    let currentFeats = (char.feats as any[]) || [];

                    let resourceModifiers = (char.resourceModifiers as any[]) || [];

                    // Apply ASI if present
                    if (input.asi) {
                        const asiMap = input.asi as Record<string, number>;
                        if (asiMap.str) newStr += asiMap.str;
                        if (asiMap.dex) newDex += asiMap.dex;
                        if (asiMap.con) newCon += asiMap.con;
                        if (asiMap.int) newInt += asiMap.int;
                        if (asiMap.wis) newWis += asiMap.wis;
                        if (asiMap.cha) newCha += asiMap.cha;

                        // Log ASI for Reset
                        const modifiers: any[] = [];

                        Object.entries(asiMap).forEach(([key, value]) => {
                            if (typeof value === 'number' && value !== 0) {
                                modifiers.push({
                                    type: "asi",
                                    target: key,
                                    value: value,
                                    valueString: null,
                                    condition: null
                                });
                            }
                        });

                        resourceModifiers.push({
                            id: `asi_${input.classId}_${currentTotalLevel + 1}_${Date.now()}`,
                            modifications: modifiers,
                            source: `${input.classId} Level ${currentTotalLevel + 1}`,
                            duration: "permanent"
                        });
                    }

                    // Apply Feat if present
                    if (input.featId) {
                        const feat = await db.query.feats.findFirst({
                            where: eq(feats.id, input.featId)
                        });
                        if (feat) {
                            currentFeats = [...currentFeats, {
                                id: feat.id,
                                name: feat.name,
                                description: feat.description,
                                modifiers: feat.modifiers
                            }];

                            // Log Feat for Reset
                            // KMP client strips 'content' field, so we must encode featId in the ID to survive round-trip
                            // Format: feat_v2:<classId>:<level>:<featId>:<timestamp>
                            const featModId = `feat_v2:${input.classId}:${currentTotalLevel + 1}:${feat.id}:${Date.now()}`;
                            resourceModifiers.push({
                                id: featModId,
                                type: "feat",
                                content: { featId: feat.id },
                                source: `${input.classId} Level ${currentTotalLevel + 1}`,
                                duration: "permanent"
                            });
                        }
                    }

                    // Update Character
                    const [updatedChar] = await tx.update(characters)
                        .set({
                            level: currentTotalLevel + 1,
                            hpMax: char.hpMax + input.hpIncrease,
                            hpCurrent: char.hpCurrent + input.hpIncrease,
                            hitDiceMax: char.hitDiceMax + 1,
                            hitDiceCurrent: char.hitDiceCurrent + 1,
                            str: newStr,
                            dex: newDex,
                            con: newCon,
                            int: newInt,
                            wis: newWis,
                            cha: newCha,
                            feats: currentFeats,
                            resourceModifiers: resourceModifiers,
                            updatedAt: new Date()
                        })
                        .where(eq(characters.id, input.characterId))
                        .returning();

                    return await tx.query.characters.findFirst({
                        where: eq(characters.id, input.characterId),
                        with: {
                            classes: { with: { class: true, subclass: true } },
                            spells: { with: { spell: true } },
                            inventory: { with: { item: true } },
                            languages: { with: { language: true } },
                            conditions: { with: { condition: true } },
                            raceEntry: true,
                            background: true,
                            resources: { with: { resource: true } },
                        }
                    });
                });
            }
        }),

        // Quest Mutations
        addQuest: t.field({
            type: QuestType,
            args: {
                characterId: t.arg.int({ required: true }),
                title: t.arg.string({ required: true }),
                description: t.arg.string({ required: false }),
            },
            resolve: async (_, { characterId, title, description }) => {
                const [newQuest] = await db.insert(quests).values({
                    characterId,
                    title,
                    description,
                    status: "active",
                    isTracked: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }).returning();
                return { ...newQuest, objectives: [], logs: [] };
            }
        }),

        updateQuest: t.field({
            type: QuestType,
            args: {
                questId: t.arg.int({ required: true }),
                title: t.arg.string({ required: false }),
                description: t.arg.string({ required: false }),
                status: t.arg.string({ required: false }),
                isTracked: t.arg.boolean({ required: false }),
            },
            resolve: async (_, { questId, title, description, status, isTracked }) => {
                const updates: any = { updatedAt: new Date() };
                if (title !== undefined) updates.title = title;
                if (description !== undefined) updates.description = description;
                if (status !== undefined) updates.status = status;
                if (isTracked !== undefined) updates.isTracked = isTracked;

                const [updatedQuest] = await db.update(quests)
                    .set(updates)
                    .where(eq(quests.id, questId))
                    .returning();

                return await db.query.quests.findFirst({
                    where: eq(quests.id, updatedQuest.id),
                    with: { objectives: true, logs: true }
                });
            }
        }),

        deleteQuest: t.field({
            type: "Boolean",
            args: {
                questId: t.arg.int({ required: true }),
            },
            resolve: async (_, { questId }) => {
                const deleted = await db.delete(quests).where(eq(quests.id, questId)).returning();
                return deleted.length > 0;
            }
        }),

        addQuestObjective: t.field({
            type: QuestObjectiveType,
            args: {
                questId: t.arg.int({ required: true }),
                description: t.arg.string({ required: true }),
                order: t.arg.int({ required: false }),
            },
            resolve: async (_, { questId, description, order }) => {
                const [objective] = await db.insert(questObjectives).values({
                    questId,
                    description,
                    isCompleted: false,
                    order: order ?? 0
                }).returning();
                return objective;
            }
        }),

        toggleQuestObjective: t.field({
            type: QuestObjectiveType,
            args: {
                objectiveId: t.arg.int({ required: true }),
                isCompleted: t.arg.boolean({ required: true }),
            },
            resolve: async (_, { objectiveId, isCompleted }) => {
                const [updated] = await db.update(questObjectives)
                    .set({ isCompleted })
                    .where(eq(questObjectives.id, objectiveId))
                    .returning();
                return updated;
            }
        }),

        addQuestLog: t.field({
            type: QuestLogType,
            args: {
                questId: t.arg.int({ required: true }),
                content: t.arg.string({ required: true }),
            },
            resolve: async (_, { questId, content }) => {
                const [log] = await db.insert(questLogs).values({
                    questId,
                    content,
                    createdAt: new Date(),
                }).returning();
                return log;
            }
        }),

        deleteQuestObjective: t.field({
            type: "Boolean",
            args: {
                objectiveId: t.arg.int({ required: true }),
            },
            resolve: async (_, { objectiveId }) => {
                const deleted = await db.delete(questObjectives).where(eq(questObjectives.id, objectiveId)).returning();
                return deleted.length > 0;
            }
        }),

        deleteQuestLog: t.field({
            type: "Boolean",
            args: {
                logId: t.arg.int({ required: true }),
            },
            resolve: async (_, { logId }) => {
                const deleted = await db.delete(questLogs).where(eq(questLogs.id, logId)).returning();
                return deleted.length > 0;
            }
        }),
    }),
});

// === Build Schema ===
export const schema = builder.toSchema();
