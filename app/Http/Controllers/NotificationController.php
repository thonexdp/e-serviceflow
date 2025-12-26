<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Notification::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc');

        
        
        if ($user && !$user->isAdmin() && $user->branch_id) {
            $query->where(function ($q) use ($user) {
                
                $q->whereNull('notifiable_type')
                    
                    ->orWhere(function ($subQ) use ($user) {
                        $subQ->where('notifiable_type', 'App\Models\Ticket')
                            ->whereHas('notifiable', function ($ticketQuery) use ($user) {
                                
                                if ($user->isFrontDesk() || $user->isCashier()) {
                                    $ticketQuery->where('order_branch_id', $user->branch_id);
                                }
                                
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

    
    public function unreadCount()
    {
        $user = Auth::user();
        $query = Notification::where('user_id', Auth::id())
            ->where('read', false);

        
        if ($user && !$user->isAdmin() && $user->branch_id) {
            $query->where(function ($q) use ($user) {
                
                $q->whereNull('notifiable_type')
                    
                    ->orWhere(function ($subQ) use ($user) {
                        $subQ->where('notifiable_type', 'App\Models\Ticket')
                            ->whereHas('notifiable', function ($ticketQuery) use ($user) {
                                
                                if ($user->isFrontDesk() || $user->isCashier()) {
                                    $ticketQuery->where('order_branch_id', $user->branch_id);
                                }
                                
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
