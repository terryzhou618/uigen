import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: string,
  result?: unknown
) {
  return { toolCallId: "test-id", toolName, args, state, result };
}

test("str_replace_editor create pending shows Creating label and spinner", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "call"
      )}
    />
  );

  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  const spinner = document.querySelector(".animate-spin");
  expect(spinner).toBeTruthy();
});

test("str_replace_editor create result shows Creating label and green dot", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "create", path: "/App.jsx" },
        "result",
        "ok"
      )}
    />
  );

  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  const spinner = document.querySelector(".animate-spin");
  expect(spinner).toBeNull();
  const dot = document.querySelector(".bg-emerald-500");
  expect(dot).toBeTruthy();
});

test("str_replace_editor str_replace shows Editing label", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "str_replace", path: "/components/Card.jsx" },
        "call"
      )}
    />
  );

  expect(screen.getByText("Editing /components/Card.jsx")).toBeDefined();
});

test("str_replace_editor insert shows Editing label", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "insert", path: "/App.jsx" },
        "call"
      )}
    />
  );

  expect(screen.getByText("Editing /App.jsx")).toBeDefined();
});

test("str_replace_editor view shows Reading label", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "view", path: "/App.jsx" },
        "call"
      )}
    />
  );

  expect(screen.getByText("Reading /App.jsx")).toBeDefined();
});

test("file_manager rename shows Renaming label", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation(
        "file_manager",
        { command: "rename", path: "/old.jsx" },
        "call"
      )}
    />
  );

  expect(screen.getByText("Renaming /old.jsx")).toBeDefined();
});

test("file_manager delete shows Deleting label", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation(
        "file_manager",
        { command: "delete", path: "/App.jsx" },
        "call"
      )}
    />
  );

  expect(screen.getByText("Deleting /App.jsx")).toBeDefined();
});

test("unknown tool falls back to tool name", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("some_unknown_tool", {}, "call")}
    />
  );

  expect(screen.getByText("some_unknown_tool")).toBeDefined();
});
