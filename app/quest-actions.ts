"use server";

import { db } from "@/db";
import { quests, questObjectives, questLogs } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// --- Quest Actions ---

export async function createQuest(characterId: number, data: { title: string; description?: string; isTracked?: boolean }) {
    try {
        const [newQuest] = await db.insert(quests).values({
            characterId,
            title: data.title,
            description: data.description,
            status: "active",
            isTracked: data.isTracked ?? true
        }).returning();

        revalidatePath(`/character/${characterId}`);
        return { success: true, quest: newQuest };
    } catch (error) {
        console.error("Failed to create quest:", error);
        return { success: false, error: "Failed to create quest" };
    }
}

export async function updateQuest(questId: number, data: { title?: string; description?: string; status?: string; isTracked?: boolean }) {
    try {
        const [updatedQuest] = await db.update(quests)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(eq(quests.id, questId))
            .returning();

        // access characterId via relation or fetch? 
        // We'll rely on the caller or just revalidate generic path if possible, 
        // but ideally we need characterId. 
        // Let's fetch it first to be safe for revalidation path.
        // Or updatedQuest has characterId.

        if (updatedQuest) {
            revalidatePath(`/character/${updatedQuest.characterId}`);
        }

        return { success: true, quest: updatedQuest };
    } catch (error) {
        console.error("Failed to update quest:", error);
        return { success: false, error: "Failed to update quest" };
    }
}

export async function deleteQuest(questId: number) {
    try {
        // Need characterId for revalidation before deletion
        const quest = await db.query.quests.findFirst({
            where: eq(quests.id, questId),
            columns: { characterId: true }
        });

        if (!quest) return { success: false, error: "Quest not found" };

        await db.delete(quests).where(eq(quests.id, questId));

        revalidatePath(`/character/${quest.characterId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to delete quest:", error);
        return { success: false, error: "Failed to delete quest" };
    }
}

// --- Objective Actions ---

export async function addQuestObjective(questId: number, description: string) {
    try {
        // Get current max order
        const existing = await db.query.questObjectives.findMany({
            where: eq(questObjectives.questId, questId),
            orderBy: [desc(questObjectives.order)],
            limit: 1
        });
        const nextOrder = (existing[0]?.order ?? -1) + 1;

        const [newObj] = await db.insert(questObjectives).values({
            questId,
            description,
            order: nextOrder,
            isCompleted: false
        }).returning();

        const quest = await db.query.quests.findFirst({
            where: eq(quests.id, questId),
            columns: { characterId: true }
        });
        if (quest) revalidatePath(`/character/${quest.characterId}`);

        return { success: true, objective: newObj };
    } catch (error) {
        console.error("Failed to add objective:", error);
        return { success: false, error: "Failed to add objective" };
    }
}

export async function toggleQuestObjective(objectiveId: number, isCompleted: boolean) {
    try {
        const [updatedObj] = await db.update(questObjectives)
            .set({ isCompleted })
            .where(eq(questObjectives.id, objectiveId))
            .returning();

        if (updatedObj) {
            const quest = await db.query.quests.findFirst({
                where: eq(quests.id, updatedObj.questId),
                columns: { characterId: true }
            });
            if (quest) revalidatePath(`/character/${quest.characterId}`);
        }

        return { success: true, objective: updatedObj };
    } catch (error) {
        console.error("Failed to toggle objective:", error);
        return { success: false, error: "Failed to toggle objective" };
    }
}

export async function deleteQuestObjective(objectiveId: number) {
    try {
        const obj = await db.query.questObjectives.findFirst({
            where: eq(questObjectives.id, objectiveId)
        });
        if (!obj) return { success: false, error: "Objective not found" };

        await db.delete(questObjectives).where(eq(questObjectives.id, objectiveId));

        const quest = await db.query.quests.findFirst({
            where: eq(quests.id, obj.questId),
            columns: { characterId: true }
        });
        if (quest) revalidatePath(`/character/${quest.characterId}`);

        return { success: true };
    } catch (error) {
        console.error("Failed to delete objective:", error);
        return { success: false, error: "Failed to delete objective" };
    }
}

// --- Log Actions ---

export async function addQuestLog(questId: number, content: string) {
    try {
        const [newLog] = await db.insert(questLogs).values({
            questId,
            content
        }).returning();

        const quest = await db.query.quests.findFirst({
            where: eq(quests.id, questId),
            columns: { characterId: true }
        });
        if (quest) revalidatePath(`/character/${quest.characterId}`);

        return { success: true, log: newLog };
    } catch (error) {
        console.error("Failed to add log:", error);
        return { success: false, error: "Failed to add log" };
    }
}

export async function deleteQuestLog(logId: number) {
    try {
        const log = await db.query.questLogs.findFirst({
            where: eq(questLogs.id, logId)
        });
        if (!log) return { success: false, error: "Log not found" };

        await db.delete(questLogs).where(eq(questLogs.id, logId));

        const quest = await db.query.quests.findFirst({
            where: eq(quests.id, log.questId),
            columns: { characterId: true }
        });
        if (quest) revalidatePath(`/character/${quest.characterId}`);

        return { success: true };
    } catch (error) {
        console.error("Failed to delete log:", error);
        return { success: false, error: "Failed to delete log" };
    }
}
