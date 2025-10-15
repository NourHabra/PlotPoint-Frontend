"use client";

import { useEffect, useState } from "react";

import { Megaphone, MousePointer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { changelogApi } from "@/lib/api";

export function ClientSideUpdates() {
    const [open, setOpen] = useState(false);
    const [changes, setChanges] = useState<any[]>([]);
    const [hasNew, setHasNew] = useState(false);

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const list = await changelogApi.list();
                setChanges(Array.isArray(list) ? list : []);
            } catch {
                setChanges([]);
            }
        })();
    }, [open]);

    // Prefetch on mount to show hint if updates exist
    useEffect(() => {
        (async () => {
            try {
                const list = await changelogApi.list();
                setHasNew(Array.isArray(list) && list.length > 0);
            } catch {
                setHasNew(false);
            }
        })();
    }, []);

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" aria-label="Updates" className="relative">
                                <Megaphone className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{hasNew ? 'Updates — New features available' : 'Updates'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end" className="w-96 p-2">
                <div className="max-h-[60vh] overflow-y-auto space-y-3">
                    {changes.map((it) => (
                        <div key={String(it._id)} className="border rounded-md p-2">
                            <div className="flex items-center justify-between">
                                <div className="font-medium text-sm">{it.title}</div>
                                <div className="text-xs text-muted-foreground">{new Date(it.date).toLocaleDateString()}</div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{it.description}</div>
                        </div>
                    ))}
                    {changes.length === 0 && (
                        <div className="text-sm text-muted-foreground px-1">No updates yet.</div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

