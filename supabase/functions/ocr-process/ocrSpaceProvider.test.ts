import { assertEquals, assertExists } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { processWithOcrSpace } from "./ocrSpaceProvider.ts";

const baseInput = {
  buffer: new TextEncoder().encode("fake-image-bytes").buffer,
  fileName: "id.jpg",
  mimeType: "image/jpeg",
  documentType: "sa_id" as const,
  options: { language: "eng", isOverlayRequired: false }
};

const baseConfig = {
  apiKey: "test-key",
  apiUrl: "https://api.ocr.space/parse/image",
  timeoutMs: 5000,
  includeRawResponse: false
};

function withMockedFetch<T>(impl: typeof fetch, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return run().finally(() => {
    globalThis.fetch = original;
  });
}

Deno.test("processWithOcrSpace — successful single-page response", async () => {
  const outcome = await withMockedFetch(
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            IsErroredOnProcessing: false,
            ParsedResults: [{ ParsedText: "hello world\n" }]
          }),
          { status: 200 }
        )
      ),
    () => processWithOcrSpace(baseInput, baseConfig, "req-1")
  );
  assertExists(outcome.result);
  assertEquals(outcome.result?.rawText, "hello world");
  assertEquals(outcome.result?.pages.length, 1);
  assertEquals(outcome.result?.pages[0].pageNumber, 1);
  assertEquals(outcome.result?.raw, undefined);
});

Deno.test("processWithOcrSpace — includes raw response only when configured", async () => {
  const outcome = await withMockedFetch(
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ IsErroredOnProcessing: false, ParsedResults: [{ ParsedText: "text" }] }),
          { status: 200 }
        )
      ),
    () => processWithOcrSpace(baseInput, { ...baseConfig, includeRawResponse: true }, "req-2")
  );
  assertExists(outcome.result?.raw);
});

Deno.test("processWithOcrSpace — multi-page PDF preserves page order", async () => {
  const outcome = await withMockedFetch(
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            IsErroredOnProcessing: false,
            ParsedResults: [{ ParsedText: "page one" }, { ParsedText: "page two" }, { ParsedText: "page three" }]
          }),
          { status: 200 }
        )
      ),
    () => processWithOcrSpace({ ...baseInput, mimeType: "application/pdf" }, baseConfig, "req-3")
  );
  assertEquals(outcome.result?.pages.map((p) => p.pageNumber), [1, 2, 3]);
  assertEquals(outcome.result?.rawText, "page one\n\npage two\n\npage three");
});

Deno.test("processWithOcrSpace — empty ParsedResults is malformed, not a silent empty success", async () => {
  const outcome = await withMockedFetch(
    () =>
      Promise.resolve(
        new Response(JSON.stringify({ IsErroredOnProcessing: false, ParsedResults: [] }), { status: 200 })
      ),
    () => processWithOcrSpace(baseInput, baseConfig, "req-4")
  );
  assertEquals(outcome.errorCode, "OCR_MALFORMED_RESPONSE");
});

Deno.test("processWithOcrSpace — all pages blank is an empty result", async () => {
  const outcome = await withMockedFetch(
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ IsErroredOnProcessing: false, ParsedResults: [{ ParsedText: "   " }] }),
          { status: 200 }
        )
      ),
    () => processWithOcrSpace(baseInput, baseConfig, "req-5")
  );
  assertEquals(outcome.errorCode, "OCR_EMPTY_RESULT");
});

Deno.test("processWithOcrSpace — partial page (missing ParsedText) doesn't crash the whole request", async () => {
  const outcome = await withMockedFetch(
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            IsErroredOnProcessing: false,
            ParsedResults: [{ ParsedText: "good page" }, {}]
          }),
          { status: 200 }
        )
      ),
    () => processWithOcrSpace(baseInput, baseConfig, "req-6")
  );
  assertEquals(outcome.result?.pages.length, 2);
  assertEquals(outcome.result?.pages[1].text, "");
  assertEquals(outcome.result?.rawText, "good page");
});

Deno.test("processWithOcrSpace — provider processing error", async () => {
  const outcome = await withMockedFetch(
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ IsErroredOnProcessing: true, ErrorMessage: ["Unable to process image"] }),
          { status: 200 }
        )
      ),
    () => processWithOcrSpace(baseInput, baseConfig, "req-7")
  );
  assertEquals(outcome.errorCode, "OCR_PROVIDER_ERROR");
});

Deno.test("processWithOcrSpace — provider auth error via error message text", async () => {
  const outcome = await withMockedFetch(
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ IsErroredOnProcessing: true, ErrorMessage: "Invalid API key" }),
          { status: 200 }
        )
      ),
    () => processWithOcrSpace(baseInput, baseConfig, "req-8")
  );
  assertEquals(outcome.errorCode, "OCR_PROVIDER_AUTH_ERROR");
});

Deno.test("processWithOcrSpace — provider auth error via HTTP 401", async () => {
  const outcome = await withMockedFetch(
    () => Promise.resolve(new Response("unauthorized", { status: 401 })),
    () => processWithOcrSpace(baseInput, baseConfig, "req-9")
  );
  assertEquals(outcome.errorCode, "OCR_PROVIDER_AUTH_ERROR");
});

Deno.test("processWithOcrSpace — provider rate limit via HTTP 429", async () => {
  const outcome = await withMockedFetch(
    () => Promise.resolve(new Response("too many requests", { status: 429 })),
    () => processWithOcrSpace(baseInput, baseConfig, "req-10")
  );
  assertEquals(outcome.errorCode, "OCR_PROVIDER_ERROR");
});

Deno.test("processWithOcrSpace — malformed JSON response", async () => {
  const outcome = await withMockedFetch(
    () => Promise.resolve(new Response("not json{{{", { status: 200 })),
    () => processWithOcrSpace(baseInput, baseConfig, "req-11")
  );
  assertEquals(outcome.errorCode, "OCR_MALFORMED_RESPONSE");
});

Deno.test("processWithOcrSpace — network failure maps to provider error", async () => {
  const outcome = await withMockedFetch(
    () => Promise.reject(new Error("network down")),
    () => processWithOcrSpace(baseInput, baseConfig, "req-12")
  );
  assertEquals(outcome.errorCode, "OCR_PROVIDER_ERROR");
});

Deno.test("processWithOcrSpace — timeout aborts and maps to OCR_TIMEOUT", async () => {
  // A fetch that respects the abort signal, like a real implementation would.
  const slowFetch = (_url: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        reject(err);
      });
    });

  const outcome = await withMockedFetch(slowFetch as typeof fetch, () =>
    processWithOcrSpace(baseInput, { ...baseConfig, timeoutMs: 20 }, "req-13")
  );
  assertEquals(outcome.errorCode, "OCR_TIMEOUT");
});
