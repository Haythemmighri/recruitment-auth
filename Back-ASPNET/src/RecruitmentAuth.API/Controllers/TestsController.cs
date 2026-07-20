using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecruitmentAuth.Application.DTOs.Tests;
using RecruitmentAuth.Application.Services;
using RecruitmentAuth.Domain.Enums;
using System.Security.Claims;
using System.Text.Json;

namespace RecruitmentAuth.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestsController : ControllerBase
{
    private readonly ITestService _testService;

    public TestsController(ITestService testService)
    {
        _testService = testService;
    }

    private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private string GetUserRole() => User.FindFirstValue(ClaimTypes.Role)!;

    // ─── Recruiter Endpoints ──────────────────────────────────────────────────

    [Authorize(Roles = "RECRUITER")]
    [HttpPost]
    public async Task<IActionResult> CreateTest([FromBody] CreateTestDto dto)
    {
        var test = await _testService.CreateTestAsync(GetUserId(), dto);
        return CreatedAtAction(nameof(GetTest), new { id = test.Id }, new { message = "Test created successfully", data = test });
    }

    [Authorize(Roles = "RECRUITER")]
    [HttpGet("my")]
    public async Task<IActionResult> ListMyTests([FromQuery] TestCategory? category, [FromQuery] TestType? type, [FromQuery] TestStatus? status, [FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var (tests, total) = await _testService.ListRecruiterTestsAsync(GetUserId(), category, type, status, page, limit);
        return Ok(new
        {
            message = "Tests retrieved",
            data = tests,
            meta = new { total, page, limit, totalPages = (int)Math.Ceiling(total / (double)limit) }
        });
    }

    [Authorize(Roles = "RECRUITER")]
    [HttpPatch("{id}")]
    public async Task<IActionResult> UpdateTest(string id, [FromBody] UpdateTestDto dto)
    {
        try
        {
            var test = await _testService.UpdateTestAsync(id, GetUserId(), dto);
            return Ok(new { message = "Test updated", data = test });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = "RECRUITER")]
    [HttpPost("{id}/submit-for-review")]
    public async Task<IActionResult> SubmitForReview(string id)
    {
        try
        {
            var test = await _testService.SubmitForReviewAsync(id, GetUserId());
            return Ok(new { message = "Test submitted for admin review", data = test });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = "RECRUITER")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> ArchiveTest(string id)
    {
        try
        {
            await _testService.ArchiveTestAsync(id, GetUserId());
            return NoContent();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [Authorize(Roles = "RECRUITER")]
    [HttpPost("{testId}/questions")]
    public async Task<IActionResult> AddQuestion(string testId, [FromBody] CreateQuestionDto dto)
    {
        try
        {
            var question = await _testService.AddQuestionAsync(testId, GetUserId(), dto);
            return Created("", new { message = "Question added", data = question });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = "RECRUITER")]
    [HttpPatch("{testId}/questions/{questionId}")]
    public async Task<IActionResult> UpdateQuestion(string testId, string questionId, [FromBody] UpdateQuestionDto dto)
    {
        try
        {
            var question = await _testService.UpdateQuestionAsync(testId, questionId, GetUserId(), dto);
            return Ok(new { message = "Question updated", data = question });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [Authorize(Roles = "RECRUITER")]
    [HttpDelete("{testId}/questions/{questionId}")]
    public async Task<IActionResult> DeleteQuestion(string testId, string questionId)
    {
        try
        {
            await _testService.DeleteQuestionAsync(testId, questionId, GetUserId());
            return Ok(new { message = "Question deleted" });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [Authorize(Roles = "RECRUITER")]
    [HttpGet("{testId}/submissions")]
    public async Task<IActionResult> GetSubmissions(string testId)
    {
        try
        {
            var submissions = await _testService.GetTestSubmissionsAsync(testId, GetUserId());
            return Ok(new { message = "Submissions retrieved", data = submissions });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // ─── Candidate Endpoints ──────────────────────────────────────────────────

    [Authorize(Roles = "CANDIDATE")]
    [HttpGet]
    public async Task<IActionResult> ListPublishedTests([FromQuery] TestCategory? category, [FromQuery] TestType? type, [FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var (tests, total) = await _testService.ListPublishedTestsAsync(category, type, page, limit);
        return Ok(new
        {
            message = "Tests retrieved",
            data = tests,
            meta = new { total, page, limit, totalPages = (int)Math.Ceiling(total / (double)limit) }
        });
    }

    [Authorize(Roles = "CANDIDATE")]
    [HttpPost("{testId}/subscribe")]
    public async Task<IActionResult> SubscribeToTest(string testId)
    {
        try
        {
            var subscription = await _testService.SubscribeToTestAsync(testId, GetUserId());
            return Ok(new { message = "Subscription request sent", data = subscription });
        }
        catch (KeyNotFoundException) { return NotFound(new { message = "Test not found" }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = "CANDIDATE")]
    [HttpGet("subscriptions/my")]
    public async Task<IActionResult> GetMySubscriptions()
    {
        var subscriptions = await _testService.GetMySubscriptionsAsync(GetUserId());
        return Ok(new { message = "Subscriptions retrieved", data = subscriptions });
    }

    // ─── Admin Endpoints ──────────────────────────────────────────────────────

    [Authorize(Roles = "ADMIN")]
    [HttpGet("pending")]
    public async Task<IActionResult> ListPendingTests([FromQuery] TestCategory? category, [FromQuery] TestType? type, [FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var (tests, total) = await _testService.ListPendingTestsAsync(category, type, page, limit);
        return Ok(new
        {
            message = "Pending tests retrieved",
            data = tests,
            meta = new { total, page, limit, totalPages = (int)Math.Ceiling(total / (double)limit) }
        });
    }

    [Authorize(Roles = "ADMIN")]
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApproveTest(string id)
    {
        try
        {
            var test = await _testService.ApproveTestAsync(id);
            return Ok(new { message = "Test approved and published", data = test });
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = "ADMIN")]
    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectTest(string id, [FromBody] RejectTestDto dto)
    {
        try
        {
            var test = await _testService.RejectTestAsync(id, dto.Reason);
            return Ok(new { message = "Test rejected", data = test });
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = "ADMIN")]
    [HttpGet("subscriptions/pending")]
    public async Task<IActionResult> ListPendingSubscriptions([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var (subscriptions, total) = await _testService.ListPendingSubscriptionsAsync(page, limit);
        return Ok(new
        {
            message = "Pending subscriptions retrieved",
            data = subscriptions,
            meta = new { total, page, limit, totalPages = (int)Math.Ceiling(total / (double)limit) }
        });
    }

    [Authorize(Roles = "ADMIN")]
    [HttpPost("subscriptions/{id}/approve")]
    public async Task<IActionResult> ApproveSubscription(string id)
    {
        try
        {
            var subscription = await _testService.ApproveSubscriptionAsync(id);
            return Ok(new { message = "Subscription approved", data = subscription });
        }
        catch (KeyNotFoundException) { return NotFound(new { message = "Subscription not found" }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = "ADMIN")]
    [HttpPost("subscriptions/{id}/reject")]
    public async Task<IActionResult> RejectSubscription(string id)
    {
        try
        {
            var subscription = await _testService.RejectSubscriptionAsync(id);
            return Ok(new { message = "Subscription rejected", data = subscription });
        }
        catch (KeyNotFoundException) { return NotFound(new { message = "Subscription not found" }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ─── Shared Endpoints ─────────────────────────────────────────────────────

    [Authorize]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetTest(string id)
    {
        var test = await _testService.GetTestByIdAsync(id);
        if (test == null) return NotFound(new { message = "Test not found" });

        var role = GetUserRole();
        if (role == "CANDIDATE")
        {
            if (test.Status != TestStatus.PUBLISHED) return NotFound(new { message = "Test not found" });

            // Sanitize correct answers for candidate
            foreach (var q in test.Questions)
            {
                if (!string.IsNullOrEmpty(q.Options))
                {
                    var opts = JsonSerializer.Deserialize<List<QcmOptionDto>>(q.Options, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }) ?? new List<QcmOptionDto>();
                    // Erase correct flag
                    foreach (var opt in opts) { opt.IsCorrect = false; }
                    q.Options = JsonSerializer.Serialize(opts, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                }
            }
        }
        else if (role == "RECRUITER" && test.RecruiterId != GetUserId())
        {
            return Forbid();
        }

        return Ok(new { message = "Test retrieved", data = test });
    }
}
