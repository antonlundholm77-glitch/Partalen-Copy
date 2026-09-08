import { EmptyState } from "@/components/ui";

// Platshållare för riktiga adminvyer tills Supabase-data är inkopplad.
export default function PendingPanel({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        title={title}
        sub={
          <>
            {blurb}
            <br />
            <span className="text-fg-3">
              Aktiveras när Supabase-data är inkopplad (se docs/access-control.md).
              Förhandsvisningen visar vyn med exempeldata.
            </span>
          </>
        }
      />
    </div>
  );
}
