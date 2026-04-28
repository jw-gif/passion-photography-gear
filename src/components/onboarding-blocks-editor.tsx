import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  BLOCK_TYPE_LABELS,
  type ContentBlock,
  emptyBlock,
} from "@/lib/onboarding";

type BlockType = ContentBlock["type"];

interface Props {
  blocks: ContentBlock[];
  onChange: (next: ContentBlock[]) => void;
}

export function BlocksEditor({ blocks, onChange }: Props) {
  function update(i: number, b: ContentBlock) {
    const next = blocks.slice();
    next[i] = b;
    onChange(next);
  }
  function remove(i: number) {
    onChange(blocks.filter((_, j) => j !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = blocks.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function add(type: BlockType) {
    onChange([...blocks, emptyBlock(type)]);
  }

  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {BLOCK_TYPE_LABELS[b.type]}
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => move(i, 1)}
                disabled={i === blocks.length - 1}
              >
                <ArrowDown className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove(i)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
          <BlockFields block={b} onChange={(next) => update(i, next)} />
        </Card>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="size-4" /> Add block <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((t) => (
            <DropdownMenuItem key={t} onClick={() => add(t)}>
              {BLOCK_TYPE_LABELS[t]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function BlockFields({
  block,
  onChange,
}: {
  block: ContentBlock;
  onChange: (b: ContentBlock) => void;
}) {
  switch (block.type) {
    case "heading":
      return (
        <Input
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
        />
      );
    case "paragraph":
      return (
        <Textarea
          rows={4}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
        />
      );
    case "callout":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={block.label ?? ""}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Body</Label>
            <Textarea
              rows={3}
              value={block.text}
              onChange={(e) => onChange({ ...block, text: e.target.value })}
            />
          </div>
        </div>
      );
    case "card":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={block.title}
              onChange={(e) => onChange({ ...block, title: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Body</Label>
            <Textarea
              rows={4}
              value={block.body}
              onChange={(e) => onChange({ ...block, body: e.target.value })}
            />
          </div>
        </div>
      );
    case "two_col":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["left", "right"] as const).map((side) => (
            <div key={side} className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {side}
              </div>
              <Input
                placeholder="Title"
                value={block[side].title}
                onChange={(e) =>
                  onChange({ ...block, [side]: { ...block[side], title: e.target.value } })
                }
              />
              <Textarea
                rows={4}
                placeholder="Body"
                value={block[side].body}
                onChange={(e) =>
                  onChange({ ...block, [side]: { ...block[side], body: e.target.value } })
                }
              />
            </div>
          ))}
        </div>
      );
    case "table":
      return <TableEditor block={block} onChange={onChange} />;
    case "people":
      return <PeopleEditor block={block} onChange={onChange} />;
    case "checklist_preview":
      return <BulletEditor block={block} onChange={onChange} />;
  }
}

function TableEditor({
  block,
  onChange,
}: {
  block: Extract<ContentBlock, { type: "table" }>;
  onChange: (b: ContentBlock) => void;
}) {
  function updateColumn(i: number, value: string) {
    const cols = block.columns.slice();
    cols[i] = value;
    onChange({ ...block, columns: cols });
  }
  function addColumn() {
    onChange({
      ...block,
      columns: [...block.columns, `Column ${block.columns.length + 1}`],
      rows: block.rows.map((r) => [...r, ""]),
    });
  }
  function removeColumn(i: number) {
    if (block.columns.length <= 1) return;
    onChange({
      ...block,
      columns: block.columns.filter((_, j) => j !== i),
      rows: block.rows.map((r) => r.filter((_, j) => j !== i)),
    });
  }
  function updateCell(rowI: number, colI: number, value: string) {
    const rows = block.rows.map((r) => r.slice());
    rows[rowI][colI] = value;
    onChange({ ...block, rows });
  }
  function addRow() {
    onChange({ ...block, rows: [...block.rows, block.columns.map(() => "")] });
  }
  function removeRow(i: number) {
    onChange({ ...block, rows: block.rows.filter((_, j) => j !== i) });
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Table title (optional)"
        value={block.title ?? ""}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {block.columns.map((c, i) => (
                <th key={i} className="p-1">
                  <div className="flex items-center gap-1">
                    <Input
                      value={c}
                      onChange={(e) => updateColumn(i, e.target.value)}
                      className="h-8 text-xs font-semibold"
                    />
                    <Button size="sm" variant="ghost" onClick={() => removeColumn(i)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </th>
              ))}
              <th className="p-1 w-10">
                <Button size="sm" variant="ghost" onClick={addColumn}>
                  <Plus className="size-3.5" />
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri}>
                {block.columns.map((_, ci) => (
                  <td key={ci} className="p-1 align-top">
                    <Textarea
                      rows={2}
                      value={row[ci] ?? ""}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      className="text-xs"
                    />
                  </td>
                ))}
                <td className="p-1 align-top">
                  <Button size="sm" variant="ghost" onClick={() => removeRow(ri)}>
                    <Trash2 className="size-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button size="sm" variant="outline" onClick={addRow}>
        <Plus className="size-3.5" /> Add row
      </Button>
    </div>
  );
}

function PeopleEditor({
  block,
  onChange,
}: {
  block: Extract<ContentBlock, { type: "people" }>;
  onChange: (b: ContentBlock) => void;
}) {
  function updatePerson(i: number, patch: Partial<{ name: string; role: string; slack: string }>) {
    const people = block.people.slice();
    people[i] = { ...people[i], ...patch };
    onChange({ ...block, people });
  }
  function addPerson() {
    onChange({ ...block, people: [...block.people, { name: "", role: "", slack: "" }] });
  }
  function removePerson(i: number) {
    onChange({ ...block, people: block.people.filter((_, j) => j !== i) });
  }
  return (
    <div className="space-y-3">
      <Input
        placeholder="List title (optional)"
        value={block.title ?? ""}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
      />
      {block.people.map((p, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
          <Input
            placeholder="Name"
            value={p.name}
            onChange={(e) => updatePerson(i, { name: e.target.value })}
          />
          <Input
            placeholder="Role"
            value={p.role ?? ""}
            onChange={(e) => updatePerson(i, { role: e.target.value })}
          />
          <Input
            placeholder="@slack-handle"
            value={p.slack ?? ""}
            onChange={(e) => updatePerson(i, { slack: e.target.value })}
          />
          <Button size="sm" variant="ghost" onClick={() => removePerson(i)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={addPerson}>
        <Plus className="size-3.5" /> Add person
      </Button>
    </div>
  );
}

function BulletEditor({
  block,
  onChange,
}: {
  block: Extract<ContentBlock, { type: "checklist_preview" }>;
  onChange: (b: ContentBlock) => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        placeholder="List title (optional)"
        value={block.title ?? ""}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
      />
      {block.items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          <Textarea
            rows={1}
            value={item}
            onChange={(e) => {
              const items = block.items.slice();
              items[i] = e.target.value;
              onChange({ ...block, items });
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onChange({ ...block, items: [...block.items, ""] })}
      >
        <Plus className="size-3.5" /> Add item
      </Button>
    </div>
  );
}
