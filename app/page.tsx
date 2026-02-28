import Link from "next/link";
import { User, Shield, Sword, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllCharacters } from "@/db/queries";
import { DeleteCharacterButton } from "./DeleteCharacterButton";

export default async function Home() {
  const characters = await getAllCharacters();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg mb-4">
            <Shield size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            D&D 5e Character
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Select a character to begin your adventure
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
          {characters.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No characters found. Create one to get started!
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {characters.map((char) => {
                const mainClass = char.classes[0]?.class?.name || "Unknown Class";
                const level = char.level;

                return (
                  <li key={char.id} className="relative group border-b border-slate-200 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition duration-150 ease-in-out">
                    <div className="flex items-center">
                      <Link
                        href={`/character/${char.id}`}
                        className="flex-1 px-4 py-4 sm:px-6 flex items-center min-w-0"
                      >
                        <div className="min-w-0 flex-1 flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                            <User size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-red-600 truncate">
                              {char.name}
                            </p>
                            <p className="flex items-center text-xs text-slate-500 truncate">
                              <Sword size={12} className="mr-1 shrink-0" />
                              <span className="truncate">Level {level} {mainClass}</span>
                            </p>
                          </div>
                        </div>
                      </Link>
                      {/* Action Buttons Container */}
                      <div className="flex items-center pr-4 sm:pr-6 shrink-0 gap-3">
                        {/* Always visible on mobile, visible on hover/focus on desktop */}
                        <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <DeleteCharacterButton characterId={char.id} characterName={char.name} />
                        </div>
                        {/* We add an explicit secondary Link wrapped around the arrow so clicking the extreme right edge still navigates */}
                        <Link href={`/character/${char.id}`} tabIndex={-1} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                          →
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-center">
          <Link href="/character/create">
            <Button className="gap-2 w-full">
              <PlusCircle size={16} />
              Create New Character
            </Button>
          </Link>
        </div>

        <div className="text-center text-xs text-slate-400">
          <p>Scaffold v0.1.2 • Characters Verified</p>
        </div>
      </div>
    </div>
  );
}
