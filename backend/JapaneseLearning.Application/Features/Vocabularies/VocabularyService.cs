using JapaneseLearning.Application.Common.Dtos;
using JapaneseLearning.Application.Common.Exceptions;
using JapaneseLearning.Application.Common.Interfaces;
using JapaneseLearning.Application.Common.Utils;
using JapaneseLearning.Application.Features.Vocabularies.Dtos;
using JapaneseLearning.Domain.Entities;

namespace JapaneseLearning.Application.Features.Vocabularies;

public class VocabularyService : IVocabularyService
{
    private readonly IVocabularyRepository _vocabularyRepository;
    private readonly ITopicRepository _topicRepository;

    public VocabularyService(IVocabularyRepository vocabularyRepository, ITopicRepository topicRepository)
    {
        _vocabularyRepository = vocabularyRepository;
        _topicRepository = topicRepository;
    }

    public async Task<PagedResult<VocabularyDto>> GetByTopicIdAsync(
        Guid userId, Guid topicId, string? search, int page, int pageSize,
        CancellationToken cancellationToken = default)
    {
        // IDOR check: topic phải tồn tại và thuộc đúng user đang gọi
        var topic = await _topicRepository.GetByIdAsync(topicId, cancellationToken)
            ?? throw new TopicNotFoundException(topicId);

        if (topic.UserId != userId)
        {
            throw new ForbiddenException();
        }

        var (items, totalCount) = await _vocabularyRepository.GetByTopicIdAsync(
            topicId, search, page, pageSize, cancellationToken);

        return new PagedResult<VocabularyDto>(items.Select(ToDto).ToList(), page, pageSize, totalCount);
    }

    public async Task<PagedResult<VocabularyDto>> SearchAsync(
        Guid userId, string query, int page, int pageSize,
        CancellationToken cancellationToken = default)
    {
        // Không cần IDOR check ở đây - Repository tự lọc theo userId ngay từ đầu (SearchByUserIdAsync)
        var (items, totalCount) = await _vocabularyRepository.SearchByUserIdAsync(
            userId, query, page, pageSize, cancellationToken);

        return new PagedResult<VocabularyDto>(items.Select(ToDto).ToList(), page, pageSize, totalCount);
    }

    public async Task<CheckDuplicateResponse> CheckDuplicateAsync(
        Guid userId, CheckDuplicateRequest request,
        CancellationToken cancellationToken = default)
    {
        var candidates = await _vocabularyRepository.FindByRomajiAsync(
            userId, request.Romaji, cancellationToken);

        // Quyết định 4 (2026-08-25): chỉ lấy ứng viên ĐẦU TIÊN có overlap nghĩa, dừng ngay khi tìm ra
        foreach (var candidate in candidates)
        {
            var matchedMeaning = FindMatchedMeaning(candidate.Meaning, request.Meaning);
            if (matchedMeaning is not null)
            {
                return new CheckDuplicateResponse(
                    Exists: true,
                    Existing: new ExistingVocabularyDto(
                        candidate.Id,
                        candidate.TopicId,
                        candidate.Hiragana,
                        candidate.Romaji,
                        candidate.Meaning,
                        matchedMeaning));
            }
        }

        return new CheckDuplicateResponse(Exists: false, Existing: null);
    }

    public async Task<VocabularyDto> CreateAsync(
        Guid userId, CreateVocabularyRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateRequiredFields(request.Romaji, request.Meaning);

        // Quyết định 1 (2026-08-25): IDOR check topicId trong body, giống nguyên tắc chung ở ARCHITECTURE.md 4.2
        var topic = await _topicRepository.GetByIdAsync(request.TopicId, cancellationToken)
            ?? throw new TopicNotFoundException(request.TopicId);

        if (topic.UserId != userId)
        {
            throw new ForbiddenException();
        }

        var now = DateTime.UtcNow;
        var vocabulary = new Vocabulary
        {
            Id = Guid.NewGuid(),
            TopicId = request.TopicId,
            Hiragana = request.Hiragana,
            Katakana = request.Katakana,
            Kanji = request.Kanji,
            Romaji = request.Romaji, // Quyết định 3 (2026-08-25): KHÔNG trim trước khi lưu, giữ nguyên bản gốc
            Meaning = request.Meaning,
            Note = request.Note,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await _vocabularyRepository.AddAsync(vocabulary, cancellationToken);
        await _vocabularyRepository.SaveChangesAsync(cancellationToken);

        return ToDto(vocabulary);
    }

    public async Task<VocabularyDto> UpdateAsync(
        Guid userId, Guid id, UpdateVocabularyRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateRequiredFields(request.Romaji, request.Meaning);

        var vocabulary = await _vocabularyRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new VocabularyNotFoundException(id);

        // Bước 1: IDOR check topic HIỆN TẠI (từ đang sửa có đúng của user không)
        var currentTopic = await _topicRepository.GetByIdAsync(vocabulary.TopicId, cancellationToken)
            ?? throw new TopicNotFoundException(vocabulary.TopicId);

        if (currentTopic.UserId != userId)
        {
            throw new ForbiddenException();
        }

        // Bước 2: nếu có yêu cầu đổi topicId (di chuyển từ) -> IDOR check topic ĐÍCH
        if (request.TopicId is { } newTopicId && newTopicId != vocabulary.TopicId)
        {
            var newTopic = await _topicRepository.GetByIdAsync(newTopicId, cancellationToken)
                ?? throw new TopicNotFoundException(newTopicId);

            if (newTopic.UserId != userId)
            {
                throw new ForbiddenException();
            }

            vocabulary.TopicId = newTopicId;
        }

        vocabulary.Hiragana = request.Hiragana;
        vocabulary.Katakana = request.Katakana;
        vocabulary.Kanji = request.Kanji;
        vocabulary.Romaji = request.Romaji;
        vocabulary.Meaning = request.Meaning;
        vocabulary.Note = request.Note;
        vocabulary.UpdatedAt = DateTime.UtcNow;

        _vocabularyRepository.Update(vocabulary);
        await _vocabularyRepository.SaveChangesAsync(cancellationToken);

        return ToDto(vocabulary);
    }

    public async Task DeleteAsync(Guid userId, Guid id, CancellationToken cancellationToken = default)
    {
        var vocabulary = await _vocabularyRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new VocabularyNotFoundException(id);

        var topic = await _topicRepository.GetByIdAsync(vocabulary.TopicId, cancellationToken)
            ?? throw new TopicNotFoundException(vocabulary.TopicId);

        if (topic.UserId != userId)
        {
            throw new ForbiddenException();
        }

        _vocabularyRepository.Delete(vocabulary);
        await _vocabularyRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<PracticePrepareResponse> PrepareAsync(
        Guid userId, PracticePrepareRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidatePrepareRequest(request);

        // IDOR check từng topicId: dừng ngay ở lỗi đầu tiên gặp (404 nếu không tồn tại, 403 nếu khác chủ)
        var distinctTopicIds = request.TopicIds.Distinct().ToList();
        foreach (var topicId in distinctTopicIds)
        {
            var topic = await _topicRepository.GetByIdAsync(topicId, cancellationToken)
                ?? throw new TopicNotFoundException(topicId);

            if (topic.UserId != userId)
            {
                throw new ForbiddenException();
            }
        }

        var allWords = await _vocabularyRepository.GetByTopicIdsAsync(distinctTopicIds, cancellationToken);

        // Áp sourceMode (in-memory, vì phạm vi dữ liệu nhỏ - từ vựng của vài topic 1 user)
        var considered = ApplySourceMode(allWords, request.SourceMode);
        var totalConsidered = considered.Count;

        // Chỉ giữ từ có ĐỦ CẢ questionField lẫn answerField không rỗng
        var eligible = considered
            .Where(v =>
                !string.IsNullOrWhiteSpace(GetFieldValue(v, request.QuestionField)) &&
                !string.IsNullOrWhiteSpace(GetFieldValue(v, request.AnswerField)))
            .ToList();

        return new PracticePrepareResponse(
            TotalConsidered: totalConsidered,
            TotalEligible: eligible.Count,
            Words: eligible.Select(ToDto).ToList());
    }

    // ----- Helper methods (private, không thuộc interface) -----

    /// <summary>
    /// Trả về nghĩa cụ thể bị trùng (dùng hiển thị matchedMeaning), hoặc null nếu không trùng.
    /// So sánh không phân biệt hoa/thường, đã trim (theo MeaningParser).
    /// </summary>
    private static string? FindMatchedMeaning(string existingMeaning, string newMeaning)
    {
        var existingSet = MeaningParser.Split(existingMeaning);
        var newSet = MeaningParser.Split(newMeaning).Select(m => m.ToLowerInvariant()).ToHashSet();

        return existingSet.FirstOrDefault(m => newSet.Contains(m.ToLowerInvariant()));
    }

    private static void ValidateRequiredFields(string romaji, string meaning)
    {
        var errors = new List<FieldError>();

        if (string.IsNullOrWhiteSpace(romaji))
        {
            errors.Add(new FieldError("romaji", "Romaji là bắt buộc"));
        }

        if (string.IsNullOrWhiteSpace(meaning))
        {
            errors.Add(new FieldError("meaning", "Ý nghĩa là bắt buộc"));
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }
    }

    private static VocabularyDto ToDto(Vocabulary vocabulary) => new(
        vocabulary.Id,
        vocabulary.TopicId,
        vocabulary.Hiragana,
        vocabulary.Katakana,
        vocabulary.Kanji,
        vocabulary.Romaji,
        vocabulary.Meaning,
        vocabulary.Note,
        vocabulary.CreatedAt,
        vocabulary.UpdatedAt);
    
    private static readonly HashSet<string> ValidPracticeFields =
        new(StringComparer.OrdinalIgnoreCase) { "Hiragana", "Katakana", "Kanji", "Romaji", "Meaning" };

    private static readonly HashSet<string> ValidSourceModeTypes =
        new(StringComparer.OrdinalIgnoreCase) { "All", "PercentRecent", "CountRecent" };

    private static void ValidatePrepareRequest(PracticePrepareRequest request)
    {
        var errors = new List<FieldError>();

        if (request.TopicIds is null || request.TopicIds.Count == 0)
        {
            errors.Add(new FieldError("topicIds", "Phải chọn ít nhất 1 chủ đề"));
        }

        if (!ValidPracticeFields.Contains(request.QuestionField))
        {
            errors.Add(new FieldError("questionField", "Trường câu hỏi không hợp lệ"));
        }

        if (!ValidPracticeFields.Contains(request.AnswerField))
        {
            errors.Add(new FieldError("answerField", "Trường câu trả lời không hợp lệ"));
        }

        if (ValidPracticeFields.Contains(request.QuestionField) &&
            ValidPracticeFields.Contains(request.AnswerField) &&
            string.Equals(request.QuestionField, request.AnswerField, StringComparison.OrdinalIgnoreCase))
        {
            errors.Add(new FieldError("answerField", "Trường câu trả lời phải khác trường câu hỏi"));
        }

        if (request.SourceMode is null || !ValidSourceModeTypes.Contains(request.SourceMode.Type))
        {
            errors.Add(new FieldError("sourceMode.type", "Kiểu nguồn từ vựng không hợp lệ"));
        }
        else if (string.Equals(request.SourceMode.Type, "PercentRecent", StringComparison.OrdinalIgnoreCase)
                 && request.SourceMode.Percent is null)
        {
            errors.Add(new FieldError("sourceMode.percent", "Thiếu percent cho PercentRecent"));
        }
        else if (string.Equals(request.SourceMode.Type, "CountRecent", StringComparison.OrdinalIgnoreCase)
                 && request.SourceMode.Count is null)
        {
            errors.Add(new FieldError("sourceMode.count", "Thiếu count cho CountRecent"));
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }
    }

    private static List<Vocabulary> ApplySourceMode(List<Vocabulary> words, SourceModeDto sourceMode)
    {
        var orderedDesc = words.OrderByDescending(v => v.UpdatedAt).ToList();

        if (string.Equals(sourceMode.Type, "PercentRecent", StringComparison.OrdinalIgnoreCase))
        {
            var takeCount = (int)Math.Floor(orderedDesc.Count * (sourceMode.Percent!.Value / 100.0));
            return orderedDesc.Take(takeCount).ToList();
        }

        if (string.Equals(sourceMode.Type, "CountRecent", StringComparison.OrdinalIgnoreCase))
        {
            return orderedDesc.Take(sourceMode.Count!.Value).ToList();
        }

        // "All"
        return words;
    }

    private static string? GetFieldValue(Vocabulary v, string field) => field.ToLowerInvariant() switch
    {
        "hiragana" => v.Hiragana,
        "katakana" => v.Katakana,
        "kanji" => v.Kanji,
        "romaji" => v.Romaji,
        "meaning" => v.Meaning,
        _ => null,
    };
}