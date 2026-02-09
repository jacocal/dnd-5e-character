"use client";

import { KmpDmItemCreatorProvider } from "@/components/dm/kmp/KmpDmItemCreatorProvider";
import { KmpDmItemCreator } from "@/components/dm/kmp/KmpDmItemCreator";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CreateItemPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <Link href="/dm" className="inline-flex items-center text-zinc-400 hover:text-white mb-6 text-sm">
                <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
            </Link>

            <h1 className="text-3xl font-bold text-white mb-6">Create New Item (KMP)</h1>
            <p className="text-zinc-400 mb-8">
                Add a new item to the global database using the shared Kotlin Multiplatform logic.
            </p>

            <KmpDmItemCreatorProvider>
                <KmpDmItemCreator />
            </KmpDmItemCreatorProvider>
        </div>
    );
}
