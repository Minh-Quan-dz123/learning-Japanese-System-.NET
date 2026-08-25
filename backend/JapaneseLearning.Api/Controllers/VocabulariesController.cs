using System.Security.Claims;
using JapaneseLearning.Application.Features.Vocabularies;
using JapaneseLearning.Application.Features.Vocabularies.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JapaneseLearning.Api.Controllers;

[ApiController]
[Route("api/vocabularies")]
[Authorize] // Vocabularies là resource riêng của từng user, giống Topics — không phân Admin/User
public class VocabulariesController : ControllerBase
{
    private readonly IVocabularyService _vocabularyService;

    public VocabulariesController(IVocabularyService vocabularyService) =>
        _vocabularyService = vocabularyService;

    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        (page, pageSize) = NormalizePaging(page, pageSize);

        var result = await _vocabularyService.SearchAsync(userId, q, page, pageSize, ct);
        return Ok(result);
    }

    [HttpPost("practice/prepare")]
    public async Task<IActionResult> PreparePractice(
        [FromBody] PracticePrepareRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        var result = await _vocabularyService.PrepareAsync(userId, request, ct);
        return Ok(result);
    }

    [HttpPost("check-duplicate")]
    public async Task<IActionResult> CheckDuplicate(
        [FromBody] CheckDuplicateRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        var result = await _vocabularyService.CheckDuplicateAsync(userId, request, ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateVocabularyRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        var vocabulary = await _vocabularyService.CreateAsync(userId, request, ct);
        return StatusCode(201, vocabulary);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id, [FromBody] UpdateVocabularyRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        var vocabulary = await _vocabularyService.UpdateAsync(userId, id, request, ct);
        return Ok(vocabulary);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        await _vocabularyService.DeleteAsync(userId, id, ct);
        return NoContent();
    }

    // Giống hệt cách TopicsController.GetUserId() đã làm.
    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(userIdClaim!);
    }

    // page < 1 -> ép về 1; pageSize ngoài [1, 100] -> ép về khoảng hợp lệ.
    private static (int Page, int PageSize) NormalizePaging(int page, int pageSize)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = Math.Clamp(pageSize, 1, 100);
        return (normalizedPage, normalizedPageSize);
    }




    
}