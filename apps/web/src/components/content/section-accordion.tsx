"use client";

import { Pencil } from "lucide-react";
import { getSectionDisplayName } from "@/lib/content/field-ui";
import { VisualValueEditor } from "@/components/content/visual-value-editor";
import { cn } from "@/lib/utils";

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
    <div className="space-y-0">
      {sections.map((section, index) => {
        const isExpanded = expandedIndex === index;
        const name = getSectionDisplayName(section, index);

        return (
          <div key={index} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => onExpand(isExpanded ? null : index)}
              className={cn(
                "flex w-full items-center justify-between px-1 py-3.5 text-left transition-colors hover:bg-surface-overlay/50",
                isExpanded && "bg-surface-overlay/30",
              )}
            >
              <span className="text-sm font-medium text-foreground">{name}</span>
              <Pencil className="h-4 w-4 text-muted" />
            </button>

            {isExpanded && (
              <div className="space-y-4 border-t border-border bg-surface px-1 pb-5 pt-4">
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
  );
}