<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;


class UserNotification implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $title;
    public string $message;
    public string $type; 
    public ?array $data;
    public array $recipientUserIds;

    
    public function __construct(
        string $title,
        string $message,
        string $type,
        array $recipientUserIds,
        ?array $data = null
    ) {
        $this->title = $title;
        $this->message = $message;
        $this->type = $type;
        $this->recipientUserIds = $recipientUserIds;
        $this->data = $data;
    }

    
    public function broadcastOn(): array
    {
        $channels = [];
        foreach ($this->recipientUserIds as $userId) {
            $channels[] = new PrivateChannel('user.' . $userId);
        }
        return $channels;
    }

    
    public function broadcastAs(): string
    {
        return 'user.notification';
    }

    
    public function broadcastWith(): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'type' => $this->type,
            'data' => $this->data,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
