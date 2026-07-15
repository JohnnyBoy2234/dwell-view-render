import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { checkMagicBytes, isValidDocumentType, isValidLanguage, validateFile } from "./validate.ts";

function makeFile(bytes: number[], type: string, name = "test.bin"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0];
const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0];
const PDF_HEAD = [0x25, 0x50, 0x44, 0x46, 0, 0, 0, 0, 0, 0, 0, 0];
const WEBP_HEAD = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

Deno.test("validateFile — missing file", () => {
  const err = validateFile(null, 10);
  assertEquals(err?.code, "FILE_REQUIRED");
});

Deno.test("validateFile — empty buffer rejected", () => {
  const err = validateFile(makeFile([], "image/jpeg"), 10);
  assertEquals(err?.code, "INVALID_UPLOAD");
});

Deno.test("validateFile — unsupported mime type rejected", () => {
  const err = validateFile(makeFile(JPEG_HEAD, "application/x-msdownload"), 10);
  assertEquals(err?.code, "UNSUPPORTED_FILE_TYPE");
});

Deno.test("validateFile — oversized file rejected", () => {
  const bigFile = makeFile(new Array(20).fill(1), "image/jpeg");
  Object.defineProperty(bigFile, "size", { value: 11 * 1024 * 1024 });
  const err = validateFile(bigFile, 10);
  assertEquals(err?.code, "FILE_TOO_LARGE");
});

Deno.test("validateFile — accepts a valid jpeg within limits", () => {
  const err = validateFile(makeFile(JPEG_HEAD, "image/jpeg"), 10);
  assertEquals(err, null);
});

Deno.test("checkMagicBytes — jpeg header matches image/jpeg", async () => {
  const err = await checkMagicBytes(makeFile(JPEG_HEAD, "image/jpeg"));
  assertEquals(err, null);
});

Deno.test("checkMagicBytes — png header matches image/png", async () => {
  const err = await checkMagicBytes(makeFile(PNG_HEAD, "image/png"));
  assertEquals(err, null);
});

Deno.test("checkMagicBytes — pdf header matches application/pdf", async () => {
  const err = await checkMagicBytes(makeFile(PDF_HEAD, "application/pdf"));
  assertEquals(err, null);
});

Deno.test("checkMagicBytes — webp header matches image/webp", async () => {
  const err = await checkMagicBytes(makeFile(WEBP_HEAD, "image/webp"));
  assertEquals(err, null);
});

Deno.test("checkMagicBytes — mismatched extension/mime rejected", async () => {
  // A PNG file renamed with a .jpg-ish content-type
  const err = await checkMagicBytes(makeFile(PNG_HEAD, "image/jpeg"));
  assertEquals(err?.code, "INVALID_UPLOAD");
});

Deno.test("isValidDocumentType — accepts known types, rejects arbitrary strings", () => {
  assertEquals(isValidDocumentType("sa_id"), true);
  assertEquals(isValidDocumentType("payslip"), true);
  assertEquals(isValidDocumentType("passport"), false);
  assertEquals(isValidDocumentType("<script>"), false);
});

Deno.test("isValidLanguage — only eng is supported today", () => {
  assertEquals(isValidLanguage("eng"), true);
  assertEquals(isValidLanguage("fra"), false);
});
