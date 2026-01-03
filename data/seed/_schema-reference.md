# Seed Data Schema Reference

This directory contains modular JSON files for seeding the D&D 5e database.

## File Order (Dependency-Based)

Files are numbered to enforce FK dependency order:

| File | Entity | DB Table | Schema | Count |
|------|--------|----------|--------|-------|
| `01-classes.json` | Classes | `classes` | `ClassSchema` | 12 |
| `02-subclasses.json` | Subclasses | `subclasses` | `SubclassSchema` | 48 |
| `03-class-progression.json` | Class Levels | `class_progression` | `ClassProgressionSchema` | ~240 |
| `04-races.json` | Races/Species | `races` | `RaceSchema` | 32 |
| `05-traits.json` | Racial Traits | `traits` | `TraitSchema` | 49 |
| `06-backgrounds.json` | Backgrounds | `backgrounds` | `BackgroundSchema` | 16 |
| `07-languages.json` | Languages | `languages` | `LanguageSchema` | 16 |
| `08-conditions.json` | Conditions | `conditions` | `ConditionSchema` | 15 |
| `09-items.json` | Items | `items` | `ItemSchema` | 26 |
| `10-spells.json` | Spells | `spells` | `SpellSchema` | 391 |
| `11-feats.json` | Feats | `feats` | `FeatSchema` | 65 |

## File Format

Each JSON file follows this structure:

```json
{
  "$schema": "src/lib/import/schemas.ts#SchemaName",
  "$table": "database_table_name",
  "$description": "Human-readable description",
  "data": [/* array of entities */]
}
```

## Schema Locations

All Zod schemas are in: `src/lib/import/schemas.ts`

| Schema | Validates |
|--------|-----------|
| `ClassSchema` | Class entries (hit_die, saving_throws, proficiencies) |
| `SubclassSchema` | Subclass with class_id reference |
| `ClassProgressionSchema` | Level-by-level features and slots |
| `RaceSchema` | Species with modifiers (size, speed) and trait_options |
| `TraitSchema` | Racial traits with modifiers |
| `BackgroundSchema` | 2024 backgrounds with ability_options |
| `LanguageSchema` | Standard/Exotic languages |
| `ConditionSchema` | Status conditions |
| `ItemSchema` | Equipment with modifiers |
| `SpellSchema` | Spells with structured components/duration |
| `FeatSchema` | Optional features with modifiers |

## DB Schema Location

Drizzle table definitions: `src/db/schema.ts`

## How to Seed

```bash
npm run db:seed
```

This runs `scripts/seed.ts` which:
1. Reads files from `data/seed/` sorted by prefix
2. Validates each file's `data` array against its schema
3. Upserts records into the corresponding table

## Generated Files

`10-spells.json` was generated from `reference/seeding/spells.md` using:

```bash
npx tsx scripts/generate-spells.ts
```

## Character States System

The application supports derived character states for state-aware calculations.

### State Detection (`src/lib/mechanics/character-states.ts`)

| State | Detection Logic |
|-------|-----------------|
| `unarmored` | No armor equipped in chest slot |
| `light_armored` | Light armor type equipped |
| `medium_armored` | Medium armor type equipped |
| `heavy_armored` | Heavy armor type equipped |
| `shielded` | Shield in off_hand slot |
| `dual_wielding` | Weapons in both hands |
| `one_handed` | Single main_hand weapon |
| `two_handed` | Two-handed weapon equipped |

### AC Formula Overrides (`src/lib/mechanics/ac-formulas.ts`)

Features with alternative AC calculations:

| Feature | Class | Formula | Condition |
|---------|-------|---------|-----------|
| Unarmored Defense | Barbarian | 10 + DEX + CON | Unarmored |
| Unarmored Defense | Monk | 10 + DEX + WIS | Unarmored |
| Draconic Resilience | Sorcerer | 13 + DEX | Unarmored |

Per D&D 5e rules, only one AC method applies at a time (highest wins).

