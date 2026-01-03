"use client"

import * as React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"



// Rewriting to work with the Composition Pattern used in AddContentDialog
interface DialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}

const DialogContext = React.createContext<{
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}>({});

const DialogRoot = ({ open, onOpenChange, children }: DialogProps) => {
    return (
        <DialogContext.Provider value={{ open, onOpenChange }}>
            {/* If we don't have Radix, managing 'open' state here is tricky if uncontrolled. 
                 But AddContentDialog controls it via props. */}
            {children}
        </DialogContext.Provider>
    )
}

const DialogTrigger = ({ asChild, children }: { asChild?: boolean, children: React.ReactNode }) => {
    const { onOpenChange } = React.useContext(DialogContext);
    // Simple clone if valid element
    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<any>;
        return React.cloneElement(child, {
            onClick: (e: any) => {
                child.props.onClick?.(e);
                onOpenChange?.(true);
            }
        });
    }
    return <button onClick={() => onOpenChange?.(true)}>{children}</button>;
}

const DialogContent = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    const { open, onOpenChange } = React.useContext(DialogContext);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
                onClick={() => onOpenChange?.(false)}
            />
            <div className={cn(
                "fixed z-50 grid w-full gap-4 border bg-white p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 sm:rounded-lg md:w-full dark:bg-slate-950 dark:border-slate-800",
                className
            )}>
                {children}
                <button
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                    onClick={() => onOpenChange?.(false)}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </div>
    );
}

const DialogHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>
        {children}
    </div>
)

const DialogTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
        {children}
    </div>
)

const DialogDescription = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <p className={cn("text-sm text-slate-500 dark:text-slate-400", className)}>
        {children}
    </p>
)

const DialogFooter = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>
        {children}
    </div>
)

export { DialogRoot as Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
