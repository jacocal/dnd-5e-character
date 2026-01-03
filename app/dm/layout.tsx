import Link from "next/link";

export default function DMLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-[#111111] text-zinc-100 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-zinc-800 bg-[#161616] flex flex-col">
                <div className="p-4 border-b border-zinc-700">
                    <h1 className="font-bold text-xl tracking-tight text-amber-500">DM Tools</h1>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Link
                        href="/dm"
                        className="block px-3 py-2 rounded-md hover:bg-zinc-800 text-sm font-medium transition-colors"
                    >
                        Dashboard
                    </Link>

                    <div className="pt-4 pb-2">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3">
                            Database
                        </span>
                    </div>

                    <Link
                        href="/dm/items/create"
                        className="block px-3 py-2 rounded-md hover:bg-zinc-800 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                    >
                        Create Item
                    </Link>
                    <Link
                        href="#"
                        className="block px-3 py-2 rounded-md hover:bg-zinc-800 text-sm font-medium text-zinc-500 cursor-not-allowed"
                    >
                        Create Spell (Coming Soon)
                    </Link>
                    <Link
                        href="#"
                        className="block px-3 py-2 rounded-md hover:bg-zinc-800 text-sm font-medium text-zinc-500 cursor-not-allowed"
                    >
                        Create Monster (Coming Soon)
                    </Link>
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <Link href="/" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                        ← Back to App
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
