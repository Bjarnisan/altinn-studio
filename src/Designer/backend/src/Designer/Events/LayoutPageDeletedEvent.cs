#nullable disable
using System.Collections.Generic;
using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class LayoutPageDeletedEvent : INotification
{
    public AltinnRepoEditingContext EditingContext { get; set; }
    public string LayoutSetName { get; set; }
    public string LayoutName { get; set; }

    /// <summary>
    /// The ids of the attachment components the page held. Each one is also the id of the component's data type.
    /// </summary>
    public List<string> AttachmentComponentIds { get; set; } = [];
}
