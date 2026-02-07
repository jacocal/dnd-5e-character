import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spells, items, conditions, races, classes, classResources } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ type: string, id: string }> }
) {
    const { type, id } = await params;

    if (!id || !type) {
        return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
    }

    try {
        let result = null;

        // Simple switch to pick the table
        switch (type) {
            case "spell":
                result = await db.query.spells.findFirst({ where: eq(spells.id, id) });
                break;
            case "item":
                result = await db.query.items.findFirst({ where: eq(items.id, id) });
                break;
            case "condition":
                result = await db.query.conditions.findFirst({ where: eq(conditions.id, id) });
                break;
            case "race":
                result = await db.query.races.findFirst({ where: eq(races.id, id) });
                break;
            case "class":
                result = await db.query.classes.findFirst({ where: eq(classes.id, id) });
                break;
            case "resource":
                result = await db.query.classResources.findFirst({ where: eq(classResources.id, id) });
                break;
            default:
                return NextResponse.json({ error: "Unknown type" }, { status: 400 });
        }

        if (!result) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // --- Sanitization Logic (Shared with Character API idea) ---
        const sanitizeModifiers = (modifiers: { target?: string; value?: string | number; valueString?: string }[]): { target: string; value: number | null; valueString: string | null }[] => {
            if (!Array.isArray(modifiers)) return [];
            return modifiers.map(mod => {
                let value: number | null = null;
                let valueString: string | null = null;

                if (typeof mod.value === 'number') {
                    value = mod.value;
                } else if (typeof mod.value === 'string') {
                    const parsed = parseInt(mod.value);
                    if (!isNaN(parsed) && String(parsed) === mod.value) {
                        value = parsed;
                    } else {
                        valueString = mod.value;
                    }
                }

                return {
                    target: mod.target || "unknown",
                    value: value,
                    valueString: mod.valueString || valueString || null
                };
            });
        };

        const anyResult = result as Record<string, any>;
        if (anyResult.modifiers) {
            anyResult.modifiers = sanitizeModifiers(anyResult.modifiers);
        }

        return NextResponse.json(anyResult);
    } catch (error) {
        console.error(`Failed to fetch ${type} ${id}:`, error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
