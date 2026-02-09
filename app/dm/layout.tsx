import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DMLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const NavigationContent = () => (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-zinc-700">
                <h1 className="font-bold text-xl tracking-tight text-amber-500">DM Tools</h1>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                <Link
                    href="/dm"
                    className="block px-3 py-2 rounded-md hover:bg-zinc-800 text-sm font-medium transition-colors text-zinc-300 hover:text-white"
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
        </div>
    );

    return (
        <div className="flex h-screen bg-[#111111] text-zinc-100 overflow-hidden flex-col md:flex-row">
            {/* Mobile Header */}
            <header className="md:hidden border-b border-zinc-800 bg-[#161616] p-4 flex items-center justify-between">
                <span className="font-bold text-lg tracking-tight text-amber-500">DM Tools</span>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0 bg-[#161616] border-zinc-800 text-zinc-100">
                        {/* Accessibility: Title and Description required for screen readers */}
                        <div className="sr-only">
                            <SheetTitle>DM Navigation Menu</SheetTitle>
                            <SheetDescription>Navigation links for DM tools.</SheetDescription>
                        </div>
                        <NavigationContent />
                    </SheetContent>
                </Sheet>
            </header>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 border-r border-zinc-800 bg-[#161616] flex-col">
                <NavigationContent />
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-[#111111]">
                {children}
            </main>
        </div>
    );
}
