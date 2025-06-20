"use client";

import { useState, useTransition, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createPost, getTagSuggestions } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Tags, Loader2 } from 'lucide-react';
import { Badge } from './ui/badge';
import _ from 'lodash';
import { useAuth } from '@/hooks/use-auth';

const PostFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  content: z.string().min(1, 'Content cannot be empty'),
  tag: z.string().optional(),
  imageBase64: z.string().optional(),
});

type PostFormValues = z.infer<typeof PostFormSchema>;

export function PostForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(PostFormSchema),
    defaultValues: {
      title: '',
      content: '',
      tag: '',
      imageBase64: '',
    },
  });

  const debouncedSuggestTags = useCallback(
    _.debounce(async (content: string) => {
      if (content.length < 20) {
        setSuggestedTags([]);
        return;
      }
      setIsSuggesting(true);
      const result = await getTagSuggestions(content);
      setSuggestedTags(result.tags);
      setIsSuggesting(false);
    }, 1000),
    []
  );

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    form.setValue('content', e.target.value);
    debouncedSuggestTags(e.target.value);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        form.setValue('imageBase64', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: PostFormValues) => {
    if (!user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be signed in to create a post.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value) {
          formData.append(key, value);
        }
      });

      const result = await createPost(formData, user.uid);
      if (result?.error) {
        toast({
          title: 'Error',
          description: typeof result.error === 'string' ? result.error : 'Failed to create post.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success!',
          description: 'Your whisper has been posted.',
        });
        router.push('/');
      }
    });
  };

  return (
    <Card className="p-4 sm:p-6 border-border/60">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="p-0 space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="A catchy title for your whisper" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your anonymous thoughts..."
                      className="min-h-[150px]"
                      {...field}
                      onChange={handleContentChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <FormLabel className="flex items-center gap-2"><Tags className="w-4 h-4" /> Suggested Tags</FormLabel>
              <div className="flex flex-wrap gap-2 items-center">
                {isSuggesting && <Loader2 className="w-4 h-4 animate-spin" />}
                {suggestedTags.length > 0 ? (
                  suggestedTags.map(tag => (
                    <Badge 
                      key={tag}
                      variant={form.watch('tag') === tag ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => form.setValue('tag', form.watch('tag') === tag ? '' : tag)}
                    >
                      {tag}
                    </Badge>
                  ))
                ) : (
                  !isSuggesting && <p className="text-xs text-muted-foreground">Type more to see suggestions.</p>
                )}
              </div>
            </div>

            <FormItem>
              <FormLabel>Image (Optional)</FormLabel>
              <FormControl>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
              </FormControl>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              {imagePreview && (
                <div className="mt-4 relative w-full h-48 rounded-md overflow-hidden border">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </FormItem>
          </CardContent>
          <CardFooter className="p-0">
            <Button type="submit" disabled={isPending || !user} className="w-full">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post Whisper
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
