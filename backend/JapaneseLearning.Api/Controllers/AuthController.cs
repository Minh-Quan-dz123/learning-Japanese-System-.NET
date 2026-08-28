using System.Security.Claims;
using JapaneseLearning.Application.Common.Exceptions;
using JapaneseLearning.Application.Features.Auth;
using JapaneseLearning.Application.Features.Auth.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JapaneseLearning.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private const string RefreshCookieName = "refreshToken";
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService) => _authService = authService;

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var result = await _authService.RegisterAsync(request, ct);
        SetRefreshTokenCookie(result.RefreshTokenPlain);
        return StatusCode(201, new AuthResponse { AccessToken = result.AccessToken, User = result.User });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await _authService.LoginAsync(request, ct);
        SetRefreshTokenCookie(result.RefreshTokenPlain);
        return Ok(new AuthResponse { AccessToken = result.AccessToken, User = result.User });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        if (!Request.Cookies.TryGetValue(RefreshCookieName, out var refreshTokenPlain) || string.IsNullOrEmpty(refreshTokenPlain))
            throw new InvalidRefreshTokenException();

        var (accessToken, newRefreshTokenPlain) = await _authService.RefreshAsync(refreshTokenPlain, ct);
        SetRefreshTokenCookie(newRefreshTokenPlain);
        return Ok(new { accessToken });
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        if (Request.Cookies.TryGetValue(RefreshCookieName, out var refreshTokenPlain) && !string.IsNullOrEmpty(refreshTokenPlain))
            await _authService.LogoutAsync(refreshTokenPlain, ct);

        Response.Cookies.Delete(RefreshCookieName, new CookieOptions
        {
            Path = "/api/auth",
            Secure = true,
            SameSite = SameSiteMode.None // MỚI: phải khớp với lúc Set, không thì trình duyệt không nhận diện đúng cookie để xóa
        });
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(); // phòng thủ — lý thuyết không xảy ra nếu token hợp lệ

        var user = await _authService.GetMeAsync(userId, ct);
        return Ok(user);
    }

    private void SetRefreshTokenCookie(string refreshTokenPlain)
    {
        Response.Cookies.Append(RefreshCookieName, refreshTokenPlain, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Path = "/api/auth",
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });
    }
}