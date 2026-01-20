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
}

interface Props {
    classes: ClassData[];
    backgrounds: BackgroundData[];
    feats: FeatData[];
}

export default function DynamicCreationOptions({ classes, backgrounds, feats }: Props) {
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || "");
    const [selectedBackgroundId, setSelectedBackgroundId] = useState(backgrounds[0]?.id || "");

    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [selectedToolProficiency, setSelectedToolProficiency] = useState<string[]>([]);
    const [classEquipmentOption, setClassEquipmentOption] = useState<"A" | "B" | "C">("A");
    const [backgroundEquipmentOption, setBackgroundEquipmentOption] = useState<"A" | "B">("A");

    // Get current selections
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const selectedBackground = backgrounds.find(b => b.id === selectedBackgroundId);

    // Extract background skills from modifiers
    const backgroundSkills: string[] = selectedBackground?.modifiers
        ?.filter(m => m.type === "skill_proficiency" && m.value === true)
        .map(m => m.target) || [];

    // Get origin feat
    const originFeat = selectedBackground?.originFeatId
        ? feats.find(f => f.id === selectedBackground.originFeatId)
        : null;

    // Listen for class/background select changes
    useEffect(() => {
        const classSelect = document.querySelector('[name="classId"]') as HTMLSelectElement;
        const backgroundSelect = document.getElementById("background-select") as HTMLSelectElement;

        const handleClassChange = (e: Event) => {
            const target = e.target as HTMLSelectElement;
            setSelectedClassId(target.value);
            setSelectedSkills([]); // Reset skill selections
        };

        const handleBackgroundChange = (e: Event) => {
            const target = e.target as HTMLSelectElement;
            setSelectedBackgroundId(target.value);
            setSelectedToolProficiency([]); // Reset tool selection
        };

        if (classSelect) {
            classSelect.addEventListener("change", handleClassChange);
        }
        if (backgroundSelect) {
            backgroundSelect.addEventListener("change", handleBackgroundChange);
        }

        return () => {
            if (classSelect) classSelect.removeEventListener("change", handleClassChange);
            if (backgroundSelect) backgroundSelect.removeEventListener("change", handleBackgroundChange);
        };
    }, []);

    return (
        <>
            {/* Hidden form fields for form submission */}
            <input type="hidden" name="classSkillProficiencies" value={JSON.stringify(selectedSkills)} />
            <input type="hidden" name="toolProficiency" value={selectedToolProficiency[0] || ""} />
            <input type="hidden" name="classEquipmentOption" value={classEquipmentOption} />
            <input type="hidden" name="backgroundEquipmentOption" value={backgroundEquipmentOption} />

            {/* Skill Proficiencies Section */}
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
