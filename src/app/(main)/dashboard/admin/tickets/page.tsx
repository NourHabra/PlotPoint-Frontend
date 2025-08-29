"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LifeBuoy, Loader2, CheckCircle2, XCircle, CircleDot, Search, Mail, Phone, User } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { ticketApi, ApiError } from "@/lib/api";

type TicketStatus = "Open" | "Resolved" | "Withdrawn";

interface TicketItem {
    _id: string;
    title: string;
    contactName: string;
    contactEmail: string;
    phoneCountryCode?: string;
    phoneNumber?: string;
    message: string;
    status: TicketStatus;
    adminResponse?: string;
    createdBy: string;
    creator?: { id: string; name: string; email: string; role: 'Admin' | 'User'; avatarUrl?: string } | null;
    resolvedBy?: string;
    resolvedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export default function AdminTicketsPage() {
    const [tickets, setTickets] = useState<TicketItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");

    const pad = (n: number) => String(n).padStart(2, "0");
    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
    };
    const formatTime = (iso: string) => {
        const d = new Date(iso);
        const hours = d.getHours();
        const minutes = d.getMinutes();
        const ampm = hours < 12 ? "AM" : "PM";
        const h12 = hours % 12 === 0 ? 12 : hours % 12;
        return `${h12}:${pad(minutes)} ${ampm}`;
    };

    const loadTickets = async () => {
        try {
            setLoading(true);
            const data = await ticketApi.getAllAdmin();
            setTickets(data as any);
        } catch (error) {
            if (error instanceof ApiError) toast.error(error.message);
            else toast.error("Failed to load tickets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, []);

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        return tickets.filter((t) => {
            if (statusFilter !== "all" && t.status !== statusFilter) return false;
            if (!s) return true;
            return (
                t.title.toLowerCase().includes(s) ||
                t.contactName.toLowerCase().includes(s) ||
                t.contactEmail.toLowerCase().includes(s) ||
                t.message.toLowerCase().includes(s)
            );
        });
    }, [tickets, search, statusFilter]);

    const saveResponse = async (t: TicketItem) => {
        try {
            setSavingId(t._id);
            const payload: any = { adminResponse: t.adminResponse || "" };
            if (t.status === "Open" || t.status === "Resolved") payload.status = t.status;
            const updated = await ticketApi.update(t._id, payload);
            setTickets((prev) => prev.map((it) => (it._id === t._id ? { ...it, ...(updated as any) } : it)));
            toast.success("Ticket updated");
            // Notify sidebar to refresh open ticket count
            if (typeof window !== 'undefined') {
                try { window.dispatchEvent(new CustomEvent('tickets-changed')); } catch { }
            }
        } catch (error) {
            if (error instanceof ApiError) toast.error(error.message);
            else toast.error("Failed to update ticket");
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="@container/main flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
                <p className="text-muted-foreground">View and respond to all support tickets.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><LifeBuoy className="h-5 w-5" /> All Tickets</CardTitle>
                    <CardDescription>Search, filter, and respond to user tickets.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                        <div className="relative w-full md:w-[360px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="Resolved">Resolved</SelectItem>
                                    <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={loadTickets}>Refresh</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Loading tickets...</span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map((t) => (
                        <Card key={t._id} className="group hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <div className="text-xs text-muted-foreground">Created {formatDate(t.createdAt)} • {formatTime(t.createdAt)}</div>
                                        <CardTitle className="text-lg">{t.title}</CardTitle>
                                        <div className="text-xs text-muted-foreground flex items-start gap-2">
                                            <Mail className="h-3.5 w-3.5 mt-[2px]" />
                                            <span>
                                                From: {t.creator?.name || "Unknown"}<br />
                                                &lt;{t.creator?.email || "—"}&gt;
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {t.status === "Resolved" ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="default" className="shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" /> Resolved</Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Resolved {formatDate(t.resolvedAt || t.updatedAt)} • {formatTime(t.resolvedAt || t.updatedAt)}</p>
                                                        {t as any && (t as any).resolver?.name && (
                                                            <p className="text-xs text-primary-foreground">By {(t as any).resolver.name}</p>
                                                        )}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : t.status === "Withdrawn" ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="secondary" className="shrink-0"><XCircle className="h-3 w-3 mr-1" /> Withdrawn</Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Withdrawn {formatDate(t.resolvedAt || t.updatedAt)} • {formatTime(t.resolvedAt || t.updatedAt)}</p>
                                                        {t as any && (t as any).resolver?.name && (
                                                            <p className="text-xs text-muted-foreground">By {(t as any).resolver.name}</p>
                                                        )}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : (
                                            <Badge variant="secondary" className="shrink-0"><CircleDot className="h-3 w-3 mr-1" /> Open</Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-1">Message</div>
                                        <div className="text-muted-foreground whitespace-pre-wrap h-20 overflow-auto pr-2">{t.message}</div>
                                    </div>
                                    <Separator />
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="rounded-md border p-3 bg-muted/40 space-y-2">
                                            <div className="text-xs text-muted-foreground">Contact</div>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Contact Name</div>
                                                    <div className="font-medium">{t.contactName}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Email</div>
                                                    <div><a className="underline underline-offset-2" href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a></div>
                                                </div>
                                            </div>
                                            {t.phoneNumber && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">Phone</div>
                                                        <div>{(t.phoneCountryCode || '') + (t.phoneCountryCode ? ' ' : '') + t.phoneNumber}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 mt-8">
                                        <div className="text-xs text-muted-foreground">{t.status === "Withdrawn" ? "Notes" : "Response"}</div>
                                        <Textarea defaultValue={t.adminResponse || ""} onChange={(e) => (t.adminResponse = e.target.value)} rows={4} placeholder="Write a response to the user..." />
                                        <div className="flex items-center gap-2">
                                            {t.status !== "Withdrawn" && (
                                                <div className="flex-1">
                                                    <Select defaultValue={t.status} onValueChange={(v: any) => (t.status = v)}>
                                                        <SelectTrigger className="w-full"><SelectValue placeholder="Set status" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Open">Open</SelectItem>
                                                            <SelectItem value="Resolved">Resolved</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            <Button className="ml-auto" onClick={() => saveResponse(t)} disabled={savingId === t._id}>
                                                {savingId === t._id ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving</>) : "Save"}
                                            </Button>
                                        </div>
                                    </div>
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
                                <LifeBuoy className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">No tickets</h3>
                                <p className="text-muted-foreground">There are no tickets matching your filters.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}


