# Stock Management Migration Instructions

## How to Run the Database Migration

The migration file `20251215093144_stock_management.sql` creates the stock management system with tables, triggers, and security policies.

### Method 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: "ConsciousManager" or your project name

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query" button

3. **Copy Migration SQL**
   - Open the file: `backend/supabase/migrations/20251215093144_stock_management.sql`
   - Copy the entire contents (all 202 lines)

4. **Execute Migration**
   - Paste the SQL into the query editor
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for completion message

5. **Verify Tables Created**
   - Go to "Table Editor" in left sidebar
   - You should see 3 new tables:
     - `stock_transactions`
     - `ingredient_stock`
     - `stock_settings`

### Method 2: Using Supabase CLI (If Configured)

If you have Supabase CLI installed and linked to your project:

```bash
cd backend
supabase db push
```

## What the Migration Creates

### Tables
1. **stock_transactions** - Tracks all stock movements
   - Supports: purchase, adjustment, wastage, usage
   - Records quantity, cost, reference numbers, notes

2. **ingredient_stock** - Current stock levels
   - Current quantity
   - Minimum quantity threshold
   - Average unit cost (auto-calculated)
   - Last updated timestamp

3. **stock_settings** - Ingredient-specific settings
   - Minimum stock level alerts
   - Reorder quantities
   - Storage location
   - Custom notes

### Automatic Features
- **Auto Stock Updates**: Triggers automatically update stock levels when transactions are recorded
- **Cost Tracking**: Average unit cost calculated from purchase history
- **New Ingredient Init**: Stock records created automatically for new ingredients
- **Row Level Security**: Full RLS policies for data access control

## Verification Steps

After running the migration:

1. **Check Tables Exist**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('stock_transactions', 'ingredient_stock', 'stock_settings');
   ```

2. **Verify Initial Data**
   ```sql
   SELECT COUNT(*) FROM ingredient_stock;
   SELECT COUNT(*) FROM stock_settings;
   ```
   Should match the number of ingredients in your database.

3. **Test the Stock Register Page**
   - Navigate to `/stock` in your application
   - Verify the page loads without errors
   - Try adding a test transaction
   - Check stock levels update correctly

## Troubleshooting

**Error: "relation already exists"**
- Some tables may already exist
- Safe to ignore - the `IF NOT EXISTS` clause prevents errors

**Error: "permission denied"**
- Ensure you're connected as the project owner
- Check RLS policies are properly configured

**Error: "foreign key violation"**
- Ensure the `ingredients` and `profiles` tables exist
- Run the initial schema migration first if needed

## Need Help?

If you encounter any issues:
1. Check the browser console for error messages
2. Verify all tables were created in Table Editor
3. Check the SQL Editor for any error messages during migration
4. Ensure Row Level Security is properly configured

## Next Steps

After successful migration:
1. Test the Stock Register page at `/stock`
2. Add initial stock for existing ingredients
3. Set up minimum stock levels as needed
4. Configure storage locations for ingredients
