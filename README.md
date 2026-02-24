# GTM Container Difference Parser (v1.1)

A client-side, purely browser-based React application engineered to audit, diff, and synchronize Google Tag Manager (GTM) and GA4 configurations across multiple environments (e.g., Dev, Staging, Prod).

By uploading exported GTM JSON containers, analytics engineers can instantly visualize tracking gaps, parameter drift, and missing variables without manual line-by-line inspection.

## ✨ Core Capabilities

* **Multi-Environment Diffing:** Deep mathematical comparison (via Lodash) of up to 3 containers side-by-side.
* **Actionable CSV Exports:** Generates stakeholder-ready punch lists detailing exact parameter value differences across environments.
* **Privacy-First:** 100% client-side processing. No GTM data is ever sent to a server.

## 🧠 Smart Auditing Logic (What You Need to Know)

This tool is specifically optimized for GA4 architectures and handles several GTM-specific quirks automatically:

* **Intelligent GA4 Config Alignment:** Dev, Staging, and Prod naturally have different GA4 Measurement IDs. The diffing engine intentionally ignores the `measurementId` parameter, preventing false-positive errors and forcing the Configuration tags to align beautifully side-by-side.
* **Deep Variable Auditing (The Settings Trap):** It is common for environments to use the same variable name (e.g., `{{GA4 Event Settings}}`) while the contents of that variable drift apart. The parser features a dedicated **Audit Event Settings** engine to inspect and diff the internal parameters of these variables, ensuring your baseline tracking is truly identical.
* **Legacy Key Normalization:** The parser automatically cleans up older GTM JSON schemas (e.g., merging `event_settings_variable` into `eventSettingsVariable`) so you compare apples to apples.

## ⚠️ Known Limitations (v1.1)

* **Complex Variable UI Rendering:** GTM exports complex variables (like RegEx Tables or Lookup Tables) using a deeply nested, proprietary AST (Abstract Syntax Tree). While the underlying diffing engine mathematically compares these perfectly (and will accurately flag mismatches), the UI may render these complex structures messily or as `[object Object]` in the visual inspector.
  * **Workaround:** If a complex variable flags as a mismatch, rely on the raw JSON export or the GTM UI to inspect the specific row differences.

## 🚀 Roadmap (v2.0 Enhancements)

* **Native AST Parsing:** Implement a recursive un-wrapper to beautifully render deeply nested GTM `list`/`map` arrays directly in the UI.
* **Direct API Integration:** Bypass JSON file uploads by connecting directly to the Google Tag Manager API via OAuth.
* **Trigger & Condition Diffing:** Expand the diffing engine beyond Tags and Variables to include Firing Triggers and Custom Event conditions.

---

Built for the analytics community. Licensed under MIT.
