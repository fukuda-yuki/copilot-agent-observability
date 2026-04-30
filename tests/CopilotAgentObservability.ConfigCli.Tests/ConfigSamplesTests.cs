using System.Text.Json;
using CopilotAgentObservability.ConfigCli;

namespace CopilotAgentObservability.ConfigCli.Tests;

public class ConfigSamplesTests
{
    [Fact]
    public void CreateVsCodeSettingsJson_IncludesPhase0Settings()
    {
        using var document = JsonDocument.Parse(ConfigSamples.CreateVsCodeSettingsJson());
        var root = document.RootElement;

        Assert.True(root.GetProperty("github.copilot.chat.otel.enabled").GetBoolean());
        Assert.Equal("otlp-http", root.GetProperty("github.copilot.chat.otel.exporterType").GetString());
        Assert.Equal("https://localhost:21025", root.GetProperty("github.copilot.chat.otel.otlpEndpoint").GetString());
        Assert.True(root.GetProperty("github.copilot.chat.otel.captureContent").GetBoolean());
    }

    [Fact]
    public void CreateVsCodePowerShellScript_IncludesPhase0EnvironmentVariables()
    {
        var script = ConfigSamples.CreateVsCodePowerShellScript();

        Assert.Contains("$env:COPILOT_OTEL_ENABLED=\"true\"", script);
        Assert.Contains("$env:COPILOT_OTEL_ENDPOINT=\"https://localhost:21025\"", script);
        Assert.Contains("$env:COPILOT_OTEL_CAPTURE_CONTENT=\"true\"", script);
        Assert.Contains("user.id=example-user", script);
        Assert.Contains("user.email=user@example.com", script);
        Assert.Contains("team.id=platform", script);
        Assert.Contains("department=engineering", script);
        Assert.Contains("client.kind=vscode-copilot-chat", script);
        Assert.Contains("experiment.id=baseline", script);
    }

    [Fact]
    public void CreateVsCodeFileSettingsJson_IncludesFileExporterSettings()
    {
        using var document = JsonDocument.Parse(ConfigSamples.CreateVsCodeFileSettingsJson("tmp/copilot-chat-otel.jsonl"));
        var root = document.RootElement;

        Assert.True(root.GetProperty("github.copilot.chat.otel.enabled").GetBoolean());
        Assert.Equal("file", root.GetProperty("github.copilot.chat.otel.exporterType").GetString());
        Assert.Equal("tmp/copilot-chat-otel.jsonl", root.GetProperty("github.copilot.chat.otel.outfile").GetString());
        Assert.True(root.GetProperty("github.copilot.chat.otel.captureContent").GetBoolean());
    }

    [Fact]
    public void CreateCopilotCliPowerShellScript_IncludesPhase0EnvironmentVariables()
    {
        var script = ConfigSamples.CreateCopilotCliPowerShellScript();

        Assert.Contains("$env:COPILOT_OTEL_ENABLED=\"true\"", script);
        Assert.Contains("$env:OTEL_EXPORTER_OTLP_ENDPOINT=\"https://localhost:21025\"", script);
        Assert.Contains("$env:OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=\"true\"", script);
        Assert.Contains("user.id=example-user", script);
        Assert.Contains("user.email=user@example.com", script);
        Assert.Contains("team.id=platform", script);
        Assert.Contains("department=engineering", script);
        Assert.Contains("client.kind=copilot-cli", script);
        Assert.Contains("experiment.id=baseline", script);
    }
}
