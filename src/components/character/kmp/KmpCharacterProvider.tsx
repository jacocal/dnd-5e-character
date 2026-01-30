"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
// @ts-ignore
// import { org } from "dnd-shared";

// Types aliases for cleaner code
type CharacterSheetViewModel = any;
type CharacterSheetState = any;

interface KmpContextType {
    viewModel: CharacterSheetViewModel | null;
    state: CharacterSheetState | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

const KmpContext = createContext<KmpContextType | undefined>(undefined);

export function KmpCharacterProvider({ children, characterId }: { children: React.ReactNode, characterId: number }) {
    const [state, setState] = useState<CharacterSheetState>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewModel, setViewModel] = useState<CharacterSheetViewModel | null>(null);

    // We store the VM in a Ref to persist across renders without triggering re-renders itself
    const vmRef = useRef<CharacterSheetViewModel>(null);

    const refresh = () => {
        if (vmRef.current) {
            console.log("Refreshing character data...");
            vmRef.current.loadCharacter(characterId);
        }
    };

    useEffect(() => {
        let isMounted = true;
        let unsubscribe: (() => void) | undefined;

        const init = async () => {
            try {
                if (vmRef.current) return; // Already initialized

                console.log("Initializing KMP Shared Module (Apollo/GraphQL)...");
                setIsLoading(true);

                // Load ViewModel via SharedFactory (uses Apollo to fetch from GraphQL API)
                // Using dynamic import to inspect the module structure
                const dndShared = await import("dnd-shared");
                console.log("Loaded dnd-shared module:", dndShared);

                // Handle nested export structure (CommonJS vs ES Module default vs UMD)
                // KMP JS sometimes puts proper packages under 'default.org' if using ES Interop
                const SharedFactory = dndShared.org?.dndcharacter?.shared?.SharedFactory
                    ?? dndShared.default?.org?.dndcharacter?.shared?.SharedFactory;

                if (!SharedFactory) {
                    console.error("SharedFactory not found. Keys:", Object.keys(dndShared));
                    throw new Error("SharedFactory could not be found in dnd-shared export.");
                }

                console.log(`Creating ViewModel via SharedFactory, will load Character ID: ${characterId}`);
                // Use relative URL to avoid localhost/port hardcoding issues
                const graphqlUrl = "/api/graphql";
                const vm = await SharedFactory.createCharacterSheetViewModelWithUrl(graphqlUrl);

                // Subscribe to State
                unsubscribe = vm.subscribe((newState: any) => {
                    try {
                        if (isMounted) {
                            setState(newState);
                            setIsLoading(newState.isLoading);
                            setError(newState.error);
                        }
                    } catch (e: any) {
                        console.error("[KMP Provider] Error in subscription:", e);
                    }
                });

                setViewModel(vm);
                vmRef.current = vm;

                // Load character immediately
                console.log(`Loading character ${characterId} via GraphQL...`);
                vm.loadCharacter(characterId);

            } catch (err: any) {
                console.error("Failed to initialize KMP Module:", err);
                if (isMounted) {
                    setError(`Init Error: ${err.message}`);
                    setIsLoading(false);
                }
            }
        };

        init();

        return () => {
            isMounted = false;
            if (unsubscribe) unsubscribe();
            if (vmRef.current) {
                vmRef.current.dispose();
            }
        };
    }, [characterId]);

    // Handle initial loading state where state might be null
    const safeState = state || {
        character: null,
        resolvedItems: [],
        resolvedSpells: [],
        resolvedConditions: [],
        resolvedResources: [],
        isLoading: isLoading,
        error: error,
        resolvedRace: null
    };

    return (
        <KmpContext.Provider value={{ viewModel: viewModel, state: safeState, isLoading: safeState.isLoading, error: safeState.error, refresh }}>
            {children}
        </KmpContext.Provider>
    );
}

export function useKmpCharacter() {
    const context = useContext(KmpContext);
    if (context === undefined) {
        throw new Error("useKmpCharacter must be used within a KmpCharacterProvider");
    }
    return context;
}

