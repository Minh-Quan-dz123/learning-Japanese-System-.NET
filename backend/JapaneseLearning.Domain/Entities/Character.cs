// File: Entities/Character.cs
namespace JapaneseLearning.Domain.Entities
{
    public class Character
    {
        public required Guid Id { get; set; }

        public required string Char { get; set; }

        public required string Romaji { get; set; }

        public required CharacterType Type { get; set; }

        public required VariantGroup VariantGroup { get; set; }
    }

    public enum CharacterType
    {
        Hiragana,
        Katakana
    }

    public enum VariantGroup
    {
        Base,
        Dakuten,
        Handakuten,
        Youon,
        Sokuon
    }
}