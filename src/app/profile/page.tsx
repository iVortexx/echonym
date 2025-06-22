
"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function ProfileRedirectPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user?.anonName) {
      router.replace(`/profile/${user.anonName}`)
    }
  }, [user?.anonName, loading, router])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="flex flex-col items-center space-y-2 text-slate-400 font-mono">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading your profile...</p>
        </div>
      </div>
    </div>
  )
}

    
