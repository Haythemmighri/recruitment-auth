<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TestSubmission extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'test_id',
        'candidate_id',
        'status',
        'started_at',
        'submitted_at',
        'score',
        'max_score',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'submitted_at' => 'datetime',
    ];

    public function test()
    {
        return $this->belongsTo(Test::class);
    }

    public function candidate()
    {
        return $this->belongsTo(User::class, 'candidate_id');
    }

    public function answers()
    {
        return $this->hasMany(QuestionAnswer::class, 'submission_id');
    }
}
