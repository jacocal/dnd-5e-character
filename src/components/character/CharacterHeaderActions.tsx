"use client";

import React from "react";
import { useKmpCharacter } from "@/components/character/kmp/KmpCharacterProvider";
import { Button } from "@/components/ui/button";
import { Moon, Coffee } from "lucide-react";

export function CharacterHeaderActions() {
    const { viewModel } = useKmpCharacter();

    const handleShortRest = () => {
        viewModel?.performShortRest();
    };

    const handleLongRest = () => {
        viewModel?.performLongRest();
    };

    return (
        <div className="flex gap-2">
            {/* Short Rest */}
            <Button
                variant="outline"
                size="sm"
                onClick={handleShortRest}
                className="gap-2"
                title="Recover Pact Magic slots. Spend Hit Dice to heal."
            >
                <Coffee size={16} />
                Short Rest
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={handleLongRest}
                className="gap-2"
                title="Restores HP, Hit Dice (1/2), and resets all Spell Slots"
            >
                <Moon size={16} />
                Long Rest
            </Button>
        </div>
    );
}
