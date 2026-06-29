// Extension: otel-monitor-canvas
//
// Sprint11 M3/M4: project-scoped Canvas extension for the Local Ingestion
// Monitor. This is a thin adapter — it does not reimplement the monitor UI or
// expose sensitive telemetry data. The Local Monitor must be launched with
// --sanitized-only for Canvas-safe posture.
//
// Canvas id: otel-monitor
// Display name: OTel Monitor

import { createServer } from "node:http";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";

const DEFAULT_MONITOR_URL = "http://127.0.0.1:4320";
const TRACE_ID_PATTERN = "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$";
const MAX_TRACE_LIST_LIMIT = 50;
const MAX_SPAN_PAGE_SIZE = 200;
const MAX_TOP_SPANS = 10;
const MAX_TREE_NODES = 50;
const MAX_CACHE_TURNS = 50;
const REQUEST_TIMEOUT_MS = 5000;

const traceIdSchema = {
    type: "object",
    properties: {
        traceId: {
            type: "string",
            pattern: TRACE_ID_PATTERN,
            maxLength: 128,
        },
    },
    required: ["traceId"],
    additionalProperties: false,
};

// Per-instance HTTP servers for diagnostic / status pages.
const servers = new Map();

// --------------- helpers ---------------

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
        if (char === "&") return "&amp;";
        if (char === "<") return "&lt;";
        if (char === ">") return "&gt;";
        if (char === '"') return "&quot;";
        return "&#39;";
    });
}

function renderDiagnosticHtml({ instanceId, monitorUrl, healthStatus, healthBody, error }) {
    const escapedUrl = escapeHtml(monitorUrl);
    const escapedInstance = escapeHtml(instanceId);
    const escapedHealth = escapeHtml(healthStatus ?? "unknown");
    const escapedBody = escapeHtml(healthBody ?? "");
    const escapedError = escapeHtml(error ?? "");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>OTel Monitor — Diagnostic</title>
  <style>
    :root {
      --bg: var(--background-color-default, #ffffff);
      --fg: var(--text-color-default, #1f2328);
      --muted: var(--text-color-muted, #656d76);
      --border: var(--border-color-default, #d0d7de);
      --accent: var(--accent-color-default, #0969da);
      --danger: #cf222e;
      --success: #1a7f37;
      --font: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
      --size: var(--text-body-medium, 14px);
      --leading: var(--leading-body-medium, 20px);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      font-size: var(--size);
      line-height: var(--leading);
      background: var(--bg);
      color: var(--fg);
      padding: 24px;
    }
    h1 { font-size: 1.25rem; margin-bottom: 16px; }
    .card {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .card h2 { font-size: 1rem; margin-bottom: 8px; }
    .kv { display: grid; grid-template-columns: 160px 1fr; gap: 4px 12px; }
    .kv dt { color: var(--muted); font-weight: 500; }
    .status-ok { color: var(--success); font-weight: 600; }
    .status-err { color: var(--danger); font-weight: 600; }
    pre {
      background: #f6f8fa;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 12px;
      overflow: auto;
      font-size: 12px;
      line-height: 1.4;
    }
    .banner {
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-weight: 600;
    }
    .banner-warn { background: #fff8c5; border: 1px solid #d4a72c; color: #5c4b00; }
    .banner-err  { background: #ffebe9; border: 1px solid #cf222e; color: #5c0000; }
  </style>
</head>
<body>
  <h1>OTel Monitor — Diagnostic</h1>

  ${error ? `<div class="banner banner-err">${escapedError}</div>` : ""}
  ${healthStatus === "healthy" ? "" : `<div class="banner banner-warn">Monitor is not reporting healthy. Ensure the Local Monitor is running with <code>--sanitized-only</code>.</div>`}

  <div class="card">
    <h2>Connection</h2>
    <dl class="kv">
      <dt>Monitor URL</dt><dd><code>${escapedUrl}</code></dd>
      <dt>Instance</dt><dd><code>${escapedInstance}</code></dd>
      <dt>Health status</dt><dd><span class="${healthStatus === "healthy" ? "status-ok" : "status-err"}">${escapedHealth}</span></dd>
    </dl>
  </div>

  ${escapedBody ? `<div class="card"><h2>Health Response</h2><pre>${escapedBody}</pre></div>` : ""}

  <div class="card">
    <h2>Canvas-safe posture</h2>
    <p>This Canvas adapter requires the Local Monitor to be launched with <code>--sanitized-only</code>. Sensitive local telemetry must not be exposed through Canvas actions or display.</p>
  </div>
</body>
</html>`;
}

function createDiagnosticServer(instanceId, monitorUrl, healthStatus, healthBody, error) {
    const server = createServer((_req, res) => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(renderDiagnosticHtml({ instanceId, monitorUrl, healthStatus, healthBody, error }));
    });
    return server;
}

async function startDiagnosticServer(instanceId, monitorUrl, healthStatus, healthBody, error) {
    const server = createDiagnosticServer(instanceId, monitorUrl, healthStatus, healthBody, error);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

function isLoopbackUrl(urlString) {
    try {
        const url = new URL(urlString);
        return url.protocol === "http:"
            && (url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]");
    } catch {
        return false;
    }
}

async function checkMonitorHealth(monitorUrl) {
    const healthUrl = `${monitorUrl.replace(/\/$/, "")}/health/ready`;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(healthUrl, { signal: controller.signal });
        clearTimeout(timeout);
        const body = await response.text();
        return { healthy: response.ok, statusCode: response.status, body };
    } catch (err) {
        return { healthy: false, statusCode: null, body: null, error: err.message };
    }
}

function configuredMonitorUrl(ctx) {
    return ctx.canvasInput?.monitorBaseUrl
        ?? ctx.openInput?.monitorBaseUrl
        ?? ctx.instanceInput?.monitorBaseUrl
        ?? DEFAULT_MONITOR_URL;
}

function validateMonitorUrl(monitorUrl) {
    if (!isLoopbackUrl(monitorUrl)) {
        throw new CanvasError(
            "invalid_monitor_url",
            `Monitor URL must be loopback (127.0.0.1 / localhost / ::1). Received: ${monitorUrl}`
        );
    }
}

function monitorApiUrl(monitorUrl, path) {
    const base = monitorUrl.replace(/\/$/, "");
    return `${base}${path}`;
}

async function fetchTextWithTimeout(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(url, { signal: controller.signal });
        const body = await response.text();
        return { response, body };
    } catch (err) {
        if (err?.name === "AbortError") {
            throw new CanvasError("monitor_unavailable", "The Local Monitor request timed out.");
        }

        throw new CanvasError("monitor_unavailable", "The Local Monitor is unavailable.");
    } finally {
        clearTimeout(timeout);
    }
}

function parseJsonBody(body, code = "unsupported_response_shape") {
    try {
        return JSON.parse(body);
    } catch {
        throw new CanvasError(code, "The Local Monitor returned a response shape the Canvas adapter does not support.");
    }
}

async function fetchMonitorJson(ctx, path) {
    const monitorUrl = configuredMonitorUrl(ctx);
    validateMonitorUrl(monitorUrl);

    const { response, body } = await fetchTextWithTimeout(monitorApiUrl(monitorUrl, path));
    const parsed = body ? parseJsonBody(body) : null;
    if (!response.ok) {
        const code = parsed?.error === "persistence_busy" ? "persistence_busy" : "monitor_unavailable";
        const message = typeof parsed?.message === "string"
            ? parsed.message
            : `The Local Monitor returned HTTP ${response.status}.`;
        throw new CanvasError(code, message);
    }

    return parsed;
}

async function fetchReadiness(ctx) {
    const monitorUrl = configuredMonitorUrl(ctx);
    validateMonitorUrl(monitorUrl);

    const { response, body } = await fetchTextWithTimeout(monitorApiUrl(monitorUrl, "/health/ready"));
    return {
        monitorUrl,
        reachable: true,
        statusCode: response.status,
        readiness: body ? parseJsonBody(body) : null,
        ok: response.ok,
    };
}

async function fetchTracePage(ctx, limit = MAX_TRACE_LIST_LIMIT) {
    const page = await fetchMonitorJson(ctx, `/api/monitor/traces?limit=${limit}`);
    if (!page || !Array.isArray(page.items)) {
        throw new CanvasError("unsupported_response_shape", "The trace list response did not contain an items array.");
    }

    return page;
}

async function fetchSpanPage(ctx, traceId) {
    const encodedTraceId = encodeURIComponent(traceId);
    const page = await fetchMonitorJson(ctx, `/api/monitor/traces/${encodedTraceId}/spans?limit=${MAX_SPAN_PAGE_SIZE}`);
    if (!page || !Array.isArray(page.items)) {
        throw new CanvasError("unsupported_response_shape", "The span list response did not contain an items array.");
    }

    return page;
}

function numberOrZero(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function statusFromTrace(row) {
    return numberOrZero(row.error_count) > 0 ? "error" : "ok";
}

function modelForSpan(span) {
    return span.response_model || span.request_model || null;
}

function spanSubject(span) {
    return span.tool_name || span.mcp_tool_name || span.agent_name || modelForSpan(span) || null;
}

function isErrorSpan(span) {
    return span.status === "error" || Boolean(span.error_type);
}

function compareByTimeThenOrdinal(a, b) {
    if (a.start_time && b.start_time && a.start_time !== b.start_time) {
        return String(a.start_time).localeCompare(String(b.start_time));
    }

    if (a.start_time && !b.start_time) return -1;
    if (!a.start_time && b.start_time) return 1;
    const ordinal = numberOrZero(a.span_ordinal) - numberOrZero(b.span_ordinal);
    return ordinal !== 0 ? ordinal : numberOrZero(a.id) - numberOrZero(b.id);
}

function compactTrace(row) {
    return {
        trace_id: row.trace_id,
        client_kind: row.client_kind ?? null,
        status: statusFromTrace(row),
        span_count: row.span_count ?? null,
        tool_call_count: row.tool_call_count ?? null,
        error_count: row.error_count ?? null,
        input_tokens: row.input_tokens ?? null,
        output_tokens: row.output_tokens ?? null,
        total_tokens: row.total_tokens ?? null,
        turn_count: row.turn_count ?? null,
        agent_invocation_count: row.agent_invocation_count ?? null,
        duration_ms: row.duration_ms ?? null,
        primary_model: row.primary_model ?? null,
        first_seen_at: row.first_seen_at ?? null,
        last_seen_at: row.last_seen_at ?? null,
    };
}

function compactSpan(span) {
    return {
        span_ref: span.span_id || `row:${span.id}`,
        span_id: span.span_id ?? null,
        parent_span_id: span.parent_span_id ?? null,
        span_ordinal: span.span_ordinal ?? null,
        operation: span.operation ?? null,
        category: span.category ?? null,
        subject: spanSubject(span),
        tool_name: span.tool_name ?? null,
        tool_type: span.tool_type ?? null,
        mcp_tool_name: span.mcp_tool_name ?? null,
        mcp_server_hash: span.mcp_server_hash ?? null,
        agent_name: span.agent_name ?? null,
        model: modelForSpan(span),
        status: span.status ?? null,
        error_type: span.error_type ?? null,
        duration_ms: span.duration_ms ?? null,
        start_time: span.start_time ?? null,
        end_time: span.end_time ?? null,
        input_tokens: span.input_tokens ?? null,
        output_tokens: span.output_tokens ?? null,
        total_tokens: span.total_tokens ?? null,
        reasoning_tokens: span.reasoning_tokens ?? null,
        cache_read_tokens: span.cache_read_tokens ?? null,
        cache_creation_tokens: span.cache_creation_tokens ?? null,
    };
}

function summarizeTopSpans(spans) {
    return [...spans]
        .sort((a, b) => {
            const tokens = numberOrZero(b.total_tokens) - numberOrZero(a.total_tokens);
            if (tokens !== 0) return tokens;
            const duration = numberOrZero(b.duration_ms) - numberOrZero(a.duration_ms);
            return duration !== 0 ? duration : compareByTimeThenOrdinal(a, b);
        })
        .slice(0, MAX_TOP_SPANS)
        .map(compactSpan);
}

function sumField(spans, field) {
    return spans.reduce((sum, span) => sum + numberOrZero(span[field]), 0);
}

function uniqueModels(spans) {
    return [...new Set(spans.map(modelForSpan).filter(Boolean))].sort();
}

function isChatTurn(span) {
    return span.operation === "chat" || span.category === "llm_call";
}

function cacheHitRate(cacheReadTokens, inputTokens) {
    return inputTokens > 0 ? cacheReadTokens / inputTokens : null;
}

function cacheTurn(span) {
    return {
        span_ref: span.span_id || `row:${span.id}`,
        timestamp: span.start_time ?? null,
        model: modelForSpan(span),
        duration_ms: span.duration_ms ?? null,
        input_tokens: span.input_tokens ?? null,
        output_tokens: span.output_tokens ?? null,
        total_tokens: span.total_tokens ?? null,
        reasoning_tokens: span.reasoning_tokens ?? null,
        cache_read_tokens: span.cache_read_tokens ?? null,
        cache_creation_tokens: span.cache_creation_tokens ?? null,
        cache_hit_rate: cacheHitRate(numberOrZero(span.cache_read_tokens), numberOrZero(span.input_tokens)),
        status: span.status ?? null,
        error_type: span.error_type ?? null,
    };
}

function treeNode(span) {
    return {
        ...compactSpan(span),
        child_refs: [],
        children: [],
    };
}

function hierarchyFromSpans(spans) {
    const ordered = [...spans].sort(compareByTimeThenOrdinal);
    const truncated = ordered.length > MAX_TREE_NODES;
    const returned = ordered.slice(0, MAX_TREE_NODES);
    const hasAnyParent = ordered.some((span) => Boolean(span.parent_span_id));
    const allHaveSpanId = ordered.every((span) => Boolean(span.span_id));
    const fullIds = new Set(ordered.map((span) => span.span_id).filter(Boolean));
    const parentLinksComplete = ordered.every((span) => !span.parent_span_id || fullIds.has(span.parent_span_id));

    if (!hasAnyParent || !allHaveSpanId) {
        return {
            hierarchy_status: "flat_missing_parent_ids",
            spans: returned.map(compactSpan),
            returned_node_count: returned.length,
            truncated,
        };
    }

    if (!parentLinksComplete) {
        return {
            hierarchy_status: "flat_incomplete_parent_links",
            spans: returned.map(compactSpan),
            returned_node_count: returned.length,
            truncated,
        };
    }

    const nodes = new Map();
    for (const span of returned) {
        nodes.set(span.span_id, treeNode(span));
    }

    const roots = [];
    for (const span of returned) {
        const node = nodes.get(span.span_id);
        const parent = span.parent_span_id ? nodes.get(span.parent_span_id) : null;
        if (parent && node) {
            parent.child_refs.push(node.span_ref);
            parent.children.push(node);
        } else if (node) {
            roots.push(node);
        }
    }

    return {
        hierarchy_status: "complete",
        roots,
        returned_node_count: returned.length,
        truncated,
    };
}

function sanitizeDto(value) {
    if (Array.isArray(value)) {
        return value.map(sanitizeDto);
    }

    if (!value || typeof value !== "object") {
        return value;
    }

    const forbiddenKey = /(raw|payload|prompt|content|argument|result|user|email|credential|secret)/i;
    const sanitized = {};
    for (const [key, child] of Object.entries(value)) {
        if (forbiddenKey.test(key)) {
            continue;
        }

        sanitized[key] = sanitizeDto(child);
    }

    return sanitized;
}

async function handleMonitorHealth(ctx) {
    const monitorUrl = configuredMonitorUrl(ctx);
    validateMonitorUrl(monitorUrl);

    try {
        const health = await fetchReadiness(ctx);
        return sanitizeDto({
            reachable: true,
            ready_status_code: health.statusCode,
            readiness: health.readiness,
            canvas_safe: health.ok && health.readiness?.status === "ready",
            monitor_base_url: health.monitorUrl,
            diagnostic: health.ok
                ? "Local Monitor is reachable. Canvas-safe posture still requires --sanitized-only launch."
                : "Local Monitor is reachable but not ready.",
        });
    } catch (err) {
        if (err instanceof CanvasError) {
            return sanitizeDto({
                reachable: false,
                ready_status_code: null,
                readiness: null,
                canvas_safe: false,
                monitor_base_url: monitorUrl,
                diagnostic: err.message,
            });
        }

        throw err;
    }
}

async function handleListRecentTraces(ctx) {
    const input = ctx.input ?? {};
    const page = await fetchTracePage(ctx, input.limit);
    let items = page.items.map(compactTrace);
    if (input.status) {
        items = items.filter((trace) => trace.status === input.status);
    }

    if (input.model) {
        items = items.filter((trace) => trace.primary_model === input.model);
    }

    return sanitizeDto({
        items,
        count: items.length,
        truncated: false,
    });
}

async function findTraceSummary(ctx, traceId) {
    const page = await fetchTracePage(ctx, MAX_SPAN_PAGE_SIZE);
    return page.items.find((row) => row.trace_id === traceId) ?? null;
}

async function handleGetTraceSummary(ctx) {
    const traceId = ctx.input.traceId;
    const [traceRow, spanPage] = await Promise.all([
        findTraceSummary(ctx, traceId),
        fetchSpanPage(ctx, traceId),
    ]);
    const spans = spanPage.items;
    if (!traceRow && spans.length === 0) {
        throw new CanvasError("trace_not_found", "No sanitized trace data exists for that trace id.");
    }

    const chatTurns = spans.filter(isChatTurn);
    const cacheReadTokens = sumField(chatTurns, "cache_read_tokens");
    const cacheCreationTokens = sumField(chatTurns, "cache_creation_tokens");

    return sanitizeDto({
        trace: traceRow
            ? compactTrace(traceRow)
            : {
                trace_id: traceId,
                status: spans.some(isErrorSpan) ? "error" : "ok",
                span_count: spans.length,
            },
        top_spans: summarizeTopSpans(spans),
        models: uniqueModels(spans),
        cache_totals: {
            cache_read_tokens: cacheReadTokens,
            cache_creation_tokens: cacheCreationTokens,
            input_tokens: sumField(chatTurns, "input_tokens"),
            output_tokens: sumField(chatTurns, "output_tokens"),
            total_tokens: sumField(chatTurns, "total_tokens"),
        },
        span_page_truncated: spanPage.next_cursor !== null && spanPage.next_cursor !== undefined,
    });
}

async function handleGetTraceSpanTree(ctx) {
    const traceId = ctx.input.traceId;
    const spanPage = await fetchSpanPage(ctx, traceId);
    if (spanPage.items.length === 0) {
        throw new CanvasError("trace_not_found", "No sanitized spans exist for that trace id.");
    }

    return sanitizeDto({
        trace_id: traceId,
        span_count: spanPage.items.length,
        ...hierarchyFromSpans(spanPage.items),
    });
}

async function handleGetCacheSummary(ctx) {
    const traceId = ctx.input.traceId;
    const spanPage = await fetchSpanPage(ctx, traceId);
    if (spanPage.items.length === 0) {
        throw new CanvasError("trace_not_found", "No sanitized spans exist for that trace id.");
    }

    const turns = spanPage.items
        .filter(isChatTurn)
        .sort(compareByTimeThenOrdinal);
    const returnedTurns = turns.slice(0, MAX_CACHE_TURNS);
    const inputTokens = sumField(turns, "input_tokens");
    const outputTokens = sumField(turns, "output_tokens");
    const totalTokens = sumField(turns, "total_tokens");
    const cacheReadTokens = sumField(turns, "cache_read_tokens");
    const cacheCreationTokens = sumField(turns, "cache_creation_tokens");

    return sanitizeDto({
        trace_id: traceId,
        turn_count: turns.length,
        returned_turn_count: returnedTurns.length,
        truncated: turns.length > MAX_CACHE_TURNS,
        totals: {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            total_tokens: totalTokens,
            cache_read_tokens: cacheReadTokens,
            cache_creation_tokens: cacheCreationTokens,
            duration_ms: sumField(turns, "duration_ms"),
        },
        cache_hit_rate: cacheHitRate(cacheReadTokens, inputTokens),
        turns: returnedTurns.map(cacheTurn),
    });
}

// --------------- canvas ---------------

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "otel-monitor",
            displayName: "OTel Monitor",
            description:
                "Local Ingestion Monitor Canvas adapter. Requires the Local Monitor to run with --sanitized-only. Opens sanitized monitor pages and provides agent-callable actions over existing /api/monitor/* data.",

            inputSchema: {
                type: "object",
                properties: {
                    monitorBaseUrl: {
                        type: "string",
                        description: "Base URL of the Local Ingestion Monitor (default: http://127.0.0.1:4320).",
                        default: DEFAULT_MONITOR_URL,
                    },
                },
                additionalProperties: false,
            },

            actions: [
                {
                    name: "monitor_health",
                    description: "Return Local Monitor readiness and Canvas-safe posture diagnostics.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                    },
                    handler: handleMonitorHealth,
                },
                {
                    name: "list_recent_traces",
                    description: "List recent sanitized Local Monitor traces with bounded output.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            limit: {
                                type: "integer",
                                minimum: 1,
                                maximum: MAX_TRACE_LIST_LIMIT,
                            },
                            status: {
                                type: "string",
                                enum: ["ok", "error"],
                            },
                            model: {
                                type: "string",
                                minLength: 1,
                                maxLength: 100,
                            },
                        },
                        required: ["limit"],
                        additionalProperties: false,
                    },
                    handler: handleListRecentTraces,
                },
                {
                    name: "get_trace_summary",
                    description: "Return one bounded sanitized trace summary with top spans and cache totals.",
                    inputSchema: traceIdSchema,
                    handler: handleGetTraceSummary,
                },
                {
                    name: "get_trace_span_tree",
                    description: "Return a bounded sanitized span hierarchy or ordered flat diagnostic for one trace.",
                    inputSchema: traceIdSchema,
                    handler: handleGetTraceSpanTree,
                },
                {
                    name: "get_cache_summary",
                    description: "Return sanitized cache token metrics and a bounded per-turn breakdown for one trace.",
                    inputSchema: traceIdSchema,
                    handler: handleGetCacheSummary,
                },
            ],

            open: async (ctx) => {
                const monitorUrl = ctx.input?.monitorBaseUrl ?? DEFAULT_MONITOR_URL;

                // Validate loopback-only.
                if (!isLoopbackUrl(monitorUrl)) {
                    throw new CanvasError(
                        "invalid_monitor_url",
                        `Monitor URL must be loopback (127.0.0.1 / localhost / ::1). Received: ${monitorUrl}`
                    );
                }

                // Clean up any previous server for this instance (idempotent).
                const prev = servers.get(ctx.instanceId);
                if (prev) {
                    await new Promise((resolve) => prev.server.close(() => resolve()));
                    servers.delete(ctx.instanceId);
                }

                // Check monitor health.
                const health = await checkMonitorHealth(monitorUrl);

                if (health.healthy) {
                    return {
                        title: "OTel Monitor",
                        status: "Connected",
                        url: monitorUrl,
                    };
                }

                // Monitor is not healthy. Start a diagnostic server on an
                // ephemeral loopback port and show the diagnostic page.
                const entry = await startDiagnosticServer(
                    ctx.instanceId,
                    monitorUrl,
                    health.statusCode !== null ? `unhealthy (${health.statusCode})` : "unreachable",
                    health.body,
                    health.error,
                );
                servers.set(ctx.instanceId, entry);
                return {
                    title: "OTel Monitor — Offline",
                    status: "Monitor unavailable",
                    url: entry.url,
                };
            },

            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
