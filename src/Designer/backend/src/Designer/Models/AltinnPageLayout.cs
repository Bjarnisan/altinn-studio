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
        // Reading a page must not stop it from being deleted, even when it was edited outside Designer and lacks
        // parts of a layout.
        if (Structure["data"]?["layout"] is not JsonArray components)
        {
            return [];
        }
        return components
            .OfType<JsonObject>()
            .Where((component) => s_attachmentComponentTypes.Contains((string)component["type"]))
            .Select((component) => (string)component["id"])
            .OfType<string>()
            .ToList();
    }
}
