using CopilotAgentObservability.LocalMonitor.Health;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;

namespace CopilotAgentObservability.LocalMonitor.Tests;

/// <summary>
/// A deterministic <see cref="TimeProvider"/> whose clock only moves when the test
/// calls <see cref="Advance"/>. Shared by the health and readiness-failure tests so
/// stall / projection-lag windows are exercised without real waiting.
/// </summary>
internal sealed class MutableTimeProvider : TimeProvider
{
    private DateTimeOffset now;

    public MutableTimeProvider(DateTimeOffset start)
    {
        now = start;
    }

    public override DateTimeOffset GetUtcNow() => now;

    public void Advance(TimeSpan delta) => now += delta;
}

internal static class MonitorTestHealth
{
    /// <summary>
    /// A fully healthy, caught-up readiness state bound to <paramref name="time"/>:
    /// loopback bound, migration complete, writer and projection worker running, and
    /// a known projection status with zero backlog / zero lag.
    /// </summary>
    public static MonitorHealthState Ready(MutableTimeProvider time)
    {
        var health = new MonitorHealthState(time);
        health.SetLoopbackBound(true);
        health.MarkMigrationComplete();
        health.SetWriterRunning(true);
        health.SetProjectionWorkerRunning(true);
        health.SetProjectionStatus(backlog: 0, oldestUnprocessedReceivedAt: null);
        return health;
    }
}

internal static class MonitorTestHost
{
    public static async Task<RunningMonitorHost> StartAsync(
        MonitorTempDirectory temp,
        bool sanitizedOnly = false,
        int maxRequestBodyBytes = MonitorOptions.DefaultMaxRequestBodyBytes,
        int ingestionStallThresholdSeconds = MonitorOptions.DefaultIngestionStallThresholdSeconds,
        int projectionLagThresholdSeconds = MonitorOptions.DefaultProjectionLagThresholdSeconds,
        MonitorHostTestOptions? testOptions = null)
    {
        var options = new MonitorOptions(
            temp.DatabasePath,
            Url: "http://127.0.0.1:0",
            SanitizedOnly: sanitizedOnly,
            MaxRequestBodyBytes: maxRequestBodyBytes,
            ingestionStallThresholdSeconds,
            projectionLagThresholdSeconds);
        var app = testOptions is null ? MonitorHost.Build(options) : MonitorHost.Build(options, testOptions);
        await app.StartAsync();

        var url = GetSingleBoundAddress(app);
        return new RunningMonitorHost(app, new HttpClient { BaseAddress = new Uri(url) }, url);
    }

    private static string GetSingleBoundAddress(Microsoft.AspNetCore.Builder.WebApplication app)
    {
        var addresses = app.Services.GetRequiredService<IServer>()
            .Features.Get<IServerAddressesFeature>()?
            .Addresses
            .ToArray();
        Assert.NotNull(addresses);
        var address = Assert.Single(addresses);
        Assert.StartsWith("http://127.0.0.1:", address, StringComparison.Ordinal);
        Assert.False(address.EndsWith(":0", StringComparison.Ordinal));
        return address;
    }
}

internal sealed class RunningMonitorHost(
    Microsoft.AspNetCore.Builder.WebApplication app,
    HttpClient client,
    string url) : IAsyncDisposable
{
    public HttpClient Client { get; } = client;

    public string Url { get; } = url;

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        try
        {
            await app.StopAsync();
        }
        catch
        {
            // Ignore stop faults during teardown.
        }

        await app.DisposeAsync();
    }
}
