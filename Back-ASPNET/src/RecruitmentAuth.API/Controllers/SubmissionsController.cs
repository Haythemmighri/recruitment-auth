using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecruitmentAuth.Application.DTOs.Tests;
using RecruitmentAuth.Application.Services;
using System.Security.Claims;

namespace RecruitmentAuth.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubmissionsController : ControllerBase
{
    private readonly ITestService _testService;

    public SubmissionsController(ITestService testService)
    {
        _testService = testService;
    }

    private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // ─── Candidate Endpoints ──────────────────────────────────────────────────

    [Authorize(Roles = "CANDIDATE")]
    [HttpPost("test/{testId}")]
    public async Task<IActionResult> StartSubmission(string testId)
    {
        try
        {
            var submission = await _testService.StartSubmissionAsync(testId, GetUserId());
            return Created("", new { message = "Submission started", data = submission });
        }
        catch (KeyNotFoundException) { return NotFound(new { message = "Test not found" }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = "CANDIDATE")]
    [HttpGet("test/{testId}/my")]
    public async Task<IActionResult> GetMySubmission(string testId)
    {
        try
        {
            var submission = await _testService.GetMySubmissionAsync(testId, GetUserId());
            return Ok(new { message = "Submission retrieved", data = submission });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [Authorize(Roles = "CANDIDATE")]
    [HttpPost("{id}/answers")]
    public async Task<IActionResult> SubmitAnswers(string id, [FromBody] SubmitAnswersDto dto)
    {
        try
        {
            var submission = await _testService.SubmitAnswersAsync(id, GetUserId(), dto);
            return Ok(new { message = "Answers saved", data = submission });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [Authorize(Roles = "CANDIDATE")]
    [HttpPost("{id}/submit")]
    public async Task<IActionResult> FinalizeSubmission(string id)
    {
        try
        {
            var submission = await _testService.FinalizeSubmissionAsync(id, GetUserId());
            return Ok(new { message = "Test submitted successfully", data = submission });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ─── Recruiter Endpoints ──────────────────────────────────────────────────

    [Authorize(Roles = "RECRUITER")]
    [HttpPatch("{id}/grade")]
    public async Task<IActionResult> GradeSubmission(string id, [FromBody] GradeSubmissionDto dto)
    {
        try
        {
            var submission = await _testService.GradeSubmissionAsync(id, GetUserId(), dto);
            return Ok(new { message = "Submission graded", data = submission });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
