
"use client";

import { useState, useEffect } from "react";
import type { User } from "@/lib/types";
import { getFollowers, getFollowing } from "@/lib/actions";
import { Skeleton } from "./ui/skeleton";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { UserIcon } from "lucide-react";
import { DialogHeader, DialogTitle } from "./ui/dialog";

interface FollowListDialogProps {
  userId: string;
  type: "followers" | "following";
  onClose: () => void;
}

const UserRow = ({ user, onClose }: { user: User, onClose: () => void }) => (
  <Link
    href={`/profile/${encodeURIComponent(user.anonName)}`}
    className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-blue-500/10 transition-colors"
    onClick={onClose}
  >
    <Avatar className="h-10 w-10">
      <AvatarImage src={user.avatarUrl} alt={user.anonName} />
      <AvatarFallback className="bg-blue-900/50 text-blue-300">
        <UserIcon className="h-5 w-5" />
      </AvatarFallback>
    </Avatar>
    <span className="font-mono text-blue-300">{user.anonName}</span>
  </Link>
);

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full bg-slate-700/50" />
        <Skeleton className="h-5 w-32 bg-slate-700/50" />
      </div>
    ))}
  </div>
);

export function FollowListDialog({ userId, type, onClose }: FollowListDialogProps) {
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const data =
        type === "followers"
          ? await getFollowers(userId)
          : await getFollowing(userId);
      setList(data);
      setLoading(false);
    }
    fetchData();
  }, [userId, type]);

  const title = type === "followers" ? "Followers" : "Following";

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-mono text-xl text-blue-300">{title}</DialogTitle>
      </DialogHeader>
      <div className="mt-4 max-h-[60vh] overflow-y-auto pr-4">
        {loading ? (
          <LoadingSkeleton />
        ) : list.length > 0 ? (
          <div className="space-y-2">
            {list.map((user) => (
              <UserRow key={user.uid} user={user} onClose={onClose} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-4">
            No users to display.
          </p>
        )}
      </div>
    </>
  );
}
