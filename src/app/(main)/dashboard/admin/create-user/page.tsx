"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { authApi } from "@/lib/api";

const Schema = z
    .object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email required"),
        password: z.string().min(6, "Min 6 characters"),
        confirmPassword: z.string().min(6, "Min 6 characters"),
        isAdmin: z.boolean().optional(),
        avatar: z.any().optional(),
    })
    .refine((d) => d.password === d.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export default function CreateUserPage() {
    const form = useForm<z.infer<typeof Schema>>({
        resolver: zodResolver(Schema),
        defaultValues: { name: "", email: "", password: "", confirmPassword: "", isAdmin: false },
    });
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async (data: z.infer<typeof Schema>) => {
        try {
            setSubmitting(true);
            const file = (data as any).avatar?.[0] as File | undefined;
            const auth = typeof window !== 'undefined' ? localStorage.getItem('auth') : null;
            const token = auth ? JSON.parse(auth).token : '';
            const res = await authApi.register({
                name: data.name,
                email: data.email,
                password: data.password,
                role: data.isAdmin ? 'Admin' : 'User',
                avatar: file || null,
            }, token);
            toast.success('User created');
            window.location.href = '/dashboard/users';
        } catch (e: any) {
            toast.error(e?.message || 'Failed to create user');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Create User</h1>
                <p className="text-muted-foreground">Admins can create user accounts</p>
            </div>
            <Card>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-lg" autoComplete="off">
                            <FormField name="name" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField name="email" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input type="email" placeholder="user@example.com" autoComplete="off" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField name="avatar" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Profile Photo</FormLabel>
                                    <FormControl><Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField name="password" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl><Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField name="confirmPassword" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl><Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField name="isAdmin" control={form.control} render={({ field }) => (
                                <FormItem className="flex flex-row items-center gap-2">
                                    <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <FormLabel>Admin</FormLabel>
                                </FormItem>
                            )} />
                            <Button type="submit" disabled={submitting}>Create User</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}


