import { redirect } from "next/navigation";

export default function RootPage() {
  // Unauthenticated visitors are bounced to /login by the middleware.
  redirect("/dashboard");
}
