"use client";

import * as React from "react";

interface CheckboxProps {
    id?: string;
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    className?: string;
}

export function Checkbox({
    id,
    checked = false,
    disabled = false,
    onCheckedChange,
    className = "",
}: CheckboxProps) {
    return (
        <input
            type="checkbox"
            id={id}
            checked={checked}
            disabled={disabled}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            className={`w-4 h-4 text-red-600 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 rounded focus:ring-red-500 dark:focus:ring-red-600 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        />
    );
}
