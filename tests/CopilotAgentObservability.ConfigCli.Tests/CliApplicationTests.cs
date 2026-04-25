using CopilotAgentObservability.ConfigCli;

namespace CopilotAgentObservability.ConfigCli.Tests;

public class CliApplicationTests
{
    [Fact]
    public void Run_VsCodeSettings_WritesSettingsToOutput()
    {
        using var output = new StringWriter();
        using var error = new StringWriter();

        var exitCode = CliApplication.Run(["vscode-settings"], output, error);

        Assert.Equal(0, exitCode);
        Assert.Contains("github.copilot.chat.otel.otlpEndpoint", output.ToString());
        Assert.Equal(string.Empty, error.ToString());
    }

    [Fact]
    public void Run_CopilotCliEnv_WritesScriptToOutput()
    {
        using var output = new StringWriter();
        using var error = new StringWriter();

        var exitCode = CliApplication.Run(["copilot-cli-env"], output, error);

        Assert.Equal(0, exitCode);
        Assert.Contains("$env:OTEL_RESOURCE_ATTRIBUTES", output.ToString());
        Assert.Equal(string.Empty, error.ToString());
    }

    [Fact]
    public void Run_ValidateResourceAttributes_ReturnsNonZeroForMissingAttributes()
    {
        using var output = new StringWriter();
        using var error = new StringWriter();

        var exitCode = CliApplication.Run(["validate-resource-attributes", "client.kind=copilot-cli"], output, error);

        Assert.Equal(1, exitCode);
        Assert.Contains("missing required resource attribute", error.ToString());
    }
}
