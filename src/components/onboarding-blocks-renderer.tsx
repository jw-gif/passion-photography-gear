import { Card } from "@/components/ui/card";
import type { ContentBlock } from "@/lib/onboarding";

export function BlocksRenderer({ blocks }: { blocks: ContentBlock[] }) {
  if (blocks.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="text-sm text-muted-foreground">This page is empty.</div>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading":
      return <h2 className="text-lg font-semibold tracking-tight mt-2">{block.text}</h2>;
    case "paragraph":
      return (
        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{block.text}</p>
      );
    case "callout":
      return (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
          {block.label && (
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
              {block.label}
            </div>
          )}
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{block.text}</div>
        </div>
      );
    case "card":
      return (
        <Card className="p-5">
          <div className="font-semibold mb-1.5">{block.title}</div>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {block.body}
          </div>
        </Card>
      );
    case "two_col":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[block.left, block.right].map((side, i) => (
            <Card key={i} className="p-5">
              <div className="font-semibold mb-1.5">{side.title}</div>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {side.body}
              </div>
            </Card>
          ))}
        </div>
      );
    case "table":
      return (
        <Card className="p-5">
          {block.title && <div className="font-semibold mb-3">{block.title}</div>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {block.columns.map((c, i) => (
                    <th
                      key={i}
                      className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b py-2 px-2"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {block.columns.map((_, j) => (
                      <td key={j} className="py-2 px-2 align-top whitespace-pre-wrap">
                        {row[j] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      );
    case "people":
      return (
        <Card className="p-5">
          {block.title && <div className="font-semibold mb-3">{block.title}</div>}
          <ul className="divide-y">
            {block.people.map((p, i) => (
              <li key={i} className="py-2.5 flex items-center gap-3">
                <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {(p.name || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{p.name || "Unnamed"}</div>
                  {p.role && <div className="text-xs text-muted-foreground truncate">{p.role}</div>}
                </div>
                {p.slack && (
                  <div className="text-xs text-muted-foreground font-mono">{p.slack}</div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      );
    case "checklist_preview":
      return (
        <Card className="p-5">
          {block.title && <div className="font-semibold mb-3">{block.title}</div>}
          <ul className="space-y-1.5 text-sm list-disc list-inside text-foreground/90">
            {block.items.map((item, i) => (
              <li key={i} className="whitespace-pre-wrap">{item}</li>
            ))}
          </ul>
        </Card>
      );
  }
}
