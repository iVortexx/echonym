"use client";

import { useState, useTransition } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { handleVote } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type VoteType } from '@/lib/types';

type VoteButtonsProps = {
  itemId: string;
  itemType: 'post' | 'comment';
  upvotes: number;
  downvotes: number;
  postId?: string;
};

export function VoteButtons({ itemId, itemType, upvotes, downvotes, postId }: VoteButtonsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  // Note: For a production app, the initial vote state would be fetched from the DB.
  // For this project, we'll keep it client-side for simplicity.
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);

  const onVote = (voteType: VoteType) => {
    if (!user) {
      toast({ title: "Authentication required", description: "You must have a session to vote.", variant: "destructive" });
      return;
    }
    
    // Optimistic update
    setVoted(current => (current === voteType ? null : voteType));

    startTransition(async () => {
      const result = await handleVote(user.uid, itemId, itemType, voteType, postId);
      if (result?.error) {
        toast({ title: "Vote failed", description: result.error, variant: "destructive" });
        // Revert optimistic update on failure
        setVoted(voted);
      }
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", { "text-accent bg-accent/10": voted === 'up' })}
        onClick={() => onVote('up')}
        disabled={isPending}
      >
        <ArrowUp className="w-5 h-5" />
      </Button>
      <span className="font-medium tabular-nums min-w-[2ch] text-center">
        {upvotes - downvotes}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", { "text-red-400 bg-red-400/10": voted === 'down' })}
        onClick={() => onVote('down')}
        disabled={isPending}
      >
        <ArrowDown className="w-5 h-5" />
      </Button>
    </div>
  );
}
