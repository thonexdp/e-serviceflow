# Inventory & Stock Management Testing Guide

## Overview
This guide explains how to test the inventory management system and understand the stock deduction flow in production.

## System Flow

### 1. **Inventory Setup** → 2. **Purchase Orders** → 3. **Production** → 4. **Stock Consumption**

```
┌─────────────────┐
│  Add Stock Items│
│  (Inventory)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Purchase │
│ Order (PO)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Receive PO Items│
│ (Auto updates   │
│  stock levels)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Start Production│
│ (Production     │
│  Queue)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Complete Ticket │
│ & Record Stock  │
│ Consumption     │
└─────────────────┘
```

## Step-by-Step Testing Process

### Step 1: Run Migrations & Seed Sample Data

```bash
# Run migrations
php artisan migrate

# Seed sample inventory data
php artisan db:seed --class=InventorySeeder
```

This will create:
- 8 sample stock items (Paper, Ink, Binding materials, etc.)
- Link stock requirements to existing job types

### Step 2: Add Stock Items (Manual Test)

1. **Navigate to Inventory**: `/inventory`
2. **Click "Add Stock Item"**
3. **Fill in the form**:
   - SKU: `TEST-PAPER-001`
   - Name: `Test Paper A4`
   - Category: `Paper`
   - Base Unit of Measure: `ream`
   - Initial Stock: `100`
   - Minimum Stock Level: `20`
   - Unit Cost: `30.00`
   - Supplier: `Test Supplier`
4. **Click "Create"**

### Step 3: Create a Purchase Order

1. **Navigate to Purchase Orders**: `/purchase-orders`
2. **Click "Create PO"**
3. **Fill in PO details**:
   - Supplier: `Paper Supplies Co.`
   - Order Date: Today
   - Expected Delivery: Tomorrow
4. **Add Items**:
   - Select: `A4 Paper 80gsm`
   - Quantity: `50` reams
   - Unit Cost: `25.00`
5. **Click "Create Purchase Order"**

### Step 4: Receive Purchase Order

1. **View the created PO** (click "View")
2. **Click "Approve"** (if status is Draft)
3. **Click "Mark as Ordered"**
4. **Click "Receive Items"**
5. **Enter received quantities**:
   - A4 Paper: `50` reams
6. **Click "Receive Items"**

**Result**: Stock levels automatically update! Check `/inventory` to see the new stock level.

### Step 5: Link Stock Requirements to Job Types

1. **Navigate to Job Types**: `/job-types`
2. **Edit a job type** (e.g., "Business Cards")
3. **In the backend, link stocks** (or use the admin interface if available):
   ```php
   // Example: Link cardstock to business cards job type
   $jobType = JobType::where('name', 'Business Cards')->first();
   $cardstock = StockItem::where('sku', 'CARDSTOCK-300GSM')->first();
   
   JobTypeStockRequirement::create([
       'job_type_id' => $jobType->id,
       'stock_item_id' => $cardstock->id,
       'quantity_per_unit' => 0.1, // 0.1 sheet per business card
       'is_required' => true,
   ]);
   ```

### Step 6: Create a Ticket & Test Production Flow

1. **Create a Ticket**:
   - Customer: Any customer
   - Job Type: Select a job type that has stock requirements
   - Quantity: `100` pieces
   - Description: `Test Production Order`

2. **Approve Design** (if needed)

3. **Go to Production Queue**: `/production`

4. **Start Production**:
   - Find your ticket
   - Click "Start"

5. **Update Progress**:
   - Click "Update"
   - Set produced quantity: `100`
   - Click "Save Progress"

6. **Record Stock Consumption**:
   - After marking as completed, you'll see suggested stocks based on job type
   - Or manually record consumption:
     - Select stock items used
     - Enter quantities consumed
     - Add notes if needed
   - Click "Record Consumption"

**Result**: Stock levels decrease automatically!

## Sample Test Data

### Test Scenario 1: Simple Printing Job

**Setup**:
- Stock Item: A4 Paper 80gsm (Current: 50 reams)
- Job Type: Document Printing
- Ticket Quantity: 1000 pages

**Expected Consumption**:
- Paper: ~2 reams (1000 pages / 500 pages per ream)
- Ink: ~0.2 cartridges

**Steps**:
1. Create ticket with 1000 quantity
2. Complete production
3. Record consumption: 2 reams paper, 0.2 ink
4. Check inventory: Paper should be 48 reams

### Test Scenario 2: Business Cards with Low Stock Alert

**Setup**:
- Stock Item: Cardstock 300gsm (Current: 50 sheets, Min: 50)
- Job Type: Business Cards
- Ticket Quantity: 500 cards

**Expected**:
- Cardstock: 50 sheets consumed
- Stock goes to 0 → Low stock alert!

**Steps**:
1. Complete production
2. Record: 50 sheets cardstock
3. Check `/inventory/low-stock` - should show alert

### Test Scenario 3: Purchase Order Full Cycle

**Setup**:
- Create PO for 100 reams of A4 paper
- Current stock: 10 reams (below minimum of 20)

**Steps**:
1. Create PO with 100 reams
2. Approve PO
3. Mark as Ordered
4. Receive 100 reams
5. Check stock: Should be 110 reams
6. Check stock movements: Should show "in" movement

## Understanding Stock Deduction

### How Stocks are Determined for Production:

1. **Job Type Requirements** (Automatic):
   - Each job type can have predefined stock requirements
   - System calculates: `quantity_per_unit × production_quantity`
   - Example: If job type requires 0.01 ream per unit, and you produce 100 units:
     - Required: 0.01 × 100 = 1 ream

2. **Manual Entry** (Flexible):
   - Production staff can manually select stocks and quantities
   - Useful for custom jobs or adjustments
   - System validates stock availability before deduction

### Stock Movement Types:

- **in**: Stock received from purchase orders
- **out**: Stock consumed in production
- **adjustment**: Manual stock corrections
- **transfer**: Stock moved between locations (future feature)

## Key Features to Test

### ✅ Inventory Management
- [ ] Add/Edit/Delete stock items
- [ ] Adjust stock levels manually
- [ ] View stock movements history
- [ ] Filter by category and status
- [ ] Low stock alerts

### ✅ Purchase Orders
- [ ] Create PO with multiple items
- [ ] Approve PO
- [ ] Receive items (partial or full)
- [ ] Auto stock update on receive
- [ ] PO status workflow

### ✅ Production Integration
- [ ] View suggested stocks for job type
- [ ] Record stock consumption
- [ ] Stock validation (prevent negative stock)
- [ ] View consumption history per ticket

### ✅ Reports & Alerts
- [ ] Low stock report
- [ ] Stock movement history
- [ ] Production consumption reports

## Troubleshooting

### Issue: "Insufficient stock" error
**Solution**: 
1. Check current stock levels in `/inventory`
2. Create a purchase order to restock
3. Receive the PO items

### Issue: Stock not updating after PO receive
**Solution**:
1. Check PO status (must be "approved" or "ordered")
2. Verify received quantities are entered
3. Check stock movements history

### Issue: Can't see suggested stocks in production
**Solution**:
1. Link stock requirements to job types
2. Ensure job type is selected in ticket
3. Check stock items are active

## Database Queries for Testing

```php
// Check current stock levels
StockItem::select('sku', 'name', 'current_stock', 'minimum_stock_level')
    ->where('is_active', true)
    ->get();

// View stock movements
StockMovement::with('stockItem')
    ->orderBy('created_at', 'desc')
    ->limit(10)
    ->get();

// Check production consumptions
ProductionStockConsumption::with(['ticket', 'stockItem'])
    ->orderBy('created_at', 'desc')
    ->get();

// Find low stock items
StockItem::whereRaw('current_stock <= minimum_stock_level')
    ->where('is_active', true)
    ->get();
```

## Next Steps

1. **Customize Stock Requirements**: Link your specific job types to stock items
2. **Set Minimum Levels**: Configure reorder points for each stock item
3. **Train Staff**: Show production team how to record consumption
4. **Monitor**: Regularly check low stock alerts
5. **Optimize**: Adjust minimum levels based on usage patterns

---

**Need Help?** Check the stock movements history to trace any issues!

