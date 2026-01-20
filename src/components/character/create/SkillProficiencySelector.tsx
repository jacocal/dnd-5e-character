"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// All available skills for display mapping
const SKILL_DISPLAY_NAMES: Record<string, string> = {
    "acrobatics": "Acrobatics",
    "animal_handling": "Animal Handling",
    "arcana": "Arcana",
    "athletics": "Athletics",
    "deception": "Deception",
    "history": "History",
    "insight": "Insight",
    "intimidation": "Intimidation",
    "investigation": "Investigation",
    "medicine": "Medicine",
    "nature": "Nature",
    "perception": "Perception",
    "performance": "Performance",
    "persuasion": "Persuasion",
    "religion": "Religion",
    "sleight_of_hand": "Sleight of Hand",
    "stealth": "Stealth",
    "survival": "Survival",
};

interface SkillProficiencySelectorProps {
    classSkillOptions: { choose: number; from: string[] } | null;
    backgroundSkills: string[]; // Skills already granted by background (lowercase with underscores)
    onChange: (selected: string[]) => void;
}

export default function SkillProficiencySelector({
    classSkillOptions,
    backgroundSkills,
    onChange,
}: SkillProficiencySelectorProps) {
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

    // Filter out skills already granted by background
    const availableSkills = classSkillOptions?.from.filter(
        skill => !backgroundSkills.includes(skill)
    ) || [];

    const maxSelections = classSkillOptions?.choose || 0;

    useEffect(() => {
        // Reset selections when class changes
        setSelectedSkills([]);
        onChange([]);
    }, [classSkillOptions]);

    const handleSkillToggle = (skill: string) => {
        let newSelection: string[];

        if (selectedSkills.includes(skill)) {
            // Remove skill
            newSelection = selectedSkills.filter(s => s !== skill);
        } else {
            // Add skill if under limit
            if (selectedSkills.length >= maxSelections) {
                return; // At limit, can't add more
            }
            newSelection = [...selectedSkills, skill];
        }

        setSelectedSkills(newSelection);
        onChange(newSelection);
    };

    if (!classSkillOptions || availableSkills.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                    Class Skill Proficiencies
                </Label>
                <span className="text-xs text-slate-500">
                    {selectedSkills.length} / {maxSelections} selected
                </span>
            </div>

            {backgroundSkills.length > 0 && (
                <p className="text-xs text-slate-500 italic">
                    Skills from background ({backgroundSkills.map(s => SKILL_DISPLAY_NAMES[s] || s).join(", ")}) are excluded from selection.
                </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableSkills.map(skill => {
                    const isSelected = selectedSkills.includes(skill);
                    const isDisabled = !isSelected && selectedSkills.length >= maxSelections;

                    return (
                        <div
                            key={skill}
                            className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${isSelected
                                    ? "border-red-600 bg-red-50 dark:bg-red-900/20"
                                    : isDisabled
                                        ? "border-slate-200 dark:border-slate-700 opacity-50"
                                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                }`}
                        >
                            <Checkbox
                                id={`skill-${skill}`}
                                checked={isSelected}
                                disabled={isDisabled}
                                onCheckedChange={() => handleSkillToggle(skill)}
                            />
                            <Label
                                htmlFor={`skill-${skill}`}
                                className={`text-sm cursor-pointer ${isDisabled ? "cursor-not-allowed" : ""}`}
                            >
                                {SKILL_DISPLAY_NAMES[skill] || skill}
                            </Label>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
