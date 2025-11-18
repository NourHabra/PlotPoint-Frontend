"use client";

import { useState, useEffect, useRef } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { Download, Loader2, ChevronRight, Check, Star, Trash2, Plus, ListCheck, X, Calendar as CalendarIcon, ExternalLink, ChevronsUpDown, Search } from "lucide-react";
import { toast } from "sonner";

import AppendixManager from "@/components/appendix/appendix-manager";
import ImageEditor from "@/components/image-editor";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    const [removeImageVar, setRemoveImageVar] = useState<string | null>(null);
    const [userTemplate, setUserTemplate] = useState<UserTemplateDto | null>(null);
    const [userTplLoading, setUserTplLoading] = useState<boolean>(false);
    const [checklistCompleted, setChecklistCompleted] = useState<Record<string, boolean>>({});
    const [isChecklistOpen, setIsChecklistOpen] = useState<boolean>(false);
    const [newTplForVarId, setNewTplForVarId] = useState<string | null>(null);
    const [newTplForVarName, setNewTplForVarName] = useState<string>("");
    const [newTplText, setNewTplText] = useState<string>("");
    const [appendixPreviewItems, setAppendixPreviewItems] = useState<any[]>([]);
    const [isUploadingAppendix, setIsUploadingAppendix] = useState<boolean>(false);
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

    // KML Form Fields State
    const [eparchia, setEparchia] = useState<string>("");
    const [dimos, setDimos] = useState<string>("");
    const [enoria, setEnoria] = useState<string>("");
    const [fyllo, setFyllo] = useState<string>("");
    const [sxedio, setSxedio] = useState<string>("");
    const [tmima, setTmima] = useState<string>("");
    const [arithmosTemaxiou, setArithmosTemaxiou] = useState<string>("");

    // Region data structure with codes
    interface RegionOption {
        vilCode: number;
        distCode: number;
        name: string;
    }

    // Dropdown options (will be populated from API later)
    const [dimosOptions, setDimosOptions] = useState<RegionOption[]>([]);
    const [dimosOpen, setDimosOpen] = useState(false);
    const [eparchiaOpen, setEparchiaOpen] = useState(false);
    const [enoriaOpen, setEnoriaOpen] = useState(false);
    const [enoriaOptions, setEnoriaOptions] = useState<string[]>([]);
    const [fylloOptions, setFylloOptions] = useState<string[]>([]);
    const [sxedioOptions, setSxedioOptions] = useState<string[]>([]);
    const [tmimaOptions, setTmimaOptions] = useState<string[]>([]);

    // Store selected region codes
    const [selectedRegionCodes, setSelectedRegionCodes] = useState<{ vilCode: number; distCode: number } | null>(null);
    const [qrtrCode, setQrtrCode] = useState<number | null>(null);

    // Province code to name mapping
    const eparchiaCodeToName: Record<string, string> = {
        "3D3": "ΑΜΜΟΧΩΣΤΟΣ",
        "3D2": "ΚΕΡΥΝΕΙΑ",
        "3D4": "ΛΑΡΝΑΚΑ",
        "3D5": "ΛΕΜΕΣΟΣ",
        "3D1": "ΛΕΥΚΩΣΙΑ",
        "3D6": "ΠΑΦΟΣ"
    };

    // Province options for dropdown (using codes as values)
    const eparchiaOptions = Object.entries(eparchiaCodeToName).map(([code, name]) => ({
        code,
        name
    }));

    const [pdfExtractedValues, setPdfExtractedValues] = useState<Record<string, string>>({});
    const [isExtractingPdf, setIsExtractingPdf] = useState<boolean>(false);
    const pdfInputRef = useRef<HTMLInputElement | null>(null);

    // Build kmlData from form fields
    const buildKmlDataFromForm = (): Record<string, any> => {
        return {
            eparchia: eparchia || "", // This will be the code (e.g., "3D3")
            eparchia_name: eparchia ? eparchiaCodeToName[eparchia] || "" : "", // Province name for display
            dimos: dimos || "",
            dimos_vil_code: selectedRegionCodes?.vilCode || "",
            dimos_dist_code: selectedRegionCodes?.distCode || "",
            qrtr_code: qrtrCode !== null && qrtrCode !== undefined ? qrtrCode : "",
            enoria: enoria || "",
            fyllo: fyllo || "",
            sxedio: sxedio || "",
            tmima: tmima || "",
            arithmos_temaxiou: arithmosTemaxiou || "",
        };
    };

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

    // Helper functions to clear cascading fields
    const clearEparchia = () => {
        setEparchia("");
        setDimosOptions([]);
        setDimos("");
        setSelectedRegionCodes(null);
        setQrtrCode(null);
        setEnoria("");
        setFyllo("");
        setSxedio("");
        setTmima("");
        setArithmosTemaxiou("");
    };

    const clearDimos = () => {
        setDimos("");
        setSelectedRegionCodes(null);
        setQrtrCode(null);
        setEnoria("");
        setEnoriaOptions([]);
        setFyllo("");
        setSxedio("");
        setTmima("");
        setArithmosTemaxiou("");
    };

    const clearEnoria = () => {
        setEnoria("");
        setFyllo("");
        setSxedio("");
        setTmima("");
        setArithmosTemaxiou("");
    };

    const clearFyllo = () => {
        setFyllo("");
        setFylloOptions([]);
        setSxedio("");
        setTmima("");
        setArithmosTemaxiou("");
    };

    const clearSxedio = () => {
        setSxedio("");
        setSxedioOptions([]);
        setTmima(""); // Clear section when plan is cleared
        setArithmosTemaxiou("");
    };

    const clearTmima = () => {
        setTmima("");
        setArithmosTemaxiou("");
    };

    // Fetch data when province is selected
    useEffect(() => {
        if (!eparchia) {
            setDimosOptions([]);
            setDimos("");
            setSelectedRegionCodes(null);
            return;
        }

        // Extract the numeric part from the province code (e.g., "3D1" -> "1", "3D3" -> "3")
        const provinceCode = eparchia.replace(/^3D/, '');
        const apiUrl = `https://eservices.dls.moi.gov.cy/arcgis/rest/services/National/General_Search/MapServer/11/query?f=json&outFields=VIL_CODE,DIST_CODE,VIL_NM_G&returnDistinctValues=false&returnGeometry=false&where=DIST_CODE%3D${provinceCode}`;

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                console.log('Province API Response:', data);

                // Parse the response and extract region options
                if (data.features && Array.isArray(data.features)) {
                    const regions: RegionOption[] = data.features.map((feature: any) => ({
                        vilCode: feature.attributes.VIL_CODE,
                        distCode: feature.attributes.DIST_CODE,
                        name: feature.attributes.VIL_NM_G
                    }));

                    // Sort by name for better UX
                    regions.sort((a, b) => a.name.localeCompare(b.name, 'el'));

                    setDimosOptions(regions);
                }
            })
            .catch(error => {
                console.error('Error fetching province data:', error);
                toast.error('Failed to fetch regions');
            });
    }, [eparchia]);

    // Fetch data when region is selected
    useEffect(() => {
        console.log('Region useEffect triggered:', { selectedRegionCodes, dimos });

        if (!selectedRegionCodes || !dimos) {
            console.log('Region useEffect: Missing required data, clearing QRTR_CODE');
            setQrtrCode(null);
            setEnoria("");
            setEnoriaOptions([]);
            return;
        }

        // Set Parish to "0" when region is selected
        setEnoria("0");
        setEnoriaOptions(["0"]);

        const { distCode, vilCode } = selectedRegionCodes;
        const apiUrl = `https://eservices.dls.moi.gov.cy/arcgis/rest/services/National/General_Search/MapServer/10/query?f=json&outFields=QRTR_CODE,VIL_CODE,DIST_CODE,QRTR_NM_G&returnDistinctValues=false&returnGeometry=false&where=DIST_CODE%3D${distCode}+and+VIL_CODE%3D${vilCode}`;

        console.log('Making Region API call:', apiUrl);

        fetch(apiUrl)
            .then(response => {
                console.log('Region API Response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Region API Response:', data);

                // Extract QRTR_CODE from the response
                if (data.features && Array.isArray(data.features) && data.features.length > 0) {
                    const qrtrCodeValue = data.features[0].attributes?.QRTR_CODE;
                    console.log('Extracted QRTR_CODE:', qrtrCodeValue);
                    if (qrtrCodeValue !== undefined && qrtrCodeValue !== null) {
                        setQrtrCode(qrtrCodeValue);
                    }
                } else {
                    console.log('No features found in Region API response');
                }
            })
            .catch(error => {
                console.error('Error fetching region data:', error);
                setQrtrCode(null);
            });
    }, [selectedRegionCodes, dimos]);

    // Fetch sheet data when QRTR_CODE is available
    useEffect(() => {
        console.log('Sheet useEffect triggered:', { selectedRegionCodes, qrtrCode });

        if (!selectedRegionCodes || qrtrCode === null || qrtrCode === undefined) {
            console.log('Sheet useEffect: Missing required data, clearing sheet options');
            setFylloOptions([]);
            setFyllo("");
            return;
        }

        const { distCode, vilCode } = selectedRegionCodes;
        const apiUrl = `https://eservices.dls.moi.gov.cy/arcgis/rest/services/National/General_Search/MapServer/0/query?f=json&outFields=SHEET,SHEET,DIST_CODE,VIL_CODE,QRTR_CODE&returnDistinctValues=true&returnGeometry=false&where=DIST_CODE%3D${distCode}+and+VIL_CODE%3D${vilCode}+and+QRTR_CODE%3D${qrtrCode}`;

        console.log('Making Sheet API call:', apiUrl);

        fetch(apiUrl)
            .then(response => {
                console.log('Sheet API Response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Sheet API Response:', data);

                // Extract unique SHEET values from the response
                if (data.features && Array.isArray(data.features)) {
                    const sheets = new Set<string>();
                    data.features.forEach((feature: any) => {
                        const sheet = feature.attributes?.SHEET;
                        if (sheet !== undefined && sheet !== null && sheet !== "") {
                            sheets.add(String(sheet));
                        }
                    });

                    // Convert to array and sort
                    const sheetArray = Array.from(sheets).sort((a, b) => {
                        // Try numeric sort first, fallback to string sort
                        const numA = Number(a);
                        const numB = Number(b);
                        if (!isNaN(numA) && !isNaN(numB)) {
                            return numA - numB;
                        }
                        return a.localeCompare(b);
                    });

                    console.log('Extracted sheets:', sheetArray);
                    setFylloOptions(sheetArray);
                } else {
                    console.log('No features found in Sheet API response');
                    setFylloOptions([]);
                }
            })
            .catch(error => {
                console.error('Error fetching sheet data:', error);
                setFylloOptions([]);
            });
    }, [selectedRegionCodes, qrtrCode]);

    // Fetch plan data when sheet is selected
    useEffect(() => {
        console.log('Plan useEffect triggered:', { selectedRegionCodes, qrtrCode, fyllo });

        if (!selectedRegionCodes || qrtrCode === null || qrtrCode === undefined || !fyllo) {
            console.log('Plan useEffect: Missing required data, clearing plan options');
            setSxedioOptions([]);
            setSxedio("");
            return;
        }

        const { distCode, vilCode } = selectedRegionCodes;
        const apiUrl = `https://eservices.dls.moi.gov.cy/arcgis/rest/services/National/General_Search/MapServer/0/query?f=json&outFields=PLAN_NBR,PLAN_NBR,DIST_CODE,VIL_CODE,QRTR_CODE,SHEET,SRC_SL_CODE&returnDistinctValues=true&returnGeometry=false&where=DIST_CODE%3D${distCode}+and+VIL_CODE%3D${vilCode}+and+QRTR_CODE%3D${qrtrCode}+and+SHEET%3D${fyllo}`;

        console.log('Making Plan API call:', apiUrl);
        console.log('Using values:', { distCode, vilCode, qrtrCode, sheet: fyllo });

        fetch(apiUrl)
            .then(response => {
                console.log('Plan API Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Plan API Response:', data);
                console.log('Plan API Response features count:', data.features?.length || 0);

                // Extract unique PLAN_NBR values from the response
                if (data.features && Array.isArray(data.features)) {
                    const plans = new Set<string>();
                    data.features.forEach((feature: any) => {
                        const planNbr = feature.attributes?.PLAN_NBR;
                        if (planNbr !== undefined && planNbr !== null && planNbr !== "") {
                            plans.add(String(planNbr));
                        }
                    });

                    // Convert to array and sort
                    const planArray = Array.from(plans).sort((a, b) => {
                        // Try to extract numeric parts for sorting
                        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                        if (numA !== numB) {
                            return numA - numB;
                        }
                        // If numeric parts are equal, sort alphabetically
                        return a.localeCompare(b);
                    });

                    console.log('Extracted plans:', planArray);
                    setSxedioOptions(planArray);
                } else {
                    console.log('No features found in Plan API response');
                    setSxedioOptions([]);
                }
            })
            .catch(error => {
                console.error('Error fetching plan data:', error);
                setSxedioOptions([]);
            });
    }, [selectedRegionCodes, qrtrCode, fyllo]);

    // Set section to "0" and disable when plan is selected
    useEffect(() => {
        if (sxedio) {
            setTmima("0");
            // Ensure "0" is in the options so it can be displayed
            setTmimaOptions(["0"]);
        } else {
            setTmima("");
            setTmimaOptions([]);
        }
    }, [sxedio]);

    // Update kmlData when form fields change
    useEffect(() => {
        const newKmlData = buildKmlDataFromForm();
        const hasData = Object.values(newKmlData).some(v => v !== "");
        if (hasData) {
            setKmlData(newKmlData);
            injectKmlIntoVariables(newKmlData);
        }

    }, [eparchia, dimos, enoria, fyllo, sxedio, tmima, arithmosTemaxiou, selectedTemplate]);

    const resolveUploadsUrl = (u?: string): string | undefined => {
        if (!u) return undefined;
        if (/^https?:\/\//i.test(u) || u.startsWith('data:')) return u;
        const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
        if (u.startsWith('/')) return base + u;
        return base + '/' + u;
    };

    async function handlePdfFile(file: File) {
        setIsExtractingPdf(true);
        try {
            const result = await templateApi.extractPdf(file);
            const extractedValue = result.extractedValue;
            const label = "ΑΡ. ΕΚΤΙΜΗΣΗΣ";

            // Update extracted values state
            setPdfExtractedValues(prev => ({
                ...prev,
                [label]: extractedValue
            }));

            // Update report values with the extracted value under "ΑΡ. ΕΚΤΙΜΗΣΗΣ"
            setVariableValues(prev => ({
                ...prev,
                [label]: extractedValue
            }));

            // Save to report if it exists
            if (reportId) {
                try {
                    await reportApi.update(reportId, {
                        values: {
                            ...variableValues,
                            [label]: extractedValue
                        }
                    });
                } catch (err) {
                    console.error('Failed to save PDF extracted value to report:', err);
                }
            }

            toast.success(`Extracted ${label}: ${extractedValue}`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to extract value from PDF');
        } finally {
            setIsExtractingPdf(false);
        }
    }

    const handlePdfDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!e.dataTransfer?.files?.[0]) return;
        const file = e.dataTransfer.files[0];
        if (!file.name.toLowerCase().endsWith('.pdf')) return toast.error('Please drop a .pdf file');
        await handlePdfFile(file);
    };

    const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await handlePdfFile(file);
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
                    const reportValues = (report as any).values || {};
                    setVariableValues(reportValues);
                    // Load PDF extracted values if present
                    const extractedValues: Record<string, string> = {};
                    if (reportValues["ΑΡ. ΕΚΤΙΜΗΣΗΣ"]) {
                        extractedValues["ΑΡ. ΕΚΤΙΜΗΣΗΣ"] = reportValues["ΑΡ. ΕΚΤΙΜΗΣΗΣ"];
                    }
                    setPdfExtractedValues(extractedValues);
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
                    // Prefill KML data if present
                    if ((report as any).kmlData && typeof (report as any).kmlData === 'object') {
                        const loadedKmlData = (report as any).kmlData || {};
                        setKmlData(loadedKmlData);
                        // Populate form fields from loaded KML data
                        setEparchia(loadedKmlData.eparchia || "");
                        setDimos(loadedKmlData.dimos || "");
                        if (loadedKmlData.dimos_vil_code && loadedKmlData.dimos_dist_code) {
                            setSelectedRegionCodes({
                                vilCode: loadedKmlData.dimos_vil_code,
                                distCode: loadedKmlData.dimos_dist_code
                            });
                        }
                        setEnoria(loadedKmlData.enoria || "");
                        setFyllo(loadedKmlData.fyllo || "");
                        setSxedio(loadedKmlData.sxedio || "");
                        setTmima(loadedKmlData.tmima || "");
                        setArithmosTemaxiou(loadedKmlData.arithmos_temaxiou || "");
                        injectKmlIntoVariables(loadedKmlData);
                    } else {
                        setKmlData({});
                        // Reset form fields
                        setEparchia("");
                        setDimos("");
                        setEnoria("");
                        setFyllo("");
                        setSxedio("");
                        setTmima("");
                        setArithmosTemaxiou("");
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
    // Skip generation if template has previewPdfPath (use stored preview instead)
    useEffect(() => {
        if (selectedTemplate && step === 1) {
            // Only generate preview if template doesn't have a stored preview PDF
            // If previewPdfPath exists, the UI will display it directly without generation
            const hasPreviewPath = selectedTemplate.previewPdfPath && String(selectedTemplate.previewPdfPath).trim().length > 0;
            if (hasPreviewPath) {
                console.log('[Preview] Using stored preview PDF:', selectedTemplate.previewPdfPath, 'for template:', selectedTemplate.name);
            } else {
                refreshPdfPreview();
            }
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

    useEffect(() => {
        // Load appendix list for preview when in preview step
        const shouldPreview = selectedTemplate && (selectedTemplate.requiresKml ? step === 4 : step === 3);
        if (!reportId || !shouldPreview) return;
        (async () => {
            try {
                const list = await (reportApi.listAppendix as any)(reportId);
                setAppendixPreviewItems(Array.isArray(list) ? list : []);
            } catch (_) {
                setAppendixPreviewItems([]);
            }
        })();
    }, [reportId, step, selectedTemplate]);

    const generateId = () => Math.random().toString(36).slice(2);

    // Returns a stable key for a variable across repeated occurrences
    const getCanonicalVarKeyFromImported = (imp: ImportedVariable) => {
        const t = (imp as any)?.type as string | undefined;
        if (t === 'kml' && (imp as any)?.kmlField) return `kml:${String((imp as any).kmlField)}`;
        return String((imp as any)?.name || (imp as any)?.id || '');
    };

    // Given a canonical key, find any legacy per-instance variable ids for this variable
    const getLegacyIdsForKey = (variableKey: string): string[] => {
        const out: string[] = [];
        const tplVars = (selectedTemplate as any)?.variables as Array<any> | undefined;
        if (!Array.isArray(tplVars)) return out;
        // kml:<field> maps to all imported variables with same kmlField
        const kmlMatch = variableKey.startsWith('kml:') ? variableKey.slice(4) : null;
        tplVars.forEach(v => {
            if (!v) return;
            if (kmlMatch) {
                if ((v as any).type === 'kml' && String((v as any).kmlField) === kmlMatch) out.push(String((v as any).id));
            } else {
                if (String((v as any).name) === variableKey) out.push(String((v as any).id));
            }
        });
        return out;
    };

    const getMergedUserSnippets = (variableKey: string) => {
        const arr = userTemplate?.variableTextTemplates || [];
        const legacyIds = getLegacyIdsForKey(variableKey);
        const buckets = arr.filter(v => v.variableId === variableKey || legacyIds.includes(v.variableId));
        if (buckets.length === 0) return null;
        const merged = buckets.flatMap(b => b.snippets || []);
        return { variableId: variableKey, snippets: merged } as { variableId: string; snippets: Array<{ id: string; text: string }> };
    };

    const getMergedUserSelectOptions = (variableKey: string) => {
        const arr = (userTemplate as any)?.variableSelectOptions || [];
        const legacyIds = getLegacyIdsForKey(variableKey);
        const buckets = arr.filter((v: any) => v.variableId === variableKey || legacyIds.includes(v.variableId));
        if (buckets.length === 0) return null;
        const merged = ([] as Array<{ id: string; value: string }>).concat(...buckets.map((b: any) => b.options || []));
        return { variableId: variableKey, options: merged } as { variableId: string; options: Array<{ id: string; value: string }> };
    };

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
        return getMergedUserSnippets(variableId);
    };

    const getUserSelectOptionsForVar = (variableId: string) => {
        return getMergedUserSelectOptions(variableId);
    };

    const upsertUserVarSnippets = async (variableId: string, updater: (curr: { variableId: string; snippets: Array<{ id: string; text: string }> } | null) => { variableId: string; snippets: Array<{ id: string; text: string }> }) => {
        if (!userTemplate) return;
        const current = getUserSnippetsForVar(variableId);
        const nextEntry = updater(current ? { variableId: current.variableId, snippets: [...current.snippets] } : null);
        const legacyIds = getLegacyIdsForKey(variableId);
        const exclude = new Set<string>([variableId, ...legacyIds]);
        const others = (userTemplate.variableTextTemplates || []).filter(v => !exclude.has(v.variableId));
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
        const legacyIds = getLegacyIdsForKey(variableId);
        const exclude = new Set<string>([variableId, ...legacyIds]);
        const others = ((userTemplate as any).variableSelectOptions || []).filter((v: any) => !exclude.has(v.variableId));
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
    // Only generate if template doesn't have previewPdfPath OR if user has filled values
    useEffect(() => {
        if (step !== 1) return;
        if (!selectedTemplate) return;

        // If template has stored preview PDF, check if user has filled any values
        // Only generate new preview if values have been filled (not just template selection)
        const hasPreviewPath = selectedTemplate.previewPdfPath && String(selectedTemplate.previewPdfPath).trim().length > 0;
        if (hasPreviewPath) {
            const hasValues = Object.keys(variableValues).some(key => {
                const value = variableValues[key];
                return value && String(value).trim().length > 0;
            });
            // Skip generation if no values are filled - use stored preview
            if (!hasValues) {
                return;
            }
        }

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
        try {
            setLoading(true);
            if (reportId) {
                // Use report-based preview to include appendix items
                const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
                const url = `${base}/reports/${encodeURIComponent(reportId)}/preview-pdf`;
                // Attach Authorization header
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                try {
                    const raw = localStorage.getItem('auth');
                    if (raw) {
                        const a = JSON.parse(raw);
                        if (a?.token) headers['Authorization'] = `Bearer ${a.token}`;
                    }
                } catch { }
                const res = await fetch(url, { method: 'POST', headers });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new ApiError(res.status, data.message || 'Preview failed');
                }
                const blob = await res.blob();
                setPdfBlob(blob);
                if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
                const obj = URL.createObjectURL(blob);
                setPdfPreviewUrl(obj);
            } else {
                // Fallback: template-based preview (no appendix)
                if (!selectedTemplate) return;
                const id = (selectedTemplate._id || (selectedTemplate as any).id) as string;
                const blob = await templateApi.generate(id, variableValues, 'pdf', selectedTemplate?.requiresKml ? kmlData : undefined);
                setPdfBlob(blob);
                if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
                const obj = URL.createObjectURL(blob);
                setPdfPreviewUrl(obj);
            }
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

            {/* Step 2: KML Data Entry (only if template requires KML) */}
            {selectedTemplate && selectedTemplate.requiresKml && step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Enter KML Data</CardTitle>
                        <CardDescription>
                            Fill in the cadastral information. Values will be fetched from the API.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column: All form fields */}
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <Label htmlFor="eparchia">Επαρχία (Province)</Label>
                                    <Popover open={eparchiaOpen} onOpenChange={setEparchiaOpen}>
                                        <PopoverTrigger asChild>
                                            <div className="relative">
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={eparchiaOpen}
                                                    className="w-full justify-between bg-gray-100"
                                                >
                                                    {eparchia
                                                        ? eparchiaOptions.find((option) => option.code === eparchia)?.name
                                                        : "Επαρχία..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                                {eparchia && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent z-10"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            clearEparchia();
                                                        }}
                                                    >
                                                        <X className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                )}
                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Αναζήτηση επαρχίας..." />
                                                <CommandList>
                                                    <CommandEmpty>Δεν βρέθηκε επαρχία.</CommandEmpty>
                                                    <CommandGroup>
                                                        {eparchiaOptions.map((option) => (
                                                            <CommandItem
                                                                key={option.code}
                                                                value={option.name}
                                                                onSelect={() => {
                                                                    setEparchia(option.code === eparchia ? "" : option.code);
                                                                    setEparchiaOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={`mr-2 h-4 w-4 ${
                                                                        eparchia === option.code ? "opacity-100" : "opacity-0"
                                                                    }`}
                                                                />
                                                                {option.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="dimos">Περιοχή (Region)</Label>
                                    <Popover open={dimosOpen} onOpenChange={setDimosOpen}>
                                        <PopoverTrigger asChild>
                                            <div className="relative">
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={dimosOpen}
                                                    className="w-full justify-between bg-gray-100"
                                                    disabled={!eparchia || dimosOptions.length === 0}
                                                >
                                                    {dimos
                                                        ? dimosOptions.find((option) => option.name === dimos)?.name
                                                        : "Περιοχή..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                                {dimos && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent z-10"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            clearDimos();
                                                        }}
                                                    >
                                                        <X className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                )}
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Αναζήτηση περιοχής..." />
                                                <CommandList>
                                                    <CommandEmpty>Δεν βρέθηκε περιοχή.</CommandEmpty>
                                                    <CommandGroup>
                                                        {dimosOptions.map((option) => (
                                                            <CommandItem
                                                                key={`${option.vilCode}-${option.distCode}`}
                                                                value={option.name}
                                                                onSelect={() => {
                                                                    const newDimos = option.name === dimos ? "" : option.name;
                                                                    const newCodes = newDimos ? {
                                                                        vilCode: option.vilCode,
                                                                        distCode: option.distCode
                                                                    } : null;
                                                                    console.log('Region selected:', { newDimos, newCodes });
                                                                    setDimos(newDimos);
                                                                    setSelectedRegionCodes(newCodes);
                                                                    setDimosOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={`mr-2 h-4 w-4 ${
                                                                        dimos === option.name ? "opacity-100" : "opacity-0"
                                                                    }`}
                                                                />
                                                                {option.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                            </div>

                                <div className="space-y-3">
                                    <Label htmlFor="enoria">Ενορία (Parish)</Label>
                                    <Popover open={false} onOpenChange={() => {}}>
                                        <PopoverTrigger asChild>
                                            <div className="relative">
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={false}
                                                    className="w-full justify-between bg-gray-100"
                                                    disabled={true}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    {enoria || "Ενορία..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Αναζήτηση ενορίας..." />
                                                <CommandList>
                                                    <CommandEmpty>Δεν βρέθηκε ενορία.</CommandEmpty>
                                                    <CommandGroup>
                                                        {enoriaOptions.map((option) => (
                                                            <CommandItem
                                                                key={option}
                                                                value={option}
                                                                onSelect={() => {
                                                                    setEnoria(option === enoria ? "" : option);
                                                                    setEnoriaOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={`mr-2 h-4 w-4 ${
                                                                        enoria === option ? "opacity-100" : "opacity-0"
                                                                    }`}
                                                                />
                                                                {option}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Sheet, Plan, and Section in one row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                    <div className="space-y-3 w-full">
                                        <Label htmlFor="fyllo">Φύλλο (Sheet)</Label>
                                        <div className="relative w-full">
                                            <Select
                                                value={fyllo}
                                                onValueChange={setFyllo}
                                                disabled={!dimos}
                                            >
                                                <SelectTrigger id="fyllo" className="bg-gray-100 w-full">
                                                    <SelectValue placeholder="Φύλλο..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {fylloOptions.map((option) => (
                                                        <SelectItem key={option} value={option}>
                                                            {option}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {fyllo && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        clearFyllo();
                                                    }}
                                                >
                                                    <X className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            )}
                            </div>
                                    </div>

                                    <div className="space-y-3 w-full">
                                        <Label htmlFor="sxedio">Σχέδιο (Plan)</Label>
                                        <div className="relative w-full">
                                            <Select
                                                value={sxedio}
                                                onValueChange={setSxedio}
                                                disabled={!fyllo}
                                            >
                                                <SelectTrigger id="sxedio" className="bg-gray-100 w-full">
                                                    <SelectValue placeholder="Σχέδιο..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sxedioOptions.map((option) => (
                                                        <SelectItem key={option} value={option}>
                                                            {option}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {sxedio && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        clearSxedio();
                                                    }}
                                                >
                                                    <X className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3 w-full">
                                        <Label htmlFor="tmima">Τμήμα (Section)</Label>
                                        <div className="relative w-full">
                                            <Select
                                                value={tmima}
                                                onValueChange={() => {}}
                                                disabled={true}
                                            >
                                                <SelectTrigger id="tmima" className="bg-gray-100 w-full">
                                                    <SelectValue placeholder="Τμήμα..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tmimaOptions.map((option) => (
                                                        <SelectItem key={option} value={option}>
                                                            {option}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="arithmos-temaxiou">Αριθμός Τεμαχίου (Parcel Number)</Label>
                                    <div className="relative">
                                        <Input
                                            id="arithmos-temaxiou"
                                            type="text"
                                            placeholder="Αριθμός Τεμαχίου..."
                                            value={arithmosTemaxiou}
                                            onChange={(e) => setArithmosTemaxiou(e.target.value)}
                                            className="bg-gray-100 pr-8"
                                        />
                                        {arithmosTemaxiou && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                                                onClick={() => setArithmosTemaxiou("")}
                                            >
                                                <X className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Find Button */}
                                <div className="flex justify-start pt-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span>
                                                    <Button
                                                        onClick={async () => {
                                                            // TODO: Connect to API endpoint
                                                            const formData = buildKmlDataFromForm();
                                                            console.log('Form data to submit:', formData);
                                                            toast.info('Form submission - API integration pending');
                                                            // Placeholder for API call:
                                                            // const response = await fetch('/api/kml-data', { method: 'POST', body: JSON.stringify(formData) });
                                                        }}
                                                        disabled={!eparchia || !dimos || !fyllo || !sxedio || !arithmosTemaxiou}
                                                    >
                                                        <Search className="mr-2 h-4 w-4" />
                                                        Find
                                                    </Button>
                                                </span>
                                            </TooltipTrigger>
                                            {(!eparchia || !dimos || !fyllo || !sxedio || !arithmosTemaxiou) && (
                                                <TooltipContent>
                                                    <p>Please fill in all required fields</p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>

                            {/* Right Column: Reserved for API information display */}
                            <div className="space-y-4">
                                {/* API information will be displayed here */}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* PDF Upload Section (appears after KML upload) */}
            {selectedTemplate && selectedTemplate.requiresKml && step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Upload PDF</CardTitle>
                        <CardDescription>
                            Extract values from a PDF and save it to the report.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfSelect} />
                        {Object.keys(pdfExtractedValues).length === 0 && (
                            <div
                                onDragOver={(e) => { e.preventDefault(); }}
                                onDrop={handlePdfDrop}
                                className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer"
                                onClick={() => pdfInputRef.current?.click()}
                            >
                                {isExtractingPdf ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <p className="text-sm text-muted-foreground">Extracting values from PDF...</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Drop PDF here or click to select</p>
                                )}
                            </div>
                        )}
                        {Object.keys(pdfExtractedValues).length > 0 && (
                            <div className="mt-4 p-4 bg-muted rounded-md">
                                <div className="text-sm">
                                    <div className="text-muted-foreground mb-2">Extracted Values:</div>
                                    <div className="space-y-1">
                                        {Object.entries(pdfExtractedValues).map(([label, value]) => (
                                            <div key={label} className="pl-2">
                                                <span className="font-medium">{label}:</span>{' '}
                                                <span className="break-words">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {Object.keys(pdfExtractedValues).length > 0 && (
                            <div className="mt-6">
                                <Button variant="outline" onClick={() => pdfInputRef.current?.click()} disabled={isExtractingPdf}>
                                    Upload another PDF
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Continue button for KML templates (appears after both KML and PDF sections) */}
            {selectedTemplate && selectedTemplate.requiresKml && step === 2 && (
                <div className="flex justify-end mt-6">
                    <Button onClick={async () => {
                        const id = await createReportIfNeeded();
                        if (!id) return toast.error('Failed to save report');
                        try {
                            await reportApi.update(id, {
                                kmlData,
                                values: {
                                    ...variableValues,
                                    ...pdfExtractedValues
                                }
                            });
                        } catch { }
                        setStep(3);
                    }} disabled={isExtractingPdf}>
                        Continue
                    </Button>
                </div>
            )}

            {/* PDF Upload Section for non-KML templates */}
            {selectedTemplate && !selectedTemplate.requiresKml && step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Upload PDF</CardTitle>
                        <CardDescription>
                            Extract value from PDF and save it to the report.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfSelect} />
                        {Object.keys(pdfExtractedValues).length === 0 && (
                            <div
                                onDragOver={(e) => { e.preventDefault(); }}
                                onDrop={handlePdfDrop}
                                className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer"
                                onClick={() => pdfInputRef.current?.click()}
                            >
                                {isExtractingPdf ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <p className="text-sm text-muted-foreground">Extracting value from PDF...</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Drop PDF here or click to select</p>
                                )}
                            </div>
                        )}
                        {Object.keys(pdfExtractedValues).length > 0 && (
                            <div className="mt-4 p-4 bg-muted rounded-md">
                                <div className="text-sm">
                                    <div className="text-muted-foreground mb-2">Extracted Values:</div>
                                    <div className="space-y-1">
                                        {Object.entries(pdfExtractedValues).map(([label, value]) => (
                                            <div key={label} className="pl-2">
                                                <span className="font-medium">{label}:</span>{' '}
                                                <span className="break-words">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
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
                                                        <div className="flex items-center gap-2">
                                                            <Label htmlFor={variableName}>
                                                                {label}
                                                                {imp.isRequired && <span className="text-destructive ml-1">*</span>}
                                                            </Label>
                                                            {label && label.toLowerCase() === 'table of comparative sales photo' && (
                                                                <a href="https://landator.com/evaluate/offline#/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline">
                                                                    <ExternalLink className="h-4 w-4" />
                                                                </a>
                                                            )}
                                                        </div>
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
                                                                            const canonicalKey = getCanonicalVarKeyFromImported(imp);
                                                                            const u = getUserSnippetsForVar(canonicalKey);
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
                                                                                                <button className="text-xs text-destructive" onClick={(e) => { e.stopPropagation(); deleteSnippetForVar(canonicalKey, sn.id); }}>
                                                                                                    <Trash2 className="h-4 w-4" />
                                                                                                </button>
                                                                                            </DropdownMenuItem>
                                                                                            {idx < items.length - 1 && <DropdownMenuSeparator />}
                                                                                        </div>
                                                                                    ))}
                                                                                    <div className="h-px bg-border my-1" />
                                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setNewTplForVarId(canonicalKey); setNewTplForVarName(variableName); setNewTplText(String(variableValues[variableName] || '')); }}>
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
                                                                            const canonicalKey = getCanonicalVarKeyFromImported(imp);
                                                                            const u = getUserSelectOptionsForVar(canonicalKey);
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
                                                                                                const canonicalKey = getCanonicalVarKeyFromImported(imp);
                                                                                                upsertUserVarSelectOptions(canonicalKey, (curr) => {
                                                                                                    const base = curr || { variableId: canonicalKey, options: [] };
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
                                                                                                const canonicalKey = getCanonicalVarKeyFromImported(imp);
                                                                                                upsertUserVarSelectOptions(canonicalKey, (curr) => {
                                                                                                    const base = curr || { variableId: canonicalKey, options: [] };
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
                                                                                            const canonicalKey = getCanonicalVarKeyFromImported(imp);
                                                                                            upsertUserVarSelectOptions(canonicalKey, (curr) => {
                                                                                                const base = curr || { variableId: canonicalKey, options: [] };
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
                                                                    const canonicalKey = getCanonicalVarKeyFromImported(imp);
                                                                    const u = getUserSelectOptionsForVar(canonicalKey);
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
                                                            {variableValues[variableName] && (
                                                                <div className="flex items-center gap-2">
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <a href={resolveUploadsUrl(variableValues[variableName])} target="_blank" rel="noreferrer">
                                                                                    <img
                                                                                        src={resolveUploadsUrl(variableValues[variableName])}
                                                                                        alt={`${label || variableName} preview`}
                                                                                        className="h-24 w-24 rounded border object-cover"
                                                                                    />
                                                                                </a>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>Show Photo</TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                {/* Hidden native input to avoid showing 'No file selected' */}
                                                                <Input id={`${variableName}-file`} type="file" accept="image/*" className="hidden" onChange={async (e) => {
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
                                                                    const el = document.getElementById(`${variableName}-file`) as HTMLInputElement | null;
                                                                    el?.click();
                                                                }}>
                                                                    {variableValues[variableName] ? 'Change Photo' : 'Choose file'}
                                                                </Button>
                                                                {variableValues[variableName] && (
                                                                    <Button variant="outline" size="sm" type="button" onClick={() => {
                                                                        setImageEditorFor(variableName);
                                                                        setImageEditorInitialUrl(resolveUploadsUrl(variableValues[variableName] || undefined));
                                                                    }}>Edit image</Button>
                                                                )}
                                                                {variableValues[variableName] && (
                                                                    <Button variant="destructive" size="sm" type="button" onClick={() => {
                                                                        setRemoveImageVar(variableName);
                                                                    }}>
                                                                        Remove
                                                                    </Button>
                                                                )}
                                                                {variableValues[variableName] ? null : (
                                                                    <span className="text-xs text-muted-foreground">No file selected</span>
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
                                                    ) : (imp as any).type === 'date' ? (
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                id={variableName}
                                                                type="date"
                                                                value={variableValues[variableName] || ''}
                                                                onChange={(e) => handleVariableChange(variableName, e.target.value)}
                                                                required={imp.isRequired}
                                                                placeholder="DD/MM/YYYY"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                aria-label="Pick date"
                                                                onClick={() => {
                                                                    const el = document.getElementById(variableName) as HTMLInputElement | null;
                                                                    if (!el) return;
                                                                    try {
                                                                        const anyEl = el as any;
                                                                        if (typeof anyEl.showPicker === 'function') anyEl.showPicker();
                                                                        else { el.focus(); el.click(); }
                                                                    } catch { el.focus(); }
                                                                }}
                                                            >
                                                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                                            </Button>
                                                        </div>
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
                                                    <div className="flex items-center gap-2">
                                                        <Label htmlFor={variableName}>
                                                            {label}
                                                            {(cb as any).isRequired && <span className="text-destructive ml-1">*</span>}
                                                        </Label>
                                                        {label && label.toLowerCase() === 'table of comparative sales photo' && (
                                                            <a href="https://landator.com/evaluate/offline#/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline">
                                                                <ExternalLink className="h-4 w-4" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    {/* Admin 'Insert from template' removed */}
                                                </div>
                                                {(cb as any).description && (
                                                    <p className="text-xs text-muted-foreground">{(cb as any).description}</p>
                                                )}
                                                {variableType === 'date' ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            id={variableName}
                                                            type="date"
                                                            value={variableValues[variableName] || ''}
                                                            onChange={(e) => handleVariableChange(variableName, e.target.value)}
                                                            required={(cb as any).isRequired}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            aria-label="Pick date"
                                                            onClick={() => {
                                                                const el = document.getElementById(variableName) as HTMLInputElement | null;
                                                                if (!el) return;
                                                                try {
                                                                    const anyEl = el as any;
                                                                    if (typeof anyEl.showPicker === 'function') anyEl.showPicker();
                                                                    else { el.focus(); el.click(); }
                                                                } catch { el.focus(); }
                                                            }}
                                                        >
                                                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </div>
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
                        {/* Appendix section */}
                        <AppendixManager reportId={reportId} onUploadingChange={setIsUploadingAppendix} />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="outline"
                                disabled={isUploadingAppendix}
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
                                disabled={isPreviewing || isUploadingAppendix}
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

            {/* Confirm remove image */}
            <AlertDialog open={!!removeImageVar} onOpenChange={(open) => { if (!open) setRemoveImageVar(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove photo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the selected photo from this report. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRemoveImageVar(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (!removeImageVar) return;
                                handleVariableChange(removeImageVar, "");
                                setRemoveImageVar(null);
                                toast.success("Photo removed");
                            }}
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Create New Template Modal */}
            <Dialog open={!!newTplForVarId} onOpenChange={(open) => { if (!open) { setNewTplForVarId(null); setNewTplText(""); setNewTplForVarName(""); } }}>
                <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Create new template</DialogTitle>
                        <DialogDescription>Save your current text as a reusable template for this variable.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 overflow-auto min-h-0 pr-1">
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
                                    {/* Appendix preview list */}
                                    {appendixPreviewItems.length > 0 && (
                                        <div className="mt-6">
                                            <div className="text-sm font-medium mb-2">Appendix</div>
                                            <ol className="space-y-2 list-decimal list-inside">
                                                {appendixPreviewItems
                                                    .slice()
                                                    .sort((a: any, b: any) => (Number(a.order || 0) - Number(b.order || 0)))
                                                    .map((it: any, idx: number) => (
                                                        <li key={String(it._id)} className="flex items-center gap-3">
                                                            <div className="w-12 h-12 bg-muted rounded overflow-hidden flex items-center justify-center">
                                                                {(() => {
                                                                    const url = (() => {
                                                                        const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
                                                                        const path = it.thumbPath || it.originalPath;
                                                                        if (!path) return '';
                                                                        return path.startsWith('/') ? base + path : base + '/' + path;
                                                                    })();
                                                                    if (url) return (
                                                                        // eslint-disable-next-line @next/next/no-img-element
                                                                        <img src={url} className="object-cover w-full h-full" alt={it.originalName || it.kind} />
                                                                    );
                                                                    return <div className="text-xs text-muted-foreground">No preview</div>;
                                                                })()}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {(it.originalName || (it.kind === 'pdf' ? 'PDF' : 'Image'))} {it.pageCount ? `(${it.pageCount} ${it.pageCount === 1 ? 'Page' : 'Pages'})` : ''}
                                                            </div>
                                                        </li>
                                                    ))}
                                            </ol>
                                        </div>
                                    )}
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
