using System.Security.Claims;
using JapaneseLearning.Application.Features.Topics;
using JapaneseLearning.Application.Features.Topics.Dtos;
using JapaneseLearning.Application.Features.Vocabularies;   // <-- MỚI THÊM
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JapaneseLearning.Api.Controllers;

[ApiController]
[Route("api/topics")]
[Authorize]
public class TopicsController : ControllerBase
{
    private readonly ITopicService _topicService;
    private readonly IVocabularyService _vocabularyService;   // <-- MỚI THÊM

    public TopicsController(ITopicService topicService, IVocabularyService vocabularyService)   // <-- SỬA
    {
        _topicService = topicService;
        _vocabularyService = vocabularyService;   // <-- MỚI THÊM
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var userId = GetUserId();
        var topics = await _topicService.GetAllAsync(userId, ct);
        return Ok(topics);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTopicRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        var topic = await _topicService.CreateAsync(userId, request, ct);
        return StatusCode(201, topic);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTopicRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        var topic = await _topicService.UpdateAsync(userId, id, request, ct);
        return Ok(topic);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        await _topicService.DeleteAsync(userId, id, ct);
        return NoContent();
    }

    // <-- MỚI THÊM — toàn bộ action này
    [HttpGet("{id:guid}/vocabularies")]
    public async Task<IActionResult> GetVocabularies(
        Guid id,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = Math.Clamp(pageSize, 1, 100);

        var result = await _vocabularyService.GetByTopicIdAsync(
            userId, id, search, normalizedPage, normalizedPageSize, ct);
        return Ok(result);
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(userIdClaim!);
    }
}