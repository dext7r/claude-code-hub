import { describe, expect, test, vi } from "vitest";
import type { Provider } from "@/types/provider";

const circuitBreakerMocks = vi.hoisted(() => ({
  isCircuitOpen: vi.fn(async () => false),
  getCircuitState: vi.fn(() => "closed"),
}));

vi.mock("@/lib/circuit-breaker", () => circuitBreakerMocks);

describe("ProxyProviderResolver.pickRandomProvider - model redirect", () => {
  test("filters providers using original model (not redirected current model)", async () => {
    const { ProxyProviderResolver } = await import("@/app/v1/_lib/proxy/provider-selector");

    vi.spyOn(ProxyProviderResolver as any, "filterByLimits").mockImplementation(
      async (...args: unknown[]) => args[0] as Provider[]
    );

    const providers: Provider[] = [
      {
        id: 1,
        name: "p1",
        isEnabled: true,
        providerType: "claude",
        groupTag: null,
        weight: 1,
        priority: 0,
        costMultiplier: 1,
        allowedModels: ["claude-test"],
      } as unknown as Provider,
    ];

    const session = {
      originalFormat: "claude",
      authState: null,
      getProvidersSnapshot: async () => providers,
      getOriginalModel: () => "claude-test",
      getCurrentModel: () => "glm-test",
      clientRequestsContext1m: () => false,
    } as any;

    const { provider, context } = await (ProxyProviderResolver as any).pickRandomProvider(
      session,
      []
    );

    expect(context.requestedModel).toBe("claude-test");
    expect(provider?.id).toBe(1);
  });

  test("allows providers with wildcard model redirects for non-claude models", async () => {
    const { ProxyProviderResolver } = await import("@/app/v1/_lib/proxy/provider-selector");

    vi.spyOn(ProxyProviderResolver as any, "filterByLimits").mockImplementation(
      async (...args: unknown[]) => args[0] as Provider[]
    );

    const providers: Provider[] = [
      {
        id: 2,
        name: "p2",
        isEnabled: true,
        providerType: "claude",
        groupTag: null,
        weight: 1,
        priority: 0,
        costMultiplier: 1,
        allowedModels: [],
        modelRedirects: {
          "gpt-4o-*": "claude-sonnet-4",
        },
      } as unknown as Provider,
    ];

    const session = {
      originalFormat: "claude",
      authState: null,
      getProvidersSnapshot: async () => providers,
      getOriginalModel: () => "gpt-4o-mini",
      getCurrentModel: () => "gpt-4o-mini",
      clientRequestsContext1m: () => false,
    } as any;

    const { provider } = await (ProxyProviderResolver as any).pickRandomProvider(session, []);

    expect(provider?.id).toBe(2);
  });

  test("allows claude providers with redirect patterns even when allowedModels excludes the model", async () => {
    const { ProxyProviderResolver } = await import("@/app/v1/_lib/proxy/provider-selector");

    vi.spyOn(ProxyProviderResolver as any, "filterByLimits").mockImplementation(
      async (...args: unknown[]) => args[0] as Provider[]
    );

    const providers: Provider[] = [
      {
        id: 3,
        name: "p3",
        isEnabled: true,
        providerType: "claude",
        groupTag: null,
        weight: 1,
        priority: 0,
        costMultiplier: 1,
        allowedModels: ["claude-legacy"],
        modelRedirects: {
          "claude-3-*": "claude-legacy",
        },
      } as unknown as Provider,
    ];

    const session = {
      originalFormat: "claude",
      authState: null,
      getProvidersSnapshot: async () => providers,
      getOriginalModel: () => "claude-3-haiku",
      getCurrentModel: () => "claude-3-haiku",
      clientRequestsContext1m: () => false,
    } as any;

    const { provider } = await (ProxyProviderResolver as any).pickRandomProvider(session, []);

    expect(provider?.id).toBe(3);
  });
});
