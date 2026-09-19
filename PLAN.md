# Personal Finance Feature + Code Cleanup

## Context
Add personal finance tracking to MegaOrganize. Expenses are like items (markdown + tags) but with amount, date, and currency attached. Includes dashboard with monthly stats, calendar integration with monthly overview, and spending limits in profile.

## Approach

### Data Model
Expenses are separate from treeElement but follow similar patterns:
- `expense` table: amount, currency, date, markdown, tags (JSON array like items), userId
- `user_settings` table: currency, currencyRate, monthlySpendingLimit (stored per user)

Default currency: DZD (Algerian Dinar), configurable in profile with exchange rate.

### Finance Page (`/app/finance`)
Dashboard-style layout:
- Monthly summary card: total spent, limit remaining, daily average
- Expense list with quick-add form at top
- Filter by date range and tags
- Visual indicator when approaching/exceeding limit

### Calendar Integration
- Show expenses as events in calendar
- Add monthly overview header at top of each month showing:
  - Tasks count (reminders)
  - Training count
  - Total expenses
- Events list becomes scrollable when many events

### Profile Settings
- Add Finance Settings section
- Currency selection (text input)
- Currency rate (for conversion display)
- Monthly spending limit

## Files to Create

### Database
1. **`src/lib/server/db/schema.ts`** - Add `expense` and `user_settings` tables

### Services
2. **`src/lib/server/services/finance.service.ts`** - CRUD for expenses, stats calculations

### API
3. **`src/routes/api/finance/+server.ts`** - Finance API endpoints

### Pages
4. **`src/routes/app/finance/+page.svelte`** - Finance dashboard page
5. **`src/routes/app/finance/+page.server.ts`** - Server load

### Components
6. **`src/lib/components/finance/ExpenseForm.svelte`** - Add expense form
7. **`src/lib/components/finance/ExpenseCard.svelte`** - Single expense display
8. **`src/lib/components/finance/MonthlySummary.svelte`** - Monthly stats widget

## Files to Modify

### Calendar
8. **`src/routes/app/calendar/+page.server.ts`** - Add expense data
9. **`src/routes/app/calendar/+page.svelte`** - Add expenses filter, monthly header, scrollable list

### Profile
10. **`src/routes/app/settings/profile/+page.svelte`** - Add finance settings section
11. **`src/routes/app/settings/profile/+page.server.ts`** - Load/save settings

### Sidebar
12. **`src/lib/components/layout/Sidebar.svelte`** - Add Finance link

### Code Cleanup
13. **Multiple files** - Fix `state_referenced_locally` warnings

## Reuse
- **Tags system**: Existing `$lib/server/services/tag.service.ts`
- **Markdown rendering**: `$lib/utils/markdown.ts`
- **UI components**: `Input`, `Button`, `Textarea`, `Dialog`, `EmptyState`
- **API patterns**: `requireUser()`, `parseJson()`, `validateBody()`

## Steps
- [x] Step 1: Add expense and user_settings tables to schema, push migration
- [x] Step 2: Create finance service with CRUD and stats functions
- [x] Step 3: Create finance API route
- [x] Step 4: Create finance components (ExpenseForm, ExpenseCard, MonthlySummary)
- [x] Step 5: Create finance dashboard page (`/app/finance`)
- [x] Step 6: Add finance settings to profile page
- [x] Step 7: Integrate expenses into calendar with monthly overview header
- [x] Step 8: Add Finance link to sidebar
- [x] Step 9: Fix TypeScript warnings (state_referenced_locally pattern)
- [x] Step 10: Test full flow

## Verification
1. Can add expenses with amount, date, markdown content, tags
2. Finance dashboard shows monthly summary with spending vs limit
3. Calendar shows expenses as events
4. Calendar monthly header shows task/training/expense counts
5. Profile settings allow currency and limit configuration
6. Sidebar has Finance link
7. No TypeScript errors
