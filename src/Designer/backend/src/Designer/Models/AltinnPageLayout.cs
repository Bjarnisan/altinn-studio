#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using Altinn.App.Core.Helpers;

namespace Altinn.Studio.Designer.Models;

public class AltinnPageLayout
{
    private static readonly string[] s_attachmentComponentTypes = ["FileUpload", "FileUploadWithTag", "ImageUpload"];

    private readonly Random _random = new();

    public JsonObject Structure { get; set; }

    public AltinnPageLayout(string schemaUrl)
    {
        Structure = new()
        {
            ["$schema"] = schemaUrl,
            ["data"] = new JsonObject { ["layout"] = new JsonArray([]) },
        };
    }

    public AltinnPageLayout(JsonObject structure)
    {
        Structure = structure;
    }

    string GenerateRandomId(int length = 6)
    {
        const string Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
        return new string([.. Enumerable.Repeat(Chars, length).Select(s => s[_random.Next(s.Length)])]);
    }

    public bool HasComponentOfType(string type)
    {
        JsonArray components = Structure["data"]["layout"] as JsonArray;
        return components.Any((component) => component["type"].GetValue<string>().Equals(type));
    }

    public AltinnPageLayout WithNavigationButtons(bool includeShowBackButton)
    {
        JsonObject navigationButtons = new()
        {
            ["id"] = "NavigationButtons-" + GenerateRandomId(),
            ["textResourceBindings"] = { },
            ["type"] = "NavigationButtons",
        };
        if (includeShowBackButton)
        {
            navigationButtons["showBackButton"] = true;
        }

        (Structure["data"]["layout"] as JsonArray).Add(navigationButtons);
        return this;
    }

    public AltinnPageLayout RemoveAllComponentsOfType(string type)
    {
        JsonArray components = Structure["data"]["layout"] as JsonArray;
        components?.RemoveAll((component) => component["type"].GetValue<string>().Equals(type));
        return this;
    }

    /// <summary>
    /// Returns the ids of the components that upload attachments. Designer gives each of them a data type with the
    /// same id.
    /// </summary>
    public List<string> GetAttachmentComponentIds()
    {
        JsonArray components = Structure["data"]["layout"] as JsonArray;
        return components
            .Where((component) => s_attachmentComponentTypes.Contains(component["type"].GetValue<string>()))
            .Select((component) => component["id"].GetValue<string>())
            .ToList();
    }
}
