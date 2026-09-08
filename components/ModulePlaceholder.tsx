import Icon from "@/components/Icon";
import { EmptyState } from "@/components/ui";

// Ärligt tomt modulskal — bygger på EmptyState-primitiven.
export default function ModulePlaceholder({
  moduleKey,
  title,
  blurb,
}: {
  moduleKey: string;
  title: string;
  blurb: string;
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        glyph={<Icon name={moduleKey} className="mx-auto h-6 w-6" />}
        title={title}
        sub={
          <>
            {blurb}
            <br />
            <span className="text-fg-3">Modulen är inte byggd än — kommer senare.</span>
          </>
        }
      />
    </div>
  );
}
