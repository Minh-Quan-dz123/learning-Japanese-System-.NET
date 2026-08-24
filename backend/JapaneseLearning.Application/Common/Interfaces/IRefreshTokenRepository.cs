using JapaneseLearning.Domain.Entities;

namespace JapaneseLearning.Application.Common.Interfaces;

public interface IRefreshTokenRepository
{
    Task AddAsync(RefreshToken token, CancellationToken ct = default);
    Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default);
    Task RevokeAsync(RefreshToken token, CancellationToken ct = default);
}