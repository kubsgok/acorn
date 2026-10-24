# Design notes — deviations from Figma

Figma file `oiO6LQnorIR7cPMi6A34l0` · Welcome `98:612` · Login `141:370`.
We unify the two screens into one token set. Update Figma to match these.

| Area                   | Figma                                   | Implementation          | Why                   |
| ---------------------- | --------------------------------------- | ----------------------- | --------------------- |
| Button height / radius | Welcome 49 / 14, Login 56 / 16          | 56 / 16 everywhere      | One system            |
| Terms text font        | Bio Sans (paid)                         | 42dot Sans              | Free font, consistent |
| Label casing           | "Log In" vs "Log in"                    | "Log in"                | Consistency           |
| Subtitle typo          | "medicatiosn"                           | "medications"           | Typo                  |
| Device chrome          | Status bar, home indicator in frames    | Not built (OS provides) | Native                |
| Off-canvas layers      | "Shopee", "CLICK HERE" in Welcome frame | Not built               | Leftover              |
| Welcome text alignment | Left-aligned title and subtitle         | Centered                | Owner's request       |

## Tokens (from Figma)

bg `#f0e5c5` · primary `#b15f00` · link `#8d4b00` · ink `#1f1b17` · body `#554336` · muted `#78716c` · border `#dbc2b0` · google-border `#e7e5e4` · on-primary `#fff8f5`
Sky gradient `#d6e8ee` → `#f3f0e2` (46%) → `#8c8574`. Fonts: 42dot Sans, Afacad (wordmark).
