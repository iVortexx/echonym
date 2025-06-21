"use client"

import type React from "react"
import { useState } from "react"
import type { User } from "@/lib/types"
import { buildAvatarUrl } from "@/lib/utils"
import { Button } from "./ui/button"
import { ScrollArea, ScrollBar } from "./ui/scroll-area"
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar"
import { UserIcon, Check, Loader2 } from "lucide-react"
import { updateUserAvatar } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import {
  hairStyles,
  eyeStyles,
  eyebrowStyles,
  mouthStyles,
  glasses,
  earrings,
  features,
  hairColors,
  skinColors,
} from "@/lib/dicebear-options"

interface AvatarEditorProps {
  user: User
  onSave: (newUrl: string) => void
}

const optionCategories = [
  { name: "Hair", key: "hair", options: hairStyles },
  { name: "Eyes", key: "eyes", options: eyeStyles },
  { name: "Eyebrows", key: "eyebrows", options: eyebrowStyles },
  { name: "Mouth", key: "mouth", options: mouthStyles },
  { name: "Glasses", key: "glasses", options: glasses },
  { name: "Earrings", key: "earrings", options: earrings },
  { name: "Features", key: "features", options: features },
]

const colorCategories = [
  { name: "Skin Tone", key: "skinColor", options: skinColors },
  { name: "Hair Color", key: "hairColor", options: hairColors },
]

export function AvatarEditor({ user, onSave }: AvatarEditorProps) {
  const [options, setOptions] = useState(user.avatarOptions || { seed: user.anonName })
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleOptionChange = (key: string, value: string) => {
    setOptions((prev) => {
      const newOptions = { ...prev }
      // Remove seed if we are customizing
      delete newOptions.seed
      // Unset value if clicked again
      if (newOptions[key] === value) {
        delete newOptions[key]
      } else {
        newOptions[key] = value
      }
      return newOptions
    })
  }
  
  const handleColorChange = (key: string, value: string) => {
     setOptions((prev) => ({
      ...prev,
      [key]: value.replace("#", ""), // Dicebear wants hex without the #
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    const newUrl = buildAvatarUrl(options)
    const result = await updateUserAvatar(user.uid, options, newUrl)

    if (result.success) {
      toast({ title: "Avatar updated!" })
      onSave(newUrl)
    } else {
      toast({ variant: "destructive", title: "Failed to save avatar", description: result.error })
    }
    setIsSaving(false)
  }

  const avatarUrl = buildAvatarUrl(options)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 flex flex-col items-center justify-center space-y-4 p-4 bg-slate-900 rounded-lg">
        <Avatar className="w-48 h-48 ring-4 ring-blue-500/30">
          <AvatarImage src={avatarUrl} alt="Avatar Preview" />
           <AvatarFallback className="bg-slate-800">
            <UserIcon className="h-24 w-24 text-slate-500" />
          </AvatarFallback>
        </Avatar>
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Avatar"}
        </Button>
      </div>

      <div className="md:col-span-2 space-y-4">
        <div className="space-y-4 p-4 bg-slate-900 rounded-lg">
          {optionCategories.map((cat) => (
            <div key={cat.name}>
              <h4 className="font-mono text-slate-300 mb-2">{cat.name}</h4>
              <ScrollArea className="w-full whitespace-nowrap rounded-md">
                <div className="flex space-x-2 pb-3">
                  {cat.options.map((opt) => (
                    <Button
                      key={opt}
                      variant={options[cat.key] === opt ? "default" : "outline"}
                      onClick={() => handleOptionChange(cat.key, opt)}
                      className="capitalize"
                    >
                      {opt.replace(/([A-Z])/g, ' $1').trim()}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          ))}
        </div>
         <div className="space-y-4 p-4 bg-slate-900 rounded-lg">
           {colorCategories.map((cat) => (
             <div key={cat.name}>
               <h4 className="font-mono text-slate-300 mb-2">{cat.name}</h4>
                 <div className="flex flex-wrap gap-2">
                   {cat.options.map((color) => (
                     <button
                       key={color}
                       onClick={() => handleColorChange(cat.key, color)}
                       className="h-8 w-8 rounded-full border-2 transition-all"
                       style={{
                         backgroundColor: color,
                         borderColor: options[cat.key] === color.replace("#", "") ? "#38bdf8" : "transparent"
                       }}
                     >
                      {options[cat.key] === color.replace("#", "") && <Check className="h-5 w-5 text-white" />}
                     </button>
                   ))}
                 </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  )
}
