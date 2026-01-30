
// import { Character } from "@/components/character/kmp/shared/model/Character"; 
// using loose typing for now to avoid build issues with KMP generated types


// --- Sanitization Logic ---

function sanitizeModifiers(modifiers: any[]): any[] {
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
            valueString: mod.valueString || valueString
        };
    });
}

function sanitizeProficiencies(prof: any): any {
    if (!prof) return null;

    const toArray = (data: any) => {
        if (Array.isArray(data)) return data;
        if (typeof data === 'object' && data !== null) {
            return Object.keys(data).filter(k => data[k] === true);
        }
        return [];
    };

    return {
        skills: toArray(prof.skills),
        tools: toArray(prof.tools),
        languages: toArray(prof.languages)
    };
}

function sanitizeRaceEntry(raceEntry: any): any {
    if (!raceEntry) return null;
    return {
        ...raceEntry,
        modifiers: sanitizeModifiers(raceEntry.modifiers)
    };
}

export function mapCharacterToKmp(character: any): any {
    if (!character) return null;

    return {
        ...character,

        // 1. Fix Proficiencies (Map -> Array)
        proficiencies: sanitizeProficiencies(character.proficiencies),

        // 2. Fix Race Modifiers
        raceEntry: sanitizeRaceEntry(character.raceEntry),

        // 3. Fix Resource Modifiers
        resourceModifiers: sanitizeModifiers(character.resourceModifiers as any[]),

        // 4. Manual Proficiencies
        manualProficiencies: {
            armor: (character.manualProficiencies as any)?.armor || [],
            weapons: (character.manualProficiencies as any)?.weapons || [],
            tools: (character.manualProficiencies as any)?.tools || []
        },

        // 5. Map Column Names
        raceId: character.race,

        // 6. Explicitly map relations to plain arrays
        classes: character.classes ? [...character.classes] : [],
        spells: character.spells ? [...character.spells] : [],
        inventory: character.inventory ? [...character.inventory] : [],
        conditions: character.conditions ? [...character.conditions] : [],
        // The query now includes resources, so we verify checks
        resources: character.resources ? [...character.resources] : []
    };
}
