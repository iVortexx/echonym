import { PostFeed } from "@/components/post-feed"
import { Terminal, Wifi, Shield, TrendingUp } from "lucide-react"

export default function Home() {
  return (


      <div className="relative container mx-auto max-w-2xl py-8 px-4">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Terminal className="h-8 w-8 text-blue-400" />
            <h1 className="text-3xl font-mono font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              /dev/whispers
            </h1>
            <div className="flex items-center space-x-1">
              <Wifi className="h-4 w-4 text-green-400 animate-pulse" />
              <Shield className="h-4 w-4 text-blue-400" />
              <TrendingUp className="h-4 w-4 text-yellow-400" />
            </div>
          </div>
          <p className="text-slate-400 font-mono text-sm">{">"} anonymous security research & exploits</p>
          <div className="mt-2 text-xs font-mono text-slate-500">[encrypted] [tor-enabled] [xp-rewards] [no-logs]</div>
        </div>

        <PostFeed />

        <div className="mt-8 text-center">
          <p className="text-xs font-mono text-slate-600">
            connection secured • end-to-end encrypted • reputation system active • no traces
          </p>
        </div>
      </div>
  )
}
