"use client";

import { useState, useTransition, useEffect } from 'react';
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

  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [score, setScore] = useState(upvotes - downvotes);

  // This effect syncs the score if the parent component gets new data,
  // without resetting the user's optimistic vote selection.
  useEffect(() => {
    setScore(upvotes - downvotes);
  }, [upvotes, downvotes]);

  const onVote = (voteType: VoteType) => {
    if (!user) {
      toast({ title: "Authentication required", description: "You must have a session to vote.", variant: "destructive" });
      return;
    }
    
    if (isPending) {
      return;
    }

    const previousVote = userVote;
    const previousScore = score;
    
    // Optimistically update UI
    let newScore = score;
    if (userVote === voteType) {
      // Undoing the vote
      setUserVote(null);
      newScore += (voteType === 'up' ? -1 : 1);
    } else if (userVote !== null) {
      // Changing the vote
      setUserVote(voteType);
      newScore += (voteType === 'up' ? 2 : -2);
    } else {
      // Casting a new vote
      setUserVote(voteType);
      newScore += (voteType === 'up' ? 1 : -1);
    }
    setScore(newScore);

    startTransition(async () => {
      const result = await handleVote(user.uid, itemId, itemType, voteType, postId);
      if (result?.error) {
        toast({ title: "Vote failed", description: result.error, variant: "destructive" });
        // On error, revert the optimistic update
        setUserVote(previousVote);
        setScore(previousScore);
      }
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 rounded-full", { "text-primary bg-primary/10": userVote === 'up' })}
        onClick={() => onVote('up')}
        disabled={isPending}
      >
        <ArrowUp className="w-5 h-5" />
      </Button>
      <span className="font-bold tabular-nums min-w-[2ch] text-center text-lg">
        {score}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 rounded-full", { "text-destructive bg-destructive/10": userVote === 'down' })}
        onClick={() => onVote('down')}
        disabled={isPending}
      >
        <ArrowDown className="w-5 h-5" />
      </Button>
    </div>
  );
}
