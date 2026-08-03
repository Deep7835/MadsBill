"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Login01Icon,
  UserAdd01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  PrinterIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email address (e.g. name@gmail.com)"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [submitting, setSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  async function onSignIn(values: LoginValues) {
    setSubmitting(true);
    setInfoMessage(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setSubmitting(false);
      if (error.message.includes("Invalid login credentials") || error.status === 400) {
        toast.error("Invalid email or password. If you don't have an account, switch to 'Create Account'.");
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

  async function onSignUp(values: SignupValues) {
    setSubmitting(true);
    setInfoMessage(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
        },
      },
    });

    setSubmitting(false);

    if (error) {
      if (error.message.includes("invalid") && error.message.includes("Email")) {
        toast.error("Please use a valid email domain (e.g. @gmail.com).");
      } else {
        toast.error(error.message || "Could not create account.");
      }
      return;
    }

    if (data.session) {
      toast.success("Account created and signed in!");
      window.location.href = redirectTo;
    } else {
      // Email confirmation required by Supabase
      toast.success("Account created successfully!");
      setInfoMessage(`Account created for ${values.email}. If email confirmation is enabled, check your inbox to activate, or sign in now.`);
      loginForm.setValue("email", values.email);
      loginForm.setValue("password", values.password);
      setMode("signin");
    }
  }

  return (
    <Card className="rounded-3xl p-2 shadow-lg">
      <CardHeader className="items-center text-center pb-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-raised)]">
          <HugeiconsIcon icon={PrinterIcon} className="size-6" />
        </div>
        <CardTitle className="mt-3 text-xl font-bold">Madskraft Flex &amp; Advertising</CardTitle>
        <CardDescription className="text-xs">
          Sign in or create an account to manage quotations, customers, and GST bills.
        </CardDescription>

        {/* Dual Mode Switch Tabs */}
        <div className="mt-4 flex w-full rounded-xl bg-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => { setMode("signin"); setInfoMessage(null); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
              mode === "signin"
                ? "bg-card text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HugeiconsIcon icon={Login01Icon} className="size-4" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setInfoMessage(null); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
              mode === "signup"
                ? "bg-card text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HugeiconsIcon icon={UserAdd01Icon} className="size-4" />
            Create Account
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {infoMessage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4 shrink-0 text-primary mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {mode === "signin" ? (
          <form onSubmit={loginForm.handleSubmit(onSignIn)} className="space-y-4" noValidate>
            <FormField label="Email" htmlFor="signin-email" error={loginForm.formState.errors.email?.message} required>
              <Input
                id="signin-email"
                type="email"
                autoComplete="email"
                placeholder="you@gmail.com"
                aria-invalid={!!loginForm.formState.errors.email}
                {...loginForm.register("email")}
              />
            </FormField>

            <FormField label="Password" htmlFor="signin-password" error={loginForm.formState.errors.password?.message} required>
              <Input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!loginForm.formState.errors.password}
                {...loginForm.register("password")}
              />
            </FormField>

            <Button type="submit" className="w-full font-semibold" loading={submitting}>
              Sign In
            </Button>
          </form>
        ) : (
          <form onSubmit={signupForm.handleSubmit(onSignUp)} className="space-y-4" noValidate>
            <FormField label="Full Name" htmlFor="signup-name" error={signupForm.formState.errors.fullName?.message} required>
              <Input
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder="Admin User"
                aria-invalid={!!signupForm.formState.errors.fullName}
                {...signupForm.register("fullName")}
              />
            </FormField>

            <FormField label="Email" htmlFor="signup-email" error={signupForm.formState.errors.email?.message} required>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="you@gmail.com"
                aria-invalid={!!signupForm.formState.errors.email}
                {...signupForm.register("email")}
              />
            </FormField>

            <FormField label="Password" htmlFor="signup-password" error={signupForm.formState.errors.password?.message} required>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                aria-invalid={!!signupForm.formState.errors.password}
                {...signupForm.register("password")}
              />
            </FormField>

            <Button type="submit" className="w-full font-semibold" loading={submitting}>
              Create Account
            </Button>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <HugeiconsIcon icon={InformationCircleIcon} className="size-3.5 shrink-0" />
              <span>Use a valid email address to complete registration.</span>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

