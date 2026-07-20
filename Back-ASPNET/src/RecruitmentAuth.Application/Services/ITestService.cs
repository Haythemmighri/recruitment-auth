using RecruitmentAuth.Application.DTOs.Tests;
using RecruitmentAuth.Domain.Entities;
using RecruitmentAuth.Domain.Enums;

namespace RecruitmentAuth.Application.Services;

public interface ITestService
{
    // Test CRUD (Recruiter)
    Task<Test> CreateTestAsync(string recruiterId, CreateTestDto dto);
    Task<(IEnumerable<Test> Tests, int Total)> ListRecruiterTestsAsync(string recruiterId, TestCategory? category, TestType? type, TestStatus? status, int page = 1, int limit = 20);
    Task<Test?> GetTestByIdAsync(string id);
    Task<Test> UpdateTestAsync(string id, string recruiterId, UpdateTestDto dto);
    Task<Test> SubmitForReviewAsync(string id, string recruiterId);
    Task ArchiveTestAsync(string id, string recruiterId);

    // Admin Review
    Task<(IEnumerable<Test> Tests, int Total)> ListPendingTestsAsync(TestCategory? category, TestType? type, int page = 1, int limit = 20);
    Task<Test> ApproveTestAsync(string id);
    Task<Test> RejectTestAsync(string id, string reason);
    Task<(IEnumerable<TestSubscription> Subscriptions, int Total)> ListPendingSubscriptionsAsync(int page = 1, int limit = 20);
    Task<TestSubscription> ApproveSubscriptionAsync(string subscriptionId);
    Task<TestSubscription> RejectSubscriptionAsync(string subscriptionId);


    // Questions (Recruiter)
    Task<Question> AddQuestionAsync(string testId, string recruiterId, CreateQuestionDto dto);
    Task<Question> UpdateQuestionAsync(string testId, string questionId, string recruiterId, UpdateQuestionDto dto);
    Task DeleteQuestionAsync(string testId, string questionId, string recruiterId);

    // Submissions Listing (Recruiter)
    Task<IEnumerable<TestSubmission>> GetTestSubmissionsAsync(string testId, string recruiterId);
    
    // Candidate Operations
    Task<(IEnumerable<Test> Tests, int Total)> ListPublishedTestsAsync(TestCategory? category, TestType? type, int page = 1, int limit = 20);
    Task<TestSubscription> SubscribeToTestAsync(string testId, string candidateId);
    Task<IEnumerable<TestSubscription>> GetMySubscriptionsAsync(string candidateId);
    Task<TestSubmission> StartSubmissionAsync(string testId, string candidateId);
    Task<TestSubmission> GetMySubmissionAsync(string testId, string candidateId);
    Task<TestSubmission> SubmitAnswersAsync(string submissionId, string candidateId, SubmitAnswersDto dto);
    Task<TestSubmission> FinalizeSubmissionAsync(string submissionId, string candidateId);
    
    // Manual Grading (Recruiter)
    Task<TestSubmission> GradeSubmissionAsync(string submissionId, string recruiterId, GradeSubmissionDto dto);
}
