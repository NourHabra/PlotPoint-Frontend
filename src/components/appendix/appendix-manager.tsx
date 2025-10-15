"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Trash2, GripVertical, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { reportApi } from "@/lib/api";

type AppendixItem = {
    _id: string;
    kind: "image" | "pdf";
    originalName?: string;
    originalPath?: string;
    thumbPath?: string;
    pageImages?: string[];
    pageCount?: number;
    order: number;
};

function buildUploadsUrl(u?: string): string | undefined {
    if (!u) return undefined;
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    if (u.startsWith('/')) return base + u;
    return base + '/' + u;
}

export default function AppendixManager({ reportId }: { reportId: string | null }) {
    const [items, setItems] = useState<AppendixItem[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [savingOrder, setSavingOrder] = useState(false);

    const sortedItems = useMemo(() => items.slice().sort((a, b) => (a.order || 0) - (b.order || 0)), [items]);

    const load = async () => {
        if (!reportId) return;
        try {
            setLoading(true);
            const list = await (reportApi.listAppendix as any)(reportId);
            setItems(list || []);
        } catch (_) {
            // non-blocking
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [reportId]);

    const onFilesSelected = async (files: FileList | null) => {
        if (!reportId || !files || files.length === 0) return;
        try {
            const arr = Array.from(files);
            await (reportApi.uploadAppendix as any)(reportId, arr);
            toast.success('Uploaded');
            await load();
        } catch (e) {
            toast.error('Upload failed');
        } finally {
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    // Native HTML5 drag-and-drop (no extra dependencies)
    const dragIdRef = useRef<string | null>(null);
    const onDragStart = (id: string) => { dragIdRef.current = id; };
    const onDragOver = (e: React.DragEvent<HTMLLIElement>) => { e.preventDefault(); };
    const onDrop = async (targetId: string) => {
        const activeId = dragIdRef.current;
        dragIdRef.current = null;
        if (!activeId || activeId === targetId) return;
        const current = sortedItems;
        const oldIndex = current.findIndex((x) => String(x._id) === String(activeId));
        const newIndex = current.findIndex((x) => String(x._id) === String(targetId));
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = current.slice();
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);
        const withOrders = reordered.map((it, i) => ({ ...it, order: i }));
        setItems(withOrders);
        // Auto-save order on drop
        if (!reportId) return;
        try {
            const payload = withOrders.map((it) => ({ itemId: String(it._id), order: it.order }));
            await (reportApi.reorderAppendix as any)(reportId, payload);
            // no toast to avoid noise; silently succeed
        } catch (_) {
            toast.error('Failed to save order');
        }
    };

    const saveOrder = async () => {
        if (!reportId) return;
        try {
            setSavingOrder(true);
            const payload = sortedItems.map((it, i) => ({ itemId: String(it._id), order: i }));
            await (reportApi.reorderAppendix as any)(reportId, payload);
            toast.success('Order saved');
            await load();
        } catch (_) {
            toast.error('Failed to save order');
        } finally {
            setSavingOrder(false);
        }
    };

    const remove = async (id: string) => {
        if (!reportId) return;
        try {
            await (reportApi.deleteAppendixItem as any)(reportId, id);
            toast.success('Deleted');
            await load();
        } catch (_) {
            toast.error('Delete failed');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Appendix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                    <Input ref={inputRef} type="file" multiple accept="image/*,application/pdf" onChange={(e) => onFilesSelected(e.target.files)} />
                    <Button variant="outline" onClick={() => inputRef.current?.click()}><Upload className="h-4 w-4 mr-2" />Upload</Button>
                </div>
                <ol className="space-y-2 list-none">
                    {sortedItems.map((it, idx) => (
                        <li key={String(it._id)}
                            draggable
                            onDragStart={() => onDragStart(String(it._id))}
                            onDragOver={onDragOver}
                            onDrop={() => onDrop(String(it._id))}
                            className="border rounded-md p-2 flex gap-3">
                            <div className="flex flex-row items-center justify-center w-10 shrink-0">
                                <GripVertical className="h-4 w-4 text-muted-foreground mr-2" />
                                <span className="text-lg text-muted-foreground">{idx + 1}</span>
                            </div>
                            <div className="w-16 h-16 bg-muted rounded overflow-hidden flex items-center justify-center">
                                {(() => {
                                    const url = buildUploadsUrl(it.thumbPath || it.originalPath);
                                    if (url) return (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={url} className="object-cover w-full h-full" alt={it.originalName || it.kind} />
                                    );
                                    return <div className="text-xs text-muted-foreground">No preview</div>;
                                })()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{it.originalName || (it.kind === 'pdf' ? 'PDF' : 'Image')}</div>
                                <div className="text-xs text-muted-foreground">{it.kind.toUpperCase()} {it.pageCount ? `(${it.pageCount} ${it.pageCount === 1 ? 'Page' : 'Pages'})` : ''}</div>
                                <div className="flex items-center gap-2 mt-2">
                                    {/* Actions */}
                                    <button type="button" className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-muted text-destructive" onClick={() => remove(String(it._id))}>
                                        <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
                {sortedItems.length === 0 && (
                    <div className="text-sm text-muted-foreground">No appendix items yet. Upload images or PDFs; PDFs will be converted page-by-page.</div>
                )}
            </CardContent>
        </Card>
    );
}
