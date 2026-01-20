import { pgEnum } from "drizzle-orm/pg-core";

export const abilityEnum = pgEnum("ability", [
    "STR",
    "DEX",
    "CON",
    "INT",
    "WIS",
    "CHA",
]);

export const skillEnum = pgEnum("skill", [
    "Acrobatics",
    "Animal Handling",
    "Arcana",
    "Athletics",
    "Deception",
    "History",
    "Insight",
    "Intimidation",
    "Investigation",
    "Medicine",
    "Nature",
    "Perception",
    "Performance",
    "Persuasion",
    "Religion",
    "Sleight of Hand",
    "Stealth",
    "Survival",
]);

export const sizeEnum = pgEnum("size", [
    "Tiny",
    "Small",
    "Medium",
    "Large",
    "Huge",
    "Gargantuan",
]);

export const castingTimeEnum = pgEnum("casting_time", [
    "1 Action",
    "1 Bonus Action",
    "1 Reaction",
    "1 Minute",
    "10 Minutes",
    "1 Hour",
    "8 Hours",
    "24 Hours",
]);

// Spellcasting type for multiclass spell slot calculation
// - full: Full casters (Wizard, Sorcerer, Bard, Cleric, Druid) - 1.0 multiplier
// - half: Half casters (Paladin, Ranger) - 0.5 round DOWN
// - artificer: Artificer - 0.5 round UP (special rule)
// - third: Third casters (Arcane Trickster, Eldritch Knight subclasses) - 0.33 round DOWN
// - pact: Warlock Pact Magic - separate slot pool
// - none: Non-casters (Barbarian, Fighter, Monk, Rogue base)
export const spellcastingTypeEnum = pgEnum("spellcasting_type", [
    "full",
    "half",
    "artificer",
    "third",
    "pact",
    "none",
]);
