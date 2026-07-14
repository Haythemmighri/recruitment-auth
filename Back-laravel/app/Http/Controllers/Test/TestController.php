<?php

namespace App\Http\Controllers\Test;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\TestService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TestController extends Controller
{
    public function __construct(private TestService $testService) {}

    public function createTest(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|min:3|max:255',
            'description' => 'nullable|string|max:5000',
            'category' => 'required|string',
            'type' => 'required|in:QCM,COMPTE_RENDU,PROBLEM_SOLVING,OTHER',
            'duration_minutes' => 'nullable|integer|min:1',
        ]);

        $test = $this->testService->createTest($request->user()->id, $data);
        return ResponseHelper::created($test, 'Test created successfully');
    }

    public function listMyTests(Request $request)
    {
        $tests = $this->testService->listRecruiterTests(
            $request->user()->id,
            $request->only(['category', 'type', 'status']),
            $request->query('limit', 20)
        );
        return ResponseHelper::success($tests, 'Tests retrieved');
    }

    public function listPublishedTests(Request $request)
    {
        $tests = $this->testService->listPublishedTests(
            $request->only(['category', 'type']),
            $request->query('limit', 20)
        );
        return ResponseHelper::success($tests, 'Published tests retrieved');
    }

    public function getTest(Request $request, $id)
    {
        $test = $this->testService->getTestById($id);
        
        if (!$test) {
            return ResponseHelper::error('Test not found', 404);
        }

        if ($request->user()->role === 'CANDIDATE') {
            if ($test->status !== 'PUBLISHED') {
                return ResponseHelper::error('Test not found', 404);
            }
            
            // Sanitize correct answers for candidate
            $test->questions->transform(function ($q) {
                if ($q->options) {
                    $sanitizedOptions = array_map(function ($opt) {
                        return ['label' => $opt['label'], 'value' => $opt['value']];
                    }, $q->options);
                    $q->options = $sanitizedOptions;
                }
                return $q;
            });
        }

        return ResponseHelper::success($test, 'Test retrieved');
    }

    public function updateTest(Request $request, $id)
    {
        $data = $request->validate([
            'title' => 'sometimes|required|string|min:3|max:255',
            'description' => 'nullable|string|max:5000',
            'category' => 'sometimes|required|string',
            'type' => 'sometimes|required|in:QCM,COMPTE_RENDU,PROBLEM_SOLVING,OTHER',
            'duration_minutes' => 'nullable|integer|min:1',
        ]);

        $test = $this->testService->updateTest($id, $request->user()->id, $data);
        return ResponseHelper::success($test, 'Test updated');
    }

    public function submitForReview(Request $request, $id)
    {
        $test = $this->testService->submitForReview($id, $request->user()->id);
        return ResponseHelper::success($test, 'Test submitted for admin review');
    }

    public function archiveTest(Request $request, $id)
    {
        $this->testService->archiveTest($id, $request->user()->id);
        return response()->noContent();
    }

    public function getSubmissions(Request $request, $id)
    {
        $submissions = $this->testService->getTestSubmissions($id, $request->user()->id);
        return ResponseHelper::success($submissions, 'Submissions retrieved');
    }

    // ─── Admin Review ──────────────────────────────────────────────────────────

    public function listPendingTests(Request $request)
    {
        $tests = $this->testService->listPendingTests(
            $request->only(['category', 'type']),
            $request->query('limit', 20)
        );
        return ResponseHelper::success($tests, 'Pending tests retrieved');
    }

    public function approveTest(Request $request, $id)
    {
        $test = $this->testService->approveTest($id);
        return ResponseHelper::success($test, 'Test approved and published');
    }

    public function rejectTest(Request $request, $id)
    {
        $data = $request->validate([
            'reason' => 'required|string|min:1',
        ]);
        $test = $this->testService->rejectTest($id, $data['reason']);
        return ResponseHelper::success($test, 'Test rejected');
    }
}
