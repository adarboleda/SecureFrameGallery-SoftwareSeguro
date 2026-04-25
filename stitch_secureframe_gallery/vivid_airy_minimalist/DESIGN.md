---
name: Vivid Airy Minimalist
colors:
  surface: '#fff8f7'
  surface-dim: '#f5d2cf'
  surface-bright: '#fff8f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0ef'
  surface-container: '#ffe9e7'
  surface-container-high: '#ffe2df'
  surface-container-highest: '#fedad7'
  on-surface: '#2a1615'
  on-surface-variant: '#5e3f3c'
  inverse-surface: '#412b29'
  inverse-on-surface: '#ffedeb'
  outline: '#936e6b'
  outline-variant: '#e8bcb8'
  surface-tint: '#c0001b'
  primary: '#b7001a'
  on-primary: '#ffffff'
  primary-container: '#e60023'
  on-primary-container: '#fff7f6'
  inverse-primary: '#ffb3ad'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e5e2e1'
  on-secondary-container: '#656464'
  tertiary: '#005f90'
  on-tertiary: '#ffffff'
  tertiary-container: '#0079b6'
  on-tertiary-container: '#f7f9ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3ad'
  on-primary-fixed: '#410004'
  on-primary-fixed-variant: '#930012'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#92ccff'
  on-tertiary-fixed: '#001e31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#fff8f7'
  on-background: '#2a1615'
  surface-variant: '#fedad7'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  grid-gutter: 16px
  container-margin: 24px
---

## Brand & Style
The brand personality of this design system is energetic yet unobtrusive, focusing on content discovery and visual inspiration. It targets a creative, trend-conscious audience that values speed, clarity, and aesthetic curation. 

The design style is **Minimalism** blended with **Modern Corporate** sensibilities. It prioritizes a high ratio of white space to content, ensuring that the interface recedes to let the user's imagery take center stage. The emotional response is one of calm productivity, punctuated by the excitement of a high-energy primary accent.

## Colors
The palette is dominated by a clean "Pure White" background to maximize light reflectance and perceived airiness. The primary color is a vibrant, saturated red used exclusively for calls to action and critical interactions. 

Secondary colors are kept to a deep near-black for high-legibility text and a series of very light grays for subtle containment. Neutral grays are used for secondary information and iconography to maintain a low visual noise floor.

## Typography
This design system utilizes **Plus Jakarta Sans** for its friendly, modern, and open apertures which contribute to the "airy" feel. Typography is set with generous line heights to ensure maximum legibility, especially when paired with dense visual grids. 

Headlines use a heavier weight to create a clear information hierarchy against light backgrounds. Body text is kept at a comfortable 16px default, while labels use a slightly tighter tracking and bolder weight to distinguish them from descriptive prose.

## Layout & Spacing
The layout follows a **Fluid Grid** philosophy optimized for a masonry-style image presentation. The primary layout container utilizes a 24px outer margin. 

The spacing rhythm is based on a 4px baseline, but defaults to larger increments (16px and 24px) to maintain a sense of openness. Images in the masonry grid should maintain a consistent 16px gutter. White space should be used aggressively to separate functional groups rather than using lines or borders.

## Elevation & Depth
Depth is conveyed through **Ambient Shadows** rather than structural lines. Surfaces use extremely soft, diffused shadows with a low opacity (typically 4-8%) and a large blur radius to create a "floating" effect.

- **Level 0 (Base):** The main background, flat white.
- **Level 1 (Cards):** Subtle shadow to define boundaries against the light gray or white background.
- **Level 2 (Hover/Floating):** Increased blur and slightly more opacity to indicate interactivity or high-priority overlays like modals.
- **Tonal Layers:** Very light gray (`#F0F0F0`) is used for secondary containers or input backgrounds to provide depth without adding shadow complexity.

## Shapes
The shape language is defined by **Pill-shaped** and hyper-rounded geometry. This softness reduces the "clinical" feel of a minimalist white interface and adds a sense of playfulness.

All standard components (buttons, inputs, cards) must have a corner radius of at least 24px. For larger cards in the masonry grid, a radius of 32px is preferred to emphasize the organic nature of the layout. Functional icons and small tags should follow the same ultra-rounded logic.

## Components
- **Buttons:** Primary buttons are solid vibrant red with white text, using a full pill-shape (height / 2). Secondary buttons use a light gray background with black text.
- **Masonry Cards:** These are the hero component. They feature no borders, a 32px corner radius, and a subtle ambient shadow. Text labels appear directly below the image in a clean vertical stack.
- **Search Inputs:** Full-width pill-shaped bars with a light gray background (`#F0F0F0`) and no border. Placeholder text is in neutral gray.
- **Chips & Tags:** Small, pill-shaped elements used for categorization. They use a light gray background and bold label-sm typography.
- **Navigation:** A floating bottom bar or a clean top-nav with high transparency and a heavy backdrop blur (glassmorphism) to keep the focus on the content grid.
- **Avatars:** Always circular to complement the rounded corner language of the grid.