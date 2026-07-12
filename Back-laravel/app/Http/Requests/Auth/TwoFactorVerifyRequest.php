<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\ApiRequest;

class TwoFactorVerifyRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'tempToken' => ['required', 'string'],
            'totpCode'  => ['required', 'string', 'size:6'],
        ];
    }
}
