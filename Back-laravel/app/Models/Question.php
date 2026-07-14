<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'test_id',
        'content',
        'order_index',
        'points',
        'options',
        'expected_output',
    ];

    protected $casts = [
        'options' => 'array',
    ];

    public function test()
    {
        return $this->belongsTo(Test::class);
    }

    public function answers()
    {
        return $this->hasMany(QuestionAnswer::class);
    }
}
