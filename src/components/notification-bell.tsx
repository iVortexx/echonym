
"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import { Bell, User, MessageCircle, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { markAllNotificationsAsRead, markNotificationAsRead } from '@/lib/actions';
import type { Notification } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

function NotificationItem({ notification, onOpen }: { notification: Notification; onOpen: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const getIcon = () => {
    switch (notification.type) {
      case 'new_follower':
        return <User className="h-4 w-4 text-accent" />;
      case 'new_comment':
        return <MessageCircle className="h-4 w-4 text-accent" />;
      case 'new_reply':
        return <GitBranch className="h-4 w-4 text-green-400" />;
      default:
        return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

  const getText = () => {
    return (
      <p className="text-sm text-slate-300">
        <span className="font-bold text-slate-100">{notification.fromUserName}</span>{' '}
        {notification.type === 'new_follower' && 'started following you.'}
        {notification.type === 'new_comment' && 'commented on your post:'}
        {notification.type === 'new_reply' && 'replied to your comment.'}
        {notification.type === 'new_comment' && notification.commentSnippet && (
          <span className="block text-slate-400 italic mt-1">"{notification.commentSnippet}..."</span>
        )}
      </p>
    );
  };
  
  const getLink = () => {
    switch (notification.type) {
        case 'new_follower':
            return `/profile/${encodeURIComponent(notification.fromUserName)}`;
        case 'new_comment':
            return `/post/${notification.targetPostId}`;
        case 'new_reply':
            return `/post/${notification.targetPostId}#comment-${notification.targetCommentId}`;
        default:
            return '#';
    }
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Mark as read before navigating
    if (user && !notification.read) {
      await markNotificationAsRead(user.uid, notification.id);
    }
    
    const link = getLink();
    const targetPathname = link.split('#')[0];

    // If we're already on the page the notification is for, refresh it to get new data
    if (pathname === targetPathname) {
      router.refresh();
    } else {
      // Otherwise, navigate to the new page
      router.push(link);
    }
    
    // Close the notification popover
    onOpen();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 p-3 -mx-1 rounded-lg transition-colors cursor-pointer hover:bg-primary/10',
        !notification.read && 'bg-primary/5'
      )}
    >
      <div className="mt-1">{getIcon()}</div>
      <div className="flex-1">
        {getText()}
        <p className="text-xs text-slate-500 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, loading } = useNotifications(user?.uid);
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAllRead = async () => {
    if (!user || unreadCount === 0) return;
    await markAllNotificationsAsRead(user.uid);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full hover:bg-primary/10 border border-transparent hover:border-border"
        >
          <Bell className="h-5 w-5 text-slate-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 md:w-96 bg-background/95 border-border backdrop-blur-sm text-slate-200 p-2">
        <div className="flex items-center justify-between p-2">
          <h3 className="font-bold font-mono text-lg text-slate-100">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" onClick={handleMarkAllRead} className="p-0 h-auto text-sm text-accent hover:opacity-80">
              Mark all as read
            </Button>
          )}
        </div>
        <div className="mt-2 max-h-96 overflow-y-auto space-y-1">
          {loading ? (
             <div className="p-2 space-y-3">
               {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full bg-muted" />)}
            </div>
          ) : notifications.length > 0 ? (
            notifications.map(n => <NotificationItem key={n.id} notification={n} onOpen={() => setIsOpen(false)} />)
          ) : (
            <p className="text-center text-slate-500 py-8 text-sm">No notifications yet.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
