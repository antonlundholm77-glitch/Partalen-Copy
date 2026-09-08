// Lättviktiga inline-ikoner (stroke) per modul. 16px, ärver currentColor.

const PATHS: Record<string, React.ReactNode> = {
  oversikt: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  smartprep: (
    <>
      <path d="M4 5h16" />
      <path d="M4 12h16" />
      <path d="M4 19h10" />
      <circle cx="18.5" cy="19" r="1.6" />
    </>
  ),
  projektkarta: (
    <>
      <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z" />
      <path d="M9 3v16" />
      <path d="M15 5v16" />
    </>
  ),
  risk: (
    <>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4" />
      <path d="M12 17.5v.5" />
    </>
  ),
  tidplan: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
    </>
  ),
  arbetsmiljo: (
    <>
      <path d="M12 3a9 9 0 0 1 9 9v0a9 9 0 0 1-18 0v0a9 9 0 0 1 9-9Z" />
      <path d="M3.5 12h17" />
      <path d="M12 3v3" />
    </>
  ),
  omraden: (
    <>
      <path d="M3 7v13l6-3 6 3 6-3V4l-6 3-6-3-6 3Z" />
      <path d="M9 4v13M15 7v13" />
    </>
  ),
  genomforande: (
    <>
      <circle cx="5" cy="6" r="2" />
      <circle cx="5" cy="18" r="2" />
      <path d="M5 8v8" />
      <path d="M9 6h7a2 2 0 0 1 2 2v2" />
      <path d="M9 18h7a2 2 0 0 0 2-2" />
      <path d="m16 7-2 2 2 2" />
    </>
  ),
  tekniska: (
    <>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2-2 2.4-2.4Z" />
    </>
  ),
  fragor: (
    <>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l.8-5.5A8 8 0 1 1 21 12Z" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.7.3-1.2.8-1.2 1.6" />
      <path d="M11.5 16.5h.01" />
    </>
  ),
  kontrollplan: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m8 8 1.5 1.5L12 7" />
      <path d="m8 14 1.5 1.5L12 13" />
      <path d="M15 8.5h2M15 14.5h2" />
    </>
  ),
  moten: (
    <>
      <circle cx="9" cy="8" r="2.5" />
      <circle cx="16" cy="9" r="2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M14.5 14.5a4.5 4.5 0 0 1 6 4.5" />
    </>
  ),
  kunder: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16" />
      <path d="M13 9h5a1 1 0 0 1 1 1v11" />
      <path d="M8 8h2M8 12h2M8 16h2M16 13h0M16 17h0" />
    </>
  ),
  behorighet: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5" />
      <path d="M18 14.5a5.5 5.5 0 0 1 3 5" />
    </>
  ),
  dokument: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </>
  ),
  process: (
    <>
      <rect x="3" y="4" width="6" height="5" rx="1" />
      <rect x="15" y="15" width="6" height="5" rx="1" />
      <path d="M6 9v4a2 2 0 0 0 2 2h7" />
    </>
  ),
  schema: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M8 13h3" />
      <path d="M8 17h6" />
    </>
  ),
  forelasningar: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M12 16v3" />
      <path d="M8 21h8" />
    </>
  ),
  kursmaterial: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" />
      <path d="M4 19a2 2 0 0 1 2-2h13" />
    </>
  ),
  lankar: (
    <>
      <path d="M9 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
      <path d="M15 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </>
  ),
};

export default function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.oversikt}
    </svg>
  );
}
