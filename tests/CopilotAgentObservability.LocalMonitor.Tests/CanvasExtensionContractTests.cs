namespace CopilotAgentObservability.LocalMonitor.Tests;

public class CanvasExtensionContractTests
{
    [Fact]
    public void Extension_DeclaresM3AndM4CanvasActions()
    {
        var script = ReadExtension();

        foreach (var action in new[]
        {
            "monitor_health",
            "list_recent_traces",
            "get_trace_summary",
            "get_trace_span_tree",
            "get_cache_summary",
        })
        {
            Assert.Contains($"name: \"{action}\"", script);
        }
    }

    [Fact]
    public void Extension_UsesStrictInputSchemasForTraceAndListActions()
    {
        var script = ReadExtension();

        Assert.Contains("TRACE_ID_PATTERN", script);
        Assert.Contains("^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$", script);
        Assert.Contains("minimum: 1", script);
        Assert.Contains("maximum: MAX_TRACE_LIST_LIMIT", script);
        Assert.Contains("additionalProperties: false", script);
    }

    [Fact]
    public void Extension_FetchesOnlySanitizedMonitorEndpoints()
    {
        var script = ReadExtension();

        Assert.Contains("/health/ready", script);
        Assert.Contains("/api/monitor/traces", script);
        Assert.Contains("/spans", script);
        Assert.Contains("limit=${MAX_SPAN_PAGE_SIZE}", script);
        Assert.DoesNotContain("/raw", script);
        Assert.DoesNotContain("payload_json", script);
        Assert.DoesNotContain("console.log", script);
    }

    [Fact]
    public void Extension_BoundsTraceTreeAndCacheSummaryOutputs()
    {
        var script = ReadExtension();

        Assert.Contains("MAX_SPAN_PAGE_SIZE = 200", script);
        Assert.Contains("MAX_TREE_NODES = 50", script);
        Assert.Contains("MAX_CACHE_TURNS = 50", script);
        Assert.Contains("hierarchy_status", script);
        Assert.Contains("flat_missing_parent_ids", script);
        Assert.Contains("flat_incomplete_parent_links", script);
        Assert.Contains("cache_hit_rate", script);
    }

    private static string ReadExtension()
    {
        var repoRoot = FindRepoRoot();
        var path = Path.Combine(repoRoot, ".github", "extensions", "otel-monitor-canvas", "extension.mjs");
        return File.ReadAllText(path);
    }

    private static string FindRepoRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            if (Directory.Exists(Path.Combine(directory.FullName, ".git")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new InvalidOperationException("Could not locate repository root.");
    }
}
