"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui";

// Bara tillåt relativa paths — förebygger open-redirect-attack
// (`/login?next=https://evil.com`).
function safeNext(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function LoginInner() {
  const [azureLoading, setAzureLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  async function signInAzure() {
    setAzureLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          scopes: "openid profile email",
          redirectTo: callback,
          // Tvinga Microsoft att visa kontoväljare istället för att auto-välja
          // senaste konto. Förhindrar att en user med flera Entra-konton
          // (t.ex. part-group.example + kund-domän) loggas in som fel person.
          queryParams: { prompt: "select_account" },
        },
      });
      // Vid lyckad start sker en redirect till Microsoft; koden nedan nås bara vid fel.
      if (error) {
        setError(error.message);
        setAzureLoading(false);
      }
    } catch {
      setError("Kunde inte nå Supabase. Kontrollera att .env.local pekar på ett riktigt projekt.");
      setAzureLoading(false);
    }
  }

  async function signInEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setEmailLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: callback },
      });
      if (error) {
        setError(error.message);
      } else {
        setEmailSent(trimmed);
      }
    } catch {
      setError("Kunde inte skicka inloggningslänken. Försök igen om en stund.");
    } finally {
      setEmailLoading(false);
    }
  }

  const busy = azureLoading || emailLoading;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Logo size={30} />
      <p className="text-ink-3 mb-6 mt-2 text-sm">Part Group — logga in för att fortsätta.</p>

      <Button
        variant="ghost"
        onClick={signInAzure}
        disabled={busy || emailSent !== null}
        className="w-full"
        leading={
          <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
        }
      >
        {azureLoading ? "Omdirigerar…" : "Logga in med Microsoft"}
      </Button>

      <div className="text-ink-3 my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider">
        <span className="bg-border h-px flex-1" />
        <span>eller</span>
        <span className="bg-border h-px flex-1" />
      </div>

      {emailSent ? (
        <div className="bg-surface border-border rounded border p-3 text-[13px]">
          <p className="font-medium">Kolla din inkorg</p>
          <p className="text-ink-3 mt-1">
            Vi har skickat en inloggningslänk till <code className="break-all">{emailSent}</code>.
            Länken gäller i 1 timme.
          </p>
          <button
            type="button"
            onClick={() => {
              setEmailSent(null);
              setEmail("");
            }}
            className="text-ink-3 hover:text-fg mt-3 text-[12px] underline"
          >
            Skicka till en annan adress
          </button>
        </div>
      ) : (
        <form onSubmit={signInEmail} className="flex flex-col gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="din.epost@exempel.se"
            required
            disabled={busy}
            autoComplete="email"
            className="border-border bg-surface rounded border px-3 py-[9px] text-[13.5px]"
          />
          <Button
            type="submit"
            variant="ghost"
            disabled={busy || email.trim().length === 0}
            className="w-full"
          >
            {emailLoading ? "Skickar…" : "Skicka inloggningslänk"}
          </Button>
        </form>
      )}

      {error && <p className="text-warning-text mt-3 text-sm">{error}</p>}

      <p className="text-ink-3 mt-6 text-xs">
        Microsoft är standardvägen. Email-länken är en alternativ väg för
        konton som inte fungerar mot Entra ID.
      </p>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams kräver Suspense i Next 15.
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
