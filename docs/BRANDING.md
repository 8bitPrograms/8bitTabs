# 8bitTabs visual identity

8bitTabs follows the existing 8bitPrograms Pixel Core family. Its source references are the 16-unit stepped tile shared by 8bitNotes and 8bitTelemetry, charcoal `#20252A`, and the amber `#F5B544` used by 8bitTelemetry. The product glyph is a simple archive box with a wide lid and a small front handle, aligned to the same 16-unit pixel grid.

- The source of truth is `assets/logo.svg`. Keep its stepped silhouette and integer-aligned pixels.
- UI marks are exported at 16, 32 and 48 px. The 128 px store icon has a 96 px artwork area with 16 px transparent padding.
- Dark surfaces use `#101419`, `#141A21` and `#1A222C`, with cool borders and readable gray metadata. The light theme uses the same amber button with dark text and a darker amber text accent.
- The wordmark reads **8bitTabs**. Use **8bit** in a stronger weight and **Tabs** in the accent color. The small family line is **8bitPrograms**.
- Body text uses the system UI font. Monospace is reserved for totals, keyboard shortcuts and small labels. No font is downloaded.
- Cards have quiet borders and a thin amber top edge when starred. Both card and list layouts use the same content, action labels, and keyboard focus states.

Actual 1280×800 browser screenshots and optional 440×280 / 1400×560 promotional artwork are under `store/`. They are generated locally; the extension does not load them from a service.

Sample sessions are confined to tests and screenshots. Release installations start empty. Do not add invented RAM savings, user counts, ratings or usage statistics to the artwork.
