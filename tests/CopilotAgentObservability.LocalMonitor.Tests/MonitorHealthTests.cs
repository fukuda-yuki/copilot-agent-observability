using CopilotAgentObservability.LocalMonitor.Health;

namespace CopilotAgentObservability.LocalMonitor.Tests;

public class MonitorHealthTests
{
    private const int DefaultStallThresholdSeconds = 10;

    private static readonly DateTimeOffset Start = new(2026, 6, 24, 0, 0, 0, TimeSpan.Zero);

    private static MonitorHealthState HealthyState(MutableTimeProvider time)
    {
        var state = new MonitorHealthState(time);
        state.SetLoopbackBound(true);
        state.MarkMigrationComplete();
        state.SetWriterRunning(true);
        return state;
    }

    [Fact]
    public void Evaluate_WriterHealthyButProjectionWorkerAbsent_IsNotReadyWithProjectionWorkerMissing()
    {
        var time = new MutableTimeProvider(Start);
        var state = HealthyState(time);

        var readiness = state.Evaluate(DefaultStallThresholdSeconds);

        Assert.False(readiness.IsReady);
        Assert.Equal("not_ready", readiness.Status);
        Assert.Contains("projection_worker_missing", readiness.DegradedReasons);
        Assert.True(readiness.MigrationComplete);
        Assert.True(readiness.WriterRunning);
        Assert.True(readiness.IngestionAccepting);
        Assert.False(readiness.ProjectionWorkerRunning);
    }

    [Fact]
    public void Evaluate_MomentaryBackpressureUnderThreshold_StaysProjectionWorkerMissingNotStalled()
    {
        var time = new MutableTimeProvider(Start);
        var state = HealthyState(time);
        state.RecordBackpressure();

        time.Advance(TimeSpan.FromSeconds(DefaultStallThresholdSeconds - 1));
        var readiness = state.Evaluate(DefaultStallThresholdSeconds);

        Assert.Equal("not_ready", readiness.Status);
        Assert.Contains("projection_worker_missing", readiness.DegradedReasons);
        Assert.DoesNotContain("ingestion_stalled", readiness.DegradedReasons);
        Assert.False(readiness.IngestionAccepting);
    }

    [Fact]
    public void Evaluate_SustainedBackpressureAtThreshold_IsIngestionStalled()
    {
        var time = new MutableTimeProvider(Start);
        var state = HealthyState(time);
        state.RecordBackpressure();

        time.Advance(TimeSpan.FromSeconds(DefaultStallThresholdSeconds));
        var readiness = state.Evaluate(DefaultStallThresholdSeconds);

        Assert.Equal("not_ready", readiness.Status);
        Assert.Contains("ingestion_stalled", readiness.DegradedReasons);
        Assert.DoesNotContain("projection_worker_missing", readiness.DegradedReasons);
    }

    [Fact]
    public void Evaluate_HonorsConfiguredOverrideThreshold()
    {
        var time = new MutableTimeProvider(Start);
        var state = HealthyState(time);
        state.RecordBackpressure();

        time.Advance(TimeSpan.FromSeconds(3));

        Assert.DoesNotContain("ingestion_stalled", state.Evaluate(10).DegradedReasons);
        Assert.Contains("ingestion_stalled", state.Evaluate(3).DegradedReasons);
    }

    [Fact]
    public void Evaluate_CommitSuccessClearsTheStallWindow()
    {
        var time = new MutableTimeProvider(Start);
        var state = HealthyState(time);
        state.RecordBackpressure();
        time.Advance(TimeSpan.FromSeconds(DefaultStallThresholdSeconds));
        state.RecordCommitSuccess();

        var readiness = state.Evaluate(DefaultStallThresholdSeconds);

        Assert.DoesNotContain("ingestion_stalled", readiness.DegradedReasons);
        Assert.True(readiness.IngestionAccepting);
    }

    [Fact]
    public void Evaluate_MigrationFailure_IsNotReadyWithMigrationFailed()
    {
        var time = new MutableTimeProvider(Start);
        var state = new MonitorHealthState(time);
        state.SetLoopbackBound(true);
        state.MarkMigrationFailed();

        var readiness = state.Evaluate(DefaultStallThresholdSeconds);

        Assert.Equal("not_ready", readiness.Status);
        Assert.Contains("migration_failed", readiness.DegradedReasons);
        Assert.DoesNotContain("projection_worker_missing", readiness.DegradedReasons);
        Assert.False(readiness.MigrationComplete);
    }

    [Fact]
    public void Evaluate_FatalWorkerError_IsNotReadyWithFatalError()
    {
        var time = new MutableTimeProvider(Start);
        var state = HealthyState(time);
        state.MarkFatal();

        var readiness = state.Evaluate(DefaultStallThresholdSeconds);

        Assert.Equal("not_ready", readiness.Status);
        Assert.Contains("fatal_error", readiness.DegradedReasons);
    }

    [Fact]
    public void Serialize_EmitsTheFullPinnedReadinessBody()
    {
        var time = new MutableTimeProvider(Start);
        var state = HealthyState(time);

        var json = MonitorReadinessJson.Serialize(state.Evaluate(DefaultStallThresholdSeconds));

        Assert.Contains("\"status\":\"not_ready\"", json);
        Assert.Contains("\"checks\":", json);
        Assert.Contains("\"loopback_bound\":true", json);
        Assert.Contains("\"db_open\":true", json);
        Assert.Contains("\"migration_complete\":true", json);
        Assert.Contains("\"writer_running\":true", json);
        Assert.Contains("\"projection_worker_running\":false", json);
        Assert.Contains("\"ingestion_accepting\":true", json);
        Assert.Contains("\"projection_lag_seconds\":0", json);
        Assert.Contains("\"projection_backlog\":0", json);
        Assert.Contains("\"degraded_reasons\":[\"projection_worker_missing\"]", json);
    }

    private sealed class MutableTimeProvider : TimeProvider
    {
        private DateTimeOffset now;

        public MutableTimeProvider(DateTimeOffset start)
        {
            now = start;
        }

        public override DateTimeOffset GetUtcNow() => now;

        public void Advance(TimeSpan delta) => now += delta;
    }
}
