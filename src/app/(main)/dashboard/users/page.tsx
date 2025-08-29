"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authApi, ApiError } from "@/lib/api";
import { getInitials } from "@/lib/utils";

interface UserItem {
    _id: string;
    name: string;
    email: string;
    role: string;
    avatarPath?: string;
    avatarUrl?: string;
    createdAt: string;
}

export default function UsersPage() {
    const [rows, setRows] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);

    const token = useMemo(() => {
        if (typeof window === 'undefined') return '';
        const raw = localStorage.getItem('auth');
        try { return raw ? JSON.parse(raw).token || '' : ''; } catch { return ''; }
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api') + '/users', {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new ApiError(res.status, data.message || 'Failed to load users');
                }
                const data = await res.json();
                const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
                const mapped = (data as any[]).map((u) => ({
                    ...u,
                    avatarUrl: u.avatarPath ? (String(u.avatarPath).startsWith('http') ? u.avatarPath : `${base}${u.avatarPath}`) : '',
                }));
                setRows(mapped as any);
            } catch (e: any) {
                toast.error(e?.message || 'Failed to load users');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token]);

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                <p className="text-muted-foreground">All users in the system</p>
            </div>
            <Card>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Avatar</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((u) => (
                                    <TableRow key={u._id}>
                                        <TableCell>
                                            <Avatar className="size-8">
                                                <AvatarImage src={u.avatarUrl} alt={u.name} />
                                                <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell className="font-medium">{u.name}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>{u.role}</TableCell>
                                        <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                                {rows.length === 0 && !loading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">No users found</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


