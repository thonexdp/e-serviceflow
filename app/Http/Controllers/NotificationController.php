<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Get all notifications for the authenticated user.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Notification::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc');

        // Apply branch filtering for ticket-related notifications
        // Only show notifications for tickets from the user's branch
        if ($user && !$user->isAdmin() && $user->branch_id) {
            $query->where(function ($q) use ($user) {
                // Either notification is not ticket-related (no notifiable_type)
                $q->whereNull('notifiable_type')
                    // Or it's a ticket from the user's branch
                    ->orWhere(function ($subQ) use ($user) {
                        $subQ->where('notifiable_type', 'App\Models\Ticket')
                            ->whereHas('notifiable', function ($ticketQuery) use ($user) {
                                // FrontDesk/Cashier: notifications for their order branch
                                if ($user->isFrontDesk() || $user->isCashier()) {
                                    $ticketQuery->where('order_branch_id', $user->branch_id);
                                }
                                // Production: notifications for their production branch
                                elseif ($user->isProduction()) {
                                    $ticketQuery->where('production_branch_id', $user->branch_id);
                                }
                            });
                    });
            });
        }

        if ($request->has('unread_only') && $request->unread_only) {
            $query->where('read', false);
        }

        $notifications = $query->paginate($request->get('per_page', 20));

        return response()->json($notifications);
    }

    /**
     * Get unread notification count.
     */
    public function unreadCount()
    {
        $user = Auth::user();
        $query = Notification::where('user_id', Auth::id())
            ->where('read', false);

        // Apply branch filtering for ticket-related notifications
        if ($user && !$user->isAdmin() && $user->branch_id) {
            $query->where(function ($q) use ($user) {
                // Either notification is not ticket-related
                $q->whereNull('notifiable_type')
                    // Or it's a ticket from the user's branch
                    ->orWhere(function ($subQ) use ($user) {
                        $subQ->where('notifiable_type', 'App\Models\Ticket')
                            ->whereHas('notifiable', function ($ticketQuery) use ($user) {
                                // FrontDesk/Cashier: notifications for their order branch
                                if ($user->isFrontDesk() || $user->isCashier()) {
                                    $ticketQuery->where('order_branch_id', $user->branch_id);
                                }
                                // Production: notifications for their production branch
                                elseif ($user->isProduction()) {
                                    $ticketQuery->where('production_branch_id', $user->branch_id);
                                }
                            });
                    });
            });
        }

        $count = $query->count();

        return response()->json(['count' => $count]);
    }

    /**
     * Mark notification as read.
     */
    public function markAsRead($id)
    {
        $notification = Notification::where('user_id', Auth::id())
            ->findOrFail($id);

        $notification->markAsRead();

        return response()->json(['success' => true]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead()
    {
        Notification::where('user_id', Auth::id())
            ->where('read', false)
            ->update([
                'read' => true,
                'read_at' => now(),
            ]);

        return response()->json(['success' => true]);
    }

    /**
     * Delete a notification.
     */
    public function destroy($id)
    {
        $notification = Notification::where('user_id', Auth::id())
            ->findOrFail($id);

        $notification->delete();

        return response()->json(['success' => true]);
    }
}
