<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TestSubscription extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'test_id',
        'candidate_id',
        'status',
    ];

    public function test()
    {
        return $this->belongsTo(Test::class);
    }

    public function candidate()
    {
        return $this->belongsTo(User::class, 'candidate_id');
    }
}
