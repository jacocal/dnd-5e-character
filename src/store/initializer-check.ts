import { db } from "@/db";
import { characters, classes, characterClasses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function CharacterStoreInitializer({ characterId }: { characterId: number }) {
    // Fetch Character Data with Relations including Background
    const charData = await db.query.characters.findFirst({
        where: eq(characters.id, characterId),
        with: {
            classes: {
                with: {
                    class: true,
                    subclass: true
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
            background: true, // Fetch Background
            conditions: {
                with: {
                    condition: true
                }
            },
            languages: {
                with: {
                    language: true
                }
            }
        }
    });

    if (!charData) return null;

    // TODO: Hydrate Store
    // This component usually calls a hydration function on the store. 
    // Since we are Server Component here (likely), we might pass data to a client component wrapper.
    // OR this is a client component that fetches? 
    // The name implies it initializes the store.
    // Actually, `CharacterStoreInitializer` is likely a client component that calls `useCharacterStore.setState(...)`.

    // For now, I'm just creating the file reference or ensuring I know how data is loaded.
    // The user's store seems to have a `hydrate` or manual set properties.
    // Wait, the store doesn't have a specific `hydrate` function exposed in the interface I saw.
    // It has setters.

    return charData;
}
