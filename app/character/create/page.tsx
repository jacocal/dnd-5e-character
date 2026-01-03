import { createCharacter } from "../../actions";
import { getClasses, getBackgrounds, getRaces, getFeats } from "@/db/queries";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DynamicAbilityScoreCalculator from "@/components/character/create/DynamicAbilityScoreCalculator";
import DynamicCreationOptions from "@/components/character/create/DynamicCreationOptions";

export default async function CreateCharacterPage() {
    const classes = await getClasses();
    const backgrounds = await getBackgrounds();
    const races = await getRaces();
    const feats = await getFeats();

    async function submitAction(formData: FormData) {
        "use server";
        const result = await createCharacter(formData);
        if (result.success) {
            redirect(`/character/${result.characterId}`);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
            {/* Header with Back Button */}
            <header className="bg-white dark:bg-slate-900 shadow-sm p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="container mx-auto flex items-center gap-4 max-w-2xl">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="shrink-0">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create New Character</h1>
                </div>
            </header>

            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8">
                    <form action={submitAction} className="space-y-8">
                        {/* Identity Section */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold border-b pb-2 text-slate-700 dark:text-slate-300">Identity</h2>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Character Name</label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-red-600 outline-none"
                                    placeholder="e.g. Gandalf"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Class</label>
                                    <select
                                        name="classId"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-red-600 outline-none"
                                    >
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Species</label>
                                    <select
                                        name="race"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-red-600 outline-none"
                                    >
                                        {races.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Background</label>
                                    <select
                                        name="background"
                                        id="background-select"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-red-600 outline-none"
                                    >
                                        {backgrounds.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Alignment</label>
                                    <select
                                        name="alignment"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-red-600 outline-none"
                                    >
                                        <option value="Lawful Good">Lawful Good</option>
                                        <option value="Neutral Good">Neutral Good</option>
                                        <option value="Chaotic Good">Chaotic Good</option>
                                        <option value="Lawful Neutral">Lawful Neutral</option>
                                        <option value="Neutral">True Neutral</option>
                                        <option value="Chaotic Neutral">Chaotic Neutral</option>
                                        <option value="Lawful Evil">Lawful Evil</option>
                                        <option value="Neutral Evil">Neutral Evil</option>
                                        <option value="Chaotic Evil">Chaotic Evil</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Stats Section */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold border-b pb-2 text-slate-700 dark:text-slate-300">Ability Scores</h2>
                            <DynamicAbilityScoreCalculator
                                backgrounds={backgrounds.map(b => ({
                                    id: b.id,
                                    name: b.name,
                                    description: b.description,
                                    abilityOptions: b.abilityOptions
                                }))}
                            />
                        </div>

                        {/* Dynamic Creation Options (Skills, Tools, Equipment, Origin Feat) */}
                        <DynamicCreationOptions
                            classes={classes.map(c => ({
                                id: c.id,
                                name: c.name,
                                skillOptions: c.skillOptions as { choose: number; from: string[] } | null,
                                startingEquipmentOptions: c.startingEquipmentOptions as {
                                    A: { items: string[]; gp: number };
                                    B: { items: string[]; gp: number };
                                    C?: { items: string[]; gp: number };
                                } | null,
                            }))}
                            backgrounds={backgrounds.map(b => ({
                                id: b.id,
                                name: b.name,
                                modifiers: b.modifiers as { type: string; target: string; value: boolean }[] | null,
                                originFeatId: b.originFeatId,
                                originFeatClass: b.originFeatClass,
                                toolProficiencies: b.toolProficiencies as {
                                    fixed?: string[];
                                    choice?: { count: number; category: string };
                                } | null,
                                startingEquipmentOptions: b.startingEquipmentOptions as {
                                    A: { items: string[]; gp: number };
                                    B: { items: string[]; gp: number };
                                } | null,
                            }))}
                            feats={feats.map(f => ({
                                id: f.id,
                                name: f.name,
                                description: f.description,
                            }))}
                        />

                        {/* HP Calculation Mode */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold border-b pb-2 text-slate-700 dark:text-slate-300">Hit Points</h2>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="hpMode"
                                        value="auto"
                                        id="hp-auto"
                                        defaultChecked
                                        className="w-4 h-4 text-red-600"
                                    />
                                    <label htmlFor="hp-auto" className="text-sm">
                                        <span className="font-medium">Auto-Calculate</span>
                                        <span className="text-slate-500 ml-2">(Class Hit Die Max + Constitution Modifier)</span>
                                    </label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="hpMode"
                                        value="manual"
                                        id="hp-manual"
                                        className="w-4 h-4 text-red-600"
                                    />
                                    <label htmlFor="hp-manual" className="text-sm">
                                        <span className="font-medium">Manual Override</span>
                                    </label>
                                    <input
                                        name="manualHp"
                                        type="number"
                                        min="1"
                                        placeholder="HP"
                                        className="w-20 px-2 py-1 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Details Section */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold border-b pb-2 text-slate-700 dark:text-slate-300">Details</h2>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Appearance / Image URL</label>
                                <input
                                    name="imageUrl"
                                    type="text"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-red-600 outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button type="submit" className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 cursor-pointer">
                                Verify & Create Character
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
