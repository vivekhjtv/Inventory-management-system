import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.status === "PENDING") {
    redirect("/pending");
  }
  redirect("/dashboard");
}
