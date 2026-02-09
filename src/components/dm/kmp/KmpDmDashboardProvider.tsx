"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
// @ts-ignore
// import { org } from "dnd-shared";

// Types aliases for cleaner code
type DmDashboardViewModel = any;
type DmDashboardState = any;

interface KmpDmDashboardContextType {
    viewModel: DmDashboardViewModel | null;
    state: DmDashboardState | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

const KmpDmDashboardContext = createContext<KmpDmDashboardContextType | undefined>(undefined);

export function KmpDmDashboardProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<DmDashboardState>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewModel, setViewModel] = useState<DmDashboardViewModel | null>(null);

    // We store the VM in a Ref to persist across renders without triggering re-renders itself
    const vmRef = useRef<DmDashboardViewModel>(null);

    const refresh = () => {
        if (vmRef.current) {
            console.log("Refreshing DM dashboard data...");
            vmRef.current.loadPlayers();
        }
    };

    useEffect(() => {
        let isMounted = true;
        let unsubscribe: (() => void) | undefined;

        const init = async () => {
            try {
                if (vmRef.current) return; // Already initialized

                console.log("Initializing KMP Shared Module (Apollo/GraphQL) for DM Dashboard...");
                setIsLoading(true);

                // Load ViewModel via SharedFactory (uses Apollo to fetch from GraphQL API)
                const dndShared = await import("dnd-shared");

                // Handle nested export structure
                const SharedFactory = dndShared.org?.dndcharacter?.shared?.SharedFactory
                    ?? dndShared.default?.org?.dndcharacter?.shared?.SharedFactory;

                if (!SharedFactory) {
                    console.error("SharedFactory not found. Keys:", Object.keys(dndShared));
                    throw new Error("SharedFactory could not be found in dnd-shared export.");
                }

                console.log(`Creating DmDashboardViewModel via SharedFactory`);
                const graphqlUrl = "/api/graphql";
                const vm = await SharedFactory.createDmDashboardViewModelWithUrl(graphqlUrl);

                // Subscribe to State
                unsubscribe = vm.watchState((newState: any) => {
                    try {
                        if (isMounted) {
                            setState(newState);
                            setIsLoading(newState.isLoading);
                            setError(newState.error);
                        }
                    } catch (e: any) {
                        console.error("[KMP DM Provider] Error in subscription:", e);
                    }
                });

                setViewModel(vm);
                vmRef.current = vm;

                // Load players immediately
                console.log(`Loading active players...`);
                vm.loadPlayers();

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
        players: [],
        isLoading: isLoading,
        error: error
    };

    return (
        <KmpDmDashboardContext.Provider value={{ viewModel: viewModel, state: safeState, isLoading: safeState.isLoading, error: safeState.error, refresh }}>
            {children}
        </KmpDmDashboardContext.Provider>
    );
}

export function useKmpDmDashboard() {
    const context = useContext(KmpDmDashboardContext);
    if (context === undefined) {
        throw new Error("useKmpDmDashboard must be used within a KmpDmDashboardProvider");
    }
    return context;
}
