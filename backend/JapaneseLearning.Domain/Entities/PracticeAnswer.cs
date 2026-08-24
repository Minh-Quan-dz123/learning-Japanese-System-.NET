// File: Entities/PracticeAnswer.cs
namespace JapaneseLearning.Domain.Entities
{
    public class PracticeAnswer
    {
        public required Guid Id { get; set; }

        public required Guid SessionId { get; set; }

        public Guid? CharacterId { get; set; }

        public Guid? SelectedCharacterId { get; set; }

        public required bool IsCorrect { get; set; }

        public required int AnswerOrder { get; set; }
    }
}