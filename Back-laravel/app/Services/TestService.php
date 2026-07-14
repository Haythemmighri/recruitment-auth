<?php

namespace App\Services;

use App\Models\Test;
use App\Models\Question;
use App\Models\TestSubmission;
use App\Models\QuestionAnswer;
use Illuminate\Support\Facades\DB;

class TestService
{
    public function createTest(string $recruiterId, array $data)
    {
        $data['recruiter_id'] = $recruiterId;
        $data['status'] = 'DRAFT';
        return Test::create($data);
    }

    public function listRecruiterTests(string $recruiterId, array $filters = [], int $perPage = 20)
    {
        $query = Test::where('recruiter_id', $recruiterId);

        if (isset($filters['category'])) {
            $query->where('category', $filters['category']);
        }
        if (isset($filters['type'])) {
            $query->where('type', $filters['type']);
        }
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->withCount(['questions', 'submissions'])->latest()->paginate($perPage);
    }

    public function listPublishedTests(array $filters = [], int $perPage = 20)
    {
        $query = Test::where('status', 'PUBLISHED');

        if (isset($filters['category'])) {
            $query->where('category', $filters['category']);
        }
        if (isset($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        return $query->withCount('questions')->latest()->paginate($perPage);
    }

    public function getTestById(string $id)
    {
        return Test::with(['questions', 'recruiter:id,first_name,last_name'])->find($id);
    }

    public function updateTest(string $id, string $recruiterId, array $data)
    {
        $test = Test::findOrFail($id);
        
        if ($test->recruiter_id !== $recruiterId) {
            abort(403, 'Forbidden');
        }
        if ($test->status === 'ARCHIVED' || $test->status === 'PUBLISHED') {
            abort(400, 'Cannot update this test in its current state');
        }

        $test->update($data);
        return $test;
    }

    public function submitForReview(string $id, string $recruiterId)
    {
        $test = Test::with('questions')->findOrFail($id);

        if ($test->recruiter_id !== $recruiterId) {
            abort(403, 'Forbidden');
        }
        if (!in_array($test->status, ['DRAFT', 'REJECTED'])) {
            abort(400, 'Only DRAFT or REJECTED tests can be submitted for review');
        }
        if ($test->questions->isEmpty()) {
            abort(400, 'Cannot submit a test with no questions for review');
        }

        $test->update(['status' => 'PENDING_REVIEW', 'rejection_reason' => null]);
        return $test;
    }

    public function archiveTest(string $id, string $recruiterId)
    {
        $test = Test::findOrFail($id);

        if ($test->recruiter_id !== $recruiterId) {
            abort(403, 'Forbidden');
        }

        $test->update(['status' => 'ARCHIVED']);
        return $test;
    }

    // ─── Admin Review ──────────────────────────────────────────────────────────

    public function listPendingTests(array $filters = [], int $perPage = 20)
    {
        $query = Test::where('status', 'PENDING_REVIEW');

        if (isset($filters['category'])) {
            $query->where('category', $filters['category']);
        }
        if (isset($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        return $query
            ->with(['recruiter:id,first_name,last_name,email'])
            ->withCount('questions')
            ->oldest()
            ->paginate($perPage);
    }

    public function approveTest(string $id)
    {
        $test = Test::findOrFail($id);

        if ($test->status !== 'PENDING_REVIEW') {
            abort(400, 'Test is not pending review');
        }

        $test->update(['status' => 'PUBLISHED', 'rejection_reason' => null]);
        return $test;
    }

    public function rejectTest(string $id, string $reason)
    {
        $test = Test::findOrFail($id);

        if ($test->status !== 'PENDING_REVIEW') {
            abort(400, 'Test is not pending review');
        }

        $test->update(['status' => 'REJECTED', 'rejection_reason' => $reason]);
        return $test;
    }

    public function addQuestion(string $testId, string $recruiterId, array $data)
    {
        $test = Test::findOrFail($testId);

        if ($test->recruiter_id !== $recruiterId) {
            abort(403, 'Forbidden');
        }
        if ($test->status === 'ARCHIVED') {
            abort(400, 'Cannot add questions to an archived test');
        }

        $data['test_id'] = $testId;
        return Question::create($data);
    }

    public function updateQuestion(string $testId, string $questionId, string $recruiterId, array $data)
    {
        $test = Test::findOrFail($testId);

        if ($test->recruiter_id !== $recruiterId) {
            abort(403, 'Forbidden');
        }

        $question = Question::where('test_id', $testId)->findOrFail($questionId);
        $question->update($data);
        return $question;
    }

    public function deleteQuestion(string $testId, string $questionId, string $recruiterId)
    {
        $test = Test::findOrFail($testId);

        if ($test->recruiter_id !== $recruiterId) {
            abort(403, 'Forbidden');
        }

        $question = Question::where('test_id', $testId)->findOrFail($questionId);
        $question->delete();
    }

    public function getTestSubmissions(string $testId, string $recruiterId)
    {
        $test = Test::findOrFail($testId);

        if ($test->recruiter_id !== $recruiterId) {
            abort(403, 'Forbidden');
        }

        return TestSubmission::where('test_id', $testId)
            ->with(['candidate:id,first_name,last_name,email', 'answers.question:id,content,points'])
            ->latest()
            ->get();
    }

    public function startSubmission(string $testId, string $candidateId)
    {
        $test = Test::findOrFail($testId);

        if ($test->status !== 'PUBLISHED') {
            abort(400, 'Test is not available');
        }

        $existing = TestSubmission::where('test_id', $testId)
            ->where('candidate_id', $candidateId)
            ->first();

        if ($existing) {
            if (in_array($existing->status, ['SUBMITTED', 'GRADED'])) {
                abort(409, 'You have already completed this test');
            }
            return $existing;
        }

        return TestSubmission::create([
            'test_id' => $testId,
            'candidate_id' => $candidateId,
            'started_at' => now(),
        ]);
    }

    public function getMySubmission(string $testId, string $candidateId)
    {
        $sub = TestSubmission::where('test_id', $testId)
            ->where('candidate_id', $candidateId)
            ->with([
                'answers.question:id,content,order_index,points,options', 
                'test:id,title,type,duration_minutes'
            ])
            ->firstOrFail();

        return $sub;
    }

    public function submitAnswers(string $submissionId, string $candidateId, array $answers)
    {
        $submission = TestSubmission::findOrFail($submissionId);

        if ($submission->candidate_id !== $candidateId) {
            abort(403, 'Forbidden');
        }
        if ($submission->status !== 'IN_PROGRESS') {
            abort(400, 'Submission is already finalized');
        }

        DB::transaction(function () use ($submission, $answers) {
            foreach ($answers as $ans) {
                QuestionAnswer::updateOrCreate(
                    [
                        'submission_id' => $submission->id,
                        'question_id' => $ans['questionId']
                    ],
                    [
                        'answer_text' => $ans['answerText'] ?? null,
                        'selected_options' => $ans['selectedOptions'] ?? null,
                    ]
                );
            }
        });

        return $submission->load('answers');
    }

    public function finalizeSubmission(string $submissionId, string $candidateId)
    {
        $submission = TestSubmission::with(['answers', 'test.questions'])->findOrFail($submissionId);

        if ($submission->candidate_id !== $candidateId) {
            abort(403, 'Forbidden');
        }
        if ($submission->status !== 'IN_PROGRESS') {
            abort(400, 'Submission already finalized');
        }

        $questions = $submission->test->questions;
        $maxScore = $questions->sum('points');

        $autoScore = 0;
        $hasManualQuestions = false;

        DB::transaction(function () use ($submission, $questions, &$autoScore, &$hasManualQuestions) {
            foreach ($questions as $question) {
                $answer = $submission->answers->where('question_id', $question->id)->first();
                if (!$answer) continue;

                if ($question->options) {
                    $options = $question->options;
                    $correctValues = collect($options)->where('isCorrect', true)->pluck('value')->sort()->values()->all();
                    
                    $selectedValues = $answer->selected_options ?? [];
                    sort($selectedValues);

                    $isCorrect = ($selectedValues === $correctValues);
                    $pointsAwarded = $isCorrect ? $question->points : 0;

                    $autoScore += $pointsAwarded;

                    $answer->update([
                        'is_correct' => $isCorrect,
                        'points_awarded' => $pointsAwarded,
                    ]);
                } else {
                    $hasManualQuestions = true;
                }
            }

            $finalScore = $hasManualQuestions ? null : $autoScore;

            $submission->update([
                'status' => $hasManualQuestions ? 'SUBMITTED' : 'GRADED',
                'submitted_at' => now(),
                'score' => $finalScore,
                'max_score' => $maxScore,
            ]);
        });

        return $submission->load(['answers.question:id,content,points']);
    }

    public function gradeSubmission(string $submissionId, string $recruiterId, float $score)
    {
        $submission = TestSubmission::with('test')->findOrFail($submissionId);

        if ($submission->test->recruiter_id !== $recruiterId) {
            abort(403, 'Forbidden');
        }
        if ($submission->status === 'IN_PROGRESS') {
            abort(400, 'Submission not yet finalized');
        }

        $submission->update(['status' => 'GRADED', 'score' => $score]);
        return $submission;
    }
}
