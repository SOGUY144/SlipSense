import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ensureUserOnboarded } from "@/lib/auth/helpers";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const shop = await ensureUserOnboarded(
    user.id,
    user.phone,
    user.user_metadata?.shop_name as string | undefined
  );

  return <AppShell shopName={shop.name}>{children}</AppShell>;
}
