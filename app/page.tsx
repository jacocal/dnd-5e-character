import Link from "next/link";
import {
    User,
    Shield,
    Sword,
    PlusCircle,
    Sparkles,
    Hammer,
    BookOpen,
    Heart,
    Flame,
    Compass
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAllCharacters } from "@/db/queries";
import { DeleteCharacterButton } from "./DeleteCharacterButton";

export default async function Home() {
    const characters = await getAllCharacters();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-8">
            <div className="max-w-5xl w-full mx-auto space-y-8 pt-4">
                {/* Top Hero Header & Quick Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                            <Shield size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    D&amp;D 5e (2024) Party Roster
                                </h1>
                                <Badge className="bg-indigo-600/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-bold">
                                    KMP Engine v2 • SRD 5.2
                                </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                Deterministic Rules Engine • Causal Trigger Matrix • Local Koog Tactical Co-Pilot
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Link href="/character/create">
                            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-sm">
                                <PlusCircle size={16} />
                                Create Hero
                            </Button>
                        </Link>
                        <Link href="/map">
                            <Button variant="outline" className="gap-2 font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                                <Compass size={15} className="text-emerald-500" />
                                Live Battle Map
                            </Button>
                        </Link>
                        <Link href="/dm">
                            <Button variant="outline" className="gap-2 font-semibold">
                                <Shield size={15} className="text-amber-500" />
                                DM Command Center
                            </Button>
                        </Link>
                        <Link href="/dm/items/create">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                                <Hammer size={13} className="text-indigo-400" />
                                Item Forge
                            </Button>
                        </Link>
                        <Link href="/dm/spells/create">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                                <BookOpen size={13} className="text-purple-400" />
                                Spell Grimoire
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Party Roster Grid */}
                {characters.length === 0 ? (
                    <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
                        <Compass className="w-10 h-10 text-indigo-400 mx-auto opacity-75" />
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                No Adventurers in the Party Yet
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Create your first D&amp;D 5e (2024) character to launch the interactive sheet.
                            </p>
                        </div>
                        <Link href="/character/create">
                            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white">
                                <PlusCircle size={16} />
                                Create First Character
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {characters.map((char: any) => {
                            const classLabels = (char.classes || []).map((c: any) => {
                                const cName = c.class?.name || c.classId || "Adventurer";
                                const sName = c.subclass?.name ? ` (${c.subclass.name})` : "";
                                return `Lvl ${c.level} ${cName}${sName}`;
                            });
                            const classText = classLabels.length > 0 ? classLabels.join(" / ") : `Lvl ${char.level} Adventurer`;
                            const raceName = char.raceEntry?.name || char.raceId || "Unknown Lineage";
                            const bgName = char.background?.name || char.backgroundId || "Adventurer";
                            const hpPct = char.hpMax > 0 ? Math.min(100, Math.max(0, Math.round((char.hpCurrent / char.hpMax) * 100))) : 100;
                            const dexMod = Math.floor(((char.dex || 10) - 10) / 2);
                            const approxAc = char.armorClass || 10 + dexMod;

                            const stats = [
                                { k: "STR", v: char.str },
                                { k: "DEX", v: char.dex },
                                { k: "CON", v: char.con },
                                { k: "INT", v: char.int },
                                { k: "WIS", v: char.wis },
                                { k: "CHA", v: char.cha }
                            ];

                            return (
                                <div
                                    key={char.id}
                                    className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/60 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                                >
                                    <Link href={`/character/${char.id}`} className="p-5 block space-y-4 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg shrink-0">
                                                    {char.name?.charAt(0)?.toUpperCase() || <User size={22} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                                            {char.name}
                                                        </h2>
                                                        {char.inspiration && (
                                                            <Badge className="bg-amber-500 text-slate-950 text-[9px] h-4 px-1.5 font-black">
                                                                ★ Inspired
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate mt-0.5 flex items-center gap-1">
                                                        <Sword size={12} className="shrink-0" />
                                                        <span className="truncate">{classText}</span>
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                        {raceName} • {bgName}
                                                        {char.alignment ? ` • ${char.alignment}` : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Quick Vitals Badges */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                                                    <div className="text-[9px] font-bold uppercase text-slate-400">AC</div>
                                                    <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-100">
                                                        {approxAc}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* HP Progress Bar */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px] font-semibold">
                                                <span className="flex items-center gap-1 text-slate-500">
                                                    <Heart size={12} className="text-rose-500 fill-rose-500" />
                                                    Hit Points
                                                </span>
                                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                                    {char.hpCurrent} / {char.hpMax} HP
                                                    {char.tempHp > 0 ? ` (+${char.tempHp} Temp)` : ""}
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={
                                                        hpPct > 50
                                                            ? "h-full bg-emerald-500 transition-all"
                                                            : hpPct > 20
                                                            ? "h-full bg-amber-500 transition-all"
                                                            : "h-full bg-rose-600 transition-all"
                                                    }
                                                    style={{ width: `${hpPct}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* 6 Ability Score Mini-Pills */}
                                        <div className="grid grid-cols-6 gap-1.5 pt-1">
                                            {stats.map((st) => {
                                                const mod = Math.floor(((st.v || 10) - 10) / 2);
                                                return (
                                                    <div
                                                        key={st.k}
                                                        className="py-1 px-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-center"
                                                    >
                                                        <div className="text-[9px] font-bold text-slate-400">{st.k}</div>
                                                        <div className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                                                            {mod >= 0 ? `+${mod}` : mod}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </Link>

                                    {/* Bottom Card Footer */}
                                    <div className="px-5 py-2.5 bg-slate-50/80 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                                        <span className="text-[11px] text-slate-400 font-mono">
                                            ID #{char.id} • {char.xp || 0} XP
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <DeleteCharacterButton characterId={char.id} characterName={char.name} />
                                            <Link
                                                href={`/character/${char.id}`}
                                                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                            >
                                                Open Sheet →
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <footer className="text-center text-xs text-slate-400 py-6 mt-12 border-t border-slate-200/60 dark:border-slate-800/60 max-w-5xl w-full mx-auto flex items-center justify-between flex-wrap gap-2">
                <span>D&amp;D 5e (2024) Character &amp; Tactical Engine • Pure KMP + Ktor + Next.js</span>
                <span className="flex items-center gap-1 text-indigo-400">
                    <Sparkles size={12} /> Local Ollama &amp; Cloud BYOK Ready
                </span>
            </footer>
        </div>
    );
}
