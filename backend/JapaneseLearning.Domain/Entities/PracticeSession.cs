// File: Entities/PracticeSession.cs
namespace JapaneseLearning.Domain.Entities
{
    public class PracticeSession
    {
        public required Guid Id { get; set; }

        public required Guid UserId { get; set; }

        public required string ModuleType { get; set; }

        public required string Direction { get; set; }

        public required int TimePerQuestionSec { get; set; }

        public required int MaxMistakes { get; set; }

        public required int Score { get; set; }

        public required int TotalQuestions { get; set; }

        public required DateTime CreatedAt { get; set; }
    }
}