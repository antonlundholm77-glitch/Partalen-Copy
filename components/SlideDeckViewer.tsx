"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

/* ============================================================================
   SlideDeckViewer
   ----------------------------------------------------------------------------
   Datadriven, återanvändbar slideviewer.

   - Slides definieras som data (array av typade slide-objekt), INTE som JSX.
     Det följer protokolldisciplinen (data driver UI) och promptguide-mönstret:
     en operatör eller en LLM kan generera en deck genom
     att producera en SLIDES-array.

   - Komponenten <Slide> är en switch på `type`. Lägg till en ny slide-typ
     genom att lägga till en case + en renderer. Inget annat behöver röras.

   - Tema: två tillgängliga via prop eller toggle-knapp:
       "warm" — varm papper + oliv (matchar appens default-tema)
       "dark"     — Academy-mörk (grafit + cyan/amber)

   Tangentbord:  →/Space nästa  ·  ← föregående  ·  F helskärm  ·  O översikt
   ========================================================================== */

/* ---------------------------------------------------------------------------
   1. DECK-DATA — Kick-off 2.0
   Byt ut denna array för att köra en annan deck. Inget annat behöver ändras.
   --------------------------------------------------------------------------- */

const DECK = {
  meta: {
    title: "Kick-off 2.0",
    subtitle: "Kick-off",
    presenter: "Kent Karlsson",
    date: "Kick-off",
  },
  slides: [
    /* 1 — COVER */
    {
      type: "cover",
      kicker: "Kick-off",
      title: "Kick-off 2.0",
      subtitle:
        "Fyra operatörer i Luleå. En gemensam idé: vi investerar först i människorna.",
      footer: "Kent Karlsson",
    },

    /* 1b — DAGENS AGENDA */
    {
      type: "agenda",
      title: "Dagen",
      subtitle: "08.30–15.30",
      blocks: [
        { time: "08.30", label: "Välkommen & dagens syfte" },
        { time: "09.00", label: "Vår resa + nyfikenhet som strategi" },
        { time: "10.00", label: "Paus", muted: true },
        { time: "10.15", label: "Operatörsmodellen & AI som förstärkare" },
        { time: "11.15", label: "Plattformen — det gemensamma minnet" },
        { time: "12.00", label: "Lunch", muted: true },
        { time: "13.00", label: "Bygg ditt eget projekt — modellen skarpt", hl: true },
        { time: "15.00", label: "Återsamling: vad byggde vi, vad lärde vi" },
        { time: "15.30", label: "Slut", muted: true },
      ],
      note: "Eftermiddagen är poängen — då testar vi modellen på riktigt.",
    },

    /* 2 — VÅR RESA */
    {
      type: "section",
      index: "01",
      title: "Vår resa",
      subtitle: "Var det började — och varför vi är här.",
    },
    {
      type: "journey",
      title: "En tråd genom åren",
      steps: [
        { label: "Teknisk fysik", desc: "grunden — att tänka i system" },
        { label: "proj@sweco", desc: "tidigt försök att fånga kunskap" },
        { label: "Sweco Cube", desc: "samma idé, nästa form" },
        { label: "CGI", desc: "digitalisering på riktigt" },
        { label: "Egen verksamhet", desc: "där vi är nu" },
      ],
      note: "Olika namn, olika år — samma fråga hela vägen.",
    },

    /* 3 — NYFIKENHET SOM STRATEGI */
    {
      type: "section",
      index: "02",
      title: "Nyfikenhet som strategi",
      subtitle: "De viktigaste idéerna gick inte att planera fram.",
    },
    {
      type: "compare",
      title: "Två sätt att hitta riktning",
      left: {
        head: "De flesta",
        steps: ["Vision", "Strategi", "Plan", "Genomförande"],
        tone: "dim",
      },
      right: {
        head: "Ofta hos oss",
        steps: ["Nyfikenhet", "Utforskande", "Experiment", "Insikt", "Mönster", "Strategi"],
        tone: "accent",
      },
      note: "Inte avsaknad av riktning — tillräcklig nyfikenhet för att upptäcka det oplanerade.",
    },

    /* 4 — DEN RÖDA TRÅDEN */
    {
      type: "statement",
      lead: "Hur kan kunskap bevaras, återanvändas och utvecklas — mellan människor, projekt och organisationer?",
      body:
        "proj@sweco handlade om detta. Sweco Cube. CGI. Egen verksamhet. Plattformen. AI. Det är samma fråga, om och om igen.",
    },

    /* 5 — OPERATÖRSMODELLEN */
    {
      type: "section",
      index: "03",
      title: "Operatörsmodellen",
      subtitle: "Varför vi inte säger konsult.",
    },
    {
      type: "bullets",
      title: "Operatör, inte konsult",
      lead: "En konsult säljer tid. En operatör bygger kapacitet.",
      bullets: [
        "Skapa resultat",
        "Dokumentera lärdomar",
        "Förbättra arbetssätt",
        "Dela kunskap",
        "Hjälpa andra att lyckas",
      ],
      note: "Varje uppdrag ska göra nästa uppdrag bättre.",
    },

    /* 6 — VI BYGGER MÄNNISKOR */
    {
      type: "statement",
      lead: "Vi bygger inte primärt system, projekt eller dokument. Vi bygger människor.",
      body:
        "Och genom människor: kunskap, relationer, projekt, organisationer — och i förlängningen samhällen. Teknik är inte oviktig. Teknik är ett verktyg.",
    },

    /* 7 — AI SOM FÖRSTÄRKARE */
    {
      type: "section",
      index: "04",
      title: "AI som förstärkare",
      subtitle: "Inte målet. En hävstång.",
    },
    {
      type: "bullets",
      title: "AI gör operatören starkare",
      lead: "AI ska hjälpa människor att —",
      bullets: [
        "förstå",
        "strukturera",
        "analysera",
        "kommunicera",
        "fatta bättre beslut",
      ],
      note: "AI ska förstärka operatören. Inte ersätta operatören.",
    },

    /* 8 — PLATTFORMEN */
    {
      type: "section",
      index: "05",
      title: "Plattformen",
      subtitle: "Ett gemensamt minne — inget mer, inget mindre.",
    },
    {
      type: "statement",
      lead: "Ett försök att skapa ett gemensamt minne för människor, projekt och organisationer.",
      body:
        "Inte en revolution. Inte nästa unicorn. Ett verktyg för att bevara kunskap, skapa struktur, minska informationsförluster och förbättra återanvändning.",
    },

    /* 9 — VÅRA PROJEKT IDAG */
    {
      type: "statement",
      lead: "Vårt arbete idag sträcker sig från detaljprojektering till industriprojekt och plattformsbygge.",
      body:
        "Landskap och mark. Stora industriuppdrag som underkonsult. Kommunal infrastruktur. Och plattformen som växer ur det verkliga arbetet — inte vid sidan av det.",
      note: "Kent berättar om de aktuella projekten muntligt.",
    },

    /* 10 — KUNSKAPSFLYWHEEL */
    {
      type: "flywheel",
      title: "Kunskapsflywheel",
      lead: "Varje varv ska göra organisationen lite smartare.",
      steps: ["Projekt", "Erfarenheter", "Kunskap", "Academy", "Playbooks", "Plattformen", "Nya projekt"],
    },

    /* 11 — VAD VI VILL UPPNÅ */
    {
      type: "compare",
      title: "Vad vi mäter oss mot",
      left: {
        head: "Inte",
        steps: ["Flest användare", "Högst värdering", "Snabbast tillväxt"],
        tone: "dim",
      },
      right: {
        head: "Utan",
        steps: ["Bättre operatörer", "Bättre samarbeten", "Bättre projekt", "Bättre kunskapsdelning", "Bättre beslut"],
        tone: "accent",
      },
      note: "Lyckas vi med det följer affären.",
    },

    /* 12 — SYSTEMBRYGGA */
    {
      type: "section",
      index: "06",
      title: "Så ser verktyget ut",
      subtitle: "Kort om hur vi faktiskt jobbar i plattformen.",
    },
    {
      type: "cascade",
      title: "Context Cascade — varje nivå ger kontext till nästa",
      levels: [
        { label: "AboutMe.md", desc: "vem jag är" },
        { label: "Organisation.md", desc: "organisationen jag representerar" },
        { label: "Client.md", desc: "vem kunden är" },
        { label: "Project.md", desc: "vad projektet handlar om" },
        { label: "ProjectTask.md", desc: "vad uppgiften handlar om" },
      ],
      note: "Mindre att börja om från början. Mer som bär vidare.",
    },
    {
      type: "modules",
      title: "Ytorna du jobbar i",
      lead: "Det som är skarpt idag — och det som byggs härnäst.",
      live: ["Dokument", "Behörighet", "Process", "Teknik", "Leverabler"],
      building: ["Tidplan (CPM)", "SmartPrep", "Projektkarta"],
      note: "Vi bygger smalt och djupt — inte brett och tunt.",
    },
    {
      type: "team",
      title: "Fem operatörer",
      lead: "Olika bakgrunder, olika erfarenheter — samma övertygelse.",
      members: [
        { name: "Kent", role: "Founder / Operatör" },
        { name: "Camilla", role: "Operatör" },
        { name: "Daniel", role: "Operatör" },
        { name: "Clas", role: "Ny — välkommen!", you: true },
        { name: "Anders", role: "Operatör" },
        { name: "Anna", role: "Beteendevetare & markkonsult" },
      ],
      note: "FYLL I: roller/ansvar om du vill precisera per person.",
    },
    {
      type: "handson",
      kicker: "Eftermiddagens pass · 13.00–15.00",
      title: "Bygg ditt eget projekt",
      lead: "Nu testar vi modellen skarpt. Var och en bygger ett eget projekt i plattformen.",
      steps: [
        { n: "1", label: "Välj ett verkligt projekt", desc: "ett du kan eller vill äga" },
        { n: "2", label: "Skapa det i plattformen", desc: "klient → projekt → första uppgift" },
        { n: "3", label: "Sätt kontext via cascade", desc: "Client.md · Project.md · Task" },
        { n: "4", label: "Gör en första leverabel", desc: "något skarpt, inte en övning" },
        { n: "5", label: "Skriv en handover", desc: "lämna mer kunskap än du tog emot" },
      ],
      note: "Vi gör det vi lär ut. Fem projekt, fem operatörer, parallellt.",
    },

    /* 13 — SLUTBILD */
    {
      type: "closing",
      title: "Människor som lär sig tillsammans\nkommer längre.",
      subtitle: "Först människorna. Sedan kunskapen. Därefter systemen.",
    },
  ],
};

/* ---------------------------------------------------------------------------
   2. TEMAN  — två tillgängliga: warm (default) och dark
   --------------------------------------------------------------------------- */

type ThemeName = "warm" | "dark";

const THEME_DARK: Record<string, string> = {
  "--bg": "#0E1116",
  "--bg-2": "#141923",
  "--panel": "#1A2030",
  "--ink": "#EAEEF5",
  "--ink-dim": "#9AA6B8",
  "--ink-faint": "#5C6878",
  "--cyan": "#3DDCC8",
  "--cyan-deep": "#1FA897",
  "--amber": "#F2B544",
  "--line": "#26303F",
  "--decor-1": "rgba(61,220,200,.07)",
  "--decor-2": "rgba(242,181,68,.06)",
  "--overlay-bg": "rgba(8,11,16,.85)",
  "--display": "'Comfortaa', system-ui, sans-serif",
  "--serif": "'Frank Ruhl Libre', Georgia, serif",
  "--mono": "'IBM Plex Mono', ui-monospace, monospace",
  "--ui": "'Inter', system-ui, sans-serif",
};

// Varma paletten matchar styles/tokens.css (varm papper + oliv).
const THEME_WARM: Record<string, string> = {
  "--bg": "#f6f3e9",
  "--bg-2": "#efead9",
  "--panel": "#ffffff",
  "--ink": "#232014",
  "--ink-dim": "#6e6a52",
  "--ink-faint": "#a8a48c",
  "--cyan": "#6d6930",
  "--cyan-deep": "#4f4b22",
  "--amber": "#b5532a",
  "--line": "#d9d2bb",
  "--decor-1": "rgba(109,105,48,.07)",
  "--decor-2": "rgba(181,83,42,.05)",
  "--overlay-bg": "rgba(246,243,233,.92)",
  "--display": "'Comfortaa', system-ui, sans-serif",
  "--serif": "'Frank Ruhl Libre', Georgia, serif",
  "--mono": "'IBM Plex Mono', ui-monospace, monospace",
  "--ui": "'Inter', system-ui, sans-serif",
};

const THEMES: Record<ThemeName, Record<string, string>> = {
  warm: THEME_WARM,
  dark: THEME_DARK,
};

/* ---------------------------------------------------------------------------
   3. SLIDE-RENDERERS  — en per typ. Lägg till en case för en ny slide-typ.
   --------------------------------------------------------------------------- */

type SlideData = Record<string, any>;

function Cover({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-cover">
      <div className="gsv-cover-grid" />
      <span className="gsv-kicker">{s.kicker}</span>
      <h1 className="gsv-cover-title">
        {s.title.split("\n").map((l: string, i: number) => (
          <span key={i}>{l}<br /></span>
        ))}
      </h1>
      <p className="gsv-cover-sub">{s.subtitle}</p>
      <div className="gsv-cover-foot">{s.footer}</div>
    </div>
  );
}

function Section({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-section">
      <div className="gsv-section-index">{s.index}</div>
      <h2 className="gsv-section-title">{s.title}</h2>
      <p className="gsv-section-sub">{s.subtitle}</p>
    </div>
  );
}

function Statement({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-statement">
      <div className="gsv-quote-mark">”</div>
      <p className="gsv-statement-lead">{s.lead}</p>
      <p className="gsv-statement-body">{s.body}</p>
    </div>
  );
}

function Bullets({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-bullets">
      <h2 className="gsv-h2">{s.title}</h2>
      {s.lead && <p className="gsv-lead">{s.lead}</p>}
      <ul className="gsv-list">
        {s.bullets.map((b: string, i: number) => (
          <li key={i} style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
            <span className="gsv-bullet-dot" />
            {b}
          </li>
        ))}
      </ul>
      {s.note && <p className="gsv-note">{s.note}</p>}
    </div>
  );
}

function Team({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-team">
      <h2 className="gsv-h2">{s.title}</h2>
      {s.lead && <p className="gsv-lead">{s.lead}</p>}
      <div className="gsv-team-grid">
        {s.members.map((m: SlideData, i: number) => (
          <div
            key={i}
            className={`gsv-card ${m.you ? "gsv-card-hl" : ""}`}
            style={{ animationDelay: `${0.15 + i * 0.07}s` }}
          >
            <div className="gsv-avatar">{m.name.slice(0, 1)}</div>
            <div className="gsv-card-name">{m.name}</div>
            <div className="gsv-card-role">{m.role}</div>
          </div>
        ))}
      </div>
      {s.note && <p className="gsv-note gsv-note-warn">{s.note}</p>}
    </div>
  );
}

function Cascade({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-cascade">
      <h2 className="gsv-h2">{s.title}</h2>
      <div className="gsv-cascade-stack">
        {s.levels.map((l: SlideData, i: number) => (
          <div
            key={i}
            className="gsv-cascade-row"
            style={{
              marginLeft: `${i * 2.4}rem`,
              animationDelay: `${0.12 + i * 0.09}s`,
            }}
          >
            <code className="gsv-cascade-label">{l.label}</code>
            <span className="gsv-cascade-desc">{l.desc}</span>
          </div>
        ))}
      </div>
      {s.note && <p className="gsv-note">{s.note}</p>}
    </div>
  );
}

function Modules({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-modules">
      <h2 className="gsv-h2">{s.title}</h2>
      {s.lead && <p className="gsv-lead">{s.lead}</p>}
      <div className="gsv-mod-cols">
        <div>
          <div className="gsv-mod-head gsv-mod-head-live">Levande</div>
          <div className="gsv-chips">
            {s.live.map((m: string, i: number) => (
              <span key={i} className="gsv-chip gsv-chip-live"
                style={{ animationDelay: `${0.15 + i * 0.06}s` }}>{m}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="gsv-mod-head gsv-mod-head-build">Under bygge</div>
          <div className="gsv-chips">
            {s.building.map((m: string, i: number) => (
              <span key={i} className="gsv-chip gsv-chip-build"
                style={{ animationDelay: `${0.3 + i * 0.06}s` }}>{m}</span>
            ))}
          </div>
        </div>
      </div>
      {s.note && <p className="gsv-note">{s.note}</p>}
    </div>
  );
}

function Roles({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-roles">
      <h2 className="gsv-h2">{s.title}</h2>
      <div className="gsv-roles-row">
        {s.roles.map((r: SlideData, i: number) => (
          <div key={i} className="gsv-role-card"
            style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
            <div className="gsv-role-name">{r.name}</div>
            <div className="gsv-role-desc">{r.desc}</div>
          </div>
        ))}
      </div>
      {s.note && <p className="gsv-note">{s.note}</p>}
    </div>
  );
}

function Principles({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-principles">
      <h2 className="gsv-h2">{s.title}</h2>
      <div className="gsv-princ-stack">
        {s.principles.map((p: SlideData, i: number) => (
          <div key={i} className="gsv-princ-row"
            style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
            <div className="gsv-princ-n">{p.n}</div>
            <div>
              <div className="gsv-princ-name">{p.name}</div>
              <div className="gsv-princ-desc">{p.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Checklist({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-checklist">
      <h2 className="gsv-h2">{s.title}</h2>
      {s.lead && <p className="gsv-lead">{s.lead}</p>}
      <ul className="gsv-check-list">
        {s.items.map((it: string, i: number) => (
          <li key={i} style={{ animationDelay: `${0.15 + i * 0.09}s` }}>
            <span className="gsv-check-box" />
            {it}
          </li>
        ))}
      </ul>
      {s.note && <p className="gsv-note gsv-note-warn">{s.note}</p>}
    </div>
  );
}

function Closing({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-closing">
      <div className="gsv-cover-grid" />
      <h2 className="gsv-closing-title">
        {s.title.split("\n").map((l: string, i: number) => (
          <span key={i}>{l}<br /></span>
        ))}
      </h2>
      <p className="gsv-closing-sub">{s.subtitle}</p>
    </div>
  );
}

function Journey({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-journey">
      <h2 className="gsv-h2">{s.title}</h2>
      <div className="gsv-journey-track">
        {s.steps.map((st: SlideData, i: number) => (
          <React.Fragment key={i}>
            <div className="gsv-journey-node" style={{ animationDelay: `${0.12 + i * 0.12}s` }}>
              <div className="gsv-journey-dot" />
              <div className="gsv-journey-label">{st.label}</div>
              <div className="gsv-journey-desc">{st.desc}</div>
            </div>
            {i < s.steps.length - 1 && <div className="gsv-journey-line" style={{ animationDelay: `${0.18 + i * 0.12}s` }} />}
          </React.Fragment>
        ))}
      </div>
      {s.note && <p className="gsv-note">{s.note}</p>}
    </div>
  );
}

function Compare({ s }: { s: SlideData }) {
  const col = (c: SlideData, side: "l" | "r") => (
    <div className={`gsv-cmp-col gsv-cmp-${c.tone}`}>
      <div className="gsv-cmp-head">{c.head}</div>
      <div className="gsv-cmp-steps">
        {c.steps.map((st: string, i: number) => (
          <div key={i} className="gsv-cmp-step"
            style={{ animationDelay: `${0.15 + i * 0.08 + (side === "r" ? 0.1 : 0)}s` }}>
            {st}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="gsv-slide gsv-compare">
      <h2 className="gsv-h2">{s.title}</h2>
      <div className="gsv-cmp-row">
        {col(s.left, "l")}
        <div className="gsv-cmp-vs">→</div>
        {col(s.right, "r")}
      </div>
      {s.note && <p className="gsv-note">{s.note}</p>}
    </div>
  );
}

function Flywheel({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-flywheel">
      <h2 className="gsv-h2">{s.title}</h2>
      {s.lead && <p className="gsv-lead">{s.lead}</p>}
      <div className="gsv-fly-track">
        {s.steps.map((st: string, i: number) => (
          <React.Fragment key={i}>
            <span className="gsv-fly-step" style={{ animationDelay: `${0.12 + i * 0.1}s` }}>{st}</span>
            {i < s.steps.length - 1 && <span className="gsv-fly-arrow" style={{ animationDelay: `${0.16 + i * 0.1}s` }}>↻</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function Agenda({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-agenda">
      <div className="gsv-agenda-head">
        <h2 className="gsv-h2">{s.title}</h2>
        {s.subtitle && <span className="gsv-agenda-span">{s.subtitle}</span>}
      </div>
      <div className="gsv-agenda-list">
        {s.blocks.map((b: SlideData, i: number) => (
          <div
            key={i}
            className={`gsv-agenda-row ${b.hl ? "gsv-agenda-hl" : ""} ${b.muted ? "gsv-agenda-muted" : ""}`}
            style={{ animationDelay: `${0.1 + i * 0.05}s` }}
          >
            <span className="gsv-agenda-time">{b.time}</span>
            <span className="gsv-agenda-label">{b.label}</span>
          </div>
        ))}
      </div>
      {s.note && <p className="gsv-note">{s.note}</p>}
    </div>
  );
}

function Handson({ s }: { s: SlideData }) {
  return (
    <div className="gsv-slide gsv-handson">
      {s.kicker && <span className="gsv-kicker">{s.kicker}</span>}
      <h2 className="gsv-h2 gsv-handson-title">{s.title}</h2>
      {s.lead && <p className="gsv-lead">{s.lead}</p>}
      <div className="gsv-handson-steps">
        {s.steps.map((st: SlideData, i: number) => (
          <div key={i} className="gsv-handson-step" style={{ animationDelay: `${0.15 + i * 0.09}s` }}>
            <div className="gsv-handson-n">{st.n}</div>
            <div className="gsv-handson-label">{st.label}</div>
            <div className="gsv-handson-desc">{st.desc}</div>
          </div>
        ))}
      </div>
      {s.note && <p className="gsv-note gsv-note-accent">{s.note}</p>}
    </div>
  );
}

const RENDERERS: Record<string, React.FC<{ s: SlideData }>> = {
  cover: Cover,
  section: Section,
  statement: Statement,
  bullets: Bullets,
  team: Team,
  cascade: Cascade,
  modules: Modules,
  roles: Roles,
  principles: Principles,
  checklist: Checklist,
  closing: Closing,
  journey: Journey,
  compare: Compare,
  flywheel: Flywheel,
  agenda: Agenda,
  handson: Handson,
};

function Slide({ slide }: { slide: SlideData }) {
  const R = RENDERERS[slide.type];
  if (!R) {
    return (
      <div className="gsv-slide">
        <p className="gsv-note gsv-note-warn">
          Okänd slide-typ: <code>{slide.type}</code>
        </p>
      </div>
    );
  }
  return <R s={slide} />;
}

/* ---------------------------------------------------------------------------
   4. VIEWERN  — navigation, progress, översikt, helskärm, tema-toggle
   --------------------------------------------------------------------------- */

interface DeckData {
  meta: { title: string; subtitle?: string; presenter?: string; date?: string };
  slides: SlideData[];
}

export default function SlideDeckViewer({
  deck = DECK as DeckData,
  initialTheme = "warm" as ThemeName,
}: {
  deck?: DeckData;
  initialTheme?: ThemeName;
}) {
  const slides = deck.slides;
  const [i, setI] = useState(0);
  const [overview, setOverview] = useState(false);
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const go = useCallback(
    (n: number) => setI((cur) => Math.max(0, Math.min(slides.length - 1, n))),
    [slides.length]
  );
  const next = useCallback(() => go(i + 1), [i, go]);
  const prev = useCallback(() => go(i - 1), [i, go]);

  const toggleFull = useCallback(() => {
    const el = rootRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "warm" ? "dark" : "warm"));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "f" || e.key === "F") toggleFull();
      else if (e.key === "o" || e.key === "O") setOverview((v) => !v);
      else if (e.key === "t" || e.key === "T") toggleTheme();
      else if (e.key === "Escape") setOverview(false);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(slides.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, toggleFull, toggleTheme, go, slides.length]);

  return (
    <div
      ref={rootRef}
      className="gsv-root"
      style={THEMES[theme] as React.CSSProperties}
    >
      <style>{CSS}</style>

      {/* progressbar */}
      <div className="gsv-progress">
        <div
          className="gsv-progress-fill"
          style={{ width: `${((i + 1) / slides.length) * 100}%` }}
        />
      </div>

      {/* aktuell slide */}
      <div className="gsv-stage" key={i}>
        <Slide slide={slides[i]} />
      </div>

      {/* kontroller */}
      <div className="gsv-controls">
        <button className="gsv-btn" onClick={prev} disabled={i === 0} aria-label="Föregående">←</button>
        <span className="gsv-counter">
          <span className="gsv-counter-cur">{String(i + 1).padStart(2, "0")}</span>
          <span className="gsv-counter-sep">/</span>
          {String(slides.length).padStart(2, "0")}
        </span>
        <button className="gsv-btn" onClick={next} disabled={i === slides.length - 1} aria-label="Nästa">→</button>
        <div className="gsv-controls-spacer" />
        <button
          className="gsv-btn gsv-btn-ghost"
          onClick={toggleTheme}
          aria-label={`Byt till ${theme === "warm" ? "Dark mode" : "Warm mode"}`}
          title={`Tema: ${theme === "warm" ? "Warm" : "Dark"} (T)`}
        >
          {theme === "warm" ? "◐" : "◑"}
        </button>
        <button className="gsv-btn gsv-btn-ghost" onClick={() => setOverview((v) => !v)} aria-label="Översikt">▦</button>
        <button className="gsv-btn gsv-btn-ghost" onClick={toggleFull} aria-label="Helskärm">⛶</button>
      </div>

      {/* hint */}
      <div className="gsv-hint">→ / mellanslag · F helskärm · O översikt · T tema</div>

      {/* översiktsläge */}
      {overview && (
        <div className="gsv-overview" onClick={() => setOverview(false)}>
          <div className="gsv-overview-inner" onClick={(e) => e.stopPropagation()}>
            <div className="gsv-overview-head">
              <span>{deck.meta.title}</span>
              <button className="gsv-btn gsv-btn-ghost" onClick={() => setOverview(false)}>✕</button>
            </div>
            <div className="gsv-overview-grid">
              {slides.map((sl, idx) => (
                <button
                  key={idx}
                  className={`gsv-thumb ${idx === i ? "gsv-thumb-active" : ""}`}
                  onClick={() => { go(idx); setOverview(false); }}
                >
                  <span className="gsv-thumb-n">{String(idx + 1).padStart(2, "0")}</span>
                  <span className="gsv-thumb-title">
                    {sl.title?.replace(/\n/g, " ") || sl.lead || sl.kicker || sl.type}
                  </span>
                  <span className="gsv-thumb-type">{sl.type}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   5. STIL
   --------------------------------------------------------------------------- */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');

.gsv-root{
  position:relative; width:100%; height:100%; min-height:640px;
  background:
    radial-gradient(1200px 600px at 80% -10%, var(--decor-1), transparent 60%),
    radial-gradient(900px 500px at -10% 110%, var(--decor-2), transparent 55%),
    var(--bg);
  color:var(--ink); font-family:var(--ui);
  overflow:hidden; border-radius:16px;
  display:flex; flex-direction:column;
}
.gsv-root *{ box-sizing:border-box; }

.gsv-progress{ position:absolute; top:0; left:0; right:0; height:3px; background:var(--line); z-index:5; }
.gsv-progress-fill{ height:100%; background:linear-gradient(90deg,var(--cyan-deep),var(--cyan)); transition:width .4s cubic-bezier(.4,0,.2,1); }

.gsv-stage{ flex:1; display:flex; align-items:center; justify-content:center; padding:clamp(2rem,5vw,5rem); animation:gsv-fade .5s ease; }
@keyframes gsv-fade{ from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:none;} }

.gsv-slide{ width:100%; max-width:980px; }

/* generella typografiska element */
.gsv-h2{ font-family:var(--display); font-weight:600; font-size:clamp(1.8rem,3.6vw,2.9rem); margin:0 0 .4em; letter-spacing:-.01em; }
.gsv-lead{ font-family:var(--serif); font-size:clamp(1.05rem,1.8vw,1.35rem); color:var(--ink-dim); margin:0 0 1.6em; line-height:1.5; }
.gsv-note{ margin-top:2rem; font-family:var(--mono); font-size:.82rem; color:var(--ink-faint); }
.gsv-note-warn{ color:var(--amber); }
.gsv-note-accent{ color:var(--cyan); }
.gsv-kicker{ font-family:var(--mono); font-size:.82rem; letter-spacing:.18em; text-transform:uppercase; color:var(--cyan); }

/* COVER */
.gsv-cover, .gsv-closing{ position:relative; }
.gsv-cover-grid{ position:absolute; inset:-5rem; background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px); background-size:48px 48px; opacity:.25; mask-image:radial-gradient(circle at 70% 30%,black,transparent 70%); pointer-events:none; }
.gsv-cover-title{ font-family:var(--display); font-weight:700; font-size:clamp(2.8rem,7vw,5.4rem); line-height:1.02; letter-spacing:-.02em; margin:.3em 0 .3em; }
.gsv-cover-sub{ font-family:var(--serif); font-size:clamp(1.1rem,2vw,1.45rem); color:var(--ink-dim); max-width:30ch; line-height:1.5; }
.gsv-cover-foot{ position:absolute; bottom:0; left:0; font-family:var(--mono); font-size:.85rem; color:var(--ink-faint); }

/* SECTION */
.gsv-section-index{ font-family:var(--mono); font-size:clamp(3rem,9vw,7rem); font-weight:500; color:var(--cyan-deep); line-height:1; opacity:.55; }
.gsv-section-title{ font-family:var(--display); font-weight:700; font-size:clamp(2.4rem,5.5vw,4rem); margin:.1em 0 .25em; letter-spacing:-.02em; }
.gsv-section-sub{ font-family:var(--serif); font-size:clamp(1.05rem,1.8vw,1.3rem); color:var(--ink-dim); }

/* STATEMENT */
.gsv-statement{ position:relative; }
.gsv-quote-mark{ font-family:var(--serif); font-size:8rem; line-height:.6; color:var(--cyan-deep); opacity:.35; }
.gsv-statement-lead{ font-family:var(--display); font-weight:600; font-size:clamp(1.7rem,3.6vw,2.7rem); line-height:1.25; letter-spacing:-.01em; margin:.2em 0 .6em; }
.gsv-statement-body{ font-family:var(--serif); font-size:clamp(1.05rem,1.9vw,1.35rem); color:var(--ink-dim); line-height:1.55; max-width:54ch; }

/* BULLETS */
.gsv-list{ list-style:none; margin:0; padding:0; }
.gsv-list li{ display:flex; align-items:center; gap:1rem; font-size:clamp(1.1rem,2.2vw,1.6rem); padding:.55rem 0; opacity:0; animation:gsv-rise .5s ease forwards; }
.gsv-bullet-dot{ width:9px; height:9px; border-radius:50%; background:var(--cyan); flex:none; box-shadow:0 0 0 4px rgba(0,0,0,.04); }
@keyframes gsv-rise{ from{opacity:0; transform:translateX(-12px);} to{opacity:1; transform:none;} }

/* TEAM */
.gsv-team-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1rem; }
.gsv-card{ background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:1.4rem 1rem; text-align:center; opacity:0; animation:gsv-rise .5s ease forwards; }
.gsv-card-hl{ border-color:var(--cyan); box-shadow:0 0 0 1px var(--cyan), 0 8px 30px rgba(0,0,0,.08); }
.gsv-avatar{ width:48px; height:48px; border-radius:50%; margin:0 auto .7rem; display:grid; place-items:center; font-family:var(--display); font-weight:700; font-size:1.3rem; background:linear-gradient(135deg,var(--cyan-deep),var(--cyan)); color:var(--bg); }
.gsv-card-hl .gsv-avatar{ background:linear-gradient(135deg,var(--amber),var(--cyan-deep)); color:var(--bg); }
.gsv-card-name{ font-family:var(--display); font-weight:600; font-size:1.1rem; }
.gsv-card-role{ font-size:.85rem; color:var(--ink-dim); margin-top:.2rem; }

/* CASCADE */
.gsv-cascade-stack{ display:flex; flex-direction:column; gap:.55rem; }
.gsv-cascade-row{ display:flex; align-items:center; gap:1rem; background:var(--panel); border:1px solid var(--line); border-left:3px solid var(--cyan); border-radius:10px; padding:.7rem 1.1rem; opacity:0; animation:gsv-rise .5s ease forwards; }
.gsv-cascade-label{ font-family:var(--mono); font-size:.95rem; color:var(--cyan); }
.gsv-cascade-desc{ font-size:.92rem; color:var(--ink-dim); }

/* MODULES */
.gsv-mod-cols{ display:grid; grid-template-columns:1fr 1fr; gap:2rem; }
.gsv-mod-head{ font-family:var(--mono); font-size:.78rem; letter-spacing:.12em; text-transform:uppercase; margin-bottom:.9rem; }
.gsv-mod-head-live{ color:var(--cyan); }
.gsv-mod-head-build{ color:var(--amber); }
.gsv-chips{ display:flex; flex-wrap:wrap; gap:.6rem; }
.gsv-chip{ font-size:.98rem; padding:.5rem .9rem; border-radius:999px; opacity:0; animation:gsv-rise .4s ease forwards; }
.gsv-chip-live{ background:var(--bg-2); border:1px solid var(--cyan-deep); color:var(--ink); }
.gsv-chip-build{ background:var(--bg-2); border:1px dashed var(--amber); color:var(--ink-dim); }

/* ROLES */
.gsv-roles-row{ display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-top:1rem; }
.gsv-role-card{ background:var(--panel); border:1px solid var(--line); border-top:3px solid var(--cyan); border-radius:14px; padding:1.5rem 1.2rem; opacity:0; animation:gsv-rise .5s ease forwards; }
.gsv-role-name{ font-family:var(--display); font-weight:600; font-size:1.4rem; margin-bottom:.4rem; }
.gsv-role-desc{ color:var(--ink-dim); font-size:.95rem; line-height:1.5; }

/* PRINCIPLES */
.gsv-princ-stack{ display:flex; flex-direction:column; gap:1.1rem; }
.gsv-princ-row{ display:flex; gap:1.3rem; align-items:flex-start; opacity:0; animation:gsv-rise .5s ease forwards; }
.gsv-princ-n{ font-family:var(--display); font-weight:700; font-size:1.6rem; color:var(--bg); background:var(--cyan); width:44px; height:44px; border-radius:11px; display:grid; place-items:center; flex:none; }
.gsv-princ-name{ font-family:var(--display); font-weight:600; font-size:1.3rem; }
.gsv-princ-desc{ color:var(--ink-dim); font-size:1rem; line-height:1.5; margin-top:.25rem; max-width:60ch; }

/* CHECKLIST */
.gsv-check-list{ list-style:none; margin:0; padding:0; }
.gsv-check-list li{ display:flex; align-items:center; gap:1rem; font-size:clamp(1.05rem,2vw,1.4rem); padding:.5rem 0; opacity:0; animation:gsv-rise .5s ease forwards; }
.gsv-check-box{ width:22px; height:22px; border-radius:6px; border:2px solid var(--cyan); flex:none; }

/* CLOSING */
.gsv-closing-title{ font-family:var(--display); font-weight:700; font-size:clamp(2rem,5vw,3.6rem); line-height:1.1; letter-spacing:-.02em; }
.gsv-closing-sub{ font-family:var(--serif); font-size:clamp(1.1rem,2vw,1.4rem); color:var(--cyan); margin-top:1rem; }

/* CONTROLS */
.gsv-controls{ display:flex; align-items:center; gap:.6rem; padding:1rem 1.4rem; border-top:1px solid var(--line); background:var(--bg-2); }
.gsv-controls-spacer{ flex:1; }
.gsv-btn{ background:var(--panel); color:var(--ink); border:1px solid var(--line); border-radius:9px; min-width:42px; height:42px; padding:0 .9rem; font-size:1.1rem; cursor:pointer; transition:all .15s ease; font-family:var(--ui); }
.gsv-btn:hover:not(:disabled){ border-color:var(--cyan); color:var(--cyan); transform:translateY(-1px); }
.gsv-btn:disabled{ opacity:.3; cursor:not-allowed; }
.gsv-btn-ghost{ background:transparent; }
.gsv-counter{ font-family:var(--mono); font-size:.95rem; color:var(--ink-dim); padding:0 .6rem; }
.gsv-counter-cur{ color:var(--cyan); }
.gsv-counter-sep{ margin:0 .35rem; color:var(--ink-faint); }
.gsv-hint{ position:absolute; bottom:5.2rem; right:1.4rem; font-family:var(--mono); font-size:.72rem; color:var(--ink-faint); pointer-events:none; }

/* OVERVIEW */
.gsv-overview{ position:absolute; inset:0; background:var(--overlay-bg); backdrop-filter:blur(6px); z-index:10; display:flex; align-items:center; justify-content:center; padding:2rem; animation:gsv-fade .25s ease; }
.gsv-overview-inner{ background:var(--bg-2); border:1px solid var(--line); border-radius:16px; width:100%; max-width:900px; max-height:85%; display:flex; flex-direction:column; overflow:hidden; }
.gsv-overview-head{ display:flex; justify-content:space-between; align-items:center; padding:1rem 1.3rem; border-bottom:1px solid var(--line); font-family:var(--display); font-weight:600; }
.gsv-overview-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:.7rem; padding:1.3rem; overflow:auto; }
.gsv-thumb{ text-align:left; background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:.9rem; cursor:pointer; display:flex; flex-direction:column; gap:.3rem; transition:all .15s ease; color:var(--ink); }
.gsv-thumb:hover{ border-color:var(--cyan); transform:translateY(-2px); }
.gsv-thumb-active{ border-color:var(--cyan); box-shadow:0 0 0 1px var(--cyan); }
.gsv-thumb-n{ font-family:var(--mono); font-size:.72rem; color:var(--cyan); }
.gsv-thumb-title{ font-family:var(--display); font-weight:500; font-size:.92rem; line-height:1.25; }
.gsv-thumb-type{ font-family:var(--mono); font-size:.68rem; color:var(--ink-faint); }

/* JOURNEY */
.gsv-journey-track{ display:flex; align-items:stretch; gap:0; flex-wrap:wrap; }
.gsv-journey-node{ flex:1; min-width:120px; opacity:0; animation:gsv-rise .5s ease forwards; }
.gsv-journey-dot{ width:14px; height:14px; border-radius:50%; background:var(--cyan); box-shadow:0 0 0 5px rgba(0,0,0,.04); margin-bottom:.9rem; }
.gsv-journey-label{ font-family:var(--display); font-weight:600; font-size:1.15rem; }
.gsv-journey-desc{ font-size:.85rem; color:var(--ink-dim); margin-top:.25rem; line-height:1.4; padding-right:1rem; }
.gsv-journey-line{ flex:none; align-self:flex-start; width:2.5rem; height:2px; background:var(--line); margin-top:6px; opacity:0; animation:gsv-fade .5s ease forwards; }

/* COMPARE */
.gsv-cmp-row{ display:flex; align-items:center; gap:1.5rem; }
.gsv-cmp-col{ flex:1; background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:1.4rem 1.3rem; }
.gsv-cmp-accent{ border-color:var(--cyan-deep); box-shadow:0 0 0 1px var(--cyan-deep), 0 8px 30px rgba(0,0,0,.06); }
.gsv-cmp-head{ font-family:var(--mono); font-size:.78rem; letter-spacing:.14em; text-transform:uppercase; margin-bottom:1rem; }
.gsv-cmp-dim .gsv-cmp-head{ color:var(--ink-faint); }
.gsv-cmp-accent .gsv-cmp-head{ color:var(--cyan); }
.gsv-cmp-steps{ display:flex; flex-direction:column; gap:.5rem; }
.gsv-cmp-step{ font-family:var(--display); font-size:1.05rem; padding:.45rem .8rem; border-radius:8px; opacity:0; animation:gsv-rise .45s ease forwards; }
.gsv-cmp-dim .gsv-cmp-step{ color:var(--ink-dim); background:var(--bg-2); }
.gsv-cmp-accent .gsv-cmp-step{ color:var(--ink); background:var(--bg-2); }
.gsv-cmp-vs{ font-size:1.6rem; color:var(--cyan); flex:none; }

/* FLYWHEEL */
.gsv-fly-track{ display:flex; flex-wrap:wrap; align-items:center; gap:.6rem; margin-top:.5rem; }
.gsv-fly-step{ font-family:var(--display); font-weight:500; font-size:clamp(1rem,1.9vw,1.3rem); background:var(--panel); border:1px solid var(--line); border-radius:999px; padding:.55rem 1.1rem; opacity:0; animation:gsv-rise .45s ease forwards; }
.gsv-fly-arrow{ color:var(--cyan); font-size:1.2rem; opacity:0; animation:gsv-fade .45s ease forwards; }

/* AGENDA */
.gsv-agenda-head{ display:flex; align-items:baseline; gap:1rem; margin-bottom:1.2rem; }
.gsv-agenda-span{ font-family:var(--mono); font-size:.9rem; color:var(--cyan); }
.gsv-agenda-list{ display:flex; flex-direction:column; gap:.35rem; }
.gsv-agenda-row{ display:flex; align-items:center; gap:1.2rem; padding:.55rem .9rem; border-radius:9px; border:1px solid transparent; opacity:0; animation:gsv-rise .4s ease forwards; }
.gsv-agenda-time{ font-family:var(--mono); font-size:1rem; color:var(--cyan); min-width:3.6rem; }
.gsv-agenda-label{ font-size:1.05rem; }
.gsv-agenda-hl{ background:var(--bg-2); border-color:var(--cyan-deep); }
.gsv-agenda-hl .gsv-agenda-label{ font-weight:600; }
.gsv-agenda-muted{ opacity:.5; }
.gsv-agenda-muted .gsv-agenda-time{ color:var(--ink-faint); }

/* HANDSON */
.gsv-handson-title{ color:var(--cyan); margin-top:.3em; }
.gsv-handson-steps{ display:grid; grid-template-columns:repeat(5,1fr); gap:.8rem; margin-top:.5rem; }
.gsv-handson-step{ background:var(--panel); border:1px solid var(--line); border-top:3px solid var(--cyan); border-radius:12px; padding:1.1rem .9rem; opacity:0; animation:gsv-rise .5s ease forwards; }
.gsv-handson-n{ font-family:var(--display); font-weight:700; font-size:1.3rem; color:var(--bg); background:var(--cyan); width:36px; height:36px; border-radius:9px; display:grid; place-items:center; margin-bottom:.7rem; }
.gsv-handson-label{ font-family:var(--display); font-weight:600; font-size:1rem; line-height:1.2; }
.gsv-handson-desc{ font-size:.82rem; color:var(--ink-dim); margin-top:.35rem; line-height:1.4; }

/* RESPONSIVT */
@media (max-width:680px){
  .gsv-handson-steps{ grid-template-columns:1fr 1fr; }
  .gsv-cmp-row{ flex-direction:column; }
  .gsv-cmp-vs{ transform:rotate(90deg); }
  .gsv-journey-line{ display:none; }
  .gsv-mod-cols{ grid-template-columns:1fr; gap:1.3rem; }
  .gsv-roles-row{ grid-template-columns:1fr; }
  .gsv-cascade-row{ margin-left:0 !important; }
  .gsv-hint{ display:none; }
}
`;
