using JapaneseLearning.Application.Features.Auth.Dtos;

namespace JapaneseLearning.Application.Features.Auth;

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<(string AccessToken, string RefreshTokenPlain)> RefreshAsync(string refreshTokenPlain, CancellationToken ct = default);
    Task LogoutAsync(string refreshTokenPlain, CancellationToken ct = default);
    Task<UserDto> GetMeAsync(Guid userId, CancellationToken ct = default);
}