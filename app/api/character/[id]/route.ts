
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { characters } from "@/db/schema";
import { getCharacterById } from "@/db/queries";
import { mapCharacterToKmp } from "@/lib/kmp-mapping";
import { eq } from "drizzle-orm";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const id = parseInt((await params).id);
    if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    try {
        const character = await getCharacterById(id);

        if (!character) {
            return NextResponse.json({ error: "Character not found" }, { status: 404 });
        }

        const cleanCharacter = mapCharacterToKmp(character);
        console.log(`[API-GET] Served Char ${id}: ${cleanCharacter.spells.length} spells, ${cleanCharacter.resources.length} resources.`);

        return NextResponse.json(cleanCharacter);
    } catch (error) {
        console.error("Failed to fetch character:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const id = parseInt((await params).id);
    if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    try {
        const body = await request.json();
        console.log(`[API-PUT] Updating Char ${id}. Payload payload spells: ${body.spells?.length}`);

        await db.transaction(async (tx) => {
            // 1. Separate Relations from Core Data
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {
                classes: _classes, spells, inventory, conditions, resources,
                raceEntry: _raceEntry, background: _background, quests: _quests,
                proficiencies, manualProficiencies,
                ...coreData
            } = body;

            // 2. Update Core Character
            await tx.update(characters)
                .set({
                    ...coreData,
                    updatedAt: new Date().toISOString(),
                    proficiencies: proficiencies,
                    manualProficiencies: manualProficiencies
                })
                .where(eq(characters.id, id));

            // 3. Update Relations 

            // Spells
            if (Array.isArray(spells)) {
                const { characterSpells } = await import("@/db/schema");
                await tx.delete(characterSpells).where(eq(characterSpells.characterId, id));
                if (spells.length > 0) {
                    const inserts = spells.map((s: { spellId?: string; spell?: { id: string }; prepared?: boolean; isRitual?: boolean }) => ({
                        characterId: id,
                        spellId: s.spellId || s.spell?.id,
                        prepared: s.prepared ?? false,
                        isRitual: s.isRitual ?? false
                    })).filter((i: { spellId?: string }) => i.spellId);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (inserts.length > 0) await tx.insert(characterSpells).values(inserts as any);
                }
            }

            // Conditions
            if (Array.isArray(conditions)) {
                const { characterConditions } = await import("@/db/schema");
                await tx.delete(characterConditions).where(eq(characterConditions.characterId, id));
                if (conditions.length > 0) {
                    const inserts = conditions.map((c: { conditionId?: string; condition?: { id: string }; duration?: number; isPermanent?: boolean; source?: string }) => ({
                        characterId: id,
                        conditionId: c.conditionId || c.condition?.id,
                        duration: c.duration,
                        isPermanent: c.isPermanent,
                        source: c.source
                    })).filter((c: { conditionId?: string }) => c.conditionId);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (inserts.length > 0) await tx.insert(characterConditions).values(inserts as any);
                }
            }

            // Resources
            if (Array.isArray(resources)) {
                const { characterResources } = await import("@/db/schema");
                await tx.delete(characterResources).where(eq(characterResources.characterId, id));
                if (resources.length > 0) {
                    const inserts = resources.map((r: { resourceId: string; usedUses: number }) => ({
                        characterId: id,
                        resourceId: r.resourceId,
                        usedUses: r.usedUses
                    })).filter((r: { resourceId?: string }) => r.resourceId);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (inserts.length > 0) await tx.insert(characterResources).values(inserts as any);
                }
            }

            // Inventory
            if (Array.isArray(inventory)) {
                const { characterInventory } = await import("@/db/schema");
                await tx.delete(characterInventory).where(eq(characterInventory.characterId, id));
                if (inventory.length > 0) {
                    const inserts = inventory.map((i: { itemId?: string; item?: { id: string }; quantity?: number; equipped?: boolean; isIdentified?: boolean; isAttuned?: boolean; currentUses?: number }) => ({
                        characterId: id,
                        itemId: i.itemId || i.item?.id,
                        quantity: i.quantity,
                        equipped: i.equipped,
                        isIdentified: i.isIdentified,
                        isAttuned: i.isAttuned,
                        currentUses: i.currentUses
                    })).filter((i: { itemId?: string }) => i.itemId);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (inserts.length > 0) await tx.insert(characterInventory).values(inserts as any);
                }
            }
        });

        // 4. FETCH FRESH DATA to return
        // This closes the loop. We return exactly what the DB has now.
        const freshChar = await getCharacterById(id);
        const mappedChar = mapCharacterToKmp(freshChar);
        console.log(`[API-PUT] Success. Returning fresh state with ${mappedChar.spells.length} spells.`);

        return NextResponse.json(mappedChar);

    } catch (error) {
        console.error("Failed to update character:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
