namespace JapaneseLearning.Application.Common.Interfaces;

public interface ITokenHasher
{
    string Hash(string plainToken);
}