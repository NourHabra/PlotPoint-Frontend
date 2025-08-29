"use client";

import * as React from "react";

import { Plus } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { DataTable as DataTableNew } from "../../../../../components/data-table/data-table";
import { DataTablePagination } from "../../../../../components/data-table/data-table-pagination";
import { DataTableViewOptions } from "../../../../../components/data-table/data-table-view-options";
import { withDndColumn } from "../../../../../components/data-table/table-utils";

import { dashboardColumns } from "./columns";
import { dashboardApi } from "@/lib/api";
import { sectionSchema } from "./schema";

export function DataTable({ data: initialData }: { data: z.infer<typeof sectionSchema>[] }) {
  const [allData, setAllData] = React.useState<z.infer<typeof sectionSchema>[]>(() => initialData);
  const [data, setData] = React.useState<z.infer<typeof sectionSchema>[]>(() => initialData);
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const columns = withDndColumn(dashboardColumns);
  const table = useDataTableInstance({ data, columns, getRowId: (row: any) => String((row as any)._id || (row as any).id) });

  const applyFilter = React.useCallback((rows: any[], tab: string) => {
    if (!Array.isArray(rows)) return [];
    if (tab === "draft") return rows.filter((r) => (r as any).status === "Draft");
    if (tab === "initial-review") return rows.filter((r) => (r as any).status === "Initial Review");
    if (tab === "final-review") return rows.filter((r) => (r as any).status === "Final Review");
    if (tab === "submitted") return rows.filter((r) => (r as any).status === "Submitted");
    return rows;
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const latest = await dashboardApi.getLatest(10);
        const rows = (latest as any[]) || [];
        setAllData(rows);
        setData(applyFilter(rows, activeTab));
      } catch { }
    })();
  }, []);

  React.useEffect(() => {
    setData(applyFilter(allData as any[], activeTab));
  }, [activeTab]);

  return (
    <Tabs value={activeTab} className="w-full flex-col justify-start gap-6" onValueChange={setActiveTab as any}>
      <div className="flex items-center justify-between">
        <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        <Select defaultValue="all" onValueChange={setActiveTab}>
          <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector">
            <SelectValue placeholder="Select a view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="initial-review">Initial Review</SelectItem>
            <SelectItem value="final-review">Final Review</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="initial-review">Initial Review</TabsTrigger>
          <TabsTrigger value="final-review">Final Review</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          {/* <Button variant="outline" size="sm">
            <Plus />
            <span className="hidden lg:inline">Add Section</span>
          </Button> */}
        </div>
      </div>
      <TabsContent value={activeTab} className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-lg border">
          <DataTableNew dndEnabled table={table} columns={columns} onReorder={setData} />
        </div>
        <DataTablePagination table={table} />
      </TabsContent>
      <TabsContent value="draft" className="flex flex-col" />
      <TabsContent value="initial-review" className="flex flex-col" />
      <TabsContent value="final-review" className="flex flex-col" />
      <TabsContent value="submitted" className="flex flex-col" />
    </Tabs>
  );
}
