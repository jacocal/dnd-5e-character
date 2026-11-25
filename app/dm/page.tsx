import { KmpDmDashboardProvider } from "@/components/dm/kmp/KmpDmDashboardProvider";
import { KmpDmDashboard } from "@/components/dm/kmp/KmpDmDashboard";
import Link from "next/link";

export default function DMPage() {
    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Human DM Campaign Sandbox</h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Monitor active player sheets in real time and author custom items & spells with full KMP rules engine automation.
                    </p>
                </div>
                <Link
                    href="/"
                    className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                    ← Back to Characters
                </Link>
            </div>

            {/* Active Players Dashboard */}
            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
                <KmpDmDashboardProvider>
                    <KmpDmDashboard />
                </KmpDmDashboardProvider>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-colors">
                    <h2 className="text-xl font-semibold text-amber-500 mb-2">Custom Item Forge</h2>
                    <p className="text-zinc-400 mb-4 text-sm">
                        Create custom weapons, armor, and magic/cursed items with structured damage dice, modifiers, and proficiencies.
                    </p>
                    <Link
                        href="/dm/items/create"
                        className="inline-flex items-center justify-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-medium text-sm transition-colors"
                    >
                        Open Item Creator
                    </Link>
                </div>

                <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 transition-colors">
                    <h2 className="text-xl font-semibold text-purple-400 mb-2">Custom Spell Grimoire</h2>
                    <p className="text-zinc-400 mb-4 text-sm">
                        Author new 5e (2024) spells, cantrips, and rituals with structured attack rolls, saving throws, damage/healing dice, and upcast scaling.
                    </p>
                    <Link
                        href="/dm/spells/create"
                        className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md font-medium text-sm transition-colors"
                    >
                        Open Spell Creator
                    </Link>
                </div>
            </div>
        </div>
    );
}
