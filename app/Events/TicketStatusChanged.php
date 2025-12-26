<?php

namespace App\Events;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketStatusChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Ticket $ticket;
    public string $oldStatus;
    public string $newStatus;
    public User $triggeredBy;
    public array $recipientUserIds;
    public string $notificationType;
    public string $title;
    public string $message;

    
    public function __construct(
        Ticket $ticket,
        string $oldStatus,
        string $newStatus,
        User $triggeredBy,
        array $recipientUserIds,
        string $notificationType,
        string $title,
        string $message
    ) {
        $this->ticket = $ticket;
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
        $this->triggeredBy = $triggeredBy;
        $this->recipientUserIds = $recipientUserIds;
        $this->notificationType = $notificationType;
        $this->title = $title;
        $this->message = $message;
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
        return 'ticket.status.changed';
    }

    
    public function broadcastWith(): array
    {
        return [
            'ticket' => [
                'id' => $this->ticket->id,
                'ticket_number' => $this->ticket->ticket_number,
                'status' => $this->ticket->status,
                'old_status' => $this->oldStatus,
                'new_status' => $this->newStatus,
            ],
            'notification' => [
                'type' => $this->notificationType,
                'title' => $this->title,
                'message' => $this->message,
                'triggered_by' => [
                    'id' => $this->triggeredBy->id,
                    'name' => $this->triggeredBy->name,
                ],
            ],
        ];
    }
}
