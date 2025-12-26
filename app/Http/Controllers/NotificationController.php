<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    
    public function index(Request $request)
    {
        // Simplified query - notifications are already filtered by recipient
        // Branch filtering is handled at the notification creation level
        $query = Notification::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc');

        if ($request->has('unread_only') && $request->unread_only) {
            $query->where('read', false);
        }

        $notifications = $query->paginate($request->get('per_page', 20));

        return response()->json($notifications);
    }

    
    public function unreadCount()
    {
        // Simplified query - just count unread notifications for the user
        // Branch filtering is already handled at the notification creation level
        $count = Notification::where('user_id', Auth::id())
            ->where('read', false)
            ->count();

        return response()->json(['count' => $count]);
    }

    
    public function markAsRead($id)
    {
        $notification = Notification::where('user_id', Auth::id())
            ->findOrFail($id);

        $notification->markAsRead();

        return response()->json(['success' => true]);
    }

    
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

    
    public function destroy($id)
    {
        $notification = Notification::where('user_id', Auth::id())
            ->findOrFail($id);

        $notification->delete();

        return response()->json(['success' => true]);
    }
}
