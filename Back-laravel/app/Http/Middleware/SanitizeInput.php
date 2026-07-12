<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SanitizeInput
{
    /**
     * Recursively trims and strips HTML tags from input strings.
     * Mirrors the sanitize.middleware.ts xss() functionality.
     */
    public function handle(Request $request, Closure $next)
    {
        $input = $request->all();
        $request->replace($this->sanitize($input));

        return $next($request);
    }

    private function sanitize(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $data[$key] = strip_tags(trim($value));
            } elseif (is_array($value)) {
                $data[$key] = $this->sanitize($value);
            }
        }
        return $data;
    }
}
