using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Xml.Linq;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.LayoutPageDeleted;

/// <summary>
/// Removes the attachment components on a deleted page from the data types that signing tasks sign, as Designer does
/// when a single attachment component is deleted.
/// </summary>
internal sealed class LayoutPageDeletedProcessDefinitionHandler(
    IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
    IFileSyncHandlerExecutor fileSyncHandlerExecutor
) : INotificationHandler<LayoutPageDeletedEvent>
{
    private static readonly XNamespace s_altinnNamespace = "http://altinn.no/process";

    /// <inheritdoc />
    public async Task Handle(LayoutPageDeletedEvent notification, CancellationToken cancellationToken)
    {
        if (notification.AttachmentComponentIds.Count == 0)
        {
            return;
        }

        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutPageDeletedProcessDefinitionSyncError,
            "App/config/process/process.bpmn",
            async () =>
            {
                AltinnAppGitRepository repository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    notification.EditingContext.Org,
                    notification.EditingContext.Repo,
                    notification.EditingContext.Developer
                );
                XDocument processDefinition;
                await using (Stream processDefinitionStream = repository.GetProcessDefinitionFile())
                {
                    processDefinition = await XDocument.LoadAsync(
                        processDefinitionStream,
                        LoadOptions.PreserveWhitespace,
                        cancellationToken
                    );
                }

                List<XElement> dataTypesToRemove = processDefinition
                    .Descendants(s_altinnNamespace + "dataTypesToSign")
                    .Elements(s_altinnNamespace + "dataType")
                    .Where(dataType => notification.AttachmentComponentIds.Contains(dataType.Value))
                    .ToList();
                if (dataTypesToRemove.Count == 0)
                {
                    return false;
                }

                foreach (XElement dataType in dataTypesToRemove)
                {
                    // The whitespace before the element goes with it, so the file keeps no empty line.
                    if (dataType.PreviousNode is XText whitespace)
                    {
                        whitespace.Remove();
                    }
                    dataType.Remove();
                }

                await using MemoryStream outputStream = new();
                await processDefinition.SaveAsync(outputStream, SaveOptions.DisableFormatting, cancellationToken);
                outputStream.Position = 0;
                await repository.SaveProcessDefinitionFileAsync(outputStream, cancellationToken);
                return true;
            }
        );
    }
}
