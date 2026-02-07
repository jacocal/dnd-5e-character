"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { User, Sword, Sparkles, Package, BookOpen, Shield } from "lucide-react";

export function KmpMobileNav() {
    const [activeSection, setActiveSection] = useState("stats");

    const sections = [
        { id: "section-stats", icon: User, label: "Stats" },
        { id: "section-combat", icon: Shield, label: "Combat" },
        { id: "section-actions", icon: Sword, label: "Actions" },
        { id: "section-spells", icon: Sparkles, label: "Spells" },
        { id: "section-inventory", icon: Package, label: "Inv" },
        { id: "section-bio", icon: BookOpen, label: "Bio" },
    ];

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            // Offset for sticky header
            const headerOffset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
            setActiveSection(id);
        }
    };

    // Intersection Observer to update active state on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { threshold: 0.3, rootMargin: "-10% 0px -50% 0px" }
        );

        sections.forEach(({ id }) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
            <nav className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full shadow-2xl border border-slate-700/50 p-2 flex justify-between items-center overflow-x-auto no-scrollbar">
                {sections.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => scrollToSection(id)}
                        className={cn(
                            "flex flex-col items-center justify-center min-w-[3.5rem] py-1 gap-1 rounded-full transition-all duration-200",
                            activeSection === id
                                ? "text-white bg-indigo-600 shadow-lg"
                                : "text-slate-400 hover:text-slate-200 hover:bg-white/10"
                        )}
                    >
                        <Icon size={18} strokeWidth={activeSection === id ? 2.5 : 2} />
                        <span className="text-[10px] font-medium leading-none">{label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
