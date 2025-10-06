"use client";

import { useState, useEffect, useRef } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { Download, Loader2, ChevronRight, Check, Star, Trash2, Plus, ListCheck, X } from "lucide-react";
import { toast } from "sonner";

import ImageEditor from "@/components/image-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
//
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { templateApi, reportApi, ApiError, userTemplateApi, type UserTemplateDto } from "@/lib/api";
import { Template, ContentBlock, ImportedVariable } from "@/types/template";
// PDF preview via <object> below; PDFCanvasViewer removed

interface VariableValue {
    [key: string]: string;
}

export default function FillTemplatePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const templateId = searchParams.get('id');
    const initialReportId = searchParams.get('reportId');

    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [variableValues, setVariableValues] = useState<VariableValue>({});
    const [showPreview, setShowPreview] = useState(false);
    const [htmlPreview, setHtmlPreview] = useState<string>("");
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [reportId, setReportId] = useState<string | null>(null);
    const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [reportTitle, setReportTitle] = useState<string>("");
    const [reportStatus, setReportStatus] = useState<string>("Draft");
    const [downloading, setDownloading] = useState<{ type: 'pdf' | 'docx' } | null>(null);
    const [justSaved, setJustSaved] = useState<boolean>(false);
    const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
    const [imageEditorFor, setImageEditorFor] = useState<string | null>(null);
    const [imageEditorInitialUrl, setImageEditorInitialUrl] = useState<string | undefined>(undefined);
    const [userTemplate, setUserTemplate] = useState<UserTemplateDto | null>(null);
    const [userTplLoading, setUserTplLoading] = useState<boolean>(false);
    const [checklistCompleted, setChecklistCompleted] = useState<Record<string, boolean>>({});
    const [isChecklistOpen, setIsChecklistOpen] = useState<boolean>(false);
    const [newTplForVarId, setNewTplForVarId] = useState<string | null>(null);
    const [newTplForVarName, setNewTplForVarName] = useState<string>("");
    const [newTplText, setNewTplText] = useState<string>("");
    const STATUS_FLOW = ["Draft", "Initial Review", "Final Review", "Submitted"] as const;
    type ReportStatus = typeof STATUS_FLOW[number];
    const nextStatus = (s?: string) => {
        const idx = STATUS_FLOW.indexOf(((s as ReportStatus) || "Draft"));
        return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
    };
    const canDownload = ["Final Review", "Submitted"].includes(reportStatus || "Draft");
    const totalSteps = selectedTemplate?.requiresKml ? 4 : 3;
    const [kmlData, setKmlData] = useState<Record<string, any>>({});
    const hasKmlData = Object.keys(kmlData || {}).length > 0;
    const kmlInputRef = useRef<HTMLInputElement | null>(null);

    const injectKmlIntoVariables = (incoming: Record<string, any>) => {
        if (!selectedTemplate || !incoming) return;
        setVariableValues(prev => {
            const next: VariableValue = { ...prev };
            if (selectedTemplate.variables && selectedTemplate.variables.length > 0) {
                (selectedTemplate.variables || []).forEach((imp: ImportedVariable) => {
                    if (imp.type === 'kml') {
                        const fieldKey = (imp.kmlField as string) || '';
                        const nameKey = (imp.name as string) || fieldKey;
                        const val = incoming[fieldKey];
                        if (nameKey && val !== undefined) next[nameKey] = String(val ?? '');
                    }
                });
            } else {
                (selectedTemplate.sections || []).forEach(section => {
                    section.content.forEach(block => {
                        if (block.type === 'kml_variable' && block.kmlField) {
                            const key = block.kmlField as string;
                            const val = incoming[key];
                            if (key && val !== undefined) next[key] = String(val ?? '');
                        }
                    });
                });
            }
            return next;
        });
    };

    const resolveUploadsUrl = (u?: string): string | undefined => {
        if (!u) return undefined;
        if (/^https?:\/\//i.test(u) || u.startsWith('data:')) return u;
        const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
        if (u.startsWith('/')) return base + u;
        return base + '/' + u;
    };

    async function handleKmlFile(file: File) {
        try {
            const text = await file.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "application/xml");
            const getText = (el: Element | null | undefined): string => (el?.textContent || "").trim();
            const qAll = (sel: string): Element[] => Array.from(xml.querySelectorAll(sel));
            const q = (sel: string): Element | null => xml.querySelector(sel);
            const replaceMuWithM = (val: string) => (val || "").replace(/μ/g, 'm');
            const extractBold = (html: string, label: string): string => {
                const regex = new RegExp(label + ": <b>(.*?)<\\/b>", "i");
                const match = html.match(regex);
                return match ? (match[1] || '').trim() : '';
            };
            const extractByLabel = (html: string, label: string): string => extractBold(html, label);
            const getDescHtml = (): string => getText(q("Document > Folder > Placemark > description")) || getText(q("Document > Placemark > description"));
            const extractCoordinatesDom = (): string => {
                // Try LookAt under Document > Placemark
                const lookAtDoc = q("Document > Placemark > LookAt");
                const lookAtFolder = q("Document > Folder > Placemark > LookAt");
                const pickLookAt = (node: Element | null) => {
                    if (!node) return "";
                    const lat = getText(node.querySelector("latitude"));
                    const lng = getText(node.querySelector("longitude"));
                    if (lat && lng) return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
                    return "";
                };
                const look1 = pickLookAt(lookAtDoc);
                if (look1) return look1;
                const look2 = pickLookAt(lookAtFolder);
                if (look2) return look2;
                // Fallback: polygon centroid
                const coordsEl = q("Document > Folder > Placemark > Polygon > outerBoundaryIs > LinearRing > coordinates") || q("Polygon > outerBoundaryIs > LinearRing > coordinates");
                const coordsStr = getText(coordsEl);
                if (!coordsStr) return "";
                const pairs = coordsStr.trim().split(/\s+/).map((c) => {
                    const [lng, lat] = c.split(",").slice(0, 2).map(Number) as [number, number];
                    return [lng, lat] as [number, number];
                });
                if (!pairs.length) return "";
                const count = pairs.length;
                const sum = pairs.reduce((acc, curr) => [acc[0] + curr[0], acc[1] + curr[1]] as [number, number], [0, 0] as [number, number]);
                const centerLng = sum[0] / count;
                const centerLat = sum[1] / count;
                return `${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`;
            };

            const desc = getDescHtml();
            const out: Record<string, string> = {
                municipality: replaceMuWithM(extractByLabel(desc, "Δήμος")),
                plot_number: getText(q("Document > name")) || getText(q("name")),
                plot_area: replaceMuWithM(extractByLabel(desc, "Εμβαδό")),
                coordinates: extractCoordinatesDom(),
                sheet_plan: replaceMuWithM(extractByLabel(desc, "Αρ. Φ/Σχ")),
                registration_number: replaceMuWithM(extractByLabel(desc, "Αριθμός εγγραφης")),
                property_type: replaceMuWithM(extractByLabel(desc, "Ειδος Ακινήτου")),
                zone: replaceMuWithM(extractByLabel(desc, "Ζώνη")),
                zone_description: replaceMuWithM(extractByLabel(desc, "Ζωνη Περιγραφή")),
                building_coefficient: replaceMuWithM(extractByLabel(desc, "Δόμηση")),
                coverage: replaceMuWithM(extractByLabel(desc, "Κάλυψη")),
                floors: replaceMuWithM(extractByLabel(desc, "Ορόφοι")).replace(/,\s*$/, ""),
                height: replaceMuWithM(extractByLabel(desc, "Υψος")),
                value_2018: replaceMuWithM(extractByLabel(desc, "Αξία 2018")),
                value_2021: replaceMuWithM(extractByLabel(desc, "Αξία 2021")),
            };
            setKmlData(out);
            injectKmlIntoVariables(out);
            return out;
        } catch (e) {
            toast.error('Invalid KML');
            return null;
        }
    }

    const handleKmlDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!e.dataTransfer?.files?.[0]) return;
        const file = e.dataTransfer.files[0];
        if (!file.name.toLowerCase().endsWith('.kml')) return toast.error('Please drop a .kml file');
        await handleKmlFile(file);
    };

    const handleKmlSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await handleKmlFile(file);
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        const loadFromParams = async () => {
            if (initialReportId) {
                try {
                    const report = await (reportApi.getById as any)(initialReportId);
                    setReportId(initialReportId);
                    // Load template for this report
                    const tpl = await templateApi.getById((report as any).templateId);
                    setSelectedTemplate(tpl as any);
                    try { if ((tpl as any)._id) await loadUserTemplateFor(((tpl as any)._id) as string); } catch (_) { }
                    setVariableValues((report as any).values || {});
                    // Restore checklist progress from saved report
                    try {
                        const cp = Array.isArray((report as any).checklistProgress) ? (report as any).checklistProgress : [];
                        const map: Record<string, boolean> = {};
                        for (const it of cp) {
                            if (it && typeof it.id === 'string') map[it.id] = !!it.checked;
                        }
                        setChecklistCompleted(map);
                    } catch (_) { }
                    setReportTitle((report as any).title || (report as any).name || (tpl as any).name || "");
                    setReportStatus((report as any).status || "Draft");
                    // Prefill KML data if present so we don't prompt re-upload
                    if ((report as any).kmlData && typeof (report as any).kmlData === 'object') {
                        setKmlData((report as any).kmlData || {});
                        injectKmlIntoVariables((report as any).kmlData || {});
                    } else {
                        setKmlData({});
                    }
                    setStep(2);
                    return;
                } catch (_) {
                    toast.error('Failed to load report');
                }
            }
            if (templateId && templates.length > 0) {
                const template = templates.find(t => t._id === templateId);
                if (template) {
                    setSelectedTemplate(template);
                    initializeVariableValues(template);
                    setChecklistCompleted({});
                    try { await loadUserTemplateFor((template as any)._id as string); } catch (_) { }
                }
            }
        };
        loadFromParams();
    }, [initialReportId, templateId, templates]);

    // Initial PDF preview once a template is selected and values are ready (Step 1 preview)
    // Stage 1: show preview for selected template
    useEffect(() => {
        if (selectedTemplate && step === 1) {
            refreshPdfPreview();
        }

    }, [selectedTemplate, step]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await templateApi.getAll(true);
            setTemplates(data as Template[]);
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

    const generateId = () => Math.random().toString(36).slice(2);

    const loadUserTemplateFor = async (tplId: string) => {
        try {
            setUserTplLoading(true);
            try {
                const ut = await userTemplateApi.getForTemplate(tplId);
                setUserTemplate(ut);
            } catch (e) {
                if (e instanceof ApiError && e.status === 404) {
                    const created = await userTemplateApi.createForTemplate(tplId);
                    setUserTemplate(created);
                } else {
                    throw e;
                }
            }
        } catch (_) {
            // non-blocking
        } finally {
            setUserTplLoading(false);
        }
    };

    const getUserSnippetsForVar = (variableId: string) => {
        const arr = userTemplate?.variableTextTemplates || [];
        return arr.find(v => v.variableId === variableId) || null;
    };

    const getUserSelectOptionsForVar = (variableId: string) => {
        const arr = (userTemplate as any)?.variableSelectOptions || [];
        return arr.find((v: any) => v.variableId === variableId) || null;
    };

    const upsertUserVarSnippets = async (variableId: string, updater: (curr: { variableId: string; snippets: Array<{ id: string; text: string }> } | null) => { variableId: string; snippets: Array<{ id: string; text: string }> }) => {
        if (!userTemplate) return;
        const current = getUserSnippetsForVar(variableId);
        const nextEntry = updater(current ? { variableId: current.variableId, snippets: [...current.snippets] } : null);
        const others = (userTemplate.variableTextTemplates || []).filter(v => v.variableId !== variableId);
        const updated = { ...userTemplate, variableTextTemplates: [...others, nextEntry] } as UserTemplateDto;
        setUserTemplate(updated);
        try {
            await userTemplateApi.update(userTemplate._id, { variableTextTemplates: updated.variableTextTemplates });
        } catch (_) {
            // revert on failure
            setUserTemplate(userTemplate);
            toast.error('Failed to save templates');
        }
    };

    const upsertUserVarSelectOptions = async (variableId: string, updater: (curr: { variableId: string; options: Array<{ id: string; value: string }> } | null) => { variableId: string; options: Array<{ id: string; value: string }> }) => {
        if (!userTemplate) return;
        const current = getUserSelectOptionsForVar(variableId);
        const nextEntry = updater(current ? { variableId: current.variableId, options: [...current.options] } : null);
        const others = ((userTemplate as any).variableSelectOptions || []).filter((v: any) => v.variableId !== variableId);
        const updated = { ...(userTemplate as any), variableSelectOptions: [...others, nextEntry] } as UserTemplateDto & { variableSelectOptions: Array<{ variableId: string; options: Array<{ id: string; value: string }> }> };
        setUserTemplate(updated as any);
        try {
            await userTemplateApi.update(userTemplate._id, { variableSelectOptions: (updated as any).variableSelectOptions });
        } catch (_) {
            setUserTemplate(userTemplate);
            toast.error('Failed to save dropdown options');
        }
    };

    const addSnippetForVar = async (variableId: string, text: string) => {
        await upsertUserVarSnippets(variableId, (curr) => {
            const id = generateId();
            const base = curr || { variableId, snippets: [] };
            const snippets = [...base.snippets, { id, text }];
            return { variableId, snippets };
        });
        toast.success('Template saved');
    };

    const deleteSnippetForVar = async (variableId: string, snippetId: string) => {
        await upsertUserVarSnippets(variableId, (curr) => {
            const base = curr || { variableId, snippets: [] };
            const snippets = base.snippets.filter(s => s.id !== snippetId);
            return { variableId, snippets };
        });
        toast.success('Template deleted');
    };

    const prefillDefaultsFromUserTemplate = () => {
        if (!selectedTemplate || !userTemplate) return;
        if (!selectedTemplate.variables || selectedTemplate.variables.length === 0) return;
        // default feature removed: no auto-prefill
    };

    const initializeVariableValues = (template: Template) => {
        const values: VariableValue = {};
        if (template.variables && template.variables.length > 0) {
            template.variables.forEach((v: ImportedVariable) => {
                values[v.name] = '';
            });
        } else {
            (template.sections || []).forEach(section => {
                section.content.forEach(block => {
                    if (block.type === 'variable' && block.variableName) {
                        values[block.variableName] = '';
                    } else if (block.type === 'kml_variable' && block.kmlField) {
                        values[block.kmlField] = '';
                    }
                });
            });
        }
        setVariableValues(values);
    };

    const handleTemplateSelect = (templateId: string) => {
        const template = templates.find(t => t._id === templateId);
        if (template) {
            setSelectedTemplate(template);
            initializeVariableValues(template);
            try { loadUserTemplateFor((template as any)._id as string); } catch (_) { }
            setReportId(null);
            // Do not navigate immediately; allow preview and then continue
            // Reset previous preview state until new one loads
            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl("");
            setPdfBlob(null);
        }
    };

    useEffect(() => {
        prefillDefaultsFromUserTemplate();
    }, [userTemplate, selectedTemplate]);

    const handleVariableChange = (variableName: string, value: string) => {
        setVariableValues(prev => ({
            ...prev,
            [variableName]: value
        }));
    };

    // Stage 1 preview only; no debounced preview refresh in later stages
    useEffect(() => {
        if (step !== 1) return;
        if (!selectedTemplate) return;
        if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
        previewDebounceRef.current = setTimeout(() => {
            refreshPdfPreview();
        }, 500);
        return () => {
            if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
        };

    }, [variableValues, selectedTemplate, step]);

    // Stage 3: preview is triggered explicitly when clicking Preview in Stage 2

    // Stage 2: immediately persist variable changes (no debounce), title is fixed here
    useEffect(() => {
        if (step !== 2) return;
        if (!reportId) return;
        (async () => {
            try {
                // Also persist checklist progress/status
                const total = userTemplate?.checklist?.length || 0;
                const progress = (userTemplate?.checklist || []).map(it => ({ id: it.id, checked: !!checklistCompleted[it.id] }));
                const checkedCount = progress.filter(p => p.checked).length;
                const status = total === 0 ? 'empty' : checkedCount === 0 ? 'empty' : checkedCount === total ? 'complete' : 'partial';
                await reportApi.update(reportId, { values: variableValues, checklistProgress: progress, checklistStatus: status });
            } catch (_) { }
        })();

    }, [variableValues, reportId, step, userTemplate, checklistCompleted]);

    const createReportIfNeeded = async () => {
        if (!selectedTemplate) return null;
        if (reportId) return reportId;
        try {
            const created = await reportApi.create({
                templateId: (selectedTemplate._id || (selectedTemplate as any).id) as string,
                name: reportTitle || `${selectedTemplate.name} - Draft`,
                title: reportTitle || selectedTemplate.name,
                values: variableValues,
            });
            const id = (created as any)._id || (created as any).id;
            setReportId(id);
            setReportStatus((created as any).status || "Draft");
            return id as string;
        } catch (_) {
            return null;
        }
    };

    const computeChecklistPayload = () => {
        const total = userTemplate?.checklist?.length || 0;
        const progress = (userTemplate?.checklist || []).map(it => ({ id: it.id, checked: !!checklistCompleted[it.id] }));
        const checkedCount = progress.filter(p => p.checked).length;
        const status = total === 0 ? 'empty' : checkedCount === 0 ? 'empty' : checkedCount === total ? 'complete' : 'partial';
        return { progress, status } as { progress: Array<{ id: string; checked: boolean }>; status: 'empty' | 'partial' | 'complete' };
    };

    const computeChecklistPayloadFrom = (completedMap: Record<string, boolean>) => {
        const total = userTemplate?.checklist?.length || 0;
        const progress = (userTemplate?.checklist || []).map(it => ({ id: it.id, checked: !!completedMap[it.id] }));
        const checkedCount = progress.filter(p => p.checked).length;
        const status = total === 0 ? 'empty' : checkedCount === 0 ? 'empty' : checkedCount === total ? 'complete' : 'partial';
        return { progress, status } as { progress: Array<{ id: string; checked: boolean }>; status: 'empty' | 'partial' | 'complete' };
    };

    const refreshHtmlPreview = async () => {
        if (!selectedTemplate) return;
        try {
            setLoading(true);
            const id = (selectedTemplate._id || (selectedTemplate as any).id) as string;
            const html = await templateApi.previewHtml(id, variableValues);
            setHtmlPreview(html);
        } catch (error) {
            if (error instanceof ApiError) toast.error(error.message);
            else toast.error('Preview failed');
        } finally {
            setLoading(false);
        }
    };

    const refreshPdfPreview = async () => {
        if (!selectedTemplate) return;
        try {
            setLoading(true);
            const id = (selectedTemplate._id || (selectedTemplate as any).id) as string;
            const blob = await templateApi.generate(id, variableValues, 'pdf');
            setPdfBlob(blob);
            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
            const url = URL.createObjectURL(blob);
            setPdfPreviewUrl(url);
        } catch (error) {
            if (error instanceof ApiError) toast.error(error.message);
            else toast.error('PDF preview failed');
        } finally {
            setLoading(false);
        }
    };

    const parseTemplate = (template: Template, values: VariableValue): string => {
        // For imported templates, just list variables and values
        if (template.variables && template.variables.length > 0) {
            return template.variables.map(v => `${v.name}: ${values[v.name] || ''}`).join('\n');
        }
        let result = '';
        (template.sections || []).forEach(section => {
            result += `\n## ${section.title}\n\n`;
            section.content.forEach(block => {
                if (block.type === 'text') {
                    result += block.content;
                } else if (block.type === 'variable' && block.variableName) {
                    const value = values[block.variableName] || `[${block.variableName}]`;
                    result += value;
                } else if (block.type === 'kml_variable' && block.kmlField) {
                    const value = values[block.kmlField] || `[${block.kmlField}]`;
                    result += value;
                }
            });
            result += '\n';
        });
        return result.trim();
    };

    const renderStyledContent = (template: Template, values: VariableValue) => {
        // Imported templates no longer render placeholder preview; rely on PDF/HTML preview
        if (template.variables && template.variables.length > 0) {
            return null;
        }
        return template.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-4 border-b pb-2">
                    {section.title}
                </h2>
                <div className="space-y-3 text-foreground leading-relaxed">
                    {(() => {
                        const contentBlocks = [];
                        let currentText = '';

                        section.content.forEach((block, blockIndex) => {
                            if (block.type === 'text') {
                                currentText += block.content;
                            } else if (block.type === 'variable' && block.variableName) {
                                const value = values[block.variableName] || `[${block.variableName}]`;
                                if (currentText) {
                                    contentBlocks.push(
                                        <span key={`text-${blockIndex}`} className="text-base">
                                            {currentText}
                                        </span>
                                    );
                                    currentText = '';
                                }
                                contentBlocks.push(
                                    <span key={`var-${blockIndex}`} className="font-medium text-primary">
                                        {value}
                                    </span>
                                );
                            } else if (block.type === 'kml_variable' && block.kmlField) {
                                const value = values[block.kmlField] || `[${block.kmlField}]`;
                                if (currentText) {
                                    contentBlocks.push(
                                        <span key={`text-${blockIndex}`} className="text-base">
                                            {currentText}
                                        </span>
                                    );
                                    currentText = '';
                                }
                                contentBlocks.push(
                                    <span key={`var-${blockIndex}`} className="font-medium text-primary">
                                        {value}
                                    </span>
                                );
                            }
                        });

                        // Add any remaining text
                        if (currentText) {
                            contentBlocks.push(
                                <span key="final-text" className="text-base">
                                    {currentText}
                                </span>
                            );
                        }

                        return contentBlocks.length > 0 ? (
                            <p className="text-base">
                                {contentBlocks}
                            </p>
                        ) : null;
                    })()}
                </div>
            </div>
        ));
    };

    const getVariableType = (block: ContentBlock): string => {
        if (block.type === 'variable') {
            return block.variableType || 'string';
        } else if (block.type === 'kml_variable') {
            return block.variableType || 'string';
        }
        return 'string';
    };

    const getVariableLabel = (block: ContentBlock): string => {
        if (block.type === 'variable' && block.variableName) {
            return block.variableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        } else if (block.type === 'kml_variable' && block.kmlField) {
            return block.kmlField.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        return '';
    };

    const copyToClipboard = async () => {
        if (!selectedTemplate) return;
        try {
            await navigator.clipboard.writeText('');
            toast.success("Copied");
        } catch (error) {
            // no-op, feature removed
        }
    };

    const downloadFromBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const downloadReport = async (type: 'docx' | 'pdf') => {
        try {
            if (!canDownload) {
                return toast.error("Move report to Final Review before export");
            }
            const id = reportId || (await createReportIfNeeded());
            if (!id) return toast.error('Failed to save report');
            setDownloading({ type });
            const blob = await reportApi.generate(id, type);
            const rawTitle = (reportTitle || selectedTemplate?.name || 'report').trim();
            const safeBase = rawTitle.replace(/[\\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
            const filename = `${safeBase || 'report'}.${type}`;
            downloadFromBlob(blob, filename);
            setReportStatus('Submitted');
        } catch (error) {
            if (error instanceof ApiError) toast.error(error.message);
            else toast.error('Download failed');
        } finally {
            setDownloading(null);
        }
    };

    const advanceStatus = async () => {
        try {
            const id = reportId || (await createReportIfNeeded());
            if (!id) return toast.error('Failed to save report');
            const next = nextStatus(reportStatus);
            if (!next) return;
            const updated = await reportApi.update(id, { status: next });
            setReportStatus((updated as any).status || next);
            toast.success(`Status advanced to ${next}`);
        } catch (error) {
            if (error instanceof ApiError) toast.error(error.message);
            else toast.error('Failed to update status');
        }
    };

    const getUniqueVariables = (template: Template): Array<ContentBlock | ImportedVariable> => {
        if (template.variables && template.variables.length > 0) return template.variables;
        const variables = new Map<string, ContentBlock>();
        (template.sections || []).forEach(section => {
            section.content.forEach(block => {
                if (block.type === 'variable' && block.variableName) {
                    variables.set(block.variableName, block);
                } else if (block.type === 'kml_variable' && block.kmlField) {
                    variables.set(block.kmlField, block);
                }
            });
        });
        return Array.from(variables.values());
    };

    return (
        <div className="@container/main flex flex-col gap-4 md:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Create Report</h1>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        {selectedTemplate && (step === 2 || step === 3) ? (
                            <>
                                <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium">
                                    {reportStatus || 'Draft'}
                                </span>
                                <span>{`${reportTitle || 'Untitled'} - ${selectedTemplate.name}`}</span>
                            </>
                        ) : (
                            <span>Select a template and fill in the variables to generate your report.</span>
                        )}
                    </div>
                    <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium">
                        Step {step} of {totalSteps}
                    </span>
                </div>
            </div>

            {/* Step 1: Template Selection */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Create Report</CardTitle>
                        <CardDescription>
                            Enter a title and select a template to begin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left: Title input + Template dropdown */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="reportTitleStage1">Report Title</Label>
                                    <Input id="reportTitleStage1" placeholder="Enter a title" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Select a template</Label>
                                    <Select value={(selectedTemplate?._id as any) ?? (selectedTemplate as any)?.id ?? ""} onValueChange={(v) => handleTemplateSelect(v)}>
                                        <SelectTrigger className="w-full h-auto min-h-12 py-3">
                                            {selectedTemplate ? (
                                                <div className="flex flex-col text-left truncate leading-tight">
                                                    <span className="font-medium truncate">{selectedTemplate.name}</span>
                                                    {selectedTemplate.description && (
                                                        <span className="text-xs text-muted-foreground truncate">
                                                            {selectedTemplate.description}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <SelectValue placeholder="Select template..." />
                                            )}
                                        </SelectTrigger>
                                        <SelectContent className="w-[var(--radix-select-trigger-width)]">
                                            {templates.filter(t => t.isActive).map((t, idx) => {
                                                const val = (t as any)._id ?? (t as any).id;
                                                if (!val) return null;
                                                return (
                                                    <SelectItem key={String(val)} value={String(val)} className="py-3">
                                                        <div className="flex flex-col text-left">
                                                            <span className="font-medium">{t.name}</span>
                                                            {t.description && (
                                                                <span className="text-xs text-muted-foreground line-clamp-2">{t.description}</span>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {/* Right: PDF preview */}
                            <div>
                                <div className="bg-card border rounded-lg p-2 h-[600px] overflow-hidden text-foreground">
                                    {selectedTemplate ? (
                                        selectedTemplate.previewPdfPath ? (
                                            <object data={(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '') + selectedTemplate.previewPdfPath} type="application/pdf" className="w-full h-full" />
                                        ) : (
                                            pdfBlob ? (
                                                <object data={pdfPreviewUrl} type="application/pdf" className="w-full h-full" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <Loader2 className="h-5 w-5 animate-spin" />
                                                        <span>Generating preview...</span>
                                                    </div>
                                                </div>
                                            )
                                        )
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            <span>Please select a template to see its preview.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end mt-6">
                            <Button disabled={!selectedTemplate || !reportTitle.trim()} onClick={async () => {
                                const id = await createReportIfNeeded();
                                if (!id) return;
                                if (selectedTemplate?.requiresKml) setStep(2);
                                else setStep(2);
                            }}>Continue</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: KML Upload (only if template requires KML) */}
            {selectedTemplate && selectedTemplate.requiresKml && step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Upload KML</CardTitle>
                        <CardDescription>
                            {hasKmlData
                                ? 'KML data found for this report. Review below or replace it by uploading another file.'
                                : 'Drag and drop a .kml file or click to select. Extracted details will be saved to this report.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <input ref={kmlInputRef} type="file" accept=".kml" className="hidden" onChange={handleKmlSelect} />
                        {!hasKmlData && (
                            <div
                                onDragOver={(e) => { e.preventDefault(); }}
                                onDrop={handleKmlDrop}
                                className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer"
                                onClick={() => kmlInputRef.current?.click()}
                            >
                                <p className="text-sm text-muted-foreground">Drop KML here or click to select</p>
                            </div>
                        )}
                        {hasKmlData && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {Object.entries(kmlData).map(([k, v]) => (
                                    <div key={k} className="text-sm"><span className="text-muted-foreground">{k}:</span> <span className="font-medium break-words">{String(v || '')}</span></div>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center justify-between mt-6">
                            {hasKmlData && (
                                <Button variant="outline" onClick={() => kmlInputRef.current?.click()}>Upload another KML</Button>
                            )}
                            <Button onClick={async () => {
                                const id = await createReportIfNeeded();
                                if (!id) return toast.error('Failed to save report');
                                try { await reportApi.update(id, { kmlData }); } catch { }
                                setStep(3);
                            }}>Continue</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {selectedTemplate && (selectedTemplate.requiresKml ? step === 3 : step === 2) && (
                <div className="grid grid-cols-1 gap-6">
                    {/* Variables Input Only */}
                    <div className="space-y-4">
                        {/* Variables Form (grouped by section if defined) */}
                        {(() => {
                            const groups = (selectedTemplate.variableGroups || []).slice().sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
                            const groupMap = new Map<string, Array<ContentBlock | ImportedVariable>>();
                            const ungrouped: Array<ContentBlock | ImportedVariable> = [];
                            getUniqueVariables(selectedTemplate).forEach((it) => {
                                const gid = (it as any).groupId as string | undefined;
                                if (gid) {
                                    const arr = groupMap.get(gid) || [];
                                    arr.push(it);
                                    groupMap.set(gid, arr);
                                } else {
                                    ungrouped.push(it);
                                }
                            });
                            const renderItems = (items: Array<ContentBlock | ImportedVariable>) => (
                                <CardContent className="space-y-4">
                                    {items.map((block) => {
                                        // Imported variable branch
                                        if ((block as ImportedVariable).name && !(block as any).type?.includes('variable')) {
                                            const imp = block as ImportedVariable;
                                            const variableName = imp.name;
                                            const label = imp.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                            const isNumber = false; // could use extra metadata later
                                            return (
                                                <div key={variableName} className="space-y-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <Label htmlFor={variableName}>
                                                            {label}
                                                            {imp.isRequired && <span className="text-destructive ml-1">*</span>}
                                                        </Label>
                                                        <div className="flex items-center gap-2">
                                                            {/* Admin 'Insert from template' removed; keep only My Templates */}
                                                            {imp.type === 'text' && (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="outline" size="sm" type="button">
                                                                            My Templates
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto w-[400px]">
                                                                        {(() => {
                                                                            const u = getUserSnippetsForVar(imp.id);
                                                                            const items = u?.snippets || [];
                                                                            return (
                                                                                <div className="max-w-[600px]">
                                                                                    {items.length === 0 && (
                                                                                        <div className="px-3 py-2 text-sm text-muted-foreground">No templates yet</div>
                                                                                    )}
                                                                                    {items.map((sn, idx) => (
                                                                                        <div key={sn.id}>
                                                                                            <DropdownMenuItem className="flex items-start gap-2" onClick={() => handleVariableChange(variableName, sn.text)}>
                                                                                                <div className="flex-1">
                                                                                                    <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words max-w-[560px]">{sn.text}</div>
                                                                                                </div>
                                                                                                <button className="text-xs text-destructive" onClick={(e) => { e.stopPropagation(); deleteSnippetForVar(imp.id, sn.id); }}>
                                                                                                    <Trash2 className="h-4 w-4" />
                                                                                                </button>
                                                                                            </DropdownMenuItem>
                                                                                            {idx < items.length - 1 && <DropdownMenuSeparator />}
                                                                                        </div>
                                                                                    ))}
                                                                                    <div className="h-px bg-border my-1" />
                                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setNewTplForVarId(imp.id); setNewTplForVarName(variableName); setNewTplText(String(variableValues[variableName] || '')); }}>
                                                                                        <Plus className="h-4 w-4 mr-2" /> Create new template
                                                                                    </DropdownMenuItem>
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            )}
                                                            {imp.type === 'select' && (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="outline" size="sm" type="button">My Dropdowns</Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="p-2 space-y-2 w-[360px]">
                                                                        {(() => {
                                                                            const u = getUserSelectOptionsForVar(imp.id);
                                                                            const items = u?.options || [];
                                                                            return (
                                                                                <div className="max-w-[320px]">
                                                                                    {items.length === 0 && (
                                                                                        <div className="px-3 py-2 text-sm text-muted-foreground">No items yet</div>
                                                                                    )}
                                                                                    {items.map((opt: { id: string; value: string }) => (
                                                                                        <div key={opt.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-muted">
                                                                                            <div className="text-sm truncate">{opt.value}</div>
                                                                                            <button className="text-xs text-destructive" onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                upsertUserVarSelectOptions(imp.id, (curr) => {
                                                                                                    const base = curr || { variableId: imp.id, options: [] };
                                                                                                    return { variableId: base.variableId, options: base.options.filter((o: { id: string; value: string }) => o.id !== opt.id) };
                                                                                                });
                                                                                            }}>
                                                                                                <Trash2 className="h-4 w-4" />
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                                    <div className="h-px bg-border my-1" />
                                                                                    <div className="flex gap-2">
                                                                                        <Input placeholder="New item" onKeyDown={(e) => {
                                                                                            if (e.key === 'Enter') {
                                                                                                e.preventDefault();
                                                                                                const target = e.target as HTMLInputElement;
                                                                                                const v = (target.value || '').trim();
                                                                                                if (!v) return;
                                                                                                const id = generateId();
                                                                                                upsertUserVarSelectOptions(imp.id, (curr) => {
                                                                                                    const base = curr || { variableId: imp.id, options: [] };
                                                                                                    return { variableId: base.variableId, options: [...base.options, { id, value: v }] };
                                                                                                });
                                                                                                target.value = '';
                                                                                            }
                                                                                        }} />
                                                                                        <Button type="button" variant="secondary" onClick={(e) => {
                                                                                            const wrapper = (e.currentTarget.previousSibling as HTMLInputElement);
                                                                                            if (!wrapper || !(wrapper as any).value) return;
                                                                                            const v = String((wrapper as any).value).trim();
                                                                                            if (!v) return;
                                                                                            const id = generateId();
                                                                                            upsertUserVarSelectOptions(imp.id, (curr) => {
                                                                                                const base = curr || { variableId: imp.id, options: [] };
                                                                                                return { variableId: base.variableId, options: [...base.options, { id, value: v }] };
                                                                                            });
                                                                                            (wrapper as any).value = '';
                                                                                        }}>Add</Button>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {imp.description && (
                                                        <p className="text-xs text-muted-foreground">{imp.description}</p>
                                                    )}
                                                    {imp.type === 'select' ? (
                                                        <div className="space-y-2">
                                                            <select
                                                                id={variableName}
                                                                className="w-full border rounded-md p-2 bg-background"
                                                                value={variableValues[variableName] || ''}
                                                                onChange={(e) => handleVariableChange(variableName, e.target.value)}
                                                            >
                                                                <option value="">Select...</option>
                                                                {(() => {
                                                                    const u = getUserSelectOptionsForVar(imp.id);
                                                                    const userOpts = (u?.options || []).map((o: { id: string; value: string }) => o.value);
                                                                    const all = Array.from(new Set([...(imp.options || []), ...userOpts]));
                                                                    return all.map((opt) => (
                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                    ));
                                                                })()}
                                                            </select>
                                                        </div>
                                                    ) : imp.type === 'image' ? (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <Input id={variableName} type="file" accept="image/*" onChange={async (e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (!file) return;
                                                                    try {
                                                                        const { url } = await templateApi.uploadImage(file);
                                                                        handleVariableChange(variableName, url);
                                                                        toast.success('Image uploaded');
                                                                    } catch (err) {
                                                                        toast.error('Upload failed');
                                                                    }
                                                                }} />
                                                                <Button variant="outline" size="sm" type="button" onClick={() => {
                                                                    setImageEditorFor(variableName);
                                                                    setImageEditorInitialUrl(resolveUploadsUrl(variableValues[variableName] || undefined));
                                                                }}>Edit image</Button>
                                                                {variableValues[variableName] && (
                                                                    <a href={resolveUploadsUrl(variableValues[variableName])} target="_blank" rel="noreferrer" className="text-xs underline text-muted-foreground">View</a>
                                                                )}
                                                            </div>
                                                            {imp.description && (
                                                                <p className="text-xs text-muted-foreground">You can upload directly or click Edit image to crop, draw, or pixelate before saving.</p>
                                                            )}
                                                        </div>
                                                    ) : imp.type === 'text' ? (
                                                        <Textarea
                                                            id={variableName}
                                                            className="resize-y"
                                                            value={variableValues[variableName] || ''}
                                                            onChange={(e) => handleVariableChange(variableName, e.target.value)}
                                                            required={imp.isRequired}
                                                            rows={3}
                                                        />
                                                    ) : (
                                                        <Input
                                                            id={variableName}
                                                            type={isNumber ? 'number' : 'text'}
                                                            value={variableValues[variableName] || ''}
                                                            onChange={(e) => handleVariableChange(variableName, e.target.value)}
                                                            required={imp.isRequired}
                                                        />
                                                    )}
                                                    {imp.type === 'kml' && imp.kmlField && (
                                                        <Badge variant="outline" className="text-xs">KML Field: {imp.kmlField}</Badge>
                                                    )}
                                                    {imp.type === 'calculated' && imp.expression && (
                                                        <div className="text-xs text-muted-foreground">Expression: {imp.expression}</div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        // Legacy section/content variables branch
                                        const cb = block as ContentBlock;
                                        const variableName = cb.type === 'variable' ? cb.variableName : cb.kmlField;
                                        const variableType = getVariableType(cb);
                                        const label = getVariableLabel(cb);

                                        if (!variableName) return null;

                                        return (
                                            <div key={variableName} className="space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Label htmlFor={variableName}>
                                                        {label}
                                                        {(cb as any).isRequired && <span className="text-destructive ml-1">*</span>}
                                                    </Label>
                                                    {/* Admin 'Insert from template' removed */}
                                                </div>
                                                {(cb as any).description && (
                                                    <p className="text-xs text-muted-foreground">{(cb as any).description}</p>
                                                )}
                                                {variableType === 'date' ? (
                                                    <Input
                                                        id={variableName}
                                                        type="date"
                                                        value={variableValues[variableName] || ''}
                                                        onChange={(e) => handleVariableChange(variableName, e.target.value)}
                                                        required={(cb as any).isRequired}
                                                    />
                                                ) : variableType === 'currency' || variableType === 'number' ? (
                                                    <Input
                                                        id={variableName}
                                                        type="number"
                                                        value={variableValues[variableName] || ''}
                                                        onChange={(e) => handleVariableChange(variableName, e.target.value)}
                                                        required={(cb as any).isRequired}
                                                        placeholder={variableType === 'currency' ? '0.00' : '0'}
                                                    />
                                                ) : (
                                                    <div className="space-y-2">
                                                        {/* Admin 'Insert from template' removed */}
                                                        <Textarea
                                                            className="resize-y"
                                                            id={variableName}
                                                            value={variableValues[variableName] || ''}
                                                            onChange={(e) => handleVariableChange(variableName, e.target.value)}
                                                            required={(cb as any).isRequired}
                                                            placeholder={`Enter ${label.toLowerCase()}`}
                                                            rows={2}
                                                        />
                                                    </div>
                                                )}
                                                {cb.type === 'kml_variable' && (
                                                    <Badge variant="outline" className="text-xs">
                                                        KML Field: {cb.kmlField}
                                                    </Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            );
                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {groups.map((g: any) => (
                                        <Card key={g.id}>
                                            <CardHeader>
                                                <CardTitle>{g.name}</CardTitle>
                                                {g.description && <CardDescription>{g.description}</CardDescription>}
                                            </CardHeader>
                                            {renderItems(groupMap.get(g.id) || [])}
                                        </Card>
                                    ))}
                                    {ungrouped.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Other</CardTitle>
                                            </CardHeader>
                                            {renderItems(ungrouped)}
                                        </Card>
                                    )}
                                </div>
                            );
                        })()}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    const id = reportId || (await createReportIfNeeded());
                                    if (!id) return toast.error('Failed to save report');
                                    try {
                                        await reportApi.update(id, { values: variableValues });
                                        toast.success('Saved');
                                        setJustSaved(true);
                                        setTimeout(() => setJustSaved(false), 2000);
                                    } catch (_) {
                                        toast.error('Failed to save');
                                    }
                                }}
                            >
                                {justSaved ? (
                                    <>
                                        <Check className="h-4 w-4 mr-2" /> Saved
                                    </>
                                ) : (
                                    'Save'
                                )}
                            </Button>
                            <Button
                                disabled={isPreviewing}
                                onClick={async () => {
                                    if (isPreviewing) return;
                                    setIsPreviewing(true);
                                    const id = reportId || (await createReportIfNeeded());
                                    if (!id) { setIsPreviewing(false); return toast.error('Failed to save report'); }
                                    try {
                                        await reportApi.update(id, { values: variableValues });
                                        await refreshPdfPreview();
                                        setStep(selectedTemplate?.requiresKml ? 4 : 3);
                                    } catch (_) {
                                        toast.error('Failed to save');
                                    } finally {
                                        setIsPreviewing(false);
                                    }
                                }}
                            >
                                {isPreviewing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Previewing...
                                    </>
                                ) : (
                                    'Preview'
                                )}
                            </Button>
                        </div>
                    </div>
                    {/* Checklist moved to Preview stage overlay */}
                </div>
            )}

            {/* Image Editor Modal */}
            <Dialog open={!!imageEditorFor} onOpenChange={(open) => { if (!open) { setImageEditorFor(null); setImageEditorInitialUrl(undefined); } }}>
                <DialogContent className="max-w-none w-[100vw] max-h-[95vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Image</DialogTitle>
                        <DialogDescription>Crop, draw, and pixelate; then save to use the edited image in your report.</DialogDescription>
                    </DialogHeader>
                    <div className="mt-2 flex-1 min-h-0 overflow-auto">
                        <div className="w-full h-[80vh]">
                            <ImageEditor
                                initialImageUrl={imageEditorInitialUrl}
                                maxDimension={2400}
                                onExportBlob={async (blob) => {
                                    if (!imageEditorFor) return;
                                    try {
                                        const file = new File([blob], `${imageEditorFor}.png`, { type: 'image/png' });
                                        const { url } = await templateApi.uploadImage(file);
                                        handleVariableChange(imageEditorFor, url);
                                        toast.success('Edited image saved');
                                        setImageEditorFor(null);
                                        setImageEditorInitialUrl(undefined);
                                    } catch (_) {
                                        toast.error('Save failed');
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter className="shrink-0">
                        <Button variant="outline" onClick={() => { /* Reset inside ImageEditor via exposeRef if wired in future */ if (imageEditorInitialUrl) { setImageEditorInitialUrl(imageEditorInitialUrl); } }}>Reset</Button>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" aria-label="Download" onClick={async () => {
                                        // Trigger export blob then auto-download
                                        const img = document.querySelector<HTMLCanvasElement>('canvas');
                                        if (!img) return;
                                        img.toBlob((blob) => {
                                            if (!blob) return;
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = 'edited.png';
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }, 'image/png', 0.92);
                                    }}>
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Download</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <Button onClick={() => {
                            // Reuse onExportBlob path by dispatching a CustomEvent (simpler: call the same upload via current canvas)
                            const canvas = document.querySelector<HTMLCanvasElement>('canvas');
                            if (!canvas || !imageEditorFor) return;
                            canvas.toBlob(async (blob) => {
                                if (!blob) return;
                                try {
                                    const file = new File([blob], `${imageEditorFor}.png`, { type: 'image/png' });
                                    const { url } = await templateApi.uploadImage(file);
                                    handleVariableChange(imageEditorFor, url);
                                    toast.success('Edited image saved');
                                    setImageEditorFor(null);
                                    setImageEditorInitialUrl(undefined);
                                } catch (_) {
                                    toast.error('Save failed');
                                }
                            }, 'image/png', 0.92);
                        }}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create New Template Modal */}
            <Dialog open={!!newTplForVarId} onOpenChange={(open) => { if (!open) { setNewTplForVarId(null); setNewTplText(""); setNewTplForVarName(""); } }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create new template</DialogTitle>
                        <DialogDescription>Save your current text as a reusable template for this variable.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs text-muted-foreground">Variable</Label>
                            <div className="text-sm font-medium">{newTplForVarName}</div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newTplText">Template Text</Label>
                            <Textarea id="newTplText" rows={6} value={newTplText} onChange={(e) => setNewTplText(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setNewTplForVarId(null); setNewTplText(""); setNewTplForVarName(""); }}>Cancel</Button>
                        <Button onClick={async () => {
                            if (!newTplForVarId) return;
                            const txt = String(newTplText || '').trim();
                            if (!txt) { toast.error('Enter some text'); return; }
                            await addSnippetForVar(newTplForVarId, txt);
                            setNewTplForVarId(null);
                            setNewTplText("");
                            toast.success('Template created');
                        }}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Stage */}
            {selectedTemplate && (selectedTemplate.requiresKml ? step === 4 : step === 3) && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    {(["Draft", "Initial Review", "Final Review", "Submitted"] as const).map((s) => (
                                        <span
                                            key={s}
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s === (reportStatus || 'Draft') ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                                        >
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm" disabled={!!downloading || !canDownload}>
                                                            {downloading ? (
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            ) : (
                                                                <Download className="h-4 w-4 mr-2" />
                                                            )}
                                                            Download
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => downloadReport('pdf')} disabled={!!downloading}>PDF</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => downloadReport('docx')} disabled={!!downloading}>DOCX</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TooltipTrigger>
                                        {!canDownload && (
                                            <TooltipContent>
                                                <p>This report cannot be exported before it is checked (move to Final Review).</p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                                {nextStatus(reportStatus) && (
                                    <Button variant="secondary" size="sm" onClick={advanceStatus}>
                                        Advance <ChevronRight className="h-4 w-4 ml-2" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-card border rounded-lg p-2 h-[82vh] overflow-hidden text-foreground">
                            {pdfBlob ? (
                                <object data={pdfPreviewUrl} type="application/pdf" className="w-full h-full">
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        <span>Preview not supported in this browser. </span>
                                    </div>
                                </object>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Generating PDF preview...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Checklist Overlay moved out to global render */}
                        <div className="mt-6">
                            <Card>
                                <CardHeader className="flex items-center justify-between">
                                    <CardTitle className="text-base">Filled Variables</CardTitle>
                                    <Button variant="outline" size="sm" onClick={() => setStep(selectedTemplate?.requiresKml ? 3 : 2)}>Edit</Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {Object.keys(variableValues).map((k) => (
                                            <div key={k} className="text-sm">
                                                <span className="text-muted-foreground">{k}:</span> <span className="font-medium break-words">{String(variableValues[k] || '')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>
            )}
            {/* Global Checklist FAB + Sheet across stages (visible only when not in Draft) */}
            {selectedTemplate && userTemplate && (reportStatus !== 'Draft') && (
                <>
                    {!isChecklistOpen && (
                        <button
                            type="button"
                            onClick={() => setIsChecklistOpen(true)}
                            className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
                            title="Open checklist"
                        >
                            <ListCheck className="h-6 w-6" />
                        </button>
                    )}
                    {isChecklistOpen && (
                        <div className="fixed inset-y-0 right-0 w-[360px] z-40">
                            <div className="h-full bg-card border-l shadow-xl flex flex-col">
                                <div className="p-4 border-b flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const total = userTemplate.checklist?.length || 0;
                                            const checked = Object.values(checklistCompleted).filter(Boolean).length;
                                            const status = total === 0 ? 'empty' : checked === 0 ? 'empty' : checked === total ? 'complete' : 'partial';
                                            const color = status === 'complete' ? 'bg-emerald-500' : status === 'partial' ? 'bg-yellow-500' : 'bg-red-500';
                                            return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} title={status} />;
                                        })()}
                                        <div className="font-medium">Checklist</div>
                                    </div>
                                    <button type="button" onClick={() => setIsChecklistOpen(false)} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="p-4 overflow-auto">
                                    <div className="space-y-2">
                                        {(userTemplate.checklist || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map((it) => (
                                            <div key={it.id} className="flex items-center gap-2">
                                                <input type="checkbox" checked={!!checklistCompleted[it.id]} onChange={async (e) => {
                                                    const id = reportId || (await createReportIfNeeded());
                                                    if (!id) return toast.error('Failed to save report');
                                                    const next = { ...checklistCompleted, [it.id]: e.target.checked } as Record<string, boolean>;
                                                    setChecklistCompleted(next);
                                                    try {
                                                        const { progress, status } = computeChecklistPayloadFrom(next);
                                                        await reportApi.update(id, { checklistProgress: progress, checklistStatus: status });
                                                    } catch (_) { }
                                                }} />
                                                <div className="text-sm text-foreground">{it.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
            {/* Spacer to avoid FAB overlapping action buttons */}
            {selectedTemplate && userTemplate && (
                <div className="h-24" />
            )}
        </div>
    );
}
