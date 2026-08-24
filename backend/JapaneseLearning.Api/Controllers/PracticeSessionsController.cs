using System.Security.Claims;
using JapaneseLearning.Application.Features.PracticeSessions;
using JapaneseLearning.Application.Features.PracticeSessions.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JapaneseLearning.Api.Controllers;

[ApiController]
[Route("api/practice-sessions")]
[Authorize] // mọi endpoint yêu cầu đăng nhập — User/Admin đều dùng được (theo api_design.md mục 2)
public class PracticeSessionsController : ControllerBase
{
    private readonly IPracticeSessionService _practiceSessionService;

    public PracticeSessionsController(IPracticeSessionService practiceSessionService) =>
        _practiceSessionService = practiceSessionService;

    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitPracticeSessionRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        var result = await _practiceSessionService.SubmitAsync(userId, request, ct);
        return StatusCode(201, result);
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyHistory(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var userId = GetUserId();

        // Chốt "Pagination" (DECISIONS_LOG.md 2026-08-22): mặc định 20, tối đa 100
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var result = await _practiceSessionService.GetMyHistoryAsync(userId, page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDetail(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        var detail = await _practiceSessionService.GetDetailAsync(userId, id, ct);
        return Ok(detail);
    }

    // Dùng chung cho cả 3 action — tránh lặp code lấy userId từ JWT claim 3 lần
    // (giống AuthController.Me() đã làm, nhưng ném lỗi thay vì Unauthorized() thủ công
    // vì [Authorize] đã đảm bảo claim luôn hợp lệ khi tới được đây)
    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(userIdClaim!); // an toàn vì [Authorize] đã chặn request thiếu/sai token trước đó
    }
}