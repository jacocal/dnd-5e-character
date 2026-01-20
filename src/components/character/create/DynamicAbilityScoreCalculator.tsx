"use client";

import { useState, useEffect } from "react";
import AbilityScoreCalculator from "./AbilityScoreCalculator";

interface Background {
    id: string;
    name: string;
    description: string;
    abilityOptions: string[] | null;
}

interface Props {
    backgrounds: Background[];
}

export default function DynamicAbilityScoreCalculator({ backgrounds }: Props) {
    const [selectedBackgroundId, setSelectedBackgroundId] = useState<string>(backgrounds[0]?.id || "");

    // Get the current background's ability options
    const selectedBackground = backgrounds.find(b => b.id === selectedBackgroundId);
    const abilityOptions = selectedBackground?.abilityOptions || null;

    // Listen for changes to the background select dropdown
    useEffect(() => {
        const selectElement = document.getElementById("background-select") as HTMLSelectElement;
        if (!selectElement) return;

        const handleChange = (e: Event) => {
            const target = e.target as HTMLSelectElement;
            setSelectedBackgroundId(target.value);
        };

        selectElement.addEventListener("change", handleChange);
        return () => selectElement.removeEventListener("change", handleChange);
    }, []);

    return (
        <AbilityScoreCalculator abilityOptions={abilityOptions} />
    );
}
