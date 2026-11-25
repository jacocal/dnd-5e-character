"use client";

import { useState, useEffect } from "react";
import SkillProficiencySelector from "./SkillProficiencySelector";
import ToolProficiencySelector from "./ToolProficiencySelector";
import StartingEquipmentSelector from "./StartingEquipmentSelector";

interface ClassData {
    id: string;
    name: string;
    skillOptions: { choose: number; from: string[] } | null;
    startingEquipmentOptions: {
        A: { items: string[]; gp: number };
        B: { items: string[]; gp: number };
        C?: { items: string[]; gp: number };
    } | null;
}

interface BackgroundData {
    id: string;
    name: string;
    modifiers: { type: string; target: string; value: boolean }[] | null;
    originFeatId: string | null;
    originFeatClass: string | null;
    toolProficiencies: {
        fixed?: string[];
        choice?: { count: number; category: string };
    } | null;
    startingEquipmentOptions: {
        A: { items: string[]; gp: number };
        B: { items: string[]; gp: number };
    } | null;
}

interface FeatData {
    id: string;
    name: string;
    description: string;
    category?: string;
    repeatable?: boolean;
}

interface LanguageData {
    id: string;
    name: string;
    type: string;
}

interface Props {
    classes: ClassData[];
    backgrounds: BackgroundData[];
    feats: FeatData[];
    languages?: LanguageData[];
    initialRaceId?: string;
}

const ALL_SKILLS = [
    "acrobatics", "animal_handling", "arcana", "athletics", "deception", "history",
    "insight", "intimidation", "investigation", "medicine", "nature", "perception",
    "performance", "persuasion", "religion", "sleight_of_hand", "stealth", "survival",
];

function formatSkillLabel(key: string): string {
    return key
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

export default function DynamicCreationOptions({
    classes,
    backgrounds,
    feats,
    languages = [],
    initialRaceId = "human",
}: Props) {
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || "");
    const [selectedBackgroundId, setSelectedBackgroundId] = useState(backgrounds[0]?.id || "");
    const [selectedRaceId, setSelectedRaceId] = useState(initialRaceId);

    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [selectedToolProficiency, setSelectedToolProficiency] = useState<string[]>([]);
    const [classEquipmentOption, setClassEquipmentOption] = useState<"A" | "B" | "C">("A");
    const [backgroundEquipmentOption, setBackgroundEquipmentOption] = useState<"A" | "B">("A");

    // 2024 PHB Species & Language Options
    const [chosenSize, setChosenSize] = useState<"Medium" | "Small">("Medium");
    const [humanOriginFeatId, setHumanOriginFeatId] = useState<string>("");
    const [humanSkillProficiency, setHumanSkillProficiency] = useState<string>("");
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["elvish", "dwarvish"]);

    const selectedClass = classes.find((c) => c.id === selectedClassId);
    const selectedBackground = backgrounds.find((b) => b.id === selectedBackgroundId);

    const backgroundSkills: string[] =
        selectedBackground?.modifiers
            ?.filter((m) => m.type === "skill_proficiency" && m.value === true)
            .map((m) => m.target) || [];

    const originFeat = selectedBackground?.originFeatId
        ? feats.find((f) => f.id === selectedBackground.originFeatId)
        : null;

    const isHuman = selectedRaceId.toLowerCase().startsWith("human");
    const supportsSizeChoice =
        isHuman ||
        selectedRaceId.toLowerCase().startsWith("aasimar") ||
        selectedRaceId.toLowerCase().startsWith("tiefling");

    const availableOriginFeats = feats.filter(
        (f) =>
            f.category === "origin" &&
            (f.repeatable || f.id !== selectedBackground?.originFeatId)
    );

    const takenSkillSet = new Set([
        ...backgroundSkills.map((s) => s.toLowerCase()),
        ...selectedSkills.map((s) => s.toLowerCase()),
    ]);
    const availableHumanSkills = ALL_SKILLS.filter((s) => !takenSkillSet.has(s));

    const standardLanguages = languages.filter(
        (l) => l.id !== "common" && l.type.toLowerCase() === "standard"
    );

    // Listen for class/background/race select changes
    useEffect(() => {
        const classSelect = document.querySelector('[name="classId"]') as HTMLSelectElement | null;
        const backgroundSelect = document.getElementById("background-select") as HTMLSelectElement | null;
        const raceSelect = document.querySelector('[name="race"]') as HTMLSelectElement | null;

        const handleClassChange = (e: Event) => {
            const target = e.target as HTMLSelectElement;
            setSelectedClassId(target.value);
            setSelectedSkills([]);
        };

        const handleBackgroundChange = (e: Event) => {
            const target = e.target as HTMLSelectElement;
            setSelectedBackgroundId(target.value);
            setSelectedToolProficiency([]);
            setSelectedSkills([]);
            setHumanOriginFeatId("");
        };

        const handleRaceChange = (e: Event) => {
            const target = e.target as HTMLSelectElement;
            setSelectedRaceId(target.value);
            setChosenSize("Medium");
        };

        if (classSelect) classSelect.addEventListener("change", handleClassChange);
        if (backgroundSelect) backgroundSelect.addEventListener("change", handleBackgroundChange);
        if (raceSelect) raceSelect.addEventListener("change", handleRaceChange);

        return () => {
            if (classSelect) classSelect.removeEventListener("change", handleClassChange);
            if (backgroundSelect) backgroundSelect.removeEventListener("change", handleBackgroundChange);
            if (raceSelect) raceSelect.removeEventListener("change", handleRaceChange);
        };
    }, []);

    const toggleLanguage = (langId: string) => {
        setSelectedLanguages((prev) => {
            if (prev.includes(langId)) {
                return prev.filter((id) => id !== langId);
            }
            if (prev.length >= 2) {
                return [...prev.slice(1), langId];
            }
            return [...prev, langId];
        });
    };

    return (
        <>
            {/* Hidden form fields for form submission */}
            <input type="hidden" name="classSkillProficiencies" value={JSON.stringify(selectedSkills)} />
            <input type="hidden" name="toolProficiency" value={selectedToolProficiency[0] || ""} />
            <input type="hidden" name="classEquipmentOption" value={classEquipmentOption} />
            <input type="hidden" name="backgroundEquipmentOption" value={backgroundEquipmentOption} />
            <input type="hidden" name="size" value={supportsSizeChoice ? chosenSize : ""} />
            <input type="hidden" name="humanOriginFeatId" value={isHuman ? humanOriginFeatId : ""} />
            <input type="hidden" name="humanSkillProficiency" value={isHuman ? humanSkillProficiency : ""} />
            <input type="hidden" name="languages" value={JSON.stringify(selectedLanguages)} />

            {/* 2024 Species Options (Size Choice + Human Versatile / Skillful) */}
            {(supportsSizeChoice || isHuman) && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold border-b pb-2 text-slate-700 dark:text-slate-300">
                        2024 Species Options
                    </h2>

                    {supportsSizeChoice && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium block">Character Size (2024 PHB)</label>
                            <div className="flex gap-3">
                                {(["Medium", "Small"] as const).map((sz) => (
                                    <button
                                        key={sz}
                                        type="button"
                                        onClick={() => setChosenSize(sz)}
                                        className={`px-4 py-2 text-sm rounded-md border font-medium transition-colors ${
                                            chosenSize === sz
                                                ? "border-red-600 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                                                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                        }`}
                                    >
                                        {sz}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isHuman && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 block">
                                    Versatile — 2nd Origin Feat
                                </label>
                                <select
                                    value={humanOriginFeatId}
                                    onChange={(e) => setHumanOriginFeatId(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 rounded-md"
                                >
                                    <option value="">Choose an Origin Feat...</option>
                                    {availableOriginFeats.map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 block">
                                    Skillful — Bonus Skill Proficiency
                                </label>
                                <select
                                    value={humanSkillProficiency}
                                    onChange={(e) => setHumanSkillProficiency(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 rounded-md"
                                >
                                    <option value="">Choose any skill...</option>
                                    {availableHumanSkills.map((sk) => (
                                        <option key={sk} value={sk}>
                                            {formatSkillLabel(sk)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Skill & Tool Proficiencies Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2 text-slate-700 dark:text-slate-300">Proficiencies</h2>

                <SkillProficiencySelector
                    classSkillOptions={selectedClass?.skillOptions || null}
                    backgroundSkills={backgroundSkills}
                    onChange={setSelectedSkills}
                />

                <ToolProficiencySelector
                    toolChoice={selectedBackground?.toolProficiencies?.choice || null}
                    fixedTools={selectedBackground?.toolProficiencies?.fixed || null}
                    onChange={setSelectedToolProficiency}
                />
            </div>

            {/* 2024 Starting Languages (Common + 2 Standard) */}
            {standardLanguages.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Languages</h2>
                        <span className="text-xs text-slate-500">
                            Common + {selectedLanguages.length}/2 Standard Languages (2024 PHB)
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            Common (Included)
                        </span>
                        {standardLanguages.map((lang) => {
                            const active = selectedLanguages.includes(lang.id);
                            return (
                                <button
                                    key={lang.id}
                                    type="button"
                                    onClick={() => toggleLanguage(lang.id)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                                        active
                                            ? "border-red-600 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                                    }`}
                                >
                                    {lang.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Origin Feat Display */}
            {originFeat && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold border-b pb-2 text-slate-700 dark:text-slate-300">Origin Feat</h2>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-amber-800 dark:text-amber-200">{originFeat.name}</span>
                            {selectedBackground?.originFeatClass && (
                                <span className="text-xs px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded">
                                    {selectedBackground.originFeatClass.charAt(0).toUpperCase() + selectedBackground.originFeatClass.slice(1)} Spell List
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-300">{originFeat.description}</p>
                    </div>
                </div>
            )}

            {/* Starting Equipment Section */}
            <div className="space-y-4">
                <StartingEquipmentSelector
                    classOptions={selectedClass?.startingEquipmentOptions || null}
                    backgroundOptions={selectedBackground?.startingEquipmentOptions || null}
                    className={selectedClass?.name || "Class"}
                    backgroundName={selectedBackground?.name || "Background"}
                    onClassOptionChange={setClassEquipmentOption}
                    onBackgroundOptionChange={setBackgroundEquipmentOption}
                />
            </div>
        </>
    );
}
