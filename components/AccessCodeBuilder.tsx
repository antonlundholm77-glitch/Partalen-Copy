"use client";

// GUI-builder för klassificeringskod på dokument. Fyra dropdowns matchar
// grammatiken {TEKNIK}-{B1}[-{B2}][-{ROLL}]. Värdet synkas till en text-
// återgivning som visar både kod och human-läsbar form.
//
// Avsedd att ersätta fri text-fältet i EditMetaModal. Användaren kan
// fortfarande skriva kod manuellt om hen vill — toggla "Manuell text".

import { useMemo, useState } from "react";
import {
  DISCIPLINES,
  PERMISSION_LEVELS,
  COMMERCIAL_ACCESS_LEVELS,
  PROJECT_ROLES,
} from "@/lib/access/constants";
import { parseAccessCode, formatAccessCode } from "@/lib/access/parser";
import { humanizeAccessCode } from "@/lib/access/humanize";

export default function AccessCodeBuilder({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [manual, setManual] = useState(false);

  // Parsa nuvarande värde så vi kan förfylla dropdowns.
  const parsed = useMemo(() => {
    const r = parseAccessCode(value);
    return r.ok ? r.parsed : null;
  }, [value]);

  const discipline = parsed?.discipline ?? "";
  const permissionLevel = parsed?.permissionLevel ?? "";
  const commercialAccess = parsed?.commercialAccess ?? "";
  const role = parsed?.role ?? "";

  function emit(next: {
    discipline?: string;
    permissionLevel?: string;
    commercialAccess?: string;
    role?: string;
  }) {
    const merged = {
      discipline: next.discipline ?? discipline,
      permissionLevel: next.permissionLevel ?? permissionLevel,
      commercialAccess: next.commercialAccess ?? commercialAccess,
      role: next.role ?? role,
    };
    // Behöver minst TEKNIK + B1 för en giltig kod
    if (!merged.discipline || !merged.permissionLevel) {
      // Tom = ingen klassificering
      const partial = [merged.discipline, merged.permissionLevel].filter(Boolean).join("-");
      onChange(partial.toUpperCase());
      return;
    }
    onChange(
      formatAccessCode({
        discipline: merged.discipline,
        permissionLevel: merged.permissionLevel,
        commercialAccess: merged.commercialAccess || undefined,
        role: merged.role || undefined,
      }),
    );
  }

  const validation = value ? parseAccessCode(value) : null;
  const isValid = validation?.ok ?? value === "";

  if (manual) {
    return (
      <div className="space-y-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="P-INT-AVTB-EK"
          className="block w-full rounded-md border border-border bg-bg px-2 py-1.5 font-mono text-[13px] uppercase text-ink"
        />
        <ValidationLine value={value} />
        <button
          type="button"
          onClick={() => setManual(false)}
          className="text-[11.5px] text-ink-3 underline-offset-2 hover:text-ink hover:underline"
        >
          ← Tillbaka till väljare
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Teknikområde (TEKNIK)" required>
          <select
            value={discipline}
            onChange={(e) => emit({ discipline: e.target.value })}
            className="block w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
          >
            <option value="">— välj —</option>
            {DISCIPLINES.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} · {d.sv}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Behörighet (B1)" required>
          <select
            value={permissionLevel}
            onChange={(e) => emit({ permissionLevel: e.target.value })}
            className="block w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
          >
            <option value="">— välj —</option>
            {PERMISSION_LEVELS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} · {p.sv}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Avtalsbehörighet (B2) — valfri">
          <select
            value={commercialAccess}
            onChange={(e) => emit({ commercialAccess: e.target.value })}
            className="block w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
          >
            <option value="">— ingen —</option>
            {COMMERCIAL_ACCESS_LEVELS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.sv}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Roll — valfri">
          <select
            value={role}
            onChange={(e) => emit({ role: e.target.value })}
            className="block w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[13px] text-ink"
          >
            <option value="">— ingen —</option>
            {PROJECT_ROLES.map((r) => (
              <option key={r.code} value={r.code}>
                {r.code} · {r.sv}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <ValidationLine value={value} />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setManual(true)}
          className="text-[11.5px] text-ink-3 underline-offset-2 hover:text-ink hover:underline"
        >
          Manuell text →
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[11.5px] text-ink-3 underline-offset-2 hover:text-danger hover:underline"
          >
            Rensa
          </button>
        )}
      </div>

      {!isValid && validation && !validation.ok && (
        <ul className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] text-red-800">
          {validation.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[11px] font-medium text-ink-3">
      {label}
      {required && <span className="ml-1 text-danger">*</span>}
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

function ValidationLine({ value }: { value: string }) {
  if (!value) return null;
  const result = parseAccessCode(value);
  if (!result.ok) {
    return (
      <p className="text-[11.5px] font-mono text-ink-3">
        <span className="text-danger">{value}</span> — ogiltig
      </p>
    );
  }
  return (
    <p className="text-[11.5px] text-ink-3">
      <span className="font-mono font-semibold text-ink">{result.parsed.raw}</span> ·{" "}
      <span className="italic">{humanizeAccessCode(value)}</span>
    </p>
  );
}
