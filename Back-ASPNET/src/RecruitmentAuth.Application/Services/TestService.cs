using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecruitmentAuth.Application.DTOs.Tests;
using RecruitmentAuth.Application.Persistence;
using RecruitmentAuth.Domain.Entities;
using RecruitmentAuth.Domain.Enums;

namespace RecruitmentAuth.Application.Services;

public class TestService : ITestService
{
    private readonly IApplicationDbContext _context;

    public TestService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Test> CreateTestAsync(string recruiterId, CreateTestDto dto)
    {
        var test = new Test
        {
            RecruiterId = recruiterId,
            Title = dto.Title,
            Description = dto.Description,
            Category = dto.Category,
            Type = dto.Type,
            DurationMinutes = dto.DurationMinutes
        };

        _context.Tests.Add(test);
        await _context.SaveChangesAsync(default);

        return test;
    }

    public async Task<(IEnumerable<Test> Tests, int Total)> ListRecruiterTestsAsync(string recruiterId, TestCategory? category, TestType? type, TestStatus? status, int page = 1, int limit = 20)
    {
        var query = _context.Tests.Where(t => t.RecruiterId == recruiterId);

        if (category.HasValue) query = query.Where(t => t.Category == category.Value);
        if (type.HasValue) query = query.Where(t => t.Type == type.Value);
        if (status.HasValue) query = query.Where(t => t.Status == status.Value);

        var total = await query.CountAsync();
        var tests = await query
            .Include(t => t.Questions)
            .Include(t => t.Submissions)
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return (tests, total);
    }

    public async Task<(IEnumerable<Test> Tests, int Total)> ListPublishedTestsAsync(TestCategory? category, TestType? type, int page = 1, int limit = 20)
    {
        var query = _context.Tests.Where(t => t.Status == TestStatus.PUBLISHED);

        if (category.HasValue) query = query.Where(t => t.Category == category.Value);
        if (type.HasValue) query = query.Where(t => t.Type == type.Value);

        var total = await query.CountAsync();
        var tests = await query
            .Include(t => t.Questions)
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return (tests, total);
    }

    public async Task<Test?> GetTestByIdAsync(string id)
    {
        return await _context.Tests
            .Include(t => t.Questions.OrderBy(q => q.OrderIndex))
            .Include(t => t.Recruiter)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<Test> UpdateTestAsync(string id, string recruiterId, UpdateTestDto dto)
    {
        var test = await _context.Tests.FirstOrDefaultAsync(t => t.Id == id);
        if (test == null) throw new KeyNotFoundException("Test not found");
        if (test.RecruiterId != recruiterId) throw new UnauthorizedAccessException("Forbidden");
        if (test.Status == TestStatus.ARCHIVED || test.Status == TestStatus.PUBLISHED) 
            throw new InvalidOperationException("Cannot update this test in its current state");

        if (dto.Title != null) test.Title = dto.Title;
        if (dto.Description != null) test.Description = dto.Description;
        if (dto.Category.HasValue) test.Category = dto.Category.Value;
        if (dto.Type.HasValue) test.Type = dto.Type.Value;
        if (dto.DurationMinutes.HasValue) test.DurationMinutes = dto.DurationMinutes.Value;

        test.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(default);

        return test;
    }

    public async Task<Test> SubmitForReviewAsync(string id, string recruiterId)
    {
        var test = await _context.Tests.Include(t => t.Questions).FirstOrDefaultAsync(t => t.Id == id);
        if (test == null) throw new KeyNotFoundException("Test not found");
        if (test.RecruiterId != recruiterId) throw new UnauthorizedAccessException("Forbidden");
        if (test.Status != TestStatus.DRAFT && test.Status != TestStatus.REJECTED) 
            throw new InvalidOperationException("Only DRAFT or REJECTED tests can be submitted for review");
        if (!test.Questions.Any()) throw new InvalidOperationException("Cannot submit a test with no questions for review");

        test.Status = TestStatus.PENDING_REVIEW;
        test.RejectionReason = null;
        test.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(default);

        return test;
    }

    public async Task<(IEnumerable<Test> Tests, int Total)> ListPendingTestsAsync(TestCategory? category, TestType? type, int page = 1, int limit = 20)
    {
        var query = _context.Tests.Where(t => t.Status == TestStatus.PENDING_REVIEW);

        if (category.HasValue) query = query.Where(t => t.Category == category.Value);
        if (type.HasValue) query = query.Where(t => t.Type == type.Value);

        var total = await query.CountAsync();
        var tests = await query
            .Include(t => t.Questions)
            .Include(t => t.Recruiter)
            .OrderBy(t => t.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return (tests, total);
    }

    public async Task<Test> ApproveTestAsync(string id)
    {
        var test = await _context.Tests.FirstOrDefaultAsync(t => t.Id == id);
        if (test == null) throw new KeyNotFoundException("Test not found");
        if (test.Status != TestStatus.PENDING_REVIEW) throw new InvalidOperationException("Test is not pending review");

        test.Status = TestStatus.PUBLISHED;
        test.RejectionReason = null;
        test.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(default);

        return test;
    }

    public async Task<Test> RejectTestAsync(string id, string reason)
    {
        var test = await _context.Tests.FirstOrDefaultAsync(t => t.Id == id);
        if (test == null) throw new KeyNotFoundException("Test not found");
        if (test.Status != TestStatus.PENDING_REVIEW) throw new InvalidOperationException("Test is not pending review");

        test.Status = TestStatus.REJECTED;
        test.RejectionReason = reason;
        test.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(default);

        return test;
    }

    public async Task ArchiveTestAsync(string id, string recruiterId)
    {
        var test = await _context.Tests.FirstOrDefaultAsync(t => t.Id == id);
        if (test == null) throw new KeyNotFoundException("Test not found");
        if (test.RecruiterId != recruiterId) throw new UnauthorizedAccessException("Forbidden");

        test.Status = TestStatus.ARCHIVED;
        test.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(default);
    }

    public async Task<Question> AddQuestionAsync(string testId, string recruiterId, CreateQuestionDto dto)
    {
        var test = await _context.Tests.FirstOrDefaultAsync(t => t.Id == testId);
        if (test == null) throw new KeyNotFoundException("Test not found");
        if (test.RecruiterId != recruiterId) throw new UnauthorizedAccessException("Forbidden");
        if (test.Status == TestStatus.ARCHIVED) throw new InvalidOperationException("Cannot add questions to an archived test");

        var question = new Question
        {
            TestId = testId,
            Content = dto.Content,
            OrderIndex = dto.OrderIndex,
            Points = dto.Points,
            ExpectedOutput = dto.ExpectedOutput,
            Options = dto.Options != null ? JsonSerializer.Serialize(dto.Options, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }) : null
        };

        _context.Questions.Add(question);
        await _context.SaveChangesAsync(default);

        return question;
    }

    public async Task<Question> UpdateQuestionAsync(string testId, string questionId, string recruiterId, UpdateQuestionDto dto)
    {
        var test = await _context.Tests.FirstOrDefaultAsync(t => t.Id == testId);
        if (test == null) throw new KeyNotFoundException("Test not found");
        if (test.RecruiterId != recruiterId) throw new UnauthorizedAccessException("Forbidden");

        var question = await _context.Questions.FirstOrDefaultAsync(q => q.Id == questionId && q.TestId == testId);
        if (question == null) throw new KeyNotFoundException("Question not found");

        if (dto.Content != null) question.Content = dto.Content;
        if (dto.OrderIndex.HasValue) question.OrderIndex = dto.OrderIndex.Value;
        if (dto.Points.HasValue) question.Points = dto.Points.Value;
        if (dto.ExpectedOutput != null) question.ExpectedOutput = dto.ExpectedOutput;
        if (dto.Options != null) question.Options = JsonSerializer.Serialize(dto.Options, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        question.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(default);

        return question;
    }

    public async Task DeleteQuestionAsync(string testId, string questionId, string recruiterId)
    {
        var test = await _context.Tests.FirstOrDefaultAsync(t => t.Id == testId);
        if (test == null) throw new KeyNotFoundException("Test not found");
        if (test.RecruiterId != recruiterId) throw new UnauthorizedAccessException("Forbidden");

        var question = await _context.Questions.FirstOrDefaultAsync(q => q.Id == questionId && q.TestId == testId);
        if (question == null) throw new KeyNotFoundException("Question not found");

        _context.Questions.Remove(question);
        await _context.SaveChangesAsync(default);
    }

    public async Task<IEnumerable<TestSubmission>> GetTestSubmissionsAsync(string testId, string recruiterId)
    {
        var test = await _context.Tests.FirstOrDefaultAsync(t => t.Id == testId);
        if (test == null) throw new KeyNotFoundException("Test not found");
        if (test.RecruiterId != recruiterId) throw new UnauthorizedAccessException("Forbidden");

        return await _context.TestSubmissions
            .Where(s => s.TestId == testId)
            .Include(s => s.Candidate)
            .Include(s => s.Answers)
                .ThenInclude(a => a.Question)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }

    public async Task<TestSubmission> StartSubmissionAsync(string testId, string candidateId)
    {
        var test = await _context.Tests.FirstOrDefaultAsync(t => t.Id == testId);
        if (test == null) throw new KeyNotFoundException("Test not found");
        if (test.Status != TestStatus.PUBLISHED) throw new InvalidOperationException("Test is not available");

        var existing = await _context.TestSubmissions
            .FirstOrDefaultAsync(s => s.TestId == testId && s.CandidateId == candidateId);

        if (existing != null)
        {
            if (existing.Status == SubmissionStatus.SUBMITTED || existing.Status == SubmissionStatus.GRADED)
                throw new InvalidOperationException("You have already completed this test");
            return existing;
        }

        var submission = new TestSubmission
        {
            TestId = testId,
            CandidateId = candidateId,
            StartedAt = DateTime.UtcNow
        };

        _context.TestSubmissions.Add(submission);
        await _context.SaveChangesAsync(default);

        return submission;
    }

    public async Task<TestSubmission> GetMySubmissionAsync(string testId, string candidateId)
    {
        var sub = await _context.TestSubmissions
            .Include(s => s.Test)
            .Include(s => s.Answers)
                .ThenInclude(a => a.Question)
            .FirstOrDefaultAsync(s => s.TestId == testId && s.CandidateId == candidateId);

        if (sub == null) throw new KeyNotFoundException("No submission found for this test");
        return sub;
    }

    public async Task<TestSubmission> SubmitAnswersAsync(string submissionId, string candidateId, SubmitAnswersDto dto)
    {
        var submission = await _context.TestSubmissions.FirstOrDefaultAsync(s => s.Id == submissionId);
        if (submission == null) throw new KeyNotFoundException("Submission not found");
        if (submission.CandidateId != candidateId) throw new UnauthorizedAccessException("Forbidden");
        if (submission.Status != SubmissionStatus.IN_PROGRESS) throw new InvalidOperationException("Submission is already finalized");

        foreach (var ans in dto.Answers)
        {
            var existingAnswer = await _context.QuestionAnswers
                .FirstOrDefaultAsync(a => a.SubmissionId == submissionId && a.QuestionId == ans.QuestionId);

            if (existingAnswer != null)
            {
                existingAnswer.AnswerText = ans.AnswerText;
                existingAnswer.SelectedOptions = ans.SelectedOptions != null ? JsonSerializer.Serialize(ans.SelectedOptions) : null;
                existingAnswer.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.QuestionAnswers.Add(new QuestionAnswer
                {
                    SubmissionId = submissionId,
                    QuestionId = ans.QuestionId,
                    AnswerText = ans.AnswerText,
                    SelectedOptions = ans.SelectedOptions != null ? JsonSerializer.Serialize(ans.SelectedOptions) : null
                });
            }
        }

        await _context.SaveChangesAsync(default);
        
        return await _context.TestSubmissions.Include(s => s.Answers).FirstAsync(s => s.Id == submissionId);
    }

    public async Task<TestSubmission> FinalizeSubmissionAsync(string submissionId, string candidateId)
    {
        var submission = await _context.TestSubmissions
            .Include(s => s.Answers)
            .Include(s => s.Test)
                .ThenInclude(t => t.Questions)
            .FirstOrDefaultAsync(s => s.Id == submissionId);

        if (submission == null) throw new KeyNotFoundException("Submission not found");
        if (submission.CandidateId != candidateId) throw new UnauthorizedAccessException("Forbidden");
        if (submission.Status != SubmissionStatus.IN_PROGRESS) throw new InvalidOperationException("Submission already finalized");

        var questions = submission.Test.Questions;
        var maxScore = questions.Sum(q => q.Points);
        decimal autoScore = 0;
        bool hasManualQuestions = false;

        foreach (var question in questions)
        {
            var answer = submission.Answers.FirstOrDefault(a => a.QuestionId == question.Id);
            if (answer == null) continue;

            if (!string.IsNullOrEmpty(question.Options))
            {
                var options = JsonSerializer.Deserialize<List<QcmOptionDto>>(question.Options, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }) ?? new List<QcmOptionDto>();
                var correctValues = options.Where(o => o.IsCorrect).Select(o => o.Value).OrderBy(v => v).ToList();
                
                var selectedValues = answer.SelectedOptions != null 
                    ? JsonSerializer.Deserialize<List<string>>(answer.SelectedOptions) ?? new List<string>() 
                    : new List<string>();
                selectedValues.Sort();

                var isCorrect = selectedValues.SequenceEqual(correctValues);
                var pointsAwarded = isCorrect ? question.Points : 0;

                autoScore += pointsAwarded;
                answer.IsCorrect = isCorrect;
                answer.PointsAwarded = pointsAwarded;
            }
            else
            {
                hasManualQuestions = true;
            }
        }

        submission.Score = hasManualQuestions ? null : autoScore;
        submission.MaxScore = maxScore;
        submission.Status = hasManualQuestions ? SubmissionStatus.SUBMITTED : SubmissionStatus.GRADED;
        submission.SubmittedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(default);

        return submission;
    }

    public async Task<TestSubmission> GradeSubmissionAsync(string submissionId, string recruiterId, GradeSubmissionDto dto)
    {
        var submission = await _context.TestSubmissions.Include(s => s.Test).FirstOrDefaultAsync(s => s.Id == submissionId);
        if (submission == null) throw new KeyNotFoundException("Submission not found");
        if (submission.Test.RecruiterId != recruiterId) throw new UnauthorizedAccessException("Forbidden");
        if (submission.Status == SubmissionStatus.IN_PROGRESS) throw new InvalidOperationException("Submission not yet finalized");

        submission.Score = dto.Score;
        submission.Status = SubmissionStatus.GRADED;
        submission.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(default);

        return submission;
    }
}
