"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";

const FormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  remember: z.boolean().optional(),
});

export function LoginForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      setSubmitting(true);
      const res = await authApi.login({ email: data.email, password: data.password });
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
      const avatarUrl = res.avatarUrl && typeof res.avatarUrl === 'string'
        ? (res.avatarUrl.startsWith('http') ? res.avatarUrl : `${base}${res.avatarUrl}`)
        : '';
      localStorage.setItem('auth', JSON.stringify({ name: res.name, email: res.email, token: res.token, role: res.role, avatarUrl }));
      // Set cookie so middleware can detect auth status
      const maxAge = 60 * 60 * 24 * 7; // 7 days
      document.cookie = `auth-token=${res.token}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
      toast.success('Logged in');
      window.location.href = '/dashboard/default';
    } catch (e: any) {
      toast.error(e?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="remember"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center">
              <FormControl>
                <Checkbox
                  id="login-remember"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="size-4"
                />
              </FormControl>
              <FormLabel htmlFor="login-remember" className="text-muted-foreground ml-1 text-sm font-medium">
                Remember me
              </FormLabel>
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Login'}
        </Button>
      </form>
    </Form>
  );
}
