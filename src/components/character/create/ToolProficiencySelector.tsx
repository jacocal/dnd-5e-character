"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";

// Tool categories and their available options
const TOOL_CATEGORIES: Record<string, { id: string; name: string }[]> = {
    "artisans_tools": [
        { id: "alchemists-supplies", name: "Alchemist's Supplies" },
        { id: "brewers-supplies", name: "Brewer's Supplies" },
        { id: "calligraphers-supplies", name: "Calligrapher's Supplies" },
        { id: "carpenters-tools", name: "Carpenter's Tools" },
        { id: "cartographers-tools", name: "Cartographer's Tools" },
        { id: "cobblers-tools", name: "Cobbler's Tools" },
        { id: "cooks-utensils", name: "Cook's Utensils" },
        { id: "glassblowers-tools", name: "Glassblower's Tools" },
        { id: "jewelers-tools", name: "Jeweler's Tools" },
        { id: "leatherworkers-tools", name: "Leatherworker's Tools" },
        { id: "masons-tools", name: "Mason's Tools" },
        { id: "painters-supplies", name: "Painter's Supplies" },
        { id: "potters-tools", name: "Potter's Tools" },
        { id: "smiths-tools", name: "Smith's Tools" },
        { id: "tinkers-tools", name: "Tinker's Tools" },
        { id: "weavers-tools", name: "Weaver's Tools" },
        { id: "woodcarvers-tools", name: "Woodcarver's Tools" },
    ],
    "gaming_sets": [
        { id: "gaming-set-dice", name: "Dice Set" },
        { id: "gaming-set-dragonchess", name: "Dragonchess Set" },
        { id: "gaming-set-cards", name: "Playing Card Set" },
        { id: "gaming-set-three-dragon", name: "Three-Dragon Ante Set" },
    ],
    "musical_instruments": [
        { id: "musical-instrument-bagpipes", name: "Bagpipes" },
        { id: "musical-instrument-drum", name: "Drum" },
        { id: "musical-instrument-dulcimer", name: "Dulcimer" },
        { id: "musical-instrument-flute", name: "Flute" },
        { id: "musical-instrument-horn", name: "Horn" },
        { id: "musical-instrument-lute", name: "Lute" },
        { id: "musical-instrument-lyre", name: "Lyre" },
        { id: "musical-instrument-panflute", name: "Pan Flute" },
        { id: "musical-instrument-shawm", name: "Shawm" },
        { id: "musical-instrument-viol", name: "Viol" },
    ],
};

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
    "artisans_tools": "Artisan's Tools",
    "gaming_sets": "Gaming Set",
    "musical_instruments": "Musical Instrument",
};

interface ToolProficiencySelectorProps {
    toolChoice: { count: number; category: string } | null;
    fixedTools: string[] | null;
    onChange: (selected: string[]) => void;
}

export default function ToolProficiencySelector({
    toolChoice,
    fixedTools,
    onChange,
}: ToolProficiencySelectorProps) {
    const [selectedTool, setSelectedTool] = useState<string>("");

    useEffect(() => {
        // Reset when background changes
        setSelectedTool("");
        onChange([]);
    }, [toolChoice, fixedTools]);

    const handleToolChange = (toolId: string) => {
        setSelectedTool(toolId);
        onChange(toolId ? [toolId] : []);
    };

    // If there's no choice to make, just display fixed tools
    if (!toolChoice && (!fixedTools || fixedTools.length === 0)) {
        return null;
    }

    const availableTools = toolChoice ? TOOL_CATEGORIES[toolChoice.category] : [];
    const categoryName = toolChoice ? CATEGORY_DISPLAY_NAMES[toolChoice.category] : "";

    return (
        <div className="space-y-3">
            <Label className="text-sm font-medium">Tool Proficiencies</Label>

            {/* Display fixed tools */}
            {fixedTools && fixedTools.length > 0 && (
                <div className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Granted: </span>
                    {fixedTools.map(t => {
                        // Find display name in any category
                        for (const category of Object.values(TOOL_CATEGORIES)) {
                            const tool = category.find(tool => tool.id === t);
                            if (tool) return tool.name;
                        }
                        // Fallback: capitalize and format the ID
                        return t.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                    }).join(", ")}
                </div>
            )}

            {/* Tool choice selector */}
            {toolChoice && availableTools.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs text-slate-500">
                        Choose {toolChoice.count} {categoryName}:
                    </p>
                    <select
                        value={selectedTool}
                        onChange={(e) => handleToolChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-red-600 outline-none"
                    >
                        <option value="">-- Select {categoryName} --</option>
                        {availableTools.map(tool => (
                            <option key={tool.id} value={tool.id}>
                                {tool.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}
