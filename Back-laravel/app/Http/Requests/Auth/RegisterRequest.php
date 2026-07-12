<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\ApiRequest;

class RegisterRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'email'     => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'  => ['required', 'string', 'min:8', 'max:100', 'regex:/[A-Z]/', 'regex:/[a-z]/', 'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/'],
            'firstName' => ['required', 'string', 'min:2', 'max:100'],
            'lastName'  => ['required', 'string', 'min:2', 'max:100'],
            'phone'     => ['nullable', 'string', 'regex:/^\+?[1-9]\d{1,14}$/', 'unique:users,phone'],
            'role'      => ['nullable', 'string', 'in:CANDIDATE,RECRUITER'],
        ];
    }
}
