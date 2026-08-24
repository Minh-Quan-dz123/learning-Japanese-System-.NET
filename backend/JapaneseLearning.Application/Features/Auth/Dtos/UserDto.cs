namespace JapaneseLearning.Application.Features.Auth.Dtos;

public class UserDto
{
    public required Guid Id { get; set; }
    public required string Username { get; set; }
    public required string Role { get; set; } // "Admin" | "User" — trả string cho FE dễ đọc
}