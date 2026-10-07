import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RegisterFormClient } from "./RegisterFormClient";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    if (user.status === "PENDING") {
      redirect("/pending");
    }
    redirect("/dashboard");
  }

  return <RegisterFormClient />;
}
