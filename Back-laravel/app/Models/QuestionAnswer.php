<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuestionAnswer extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'submission_id',
        'question_id',
        'answer_text',
        'selected_options',
        'is_correct',
        'points_awarded',
    ];

    protected $casts = [
        'selected_options' => 'array',
        'is_correct' => 'boolean',
    ];

    public function submission()
    {
        return $this->belongsTo(TestSubmission::class, 'submission_id');
    }

    public function question()
    {
        return $this->belongsTo(Question::class);
    }
}
