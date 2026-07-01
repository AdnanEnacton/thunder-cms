"use client";

import { ChevronDown, Pencil } from "lucide-react";
import { getSectionDisplayName } from "@/lib/content/field-ui";
import { VisualValueEditor } from "@/components/content/visual-value-editor";
import { cn } from "@/lib/utils";

const SECTION_ACCENTS = [
  { bg: "bg-thunder-50", border: "border-thunder-200", text: "text-thunder-700", dot: "bg-thunder-500" },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", dot: "bg-violet-500" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
] as const;

interface SectionAccordionProps {
  sections: unknown[];
  expandedIndex: number | null;
  onExpand: (index: number | null) => void;
  onSectionChange: (index: number, value: unknown) => void;
  templateOptions: string[];
  projectId?: string;
}

export function SectionAccordion({
  sections,
  expandedIndex,
  onExpand,
  onSectionChange,
  templateOptions,
  projectId,
}: SectionAccordionProps) {
  if (!sections.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Page sections</p>
      <div className="space-y-1.5">
        {sections.map((section, index) => {
          const isExpanded = expandedIndex === index;
          const name = getSectionDisplayName(section, index);
          const accent = SECTION_ACCENTS[index % SECTION_ACCENTS.length];

          return (
            <div
              key={index}
              className={cn(
                "overflow-hidden rounded-xl border transition-all",
                isExpanded
                  ? cn(accent.border, accent.bg, "shadow-sm")
                  : "border-border bg-surface-raised hover:border-border hover:shadow-xs",
              )}
            >
              <button
                type="button"
                onClick={() => onExpand(isExpanded ? null : index)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", accent.dot)} />
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      isExpanded ? accent.text : "text-foreground",
                    )}
                  >
                    {name}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Pencil className={cn("h-3.5 w-3.5", isExpanded ? accent.text : "text-muted")} />
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted transition-transform",
                      isExpanded && "rotate-180",
                    )}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border/60 bg-surface-raised px-4 pb-5 pt-4">
                  <VisualValueEditor
                    fieldKey={`section-${index}`}
                    value={section}
                    templateOptions={templateOptions}
                    onChange={(value) => onSectionChange(index, value)}
                    variant="flat"
                    projectId={projectId}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}