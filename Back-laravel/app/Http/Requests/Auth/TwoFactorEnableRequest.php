<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\ApiRequest;

class TwoFactorEnableRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'totpCode' => ['required', 'string', 'size:6'],
        ];
    }
}
