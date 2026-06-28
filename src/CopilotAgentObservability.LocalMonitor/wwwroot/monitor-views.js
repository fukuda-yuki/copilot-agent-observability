// Local Ingestion Monitor — view interactions (Sprint10 A3).
//
// Vanilla JS, no dependencies, no build step (D025). Presentation only: this
// script toggles visibility of already-rendered, sanitized DOM. It never fetches
// a raw-bearing route and never inserts payload markup. Event delegation keeps it
// inert on pages without the relevant controls (Overview / Ingestions /
// Diagnostics), so it is safe to load globally.
(() => {
    "use strict";

    // ── TraceDetail tab shell ───────────────────────────────────────────────
    function activateTab(tab) {
        const list = tab.closest(".tabs");
        if (!list) {
            return;
        }

        for (const sibling of list.querySelectorAll(".tab")) {
            const panel = document.getElementById(sibling.getAttribute("aria-controls"));
            const selected = sibling === tab;
            sibling.setAttribute("aria-selected", selected ? "true" : "false");
            sibling.tabIndex = selected ? 0 : -1;
            if (panel) {
                panel.hidden = !selected;
            }
        }
    }

    function onTabKeydown(event) {
        const tab = event.target.closest(".tab");
        if (!tab || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) {
            return;
        }

        const tabs = [...tab.closest(".tabs").querySelectorAll(".tab")];
        const delta = event.key === "ArrowRight" ? 1 : -1;
        const next = tabs[(tabs.indexOf(tab) + delta + tabs.length) % tabs.length];
        event.preventDefault();
        activateTab(next);
        next.focus();
    }

    // ── Trace-list progressive disclosure ──────────────────────────────────
    function toggleRow(button) {
        const extra = document.getElementById(button.getAttribute("aria-controls"));
        if (!extra) {
            return;
        }

        const expanded = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", expanded ? "false" : "true");
        button.textContent = expanded ? "+" : "−"; // minus sign
        extra.hidden = expanded;
    }

    document.addEventListener("click", (event) => {
        const tab = event.target.closest(".tab");
        if (tab) {
            activateTab(tab);
            return;
        }

        const toggle = event.target.closest(".row-toggle");
        if (toggle) {
            toggleRow(toggle);
        }
    });

    document.addEventListener("keydown", onTabKeydown);
})();
