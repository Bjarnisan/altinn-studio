using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Xml.Linq;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.LayoutController;

/// <summary>
/// Deleting a page must delete the data types of its attachment components, as deleting a single attachment
/// component does. A data type left behind still requires its attachments, so the app refuses every submission.
/// </summary>
public class DeletePageTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<DeletePageTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const string AppWithAttachmentComponents = "app-with-attachment-components";
    private const string LayoutSet = "form";
    private const string PageWithAttachmentComponents = "attachments";
    private const string ApplicationMetadataPath = "App/config/applicationmetadata.json";
    private const string ProcessDefinitionPath = "App/config/process/process.bpmn";

    /// <summary>
    /// A v8 app with a layout set, and a v9 app with a UI folder. Both editors delete pages through this endpoint.
    /// </summary>
    public static TheoryData<string, string> AppsAndLayoutSets =>
        new() { { AppWithAttachmentComponents, LayoutSet }, { "app-with-attachment-components-v9", "Task_1" } };

    [Theory]
    [MemberData(nameof(AppsAndLayoutSets))]
    public async Task DeletePage_DeletesTheDataTypesOfTheAttachmentComponentsOnThePage(string app, string layoutSet)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, app, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await DeletePage(
            targetRepository,
            layoutSet,
            PageWithAttachmentComponents
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            ["ref-data-as-pdf", "model", "receipts", "signature", "approval"],
            GetDataTypeIds(targetRepository)
        );
    }

    [Theory]
    [MemberData(nameof(AppsAndLayoutSets))]
    public async Task DeletePage_RemovesTheAttachmentComponentsOnThePageFromTheDataTypesToSign(
        string app,
        string layoutSet
    )
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, app, Developer, targetRepository);
        string processDefinitionBefore = GetFile(targetRepository, ProcessDefinitionPath);

        // Act
        using HttpResponseMessage response = await DeletePage(
            targetRepository,
            layoutSet,
            PageWithAttachmentComponents
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        // Each removed element takes the whitespace before it. Both sides are parsed, so the comparison does not
        // see the XML declaration or line endings, which XDocument writes in its own way.
        string expectedProcessDefinition = Regex.Replace(
            processDefinitionBefore,
            @"\s*<altinn:dataType>(attachments|taggedAttachments|photo)</altinn:dataType>",
            string.Empty
        );
        Assert.Equal(
            ParseWithWhitespace(expectedProcessDefinition),
            ParseWithWhitespace(GetFile(targetRepository, ProcessDefinitionPath))
        );
    }

    [Theory]
    [InlineData("summary")] // No attachment components.
    [InlineData("leftovers")] // An attachment component without a data type, which no task signs.
    public async Task DeletePage_WhenThePageHasNoDataTypesToDelete_LeavesApplicationMetadataAndProcessUnchanged(
        string pageId
    )
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithAttachmentComponents, Developer, targetRepository);
        string applicationMetadataBefore = GetFile(targetRepository, ApplicationMetadataPath);
        string processDefinitionBefore = GetFile(targetRepository, ProcessDefinitionPath);

        // Act
        using HttpResponseMessage response = await DeletePage(targetRepository, LayoutSet, pageId);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(applicationMetadataBefore, GetFile(targetRepository, ApplicationMetadataPath));
        Assert.Equal(processDefinitionBefore, GetFile(targetRepository, ProcessDefinitionPath));
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("""{"data": {}}""")]
    [InlineData("""{"data": {"layout": [null, {"id": "withoutType"}, {"type": "FileUpload"}]}}""")]
    [InlineData("[]")]
    public async Task DeletePage_WhenThePageLacksPartsOfALayout_DeletesThePage(string pageContent)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithAttachmentComponents, Developer, targetRepository);
        string pagePath = Path.Combine(TestRepoPath, "App", "ui", LayoutSet, "layouts", "summary.json");
        await File.WriteAllTextAsync(pagePath, pageContent);

        // Act
        using HttpResponseMessage response = await DeletePage(targetRepository, LayoutSet, "summary");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(File.Exists(pagePath));
    }

    private async Task<HttpResponseMessage> DeletePage(string repository, string layoutSet, string pageId) =>
        await HttpClient.DeleteAsync($"/designer/api/{Org}/{repository}/layouts/layoutSet/{layoutSet}/pages/{pageId}");

    private static List<string> GetDataTypeIds(string repository) =>
        [
            .. JsonNode
                .Parse(GetFile(repository, ApplicationMetadataPath))["dataTypes"]
                .AsArray()
                .Select(dataType => (string)dataType["id"]),
        ];

    private static string ParseWithWhitespace(string xml) =>
        XDocument.Parse(xml, LoadOptions.PreserveWhitespace).ToString(SaveOptions.DisableFormatting);

    private static string GetFile(string repository, string relativePath) =>
        TestDataHelper.GetFileFromRepo(Org, repository, Developer, relativePath);
}
