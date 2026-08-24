using JapaneseLearning.Application.Common.Dtos;
using JapaneseLearning.Application.Common.Exceptions;
using JapaneseLearning.Application.Common.Interfaces;
using JapaneseLearning.Application.Features.PracticeSessions.Dtos;
using JapaneseLearning.Domain.Entities;

namespace JapaneseLearning.Application.Features.PracticeSessions;

public class PracticeSessionService : IPracticeSessionService
{
    private readonly IPracticeSessionRepository _sessionRepository;
    private readonly ICharacterRepository _characterRepository; // dùng để tra Char/Romaji khi review chi tiết

    public PracticeSessionService(
        IPracticeSessionRepository sessionRepository,
        ICharacterRepository characterRepository)
    {
        _sessionRepository = sessionRepository;
        _characterRepository = characterRepository;
    }

    public async Task<PracticeSessionResultDto> SubmitAsync(
        Guid userId, SubmitPracticeSessionRequest request, CancellationToken cancellationToken = default)
    {
        var sessionId = Guid.NewGuid();
        var answers = new List<PracticeAnswer>();
        var results = new List<AnswerResultDto>();
        int score = 0;

        // Backend TỰ chấm điểm, không tin isCorrect từ FE (ARCHITECTURE.md mục 4.3)
        for (int i = 0; i < request.Answers.Count; i++)
        {
            var a = request.Answers[i];

            // selectedCharacterId == null (timeout) → luôn tính sai (DECISIONS_LOG.md 2026-08-22)
            bool isCorrect = a.SelectedCharacterId.HasValue && a.SelectedCharacterId.Value == a.CharacterId;
            if (isCorrect) score++;

            answers.Add(new PracticeAnswer
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                CharacterId = a.CharacterId,
                SelectedCharacterId = a.SelectedCharacterId,
                IsCorrect = isCorrect,
                AnswerOrder = i
            });

            results.Add(new AnswerResultDto(a.CharacterId, a.SelectedCharacterId, isCorrect));
        }

        var session = new PracticeSession
        {
            Id = sessionId,
            UserId = userId, // lấy từ JWT (Controller truyền xuống), không tin userId từ body
            ModuleType = request.ModuleType,
            Direction = request.Direction,
            TimePerQuestionSec = request.TimePerQuestionSec,
            MaxMistakes = request.MaxMistakes,
            Score = score,
            TotalQuestions = request.Answers.Count,
            CreatedAt = DateTime.UtcNow
        };

        // Unit of Work: 2 lệnh Add chỉ đánh dấu, SaveChanges 1 lần mới ghi thật xuống DB
        // → cả session lẫn N answers nằm chung 1 transaction, atomic
        await _sessionRepository.AddSessionAsync(session, cancellationToken);
        await _sessionRepository.AddAnswersAsync(answers, cancellationToken);
        await _sessionRepository.SaveChangesAsync(cancellationToken);

        return new PracticeSessionResultDto(session.Id, session.Score, session.TotalQuestions, session.CreatedAt, results);
    }

    public async Task<PagedResult<PracticeSessionSummaryDto>> GetMyHistoryAsync(
        Guid userId, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await _sessionRepository.GetByUserIdAsync(userId, page, pageSize, cancellationToken);

        var summaries = items.Select(s => new PracticeSessionSummaryDto(
            s.Id, s.ModuleType, s.Direction, s.Score, s.TotalQuestions, s.CreatedAt
        )).ToList();

        return new PagedResult<PracticeSessionSummaryDto>(summaries, page, pageSize, totalCount);
    }

    public async Task<PracticeSessionDetailDto> GetDetailAsync(
        Guid userId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await _sessionRepository.GetSessionByIdAsync(sessionId, cancellationToken);
        if (session is null)
            throw new PracticeSessionNotFoundException(sessionId);

        // IDOR check (ARCHITECTURE.md mục 4.2) — session này có đúng của user đang gọi không
        if (session.UserId != userId)
            throw new ForbiddenException();

        var answers = await _sessionRepository.GetAnswersBySessionIdAsync(sessionId, cancellationToken);

        // Gom toàn bộ CharacterId + SelectedCharacterId (bỏ null, bỏ trùng) → tra DB đúng 1 lần
        var characterIds = answers
            .SelectMany(a => new[] { a.CharacterId, a.SelectedCharacterId })
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        var characters = await _characterRepository.GetByIdsAsync(characterIds, cancellationToken);
        var characterMap = characters.ToDictionary(c => c.Id);

        // id null (câu hỏi vốn không gắn chữ) HOẶC không có trong map (đã bị Admin xóa) → đều trả về null
        // FE hiển thị "(admin đã xóa chữ này)" là hợp lý cho cả 2 trường hợp vì hình dạng dữ liệu giống nhau
        CharacterMiniDto? ToMini(Guid? id) =>
            id.HasValue && characterMap.TryGetValue(id.Value, out var c)
                ? new CharacterMiniDto(c.Id, c.Char, c.Romaji)
                : null;

        var answerDtos = answers
            .OrderBy(a => a.AnswerOrder)
            .Select(a => new PracticeAnswerDetailDto(
                a.AnswerOrder,
                ToMini(a.CharacterId),
                ToMini(a.SelectedCharacterId),
                a.IsCorrect
            )).ToList();

        return new PracticeSessionDetailDto(
            session.Id, session.ModuleType, session.Direction,
            session.TimePerQuestionSec, session.MaxMistakes,
            session.Score, session.TotalQuestions, session.CreatedAt,
            answerDtos
        );
    }
}