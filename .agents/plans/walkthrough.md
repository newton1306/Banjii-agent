# Walkthrough - Mobile Keyboard Smoothness & Chat Input UX Overhaul

## 1. Root Cause of Keyboard "Jumping/Bouncing" ("แป้นพิมพ์เด้ง")
1. **iOS Safari Auto-Zoom on Input Focus:**
   - **Cause:** When an input element on iOS Safari/WebKit has a font-size smaller than 16px (previously `text-xs sm:text-sm` = 12px/14px), iOS forces an automatic viewport zoom-in to 16px, abruptly scaling the entire page up, causing horizontal scroll, and pushing the header off-screen.
   - **Fix:** Upgraded the input text size to `text-[16px] sm:text-sm`. With 16px font-size, iOS Safari **never triggers auto-zoom**, completely eliminating the jarring bounce.
2. **Fixed Viewport & Virtual Keyboard Height:**
   - **Cause:** Mobile browsers' `100dvh` does not contract when the virtual keyboard pops up on some iOS/Android devices, causing the page body to scroll and bounce.
   - **Fix:**
     - Added `interactive-widget=resizes-content` to the `viewport` meta tag in `index.html`.
     - Integrated `window.visualViewport` listener in `App.jsx` to dynamically track the exact visible height above the on-screen keyboard, binding the root container to `style={{ height: viewportHeight }}` with `fixed inset-0`.
     - Added `overscroll-behavior: none; touch-action: manipulation;` in `index.css` to prevent body rubber-banding.
3. **Smooth Scroll to Bottom on Viewport Change:**
   - Added a `visualViewport` resize listener in `ChatContainer.jsx` that automatically and smoothly scrolls the chat thread so the latest messages remain perfectly in view above the keyboard.

---

## 2. Chat Input & UI Modernization
- **Cohesive Floating Input Bar:**
  - Redesigned `ChatInput.jsx` into a unified, modern pill layout with `rounded-2xl`, glassmorphic backdrop (`bg-[#161626]/90 backdrop-blur-xl`), and dark inner shadow.
  - Focused state features a smooth glow ring (`focus-within:border-neon-lime/60 focus-within:ring-2 focus-within:ring-neon-lime/20`).
- **Interactive Action Buttons:**
  - **Voice Button:** Rounded-2xl button with smooth audio recording pulse state.
  - **Send Button:** Dynamic contrast (subtle when empty, bright neon-lime with drop-shadow when text is present).
- **Refined Quick Prompt Chips:**
  - Rounded-full pill chips with subtle glowing borders (`QuickPromptChips.jsx`) floating seamlessly above the input.

---

## 3. Verification & Deployment
- ✅ **Build:** `npm run build` compiled without any warnings or errors.
- ✅ **Netlify Production Deployment:** Deployed live to [https://banjii-agent.netlify.app](https://banjii-agent.netlify.app) (Deploy ID: `6aa8ec53e03dbfcd3f3d834a`).
- ✅ **Version Control:** Committed and pushed all changes cleanly to GitHub master.