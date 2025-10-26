"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Save, Trash2, ChevronUp, ChevronDown, Pencil } from "lucide-react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { templateApi, ApiError } from "@/lib/api";
import { KML_FIELD_OPTIONS } from "@/lib/kml-constants";

type FieldType = "text" | "kml" | "image" | "select" | "date";

interface VariableDef {
    id: string;
    name: string;
    type: FieldType;
    sourceText: string;
    kmlField?: (typeof KML_FIELD_OPTIONS)[number]["value"];
    options?: string[];
    description?: string;
    isRequired?: boolean;
    textTemplates?: string[];
    groupId?: string;
}

function generateId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return Math.random().toString(36).slice(2);
}

export default function ImportTemplatePage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isTokenized, setIsTokenized] = useState(false);
    const [templateName, setTemplateName] = useState("");
    const [templateDescription, setTemplateDescription] = useState("");
    const [requiresKml, setRequiresKml] = useState(false);
    const [docFile, setDocFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [serverUploadedPath, setServerUploadedPath] = useState<string>("");
    const [isImporting, setIsImporting] = useState(false);

    const [variables, setVariables] = useState<VariableDef[]>([]);
    const [variableGroups, setVariableGroups] = useState<{ id: string; name: string; description?: string }[]>([]);

    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupDescription, setNewGroupDescription] = useState("");
    const [groupAssignForVarId, setGroupAssignForVarId] = useState<string | null>(null);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editGroupName, setEditGroupName] = useState("");
    const [editGroupDescription, setEditGroupDescription] = useState("");
    const [confirmReAnalyze, setConfirmReAnalyze] = useState(false);
    const [confirmDeleteVarId, setConfirmDeleteVarId] = useState<string | null>(null);
    const [duplicateForVarId, setDuplicateForVarId] = useState<string | null>(null);
    const [duplicateTargetGroup, setDuplicateTargetGroup] = useState<string | "__none__">("__none__");

    const duplicateVariable = (id: string, targetGroupId?: string) => {
        setVariables(prev => {
            const src = prev.find(v => v.id === id);
            if (!src) return prev;
            const copy: VariableDef = {
                ...src,
                id: generateId(),
                groupId: targetGroupId,
            };
            return [...prev, copy];
        });
    };

    const moveGroup = (groupId: string, direction: -1 | 1) => {
        setVariableGroups(prev => {
            const idx = prev.findIndex(g => g.id === groupId);
            if (idx === -1) return prev;
            const nextIdx = idx + direction;
            if (nextIdx < 0 || nextIdx >= prev.length) return prev;
            const next = [...prev];
            const temp = next[idx];
            next[idx] = next[nextIdx];
            next[nextIdx] = temp;
            return next;
        });
    };

    const handleFileChange = async (file: File | null) => {
        setDocFile(file);
        setVariables([]);
        setServerUploadedPath("");
        if (!file) return;
        if (!isTokenized) return;
                try {
                    setAnalyzing(true);
                    const result = await templateApi.analyzeDocx(file);
                    setServerUploadedPath(result.uploadedPath);
            const seeded: VariableDef[] = (result.variables || []).map((t, idx) => ({
                        id: generateId(),
                        name: t.name,
                        type: "text",
                        sourceText: `{{${t.name}}}`,
                        isRequired: false,
                        textTemplates: [],
                    }));
                    setVariables(seeded);
                    toast.success(`Found ${seeded.length} variables in tokenized file`);
                } catch (e) {
            if (e instanceof ApiError) toast.error(e.message); else toast.error("Analyze failed");
                } finally {
                    setAnalyzing(false);
        }
    };

    const updateVariableById = (id: string, patch: Partial<VariableDef>) => {
        setVariables(prev => {
            const current = prev.find(v => v.id === id);
            if (!current) return prev;
            const targetType = (patch.type ?? current.type) as FieldType;
            return prev.map(v => {
                // propagate all changes except groupId across same-name variables
                if (v.name === current.name) {
                    const normalized: Partial<VariableDef> = { ...patch };
                    if (targetType === "kml") normalized.isRequired = false;
                    // keep each occurrence section separate
                    if (patch.groupId === undefined) {
                        // not changing section: apply to all with same name
                        return { ...v, ...normalized };
                    } else {
                        // changing section: only apply groupId to the targeted id
                        if (v.id === id) return { ...v, groupId: patch.groupId } as VariableDef;
                        return v;
                    }
                }
                return v;
            });
        });
    };

    const removeVariable = (id: string) => {
        setVariables(prev => prev.filter(v => v.id !== id));
    };

    const handleSave = async () => {
        if (!templateName) return toast("Enter a template name");
        if (!docFile) {
            toast("Upload a DOCX file");
            setStep(1);
            return;
        }
        try {
            setIsImporting(true);
            if (isTokenized) {
                if (!serverUploadedPath) return toast("Analyze the tokenized DOCX first");
                await templateApi.finalizeImport({
                    name: templateName,
                    description: templateDescription,
                    requiresKml,
                    variableGroups,
                    variables,
                    sourceDocxPath: serverUploadedPath,
                });
            } else {
                await templateApi.importDocx(templateName, templateDescription, docFile, variables, requiresKml, variableGroups);
            }
            toast.success("Template imported successfully");
            router.push("/dashboard/templates");
        } catch (error) {
            if (error instanceof ApiError) toast.error(error.message); else toast.error("Import failed");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="@container/main flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Create New Template</h1>
                <p className="text-muted-foreground">{isTokenized ? "Upload an already tokenized .docx ({{Variable Name}}) and configure variables." : "Upload a .docx and configure variables."}</p>
            </div>

            {step === 1 && (
                <div className="grid grid-cols-1 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Template details</CardTitle>
                            <CardDescription>Name your template, choose mode, and upload the Word file</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="template-name">Template name</Label>
                                    <Input id="template-name" placeholder="e.g., Property Valuation Report" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="template-description">Description</Label>
                                    <Input id="template-description" placeholder="What is this template for?" value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} />
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <Checkbox id="is-tokenized" checked={isTokenized} onCheckedChange={(v) => setIsTokenized(Boolean(v))} />
                                    <Label htmlFor="is-tokenized">Already tokenized (uses {'{{'} Variable Name {'}}'})</Label>
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <Checkbox id="requires-kml" checked={requiresKml} onCheckedChange={(v) => setRequiresKml(Boolean(v))} />
                                    <Label htmlFor="requires-kml">This template requires a KML file upload</Label>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="docx">Word file (.docx)</Label>
                                    <div className="flex gap-2">
                                        <Input id="docx" type="file" accept=".docx" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
                                    </div>
                                    {isTokenized && analyzing && (
                                        <p className="text-xs text-muted-foreground">Analyzing tokens…</p>
                                    )}
                                    {isTokenized && serverUploadedPath && (
                                        <p className="text-xs text-muted-foreground">Analyzed and uploaded to server</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={() => setStep(2)} disabled={!templateName || !docFile}>Continue</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {step === 2 && (
                <div className="grid grid-cols-1 gap-6">
                        <Card>
                            <CardHeader>
                            <CardTitle>Variables</CardTitle>
                            <CardDescription>Edit each variable inline. Use sections to organize.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                                <div className="flex items-center gap-2">
                                    {isTokenized && docFile && (
                                        <Button type="button" variant="outline" disabled={analyzing} onClick={() => setConfirmReAnalyze(true)}>Re-analyze</Button>
                                    )}
                                    {/* <Button type="button" onClick={() => {
                    const id = generateId();
                    setVariables(prev => ([...prev, { id, name: "", type: "text", sourceText: "", isRequired: false, textTemplates: [] }]));
                  }}>Add variable</Button> */}
                                    <Button onClick={() => setStep(3)}>Next</Button>
                                </div>
                                                </div>

                            {variables.length === 0 && (
                                <p className="text-sm text-muted-foreground">No variables yet. Use Analyze or Add variable.</p>
                            )}

                            <div className="space-y-6">
                                {variableGroups.map((g, idx) => {
                                    const inGroup = variables.filter(v => v.groupId === g.id);
                                    return (
                                        <div key={g.id} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-col ">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => moveGroup(g.id, -1)}>
                                                                        <ChevronUp className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Move section up</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="sm" disabled={idx === variableGroups.length - 1} onClick={() => moveGroup(g.id, 1)}>
                                                                        <ChevronDown className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Move section down</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                            </div>
                                                    <div className="group flex items-center gap-2">
                                                        <div className="flex flex-col gap-1">
                                                            <h3 className="text-base font-semibold">{g.name}</h3>
                                                            {g.description && <span className="text-xs text-muted-foreground">{g.description}</span>}
                                        </div>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        onClick={() => { setEditingGroupId(g.id); setEditGroupName(g.name || ""); setEditGroupDescription(g.description || ""); }}
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Edit section</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        </div>
                                                    </div>
                                                <div />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {inGroup.length === 0 && (
                                                    <div className="text-sm text-muted-foreground col-span-full">No variables in this section.</div>
                                                )}
                                                {inGroup.map((v, i) => (
                                                    <div key={v.id} className="rounded-md border p-4 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                {/* <Badge variant="outline">{v.type}</Badge> */}
                                                                <span className="font-medium">{v.name || "(unnamed)"}</span>
                                        </div>
                                                            <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteVarId(v.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                    </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                                                <Select value={v.type} onValueChange={(val: FieldType) => updateVariableById(v.id, { type: val })}>
                                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="text">Text</SelectItem>
                                                    <SelectItem value="kml">KML Value</SelectItem>
                                                    <SelectItem value="image">Image</SelectItem>
                                                    <SelectItem value="select">Dropdown</SelectItem>
                                                    <SelectItem value="date">Date</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                                            {v.type === 'kml' && (
                                            <div className="space-y-2">
                                                <Label>KML field</Label>
                                                                    <Select value={v.kmlField} onValueChange={(val) => updateVariableById(v.id, { kmlField: val as any })}>
                                                    <SelectTrigger><SelectValue placeholder="Choose KML field" /></SelectTrigger>
                                                    <SelectContent>
                                                        {KML_FIELD_OPTIONS.map(o => (
                                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                                            <div className="space-y-2 md:col-span-2">
                                                                <Label>Section</Label>
                                                                <div className="flex gap-2">
                                                                    <Select value={v.groupId ?? '__none__'} onValueChange={(val: string) => updateVariableById(v.id, { groupId: val === '__none__' ? undefined : val })}>
                                                                        <SelectTrigger><SelectValue placeholder="No section" /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="__none__">No section</SelectItem>
                                                                            {variableGroups.map(gg => (
                                                                                <SelectItem key={gg.id} value={gg.id}>{gg.name}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <Button type="button" variant="outline" onClick={() => { setGroupAssignForVarId(v.id); setIsGroupModalOpen(true); }}>New</Button>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2 md:col-span-2">
                                                                <Label htmlFor={`desc-${v.id}`}>Description (optional)</Label>
                                                                <Input id={`desc-${v.id}`} placeholder="Short helper text for this variable" value={v.description ?? ''}
                                                                    onChange={(e) => updateVariableById(v.id, { description: e.target.value as any })} />
                                                            </div>

                                                            <div className="flex items-center gap-2 md:col-span-2">
                                                                <Checkbox id={`req-${v.id}`} checked={!!v.isRequired} onCheckedChange={(val) => updateVariableById(v.id, { isRequired: Boolean(val) })} />
                                                                <Label htmlFor={`req-${v.id}`}>Required</Label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                {variables.some(v => !v.groupId) && (
                                    <div className="space-y-3">
                                        <h3 className="text-base font-semibold">No section</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {variables.filter(v => !v.groupId).map((v) => (
                                                <div key={v.id} className="rounded-md border p-4 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {/* <Badge variant="outline">{v.type}</Badge> */}
                                                            <span className="font-medium">{v.name || "(unnamed)"}</span>
                                                        </div>
                                                        <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteVarId(v.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                                            <Label>Type</Label>
                                                            <Select value={v.type} onValueChange={(val: FieldType) => updateVariableById(v.id, { type: val })}>
                                                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="text">Text</SelectItem>
                                                                    <SelectItem value="kml">KML Value</SelectItem>
                                                                    <SelectItem value="image">Image</SelectItem>
                                                                    <SelectItem value="select">Dropdown</SelectItem>
                                                                    <SelectItem value="date">Date</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                        </div>
                                                        {v.type === 'kml' && (
                                        <div className="space-y-2">
                                                                <Label>KML field</Label>
                                                                <Select value={v.kmlField} onValueChange={(val) => updateVariableById(v.id, { kmlField: val as any })}>
                                                                    <SelectTrigger><SelectValue placeholder="Choose KML field" /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {KML_FIELD_OPTIONS.map(o => (
                                                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}
                                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Section</Label>
                                            <div className="flex gap-2">
                                                                <Select value={v.groupId ?? '__none__'} onValueChange={(val: string) => updateVariableById(v.id, { groupId: val === '__none__' ? undefined : val })}>
                                                                    <SelectTrigger><SelectValue placeholder="No section" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__none__">No section</SelectItem>
                                                                        {variableGroups.map(gg => (
                                                                            <SelectItem key={gg.id} value={gg.id}>{gg.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                                <Button type="button" variant="outline" onClick={() => { setGroupAssignForVarId(v.id); setIsGroupModalOpen(true); }}>New</Button>
                                            </div>
                                                        </div>
                                                        <div className="space-y-2 md:col-span-2">
                                                            <Label htmlFor={`desc-${v.id}`}>Description (optional)</Label>
                                                            <Input id={`desc-${v.id}`} placeholder="Short helper text for this variable" value={v.description ?? ''}
                                                                onChange={(e) => updateVariableById(v.id, { description: e.target.value as any })} />
                                                        </div>
                                                        <div className="flex items-center gap-2 md:col-span-2">
                                                            <Checkbox id={`req-${v.id}`} checked={!!v.isRequired} onCheckedChange={(val) => updateVariableById(v.id, { isRequired: Boolean(val) })} />
                                                            <Label htmlFor={`req-${v.id}`}>Required</Label>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                        </div>

                            <Dialog open={isGroupModalOpen} onOpenChange={(open) => { setIsGroupModalOpen(open); if (!open) setGroupAssignForVarId(null); }}>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Create section</DialogTitle>
                                                    <DialogDescription>Group related variables under a named section.</DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-3 py-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="new-group-name">Name</Label>
                                                        <Input id="new-group-name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g., Property Information" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="new-group-desc">Description (optional)</Label>
                                                        <Input id="new-group-desc" value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)} placeholder="Brief description" />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                        <Button variant="outline" onClick={() => { setIsGroupModalOpen(false); setGroupAssignForVarId(null); }}>Cancel</Button>
                                                    <Button onClick={() => {
                                                        const name = newGroupName.trim();
                                                        if (!name) { toast("Enter section name"); return; }
                                                        const id = generateId();
                                                        const description = newGroupDescription.trim() || undefined;
                                                        setVariableGroups(prev => [...prev, { id, name, description }]);
                                            if (groupAssignForVarId) updateVariableById(groupAssignForVarId, { groupId: id });
                                                        setIsGroupModalOpen(false);
                                            setGroupAssignForVarId(null);
                                                        setNewGroupName("");
                                                        setNewGroupDescription("");
                                                    }}>Create</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                            </CardContent>
                        </Card>
                </div>
            )}

            {step === 3 && (
                <div className="grid grid-cols-1 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Review variables</CardTitle>
                            <CardDescription>Confirm the variables to include in this template</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {variables.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No variables added yet. Go back to Step 2 to add variables.</p>
                            ) : (
                                <div className="space-y-3">
                                    {variables.map(v => (
                                        <div key={v.id} className="rounded-md border p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{v.name || '(unnamed)'}</span>
                                                        <Badge variant="outline">{v.type}</Badge>
                                                        {v.isRequired && <Badge variant="destructive">Required</Badge>}
                                                    </div>
                                                    {v.description && (
                                                        <p className="text-xs text-muted-foreground">{v.description}</p>
                                                    )}
                                                    {v.sourceText && (
                                                        <p className="text-xs text-muted-foreground">Source: {v.sourceText}</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="secondary" onClick={() => { setStep(2); }}>Edit</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => removeVariable(v.id)}>Delete</Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between pt-2">
                                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                                <Button onClick={handleSave} disabled={isImporting}>
                                    <Save className="h-4 w-4 mr-2" /> {isImporting ? 'Creating…' : 'Create Template'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Edit Section Modal */}
            <Dialog open={!!editingGroupId} onOpenChange={(open) => { if (!open) { setEditingGroupId(null); setEditGroupName(""); setEditGroupDescription(""); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit section</DialogTitle>
                        <DialogDescription>Update the section name and description.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit-group-name">Name</Label>
                            <Input id="edit-group-name" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} placeholder="Section name" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-group-desc">Description (optional)</Label>
                            <Input id="edit-group-desc" value={editGroupDescription} onChange={(e) => setEditGroupDescription(e.target.value)} placeholder="Brief description" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditingGroupId(null); setEditGroupName(""); setEditGroupDescription(""); }}>Cancel</Button>
                        <Button onClick={() => {
                            const name = (editGroupName || "").trim();
                            if (!name) { toast("Enter section name"); return; }
                            setVariableGroups(prev => prev.map(g => g.id === editingGroupId ? { ...g, name, description: (editGroupDescription || "").trim() || undefined } : g));
                            setEditingGroupId(null);
                            setEditGroupName("");
                            setEditGroupDescription("");
                        }}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Re-analyze */}
            <AlertDialog open={confirmReAnalyze} onOpenChange={setConfirmReAnalyze}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Re-analyze tokenized DOCX?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will replace the current variables with those found in the uploaded file. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmReAnalyze(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (!docFile) { setConfirmReAnalyze(false); return; }
                                try {
                                    setAnalyzing(true);
                                    const result = await templateApi.analyzeDocx(docFile);
                                    setServerUploadedPath(result.uploadedPath);
                                    const seeded: VariableDef[] = (result.variables || []).map((t) => ({
                                        id: generateId(),
                                        name: t.name,
                                        type: "text",
                                        sourceText: `{{${t.name}}}`,
                                        isRequired: false,
                                        textTemplates: [],
                                    }));
                                    setVariables(seeded);
                                    toast.success(`Found ${seeded.length} variables`);
                                } catch (e) {
                                    if (e instanceof ApiError) toast.error(e.message); else toast.error("Analyze failed");
                                } finally {
                                    setAnalyzing(false);
                                    setConfirmReAnalyze(false);
                                }
                            }}
                        >
                            Re-analyze
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Confirm Delete Variable */}
            <AlertDialog open={!!confirmDeleteVarId} onOpenChange={(open) => { if (!open) setConfirmDeleteVarId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete variable?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the variable from this template configuration.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmDeleteVarId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (confirmDeleteVarId) removeVariable(confirmDeleteVarId);
                                setConfirmDeleteVarId(null);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

