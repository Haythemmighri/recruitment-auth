<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    private string $provider;

    public function __construct()
    {
        $this->provider = env('SMS_PROVIDER', 'mock');
    }

    public function sendSms(string $to, string $message): void
    {
        try {
            switch ($this->provider) {
                case 'africastalking':
                    $this->sendViaAfricasTalking($to, $message);
                    break;
                case 'twilio':
                    $this->sendViaTwilio($to, $message);
                    break;
                case 'mock':
                default:
                    Log::info('[SMS_MOCK] SMS simulated', ['to' => $to, 'message' => $message]);
                    break;
            }
        } catch (\Throwable $e) {
            Log::error('SMS send failed', ['error' => $e->getMessage(), 'to' => $to, 'provider' => $this->provider]);
            throw new \Exception('Failed to send SMS. Please check your phone number and try again.');
        }
    }

    private function sendViaAfricasTalking(string $to, string $message): void
    {
        $username = env('AT_USERNAME');
        $apiKey   = env('AT_API_KEY');
        $senderId = env('AT_SENDER_ID');

        if (!$username || !$apiKey) {
            Log::error('Africa\'s Talking credentials missing');
            return;
        }

        // Format to international if it starts with 0 (assuming Kenya/Nigeria etc for sandbox)
        // Simplistic formatting mirroring Node.js logic:
        $formattedTo = $to;
        if (str_starts_with($to, '0')) {
            $formattedTo = '+254' . substr($to, 1); // Defaulting to Kenya +254 for AT sandbox examples
        } elseif (!str_starts_with($to, '+')) {
            $formattedTo = '+' . $to;
        }

        $url = $username === 'sandbox' 
            ? 'https://api.sandbox.africastalking.com/version1/messaging' 
            : 'https://api.africastalking.com/version1/messaging';

        $data = [
            'username' => $username,
            'to'       => $formattedTo,
            'message  ' => $message,
        ];

        if (!empty($senderId)) {
            $data['from'] = $senderId;
        }

        $response = Http::asForm()
            ->withHeaders([
                'Accept' => 'application/json',
                'apiKey' => $apiKey,
            ])
            ->post($url, $data);

        if (!$response->successful()) {
            throw new \Exception('Africa\'s Talking API error: ' . $response->body());
        }

        Log::info('Africa\'s Talking SMS sent successfully', ['to' => $formattedTo]);
    }

    private function sendViaTwilio(string $to, string $message): void
    {
        $accountSid = env('TWILIO_ACCOUNT_SID');
        $authToken  = env('TWILIO_AUTH_TOKEN');
        $fromNumber = env('TWILIO_PHONE_NUMBER');

        if (!$accountSid || !$authToken || !$fromNumber) {
            Log::error('Twilio credentials missing');
            return;
        }

        $url = "https://api.twilio.com/2010-04-01/Accounts/{$accountSid}/Messages.json";

        $response = Http::asForm()
            ->withBasicAuth($accountSid, $authToken)
            ->post($url, [
                'To'   => $to,
                'From' => $fromNumber,
                'Body' => $message,
            ]);

        if (!$response->successful()) {
            throw new \Exception('Twilio API error: ' . $response->body());
        }

        Log::info('Twilio SMS sent successfully', ['to' => $to]);
    }
}
