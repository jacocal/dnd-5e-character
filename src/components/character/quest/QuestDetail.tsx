
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
    ArrowLeft, CheckCircle, Circle, MoreVertical, Trash2,
    Plus, Send, MessageSquare
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
    updateQuest, deleteQuest, addQuestObjective,
    toggleQuestObjective, deleteQuestObjective,
    addQuestLog, deleteQuestLog
} from '@/app/quest-actions';
import { cn } from '@/lib/utils';
import { QuestForm } from '@/components/character/quest/QuestForm';

interface QuestDetailProps {
    quest: any;
    onBack: () => void;
}

export function QuestDetail({ quest, onBack }: QuestDetailProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [newObjective, setNewObjective] = useState('');
    const [newLog, setNewLog] = useState('');

    // Sort items
    const objectives = [...(quest.objectives || [])].sort((a, b) => a.order - b.order);
    const logs = [...(quest.logs || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const handleStatusChange = async (status: string) => {
        await updateQuest(quest.id, { status });
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this quest?")) {
            await deleteQuest(quest.id);
            onBack();
        }
    };

    const handleAddObjective = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newObjective.trim()) return;
        await addQuestObjective(quest.id, newObjective);
        setNewObjective('');
    };

    const handleAddLog = async () => {
        if (!newLog.trim()) return;
        await addQuestLog(quest.id, newLog);
        setNewLog('');
    };

    if (isEditing) {
        return (
            <QuestForm
                initialData={quest}
                onCancel={() => setIsEditing(false)}
                onSubmit={async (data) => {
                    await updateQuest(quest.id, data);
                    setIsEditing(false);
                }}
            />
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start gap-3 mb-6">
                <Button variant="ghost" size="icon" className="-ml-2 shrink-0" onClick={onBack}>
                    <ArrowLeft size={18} />
                </Button>
                <div className="flex-1">
                    <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white mb-1">
                        {quest.title}
                    </h2>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full uppercase tracking-wider",
                            quest.status === 'active' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                            quest.status === 'completed' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                            quest.status === 'failed' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                            quest.status === 'paused' && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        )}>
                            {quest.status}
                        </span>
                        <span className="text-xs text-slate-400">
                            Started {new Date(quest.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mr-2">
                            <MoreVertical size={18} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>Edit Details</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange('active')}>Mark Active</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange('completed')}>Mark Completed</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange('failed')}>Mark Failed</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange('paused')}>Pause</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                            <Trash2 size={16} className="mr-2" /> Delete Quest
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Description */}
            {quest.description && (
                <div className="text-sm text-slate-600 dark:text-slate-300 mb-6 whitespace-pre-wrap leading-relaxed">
                    {quest.description}
                </div>
            )}

            {/* Objectives */}
            <div className="space-y-3 mb-8">
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    Objectives
                </h3>
                <div className="space-y-1">
                    {objectives.map(obj => (
                        <div key={obj.id} className="group flex items-start gap-3 py-1.5 px-2 -mx-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <button
                                className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-500 transition-colors"
                                onClick={() => toggleQuestObjective(obj.id, !obj.isCompleted)}
                            >
                                {obj.isCompleted ? (
                                    <CheckCircle size={18} className="text-green-500" />
                                ) : (
                                    <Circle size={18} />
                                )}
                            </button>
                            <span className={cn(
                                "flex-1 text-sm leading-relaxed",
                                obj.isCompleted && "line-through text-slate-400"
                            )}>
                                {obj.description}
                            </span>
                            <button
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                                onClick={() => deleteQuestObjective(obj.id)}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleAddObjective} className="flex items-center gap-2 mt-2">
                    <Input
                        value={newObjective}
                        onChange={e => setNewObjective(e.target.value)}
                        placeholder="Add new objective..."
                        className="h-8 text-sm"
                    />
                    <Button type="submit" size="sm" variant="ghost" disabled={!newObjective.trim()}>
                        <Plus size={16} />
                    </Button>
                </form>
            </div>

            {/* Logs */}
            <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2 mb-3">
                    <MessageSquare size={14} /> Adventure Log
                </h3>

                <div className="space-y-4 mb-4">
                    {logs.map(log => (
                        <div key={log.id} className="flex gap-3 text-sm group">
                            <div className="w-16 shrink-0 text-xs text-slate-400 text-right">
                                {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="flex-1 pb-4 border-b border-dashed border-slate-100 dark:border-slate-800 last:border-0 relative">
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{log.content}</p>
                                <button
                                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                                    onClick={() => deleteQuestLog(log.id)}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <Textarea
                            value={newLog}
                            onChange={e => setNewLog(e.target.value)}
                            placeholder="Add a log entry..."
                            className="min-h-[80px] resize-none pr-12 text-sm"
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddLog();
                                }
                            }}
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute bottom-2 right-2 h-8 w-8 text-slate-400 hover:text-blue-500"
                            onClick={handleAddLog}
                            disabled={!newLog.trim()}
                        >
                            <Send size={16} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
