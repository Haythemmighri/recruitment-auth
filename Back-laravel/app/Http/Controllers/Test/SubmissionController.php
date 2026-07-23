<?php

namespace App\Http\Controllers\Test;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\TestService;
use Illuminate\Http\Request;

class SubmissionController extends Controller
{
    public function __construct(private TestService $testService) {}

    public function start(Request $request, $testId)
    {
        $submission = $this->testService->startSubmission($testId, $request->user()->id);
        return ResponseHelper::created($submission, 'Submission started');
    }

    public function getMySubmission(Request $request, $testId)
    {
        $submission = $this->testService->getMySubmission($testId, $request->user()->id);
        return ResponseHelper::success($submission, 'Submission retrieved');
    }

    public function submitAnswers(Request $request, $submissionId)
    {
        $data = $request->validate([
            'answers' => 'present|array',
            'answers.*.questionId' => 'required|string',
            'answers.*.answerText' => 'nullable|string',
            'answers.*.selectedOptions' => 'nullable|array',
            'answers.*.fileUrl' => 'nullable|string',
        ]);

        $submission = $this->testService->submitAnswers($submissionId, $request->user()->id, $data['answers']);
        return ResponseHelper::success($submission, 'Answers saved');
    }

    public function finalize(Request $request, $submissionId)
    {
        $submission = $this->testService->finalizeSubmission($submissionId, $request->user()->id);
        return ResponseHelper::success($submission, 'Test submitted successfully');
    }

    public function grade(Request $request, $submissionId)
    {
        $data = $request->validate([
            'score' => 'required|numeric|min:0',
        ]);

        $submission = $this->testService->gradeSubmission($submissionId, $request->user()->id, $data['score']);
        return ResponseHelper::success($submission, 'Submission graded');
    }
}
