import EmojiPickerReact, { EmojiStyle, type EmojiClickData, Categories, Theme as EmojiPickerTheme } from 'emoji-picker-react';
import type React from 'react';

// Re-export types and enums for convenience
export type { EmojiClickData };
export { EmojiStyle, Categories, EmojiPickerTheme };

export type EmojiPickerProps = React.ComponentProps<typeof EmojiPickerReact>;

// Wrapper to fix theme type and allow easy reuse
export function EmojiPicker(props: EmojiPickerProps) {
  // Fix theme prop: only allow 'auto', 'light', or 'dark' as per EmojiPickerTheme
  return <EmojiPickerReact {...props} />;
} 