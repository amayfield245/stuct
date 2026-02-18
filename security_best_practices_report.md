# Security Review Report

## Executive summary

This codebase does **not** currently show signs of intentionally malicious code in first-party source files.  
The main risks are architectural: unauthenticated API access, plaintext secret exposure, SSRF-capable provider URLs, and weak prompt-injection defences in LLM flows.

The highest-priority action is to add authentication/authorisation to all API routes, then lock down settings/secret handling and outbound network targets.

---

## Scope and method

- Reviewed first-party files in `src/`, `prisma/`, and top-level config/docs.
- Looked for malicious patterns (`eval`, dynamic execution, shell execution, obfuscated payloads, suspicious base64 blobs in source code, remote code fetch/exec).
- Assessed prompt-injection exposure in extraction and chat flows.
- Checked uploaded markdown corpus for obvious injection strings (e.g. "ignore previous instructions", "reveal system prompt", jailbreak markers).

---

## Findings by severity

### Critical

#### CRIT-001: No authentication or authorisation across project API surface
- **Impact:** Any caller who can reach the app can read/modify all project data, settings, documents, and chat content.
- **Evidence:**
  - `src/app/api/projects/route.ts:4` and `src/app/api/projects/route.ts:47` expose list/create with no identity checks.
  - `src/app/api/projects/[id]/route.ts:4` returns project details with no auth.
  - `src/app/api/projects/[id]/graph/route.ts:4`, `src/app/api/projects/[id]/insights/route.ts:4`, `src/app/api/projects/[id]/territories/route.ts:4`, `src/app/api/projects/[id]/agents/route.ts:4`, `src/app/api/projects/[id]/chat/route.ts:9`, `src/app/api/projects/[id]/documents/route.ts:11`, `src/app/api/projects/[id]/documents/[docId]/extract/route.ts:53`, `src/app/api/projects/[id]/settings/route.ts:4`, `src/app/api/projects/[id]/settings/test/route.ts:4` all accept requests without session/API-key checks.
- **Why this matters now:** It turns every other issue (secret handling, prompt abuse, SSRF) into a remotely exploitable issue.

#### CRIT-002: Plaintext Claude API key is retrievable and updateable via API
- **Impact:** Secret disclosure and takeover of paid API usage; possible data exfiltration using stolen provider credentials.
- **Evidence:**
  - Schema stores key as plaintext/nullable string: `prisma/schema.prisma:162`.
  - Full settings object returned directly: `src/app/api/projects/[id]/settings/route.ts:40`.
  - Frontend consumes returned key directly: `src/app/settings/page.tsx:72`.
  - Key accepted/written by unauthenticated PUT: `src/app/api/projects/[id]/settings/route.ts:51`.
- **Why this matters now:** With no auth, this is effectively open secret read/write.

### High

#### HIGH-001: SSRF via user-controlled `ollamaUrl` in test and runtime paths
- **Impact:** Server can be induced to call arbitrary internal/external URLs (`/api/tags`, `/api/chat`, `/api/generate`), enabling network probing and potential access to internal services.
- **Evidence:**
  - Settings test endpoint performs direct fetch: `src/app/api/projects/[id]/settings/test/route.ts:68`.
  - Chat route fetches `${settings.ollamaUrl}/api/chat`: `src/app/api/projects/[id]/chat/route.ts:182`.
  - Extraction route fetches `${settings!.ollamaUrl}/api/generate`: `src/app/api/projects/[id]/documents/[docId]/extract/route.ts:188`.
  - URL is directly user-provided and persisted: `src/app/api/projects/[id]/settings/route.ts:99`.
- **Notes:** This remains high even on an internal tool if deployed where server egress can reach sensitive networks.

#### HIGH-002: Stored XSS sink in graph tooltip rendering
- **Impact:** Untrusted labels can execute script in the browser context if attacker-controlled content reaches edge labels.
- **Evidence:**
  - Raw HTML injection sink: `src/components/GraphView.tsx:216` (`tooltip.innerHTML = content`).
  - Edge labels originate from extracted relationship text from documents/LLM output: `src/app/api/projects/[id]/documents/[docId]/extract/route.ts:286`.
- **Why this matters now:** Extraction pipeline ingests arbitrary uploaded content and model output, which is not trusted input.

#### HIGH-003: Prompt-injection susceptible LLM composition and weak output trust
- **Impact:** Uploaded documents or user messages can override extraction/chat behaviour, produce poisoned graph data, and induce misleading insights.
- **Evidence:**
  - Extraction prompt appends raw document text directly after instructions: `src/app/api/projects/[id]/documents/[docId]/extract/route.ts:219`.
  - Chat prompt includes user question directly in same instruction block: `src/app/api/projects/[id]/chat/route.ts:136`.
  - Claude call uses only a user message (no separated system hard constraints): `src/app/api/projects/[id]/chat/route.ts:169`.
  - Response parsing trusts first JSON-like block via regex: `src/app/api/projects/[id]/documents/[docId]/extract/route.ts:227`.
- **Prompt-injection check result:** no explicit jailbreak strings were detected in current uploaded markdown corpus, but the pipeline remains vulnerable by design.

### Medium

#### MED-001: DoS exposure from expensive upload + extraction pathways
- **Impact:** Large/bulk file submissions and repeated extraction calls can increase CPU/memory/API spend.
- **Evidence:**
  - Upload endpoint processes all submitted files in one request: `src/app/api/projects/[id]/documents/route.ts:29`.
  - No explicit auth/rate limiting on extraction: `src/app/api/projects/[id]/documents/[docId]/extract/route.ts:53`.
  - Large content chunks sent to model (`MAX_CONTENT_CHARS = 100000`): `src/app/api/projects/[id]/documents/[docId]/extract/route.ts:146`.

---

## Malicious-code assessment

- No first-party indicators of deliberate malware/backdoor logic were found (no shell execution primitives, dynamic code execution chains, or obfuscated payload staging in `src/`/`prisma/`).
- Large base64 blobs were found in `uploads/*.md`, but these are embedded image data from converted documents, not executable code paths.

---

## Recommended remediation order

1. Add authN/authZ guardrails to all API routes and enforce project ownership.
2. Stop returning `claudeApiKey` in API responses; encrypt at rest; rotate existing keys.
3. Constrain `ollamaUrl` to an allowlist (or local-only), block private-address SSRF targets, and harden outbound fetch policy.
4. Replace `innerHTML` sink with safe text rendering (`textContent` or escaped template).
5. Rework LLM prompts with strict role separation, untrusted-content delimiters, and schema-validated outputs.
6. Add rate limits and request-size controls for upload/extraction routes.

