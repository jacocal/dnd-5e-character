
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, NotebookPen } from 'lucide-react';
import { QuestList } from '@/components/character/quest/QuestList';
import { QuestDetail } from '@/components/character/quest/QuestDetail';
import { QuestForm } from '@/components/character/quest/QuestForm';
import { createQuest } from '@/app/quest-actions';

interface QuestLogPanelProps {
    characterId: number;
    quests: any[];
}

export function QuestLogPanel({ characterId, quests }: QuestLogPanelProps) {
    const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Derived state for the selected quest to ensure it's always fresh from props
    const selectedQuest = selectedQuestId ? quests.find(q => q.id === selectedQuestId) || null : null;

    const handleCreateQuest = async (data: any) => {
        const result = await createQuest(characterId, data);
        if (result.success) {
            setIsCreating(false);
            // Optimistically update or rely on revalidation?
            // Revalidation handles it, but local state might lag if we don't refresh props.
            // Since this is a server component child, props update on revalidatePath.
        }
    };

    const activeQuests = quests.filter(q => q.status === 'active' || q.status === 'paused');
    const completedQuests = quests.filter(q => q.status === 'completed');
    const failedQuests = quests.filter(q => q.status === 'failed');

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
                        <QuestDetail
                            quest={selectedQuest}
                            onBack={() => setSelectedQuestId(null)}
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
