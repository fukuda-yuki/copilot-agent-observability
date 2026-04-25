using System.Text;
using System.Text.Json;

namespace CopilotAgentObservability.ConfigCli;

internal static class Program
{
    public static int Main(string[] args)
    {
        return CliApplication.Run(args, Console.Out, Console.Error);
    }
}

internal static class CliApplication
{
    public static int Run(string[] args, TextWriter output, TextWriter error)
    {
        if (args.Length == 0 || args[0] is "-h" or "--help" or "help")
        {
            output.WriteLine(HelpText);
            return args.Length == 0 ? 1 : 0;
        }

        switch (args[0])
        {
            case "vscode-settings":
                output.WriteLine(ConfigSamples.CreateVsCodeSettingsJson());
                return 0;

            case "copilot-cli-env":
                output.WriteLine(ConfigSamples.CreateCopilotCliPowerShellScript());
                return 0;

            case "validate-resource-attributes":
                if (args.Length != 2)
                {
                    error.WriteLine("error: validate-resource-attributes requires exactly one OTEL_RESOURCE_ATTRIBUTES value.");
                    return 1;
                }

                var result = ResourceAttributeValidator.Validate(args[1]);
                foreach (var validationError in result.Errors)
                {
                    error.WriteLine($"error: {validationError}");
                }

                foreach (var warning in result.Warnings)
                {
                    error.WriteLine($"warning: {warning}");
                }

                if (!result.IsValid)
                {
                    return 1;
                }

                output.WriteLine("OTEL_RESOURCE_ATTRIBUTES is valid.");
                return 0;

            default:
                error.WriteLine($"error: unknown command '{args[0]}'.");
                error.WriteLine(HelpText);
                return 1;
        }
    }

    private const string HelpText = """
        Usage:
          config-cli vscode-settings
          config-cli copilot-cli-env
          config-cli validate-resource-attributes <OTEL_RESOURCE_ATTRIBUTES>
        """;
}

internal static class ConfigSamples
{
    public const string DefaultOtlpEndpoint = "https://localhost:21025";
    public const string VsCodeClientKind = "vscode-copilot-chat";
    public const string CopilotCliClientKind = "copilot-cli";
    public const string DefaultExperimentId = "baseline";

    public static string CreateVsCodeSettingsJson()
    {
        var settings = new Dictionary<string, object>
        {
            ["github.copilot.chat.otel.enabled"] = true,
            ["github.copilot.chat.otel.exporterType"] = "otlp-http",
            ["github.copilot.chat.otel.otlpEndpoint"] = DefaultOtlpEndpoint,
            ["github.copilot.chat.otel.captureContent"] = true,
        };

        return JsonSerializer.Serialize(settings, new JsonSerializerOptions { WriteIndented = true });
    }

    public static string CreateCopilotCliPowerShellScript()
    {
        var resourceAttributes = string.Join(
            ',',
            "user.id=example-user",
            "user.email=user@example.com",
            "team.id=platform",
            "department=engineering",
            $"client.kind={CopilotCliClientKind}",
            $"experiment.id={DefaultExperimentId}");

        var builder = new StringBuilder();
        builder.AppendLine("$env:COPILOT_OTEL_ENABLED=\"true\"");
        builder.AppendLine($"$env:OTEL_EXPORTER_OTLP_ENDPOINT=\"{DefaultOtlpEndpoint}\"");
        builder.AppendLine("$env:OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=\"true\"");
        builder.Append($"$env:OTEL_RESOURCE_ATTRIBUTES=\"{resourceAttributes}\"");
        return builder.ToString();
    }
}

internal static class ResourceAttributeValidator
{
    private static readonly string[] RequiredKeys =
    [
        "user.id",
        "user.email",
        "team.id",
        "department",
        "client.kind",
        "experiment.id",
    ];

    private static readonly HashSet<string> RecommendedClientKinds = new(StringComparer.Ordinal)
    {
        ConfigSamples.VsCodeClientKind,
        ConfigSamples.CopilotCliClientKind,
    };

    public static ResourceAttributeValidationResult Validate(string rawValue)
    {
        var parseResult = Parse(rawValue);
        var errors = new List<string>(parseResult.Errors);
        var warnings = new List<string>();
        var attributes = parseResult.Attributes;

        foreach (var requiredKey in RequiredKeys)
        {
            if (!attributes.ContainsKey(requiredKey))
            {
                errors.Add($"missing required resource attribute '{requiredKey}'.");
            }
        }

        if (attributes.TryGetValue("client.kind", out var clientKind)
            && !RecommendedClientKinds.Contains(clientKind))
        {
            warnings.Add($"client.kind '{clientKind}' is not a recommended value. Use 'vscode-copilot-chat' or 'copilot-cli'.");
        }

        if (attributes.TryGetValue("experiment.id", out var experimentId)
            && !string.Equals(experimentId, ConfigSamples.DefaultExperimentId, StringComparison.Ordinal))
        {
            warnings.Add($"experiment.id '{experimentId}' is not the initial recommended value 'baseline'.");
        }

        return new ResourceAttributeValidationResult(errors, warnings);
    }

    private static ResourceAttributeParseResult Parse(string rawValue)
    {
        var attributes = new Dictionary<string, string>(StringComparer.Ordinal);
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(rawValue))
        {
            errors.Add("OTEL_RESOURCE_ATTRIBUTES is empty.");
            return new ResourceAttributeParseResult(attributes, errors);
        }

        var elements = rawValue.Split(',');
        for (var index = 0; index < elements.Length; index++)
        {
            var element = elements[index].Trim();
            var displayIndex = index + 1;

            if (element.Length == 0)
            {
                errors.Add($"resource attribute element {displayIndex} is empty.");
                continue;
            }

            var separatorIndex = element.IndexOf('=');
            if (separatorIndex < 0)
            {
                errors.Add($"resource attribute element {displayIndex} is not in key=value form.");
                continue;
            }

            var key = element[..separatorIndex].Trim();
            var value = element[(separatorIndex + 1)..].Trim();
            if (key.Length == 0)
            {
                errors.Add($"resource attribute element {displayIndex} has an empty key.");
                continue;
            }

            attributes[key] = value;
        }

        return new ResourceAttributeParseResult(attributes, errors);
    }

    private sealed record ResourceAttributeParseResult(
        IReadOnlyDictionary<string, string> Attributes,
        IReadOnlyList<string> Errors);
}

internal sealed record ResourceAttributeValidationResult(
    IReadOnlyList<string> Errors,
    IReadOnlyList<string> Warnings)
{
    public bool IsValid => Errors.Count == 0;
}
