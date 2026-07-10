-- Invoice document for monthly bills: generated when the landlord sends the
-- bill, shown alongside the receipt after payment (tenant POP + landlord Payments).
alter table public.monthly_bills
  add column if not exists invoice_pdf_path text;
