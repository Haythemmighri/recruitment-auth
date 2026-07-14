<?php

namespace App\Http\Controllers\Test;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\TestService;
use Illuminate\Http\Request;

class QuestionController extends Controller
{
    public function __construct(private TestService $testService) {}

    public function addQuestion(Request $request, $testId)
    {
        $data = $request->validate([
            'content' => 'required|string',
            'order_index' => 'integer|min:0',
            'points' => 'integer|min:1',
            'options' => 'nullable|array',
            'options.*.label' => 'required_with:options|string',
            'options.*.value' => 'required_with:options|string',
            'options.*.isCorrect' => 'required_with:options|boolean',
            'expected_output' => 'nullable|string',
        ]);

        if (empty($data['order_index'])) {
            $data['order_index'] = 0;
        }
        if (empty($data['points'])) {
            $data['points'] = 1;
        }

        $question = $this->testService->addQuestion($testId, $request->user()->id, $data);
        return ResponseHelper::created($question, 'Question added');
    }

    public function updateQuestion(Request $request, $testId, $questionId)
    {
        $data = $request->validate([
            'content' => 'sometimes|required|string',
            'order_index' => 'sometimes|integer|min:0',
            'points' => 'sometimes|integer|min:1',
            'options' => 'nullable|array',
            'options.*.label' => 'required_with:options|string',
            'options.*.value' => 'required_with:options|string',
            'options.*.isCorrect' => 'required_with:options|boolean',
            'expected_output' => 'nullable|string',
        ]);

        $question = $this->testService->updateQuestion($testId, $questionId, $request->user()->id, $data);
        return ResponseHelper::success($question, 'Question updated');
    }

    public function deleteQuestion(Request $request, $testId, $questionId)
    {
        $this->testService->deleteQuestion($testId, $questionId, $request->user()->id);
        return ResponseHelper::success(null, 'Question deleted');
    }
}
