using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.LayoutPageDeleted;

/// <summary>
/// Deletes the data types of the attachment components on a deleted page, as Designer does when a single attachment
/// component is deleted. A data type left behind still requires its attachments, so the app would refuse every
/// submission.
/// </summary>
internal sealed class LayoutPageDeletedApplicationMetadataHandler(
    IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
    IFileSyncHandlerExecutor fileSyncHandlerExecutor
) : INotificationHandler<LayoutPageDeletedEvent>
{
    /// <inheritdoc />
    public async Task Handle(LayoutPageDeletedEvent notification, CancellationToken cancellationToken)
    {
        if (notification.AttachmentComponentIds.Count == 0)
        {
            return;
        }

        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutPageDeletedApplicationMetadataSyncError,
            "App/config/applicationmetadata.json",
            async () =>
            {
                AltinnAppGitRepository repository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    notification.EditingContext.Org,
                    notification.EditingContext.Repo,
                    notification.EditingContext.Developer
                );
                ApplicationMetadata applicationMetadata = await repository.GetApplicationMetadata(cancellationToken);
                int deletedDataTypeCount = applicationMetadata.DataTypes.RemoveAll(dataType =>
                    notification.AttachmentComponentIds.Contains(dataType.Id)
                );
                if (deletedDataTypeCount == 0)
                {
                    return false;
                }

                await repository.SaveApplicationMetadata(applicationMetadata);
                return true;
            }
        );
    }
}
