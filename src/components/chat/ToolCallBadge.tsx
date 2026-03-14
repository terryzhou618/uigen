import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ToolCallBadgeProps {
  toolInvocation: {
    toolCallId: string;
    toolName: string;
    state: string;
    args?: Record<string, unknown>;
    result?: unknown;
  };
}

function getLabel(toolName: string, args?: Record<string, unknown>): string {
  const command = args?.command as string | undefined;
  const path = args?.path as string | undefined;

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return `Creating ${path ?? ""}`;
      case "str_replace":
      case "insert":
        return `Editing ${path ?? ""}`;
      case "view":
        return `Reading ${path ?? ""}`;
      case "undo_edit":
        return `Reverting ${path ?? ""}`;
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename":
        return `Renaming ${path ?? ""}`;
      case "delete":
        return `Deleting ${path ?? ""}`;
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const label = getLabel(toolInvocation.toolName, toolInvocation.args);
  const isDone = toolInvocation.state === "result";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200"
      )}
    >
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
