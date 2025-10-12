"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { Download, FileUp, Highlighter, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { templateApi, ApiError } from "@/lib/api";
import { KML_FIELD_OPTIONS } from "@/lib/kml-constants";

type FieldType = "text" | "kml" | "image" | "select";

interface VariableDef {
    id: string;
    name: string;
    type: FieldType;
    sourceText: string;
    kmlField?: (typeof KML_FIELD_OPTIONS)[number]["value"];
    options?: string[];
    expression?: string;
    description?: string;
    isRequired?: boolean;
    textTemplates?: string[];
    groupId?: string;
    imageTarget?: string; // e.g., word/media/image3.png
    imageExtent?: { cx: number; cy: number };
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
    const [docArrayBuffer, setDocArrayBuffer] = useState<ArrayBuffer | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [serverUploadedPath, setServerUploadedPath] = useState<string>("");
    const [htmlPreview, setHtmlPreview] = useState<string>("");
    const [devMammothHtml, setDevMammothHtml] = useState<string>("");
    const [devMammothMessages, setDevMammothMessages] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    const [variables, setVariables] = useState<VariableDef[]>([]);
    const [variableGroups, setVariableGroups] = useState<{ id: string; name: string; description?: string }[]>([]);
    const [activeVarId, setActiveVarId] = useState<string | null>(null);
    const [draftVar, setDraftVar] = useState<VariableDef | null>(null);
    const [pendingSelectionText, setPendingSelectionText] = useState<string>("");
    const [docImages, setDocImages] = useState<Array<{ rId: string; target: string; extent?: { cx: number; cy: number }; blobUrl?: string }>>([]);

    // Modal state for creating a new section
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupDescription, setNewGroupDescription] = useState("");

    const previewRef = useRef<HTMLDivElement | null>(null);

    const activeVariable = useMemo(() => variables.find(v => v.id === activeVarId) ?? null, [variables, activeVarId]);

    // Read file into ArrayBuffer
    const handleFileChange = async (file: File | null) => {
        setDocFile(file);
        setVariables([]);
        setActiveVarId(null);
        setDraftVar(null);
        setHtmlPreview("");
        setPendingSelectionText("");
        setServerUploadedPath("");
        if (!file) return;
        try {
            const ab = await file.arrayBuffer();
            setDocArrayBuffer(ab);
            if (isTokenized) {
                // Analyze tokens on server
                try {
                    setAnalyzing(true);
                    const result = await templateApi.analyzeDocx(file);
                    setServerUploadedPath(result.uploadedPath);
                    // Seed variables from tokens (default type=text)
                    const seeded: VariableDef[] = (result.variables || []).map((t) => ({
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
                    if (e instanceof ApiError) {
                        toast.error(e.message);
                    } else {
                        toast.error("Analyze failed");
                    }
                } finally {
                    setAnalyzing(false);
                }
            }
        } catch (e) {
            toast.error("Failed to read file");
        }
    };

    // Convert DOCX -> HTML in-browser using mammoth browser build
    useEffect(() => {
        const convert = async () => {
            if (!docArrayBuffer) return;
            try {
                const mammoth = await import("mammoth/mammoth.browser");
                const styleMap = [
                    "p[style-name='Title'] => h1:fresh",
                    "p[style-name='Heading 1'] => h2:fresh",
                    "p[style-name='Heading 2'] => h3:fresh",
                    "p[style-name='Heading 3'] => h4:fresh",
                    // Alternate localized/custom names often found
                    "p[style-name='Heading1'] => h2:fresh",
                    "p[style-name='Heading2'] => h3:fresh",
                    "p[style-name='Heading3'] => h4:fresh",
                    "p[style-name='Subtitle'] => h3:fresh",
                ];
                const { value, messages } = await (mammoth as any).convertToHtml(
                    { arrayBuffer: docArrayBuffer, styleMap },
                    {
                        convertImage: (mammoth as any).images.inline(async (element: any) => {
                            const base64 = await element.read("base64");
                            return { src: `data:${element.contentType};base64,${base64}` };
                        }),
                    }
                );
                setHtmlPreview(value);
                setDevMammothHtml(value);
                setDevMammothMessages(Array.isArray(messages) ? messages : []);
            } catch (e) {
                console.error(e);
                toast.error("Failed to render DOCX. Try a different file.");
            }
        };
        convert();
    }, [docArrayBuffer]);

    // Extract images from DOCX for selection
    useEffect(() => {
        const extractImages = async () => {
            if (!docArrayBuffer) { setDocImages([]); return; }
            try {
                const { default: PizZip } = await import("pizzip");
                const zip = new (PizZip as any)(docArrayBuffer);

                const allXmlPaths: string[] = Object.keys(zip.files || {})
                    .filter((k) => k.startsWith("word/") && k.endsWith(".xml") && !k.includes("/_rels/"));

                const results: Array<{ rId: string; target: string; extent?: { cx: number; cy: number } }> = [];
                const seenTargets = new Set<string>();

                for (const xmlPath of allXmlPaths) {
                    const base = xmlPath.split("/").pop() as string;
                    const relsPath = `word/_rels/${base}.rels`;
                    const xml = zip.file(xmlPath)?.asText() || "";
                    const relsXml = zip.file(relsPath)?.asText() || "";

                    // Build relationships map for this part
                    const rels: Record<string, string> = {};
                    let m: RegExpExecArray | null;
                    const reRel = /<Relationship[^>]*Id=\"([^\"]+)\"[^>]*Target=\"([^\"]+)\"/g;
                    while ((m = reRel.exec(relsXml))) {
                        rels[m[1]] = m[2];
                    }

                    // Helper to find extent near an index window
                    const findExtentNear = (idx: number): { cx: number; cy: number } | undefined => {
                        const start = Math.max(0, idx - 1500);
                        const end = Math.min(xml.length, idx + 1500);
                        const slice = xml.slice(start, end);
                        const mm = /<wp:extent[^>]*cx=\"([0-9]+)\"[^>]*cy=\"([0-9]+)\"/i.exec(slice);
                        if (mm) {
                            return { cx: Number(mm[1] || 0), cy: Number(mm[2] || 0) };
                        }
                        return undefined;
                    };

                    // 1) a:blip r:embed / r:link
                    const reBlip = /<a:blip[^>]*r:(?:embed|link)=\"([^\"]+)\"[^>]*\/>/gi;
                    while ((m = reBlip.exec(xml))) {
                        const rId = m[1];
                        const t = rels[rId];
                        if (!t) continue;
                        let target = t.replace(/^\.{2}\//g, "");
                        if (!target.startsWith("word/")) target = `word/${target}`;
                        if (!zip.file(target)) continue; // skip external/unavailable
                        if (seenTargets.has(target)) continue;
                        seenTargets.add(target);
                        const extent = findExtentNear(m.index);
                        results.push({ rId, target, extent });
                    }

                    // 2) VML: <v:imagedata r:id="rIdX" .../>
                    const reVML = /<v:imagedata[^>]*r:id=\"([^\"]+)\"[^>]*\/>/gi;
                    while ((m = reVML.exec(xml))) {
                        const rId = m[1];
                        const t = rels[rId];
                        if (!t) continue;
                        let target = t.replace(/^\.{2}\//g, "");
                        if (!target.startsWith("word/")) target = `word/${target}`;
                        if (!zip.file(target)) continue;
                        if (seenTargets.has(target)) continue;
                        seenTargets.add(target);
                        const extent = findExtentNear(m.index);
                        results.push({ rId, target, extent });
                    }
                }

                // Fallback: if no images found via OOXML scan, try Mammoth output and map by content hash to media files
                if (results.length === 0) {
                    try {
                        const mammoth = await import("mammoth/mammoth.browser");
                        const { value } = await (mammoth as any).convertToHtml(
                            { arrayBuffer: docArrayBuffer },
                            {
                                convertImage: (mammoth as any).images.inline(async (element: any) => {
                                    const base64 = await element.read("base64");
                                    return { src: `data:${element.contentType};base64,${base64}` };
                                }),
                            }
                        );
                        const container = document.createElement('div');
                        container.innerHTML = value;
                        const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];

                        // Hash media binaries in the zip
                        const mediaFiles = Object.keys(zip.files || {}).filter((k) => k.startsWith('word/media/'));
                        const hashBufferToHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
                        const mediaHashMap = new Map<string, string>(); // hash -> target
                        for (const mf of mediaFiles) {
                            try {
                                const ab = zip.file(mf)?.asArrayBuffer();
                                if (!ab) continue;
                                const digest = await crypto.subtle.digest('SHA-256', ab);
                                mediaHashMap.set(hashBufferToHex(digest), mf);
                            } catch (_) { }
                        }

                        // Build rel maps once to locate extents later
                        type PartInfo = { xmlPath: string; xml: string; rels: Record<string, string> };
                        const parts: PartInfo[] = [];
                        for (const xmlPath of allXmlPaths) {
                            const base = xmlPath.split('/')?.pop() as string;
                            const relsPath = `word/_rels/${base}.rels`;
                            const xml = zip.file(xmlPath)?.asText() || '';
                            const relsXml = zip.file(relsPath)?.asText() || '';
                            const rels: Record<string, string> = {};
                            let mm: RegExpExecArray | null;
                            const reRel2 = /<Relationship[^>]*Id=\"([^\"]+)\"[^>]*Target=\"([^\"]+)\"/g;
                            while ((mm = reRel2.exec(relsXml))) rels[mm[1]] = mm[2];
                            parts.push({ xmlPath, xml, rels });
                        }

                        for (const tag of imgs) {
                            const src = tag.getAttribute('src') || '';
                            if (!src.startsWith('data:')) continue;
                            const base64 = src.split(',')[1] || '';
                            try {
                                const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
                                const digest = await crypto.subtle.digest('SHA-256', bin);
                                const hex = hashBufferToHex(digest);
                                const target = mediaHashMap.get(hex);
                                if (!target) continue;
                                if (seenTargets.has(target)) continue;
                                seenTargets.add(target);
                                // Find extent by locating a blip that resolves to this target
                                let extent: { cx: number; cy: number } | undefined;
                                outer: for (const p of parts) {
                                    const relEntries = Object.entries(p.rels);
                                    for (const [rid, relTarget] of relEntries) {
                                        let full = relTarget.replace(/^\.{2}\//g, '');
                                        if (!full.startsWith('word/')) full = `word/${full}`;
                                        if (full === target) {
                                            const reBlipRid = new RegExp(`<a:blip[^>]*r:(?:embed|link)=\\"${rid}\\"[^>]*\\/>`, 'g');
                                            let match;
                                            while ((match = reBlipRid.exec(p.xml))) {
                                                const before = Math.max(0, match.index - 1500);
                                                const after = Math.min(p.xml.length, match.index + 1500);
                                                const slice = p.xml.slice(before, after);
                                                const mm2 = /<wp:extent[^>]*cx=\"([0-9]+)\"[^>]*cy=\"([0-9]+)\"/i.exec(slice);
                                                if (mm2) {
                                                    extent = { cx: Number(mm2[1] || 0), cy: Number(mm2[2] || 0) };
                                                    break;
                                                }
                                            }
                                            break outer;
                                        }
                                    }
                                }
                                results.push({ rId: '', target, extent });
                            } catch (_) { }
                        }
                    } catch (_) {
                        // ignore mammoth fallback errors
                    }
                }

                // Build previews
                const out: Array<{ rId: string; target: string; extent?: { cx: number; cy: number }; blobUrl?: string }> = [];
                for (const im of results) {
                    try {
                        const f = zip.file(im.target);
                        if (f) {
                            const ab = f.asArrayBuffer();
                            const blob = new Blob([ab]);
                            const url = URL.createObjectURL(blob);
                            out.push({ ...im, blobUrl: url });
                        }
                    } catch {
                        // ignore
                    }
                }
                setDocImages(out);
            } catch {
                setDocImages([]);
            }
        };
        extractImages();
        return () => {
            // Revoke blob URLs
            try { docImages.forEach((d) => d.blobUrl && URL.revokeObjectURL(d.blobUrl)); } catch { }
        };

    }, [docArrayBuffer]);

    // Wrap current text selection with a span marker
    const markSelectionAsVariable = () => {
        if (isTokenized) {
            toast("Marking is disabled in tokenized mode");
            return;
        }
        const container = previewRef.current;
        if (!container) return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            toast("Select some text in the preview first");
            return;
        }

        const range = selection.getRangeAt(0);
        if (!container.contains(range.commonAncestorContainer)) {
            toast("Selection must be inside the preview");
            return;
        }

        // Allow selections within a single block-level container (e.g., same p/li/td/th/heading)
        const getBlockContainer = (node: Node): HTMLElement | null => {
            let current: Node | null = node;
            while (current && current !== container) {
                if (current instanceof HTMLElement) {
                    const tag = current.tagName.toLowerCase();
                    if (["p", "li", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
                        return current;
                    }
                }
                current = (current as Node).parentNode;
            }
            return container;
        };
        const startBlock = getBlockContainer(range.startContainer);
        const endBlock = getBlockContainer(range.endContainer);
        if (!startBlock || !endBlock || startBlock !== endBlock) {
            toast("Please select within a single paragraph or table cell");
            return;
        }

        const selectedText = range.toString();
        if (!selectedText.trim()) {
            toast("Empty selection");
            return;
        }

        try {
            const span = document.createElement("span");
            const id = generateId();
            span.dataset.varId = id;
            span.className = "bg-yellow-200/70 dark:bg-yellow-700/40 px-0.5 rounded-sm outline outline-1 outline-yellow-400";
            span.title = "Template variable";
            // Use extract/insert to safely wrap potentially multi-node inline selections
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);

            // Clear selection
            selection.removeAllRanges();

            // Create draft variable with default type; do not add to saved list yet
            const newVar: VariableDef = {
                id,
                name: "",
                type: "text",
                sourceText: selectedText,
                isRequired: false,
                textTemplates: [],
                groupId: undefined,
            };
            setDraftVar(newVar);
            setActiveVarId(null);
            setPendingSelectionText(selectedText);
            toast.success("Marked selection. Configure it on the right.");
        } catch (e) {
            console.error(e);
            toast.error("Could not mark selection. Try a smaller range.");
        }
    };

    const updateActiveVar = (patch: Partial<VariableDef>) => {
        // Normalize: for KML variables, ensure isRequired is false, but do not change name
        const normalize = (original: VariableDef | null, p: Partial<VariableDef>): Partial<VariableDef> => {
            const next: Partial<VariableDef> = { ...p };
            const targetType = (p.type ?? original?.type) as FieldType | undefined;
            if (targetType === "kml") {
                next.isRequired = false;
            }
            return next;
        };

        if (draftVar) {
            const normalized = normalize(draftVar, patch);
            setDraftVar({ ...draftVar, ...normalized });
            return;
        }
        if (activeVarId) {
            setVariables(prev => prev.map(v => (
                v.id === activeVarId ? { ...v, ...normalize(v, patch) } : v
            )));
        }
    };

    const removeVariable = (id: string) => {
        // unwrap the span in DOM
        const container = previewRef.current;
        if (container) {
            const el = container.querySelector(`span[data-var-id="${id}"]`);
            if (el && el.parentNode) {
                const parent = el.parentNode;
                while (el.firstChild) parent.insertBefore(el.firstChild, el);
                parent.removeChild(el);
            }
        }
        setVariables(prev => prev.filter(v => v.id !== id));
        if (activeVarId === id) setActiveVarId(null);
    };

    // Admin ability to add dropdown options removed

    // Admin text templates removed: no add/remove UI

    const saveDraftVariable = () => {
        if (!draftVar) return;
        // Validation: For KML, kmlField required. For others, name required.
        if (draftVar.type === "kml" && !draftVar.kmlField) {
            toast("Choose a KML field");
            return;
        }
        if (draftVar.type !== "kml" && (!draftVar.name || !draftVar.name.trim())) {
            toast("Enter a variable name");
            return;
        }
        // Force required=false for KML values
        const nextVar: VariableDef = draftVar.type === "kml" ? { ...draftVar, isRequired: false } as any : draftVar;
        setVariables(prev => [...prev, nextVar]);
        // Reset variable details pane to empty state after saving
        setActiveVarId(null);
        setDraftVar(null);
        setPendingSelectionText("");
        toast.success("Variable saved");
    };

    const clearDraftVariable = () => {
        if (!draftVar) return;
        // unwrap span highlight for draft
        const el = previewRef.current?.querySelector(`span[data-var-id='${draftVar.id}']`);
        if (el && el.parentNode) {
            const parent = el.parentNode as HTMLElement;
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
        }
        setDraftVar(null);
        setPendingSelectionText("");
        toast("Selection cleared");
    };

    const closeActiveVariable = () => {
        setActiveVarId(null);
        setPendingSelectionText("");
    };

    // removed downloadTaggedHtml

    const handleSaveStub = async () => {
        if (!templateName) {
            toast("Enter a template name");
            return;
        }
        if (!docFile) {
            toast("Upload a DOCX file");
            setStep(2);
            return;
        }
        try {
            setIsImporting(true);
            if (isTokenized) {
                if (!serverUploadedPath) {
                    toast("Analyze the tokenized DOCX first");
                    return;
                }
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
            if (error instanceof ApiError) {
                toast.error(error.message);
            } else {
                toast.error("Import failed");
            }
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="@container/main flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Create New Template</h1>
                <p className="text-muted-foreground">{isTokenized ? "Upload an already tokenized .docx ({{Variable Name}}) and configure variables." : "Upload a .docx, highlight text, and assign variable type/name."}</p>
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
                <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
                    {/* Left: Preview */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Template file</CardTitle>
                                <CardDescription>{isTokenized ? "Preview your tokenized document. Variables were auto-extracted." : "Preview and mark variables from your uploaded document"}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <Button type="button" variant="secondary" onClick={markSelectionAsVariable} disabled={!htmlPreview || isTokenized}>
                                        <Highlighter className="h-4 w-4 mr-2" /> Mark selection
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                                        Back
                                    </Button>
                                    {isTokenized && docFile && (
                                        <Button type="button" variant="outline" disabled={analyzing} onClick={async () => {
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
                                            }
                                        }}>Re-analyze</Button>
                                    )}
                                </div>
                                <Separator />
                                <Tabs defaultValue="preview" className="w-full">
                                    <TabsList className="grid grid-cols-2 w-full">
                                        <TabsTrigger value="preview">Preview</TabsTrigger>
                                        <TabsTrigger value="images">Images</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="preview" className="mt-3">
                                        <div className="rounded-md border p-3 max-h-[70vh] overflow-auto">
                                            {!htmlPreview && (
                                                <div className="flex items-center justify-center text-muted-foreground h-40">
                                                    <div className="flex items-center gap-2"><FileUp className="h-4 w-4" /> Upload a .docx to see a preview</div>
                                                </div>
                                            )}
                                            <div ref={previewRef} className="docx-preview">
                                                { }
                                                <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
                                            </div>
                                        </div>
                                        {devMammothHtml && (
                                            <div className="mt-3 flex items-center gap-2">
                                                <Button type="button" variant="secondary" onClick={() => {
                                                    try {
                                                        const blob = new Blob([devMammothHtml], { type: 'text/xml;charset=utf-8' });
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `mammoth-output-${Date.now()}.xml`;
                                                        document.body.appendChild(a);
                                                        a.click();
                                                        document.body.removeChild(a);
                                                        URL.revokeObjectURL(url);
                                                    } catch (_) { /* ignore */ }
                                                }}>Download Mammoth XML</Button>
                                            </div>
                                        )}
                                    </TabsContent>
                                    <TabsContent value="images" className="mt-3">
                                        <div className="space-y-3">
                                            {docImages.length === 0 && (
                                                <p className="text-sm text-muted-foreground">No images detected in this document.</p>
                                            )}
                                            <div className="grid grid-cols-2 gap-3">
                                                {docImages.map((img, idx) => (
                                                    <div key={`${img.rId}-${idx}`} className="border rounded-md p-2 space-y-2">
                                                        {img.blobUrl ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={img.blobUrl} alt="doc image" className="w-full h-28 object-contain bg-muted" />
                                                        ) : (
                                                            <div className="w-full h-28 flex items-center justify-center text-xs text-muted-foreground bg-muted">(no preview)</div>
                                                        )}
                                                        <div className="text-xs text-muted-foreground break-all">{img.target.replace(/^word\//, '')}</div>
                                                        <div className="flex items-center gap-2">
                                                            {(() => {
                                                                const isSelected = Boolean(
                                                                    (draftVar && (draftVar as any).type === 'image' && (draftVar as any).imageTarget === img.target) ||
                                                                    (activeVariable && (activeVariable as any).type === 'image' && (activeVariable as any).imageTarget === img.target)
                                                                );
                                                                const isAdded = variables.some((v) => v.type === 'image' && (v as any).imageTarget === img.target);
                                                                const disabled = isAdded || isSelected;
                                                                const label = isAdded ? 'Added' : (isSelected ? 'Selected' : 'Select');
                                                                return (
                                                                    <Button
                                                                        type="button"
                                                                        variant={disabled ? "default" : "secondary"}
                                                                        disabled={disabled}
                                                                        className={disabled ? '' : 'transition-all hover:shadow-sm hover:-translate-y-px'}
                                                                        onClick={() => {
                                                                            if (disabled) return;
                                                                            const id = generateId();
                                                                            const v: VariableDef = {
                                                                                id,
                                                                                name: `image_${idx + 1}`,
                                                                                type: 'image',
                                                                                sourceText: `Image ${img.target}`,
                                                                                imageTarget: img.target,
                                                                                imageExtent: img.extent,
                                                                                isRequired: false,
                                                                                textTemplates: [],
                                                                            };
                                                                            setDraftVar(v);
                                                                            setActiveVarId(null);
                                                                            setPendingSelectionText('');
                                                                        }}
                                                                    >
                                                                        {label}
                                                                    </Button>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                    {/* Right column content (variable details and variables list) */}
                    <div className="xl:col-start-2 xl:row-start-1 xl:row-span-2 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Variable details</CardTitle>
                                <CardDescription>
                                    Configure the selected variable. Select text in the preview then click &quot;Mark selection&quot;.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {draftVar || activeVariable ? (
                                    <>
                                        {/* 1. Selected Text (hidden for image variables) */}
                                        {((draftVar ? draftVar.type : activeVariable!.type) !== 'image') && (
                                            <div className="space-y-2">
                                                <Label>Selected text</Label>
                                                <Textarea value={(pendingSelectionText ?? ((draftVar ? draftVar.sourceText : activeVariable?.sourceText) ?? ''))} readOnly className="h-20" />
                                            </div>
                                        )}
                                        {/* 2. Type */}
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <Select value={(draftVar ? draftVar.type : activeVariable!.type)} onValueChange={(v: FieldType) => updateActiveVar({ type: v })}>
                                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="text">Text</SelectItem>
                                                    <SelectItem value="kml">KML Value</SelectItem>
                                                    <SelectItem value="image">Image</SelectItem>
                                                    <SelectItem value="select">Dropdown</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* KML Field (shown directly under Type when KML selected) */}
                                        {(draftVar ? draftVar.type : activeVariable!.type) === 'kml' && (
                                            <div className="space-y-2">
                                                <Label>KML field</Label>
                                                <Select
                                                    value={(draftVar ? draftVar.kmlField : activeVariable!.kmlField)}
                                                    onValueChange={(v) => updateActiveVar({ kmlField: v as any })}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="Choose KML field" /></SelectTrigger>
                                                    <SelectContent>
                                                        {KML_FIELD_OPTIONS.map(o => (
                                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                        {/* 3. Variable name (always visible; not auto-changed for KML) */}
                                        <div className="space-y-2">
                                            <Label htmlFor="var-name">Variable name</Label>
                                            <Input id="var-name" placeholder="e.g., owner_name" value={(draftVar ? draftVar.name : activeVariable!.name)}
                                                onChange={(e) => updateActiveVar({ name: e.target.value })} />
                                        </div>
                                        {/* 3b. Variable group */}
                                        <div className="space-y-2">
                                            <Label>Section</Label>
                                            <div className="flex gap-2">
                                                <Select
                                                    value={(draftVar ? draftVar.groupId : activeVariable!.groupId) ?? '__none__'}
                                                    onValueChange={(v: string) => updateActiveVar({ groupId: v === '__none__' ? undefined : v })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="No section" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__none__">No section</SelectItem>
                                                        {variableGroups.map(g => (
                                                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button type="button" variant="outline" onClick={() => setIsGroupModalOpen(true)}>New</Button>
                                            </div>
                                        </div>

                                        {/* New Section Modal */}
                                        <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
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
                                                    <Button variant="outline" onClick={() => { setIsGroupModalOpen(false); }}>Cancel</Button>
                                                    <Button onClick={() => {
                                                        const name = newGroupName.trim();
                                                        if (!name) { toast("Enter section name"); return; }
                                                        const id = generateId();
                                                        const description = newGroupDescription.trim() || undefined;
                                                        setVariableGroups(prev => [...prev, { id, name, description }]);
                                                        updateActiveVar({ groupId: id });
                                                        setIsGroupModalOpen(false);
                                                        setNewGroupName("");
                                                        setNewGroupDescription("");
                                                    }}>Create</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                        {/* 4. Variable description */}
                                        <div className="space-y-2">
                                            <Label htmlFor="var-desc">Variable description (optional)</Label>
                                            <Input id="var-desc" placeholder="Short helper text for this variable" value={(draftVar ? (draftVar.description ?? '') : (activeVariable!.description ?? ''))}
                                                onChange={(e) => updateActiveVar({ description: e.target.value as any })} />
                                        </div>
                                        {/* 4b. Required */}
                                        <div className="flex items-center gap-2">
                                            <Checkbox id="var-required" checked={!!(draftVar ? draftVar.isRequired : activeVariable!.isRequired)} onCheckedChange={(v) => updateActiveVar({ isRequired: Boolean(v) })} />
                                            <Label htmlFor="var-required">Required</Label>
                                        </div>
                                        {/* 5. Extras per type */}
                                        {(draftVar ? draftVar.type : activeVariable!.type) === "kml" && null}
                                        {/* Admin dropdown options UI removed */}
                                        {/* Admin text templates UI removed */}
                                        <div className="flex flex-wrap gap-2">
                                            {draftVar ? (
                                                <>
                                                    <Button onClick={saveDraftVariable}>
                                                        <Save className="h-4 w-4 mr-2" /> Save variable
                                                    </Button>
                                                    <Button variant="outline" onClick={clearDraftVariable}>Clear</Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button onClick={closeActiveVariable}>
                                                        <Save className="h-4 w-4 mr-2" /> Update variable
                                                    </Button>
                                                    <Button variant="outline" onClick={closeActiveVariable}>Close</Button>
                                                    <Button variant="destructive" onClick={() => activeVariable && removeVariable(activeVariable.id)}>
                                                        <Trash2 className="h-4 w-4 mr-2" /> Remove
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No variable selected. Select text in the preview and click &quot;Mark selection&quot;.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Variables</CardTitle>
                                <CardDescription>All marked variables in this document.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {variables.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No variables yet.</p>
                                )}
                                {variables.map(v => (
                                    <div key={v.id} className="rounded-md border p-3 flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{v.type}</Badge>
                                                <span className="font-medium">{v.name || "(unnamed)"}</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground line-clamp-2">{v.sourceText}</div>
                                            {v.type === "kml" && v.kmlField && (
                                                <div className="text-xs text-muted-foreground">KML: {v.kmlField}</div>
                                            )}
                                            {v.type === "select" && v.options && v.options.length > 0 && (
                                                <div className="text-xs text-muted-foreground">Options: {v.options.join(", ")}</div>
                                            )}

                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant={activeVarId === v.id ? "default" : "secondary"} onClick={() => {
                                                setActiveVarId(v.id);
                                                setPendingSelectionText(v.sourceText);
                                                const el = previewRef.current?.querySelector(`span[data-var-id='${v.id}']`);
                                                el?.scrollIntoView({ behavior: "smooth", block: "center" });
                                            }}>Edit</Button>
                                            <Button size="sm" variant="destructive" onClick={() => removeVariable(v.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                                <Separator />
                                <div className="flex justify-between">
                                    <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                                    <Button onClick={() => setStep(3)}>Next</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
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
                                <p className="text-sm text-muted-foreground">No variables added yet. Go back to Step 2 to mark variables.</p>
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
                                                    <p className="text-xs text-muted-foreground">Selected: {v.sourceText}</p>
                                                    {v.type === 'kml' && v.kmlField && (
                                                        <p className="text-xs">KML Field: {v.kmlField}</p>
                                                    )}
                                                    {v.type === 'select' && v.options && v.options.length > 0 && (
                                                        <p className="text-xs">Options: {v.options.join(', ')}</p>
                                                    )}

                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="secondary" onClick={() => { setActiveVarId(v.id); setStep(2); }}>Edit</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => removeVariable(v.id)}>Delete</Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between pt-2">
                                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                                <Button onClick={handleSaveStub} disabled={isImporting}>
                                    <Save className="h-4 w-4 mr-2" /> {isImporting ? 'Creating…' : 'Create Template'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            <style jsx>{`
        .docx-preview {
          --docx-border: #e5e7eb; /* gray-200 */
          --docx-muted: #6b7280;  /* gray-500 */
        }
        :global(.dark) .docx-preview {
          --docx-border: #374151; /* gray-700 */
          --docx-muted: #9ca3af;  /* gray-400 */
        }
        .docx-preview h1 {
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
          font-size: 1.5rem;
          line-height: 1.25;
          font-weight: 700;
          border-bottom: 1px solid var(--docx-border);
          padding-bottom: 0.25rem;
        }
        .docx-preview h2 {
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          font-size: 1.25rem;
          line-height: 1.3;
          font-weight: 600;
          padding-left: 0.5rem;
          border-left: 3px solid var(--docx-border);
        }
        .docx-preview h3, .docx-preview h4 {
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          font-size: 1.125rem;
          line-height: 1.35;
          font-weight: 600;
          color: var(--docx-muted);
        }
        .docx-preview p {
          margin: 0.25rem 0 0.75rem;
          line-height: 1.7;
        }
        .docx-preview ul,
        .docx-preview ol {
          margin: 0.5rem 0 1rem;
          padding-left: 1.25rem;
        }
        .docx-preview table {
          width: 100%;
          border-collapse: collapse;
          margin: 0.75rem 0 1rem;
        }
        .docx-preview th,
        .docx-preview td {
          border: 1px solid var(--docx-border);
          padding: 0.5rem 0.625rem;
        }
        /* Subtle separation between sections: add top border before every h2 except the first */
        .docx-preview h2:not(:first-of-type) {
          position: relative;
        }
        .docx-preview h2:not(:first-of-type)::before {
          content: "";
          display: block;
          height: 1px;
          background: var(--docx-border);
          margin: 1.25rem 0 0.75rem;
        }
      `}</style>
        </div>
    );
}

