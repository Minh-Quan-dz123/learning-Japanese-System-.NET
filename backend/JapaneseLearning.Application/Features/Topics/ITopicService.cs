using JapaneseLearning.Application.Features.Topics.Dtos;  
namespace JapaneseLearning.Application.Features.Topics;

public interface ITopicService
{
    Task<List<TopicDto>> GetAllAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<TopicDto> CreateAsync(Guid userId, CreateTopicRequest request, CancellationToken cancellationToken = default);

    Task<TopicDto> UpdateAsync(Guid userId, Guid id, UpdateTopicRequest request, CancellationToken cancellationToken = default);

    Task DeleteAsync(Guid userId, Guid id, CancellationToken cancellationToken = default);
}