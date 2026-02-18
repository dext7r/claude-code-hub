import { describe, expect, test } from "vitest";
import { ModelRedirector } from "@/app/v1/_lib/proxy/model-redirector";
import type { Provider } from "@/types/provider";

function buildProvider(modelRedirects: Record<string, string>): Provider {
  return {
    id: 1,
    name: "test-provider",
    providerType: "claude",
    isEnabled: true,
    weight: 1,
    priority: 0,
    costMultiplier: 1,
    groupTag: null,
    modelRedirects,
  } as Provider;
}

describe("ModelRedirector pattern matching", () => {
  test("matches wildcard patterns", () => {
    const provider = buildProvider({
      "gpt-4o-*": "claude-sonnet-4",
    });

    expect(ModelRedirector.getRedirectedModel("gpt-4o-mini", provider)).toBe("claude-sonnet-4");
    expect(ModelRedirector.hasRedirect("gpt-4o-mini", provider)).toBe(true);
  });

  test("matches regex patterns", () => {
    const provider = buildProvider({
      "/^gpt-4o-(mini|preview)$/": "claude-sonnet-4",
    });

    expect(ModelRedirector.getRedirectedModel("gpt-4o-mini", provider)).toBe("claude-sonnet-4");
    expect(ModelRedirector.getRedirectedModel("gpt-4o-preview", provider)).toBe("claude-sonnet-4");
    expect(ModelRedirector.hasRedirect("gpt-4o-preview", provider)).toBe(true);
  });

  test("falls back when regex is invalid", () => {
    const provider = buildProvider({
      "/[invalid/": "claude-sonnet-4",
      "claude-haiku": "claude-sonnet-4",
    });

    expect(ModelRedirector.getRedirectedModel("claude-haiku", provider)).toBe("claude-sonnet-4");
    expect(ModelRedirector.hasRedirect("claude-haiku", provider)).toBe(true);
    expect(ModelRedirector.getRedirectedModel("gpt-4o-mini", provider)).toBe("gpt-4o-mini");
  });
});
