"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authApi } from "@/lib/api";
import { getInitials } from "@/lib/utils";

export default function ProfilePage() {
    const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; avatarUrl?: string; createdAt?: string } | null>(null);
    useEffect(() => {
        (async () => {
            try {
                const u = await authApi.me();
                const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
                const avatar = u.avatarUrl ? (String(u.avatarUrl).startsWith('http') ? u.avatarUrl : `${base}${u.avatarUrl}`) : '';
                setUser({ ...u, avatarUrl: avatar });
            } catch { }
        })();
    }, []);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
                <p className="text-muted-foreground">View your personal details</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Avatar className="size-16">
                            <AvatarImage src={user?.avatarUrl} alt={user?.name || ''} />
                            <AvatarFallback>{getInitials(user?.name || '')}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="text-lg font-semibold">{user?.name || '-'}</div>
                            <div className="text-muted-foreground">{user?.email || '-'}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div>
                            <div className="text-sm text-muted-foreground">Role</div>
                            <div className="font-medium">{user?.role || '-'}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Joined</div>
                            <div className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


