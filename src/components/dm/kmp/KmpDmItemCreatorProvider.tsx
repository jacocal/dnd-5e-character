"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
// @ts-ignore
// import { org } from "dnd-shared";

// Types aliases for cleaner code
type DmItemCreatorViewModel = any;
type DmItemCreatorState = any;

interface KmpDmItemCreatorContextType {
    viewModel: DmItemCreatorViewModel | null;
    state: DmItemCreatorState | null;
    isLoading: boolean;
    error: string | null;
}

const KmpDmItemCreatorContext = createContext<KmpDmItemCreatorContextType | undefined>(undefined);

export function KmpDmItemCreatorProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<DmItemCreatorState>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewModel, setViewModel] = useState<DmItemCreatorViewModel | null>(null);

    const vmRef = useRef<DmItemCreatorViewModel>(null);

    useEffect(() => {
        let isMounted = true;
        let unsubscribe: (() => void) | undefined;

        const init = async () => {
            try {
                if (vmRef.current) return;

                console.log("Initializing KMP Shared Module (Apollo/GraphQL) for DM Item Creator...");
                setIsLoading(true);

                const dndShared = await import("dnd-shared");

                const SharedFactory = dndShared.org?.dndcharacter?.shared?.SharedFactory
                    ?? dndShared.default?.org?.dndcharacter?.shared?.SharedFactory;

                if (!SharedFactory) {
                    throw new Error("SharedFactory could not be found in dnd-shared export.");
                }

                console.log(`Creating DmItemCreatorViewModel via SharedFactory`);
                const graphqlUrl = "/api/graphql";
                const vm = await SharedFactory.createDmItemCreatorViewModelWithUrl(graphqlUrl);

                unsubscribe = vm.watchState((newState: any) => {
                    try {
                        if (isMounted) {
                            setState(newState);
                            setIsLoading(false); // Item creator starts ready essentially, but state defines loading too
                            setError(newState.submissionError); // Map submission error to general error if needed?
                            // Actually, let's keep local error distinct from submission error
                        }
                    } catch (e: any) {
                        console.error("[KMP DM Item Provider] Error in subscription:", e);
                    }
                });

                setViewModel(vm);
                vmRef.current = vm;

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
                vmRef.current.onCleared();
            }
        };
    }, []);

    const safeState = state || {
        name: "",
        description: "",
        type: "Weapon",
        isLoading: isLoading, // Initial loading
        submissionError: error
    };

    return (
        <KmpDmItemCreatorContext.Provider value={{ viewModel: viewModel, state: safeState, isLoading: isLoading, error: error }}>
            {children}
        </KmpDmItemCreatorContext.Provider>
    );
}

export function useKmpDmItemCreator() {
    const context = useContext(KmpDmItemCreatorContext);
    if (context === undefined) {
        throw new Error("useKmpDmItemCreator must be used within a KmpDmItemCreatorProvider");
    }
    return context;
}
