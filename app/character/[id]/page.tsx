
import React from 'react';
import { notFound } from 'next/navigation';
import { AbilityScoreList } from "@/components/character/AbilityScoreList";
import { HPCounter } from '@/components/character/HPCounter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getCharacterById } from '@/db/queries';
import { CharacterStoreInitializer } from '@/components/character/CharacterStoreInitializer';
import { SpellsTab } from '@/components/character/SpellsTab';
import { InventoryTab } from '@/components/character/InventoryTab';
import { CharacterHeaderActions } from '@/components/character/CharacterHeaderActions';
import { CombatStats } from '@/components/character/CombatStats';
import { SkillsPanel } from '@/components/character/SkillsPanel';
import { AttacksList } from '@/components/character/AttacksList';
import { ExperienceBar } from '@/components/character/ExperienceBar';
import { FeaturesTab } from '@/components/character/FeaturesTab';
import { BioTab } from '@/components/character/BioTab';
import { ConditionsPanel } from '@/components/character/ConditionsPanel';
import { SavingThrowsList } from '@/components/character/SavingThrowsList';
import { LevelUpDialog } from '@/components/character/LevelUpDialog';
import { ResourceTracker } from '@/components/character/ResourceTracker';
import { getClasses } from '@/db/queries';
import { calculateSpellSlots, resolveSpellcastingType, type SpellcastingType } from '@/lib/mechanics/spell-slots';
import { QuestLogPanel } from '@/components/character/quest/QuestLogPanel';

// Helper: Extract speed and size from race modifiers
function getRaceModifierValues(raceEntry: any): { speed: number; size: string } {
    const modifiers = raceEntry?.modifiers || [];
    const speedMod = modifiers.find((m: any) => m.target === 'speed');
    const sizeMod = modifiers.find((m: any) => m.target === 'size');
    return {
        speed: speedMod?.value ?? 30,
        size: sizeMod?.value ?? "Medium"
    };
}

// Helper: Extract darkvision range from trait modifiers (takes highest value)
function getDarkvisionRange(raceEntry: any, traits: any[]): number | null {
    let maxDarkvision: number | null = null;

    // Check character's traits for darkvision modifiers
    for (const trait of traits) {
        const modifiers = trait?.modifiers || [];
        for (const mod of modifiers) {
            if (mod.target === 'darkvision' && typeof mod.value === 'number') {
                if (maxDarkvision === null || mod.value > maxDarkvision) {
                    maxDarkvision = mod.value;
                }
            }
        }
    }

    return maxDarkvision;
}



interface PageProps {


    params: Promise<{ id: string }>;
}

export default async function CharacterSheetPage({ params }: PageProps) {
    const { id } = await params;
    const characterId = parseInt(id);

    if (isNaN(characterId)) {
        notFound();
    }

    const characterData = await getCharacterById(characterId);

    if (!characterData) {
        notFound();
    }

    // Fetch Classes for Level Up
    const allClasses = await getClasses();

    // Build class string showing all classes with their levels
    const classString = characterData.classes.length > 0
        ? characterData.classes
            .map(c => {
                const name = c.class?.name || "Unknown";
                const subName = c.subclass?.name ? ` (${c.subclass.name})` : "";
                return `Lvl ${c.level} ${name}${subName}`;
            })
            .join(" / ")
        : "Commoner";

    const totalLevel = characterData.level;

    // Fetch progression features from class progression data
    let classFeatures: any[] = [];
    const { getClassProgression } = await import("@/app/actions");

    for (const cls of characterData.classes) {
        const prog = await getClassProgression(cls.classId, cls.level, cls.subclassId);
        if (prog?.features) {
            classFeatures = [...classFeatures, ...prog.features];
        }
    }

    // Calculate spell slots using multiclass engine
    const classesWithTypes = characterData.classes.map((c: any) => ({
        classId: c.classId,
        level: c.level,
        subclassId: c.subclassId,
        // Resolve spellcasting type: subclass overrides class (e.g., Arcane Trickster on Rogue)
        spellcastingType: resolveSpellcastingType(
            c.class?.spellcastingType as SpellcastingType | null,
            c.subclass?.spellcastingType as SpellcastingType | null
        ),
    }));

    const { spellcasting, pactMagic } = calculateSpellSlots(classesWithTypes);
    const maxSpellSlots = spellcasting.slots;
    const effectiveCasterLevel = spellcasting.casterLevel;

    // Extract speed and size from race modifiers (QW-1)
    const raceValues = getRaceModifierValues(characterData.raceEntry);

    // Extract darkvision from race/traits (QW-2)
    const traitsArray = Array.isArray(characterData.traits) ? characterData.traits : [];
    const darkvision = getDarkvisionRange(characterData.raceEntry, traitsArray);

    // Load class resources (Rage, Ki, Wild Shape, etc.)
    const { getCharacterResources } = await import("@/app/actions");
    const classIds = characterData.classes.map((c: any) => c.classId);
    const rawResources = await getCharacterResources(characterData.id, classIds);

    // Calculate max uses for each resource
    const getMod = (stat: number) => Math.floor((stat - 10) / 2);

    // Build class level lookup for multiclassing
    const classLevelMap: Record<string, number> = {};
    for (const c of characterData.classes) {
        classLevelMap[c.classId] = c.level;
    }

    const resources = rawResources
        .filter(r => {
            // Check if unlocked based on class-specific level
            const classLevel = classLevelMap[r.classId] || 0;
            return classLevel >= r.unlockLevel;
        })
        .map(r => {
            const classLevel = classLevelMap[r.classId] || 0;
            let maxUses = 1;
            switch (r.maxFormula) {
                case "proficiency": maxUses = Math.ceil(totalLevel / 4) + 1; break;
                case "level": maxUses = classLevel; break; // Use class-specific level
                case "level_x5": maxUses = classLevel * 5; break; // Use class-specific level
                case "cha_mod": maxUses = Math.max(1, getMod(characterData.cha)); break;
                case "wis_mod": maxUses = Math.max(1, getMod(characterData.wis)); break;
                default: maxUses = parseInt(r.maxFormula) || 1;
            }
            return {
                id: r.id,
                name: r.name,
                maxUses,
                usedUses: r.usedUses,
                rechargeOn: r.rechargeOn,
                maxFormula: r.maxFormula,
                onUse: r.onUse
            };
        });


    return (

        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Hydrate Client Store */}
            <CharacterStoreInitializer
                characterId={characterData.id}
                hpCurrent={characterData.hpCurrent}
                hpMax={characterData.hpMax}
                tempHp={characterData.tempHp}
                hitDiceCurrent={characterData.hitDiceCurrent}
                hitDiceMax={characterData.hitDiceMax}
                deathSaveSuccess={characterData.deathSaveSuccess}
                deathSaveFailure={characterData.deathSaveFailure}
                inspiration={characterData.inspiration}
                exhaustion={characterData.exhaustion}
                str={characterData.str}
                dex={characterData.dex}
                con={characterData.con}
                int={characterData.int}
                wis={characterData.wis}
                cha={characterData.cha}
                armorClass={characterData.armorClass}
                speed={raceValues.speed || characterData.speed}
                initiativeBonus={characterData.initiativeBonus}
                proficiencies={characterData.proficiencies}
                manualProficiencies={characterData.manualProficiencies}
                spells={characterData.spells}
                inventory={characterData.inventory}
                // Phase 3
                xp={characterData.xp}
                level={characterData.level}
                cp={characterData.cp}
                sp={characterData.sp}
                ep={characterData.ep}
                gp={characterData.gp}
                pp={characterData.pp}
                usedSpellSlots={(characterData.usedSpellSlots as Record<string, number>) || {}}
                maxSpellSlots={maxSpellSlots as Record<string, number>}
                // Pact Magic (Warlock)
                usedPactSlots={characterData.usedPactSlots}
                maxPactSlots={pactMagic ? { count: pactMagic.count, level: pactMagic.slotLevel } : null}
                effectiveCasterLevel={effectiveCasterLevel}
                // Phase 5
                feats={(characterData.feats as any[]) || []}
                traits={(characterData.traits as any[]) || []}
                subclass={characterData.classes[0]?.subclassId || null}
                classFeatures={classFeatures}
                // Calculated
                proficiencyBonus={Math.ceil(characterData.level / 4) + 1}
                classes={characterData.classes}
                // Bio & Details - Use race modifier values when available
                size={raceValues.size || characterData.size || "Medium"}
                appearance={characterData.appearance || ""}
                backstory={characterData.backstory || ""}
                languages={characterData.languages.map((l: any) => l.language) || []}
                conditions={characterData.conditions.map((c: any) => c.condition) || []}
                raceEntry={characterData.raceEntry}
                background={characterData.background}
                darkvision={darkvision}
                resources={resources}
                resourceModifiers={(characterData.resourceModifiers as any[]) || []}
                abilityPointPool={characterData.abilityPointPool ?? 0}
                alignment={characterData.alignment ?? null}
            />


            <header className="bg-white dark:bg-slate-900 shadow-sm p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <div className="container mx-auto flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="shrink-0">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>

                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{characterData.name}</h1>
                        <p className="text-sm text-slate-500">
                            {characterData.raceEntry?.name || "Unknown Race"} • {characterData.background?.name || "Unknown Background"}{characterData.alignment ? ` • ${characterData.alignment}` : ""}
                        </p>
                        <p className="text-slate-400">{classString}</p>
                    </div>

                    <div className="flex gap-2">
                        <QuestLogPanel characterId={characterData.id} quests={(characterData.quests as any[]) || []} />
                        <LevelUpDialog characterId={characterData.id} classes={allClasses} />
                        <CharacterHeaderActions />
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 flex-grow w-full max-w-5xl">
                {/* XP Bar */}
                <div className="mb-6">
                    <ExperienceBar />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left Column: Stats */}
                    <div className="md:col-span-3 space-y-6">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h2 className="text-sm font-bold uppercase text-slate-400 mb-4 tracking-wider">Abilities</h2>
                            <AbilityScoreList />
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h2 className="text-sm font-bold uppercase text-slate-400 mb-3 tracking-wider">Combat</h2>
                            <CombatStats
                                dexScore={characterData.dex}
                                className="mb-4"
                            />

                            {/* Class Resources (Rage, Ki, etc.) */}
                            <ResourceTracker />

                            <div className="my-4">
                                <SavingThrowsList />
                            </div>


                            <h2 className="text-sm font-bold uppercase text-slate-400 mb-3 tracking-wider pt-4 border-t border-slate-100 dark:border-slate-800">Skills</h2>
                            <SkillsPanel
                                str={characterData.str}
                                dex={characterData.dex}
                                con={characterData.con}
                                int={characterData.int}
                                wis={characterData.wis}
                                cha={characterData.cha}
                            />
                        </div>
                    </div>

                    {/* Middle Column: Combat & Main Actions */}
                    <div className="md:col-span-5 space-y-6">
                        <div className="space-y-4">
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                {/* Vitality Section */}
                                <HPCounter />
                            </div>

                            {/* Conditions */}
                            <ConditionsPanel />
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h2 className="text-lg font-semibold mb-2">Actions & Attacks</h2>
                            <AttacksList />
                        </div>
                    </div>

                    {/* Right Column: Spells & Inventory */}
                    <div className="md:col-span-4 space-y-6">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <BioTab />
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <FeaturesTab />
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h2 className="text-lg font-semibold mb-2">Spells</h2>
                            <SpellsTab spells={characterData.spells} />
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h2 className="text-lg font-semibold mb-2">Inventory</h2>
                            <InventoryTab inventory={characterData.inventory} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
