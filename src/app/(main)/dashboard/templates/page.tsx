"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Plus, Search, Filter, MoreHorizontal, Edit, Copy, Trash2, Eye, FileText, Loader2, RotateCcw, FileEdit, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { templateApi, ApiError } from "@/lib/api";
import { Template } from "@/types/template";

export default function TemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [draftVariables, setDraftVariables] = useState<Array<any>>([]);
    const [draftGroups, setDraftGroups] = useState<Array<any>>([]);
    const [savingEdit, setSavingEdit] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupDescription, setNewGroupDescription] = useState("");

    const openEdit = (tpl: Template) => {
        setEditingTemplate(tpl);
        setDraftVariables([...(tpl.variables || []).map((v: any) => ({ ...v }))]);
        setDraftGroups([...(tpl.variableGroups || []).map((g: any) => ({ ...g }))]);
    };

    const TYPE_OPTIONS = ["text", "kml", "image", "select", "date"] as const; // "calculated" removed for security

    const persistEdit = async () => {
        if (!editingTemplate) return;
        try {
            setSavingEdit(true);
            const id = (editingTemplate as any)._id || (editingTemplate as any).id;
            await templateApi.update(String(id), {
                variables: draftVariables,
                variableGroups: draftGroups,
            });
            toast.success("Template updated");
            setEditingTemplate(null);
            setDraftVariables([]);
            setDraftGroups([]);
            loadTemplates();
        } catch (e) {
            if (e instanceof ApiError) toast.error(e.message); else toast.error("Update failed");
        } finally {
            setSavingEdit(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await templateApi.getAll(true); // Always include inactive templates
            setTemplates(data);
        } catch (error) {
            if (error instanceof ApiError) {
                toast.error(`Failed to load templates: ${error.message}`);
            } else {
                toast.error("Failed to load templates");
            }
            console.error("Error loading templates:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        try {
            await templateApi.delete(templateId);
            toast.success("Template deleted successfully");
            loadTemplates(); // Reload the list
        } catch (error) {
            if (error instanceof ApiError) {
                toast.error(`Failed to delete template: ${error.message}`);
            } else {
                toast.error("Failed to delete template");
            }
            console.error("Error deleting template:", error);
        }
    };

    const handleReactivateTemplate = async (templateId: string) => {
        try {
            await templateApi.reactivate(templateId);
            toast.success("Template reactivated successfully");
            loadTemplates(); // Reload the list
        } catch (error) {
            if (error instanceof ApiError) {
                toast.error(`Failed to reactivate template: ${error.message}`);
            } else {
                toast.error("Failed to reactivate template");
            }
            console.error("Error reactivating template:", error);
        }
    };

    const getTemplateStats = (template: Template) => {
        // Prefer imported variables if present
        if (template.variables && template.variables.length > 0) {
            return { sections: template.sections?.length || 0, textBlocks: 0, variables: template.variables.length };
        }
        const sections = template.sections?.length || 0;
        let textBlocks = 0;
        let variables = 0;

        (template.sections || []).forEach(section => {
            section.content.forEach(block => {
                if (block.type === 'text') textBlocks++;
                else if (block.type === 'variable' || block.type === 'kml_variable') variables++;
            });
        });

        return { sections, textBlocks, variables };
    };

    const filteredTemplates = templates.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeTemplates = filteredTemplates.filter(template => template.isActive);
    const inactiveTemplates = filteredTemplates.filter(template => !template.isActive);
    return (
        <div className="@container/main flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
                <p className="text-muted-foreground">
                    Manage your report templates and create new ones.
                </p>
            </div>

            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            className="pl-8 w-[300px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/templates/import">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Template
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Loading templates...</span>
                    </div>
                </div>
            )}

            {/* Templates Grid */}
            {!loading && (
                <div className="space-y-8">
                    {/* Active Templates */}
                    {activeTemplates.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Active Templates</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {activeTemplates.map((template) => {
                                    const stats = getTemplateStats(template);
                                    return (
                                        <Card key={template._id || template.id} className="group hover:shadow-md transition-shadow h-full flex flex-col">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <CardTitle className="text-lg">{template.name}</CardTitle>
                                                        <CardDescription className="line-clamp-2">
                                                            {template.description}
                                                        </CardDescription>
                                                        <div>
                                                            <Badge variant="secondary" className="text-xs">{stats.variables} variables</Badge>
                                                        </div>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div>
                                                                            <DropdownMenuItem disabled>
                                                                                <Eye className="h-4 w-4 mr-2" />
                                                                                View
                                                                            </DropdownMenuItem>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Coming soon</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div>
                                                                            <DropdownMenuItem onClick={() => openEdit(template)}>
                                                                                <Edit className="h-4 w-4 mr-2" />
                                                                                Edit
                                                                            </DropdownMenuItem>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Coming soon</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div>
                                                                            <DropdownMenuItem disabled>
                                                                                <Copy className="h-4 w-4 mr-2" />
                                                                                Duplicate
                                                                            </DropdownMenuItem>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Coming soon</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => handleDeleteTemplate(String(template._id || template.id))}
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4 mt-auto">

                                                <Separator />

                                                {/* Footer */}
                                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                    <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
                                                    <div className="flex gap-2">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div>
                                                                        <Button variant="outline" size="sm" disabled>
                                                                            <Eye className="h-3 w-3 mr-1" />
                                                                            Preview
                                                                        </Button>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Coming soon</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Inactive Templates */}
                    {inactiveTemplates.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Inactive Templates</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {inactiveTemplates.map((template) => {
                                    const stats = getTemplateStats(template);
                                    return (
                                        <Card key={template._id || template.id} className="group hover:shadow-md transition-shadow opacity-75 h-full flex flex-col">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <CardTitle className="text-lg">{template.name}</CardTitle>
                                                        <CardDescription className="line-clamp-2">
                                                            {template.description}
                                                        </CardDescription>
                                                        <div>
                                                            <Badge variant="secondary" className="text-xs">{stats.variables} variables</Badge>
                                                        </div>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem>
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                View
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openEdit(template)}>
                                                                <Edit className="h-4 w-4 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem>
                                                                <Copy className="h-4 w-4 mr-2" />
                                                                Duplicate
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleReactivateTemplate(String(template._id || template.id))}
                                                            >
                                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                                Reactivate
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4 mt-auto">
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="destructive">Inactive</Badge>
                                                </div>

                                                <Separator />

                                                {/* Footer */}
                                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                    <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
                                                    <div className="flex gap-2">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div>
                                                                        <Button variant="outline" size="sm" disabled>
                                                                            <Eye className="h-3 w-3 mr-1" />
                                                                            Preview
                                                                        </Button>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Coming soon</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleReactivateTemplate(String(template._id || template.id))}
                                                        >
                                                            <RotateCcw className="h-3 w-3 mr-1" />
                                                            Reactivate
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <VariableEditorModal
                open={!!editingTemplate}
                onOpenChange={(o) => { if (!o) { setEditingTemplate(null); setDraftVariables([]); setDraftGroups([]); } }}
                variables={draftVariables}
                setVariables={setDraftVariables as any}
                groups={draftGroups}
                setGroups={setDraftGroups as any}
                onSave={persistEdit}
                saving={savingEdit}
            />

            {/* Empty State */}
            {!loading && filteredTemplates.length === 0 && (
                <Card className="text-center py-12">
                    <CardContent>
                        <div className="space-y-4">
                            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                                <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">
                                    {searchTerm ? 'No templates found' : 'No templates yet'}
                                </h3>
                                <p className="text-muted-foreground">
                                    {searchTerm
                                        ? 'Try adjusting your search terms or create a new template.'
                                        : 'Create your first template to get started with report generation.'
                                    }
                                </p>
                            </div>
                            <Link href="/dashboard/templates/import">
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Template
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// Edit Template Modal
// Placed at bottom to keep component structure simple
function VariableEditorModal({
    open,
    onOpenChange,
    variables,
    setVariables,
    groups,
    setGroups,
    onSave,
    saving,
}: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    variables: Array<any>;
    setVariables: (updater: any) => void;
    groups: Array<any>;
    setGroups: (updater: any) => void;
    onSave: () => void;
    saving: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[98vw] max-w-[1400px]">
                <DialogHeader>
                    <DialogTitle>Edit Template Variables</DialogTitle>
                    <DialogDescription>Update variable descriptions, types, sections, and required flags.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-[70vh] overflow-auto pr-1">
                    {/* Sections editor with reorder/delete/add */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">Sections</h3>
                            <Button type="button" variant="outline" size="sm" onClick={() => {
                                setGroups((prev: any[]) => [...prev, { id: Math.random().toString(36).slice(2), name: "", description: "", order: (prev?.length || 0) }]);
                            }}>Add Section</Button>
                        </div>
                        <div className="space-y-2">
                            {groups.map((g: any, idx: number) => (
                                <div key={g.id || idx} className="flex items-center gap-2">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <Input value={g.name || ""} onChange={(e) => {
                                            const name = e.target.value;
                                            setGroups((prev: any[]) => prev.map((x, i) => i === idx ? { ...x, name } : x));
                                        }} placeholder="Section name" />
                                        <Input value={g.description || ""} onChange={(e) => {
                                            const description = e.target.value;
                                            setGroups((prev: any[]) => prev.map((x, i) => i === idx ? { ...x, description } : x));
                                        }} placeholder="Description (optional)" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={idx === 0} onClick={() => {
                                            setGroups((prev: any[]) => {
                                                if (idx === 0) return prev;
                                                const next = [...prev];
                                                const tmp = next[idx - 1];
                                                next[idx - 1] = next[idx];
                                                next[idx] = tmp;
                                                return next;
                                            });
                                        }}>
                                            <ChevronUp className="h-4 w-4" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={idx === groups.length - 1} onClick={() => {
                                            setGroups((prev: any[]) => {
                                                if (idx >= prev.length - 1) return prev;
                                                const next = [...prev];
                                                const tmp = next[idx + 1];
                                                next[idx + 1] = next[idx];
                                                next[idx] = tmp;
                                                return next;
                                            });
                                        }}>
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" aria-label="Delete section" onClick={() => {
                                            setGroups((prev: any[]) => prev.filter((_, i) => i !== idx));
                                        }}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Variables list */}
                    <div className="space-y-3">
                        {variables.length === 0 && (
                            <p className="text-sm text-muted-foreground">No variables found.</p>
                        )}
                        {variables.map((v: any, idx: number) => (
                            <div key={v.id || idx} className="border rounded-md p-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>Name</Label>
                                        <Input value={v.name || ""} readOnly disabled />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Type</Label>
                                        <Input value={v.type} readOnly disabled />
                                    </div>
                                    {/* No longer allowing type changes; KML field picker removed */}
                                    <div className="space-y-1">
                                        <Label>Description</Label>
                                        <Input value={v.description || ""} onChange={(e) => {
                                            const description = e.target.value;
                                            setVariables((prev: any[]) => prev.map((x, i) => i === idx ? { ...x, description } : x));
                                        }} placeholder="Short helper text" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Section</Label>
                                        <Select value={v.groupId || "__none__"} onValueChange={(val) => {
                                            setVariables((prev: any[]) => prev.map((x, i) => i === idx ? { ...x, groupId: val === "__none__" ? undefined : val } : x));
                                        }}>
                                            <SelectTrigger><SelectValue placeholder="No section" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">No section</SelectItem>
                                                {groups.map((g: any) => (
                                                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox id={`req-${v.id || idx}`} checked={!!v.isRequired} onCheckedChange={(checked) => {
                                            setVariables((prev: any[]) => prev.map((x, i) => i === idx ? { ...x, isRequired: !!checked } : x));
                                        }} />
                                        <Label htmlFor={`req-${v.id || idx}`}>Required</Label>
                                    </div>
                                    {v.type === 'kml' && v.kmlField && (
                                        <div className="text-xs text-muted-foreground">KML Field: {v.kmlField}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}