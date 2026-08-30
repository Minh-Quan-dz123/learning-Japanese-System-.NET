using System.Text;
using JapaneseLearning.Api.Middleware;
using JapaneseLearning.Application;
using JapaneseLearning.Infrastructure;
using JapaneseLearning.Infrastructure.Data;
using JapaneseLearning.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.HttpOverrides;
using JapaneseLearning.Infrastructure.BackgroundServices;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// MỚI: cho phép dùng [ApiController]/Controller — thiếu dòng này thì AuthController vô hình, gọi API ra 404
builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// MỚI: chạy nền, tự dọn dẹp refresh_tokens hết hạn/đã revoke quá lâu (xem DECISIONS_LOG.md 2026-08-30)
builder.Services.AddHostedService<RefreshTokenCleanupService>();

var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
    ?? throw new InvalidOperationException("Thiếu cấu hình Jwt trong appsettings.json");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
            ClockSkew = TimeSpan.Zero // mặc định ASP.NET cho lệch 5 phút, đặt 0 để hết hạn là hết hạn ngay
        };
    });

builder.Services.AddAuthorization();

var allowedOrigin = builder.Configuration["Cors:AllowedOrigin"]
    ?? "http://localhost:3000"; // fallback khi chạy local, khỏi cần config gì thêm

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy => policy
        .WithOrigins(allowedOrigin)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

// Mới nữa
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập token dạng: Bearer {token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
};
// MỚI: xóa whitelist mặc định — cần thiết vì Render không có IP proxy cố định để khai báo trước.
// An toàn vì container không thể bị gọi trực tiếp từ internet, chỉ proxy Render gọi vào được.
forwardedHeadersOptions.KnownNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();

app.UseForwardedHeaders(forwardedHeadersOptions);

// MỚI: tự động áp dụng migration còn thiếu lúc khởi động (production dùng Supabase không chạy tay dotnet ef được)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// MỚI: đặt sớm để bắt được lỗi từ mọi middleware/controller phía sau nó
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseCors("AllowFrontend");

// MỚI: PHẢI đứng trước UseAuthorization — xác minh "mày là ai" trước khi xét "mày có quyền không"
app.UseAuthentication();
app.UseAuthorization();

// MỚI: map route trong AuthController vào pipeline
app.MapControllers();

app.Run();