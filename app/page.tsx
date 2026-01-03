import Link from "next/link";
import { User, Shield, Sword, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllCharacters } from "@/db/queries";
import { deleteCharacter } from "./actions";

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
                  <li key={char.id} className="relative group">
                    <Link
                      href={`/character/${char.id}`}
                      className="block hover:bg-slate-50 dark:hover:bg-slate-800 transition duration-150 ease-in-out"
                    >
                      <div className="px-4 py-4 sm:px-6 flex items-center pr-16">
                        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                              <User size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-red-600 truncate">
                                {char.name}
                              </p>
                              <p className="flex items-center text-xs text-slate-500">
                                <Sword size={12} className="mr-1" />
                                Level {level} {mainClass}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-5 flex-shrink-0">
                          <span className="text-slate-400">→</span>
                        </div>
                      </div>
                    </Link>
                    <div className="absolute top-1/2 right-12 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <form
                        action={async () => {
                          "use server";
                          await deleteCharacter(char.id);
                        }}
                      >
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete Character"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </form>
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
