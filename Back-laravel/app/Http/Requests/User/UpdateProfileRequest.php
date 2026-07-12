<?php

namespace App\Http\Requests\User;

use App\Http\Requests\ApiRequest;

class UpdateProfileRequest extends ApiRequest
{
    public function rules(): array
    {
        $userId = $this->attributes->get('user_id'); // Set by authenticate middleware

        return [
            'firstName' => ['sometimes', 'string', 'min:2', 'max:100'],
            'lastName'  => ['sometimes', 'string', 'min:2', 'max:100'],
            'phone'     => ['sometimes', 'string', 'regex:/^\+?[1-9]\d{1,14}$/', "unique:users,phone,{$userId}"],
        ];
    }
}
