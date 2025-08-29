import { ColumnDef } from "@tanstack/react-table";
import { CircleCheck, Loader, Edit } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { DataTableColumnHeader } from "../../../../../components/data-table/data-table-column-header";

import { sectionSchema } from "./schema";
import { TableCellViewer } from "./table-cell-viewer";

export const dashboardColumns: ColumnDef<z.infer<typeof sectionSchema>>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        {/* <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        /> */}
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        {/* <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        /> */}
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    cell: ({ row }) => <div className="font-medium">{(row.original as any).title || (row.original as any).name || "Untitled Report"}</div>,
    enableSorting: false,
  },
  {
    accessorKey: "templateName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Template" />,
    cell: ({ row }) => <div className="w-48 truncate">{(row.original as any).templateName || '-'}</div>,
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <Badge variant="outline" className="text-muted-foreground px-1.5">{(row.original as any).status || 'Draft'}</Badge>,
    enableSorting: false,
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => <DataTableColumnHeader className="w-full text-left" column={column} title="Updated" />,
    cell: ({ row }) => <div>{(row.original as any).updatedAt ? new Date((row.original as any).updatedAt).toLocaleString() : '-'}</div>,
    enableSorting: false,
  },
  // Created By column removed per request
  {
    id: "actions",
    cell: ({ row }) => {
      const role = (typeof window !== 'undefined' && localStorage.getItem('auth')) ? (JSON.parse(localStorage.getItem('auth') as string)?.role || 'User') : 'User';
      if (role === 'Admin') return null;
      return (
        <Link href={`/dashboard/templates/fill?reportId=${(row.original as any)._id || (row.original as any).id}`}>
          <Button variant="ghost" className="text-muted-foreground flex size-8" size="icon">
            <Edit />
            <span className="sr-only">Edit</span>
          </Button>
        </Link>
      );
    },
    enableSorting: false,
  },
];
