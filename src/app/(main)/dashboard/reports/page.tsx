"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, Download, Edit, ChevronRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

import { reportApi, ApiError } from "@/lib/api";

interface ReportItem {
    _id: string;
    templateId: string;
    templateName?: string;
    name?: string;
    title?: string;
    status?: string;
    values: Record<string, any>;
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
    const STATUS_FLOW = ["Draft", "Initial Review", "Final Review", "Submitted"] as const;
    type ReportStatus = typeof STATUS_FLOW[number];
    const nextStatus = (s?: string) => {
        const idx = STATUS_FLOW.indexOf((s as ReportStatus) || "Draft");
        return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
    };

    const loadReports = async () => {
        try {
            setLoading(true);
            const data = await reportApi.getAll();
            setReports(data as any);
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
        const name = r.name || "Untitled Report";
        return name.toLowerCase().includes(search.toLowerCase());
    });

    const download = async (report: ReportItem, type: "pdf" | "docx") => {
        try {
            setDownloading({ id: report._id, type });
            const blob = await reportApi.generate(report._id, type);
            const rawTitle = (report.title || report.name || "report").trim();
            const safeBase = rawTitle
                .replace(/[\\\/:*?"<>|]+/g, "") // remove invalid filename chars
                .replace(/\s+/g, "_") // replace whitespace with underscores
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
            // Refresh to reflect potential auto-submitted status
            loadReports();
        }
    };

    const advanceStatus = async (report: ReportItem) => {
        try {
            const next = nextStatus(report.status);
            if (!next) return;
            const updated = await reportApi.update(report._id, { status: next });
            setReports((prev) => prev.map((r) => (r._id === report._id ? { ...r, status: (updated as any).status } : r)));
            toast.success(`Status advanced to ${next}`);
        } catch (error) {
            if (error instanceof ApiError) toast.error(error.message);
            else toast.error("Failed to update status");
        }
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
                                    <div className="flex items-center justify-between gap-2">
                                        <CardTitle className="text-lg truncate">{r.title || r.name || "Untitled Report"}</CardTitle>
                                        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-medium">
                                            {r.status || "Draft"}
                                        </span>
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
                                                            <Button variant="outline" size="sm" disabled={!!downloading || !["Final Review", "Submitted"].includes(r.status || "Draft")}>
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
                                            {!["Final Review", "Submitted"].includes(r.status || "Draft") && (
                                                <TooltipContent>
                                                    <p>This report cannot be exported before it is checked (move to Final Review).</p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                    {nextStatus(r.status) && (
                                        <Button className="ml-auto" variant="default" size="sm" onClick={() => advanceStatus(r)}>
                                            Advance <ChevronRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    )}
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
        </div>
    );
}


