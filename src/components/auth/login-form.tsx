"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSignIn(values: LoginValues) {
    setSubmitting(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setSubmitting(false);
      if (error.message.includes("Invalid login credentials") || error.status === 400) {
        toast.error("Invalid email or password.");
      } else {
        toast.error(error.message || "Could not sign in. Check your credentials.");
      }
      return;
    }

    if (data.session) {
      toast.success("Signed in successfully!");
      window.location.href = redirectTo;
    } else {
      setSubmitting(false);
      toast.error("Please confirm your email address before signing in.");
    }
  }

  return (
    <div className="rounded-[5px] border border-slate-200/80 bg-white p-7 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)] sm:p-9 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Enter your details to access quotations, customers and GST bills.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSignIn)} className="mt-7 space-y-4" noValidate>
        <FormField label="Email" htmlFor="signin-email" error={form.formState.errors.email?.message} required>
          <Input
            id="signin-email"
            type="email"
            autoComplete="email"
            placeholder="you@gmail.com"
            className="h-12"
            aria-invalid={!!form.formState.errors.email}
            {...form.register("email")}
          />
        </FormField>

        <FormField label="Password" htmlFor="signin-password" error={form.formState.errors.password?.message} required>
          <div className="relative">
            <Input
              id="signin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-12 pr-16"
              aria-invalid={!!form.formState.errors.password}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 px-3.5 text-xs font-semibold text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </FormField>

        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Having trouble signing in? Contact your administrator.
        </p>

        <Button type="submit" className="h-12 w-full text-sm font-semibold" loading={submitting}>
          Sign in
        </Button>
      </form>
    </div>
  );
}
