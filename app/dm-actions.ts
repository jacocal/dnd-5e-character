"use server";

import { db } from "@/db";
import { items } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { ItemSchema } from "@/lib/import/schemas";
import { z } from "zod";
import { eq } from "drizzle-orm";

// We exclude 'id' from the input schema because we'll generate it
const CreateItemSchema = ItemSchema.omit({ id: true });
export type CreateItemInput = z.infer<typeof CreateItemSchema>;

export async function createGlobalItem(data: CreateItemInput) {
    try {
        // Validate input
        const validated = CreateItemSchema.parse(data);

        // Generate ID from name: "Sword of Truth" -> "sword-of-truth"
        // Priority: true_name (if available) -> name
        const sourceName = validated.true_name || validated.name;

        // Append random suffix if needed to ensure uniqueness
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
                where: (items, { eq }) => eq(items.id, uniqueId)
            });
            if (!existing) break;
            uniqueId = `${slug}-${counter}`;
            counter++;
        }

        // Parse Cost: "15 gp" -> 15, "gp"
        let costAmount = 0;
        let costCurrency = "gp";
        if (validated.cost) {
            const match = validated.cost.match(/(\d+)\s*([a-z]+)/i);
            if (match) {
                costAmount = parseInt(match[1]);
                costCurrency = match[2].toLowerCase();
            }
        }

        // Parse Weight: "3 lb" -> 3. "3" -> 3
        let weightAmount = 0;
        if (validated.weight) {
            const match = validated.weight.match(/(\d*\.?\d+)/);
            if (match) {
                weightAmount = parseFloat(match[1]);
            }
        }

        // Insert Item
        await db.insert(items).values({
            id: uniqueId,
            name: validated.name,
            type: validated.type,

            // Cost & Weight
            costAmount,
            costCurrency,
            weightAmount,
            weightUnit: "lb",
            fixedWeight: validated.fixed_weight,

            // Common
            description: validated.description,
            rarity: validated.rarity || "common",
            category: (validated as any).category || "misc", // category might validly come from payload but isn't in ItemSchema yet?
            slot: validated.slot,

            // Combat
            damageDice: validated.damage_dice,
            damageType: validated.damage_type,
            armorClass: validated.armor_class,
            strengthRequirement: validated.strength_requirement,
            stealthDisadvantage: validated.stealth_disadvantage,
            properties: validated.properties || [],
            range: validated.range, // schema.ts might need this column too? checked ItemSchema has it, need to check DB schema

            // Magic
            isMagical: validated.is_magical ?? false,
            isCursed: validated.is_cursed ?? false,
            requiresAttunement: validated.requires_attunement ?? false,
            trueName: validated.true_name,
            shownEffect: validated.shown_effect,
            trueEffect: validated.true_effect,
            modifiers: validated.modifiers || [],

            // Consumable
            uses: validated.uses,
            usesMax: validated.uses_max,

            tags: validated.tags || [],
        });

        revalidatePath("/dm/items/create");
        return { success: true, itemId: uniqueId };
    } catch (error) {
        console.error("Failed to create item:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation failed", details: error.issues };
        }
        return { success: false, error: "Database error" };
    }
}

// ===== ALIGNMENT MANAGEMENT (DM Tools) =====

import { characters } from "@/db/schema";

/**
 * Fetches all characters with their id, name, and alignment for DM management.
 */
export async function getActivePlayersWithAlignment() {
    try {
        const players = await db.query.characters.findMany({
            columns: {
                id: true,
                name: true,
                alignment: true,
            },
            orderBy: (characters, { asc }) => [asc(characters.name)],
        });
        return { success: true, players };
    } catch (error) {
        console.error("Failed to fetch players:", error);
        return { success: false, error: "Failed to fetch players" };
    }
}

/**
 * Updates a character's alignment (DM only).
 */
export async function updateCharacterAlignment(characterId: number, alignment: string) {
    try {
        await db.update(characters)
            .set({ alignment })
            .where(eq(characters.id, characterId));

        revalidatePath(`/character/${characterId}`);
        revalidatePath("/dm");
        return { success: true };
    } catch (error) {
        console.error("Failed to update alignment:", error);
        return { success: false, error: "Failed to update alignment" };
    }
}
