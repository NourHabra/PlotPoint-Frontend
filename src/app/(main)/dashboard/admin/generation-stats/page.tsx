"use client";
import React from "react";

import { ColumnDef } from "@tanstack/react-table";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { withDndColumn } from "@/components/data-table/table-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { generationStatsApi } from "@/lib/api";

type Stat = {
    _id: string;
    timestamp: string;
    reportId?: string;
    reportName?: string;
    templateId?: string;
    templateName?: string;
    output: "docx" | "pdf";
    durationMs: number;
    inlineImages: number;
    appendixItems: number;
    userId?: string;
    username?: string;
    email?: string;
};

export default function GenerationStatsPage() {
    const [page, setPage] = React.useState(1);
    const [limit] = React.useState(25);
    const [total, setTotal] = React.useState(0);
    const [allItems, setAllItems] = React.useState<Stat[]>([]);
    const [items, setItems] = React.useState<Stat[]>([]);
    const [loading, setLoading] = React.useState(false);
    const pages = Math.max(1, Math.ceil(total / limit));
    const [filter, setFilter] = React.useState<string>("all");

    const columns = React.useMemo<ColumnDef<Stat, any>[]>(() => {
        return withDndColumn<Stat>([
            {
                accessorKey: "timestamp",
                header: ({ column }: { column: any }) => (
                    <DataTableColumnHeader column={column} title="Timestamp" />
                ),
                cell: ({ row }: { row: any }) => {
                    const d = new Date(row.original.timestamp);
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const hr24 = d.getHours();
                    const ampm = hr24 >= 12 ? 'PM' : 'AM';
                    const hr12 = hr24 % 12 === 0 ? 12 : hr24 % 12;
                    const hh = String(hr12).padStart(2, '0');
                    const min = String(d.getMinutes()).padStart(2, '0');
                    return <div className="whitespace-nowrap">{`${yyyy}/${mm}/${dd} ${hh}:${min} ${ampm}`}</div>;
                },
                enableSorting: false,
            },
            {
                id: "username",
                accessorFn: (row) => (row as Stat).username || (row as Stat).email || (row as Stat).userId || "",
                header: ({ column }: { column: any }) => (
                    <DataTableColumnHeader column={column} title="User" />
                ),
                cell: (ctx: any) => <div>{String(ctx.getValue?.() ?? "")}</div>,
                enableSorting: false,
            },
            {
                id: "report",
                accessorFn: (row) => (row as Stat).reportName || (row as Stat).reportId || "",
                header: ({ column }: { column: any }) => (
                    <DataTableColumnHeader column={column} title="Report" />
                ),
                cell: (ctx: any) => <div className="truncate max-w-[240px]">{String(ctx.getValue?.() ?? "")}</div>,
                enableSorting: false,
            },
            {
                id: "template",
                accessorFn: (row) => (row as Stat).templateName || (row as Stat).templateId || "",
                header: ({ column }: { column: any }) => (
                    <DataTableColumnHeader column={column} title="Template" />
                ),
                cell: (ctx: any) => <div className="truncate max-w-[240px]">{String(ctx.getValue?.() ?? "")}</div>,
                enableSorting: false,
            },
            {
                accessorKey: "output",
                header: ({ column }: { column: any }) => (
                    <DataTableColumnHeader column={column} title="Output" />
                ),
                cell: ({ row }: { row: any }) => <div>{row.original.output}</div>,
                enableSorting: false,
            },
            {
                accessorKey: "durationMs",
                header: ({ column }: { column: any }) => (
                    <DataTableColumnHeader className="text-center" column={column} title="Duration" />
                ),
                cell: ({ row }: { row: any }) => {
                    const ms = Number(row.original.durationMs || 0);
                    const totalSec = Math.max(0, Math.round(ms / 1000));
                    const m = Math.floor(totalSec / 60);
                    const s = totalSec % 60;
                    return <div className="tabular-nums">{`${m}m ${s}s`}</div>;
                },
                enableSorting: true,
            },
            {
                accessorKey: "inlineImages",
                header: ({ column }: { column: any }) => (
                    <DataTableColumnHeader className="text-center" column={column} title="Inline Images" />
                ),
                cell: ({ row }: { row: any }) => <div className="text-center tabular-nums">{row.original.inlineImages}</div>,
                enableSorting: false,
            },
            {
                accessorKey: "appendixItems",
                header: ({ column }: { column: any }) => (
                    <DataTableColumnHeader className="text-center" column={column} title="Appendix Items" />
                ),
                cell: ({ row }: { row: any }) => <div className="text-center tabular-nums">{row.original.appendixItems}</div>,
                enableSorting: false,
            },
        ]);
    }, []);

    const table = useDataTableInstance<Stat, any>({ data: items, columns, getRowId: (row) => String(row._id) });

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = (await generationStatsApi.list(page, limit)) as any;
            const rows: Stat[] = (res.items || []) as Stat[];
            setAllItems(rows);
            setTotal(Number(res.total || 0));
            // apply current filter
            if (filter === "docx") setItems(rows.filter((r) => r.output === "docx"));
            else if (filter === "pdf") setItems(rows.filter((r) => r.output === "pdf"));
            else setItems(rows);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page, limit, filter]);

    React.useEffect(() => {
        load();
    }, [load]);

    // Update table page size to match server page size
    React.useEffect(() => {
        try {
            (table as any).setPageSize(limit);
        } catch { }
    }, [limit]);

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Generation Stats</h1>
                    <p className="text-muted-foreground">All report generation entries</p>
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="stats-filter" className="sr-only">Filter</Label>
                    <Select value={filter} onValueChange={(v) => setFilter(v)}>
                        <SelectTrigger id="stats-filter" className="w-[140px]" size="sm">
                            <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="docx">DOCX</SelectItem>
                            <SelectItem value="pdf">PDF</SelectItem>
                        </SelectContent>
                    </Select>
                    <DataTableViewOptions table={table} />
                </div>
            </div>
            <Card>
                <CardContent>
                    <div className="overflow-hidden rounded-lg border">
                        <DataTableNew dndEnabled table={table} columns={columns} onReorder={(rows: Stat[]) => setItems(rows as any)} />
                    </div>
                    <DataTablePagination table={table} />
                </CardContent>
            </Card>
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Server Page {page} / {pages} • Total {total}</div>
                <div className="space-x-2">
                    <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                    <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                </div>
            </div>
        </div>
    );
}

