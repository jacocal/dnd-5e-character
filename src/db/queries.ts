import { db } from "./index";
import { eq } from "drizzle-orm";
import { characters, classes } from "./schema";

export async function getClasses() {
    return await db.query.classes.findMany({
        orderBy: (classes, { asc }) => [asc(classes.name)],
    });
}

export async function getBackgrounds() {
    return await db.query.backgrounds.findMany({
        orderBy: (backgrounds, { asc }) => [asc(backgrounds.name)],
    });
}

export async function getRaces() {
    return await db.query.races.findMany({
        orderBy: (races, { asc }) => [asc(races.name)],
    });
}

export async function getFeats() {
    return await db.query.feats.findMany({
        orderBy: (feats, { asc }) => [asc(feats.name)],
    });
}

export async function getAllCharacters() {
    return await db.query.characters.findMany({
        with: {
            classes: {
                with: {
                    class: true
                }
            }
        },
        orderBy: (characters, { desc }) => [desc(characters.updatedAt)]
    });
}


import { unstable_noStore as noStore } from "next/cache";

export async function getCharacterById(id: number) {
    noStore();
    const character = await db.query.characters.findFirst({
        where: eq(characters.id, id),
        with: {
            classes: {
                with: {
                    class: true,
                    subclass: true,
                }
            },
            spells: {
                with: {
                    spell: true
                }
            },
            inventory: {
                with: {
                    item: true
                }
            },
            languages: {
                with: {
                    language: true
                }
            },
            conditions: {
                with: {
                    condition: true
                }
            },
            raceEntry: true,
            background: true,
            quests: {
                with: {
                    objectives: true,
                    logs: true
                }
            }
        }
    });

    return character;
}
