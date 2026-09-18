# Add Favorite Feature to Items

## Context
The user wants to mark items as "favorites" with a star toggle. Favorited items should be visually distinct (yellow-ish styling) and filterable in the library view. The star toggle goes in the right sidebar of the item detail page.

## Approach

### 1. Database: Add `favorite` column to `treeElement` table
- Add `favorite: integer('favorite', { mode: 'boolean' }).default(false).notNull()` to the `treeElement` table in `src/lib/server/db/schema.ts`
- Generate and push migration with `drizzle-kit push`

### 2. Backend: Update tree service + API
- **`src/lib/server/services/tree.service.ts`**: Add `favorite` to the `updateTreeElement` data type and `createTreeElement` data type
- **`src/routes/api/tree/+server.ts`**: No changes needed — the PUT handler already passes through arbitrary update fields to `updateTreeElement`

### 3. Item Detail Page: Star toggle in right sidebar
**File: `src/routes/app/item/[id]/+page.svelte`**
- Add `favorite` state variable initialized from `item.favorite`
- Add `toggleFavorite()` function that calls `PUT /api/tree` with `{ id, favorite: !favorite }` and updates local state
- In the **right sidebar** (both deck and non-deck views, desktop), add a star button in the "Details" section:
  ```svelte
  <button onclick={toggleFavorite} class="...">
    <i class="fas {favorite ? 'fa-star text-yellow-400' : 'fa-star text-fg-subdued'}"></i>
  </button>
  ```
- Also add in the mobile view near the title/actions area

### 4. Library Page: Filter by favorites + visual styling on cards
**File: `src/routes/app/library/+page.svelte`**
- Add `filterFavorite` state (boolean)
- Add "Favorites only" toggle button in the filters panel (similar to "Decks only")
- Update `filterItems()` to filter by `item.favorite` when `filterFavorite` is true
- Update `hasActiveFilters` to include `filterFavorite`
- For each item card in the grid, apply yellow-ish styling when `item.favorite`:
  - Add `border-yellow-400/40 bg-yellow-50/5` classes (or similar) to the card `<a>` tag
  - Show a small yellow star icon at the right side of the card

### 5. Dashboard Page: Visual styling on recent items
**File: `src/routes/app/+page.svelte`**
- For each recent item card, if `item.favorite`, apply the yellow-ish border/bg styling and show the star icon

### 6. Category Page: Visual styling on items
**File: `src/routes/app/category/[id]/page/[pageId]/+page.svelte`**
- For item cards within nodes and top-level items, apply yellow-ish styling when `item.favorite` and show star icon

## Files to Modify
1. `src/lib/server/db/schema.ts` — add `favorite` column
2. `src/lib/server/services/tree.service.ts` — add `favorite` to data types
3. `src/routes/app/item/[id]/+page.svelte` — star toggle in sidebar
4. `src/routes/app/library/+page.svelte` — filter + card styling
5. `src/routes/app/+page.svelte` — card styling for recent items
6. `src/routes/app/category/[id]/page/[pageId]/+page.svelte` — card styling

## Reuse
- Existing `toggleArrayItem` pattern for filter toggles (though favorite is a boolean, not array)
- Existing `fetch('/api/tree', { method: 'PUT' })` pattern for saving
- Font Awesome `fa-star` icon (already in the icon set used throughout)

## Steps
- [x] Add `favorite` boolean column to `treeElement` in schema.ts
- [x] Run `bun run db:push` to apply migration
- [x] Update `tree.service.ts` create/update data types to include `favorite`
- [x] Add star toggle button in item detail page right sidebar (desktop + mobile)
- [x] Add favorite filter to library page filters panel
- [x] Add yellow-ish card styling in library grid for favorited items
- [x] Add yellow-ish card styling in dashboard recent items
- [x] Add yellow-ish card styling in category page items
- [x] Test: create item, toggle favorite, verify star persists on reload, verify filter works, verify yellow styling appears

## Verification
1. Open an item → right sidebar → click star → save → reload → star should still be filled
2. Go to Library → see yellow-ish card for favorited item → toggle "Favorites" filter → only favorites shown
3. Dashboard recent items → favorited items have yellow styling
4. Category page → favorited items have yellow styling + star icon
