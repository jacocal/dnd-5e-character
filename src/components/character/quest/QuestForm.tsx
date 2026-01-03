
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface QuestFormProps {
    initialData?: any;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}

export function QuestForm({ initialData, onSubmit, onCancel }: QuestFormProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit({ title, description });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 px-1">
            <div className="space-y-2">
                <Label htmlFor="title">Quest Title</Label>
                <Input
                    id="title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Retrieve the Lost Idol"
                    autoFocus
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Details about the quest..."
                    rows={4}
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !title.trim()}>
                    {initialData ? 'Update Quest' : 'Create Quest'}
                </Button>
            </div>
        </form>
    );
}
