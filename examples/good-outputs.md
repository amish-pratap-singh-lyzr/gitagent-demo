# Good Review Output — Example

> **PR #142: Add rate limiting to `/api/upload`**
>
> **Summary:** Adds a token-bucket limiter in front of the upload endpoint
> to stop the abuse pattern from incident INC-2026-014.
>
> **Findings:**
> - `src/middleware/rateLimit.js:34` — bug: the bucket key is built from
>   `req.ip` alone, which collapses all users behind the same NAT/proxy
>   into one bucket. Key on `req.ip + userId` instead.
> - `src/middleware/rateLimit.js:51` — nit (linter already caught this,
>   not restated).
>
> **Verdict:** `request_changes` — the NAT collapse issue needs a fix
> before this is safe to ship; everything else is fine.
