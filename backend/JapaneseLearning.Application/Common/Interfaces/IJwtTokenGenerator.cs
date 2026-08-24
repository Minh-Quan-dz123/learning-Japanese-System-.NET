using JapaneseLearning.Domain.Entities;

namespace JapaneseLearning.Application.Common.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateAccessToken(User user);
}