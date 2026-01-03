
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Archive, AlertCircle } from 'lucide-react';

interface QuestListProps {
    title?: string;
    quests: any[];
    onSelect: (quest: any) => void;
    compact?: boolean;
}

export function QuestList({ title, quests, onSelect, compact }: QuestListProps) {
    if (quests.length === 0) return null;

    return (
        <div className="space-y-2">
            {title && (
                <h3 className="text-sm font-medium text-slate-500 mb-2 px-1">{title}</h3>
            )}
            <div className="space-y-2">
                {quests.map(quest => (
                    <div
                        key={quest.id}
                        className={cn(
                            "group flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors",
                            compact && "opacity-75 hover:opacity-100"
                        )}
                        onClick={() => onSelect(quest)}
                    >
                        <div className="mt-1 shrink-0">
                            {quest.status === 'completed' ? (
                                <CheckCircle size={18} className="text-green-500" />
                            ) : quest.status === 'failed' ? (
                                <AlertCircle size={18} className="text-red-500" />
                            ) : quest.status === 'paused' ? (
                                <Archive size={18} className="text-slate-400" />
                            ) : (
                                <Circle size={18} className="text-blue-500" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className={cn(
                                "font-medium text-slate-900 dark:text-slate-100 truncate leading-tight",
                                (quest.status === 'completed' || quest.status === 'failed') && "line-through text-slate-500"
                            )}>
                                {quest.title}
                            </h4>
                            {!compact && quest.description && (
                                <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                    {quest.description}
                                </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-slate-400">
                                    {new Date(quest.createdAt).toLocaleDateString()}
                                </span>
                                {quest.objectives?.length > 0 && (
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                        {quest.objectives.filter((o: any) => o.isCompleted).length}/{quest.objectives.length}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
