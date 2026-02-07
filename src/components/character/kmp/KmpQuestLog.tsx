"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, NotebookPen } from 'lucide-react';
import { QuestList } from '@/components/character/quest/QuestList';
import { QuestForm } from '@/components/character/quest/QuestForm';
import { useKmpCharacter } from './KmpCharacterProvider';

import {
    ArrowLeft, CheckCircle, Circle, MoreVertical, Trash2,
    Send, MessageSquare, Archive, AlertCircle
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function KmpQuestLog() {
    const { viewModel, state } = useKmpCharacter();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const quests = state?.character?.quests || [];
    const selectedQuest = selectedQuestId ? quests.find((q: any) => q.id === selectedQuestId) : null;

    const activeQuests = quests.filter((q: any) => q.status === 'active' || q.status === 'paused');
    const completedQuests = quests.filter((q: any) => q.status === 'completed');
    const failedQuests = quests.filter((q: any) => q.status === 'failed');

    const handleCreateQuest = async (data: any) => {
        viewModel?.addQuest(data.title, data.description);
        setIsCreating(false);
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <NotebookPen size={16} />
                    Quest Log
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[400px] sm:w-[540px] flex flex-col p-0">
                <SheetHeader className="p-6 pb-2 border-b">
                    <div className="flex items-center justify-between">
                        <SheetTitle>Quest Log</SheetTitle>
                        {!isCreating && !selectedQuestId && (
                            <Button size="sm" onClick={() => setIsCreating(true)}>
                                <Plus size={16} className="mr-2" />
                                New Quest
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 p-6 pt-2">
                    {isCreating ? (
                        <QuestForm
                            onCancel={() => setIsCreating(false)}
                            onSubmit={handleCreateQuest}
                        />
                    ) : selectedQuest ? (
                        <KmpQuestDetail
                            quest={selectedQuest}
                            onBack={() => setSelectedQuestId(null)}
                            viewModel={viewModel}
                        />
                    ) : (
                        <div className="space-y-6">
                            <QuestList
                                title="Active & Paused Quests"
                                quests={activeQuests}
                                onSelect={(q) => setSelectedQuestId(q.id)}
                            />

                            {(completedQuests.length > 0 || failedQuests.length > 0) && (
                                <div className="pt-4 border-t">
                                    <h3 className="text-sm font-medium text-slate-500 mb-2">Past Quests</h3>
                                    <QuestList
                                        quests={[...completedQuests, ...failedQuests]}
                                        onSelect={(q) => setSelectedQuestId(q.id)}
                                        compact
                                    />
                                </div>
                            )}

                            {quests.length === 0 && (
                                <div className="text-center py-10 text-slate-500">
                                    <p>No quests recorded yet.</p>
                                    <Button variant="link" onClick={() => setIsCreating(true)}>
                                        Start your first quest
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

// --- Inner Component: KmpQuestDetail ---
// Re-implementing QuestDetail to use viewModel methods directly

function KmpQuestDetail({ quest, onBack, viewModel }: { quest: any, onBack: () => void, viewModel: any }) {
    const [isEditing, setIsEditing] = useState(false);
    const [newObjective, setNewObjective] = useState('');
    const [newLog, setNewLog] = useState('');

    // Sort items
    const objectives = [...(quest.objectives || [])].sort((a: any, b: any) => a.order - b.order);
    const logs = [...(quest.logs || [])].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const handleStatusChange = (status: string) => {
        viewModel.updateQuest(quest.id, null, null, status, null);
    };

    const handleDelete = () => {
        if (confirm("Are you sure you want to delete this quest?")) {
            viewModel.deleteQuest(quest.id);
            onBack();
        }
    };

    const handleAddObjective = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newObjective.trim()) return;
        viewModel.addQuestObjective(quest.id, newObjective, objectives.length); // simple order
        setNewObjective('');
    };

    const handleAddLog = () => {
        if (!newLog.trim()) return;
        viewModel.addQuestLog(quest.id, newLog);
        setNewLog('');
    };

    if (isEditing) {
        return (
            <QuestForm
                initialData={quest}
                onCancel={() => setIsEditing(false)}
                onSubmit={async (data) => {
                    viewModel.updateQuest(quest.id, data.title, data.description, null, null);
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
                    {objectives.map((obj: any) => (
                        <div key={obj.id} className="group flex items-start gap-3 py-1.5 px-2 -mx-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <button
                                className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-500 transition-colors"
                                onClick={() => viewModel.toggleQuestObjective(obj.id, !obj.isCompleted)}
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
                                onClick={() => viewModel.deleteQuestObjective(obj.id)}
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
                    {logs.map((log: any) => (
                        <div key={log.id} className="flex gap-3 text-sm group">
                            <div className="w-16 shrink-0 text-xs text-slate-400 text-right">
                                {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="flex-1 pb-4 border-b border-dashed border-slate-100 dark:border-slate-800 last:border-0 relative">
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{log.content}</p>
                                <button
                                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                                    onClick={() => viewModel.deleteQuestLog(log.id)}
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

