"use client";

import React from "react";
import { useCharacterStore } from "@/store/character-store";
import { Button } from "@/components/ui/button";
import { Moon, Coffee } from "lucide-react";

export function CharacterHeaderActions() {
    const { longRest, shortRest, maxPactSlots } = useCharacterStore();

    return (
        <div className="flex gap-2">
            {/* Short Rest - Only show if character has pact slots or hit dice to spend */}
            <Button
                variant="outline"
                size="sm"
                onClick={shortRest}
                className="gap-2"
                title="Recover Pact Magic slots. Spend Hit Dice to heal."
            >
                <Coffee size={16} />
                Short Rest
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={longRest}
                className="gap-2"
                title="Restores HP, Hit Dice (1/2), and resets all Spell Slots"
            >
                <Moon size={16} />
                Long Rest
            </Button>
        </div>
    );
}
