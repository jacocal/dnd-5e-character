import React from 'react';
import { formatModifiers, type Modifier } from '@/lib/format-description';

interface ModifierDisplayProps {
    modifiers: Modifier[] | null | undefined;
    className?: string;
    emptyMessage?: string;
}

/**
 * Display modifiers in a human-readable, visually appealing format
 */
export function ModifierDisplay({ modifiers, className = '', emptyMessage }: ModifierDisplayProps) {
    if (!modifiers || modifiers.length === 0) {
        if (emptyMessage) {
            return <div className={`text-sm text-slate-500 italic ${className}`}>{emptyMessage}</div>;
        }
        return null;
    }

    const formattedModifiers = formatModifiers(modifiers);

    return (
        <div className={`space-y-1 ${className}`}>
            {formattedModifiers.map((modifier, index) => (
                <div
                    key={index}
                    className="flex items-start gap-2 text-sm"
                >
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                    <span className="text-slate-700 dark:text-slate-300">{modifier}</span>
                </div>
            ))}
        </div>
    );
}

interface ModifierBadgeListProps {
    modifiers: Modifier[] | null | undefined;
    className?: string;
}

/**
 * Display modifiers as compact badges (useful for lists)
 */
export function ModifierBadgeList({ modifiers, className = '' }: ModifierBadgeListProps) {
    if (!modifiers || modifiers.length === 0) return null;

    const formattedModifiers = formatModifiers(modifiers);

    return (
        <div className={`flex flex-wrap gap-1.5 ${className}`}>
            {formattedModifiers.map((modifier, index) => (
                <span
                    key={index}
                    className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                >
                    {modifier}
                </span>
            ))}
        </div>
    );
}
