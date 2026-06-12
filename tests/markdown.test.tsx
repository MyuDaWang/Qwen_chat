import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownMessage } from "@/src/features/chat/components/MarkdownMessage";

describe("MarkdownMessage", () => {
  it("renders table and code block", () => {
    const { container } = render(React.createElement(MarkdownMessage, {
      content: "| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```ts\nconst a = 1\n```"
    }));

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(container.textContent).toContain("const a = 1");
  });

  it("does not render raw unsafe html as executable DOM", () => {
    const { container } = render(React.createElement(MarkdownMessage, {
      content: '<script>alert("xss")</script> [x](javascript:alert(1))'
    }));

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("a")?.getAttribute("href") ?? "").not.toContain("javascript:");
  });

  it("survives incomplete markdown", () => {
    const { container } = render(React.createElement(MarkdownMessage, {
      content: "```ts\nconst a ="
    }));
    expect(container.textContent).toContain("const a =");
  });
});
