import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginFormClient } from "./LoginFormClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    if (user.status === "PENDING") {
      redirect("/pending");
    }
    redirect("/dashboard");
  }

  return <LoginFormClient />;
}
