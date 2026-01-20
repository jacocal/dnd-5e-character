
import { AlignmentManager } from "@/components/dm/AlignmentManager";

export default function DMPage() {
    return (
        <div className="p-8 max-w-4xl">
            <h1 className="text-3xl font-bold text-white mb-6">DM Sandbox</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-900/50 transition-colors">
                    <h2 className="text-xl font-semibold text-amber-500 mb-2">Item Database</h2>
                    <p className="text-zinc-400 mb-4">
                        Create custom weapons, armor, and magic items directly in the server database.
                        These items will be searchable and addable to any character.
                    </p>
                    <a
                        href="/dm/items/create"
                        className="inline-flex items-center justify-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-medium transition-colors"
                    >
                        Open Item Creator
                    </a>
                </div>

                <AlignmentManager />

                <div className="p-6 rounded-lg bg-zinc-900 border border-zinc-800 opacity-60">
                    <h2 className="text-xl font-semibold text-zinc-500 mb-2">Spell Grimoire</h2>
                    <p className="text-zinc-500 mb-4">
                        Define new spells, cantrips, and rituals. (Coming Soon)
                    </p>
                </div>
            </div>
        </div>
    );
}

