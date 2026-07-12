<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\ApiRequest;

class TwoFactorDisableRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'password' => ['required', 'string'],
        ];
    }
}
