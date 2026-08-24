// File: Entities/Topic.cs
namespace JapaneseLearning.Domain.Entities
{
    public class Topic
    {
        public required Guid Id { get; set; }

        public required Guid UserId { get; set; }

        public required string Name { get; set; }

        public required DateTime CreatedAt { get; set; }

        public required DateTime UpdatedAt { get; set; }
    }
}