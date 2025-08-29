"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dashboardApi, ApiError } from "@/lib/api";

interface ReportItem {
    _id: string;
    title?: string;
    name?: string;
    templateName?: string;
    status?: string;
    updatedAt: string;
}

export function LatestReports() {
    const [rows, setRows] = useState<ReportItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const data = await dashboardApi.getLatest(10);
                setRows((data as any[]) || []);
            } catch (e) {
                // silent
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Latest Reports</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Updated</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((r) => (
                                <TableRow key={r._id}>
                                    <TableCell className="font-medium">{r.title || r.name || "Untitled Report"}</TableCell>
                                    <TableCell>{r.templateName || "-"}</TableCell>
                                    <TableCell>{r.status || "Draft"}</TableCell>
                                    <TableCell>{new Date(r.updatedAt).toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                            {!loading && rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">No reports yet</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}


