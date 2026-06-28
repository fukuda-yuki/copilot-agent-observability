// Local Ingestion Monitor — view interactions (Sprint10 A3 / M3).
//
// Vanilla JS plus the locally vendored Cytoscape/dagre files on TraceDetail
// (D025). Presentation only: this script reads sanitized monitor JSON and
// already-rendered DOM. It never fetches a raw-bearing route and never inserts
// payload markup. Event delegation keeps it inert on pages without the relevant
// controls (Overview / Ingestions / Diagnostics), so it is safe to load globally.
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

    // ── TraceDetail Flow Chart ─────────────────────────────────────────────
    async function fetchAllSpans(traceId) {
        const spans = [];
        let after = 0;

        while (true) {
            const response = await fetch(`/api/monitor/traces/${encodeURIComponent(traceId)}/spans?after=${after}&limit=200`, {
                cache: "no-store",
            });
            if (!response.ok) {
                throw new Error(`span api returned ${response.status}`);
            }

            const page = await response.json();
            spans.push(...page.items);
            if (page.next_cursor === null || page.next_cursor === undefined) {
                return spans;
            }

            after = page.next_cursor;
        }
    }

    function displayName(span) {
        const specific = span.tool_name || span.mcp_tool_name || span.agent_name || span.response_model || span.request_model;
        return specific ? `${span.operation || span.category}\n${specific}` : (span.operation || span.category || "span");
    }

    function categoryClass(category) {
        switch (category) {
            case "agent_invocation":
                return "category-agent";
            case "llm_call":
                return "category-llm";
            case "tool_call":
                return "category-tool";
            case "hook":
                return "category-hook";
            default:
                return "category-unknown";
        }
    }

    function elementsFromSpans(spans) {
        const bySpanId = new Map();
        for (const span of spans) {
            if (span.span_id) {
                bySpanId.set(span.span_id, span);
            }
        }

        const elements = [];
        for (const span of spans) {
            const id = String(span.id);
            elements.push({
                group: "nodes",
                data: {
                    id,
                    label: displayName(span),
                    spanRowId: id,
                    tokens: span.total_tokens ?? 0,
                    durationMs: span.duration_ms ?? 0,
                },
                classes: [categoryClass(span.category), span.error_type ? "span-error" : ""].filter(Boolean).join(" "),
            });

            const parent = span.parent_span_id ? bySpanId.get(span.parent_span_id) : null;
            if (parent) {
                elements.push({
                    group: "edges",
                    data: {
                        id: `${parent.id}-${span.id}`,
                        source: String(parent.id),
                        target: id,
                    },
                });
            }
        }

        return elements;
    }

    function highlightTimelineRow(spanRowId) {
        const row = document.querySelector(`[data-span-row-id="${spanRowId}"]`);
        if (!row) {
            return;
        }

        for (const highlighted of document.querySelectorAll(".span-highlight")) {
            highlighted.classList.remove("span-highlight");
        }

        row.classList.add("span-highlight");
        const timelineTab = document.getElementById("tab-timeline");
        if (timelineTab) {
            activateTab(timelineTab);
        }

        row.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    async function renderFlowChart() {
        const graph = document.getElementById("flow-chart");
        if (!graph) {
            return;
        }

        const status = document.getElementById("flow-status");
        const traceId = graph.dataset.flowChartTraceId;
        if (!traceId) {
            if (status) {
                status.textContent = "Trace id is unavailable.";
            }
            return;
        }

        if (!window.cytoscape) {
            if (status) {
                status.textContent = "Flow Chart library is unavailable.";
            }
            return;
        }

        if (window.cytoscapeDagre && !window.cytoscape("layout", "dagre")) {
            window.cytoscape.use(window.cytoscapeDagre);
        }

        try {
            const spans = await fetchAllSpans(traceId);
            if (spans.length === 0) {
                if (status) {
                    status.textContent = "No spans available for this trace.";
                }
                return;
            }

            if (status) {
                status.textContent = `${spans.length} spans`;
            }

            const cy = window.cytoscape({
                container: graph,
                elements: elementsFromSpans(spans),
                minZoom: 0.2,
                maxZoom: 2.5,
                wheelSensitivity: 0.2,
                layout: {
                    name: "dagre",
                    rankDir: "TB",
                    nodeSep: 30,
                    rankSep: 70,
                },
                style: [
                    {
                        selector: "node",
                        style: {
                            "background-color": "#4daafc",
                            "border-width": 1,
                            "border-color": "#8cc8ff",
                            color: "#d4d4d4",
                            "font-family": "Noto Sans JP, Segoe UI, sans-serif",
                            "font-size": 11,
                            label: "data(label)",
                            "min-zoomed-font-size": 7,
                            "text-halign": "center",
                            "text-valign": "bottom",
                            "text-margin-y": 8,
                            "text-wrap": "wrap",
                            "text-max-width": 120,
                            width: 38,
                            height: 38,
                        },
                    },
                    { selector: ".category-agent", style: { "background-color": "#c586c0", "border-color": "#dcb6d8" } },
                    { selector: ".category-llm", style: { "background-color": "#4ec9b0", "border-color": "#8ee6d5" } },
                    { selector: ".category-tool", style: { "background-color": "#dcdcaa", "border-color": "#fff2bd" } },
                    { selector: ".category-hook", style: { "background-color": "#cca700", "border-color": "#ead36f" } },
                    { selector: ".category-unknown", style: { "background-color": "#858585", "border-color": "#b0b0b0" } },
                    { selector: ".span-error", style: { "border-width": 3, "border-color": "#f48771" } },
                    {
                        selector: "edge",
                        style: {
                            width: 2,
                            "line-color": "#5a5a5a",
                            "target-arrow-color": "#5a5a5a",
                            "target-arrow-shape": "triangle",
                            "curve-style": "bezier",
                        },
                    },
                    {
                        selector: "node:selected",
                        style: {
                            "border-width": 4,
                            "border-color": "#ffffff",
                        },
                    },
                ],
            });

            cy.on("tap", "node", (event) => {
                highlightTimelineRow(event.target.data("spanRowId"));
            });

            cy.fit(undefined, 24);
        } catch {
            if (status) {
                status.textContent = "Flow Chart could not be loaded.";
            }
        }
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
    renderFlowChart();
})();
