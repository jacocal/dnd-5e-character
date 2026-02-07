
import React from 'react';
import { notFound } from 'next/navigation';
import { getCharacterById } from '@/db/queries';
import { KmpCharacterSheet } from '@/components/character/kmp/KmpCharacterSheet';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function CharacterSheetPage({ params }: PageProps) {
    const { id } = await params;
    const characterId = parseInt(id);

    if (isNaN(characterId)) {
        notFound();
    }

    // Verify existence server-side standardizing behavior with legacy page
    // The KMP provider will re-fetch data, but this prevents loading the app for invalid IDs
    const characterData = await getCharacterById(characterId);

    if (!characterData) {
        notFound();
    }

    return (
        <KmpCharacterSheet characterId={characterId} />
    );
}

