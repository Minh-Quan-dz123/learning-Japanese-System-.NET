// File: Entities/Vocabulary.cs
namespace JapaneseLearning.Domain.Entities
{
    public class Vocabulary
    {
        public required Guid Id { get; set; }

        public required Guid TopicId { get; set; }

        public string? Hiragana { get; set; }

        public string? Katakana { get; set; }

        public string? Kanji { get; set; }

        public required string Romaji { get; set; }

        public required string Meaning { get; set; }

        public string? Note { get; set; }

        public required DateTime CreatedAt { get; set; }

        public required DateTime UpdatedAt { get; set; }
    }
}