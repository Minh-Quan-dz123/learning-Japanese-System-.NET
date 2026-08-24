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

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// MỚI: cho phép dùng [ApiController]/Controller — thiếu dòng này thì AuthController vô hình, gọi API ra 404
builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// MỚI: đăng ký AuthService (Application) + Bcrypt/JWT/Repository (Infrastructure)
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// MỚI: đọc section "Jwt" trong appsettings.json (xem phần E bên dưới) đổ vào JwtSettings
var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
    ?? throw new InvalidOperationException("Thiếu cấu hình Jwt trong appsettings.json");

// MỚI: khai báo cách ASP.NET xác thực JWT gửi lên qua header Authorization: Bearer <token>
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

// MỚI: cho phép Frontend (Next.js, khác port) gọi API kèm cookie
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy => policy
        .WithOrigins("http://localhost:3000") // đổi domain FE thật khi lên production
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()); // BẮT BUỘC để cookie refreshToken được gửi kèm request cross-origin
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