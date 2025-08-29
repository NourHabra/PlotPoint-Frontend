"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { reportApi, ApiError, authApi } from "@/lib/api";

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

export default function AllReportsPage() {
    const router = useRouter();
    const [rows, setRows] = useState<ReportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [usersMap, setUsersMap] = useState<Record<string, { name: string; email: string }>>({});


    const role = useMemo(() => {
        if (typeof window === 'undefined') return '';
        try { return JSON.parse(localStorage.getItem('auth') || '{}')?.role || ''; } catch { return ''; }
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [allReports, allUsers] = await Promise.all([
                    reportApi.getAllReportsAdmin(),
                    authApi.listUsers(),
                ]);
                setRows(allReports as any);
                const map: Record<string, { name: string; email: string }> = {};
                (allUsers as any[]).forEach((u) => {
                    if (u && u._id) map[String(u._id)] = { name: u.name || "", email: u.email || "" };
                });
                setUsersMap(map);
            } catch (e: any) {
                const msg = e instanceof ApiError ? e.message : 'Failed to load reports';
                toast.error(msg);
            } finally {
                setLoading(false);
            }
        };
        if (role !== 'Admin') {
            router.replace('/dashboard/reports');
            return;
        }
        load();
    }, [role, router]);

    const filtered = rows.filter((r) => {
        const t = (r.title || r.name || "Untitled Report") + " " + (r.templateName || "");
        return t.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                {/* <p className="text-muted-foreground">System-wide reports (Admin only)</p> */}
            </div>

            <div className="flex items-center justify-between gap-2">
                <Input placeholder="Search by title or template..." className="w-[300px]" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <Card>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex items-center gap-2"><Loader2 className="h-6 w-6 animate-spin" /><span>Loading...</span></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Template</TableHead>
                                        <TableHead>Created By</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Updated</TableHead>
                                        {/* No actions to respect ownership rules */}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((r) => (
                                        <TableRow key={r._id}>
                                            <TableCell className="font-medium">{r.title || r.name || 'Untitled Report'}</TableCell>
                                            <TableCell>{r.templateName || '-'}</TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const u = usersMap[String(r.createdBy || '')];
                                                    if (u) return (
                                                        <div className="leading-tight">
                                                            <div>{u.name || 'Unnamed'}</div>
                                                            <div className="text-xs text-muted-foreground">{u.email}</div>
                                                        </div>
                                                    );
                                                    // Fallback to raw createdBy value
                                                    const raw = String(r.createdBy || '').trim();
                                                    return raw ? <span className="text-muted-foreground">{raw}</span> : <span className="text-muted-foreground">-</span>;
                                                })()}
                                            </TableCell>
                                            <TableCell>{r.status || 'Draft'}</TableCell>
                                            <TableCell>{new Date(r.updatedAt).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                    {filtered.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">No reports found</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


