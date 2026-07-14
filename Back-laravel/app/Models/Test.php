<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Test extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'recruiter_id',
        'title',
        'description',
        'category',
        'type',
        'status',
        'duration_minutes',
    ];

    public function recruiter()
    {
        return $this->belongsTo(User::class, 'recruiter_id');
    }

    public function questions()
    {
        return $this->hasMany(Question::class)->orderBy('order_index');
    }

    public function submissions()
    {
        return $this->hasMany(TestSubmission::class);
    }
}
