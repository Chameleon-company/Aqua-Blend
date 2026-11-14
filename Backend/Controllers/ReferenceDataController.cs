using AquaBlend.DTOs.ReferenceData;
using AquaBlend.Services;
using Microsoft.AspNetCore.Mvc;

namespace AquaBlend.Controllers;

[ApiController]
public class PlantsController : ControllerBase
{
    private readonly ReferenceDataService _referenceDataService;

    public PlantsController(ReferenceDataService referenceDataService)
    {
        _referenceDataService = referenceDataService;
    }

    [HttpGet("api/plants")]
    public async Task<ActionResult<IEnumerable<PlantRefDto>>> GetAll()
    {
        return Ok(await _referenceDataService.GetPlantsAsync());
    }
}

[ApiController]
public class DemandZonesController : ControllerBase
{
    private readonly ReferenceDataService _referenceDataService;

    public DemandZonesController(ReferenceDataService referenceDataService)
    {
        _referenceDataService = referenceDataService;
    }

    [HttpGet("api/demand-zones")]
    public async Task<ActionResult<IEnumerable<DemandZoneRefDto>>> GetAll()
    {
        return Ok(await _referenceDataService.GetDemandZonesAsync());
    }
}

[ApiController]
public class NetworkLinksController : ControllerBase
{
    private readonly ReferenceDataService _referenceDataService;

    public NetworkLinksController(ReferenceDataService referenceDataService)
    {
        _referenceDataService = referenceDataService;
    }

    [HttpGet("api/network-links")]
    public async Task<ActionResult<IEnumerable<NetworkLinkRefDto>>> GetAll()
    {
        return Ok(await _referenceDataService.GetNetworkLinksAsync());
    }
}

[ApiController]
public class QualityProfilesController : ControllerBase
{
    private readonly ReferenceDataService _referenceDataService;

    public QualityProfilesController(ReferenceDataService referenceDataService)
    {
        _referenceDataService = referenceDataService;
    }

    [HttpGet("api/quality-profiles")]
    public async Task<ActionResult<IEnumerable<QualityProfileDto>>> GetAll()
    {
        return Ok(await _referenceDataService.GetQualityProfilesAsync());
    }
}



