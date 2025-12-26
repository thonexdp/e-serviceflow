<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Lang;

class CustomResetPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    
    public $token;

    
    public function __construct(string $token)
    {
        $this->token = $token;
    }

    
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    
    public function toMail(object $notifiable): MailMessage
    {
        $url = url(route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], false));

        return (new MailMessage)
            ->subject(Lang::get('Reset Password Notification - RC PrintShoppe'))
            ->greeting(Lang::get('Hello!'))
            ->line(Lang::get('You are receiving this email because we received a password reset request for your account.'))
            ->action(Lang::get('Reset Password'), $url)
            ->line(Lang::get('This password reset link will expire in :count minutes.', ['count' => config('auth.passwords.' . config('auth.defaults.passwords') . '.expire')]))
            ->line(Lang::get('If you did not request a password reset, no further action is required. Your password will remain unchanged.'))
            ->line(Lang::get('For security reasons, please do not share this link with anyone.'))
            ->salutation(Lang::get('Regards, RC PrintShoppe Team'));
    }

    
    public function toArray(object $notifiable): array
    {
        return [
            
        ];
    }
}
