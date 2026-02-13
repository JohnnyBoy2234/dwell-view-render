

# Plan: Sales Listing Flow with Contact Info

## What Will Change

1. **"List Property" button becomes a dropdown** -- tapping it shows two options: "List a Rental" and "List a Sale"
2. **Sales listing form** -- uses the exact same steps as rentals, but adds a contact step (mobile number and email) before the review step
3. **Sales properties display on a separate page** -- the existing `/sales` page already does this
4. **Property detail page for sales** -- instead of "Message Landlord" / "Book Viewing" buttons, it shows the seller's contact info (phone and email)

## Database Changes

Add two new columns to the `properties` table:

- `contact_phone` (text, nullable) -- seller's phone number
- `contact_email` (text, nullable) -- seller's email address

These are only used for sale listings so tenants/buyers can see the seller's contact details directly.

## Technical Details

### 1. Database Migration

```sql
ALTER TABLE public.properties
  ADD COLUMN contact_phone text,
  ADD COLUMN contact_email text;
```

### 2. Update NavActions.tsx -- Replace Button with Dropdown

Replace the single "List Property" button with a dropdown menu that has two options:
- "List a Rental" -- navigates to `/list-property/rent`
- "List a Sale" -- navigates to `/list-property/sale`

### 3. Update ListingFormData and ListProperty.tsx

- Add `contact_phone` and `contact_email` to the `ListingFormData` interface
- Create a new `ContactStep` component for sale listings (asks for mobile number and email)
- Insert the contact step between Photos and Review for sale listings only
- Save `contact_phone` and `contact_email` to the database on submit
- Set `listing_type` to `'sale'` in the insert data when it's a sale listing

### 4. Create ContactStep Component

A simple step with two fields:
- Mobile Number (required for sales)
- Email Address (required for sales)

### 5. Update PropertyDetail.tsx for Sale Listings

When the property is a sale listing (detected by checking `listing_type`):
- Show the contact phone and email directly in the sidebar instead of "Message Landlord" / "Book Viewing" buttons
- Display the price as a once-off sale price (not "/month")
- Keep the rest of the detail page the same

### 6. Update SalesPage Property Cards

The existing `/sales` page already filters by `listing_type = 'sale'` and displays sale properties. No major changes needed there -- it already works.

## Files to Create
| File | Purpose |
|------|---------|
| `src/components/listing/ContactStep.tsx` | New step for phone and email input |

## Files to Modify
| File | Change |
|------|--------|
| `src/pages/ListProperty.tsx` | Add contact fields to form, add ContactStep for sales, save contact info, set listing_type |
| `src/components/navigation/NavActions.tsx` | Replace button with dropdown (List Rental / List Sale) |
| `src/pages/PropertyDetail.tsx` | Show contact info for sale listings instead of messaging buttons |

