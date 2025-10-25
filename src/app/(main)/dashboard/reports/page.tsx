"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { FileText, Loader2, Download, Edit, ChevronRight, Trash2, MoreVertical } from "lucide-react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { reportApi, ApiError } from "@/lib/api";

interface ReportItem {
    _id: string;
    templateId: string;
    templateName?: string;
    name?: string;
    title?: string;
    status?: string;
    checklistStatus?: 'empty' | 'partial' | 'complete';
    checklistProgress?: Array<{ id: string; checked: boolean }>;
    values: Record<string, any>;
    kmlData?: Record<string, any>;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

export default function ReportsPage() {
    const router = useRouter();
    const [reports, setReports] = useState<ReportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [downloading, setDownloading] = useState<{ id: string; type: "pdf" | "docx" } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [bankInfoReport, setBankInfoReport] = useState<ReportItem | null>(null);
    const [renamingReport, setRenamingReport] = useState<ReportItem | null>(null);
    const [renameTitle, setRenameTitle] = useState<string>("");
    const [renaming, setRenaming] = useState<boolean>(false);
    const STATUS_FLOW = ["Draft", "Initial Review", "Final Review", "Submitted"] as const;
    type ReportStatus = typeof STATUS_FLOW[number];
    const nextStatus = (s?: string) => {
        const idx = STATUS_FLOW.indexOf((s as ReportStatus) ?? "Draft");
        return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
    };

    const handleCopy = async (label: string, value: string) => {
        try {
            if (!value) return;
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
        } catch (_) {
            toast.error("Copy failed");
        }
    };

    const formatDateYmd = (iso: string) => {
        const d = new Date(iso);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}/${m}/${day}`;
    };

    const loadReports = async () => {
        try {
            setLoading(true);
            const data = await reportApi.getAll();
            setReports(data as ReportItem[]);
        } catch (error) {
            if (error instanceof ApiError) toast.error(error.message);
            else toast.error("Failed to load reports");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const filtered = reports.filter((r) => {
        const name = r.name ?? "Untitled Report";
        return name.toLowerCase().includes(search.toLowerCase());
    });

    const download = async (report: ReportItem, type: "pdf" | "docx") => {
        try {
            setDownloading({ id: report._id, type });
            const blob = await reportApi.generate(report._id, type);
            const rawTitle = (report.title ?? report.name ?? "report").trim();
            const safeBase = rawTitle
                .replace(/[\\/:*?"<>|]+/g, "")
                .replace(/\s+/g, "_")
                .replace(/_+/g, "_")
                .replace(/^_+|_+$/g, "");
            const filename = `${safeBase || "report"}.${type}`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            if (error instanceof ApiError) toast.error(error.message);
            else toast.error("Download failed");
        } finally {
            setDownloading(null);
            loadReports();
        }
    };

    const advanceStatus = async (report: ReportItem) => {
        try {
            const next = nextStatus(report.status);
            if (!next) return;
            const updated = await reportApi.update(report._id, { status: next });
            const updatedReport = updated as ReportItem;
            setReports((prev) => prev.map((r) => (r._id === report._id ? { ...r, status: updatedReport.status } : r)));
            toast.success(`Status advanced to ${next}`);
        } catch (error) {
            if (error instanceof ApiError) toast.error(error.message);
            else toast.error("Failed to update status");
        }
    };

    const canDelete = (r: ReportItem) => (r.status ?? "Draft") !== "Submitted";

    const onConfirmDelete = async (id: string) => {
        try {
            setDeletingId(id);
            await reportApi.delete(id);
            setReports((prev) => prev.filter((r) => r._id !== id));
            toast.success("Report deleted");
        } catch (error) {
            if (error instanceof ApiError) toast.error(error.message);
            else toast.error("Failed to delete report");
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    const getReportField = (r: ReportItem | null, key: string): string => {
        if (!r) return "";
        const v = (r.values && (r.values as Record<string, unknown>)[key]) ?? (r.kmlData && (r.kmlData as Record<string, unknown>)[key]) ?? "";
        return String(v ?? "");
    };

    return (
        <div className="@container/main flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                <p className="text-muted-foreground">View and edit saved report entries.</p>
            </div>

            <div className="flex items-center justify-between gap-2">
                <div className="relative">
                    <Input
                        placeholder="Search reports..."
                        className="w-[300px]"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Loading reports...</span>
                    </div>
                </div>
            )}

            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((r) => (
                        <Card key={r._id} className="group hover:shadow-md transition-shadow h-full flex flex-col">
                            <CardHeader className="pb-3">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-2">
                                            {(() => {
                                                const status = r.checklistStatus || 'empty';
                                                const hasItems = Array.isArray(r.checklistProgress) && r.checklistProgress.length > 0;
                                                const color =
                                                    status === 'complete' ? 'bg-emerald-500' :
                                                        status === 'partial' ? 'bg-yellow-500' :
                                                            // status === 'empty'
                                                            hasItems ? 'bg-red-500' : 'bg-gray-400';
                                                return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} title={status} />;
                                            })()}
                                            <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-medium">
                                                {r.status ?? "Draft"}
                                            </span>
                                        </span>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {((r.status ?? "Draft") === "Submitted") ? (
                                                    <DropdownMenuItem
                                                        onClick={() => setBankInfoReport(r)}
                                                    >
                                                        <FileText className="h-4 w-4 mr-2" /> Bank Information
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center px-2 py-1.5 text-sm text-muted-foreground cursor-not-allowed">
                                                                    <FileText className="h-4 w-4 mr-2" /> Bank Information
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Available only for Submitted reports.</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                                {(() => {
                                                    const canAdvance = !!nextStatus(r.status);
                                                    return (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setRenamingReport(r);
                                                                    setRenameTitle((r.title ?? r.name ?? "").trim());
                                                                }}
                                                            >
                                                                <Edit className="h-4 w-4 mr-2" /> Rename
                                                            </DropdownMenuItem>
                                                            {canAdvance ? (
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        const nxt = nextStatus(r.status);
                                                                        if (!nxt) return;
                                                                        advanceStatus(r);
                                                                    }}
                                                                >
                                                                    <ChevronRight className="h-4 w-4 mr-2" /> Advance Status
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="flex items-center px-2 py-1.5 text-sm text-muted-foreground cursor-not-allowed">
                                                                                <ChevronRight className="h-4 w-4 mr-2" /> Advance Status
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Submitted reports cannot be advanced.</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}

                                                            {deletingId === r._id ? (
                                                                <div className="flex items-center px-2 py-1.5 text-sm text-muted-foreground">
                                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...
                                                                </div>
                                                            ) : canDelete(r) ? (
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        setConfirmDeleteId(r._id);
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="flex items-center px-2 py-1.5 text-sm text-muted-foreground cursor-not-allowed">
                                                                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Submitted reports cannot be deleted.</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="overflow-hidden">
                                        <CardTitle className="text-lg break-words whitespace-normal">
                                            {r.title ?? r.name ?? "Untitled Report"}
                                        </CardTitle>
                                    </div>

                                    <CardDescription>
                                        {(() => {
                                            const d = new Date(r.createdAt);
                                            const ds = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
                                            return `${r.templateName ? r.templateName + ' • ' : ''}Created ${ds}`;
                                        })()}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="mt-auto">
                                <Separator className="my-4" />
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/templates/fill?reportId=${r._id}`)}>
                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                    </Button>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm" disabled={!!downloading || !["Final Review", "Submitted"].includes((r.status ?? "Draft"))}>
                                                                {downloading?.id === r._id ? (
                                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                ) : (
                                                                    <Download className="h-4 w-4 mr-2" />
                                                                )}
                                                                Download
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => download(r, "pdf")} disabled={!!downloading}>PDF</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => download(r, "docx")} disabled={!!downloading}>DOCX</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TooltipTrigger>
                                            {!["Final Review", "Submitted"].includes((r.status ?? "Draft")) && (
                                                <TooltipContent>
                                                    <p>This report cannot be exported before it is checked (move to Final Review).</p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {!loading && filtered.length === 0 && (
                <Card className="text-center py-12">
                    <CardContent>
                        <div className="space-y-4">
                            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                                <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">No reports found</h3>
                                <p className="text-muted-foreground">Create a report from a template to see it here.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Confirm delete dialog */}
            <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this report?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The report will be permanently removed if it is not Submitted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => confirmDeleteId && onConfirmDelete(confirmDeleteId)} disabled={!!deletingId}>
                            {deletingId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bank Information dialog */}
            <Dialog open={!!bankInfoReport} onOpenChange={(open) => { if (!open) setBankInfoReport(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bank Information</DialogTitle>
                        <DialogDescription>Click a value to copy it to clipboard.</DialogDescription>
                    </DialogHeader>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Field</TableHead>
                                    <TableHead>Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Municipality</TableCell>
                                    <TableCell
                                        className="cursor-pointer select-text"
                                        onClick={() => handleCopy("Municipality", getReportField(bankInfoReport, "municipality"))}
                                    >
                                        {getReportField(bankInfoReport, "municipality") || "-"}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Coordinates</TableCell>
                                    <TableCell
                                        className="cursor-pointer select-text"
                                        onClick={() => handleCopy("Coordinates", getReportField(bankInfoReport, "coordinates"))}
                                    >
                                        {getReportField(bankInfoReport, "coordinates") || "-"}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Report Creation Date</TableCell>
                                    <TableCell
                                        className="cursor-pointer select-text"
                                        onClick={() => handleCopy("Report Creation Date", bankInfoReport ? formatDateYmd(bankInfoReport.createdAt) : "")}
                                    >
                                        {bankInfoReport ? formatDateYmd(bankInfoReport.createdAt) : "-"}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Value 2018</TableCell>
                                    <TableCell
                                        className="cursor-pointer select-text"
                                        onClick={() => handleCopy("Value 2018", getReportField(bankInfoReport, "value_2018"))}
                                    >
                                        {getReportField(bankInfoReport, "value_2018") || "-"}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Value 2021</TableCell>
                                    <TableCell
                                        className="cursor-pointer select-text"
                                        onClick={() => handleCopy("Value 2021", getReportField(bankInfoReport, "value_2021"))}
                                    >
                                        {getReportField(bankInfoReport, "value_2021") || "-"}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBankInfoReport(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename report dialog */}
            <Dialog open={!!renamingReport} onOpenChange={(open) => { if (!open) { setRenamingReport(null); setRenameTitle(""); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Report</DialogTitle>
                        <DialogDescription>Enter a new name for your report.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input
                            placeholder="Report title"
                            value={renameTitle}
                            onChange={(e) => setRenameTitle(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setRenamingReport(null); setRenameTitle(""); }}>Cancel</Button>
                        <Button
                            onClick={async () => {
                                if (!renamingReport) return;
                                const newTitle = (renameTitle || "").trim();
                                if (!newTitle) { toast.error('Enter a report title'); return; }
                                try {
                                    setRenaming(true);
                                    const updated = await reportApi.update(renamingReport._id, { title: newTitle });
                                    const u = updated as any;
                                    setReports((prev) => prev.map((r) => r._id === renamingReport._id ? { ...r, title: u.title, name: u.name ?? r.name } : r));
                                    toast.success('Report renamed');
                                    setRenamingReport(null);
                                    setRenameTitle("");
                                } catch (error) {
                                    if (error instanceof ApiError) toast.error(error.message);
                                    else toast.error('Rename failed');
                                } finally {
                                    setRenaming(false);
                                }
                            }}
                            disabled={renaming}
                        >
                            {renaming ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>) : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

