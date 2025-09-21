"use client";

import { useEffect, useState } from "react";

import { Plus, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { templateApi, userTemplateApi, type UserTemplateDto, ApiError } from "@/lib/api";
import type { Template } from "@/types/template";

export default function MyTemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingChecklistFor, setEditingChecklistFor] = useState<Template | null>(null);
    const [userTpl, setUserTpl] = useState<UserTemplateDto | null>(null);
    const [checklistDraft, setChecklistDraft] = useState<Array<{ id: string; label: string }>>([]);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const all = await templateApi.getAll(true);
                setTemplates((all as Template[]).filter(t => t.isActive));
            } catch (e) {
                toast.error("Failed to load templates");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const generateId = () => Math.random().toString(36).slice(2);

    const openChecklistModal = async (tpl: Template) => {
        try {
            setEditingChecklistFor(tpl);
            try {
                const ut = await userTemplateApi.getForTemplate((tpl as any)._id as string);
                setUserTpl(ut);
                setChecklistDraft((ut.checklist || []).map(i => ({ id: i.id, label: i.label })));
            } catch (e) {
                if (e instanceof ApiError && e.status === 404) {
                    const created = await userTemplateApi.createForTemplate((tpl as any)._id as string, { checklist: [] });
                    setUserTpl(created);
                    setChecklistDraft([]);
                } else {
                    throw e;
                }
            }
        } catch (_) {
            toast.error("Failed to open checklist");
            setEditingChecklistFor(null);
        }
    };

    const persistChecklist = async () => {
        if (!userTpl) return;
        try {
            const hasInvalid = (checklistDraft || []).some(i => {
                const t = String(i.label || "").trim();
                return !t || t.toLowerCase() === 'new item';
            });
            if (hasInvalid) {
                toast.error("Please rename all items before saving.");
                return;
            }
            const normalized = checklistDraft.map((i, idx) => ({ id: i.id, label: i.label, order: idx }));
            const updated = await userTemplateApi.update(userTpl._id, { checklist: normalized });
            setUserTpl(updated);
            toast.success("Checklist saved");
            setEditingChecklistFor(null);
        } catch (_) {
            toast.error("Failed to save checklist");
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold">My Templates</h1>
                <p className="text-muted-foreground">Manage checklists for your templates. These will be applied to every report created from the template.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((tpl) => (
                    <Card key={(tpl as any)._id || tpl.id}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="truncate mr-2">{tpl.name}</CardTitle>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[220px]">
                                    <DropdownMenuItem onClick={() => openChecklistModal(tpl)}>Edit Checklist</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground line-clamp-3">{tpl.description || ""}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={!!editingChecklistFor} onOpenChange={(open) => { if (!open) { setEditingChecklistFor(null); } }}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Checklist</DialogTitle>
                        <DialogDescription>These items will be shown when creating a report for this template.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        {(checklistDraft || []).map((it, idx) => (
                            <div key={it.id} className="flex items-center gap-2">
                                <Input
                                    placeholder="New item"
                                    value={it.label}
                                    onFocus={() => {
                                        if (String(it.label || '').trim().toLowerCase() === 'new item') {
                                            const next = [...checklistDraft];
                                            next[idx] = { ...next[idx], label: '' };
                                            setChecklistDraft(next);
                                        }
                                    }}
                                    onChange={(e) => {
                                        const next = [...checklistDraft];
                                        next[idx] = { ...next[idx], label: e.target.value };
                                        setChecklistDraft(next);
                                    }}
                                />
                                <Button variant="ghost" size="icon" onClick={() => {
                                    const next = checklistDraft.filter(x => x.id !== it.id);
                                    setChecklistDraft(next);
                                }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => setChecklistDraft([...(checklistDraft || []), { id: generateId(), label: '' }])}><Plus className="h-4 w-4 mr-2" />Add item</Button>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingChecklistFor(null)}>Close</Button>
                        <Button onClick={persistChecklist}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

