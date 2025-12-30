# NYC Grit Design System

A bold, editorial design language inspired by New York City's industrial aesthetic. Heavy borders, condensed typography, and a magazine-style layout.

---

## Typography

| Element | Font | Size | Style |
|---------|------|------|-------|
| Section labels | `JetBrains Mono` | 10px | uppercase, tracking-widest, text-gray-500 |
| Headlines | `Bebas Neue / Oswald` | text-4xl | font-black, uppercase, tracking-tight, letterSpacing: -0.02em |
| Subheadings | `Bebas Neue / Oswald` | text-xl to text-2xl | font-black, uppercase |
| Body text | `Inter / Roboto` | text-sm to text-base | text-gray-700/800, leading-relaxed |
| Data labels | `JetBrains Mono` | 10px | uppercase, tracking-wider, text-gray-500 |

### Font Declarations
```jsx
style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
style={{ fontFamily: "'JetBrains Mono', monospace" }}
```

---

## Core Container Pattern

The foundational layout for all Spot Guide sections:

```
┌─────────────────────────────────────────┐  ← border-2 border-black
│  SECTION LABEL (JetBrains Mono)         │
│  BOLD HEADLINE (Bebas Neue)             │  ← p-6, border-b-2 border-black
│  Intro paragraph (Inter)...             │
├─────────────────────────────────────────┤  ← divide-y-2 divide-black
│  Content sections...                    │
├─────────────────────────────────────────┤
│  Footer / Note (optional)               │  ← bg-gray-50, p-4
└─────────────────────────────────────────┘
```

### JSX Structure
```jsx
<div className="bg-white border-2 border-black">
  {/* Header */}
  <div className="border-b-2 border-black p-6">
    <div className="flex items-center gap-3 mb-2">
      <span className="text-[10px] font-medium tracking-widest text-gray-500"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        SECTION LABEL
      </span>
    </div>
    <h3 className="text-4xl font-black text-black uppercase tracking-tight"
        style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}>
      HEADLINE TEXT
    </h3>
    <p className="mt-3 text-base text-gray-700 leading-relaxed max-w-2xl"
       style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
      Intro paragraph describing the section...
    </p>
  </div>

  {/* Content */}
  <div className="divide-y-2 divide-black">
    {/* Sections go here */}
  </div>
</div>
```

---

## Icon Badges

Square badges with white icons, paired with uppercase labels.

### Standard Badge (32x32)
```jsx
<div className="flex items-center gap-2 mb-3">
  <div className="w-8 h-8 bg-black flex items-center justify-center">
    <IconName className="w-4 h-4 text-white" />
  </div>
  <span className="text-xs font-medium tracking-widest text-gray-500 uppercase"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}>
    LABEL
  </span>
</div>
```

### Large Badge (48x48) - For numbered sections
```jsx
<div className="w-12 h-12 bg-black flex items-center justify-center shrink-0">
  <span className="text-white font-black text-lg"
        style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
    01
  </span>
</div>
```

### Brand Color Badges
- MTA Subway Blue: `bg-[#0039A6]`
- Default: `bg-black`

---

## Grid Layouts

### Multi-Column with Dividers
```jsx
<div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-black border-b-2 border-black">
  <div className="p-6">Column 1</div>
  <div className="p-6">Column 2</div>
  <div className="p-6">Column 3</div>
</div>
```

### Responsive Behavior
- Mobile: Stack vertically with `divide-y`
- Desktop: Side-by-side with `divide-x`
- Always use `divide-black` for consistency

### Common Grid Configurations
| Columns | Use Case |
|---------|----------|
| `md:grid-cols-2` | Transport options, two-column info |
| `md:grid-cols-3` | Transit methods, quick facts |
| `md:grid-cols-4` | Conditions grid (Swell, Size, Wind, Tide) |

---

## Content Cards

### Info Card (White)
```jsx
<div className="bg-white border-2 border-black p-3">
  <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase block mb-1"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}>
    LABEL
  </span>
  <p className="text-sm text-gray-800" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
    Content text...
  </p>
</div>
```

### Technical Callout (Gray)
```jsx
<div className="bg-gray-50 border-2 border-black p-4">
  <div className="flex items-center gap-2 mb-2">
    <span className="text-[10px] font-medium tracking-widest text-gray-500 uppercase"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      TECHNICAL
    </span>
  </div>
  <p className="text-sm text-gray-800 leading-relaxed"
     style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
    Technical explanation...
  </p>
</div>
```

### Inverted Callout (Black)
```jsx
<div className="bg-black p-4">
  <div className="flex items-center gap-2 mb-2">
    <span className="text-[10px] font-medium tracking-widest text-gray-400 uppercase"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      BOTTOM LINE
    </span>
  </div>
  <p className="text-sm text-white leading-relaxed font-medium"
     style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
    Key takeaway message...
  </p>
</div>
```

---

## Status Tags

Small pills for quick status indicators.

```jsx
<span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
  GO
</span>
```

### Color Variants
| Tag | Background | Use Case |
|-----|------------|----------|
| GO | `bg-emerald-600` | Prime season, recommended |
| MAYBE | `bg-amber-500` | Secondary option, conditional |
| SKIP | `bg-red-500` | Off-season, avoid |
| BEACH PASS | `bg-black` | Informational |

---

## Seasonal Cards

For "When To Go" sections with color-coded seasons.

### Date Badge
```jsx
<div className="w-16 h-16 bg-emerald-600 flex items-center justify-center shrink-0">
  <span className="text-white font-black text-sm leading-none"
        style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
    SEP-OCT
  </span>
</div>
```

### Full Season Card
```jsx
<div className="p-6 bg-emerald-50">
  <div className="flex items-start gap-4">
    {/* Date Badge */}
    <div className="w-16 h-16 bg-emerald-600 flex items-center justify-center shrink-0">
      <span className="text-white font-black text-sm leading-none"
            style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
        SEP-OCT
      </span>
    </div>

    {/* Content */}
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-2xl font-black text-black uppercase"
            style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
          PRIME SEASON
        </h4>
        <span className="text-[10px] font-medium tracking-widest bg-emerald-600 text-white px-2 py-0.5"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          GO
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-4 leading-relaxed"
         style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
        Description text...
      </p>
      {/* Info cards grid */}
    </div>
  </div>
</div>
```

### Season Color Palette
| Season | Badge | Background | Tag |
|--------|-------|------------|-----|
| Prime (Sep-Oct) | `bg-emerald-600` | `bg-emerald-50` | GO |
| Secondary (Dec-Mar) | `bg-amber-500` | `bg-amber-50` | MAYBE |
| Off-Season (Jun-Aug) | `bg-red-500` | `bg-red-50` | SKIP |

---

## Numbered Sections

For step-by-step or multi-part content.

```jsx
<div className="p-6">
  <div className="flex items-start gap-4">
    {/* Number Badge */}
    <div className="w-12 h-12 bg-black flex items-center justify-center shrink-0">
      <span className="text-white font-black text-lg"
            style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
        01
      </span>
    </div>

    {/* Content */}
    <div className="flex-1">
      <h4 className="text-2xl font-black text-black uppercase mb-3"
          style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
        SECTION TITLE
      </h4>
      <p className="text-sm text-gray-700 mb-4 leading-relaxed"
         style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
        Section content...
      </p>
    </div>
  </div>
</div>
```

---

## Tables

For comparison data like "The Cheat Sheet".

```jsx
<table className="w-full border-collapse text-sm"
       style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
  <thead>
    <tr>
      <th className="border-2 border-black bg-black text-white px-4 py-3 text-left font-black uppercase tracking-wide text-xs"
          style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>
        COLUMN
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td className="border-2 border-black px-4 py-3 font-bold">Cell</td>
    </tr>
  </tbody>
</table>
```

---

## Spacing Reference

| Element | Padding/Margin |
|---------|----------------|
| Container sections | `p-6` |
| Cards | `p-3` or `p-4` |
| Grid gaps | `gap-3` or `gap-4` |
| Header margin-bottom | `mb-2` (label), `mt-3` (description) |
| Content margins | `mb-3` or `mb-4` |

---

## Border Reference

| Use | Class |
|-----|-------|
| Container border | `border-2 border-black` |
| Section dividers | `divide-y-2 divide-black` |
| Column dividers | `divide-x-2 divide-black` |
| Header separator | `border-b-2 border-black` |
| Card borders | `border-2 border-black` |

---

## Color Palette

### Primary
- Black: `#000000` - Borders, badges, headers
- White: `#FFFFFF` - Backgrounds, inverted text

### Grays
- `text-gray-500` - Labels, secondary text
- `text-gray-700` - Body text
- `text-gray-800` - Emphasized body text
- `bg-gray-50` - Subtle backgrounds

### Semantic Colors
- Emerald (`emerald-600`, `emerald-50`) - Positive, prime, go
- Amber (`amber-500`, `amber-50`) - Caution, secondary, maybe
- Red (`red-500`, `red-50`) - Negative, off-season, skip

### Brand
- MTA Blue: `#0039A6` - Transit badges
