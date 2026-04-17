I've just applied a fix for the TypeScript compilation issue! 

**The Root Cause:**
In TipTap version 3, the `BubbleMenu` component (which we just correctly imported from `@tiptap/react/menus`) no longer uses `tippy.js` under the hood in the same way, meaning the `tippyOptions` prop is no longer a valid type on the `BubbleMenu` component. 

**The Fix:**
I have removed the unsupported `tippyOptions={{ duration: 200, animation: 'shift-away' }}` property from the `<BubbleMenu>` implementation around line 312 in `src/components/notes/NoteEditor.tsx`.

The code now looks like this:
```tsx
{editor && (
  <BubbleMenu editor={editor} className={`flex overflow-hidden backdrop-blur-3xl border shadow-[0_20px_40px_rgba(0,0,0,0.2)] rounded-3xl p-1.5 ${isDark ? 'bg-[#1e1e1e]/90 border-white/10' : 'bg-white/90 border-black/5'}`}>
    {/* Toolbar buttons... */}
  </BubbleMenu>
)}
```

This ensures TypeScript passes correctly during the `next build` process. Let me know if you run into any further build errors!
