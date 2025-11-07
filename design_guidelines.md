# Design Guidelines: Dual-Model Video Generation Platform

## Design Approach

**Reference-Based Approach** drawing from modern AI creative tools:
- **Runway ML**: Video generation interface patterns and preview layouts
- **Midjourney**: Clean generation queue and result presentation
- **Notion**: Hierarchical project organization and sidebar navigation
- **Linear**: Typography hierarchy and workspace aesthetics

**Core Principles**:
- Showcase video content prominently with generous spacing
- Clear visual separation between models with distinctive indicators
- Professional workspace feel with approachable, modern aesthetics
- Minimize visual noise to let generated content shine

---

## Typography System

**Font Stack**:
- **Primary**: Inter (via Google Fonts CDN) - UI text, buttons, labels
- **Accent**: JetBrains Mono (via Google Fonts CDN) - Model names, technical details

**Hierarchy**:
- **H1**: text-4xl font-bold - Main page headings (Projects, Generate Video)
- **H2**: text-2xl font-semibold - Section titles (Project name, Model selector)
- **H3**: text-lg font-medium - Card titles (Video names, Settings groups)
- **Body Large**: text-base - Primary UI text, form labels
- **Body**: text-sm - Secondary text, descriptions, metadata
- **Caption**: text-xs - Timestamps, file sizes, technical info

---

## Layout System

**Spacing Primitives**: Use Tailwind units of `2, 4, 6, 8, 12, 16`
- Micro spacing: `p-2, gap-2` (component internals)
- Standard spacing: `p-4, gap-4, m-4` (cards, buttons, form groups)
- Section spacing: `p-6, gap-6` (between major sections)
- Large spacing: `p-8, gap-8` (page margins, hero areas)
- XL spacing: `p-12, p-16` (major layout divisions)

**Grid Structure**:
- Dashboard: Sidebar (280px fixed) + Main content (flex-1)
- Video Grid: 2-column on tablet (md:grid-cols-2), 3-column on desktop (lg:grid-cols-3)
- Generation Interface: Single column max-w-4xl centered
- Settings Panel: 2-column layout for grouped options

**Container Constraints**:
- Main workspace: `max-w-7xl mx-auto`
- Content sections: `max-w-6xl`
- Forms/Generation: `max-w-3xl`

---

## Component Library

### Navigation & Structure

**Sidebar Navigation**:
- Fixed left sidebar (280px wide, full height)
- Top section: Logo + App name (h-16)
- Middle: Scrollable project list with icons and badges
- Bottom: Model selector toggle + Settings icon
- Active project: Distinct background treatment
- Project items: Icon + Name + Video count badge

**Main Content Area**:
- Top bar (h-16): Breadcrumb navigation + Action buttons (New Video, Settings)
- Content area: Full height scrolling with padding

### Project Management

**Project Card** (in sidebar):
- Folder icon + Project name
- Video count badge (subtle, right-aligned)
- Context menu (three dots) for rename/delete
- Hover state with subtle background shift

**Empty State** (no projects):
- Centered layout with large icon (folder-plus from Heroicons)
- Heading + Description + CTA button
- Minimum height: 60vh

### Video Generation Interface

**Model Selector**:
- Prominent toggle/segmented control at top
- Two options: "Ovi (Character AI)" | "Wan2.1"
- Display key specs below: Resolution options, Features
- Use distinctive icon for each model (sparkles for Ovi, film for Wan2.1)

**Generation Form**:
- Clear sections with headings
- **Input Type Toggle**: Text-to-Video | Image-to-Video
- **Text Input**: Large textarea (min-h-32) with character count
- **Image Upload** (when I2V selected): Drag-drop zone with preview
- **Prompt Builder** (Ovi only): Helper buttons to insert `<S></S>` and `<AUDCAP></AUDCAP>` tags
- **Resolution Selector**: Grid of preset buttons (720×720, 1280×704, etc.)
- **Generate Button**: Large, prominent, full-width on mobile

**Generation Queue/Status**:
- Card-based list showing active generations
- Each card: Thumbnail/placeholder + Prompt preview + Progress bar + Status text
- Real-time progress indicator with estimated time remaining

### Video Display

**Video Grid** (project view):
- Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
- Each card contains:
  - Video thumbnail with play icon overlay
  - Title (editable on click)
  - Metadata row: Duration, Resolution, Date
  - Action buttons: Play, Download (download icon from Heroicons)
- Hover: Subtle elevation increase

**Video Player Modal**:
- Full-screen overlay with dark backdrop
- Centered video player (max-width maintains aspect ratio)
- Controls: Play/Pause, Volume, Download, Close
- Title and metadata display above video
- Close button (X) in top-right corner

### Forms & Inputs

**Text Input**:
- Labeled inputs with placeholder text
- Focus state: Border accent
- Error state: Red border + Error message below

**Textarea**:
- Minimum height as specified
- Auto-resize on content
- Character counter in bottom-right

**File Upload**:
- Dashed border drag-drop zone
- Upload icon + "Drag image or click to browse"
- Image preview after upload with remove button

**Select/Dropdown**:
- Custom styled with chevron-down icon
- Clear active state

**Buttons**:
- **Primary**: Solid background, prominent
- **Secondary**: Border outline, transparent bg
- **Icon**: Square with centered icon, subtle hover
- Consistent padding: `px-6 py-2` for medium, `px-8 py-3` for large
- Rounded corners: `rounded-lg`

### Data Display

**Status Badge**:
- Small pill shape (rounded-full)
- Colors: Processing (blue), Completed (green), Failed (red)
- Icon + Text combination

**Progress Bar**:
- Height: h-2
- Rounded ends
- Animated fill for active processes

**Metadata Tags**:
- Small chips displaying: Resolution, Duration, Model used
- Subtle background, compact spacing

---

## Animations

Use sparingly for enhanced UX:
- **Fade in/out**: Modal overlays, notifications (300ms)
- **Slide in**: Sidebar on mobile (250ms)
- **Progress bars**: Smooth width transitions
- **Hover states**: Subtle scale (1.02) or shadow increase
- NO complex scroll animations or excessive motion

---

## Icons

**Icon Library**: Heroicons (via CDN)
- Use outline variant for navigation and secondary actions
- Use solid variant for primary buttons and active states
- Common icons needed:
  - folder, folder-plus, film, sparkles (models)
  - play, download, trash, pencil (actions)
  - x-mark (close), cog (settings)
  - cloud-arrow-up (upload), photo (image)

---

## Images

**Hero Section**: NOT REQUIRED - This is a functional workspace app, skip traditional hero

**Image Usage**:
- **Video Thumbnails**: Auto-generated from first frame, 16:9 aspect ratio
- **Empty States**: Illustration-style icons (large Heroicons, 96px+)
- **Upload Preview**: User-uploaded image displayed in rounded container
- **Project Icons**: Consistent folder/video icons throughout

---

## Key Layout Specifications

**Dashboard Layout**:
```
┌─────────────┬──────────────────────────────────┐
│             │  Top Bar (breadcrumb + actions)  │
│   Sidebar   ├──────────────────────────────────┤
│   (280px)   │                                  │
│  Projects   │      Main Content Area           │
│    List     │   (Video Grid or Generation)     │
│             │                                  │
│   Model     │                                  │
│  Selector   │                                  │
└─────────────┴──────────────────────────────────┘
```

**Vertical Rhythm**: Consistent py-8 for major sections, py-4 for subsections

**Responsive Behavior**:
- Mobile (<768px): Sidebar collapses to hamburger menu, single column grids
- Tablet (768px-1024px): Sidebar visible, 2-column video grid
- Desktop (>1024px): Full layout, 3-column video grid