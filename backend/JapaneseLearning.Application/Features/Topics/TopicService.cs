using JapaneseLearning.Application.Common.Exceptions;
using JapaneseLearning.Application.Common.Interfaces;
using JapaneseLearning.Application.Features.Topics.Dtos;
using JapaneseLearning.Domain.Entities;

namespace JapaneseLearning.Application.Features.Topics;

public class TopicService : ITopicService
{
    private readonly ITopicRepository _repository;

    public TopicService(ITopicRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<TopicDto>> GetAllAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var topics = await _repository.GetAllByUserIdAsync(userId, cancellationToken);

        if (topics.Count == 0)
        {
            return new List<TopicDto>();
        }

        var stats = await _repository.GetStatsByTopicIdsAsync(
            topics.Select(t => t.Id), cancellationToken);

        return topics.Select(t => ToDto(t, stats)).ToList();
    }

    public async Task<TopicDto> CreateAsync(
        Guid userId, CreateTopicRequest request, CancellationToken cancellationToken = default)
    {
        var name = ValidateAndTrimName(request.Name);

        if (await _repository.ExistsByNameAsync(userId, name, excludeTopicId: null, cancellationToken))
        {
            throw new TopicNameDuplicateException(name);
        }

        var topic = new Topic
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(topic, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return new TopicDto(topic.Id, topic.Name, WordCount: 0, LastModifiedAt: null, topic.CreatedAt);
    }

    public async Task<TopicDto> UpdateAsync(
        Guid userId, Guid id, UpdateTopicRequest request, CancellationToken cancellationToken = default)
    {
        var topic = await _repository.GetByIdAsync(id, cancellationToken)
            ?? throw new TopicNotFoundException(id);

        if (topic.UserId != userId)
        {
            throw new ForbiddenException();
        }

        var name = ValidateAndTrimName(request.Name);

        if (await _repository.ExistsByNameAsync(userId, name, excludeTopicId: id, cancellationToken))
        {
            throw new TopicNameDuplicateException(name);
        }

        topic.Name = name;
        topic.UpdatedAt = DateTime.UtcNow;

        _repository.Update(topic);
        await _repository.SaveChangesAsync(cancellationToken);

        var stats = await _repository.GetStatsByTopicIdsAsync(new[] { topic.Id }, cancellationToken);
        return ToDto(topic, stats);
    }

    public async Task DeleteAsync(Guid userId, Guid id, CancellationToken cancellationToken = default)
    {
        var topic = await _repository.GetByIdAsync(id, cancellationToken)
            ?? throw new TopicNotFoundException(id);

        if (topic.UserId != userId)
        {
            throw new ForbiddenException();
        }

        _repository.Delete(topic);
        await _repository.SaveChangesAsync(cancellationToken);
    }

    private static string ValidateAndTrimName(string nameRaw)
    {
        var name = nameRaw?.Trim() ?? string.Empty;

        if (string.IsNullOrEmpty(name))
        {
            throw new ValidationFailedException(new[]
            {
                new FieldError("name", "Tên chủ đề không được để trống")
            });
        }

        return name;
    }

    private static TopicDto ToDto(Topic topic, IReadOnlyDictionary<Guid, TopicStats> stats)
    {
        var (wordCount, lastModifiedAt) = stats.TryGetValue(topic.Id, out var s)
            ? (s.WordCount, s.LastModifiedAt)
            : (0, (DateTime?)null);

        return new TopicDto(topic.Id, topic.Name, wordCount, lastModifiedAt, topic.CreatedAt);
    }
}