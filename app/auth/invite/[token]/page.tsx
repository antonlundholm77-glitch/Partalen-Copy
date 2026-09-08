import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { AUTH_ENABLED } from "@/lib/auth";

// Acceptera inbjudan: /auth/invite/[token]
// Inloggad → kör gf_accept_invitation(token), redirecta till org eller projekt
// med slugs som RPC:n returnerar (RPC kör SECURITY DEFINER → läser även när
// vanlig user inte får läsa gf_invitations via RLS).
// Oinloggad → skicka till /login med next-param tillbaka hit.

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!AUTH_ENABLED) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md p-6">
          <Card padded>
            <h1 className="text-lg font-medium">Inbjudan</h1>
            <p className="mt-2 text-[13px] text-fg-2">
              Inloggning är inte konfigurerad i den här miljön. Lokalt: konfigurera
              Supabase i <code>.env.local</code>.
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/auth/invite/${token}`)}`);
  }

  const rpcRes = await supabase.rpc(
    "gf_accept_invitation" as never,
    { invite_token: token } as never,
  );

  if (rpcRes.error) {
    return (
      <AppShell showSignOut>
        <div className="mx-auto max-w-md p-6">
          <Card padded className="border-red-300 bg-red-50">
            <h1 className="text-lg font-medium text-red-800">Inbjudan kunde inte accepteras</h1>
            <p className="mt-2 text-[13px] text-red-700">{rpcRes.error.message}</p>
            <p className="mt-3 text-[12px] text-red-700">
              Du är inloggad som <code>{user.email}</code>. Om inbjudan gäller en
              annan e-post, logga ut och försök igen.
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }

  // RPC returnerar en rad med { org_slug, project_slug }. project_slug är null
  // för kund-invite, satt för projekt-invite.
  const rows = (rpcRes.data ?? []) as { org_slug: string; project_slug: string | null }[];
  const row = rows[0];

  if (row?.org_slug && row.project_slug) {
    redirect(`/c/${row.org_slug}/${row.project_slug}`);
  }
  if (row?.org_slug) {
    redirect(`/c/${row.org_slug}`);
  }

  redirect("/");
}
