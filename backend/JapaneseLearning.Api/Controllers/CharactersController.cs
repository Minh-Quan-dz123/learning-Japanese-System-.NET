using JapaneseLearning.Application.Features.Characters;
using JapaneseLearning.Application.Features.Characters.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;


namespace JapaneseLearning.Api.Controllers;

[ApiController]
[Route("api/characters")]
[Authorize] // mọi endpoint trong Controller này bắt buộc đã đăng nhập (User hoặc Admin đều được, trừ khi override riêng)
public class CharactersController : ControllerBase
{
    private readonly ICharacterService _characterService;
    private readonly ICharacterStatsService _characterStatsService; // MỚI

    public CharactersController(ICharacterService characterService, ICharacterStatsService characterStatsService)
    {
        _characterService = characterService;
        _characterStatsService = characterStatsService; // MỚI
    }

    [HttpGet]
    public async Task<IActionResult> GetByType([FromQuery] string? type, CancellationToken ct)
    {
        var characters = await _characterService.GetByTypeAsync(type, ct);
        return Ok(characters);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCharacterRequest request, CancellationToken ct)
    {
        var isAdmin = User.IsInRole("Admin");
        var character = await _characterService.CreateAsync(request, isAdmin, ct);
        return StatusCode(201, character);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCharacterRequest request, CancellationToken ct)
    {
        var isAdmin = User.IsInRole("Admin");
        var character = await _characterService.UpdateAsync(id, request, isAdmin, ct);
        return Ok(character);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var isAdmin = User.IsInRole("Admin");
        await _characterService.DeleteAsync(id, isAdmin, ct);
        return NoContent();
    }

    [HttpGet("stats/me")]
    public async Task<IActionResult> GetMyStats(CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userId = Guid.Parse(userIdClaim!); // an toàn vì [Authorize] ở class đã chặn trước

        var stats = await _characterStatsService.GetStatsForUserAsync(userId, ct);
        return Ok(stats);
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("stats/{userId:guid}")]
    public async Task<IActionResult> GetUserStats(Guid userId, CancellationToken ct)
    {
        var stats = await _characterStatsService.GetStatsForUserAsync(userId, ct);
        return Ok(stats);
    }
}