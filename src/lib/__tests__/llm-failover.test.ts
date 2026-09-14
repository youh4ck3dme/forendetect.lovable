import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("explicit Mistral task routing", () => {
  const originalFast = process.env["MISTRAL_API_KEY_FAST"];
  const originalReasoning = process.env["MISTRAL_API_KEY_REASONING"];
  beforeEach(() => { vi.resetModules(); process.env["MISTRAL_API_KEY_FAST"] = "fast"; process.env["MISTRAL_API_KEY_REASONING"] = "reasoning"; });
  afterEach(() => {
    if (originalFast) process.env["MISTRAL_API_KEY_FAST"] = originalFast; else delete process.env["MISTRAL_API_KEY_FAST"];
    if (originalReasoning) process.env["MISTRAL_API_KEY_REASONING"] = originalReasoning; else delete process.env["MISTRAL_API_KEY_REASONING"];
  });

  it("maps every supported task to a fixed server mode", async () => {
    const { AI_TASK_MODE } = await import("@/lib/ai.functions");
    expect(AI_TASK_MODE.explain_finding).toBe("fast");
    expect(AI_TASK_MODE.normalize_descriptions).toBe("fast");
    expect(AI_TASK_MODE.short_summary).toBe("fast");
    expect(AI_TASK_MODE.document_classification).toBe("fast");
    expect(AI_TASK_MODE.case_summary).toBe("reasoning");
    expect(AI_TASK_MODE.contradiction_analysis).toBe("reasoning");
    expect(AI_TASK_MODE.temporal_analysis).toBe("reasoning");
    expect(AI_TASK_MODE.financial_flow_analysis).toBe("reasoning");
    expect(AI_TASK_MODE.report_assistance).toBe("reasoning");
  });

  it("reports both configured Mistral models", async () => {
    const { llmConfigured, preferredLlmModel } = await import("@/lib/ai/llm.server");
    expect(llmConfigured()).toBe(true);
    expect(preferredLlmModel("fast")).toBe("mistral-small-latest");
    expect(preferredLlmModel("reasoning")).toBe("magistral-medium-latest");
  });
});