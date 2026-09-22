# MegaOrganize - New Features Plan

## Context

Add four major features to MegaOrganize:

1. **Global Search** - Search across ALL content types (items, pages, reminders, expenses, training)
2. **Quick Capture** - Floating button to quickly add expenses, reminders, items, notes
3. **Analytics Dashboard** - Insights into training, spending, habits, productivity
4. **PWA Support** - Installable as mobile app (no offline mode)

## Chunk 1: Global Search

### Current State

- Sidebar has a search (Cmd+K) but only searches items via `/api/tree?search=`
- No search for reminders, expenses, training, or pages

### Approach

Create a unified search API that queries all tables and returns categorized results.

### Files to Create

- `src/routes/api/search/+server.ts` - Unified search endpoint

### Files to Modify

- `src/lib/components/layout/Sidebar.svelte` - Enhance search UI with categories
- `src/lib/server/services/` - Add search functions to existing services

### Search Results Format

```typescript
interface SearchResult {
	type: 'item' | 'page' | 'reminder' | 'expense' | 'training' | 'tag';
	id: string;
	title: string;
	subtitle?: string;
	icon: string;
	url: string;
	imageUrl?: string;
}
```

### Implementation

1. Create `search.service.ts` with queries for each content type
2. Create `/api/search` endpoint
3. Update Sidebar search to use new endpoint and show categorized results

---

## Chunk 2: Quick Capture

### Approach

Floating action button (FAB) with a modal for quick entry. Supports:

- Expense (amount + description + date)
- Reminder (title + due date + recurrence)
- Item (name + tags)
- Note (markdown content)

### Files to Create

- `src/lib/components/QuickCapture.svelte` - Main component
- `src/lib/components/quick-capture/ExpenseQuickForm.svelte`
- `src/lib/components/quick-capture/ReminderQuickForm.svelte`
- `src/lib/components/quick-capture/ItemQuickForm.svelte`
- `src/lib/components/quick-capture/NoteQuickForm.svelte`

### Files to Modify

- `src/routes/app/+layout.svelte` - Add FAB and QuickCapture

### UI Design

- Floating button (bottom-right on mobile, configurable on desktop)
- Opens modal with tabs: Expense | Reminder | Item | Note
- Minimal fields for fast entry
- Keyboard shortcuts: `E` for expense, `R` for reminder, etc.

---

## Chunk 3: Analytics Dashboard

### Approach

New page `/app/analytics` with charts and insights across all modules.

### Files to Create

- `src/routes/app/analytics/+page.svelte`
- `src/routes/app/analytics/+page.server.ts`
- `src/lib/server/services/analytics.service.ts`
- `src/lib/components/analytics/TrainingChart.svelte`
- `src/lib/components/analytics/SpendingChart.svelte`
- `src/lib/components/analytics/HabitStreak.svelte`
- `src/lib/components/analytics/ProductivityScore.svelte`

### Analytics Sections

1. **Training Overview**
   - Weekly/monthly session count
   - Duration trends
   - Activity type breakdown

2. **Spending Insights**
   - Monthly spending trend (line chart)
   - Top expense categories (tags)
   - Budget vs actual

3. **Habit Tracking**
   - Reminder completion rate
   - Current streaks
   - Best streaks

4. **Productivity Score**
   - Composite score based on: training, reminders, items created
   - Daily/weekly trends

### Reuse

- Existing `AreaChart.svelte` component
- Existing stat card patterns

---

## Chunk 4: PWA Support

### Approach

Make MegaOrganize installable as a PWA on mobile and desktop.

### Files to Create

- `static/manifest.json` - PWA manifest
- `static/icons/` - App icons (multiple sizes)
- `src/routes/+layout.svelte` - Add manifest link

### Manifest Configuration

```json
{
  "name": "MegaOrganize",
  "short_name": "MegaOrg",
  "description": "Your personal knowledge & activity operating system",
  "start_url": "/app",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#3b82f6",
  "icons": [...]
}
```

### Implementation

1. Create manifest.json with app metadata
2. Generate app icons (192x192, 512x512)
3. Add meta tags to `app.html`
4. Add install prompt component (optional)

---

## Implementation Order

### Chunk 1: Global Search (1-2 days)

- Create unified search API
- Enhance sidebar search UI
- Add search to mobile layout

### Chunk 2: Quick Capture (1-2 days)

- Create QuickCapture component
- Add FAB to layout
- Create quick forms for each type

### Chunk 3: Analytics (2-3 days)

- Create analytics service
- Build chart components
- Create analytics page

### Chunk 4: PWA (1 day)

- Create manifest
- Generate icons
- Add meta tags

---

## Verification

### Global Search

1. Press Cmd+K or click search
2. Type "workout" → shows training sessions, items with "workout"
3. Type "grocery" → shows expenses with "grocery"
4. Click result → navigates to correct page

### Quick Capture

1. Click FAB button
2. Add expense → appears in finance page
3. Add reminder → appears in reminders
4. Add item → appears in library

### Analytics

1. Navigate to Analytics page
2. See training charts with real data
3. See spending trends
4. See habit completion rates

### PWA

1. Open on mobile browser
2. See "Add to Home Screen" prompt
3. App installs with icon
4. Opens in standalone mode

---

## Decisions

- **Analytics**: Simple - stat cards + basic charts
- **Quick Capture**: Bottom-right FAB (standard mobile pattern)
- **Analytics Page**: Separate page at `/app/analytics`
- **Search Scope**: Titles and descriptions (fast, can expand later)
