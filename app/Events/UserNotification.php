<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Generic Notification Event
 * 
 * Use this for general real-time notifications to users
 */
class UserNotification implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $title;
    public string $message;
    public string $type; // 'info', 'success', 'warning', 'error'
    public ?array $data;
    public array $recipientUserIds;

    /**
     * Create a new event instance.
     *
     * @param string $title Notification title
     * @param string $message Notification message
     * @param string $type Notification type (info, success, warning, error)
     * @param array $recipientUserIds Array of user IDs to notify
     * @param array|null $data Optional additional data
     */
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

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [];
        foreach ($this->recipientUserIds as $userId) {
            $channels[] = new PrivateChannel('user.' . $userId);
        }
        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'user.notification';
    }

    /**
     * Get the data to broadcast.
     */
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
