namespace JapaneseLearning.Application.Common.Exceptions;

public class CharacterNotFoundException : AppException
{
    public CharacterNotFoundException(Guid id)
        : base("NOT_FOUND", $"Không tìm thấy chữ cái với id {id}", 404)
    {
    }
}