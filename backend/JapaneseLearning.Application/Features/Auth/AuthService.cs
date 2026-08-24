using System.Security.Cryptography;
using JapaneseLearning.Application.Common.Exceptions;
using JapaneseLearning.Application.Common.Interfaces;
using JapaneseLearning.Application.Features.Auth.Dtos;
using JapaneseLearning.Domain.Entities;

namespace JapaneseLearning.Application.Features.Auth;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenHasher _tokenHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    private const int RefreshTokenExpiryDays = 7; // đã chốt 2026-08-23

    public AuthService(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IPasswordHasher passwordHasher,
        ITokenHasher tokenHasher,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _passwordHasher = passwordHasher;
        _tokenHasher = tokenHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        if (await _userRepository.ExistsByUsernameAsync(request.Username, ct))
            throw new UsernameAlreadyExistsException(request.Username);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = UserRole.User, // đăng ký public luôn ra role User; tạo Admin là thao tác riêng, không qua endpoint này
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user, ct);
        var (accessToken, refreshTokenPlain) = await IssueTokensAsync(user, ct);

        return new AuthResult { AccessToken = accessToken, RefreshTokenPlain = refreshTokenPlain, User = MapToDto(user) };
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByUsernameAsync(request.Username, ct);

        // Dùng CHUNG 1 message cho cả "sai username" và "sai password"
        // — tránh lộ thông tin username nào tồn tại (username enumeration attack).
        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new InvalidCredentialsException();

        var (accessToken, refreshTokenPlain) = await IssueTokensAsync(user, ct);
        return new AuthResult { AccessToken = accessToken, RefreshTokenPlain = refreshTokenPlain, User = MapToDto(user) };
    }

    public async Task<(string AccessToken, string RefreshTokenPlain)> RefreshAsync(string refreshTokenPlain, CancellationToken ct = default)
    {
        var tokenHash = _tokenHasher.Hash(refreshTokenPlain);
        var existing = await _refreshTokenRepository.GetByTokenHashAsync(tokenHash, ct);

        if (existing is null || existing.RevokedAt is not null || existing.ExpiresAt < DateTime.UtcNow)
            throw new InvalidRefreshTokenException();

        var user = await _userRepository.GetByIdAsync(existing.UserId, ct);
        if (user is null)
            throw new InvalidRefreshTokenException(); // edge case: user bị xóa nhưng token cũ còn sống

        // Rotation (đã chốt 2026-08-23): thu hồi token cũ TRƯỚC khi cấp token mới,
        // 1 refresh token chỉ dùng được đúng 1 lần.
        await _refreshTokenRepository.RevokeAsync(existing, ct);

        return await IssueTokensAsync(user, ct);
    }

    public async Task LogoutAsync(string refreshTokenPlain, CancellationToken ct = default)
    {
        var tokenHash = _tokenHasher.Hash(refreshTokenPlain);
        var existing = await _refreshTokenRepository.GetByTokenHashAsync(tokenHash, ct);

        // Logout nên "idempotent" — gọi nhiều lần hoặc với token đã hết hạn không nên báo lỗi.
        if (existing is not null && existing.RevokedAt is null)
            await _refreshTokenRepository.RevokeAsync(existing, ct);
    }

    public async Task<UserDto> GetMeAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct)
            ?? throw new AppException("USER_NOT_FOUND", "Không tìm thấy user", 404);

        return MapToDto(user);
    }

    private async Task<(string AccessToken, string RefreshTokenPlain)> IssueTokensAsync(User user, CancellationToken ct)
    {
        var accessToken = _jwtTokenGenerator.GenerateAccessToken(user);

        // 64 byte ngẫu nhiên bằng RandomNumberGenerator (crypto-secure, KHÁC class Random thường
        // — Random thường đoán được nếu biết seed, không an toàn để làm token).
        var refreshTokenPlain = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = _tokenHasher.Hash(refreshTokenPlain),
            ExpiresAt = DateTime.UtcNow.AddDays(RefreshTokenExpiryDays),
            RevokedAt = null
        };

        await _refreshTokenRepository.AddAsync(refreshToken, ct);
        return (accessToken, refreshTokenPlain);
    }

    private static UserDto MapToDto(User user) => new()
    {
        Id = user.Id,
        Username = user.Username,
        Role = user.Role.ToString()
    };
}