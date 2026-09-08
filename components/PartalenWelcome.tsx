// Partalen-portalen för Part Group:s kund-landning.
// Tre block: Welcome-hero / Snabbåtkomst / Vad du kan göra-grid.
// Ljus stil med subtilt grid-mönster, orange + mörkblå accent.

import Link from "next/link";
import {
  ArrowRight,
  FolderOpen,
  ShieldCheck,
  Settings,
  Users,
  Target,
  Wrench,
  FileText,
  Layers,
  BarChart3,
  Rocket,
} from "lucide-react";
import type { ResolvedBrand } from "@/lib/branding/types";

interface QuickLink {
  href: string;
  icon: typeof FolderOpen;
  title: string;
  subtitle: string;
}

interface Capability {
  number: string;
  icon: typeof Users;
  title: string;
  description: string;
}

export default function PartalenWelcome({
  brand,
  userName,
  orgSlug,
}: {
  brand: ResolvedBrand;
  userName?: string;
  orgSlug: string;
}) {
  const primary = brand.colors.primary;
  const accent = brand.colors.accent;
  const platformName = brand.displayName ?? brand.name;
  const attribution = brand.attributionText;

  const quickLinks: QuickLink[] = [
    {
      href: `/c/${orgSlug}/admin`,
      icon: FolderOpen,
      title: "Mina projekt",
      subtitle: "Öppna, skapa och hantera projekt",
    },
    {
      href: `/c/${orgSlug}/admin`,
      icon: ShieldCheck,
      title: "Administration",
      subtitle: "Hantera användare och roller",
    },
    {
      href: "/intern/profil",
      icon: Settings,
      title: "Inställningar",
      subtitle: "Profil och tvåfaktorsautentisering",
    },
  ];

  const capabilities: Capability[] = [
    {
      number: "01",
      icon: Users,
      title: "Människor",
      description:
        "Kartlägg roller, intressenter och teamdynamik för att säkerställa rätt kompetens genom hela projektet.",
    },
    {
      number: "02",
      icon: Target,
      title: "Projekt",
      description:
        "Följ milstolpar, leverabler och risker i realtid med levande statusöversikter.",
    },
    {
      number: "03",
      icon: Wrench,
      title: "Teknik",
      description:
        "Hantera tekniska discipliner, systemval och kvalitetskrav samlat på ett ställe.",
    },
    {
      number: "04",
      icon: FileText,
      title: "Dokument",
      description:
        "Bygg upp en strukturerad dokumentbank med versioner, metadata och spårbarhet.",
    },
    {
      number: "05",
      icon: Layers,
      title: "Information",
      description:
        "Definiera informationsleveranser, BIM-modeller och hur data flödar mellan parter.",
    },
    {
      number: "06",
      icon: BarChart3,
      title: "Insikter",
      description:
        "Få realtidsdata om budget, tidplan och kvalitet — fatta beslut baserat på fakta.",
    },
  ];

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#f7f8fa" }}>
      {/* Hero */}
      <div className="relative overflow-hidden px-8 pb-12 pt-16">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(0deg, rgba(30,58,138,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(30,58,138,0.06) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        <div className="relative mx-auto max-w-5xl">
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5"
            style={{ borderColor: `${primary}1f`, background: "#fff" }}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: accent,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono, var(--mono, ui-monospace, monospace))",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: primary,
                fontWeight: 600,
              }}
            >
              {platformName}
              {attribution && <span style={{ opacity: 0.6 }}> · {attribution}</span>}
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display, var(--display, ui-sans-serif))",
              fontWeight: 300,
              fontSize: "clamp(48px, 6vw, 84px)",
              lineHeight: 0.98,
              letterSpacing: "-0.03em",
              color: primary,
              margin: "32px 0 24px",
            }}
          >
            Välkommen,
            {userName && (
              <>
                <br />
                {userName}
              </>
            )}
          </h1>

          <p
            style={{
              fontFamily: "var(--font-body, var(--sans, ui-sans-serif))",
              fontSize: "clamp(15px, 1.25vw, 18px)",
              lineHeight: 1.55,
              color: "#475569",
              maxWidth: "58ch",
              margin: "0 0 32px",
            }}
          >
            Vi industrialiserar byggprocessen. {platformName} samlar människor, processer
            och teknik i en integrerad plattform — så att varje projekt kan drivas med
            samma precision och repeterbarhet som en industriell produktionslinje.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <ValueChip color={accent} bg="#fef3c7">
              Standardiserade processer
            </ValueChip>
            <ValueChip color={primary} bg="#dbeafe">
              Repeterbar kvalitet
            </ValueChip>
            <ValueChip color={primary} bg="#dbeafe">
              Skalbar projektledning
            </ValueChip>
          </div>
        </div>
      </div>

      {/* Snabbåtkomst */}
      <div className="px-8 pt-12" style={{ background: "#fff" }}>
        <div className="mx-auto max-w-5xl">
          <p
            style={{
              fontFamily: "var(--font-mono, var(--mono, ui-monospace, monospace))",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: primary,
              fontWeight: 600,
              margin: 0,
            }}
          >
            Snabbåtkomst
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {quickLinks.map((link) => (
              <QuickAccessCard key={link.title} link={link} primary={primary} accent={accent} />
            ))}
          </div>
        </div>
      </div>

      {/* Vad du kan göra */}
      <div className="px-8 pb-16 pt-12" style={{ background: "#fff" }}>
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2">
            <Rocket size={20} style={{ color: accent }} strokeWidth={1.75} />
            <h2
              style={{
                fontFamily: "var(--font-display, var(--display, ui-sans-serif))",
                fontWeight: 500,
                fontSize: 22,
                color: primary,
                margin: 0,
              }}
            >
              Vad du kan göra i {platformName}
            </h2>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((cap) => (
              <CapabilityCard key={cap.number} cap={cap} primary={primary} accent={accent} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueChip({
  children,
  color,
  bg,
}: {
  children: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono, var(--mono, ui-monospace, monospace))",
        fontSize: 11,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color,
        background: bg,
        padding: "8px 14px",
        fontWeight: 600,
        borderRadius: 4,
      }}
    >
      {children}
    </span>
  );
}

function QuickAccessCard({
  link,
  primary,
  accent,
}: {
  link: QuickLink;
  primary: string;
  accent: string;
}) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      className="group flex items-center gap-4 rounded border bg-white p-5 transition hover:border-[var(--brand-primary)]"
      style={{ borderColor: "#e2e8f0" }}
    >
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded"
        style={{ background: `${primary}0d` }}
      >
        <Icon size={22} style={{ color: primary }} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block"
          style={{
            fontFamily: "var(--font-display, var(--display, ui-sans-serif))",
            fontWeight: 500,
            fontSize: 16,
            color: primary,
          }}
        >
          {link.title}
        </span>
        <span
          className="mt-0.5 block"
          style={{
            fontFamily: "var(--font-body, var(--sans, ui-sans-serif))",
            fontSize: 13,
            color: "#64748b",
            lineHeight: 1.4,
          }}
        >
          {link.subtitle}
        </span>
      </span>
      <ArrowRight
        size={18}
        strokeWidth={1.75}
        className="shrink-0 transition group-hover:translate-x-0.5"
        style={{ color: accent }}
      />
    </Link>
  );
}

function CapabilityCard({
  cap,
  primary,
  accent,
}: {
  cap: Capability;
  primary: string;
  accent: string;
}) {
  const Icon = cap.icon;
  return (
    <div
      className="rounded border bg-white p-5"
      style={{ borderColor: "#e2e8f0" }}
    >
      <div className="flex items-start justify-between">
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded"
          style={{ background: `${primary}0d` }}
        >
          <Icon size={20} style={{ color: primary }} strokeWidth={1.75} />
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono, var(--mono, ui-monospace, monospace))",
            fontSize: 12,
            letterSpacing: "0.1em",
            color: accent,
            fontWeight: 600,
          }}
        >
          {cap.number}
        </span>
      </div>
      <h3
        className="mt-4"
        style={{
          fontFamily: "var(--font-display, var(--display, ui-sans-serif))",
          fontWeight: 500,
          fontSize: 17,
          color: primary,
          margin: 0,
        }}
      >
        {cap.title}
      </h3>
      <p
        className="mt-1.5"
        style={{
          fontFamily: "var(--font-body, var(--sans, ui-sans-serif))",
          fontSize: 13,
          color: "#64748b",
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {cap.description}
      </p>
    </div>
  );
}
