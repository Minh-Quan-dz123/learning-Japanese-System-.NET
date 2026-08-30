using JapaneseLearning.Application.Common.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace JapaneseLearning.Infrastructure.BackgroundServices;

/// <summary>
/// Chạy nền, định kỳ xóa các refresh token đã hết hạn hoặc đã bị revoke.
/// Dọn dẹp ngay lúc app khởi động, sau đó lặp lại mỗi CleanupInterval.
/// </summary>
public class RefreshTokenCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RefreshTokenCleanupService> _logger;

    private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(2);

    public RefreshTokenCleanupService(
        IServiceScopeFactory scopeFactory,
        ILogger<RefreshTokenCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var repository = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();

                var deletedCount = await repository.DeleteExpiredAsync(stoppingToken);

                _logger.LogInformation(
                    "RefreshTokenCleanupService: đã xóa {Count} refresh token hết hạn/đã revoke.",
                    deletedCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RefreshTokenCleanupService: lỗi khi dọn dẹp refresh token.");
            }

            await Task.Delay(CleanupInterval, stoppingToken);
        }
    }
}