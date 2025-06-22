
"use client"

import type React from "react"
import { useState } from "react"
import type { User } from "@/lib/types"
import { buildAvatarUrl } from "@/lib/utils"
import { Button } from "./ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar"
import { UserIcon, Check, Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { updateUserAvatar } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import {
  hairStyles,
  eyeStyles,
  eyebrowStyles,
  mouthStyles,
  hairColors,
  skinColors,
} from "@/lib/dicebear-options"
import { useAuth } from "@/hooks/use-auth"

interface AvatarEditorProps {
  user: User
  onSave: (newUrl: string) => void
}

const StyleSelector = ({
  label,
  value,
  options,
  onChange,
  isOptional = false,
}: {
  label: string
  value: string | undefined
  options: readonly string[]
  onChange: (newValue: string | undefined) => void
  isOptional?: boolean
}) => {
  const displayOptions = isOptional ? ["None", ...options] : [...options]
  const currentIndex = value ? displayOptions.indexOf(value) : 0

  const handlePrev = () => {
    const newIndex = (currentIndex - 1 + displayOptions.length) % displayOptions.length
    onChange(isOptional && newIndex === 0 ? undefined : displayOptions[newIndex])
  }

  const handleNext = () => {
    const newIndex = (currentIndex + 1) % displayOptions.length
    onChange(isOptional && newIndex === 0 ? undefined : displayOptions[newIndex])
  }

  const currentOptionValue = displayOptions[currentIndex]
  const displayName = currentOptionValue !== "None"
    ? currentOptionValue.replace(/([A-Z0-9])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim()
    : "None"
  
  const totalUserOptions = options.length
  const currentUserOptionIndex = isOptional ? currentIndex : currentIndex + 1

  return (
    <div className="space-y-1">
      <Label className="font-mono text-sm text-slate-400">{label}</Label>
      <div className="flex items-center justify-between bg-slate-800/50 rounded-md p-1">
        <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 text-slate-400 hover:text-slate-100">
          <ChevronLeft />
        </Button>
        <div className="text-center font-mono">
          <p className="text-sm text-slate-200">{displayName}</p>
          <p className="text-xs text-slate-500">
            {isOptional ? `${currentIndex} / ${totalUserOptions}` : `${currentUserOptionIndex} / ${totalUserOptions}`}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 text-slate-400 hover:text-slate-100">
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}


export function AvatarEditor({ user, onSave }: AvatarEditorProps) {
  const [options, setOptions] = useState<Record<string, any>>(user.avatarOptions || { seed: user.anonName })
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const { updateUser } = useAuth()

  const handleOptionChange = (key: string, value: string | undefined) => {
    setOptions((prev) => {
      const newOptions = { ...prev };
      delete newOptions.seed; // Remove seed on first customization
      if (value === undefined) {
        delete newOptions[key];
      } else {
        newOptions[key] = value;
      }
      return newOptions;
    });
  };
  
  const handleColorChange = (key: string, value: string) => {
     setOptions((prev) => ({
      ...prev,
      [key]: value.replace("#", ""),
    }))
  }

  const handleReroll = () => {
    const getRandomOption = (arr: readonly string[]) => arr[Math.floor(Math.random() * arr.length)]
    
    const newOptions: Record<string, any> = {
        hair: getRandomOption(hairStyles),
        eyes: getRandomOption(eyeStyles),
        eyebrows: getRandomOption(eyebrowStyles),
        mouth: getRandomOption(mouthStyles),
        hairColor: getRandomOption(hairColors).replace("#", ""),
        skinColor: getRandomOption(skinColors).replace("#", ""),
    }

    setOptions(newOptions)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const newUrl = buildAvatarUrl(options)
    const result = await updateUserAvatar(user.uid, options, newUrl)

    if (result.success) {
      toast({ title: "Avatar updated!" })
      updateUser({ avatarUrl: newUrl, avatarOptions: options });
      onSave(newUrl)
    } else {
      toast({ variant: "destructive", title: "Failed to save avatar", description: result.error })
    }
    setIsSaving(false)
  }

  const avatarUrl = buildAvatarUrl(options)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 flex flex-col items-center justify-center space-y-4 p-4 bg-card rounded-lg">
        <Avatar className="w-48 h-48 ring-4 ring-primary/30">
          <AvatarImage src={avatarUrl} alt="Avatar Preview" />
           <AvatarFallback className="bg-secondary">
            <UserIcon className="h-24 w-24 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="flex w-full gap-2">
           <Button onClick={handleReroll} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" /> Reroll
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>

      <div className="md:col-span-2">
        <Tabs defaultValue="styles" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="styles">Styles</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
          </TabsList>
          
          <TabsContent value="styles" className="mt-4">
             <div className="space-y-4 max-h-[400px] overflow-y-auto p-1 pr-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <StyleSelector label="Hair" value={options.hair} options={hairStyles} onChange={(v) => handleOptionChange('hair', v)} />
                    <StyleSelector label="Eyes" value={options.eyes} options={eyeStyles} onChange={(v) => handleOptionChange('eyes', v)} />
                    <StyleSelector label="Eyebrows" value={options.eyebrows} options={eyebrowStyles} onChange={(v) => handleOptionChange('eyebrows', v)} />
                    <StyleSelector label="Mouth" value={options.mouth} options={mouthStyles} onChange={(v) => handleOptionChange('mouth', v)} />
                </div>
            </div>
          </TabsContent>

          <TabsContent value="colors" className="mt-4">
            <div className="space-y-4 p-4 bg-card rounded-lg">
              {[
                { name: "Skin Tone", key: "skinColor", options: skinColors },
                { name: "Hair Color", key: "hairColor", options: hairColors },
              ].map((cat) => (
                <div key={cat.name}>
                  <h4 className="font-mono text-slate-300 mb-2">{cat.name}</h4>
                    <div className="flex flex-wrap gap-2">
                      {cat.options.map((color) => (
                        <button
                          key={color}
                          onClick={() => handleColorChange(cat.key, color)}
                          className="h-8 w-8 rounded-full border-2 transition-all flex items-center justify-center"
                          style={{
                            backgroundColor: color,
                            borderColor: options[cat.key] === color.replace("#", "") ? "hsl(var(--primary))" : "transparent"
                          }}
                        >
                        {options[cat.key] === color.replace("#", "") && <Check className="h-5 w-5 text-white stroke-2" />}
                        </button>
                      ))}
                    </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
