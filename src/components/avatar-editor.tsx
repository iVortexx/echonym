
"use client"

import type React from "react"
import { useState } from "react"
import type { User } from "@/lib/types"
import { buildAvatarUrl } from "@/lib/utils"
import { Button } from "./ui/button"
import { ScrollArea, ScrollBar } from "./ui/scroll-area"
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar"
import { UserIcon, Check, Loader2, RefreshCw } from "lucide-react"
import { updateUserAvatar } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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
import { useAuth } from "@/hooks/use-auth"

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

const multiSelectCategories = ["features"]

export function AvatarEditor({ user, onSave }: AvatarEditorProps) {
  const [options, setOptions] = useState<Record<string, any>>(user.avatarOptions || { seed: user.anonName })
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const { updateUser } = useAuth()

  const handleOptionChange = (key: string, value: string) => {
    setOptions((prev) => {
      const newOptions: Record<string, any> = { ...prev }
      delete newOptions.seed

      if (multiSelectCategories.includes(key)) {
        const currentValues: string[] = newOptions[key] || []
        if (currentValues.includes(value)) {
          newOptions[key] = currentValues.filter((v) => v !== value)
        } else {
          newOptions[key] = [...currentValues, value]
        }
        if (newOptions[key].length === 0) {
          delete newOptions[key]
        }
      } else {
        if (newOptions[key] === value) {
          delete newOptions[key]
        } else {
          newOptions[key] = value
        }
      }
      return newOptions
    })
  }
  
  const handleColorChange = (key: string, value: string) => {
     setOptions((prev) => ({
      ...prev,
      [key]: value.replace("#", ""),
    }))
  }

  const handleReroll = () => {
    const getRandomOption = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
    
    const numFeatures = Math.floor(Math.random() * (features.length + 1))
    const randomFeatures = [...features].sort(() => 0.5 - Math.random()).slice(0, numFeatures)

    const newOptions: Record<string, any> = {
        hair: getRandomOption(hairStyles),
        eyes: getRandomOption(eyeStyles),
        eyebrows: getRandomOption(eyebrowStyles),
        mouth: getRandomOption(mouthStyles),
        hairColor: getRandomOption(hairColors).replace("#", ""),
        skinColor: getRandomOption(skinColors).replace("#", ""),
    }

    if (Math.random() < 0.5) newOptions.glasses = getRandomOption(glasses)
    if (Math.random() < 0.5) newOptions.earrings = getRandomOption(earrings)
    if (randomFeatures.length > 0) newOptions.features = randomFeatures

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
      <div className="md:col-span-1 flex flex-col items-center justify-center space-y-4 p-4 bg-slate-900 rounded-lg">
        <Avatar className="w-48 h-48 ring-4 ring-blue-500/30">
          <AvatarImage src={avatarUrl} alt="Avatar Preview" />
           <AvatarFallback className="bg-slate-800">
            <UserIcon className="h-24 w-24 text-slate-500" />
          </AvatarFallback>
        </Avatar>
        <div className="flex w-full gap-2">
           <Button onClick={handleReroll} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" /> Reroll
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
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
            <Accordion type="multiple" className="w-full space-y-2">
              {optionCategories.map((cat) => (
                <AccordionItem value={cat.name} key={cat.name} className="bg-slate-900 rounded-lg border-slate-700/50 px-4">
                  <AccordionTrigger className="py-3 font-mono text-slate-300 hover:no-underline">
                    {cat.name}
                  </AccordionTrigger>
                  <AccordionContent>
                    <ScrollArea className="w-full whitespace-nowrap rounded-md">
                      <div className="flex space-x-2 pb-3">
                        {cat.options.map((opt) => (
                          <Button
                            key={opt}
                            variant={
                              multiSelectCategories.includes(cat.key)
                                ? options[cat.key]?.includes(opt) ? 'default' : 'outline'
                                : options[cat.key] === opt ? 'default' : 'outline'
                            }
                            onClick={() => handleOptionChange(cat.key, opt)}
                            className="capitalize"
                          >
                            {opt.replace(/([A-Z])/g, ' $1').trim()}
                          </Button>
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
          <TabsContent value="colors" className="mt-4">
            <div className="space-y-4 p-4 bg-slate-900 rounded-lg">
              {colorCategories.map((cat) => (
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
                            borderColor: options[cat.key] === color.replace("#", "") ? "#38bdf8" : "transparent"
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
