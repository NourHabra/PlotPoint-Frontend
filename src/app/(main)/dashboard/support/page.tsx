"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LifeBuoy, Loader2, CheckCircle2, Mail, Phone, User, MoreVertical } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { ticketApi, ApiError } from "@/lib/api";

interface TicketItem {
    _id: string;
    title: string;
    contactName: string;
    contactEmail: string;
    phoneCountryCode?: string;
    phoneNumber?: string;
    message: string;
    status: "Open" | "Resolved";
    adminResponse?: string;
    createdAt: string;
    updatedAt: string;
}

export default function SupportPage() {
    const [form, setForm] = useState({
        title: "",
        contactName: "",
        contactEmail: "",
        phoneCountryCode: "+1",
        phoneNumber: "",
        message: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [tickets, setTickets] = useState<TicketItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [withdrawing, setWithdrawing] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);

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
            const data = await ticketApi.getAll();
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

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            if (!form.title || !form.contactName || !form.contactEmail || !form.phoneCountryCode || !form.phoneNumber || !form.message) {
                toast.error("Please fill all required fields");
                setSubmitting(false);
                return;
            }
            await ticketApi.create(form);
            toast.success("Ticket submitted");
            setForm({ title: "", contactName: "", contactEmail: "", phoneCountryCode: "+1", phoneNumber: "", message: "" });
            loadTickets();
        } catch (error) {
            if (error instanceof ApiError) toast.error(error.message);
            else toast.error("Failed to submit ticket");
        } finally {
            setSubmitting(false);
        }
    };

    const withdrawTicket = async (id: string) => {
        try {
            setWithdrawing(id);
            await ticketApi.withdraw(id);
            toast.success("Ticket withdrawn");
            loadTickets();
        } catch (error) {
            if (error instanceof ApiError) toast.error(error.message);
            else toast.error("Failed to withdraw ticket");
        } finally {
            setWithdrawing(null);
        }
    };

    return (
        <div className="@container/main flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Support</h1>
                <p className="text-muted-foreground">Create a support ticket and view your previous tickets.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><LifeBuoy className="h-5 w-5" /> New Ticket</CardTitle>
                    <CardDescription>Fill in the form below. Required fields are marked.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium">Issue Title *</label>
                            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Brief issue title" required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Contact Name *</label>
                            <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Your name" required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Contact Email *</label>
                            <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="name@example.com" required />
                        </div>
                        <div className="flex gap-2">
                            <div className="w-32">
                                <label className="text-sm font-medium">Country Code *</label>
                                <Input value={form.phoneCountryCode} onChange={(e) => setForm({ ...form, phoneCountryCode: e.target.value })} placeholder="+1" required />
                            </div>
                            <div className="flex-1">
                                <label className="text-sm font-medium">Phone Number *</label>
                                <Input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="555 123 4567" required />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium">Message *</label>
                            <Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Describe your issue in detail" required />
                        </div>
                        <div className="md:col-span-2">
                            <Button type="submit" disabled={submitting}>
                                {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting</>) : "Submit Ticket"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">My Tickets</h2>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Loading tickets...</span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tickets.map((t) => (
                        <Card key={t._id} className="group hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <div className="text-xs text-muted-foreground">Created {formatDate(t.createdAt)} • {formatTime(t.createdAt)}</div>
                                        <CardTitle className="text-lg">{t.title}</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={t.status === "Resolved" ? "default" : "secondary"}>
                                            {t.status === "Resolved" ? (<span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Resolved</span>) : "Open"}
                                        </Badge>
                                        {t.status !== "Resolved" && (
                                            <>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ticket options">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setConfirmId(t._id)}>Withdraw</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <AlertDialog open={confirmId === t._id} onOpenChange={(o) => { if (!o) setConfirmId(null); }}>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Withdraw this ticket?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action will remove the ticket from your list and cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => withdrawTicket(t._id)} disabled={withdrawing === t._id}>
                                                                {withdrawing === t._id ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Withdrawing</>) : (<>Withdraw</>)}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div className="text-muted-foreground whitespace-pre-wrap">{t.message}</div>
                                    <div className="rounded-md border p-3 bg-muted/40 space-y-2">
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
                                    {t.adminResponse && (
                                        <div className="rounded border p-3 bg-muted/40">
                                            <div className="text-xs text-muted-foreground mb-1">Admin response</div>
                                            <div className="whitespace-pre-wrap">{t.adminResponse}</div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            {!loading && tickets.length === 0 && (
                <Card className="text-center py-12">
                    <CardContent>
                        <div className="space-y-4">
                            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                                <LifeBuoy className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">No tickets yet</h3>
                                <p className="text-muted-foreground">Submit the form above to create your first support ticket.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}


