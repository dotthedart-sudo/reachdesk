# Walkthrough - Advanced CRM Filters, Project Tracking & Dashboard Upgrades

This walkthrough summarizes the complete implementation, database validation, and verification of the Advanced Filters, Project Gating, interactive Dashboard, status overhaul, collapsible template selectors, auto-draft invoices, and scheduled edge function cleanups.

---

## 1. Accomplished Work

### Status & Action Pipeline Overhaul
* **Lead Mappings Executed:** Successfully migrated existing lead records with legacy/corrupted statuses to canonical values:
  * `Waiting` ➔ `Followed up`
  * `Follow Up` ➔ `Followed up`
  * `Call Booked` ➔ `Booked`
  * 45 legacy `No Show` leads (belonging to `esemdot`) ➔ `Followed up` (verified 50 total `Followed up` leads post-migration).
* **Canonical Status Enforcements:**
  * Synced exactly 11 statuses (`Lead`, `Contacted`, `Positive Reply`, `Calendly Sent`, `Booked`, `No show`, `Rescheduled`, `Proposal Sent`, `Followed up`, `Not Interested`, `Closed Won`) across `GroupedStatusDropdown.jsx`, `EditableDropdown.jsx`, `reminders.js` groups, and the Dashboard Pipeline Stepper.
  * Added database `valid_status` CHECK constraint on the `leads.status` column to guarantee future integrity.
  * Cleared obsolete records from `custom_statuses` and updated the `action_suggestion_rules` table.

### Collapsible Accordion Template Selector
* **Custom Dropdown Component:** Built `GroupedTemplateDropdown.jsx` to display templates grouped by category folders (`INITIAL TEMPLATES`, `FOLLOW UPS`, etc.) inside collapsible accordions.
* **Direction & Search:** Programmed the dropdown portal to open strictly downward and included a live search filter.
* **Replaced Native Selects:** Wired the custom component in:
  1. Save Reply Prompt outcome modal in `CRM.jsx`.
  2. Inline cell editing for `template_used` in the CRM grid.
  3. Add/Edit Lead forms in `CRM.jsx`.
  4. Lead Details Drawer (`LeadDrawer.jsx`).

### Auto-Draft Invoices & Folders
* **Database Reference:** Added a `lead_id` column referencing the `leads` table to the `invoices` table.
* **Automated Creation:** Setting status to `Booked` or `Rescheduled` automatically inserts a prefilled draft invoice with the client's name and email linked by `lead_id`.
* **Lead Drawer Invoice View:** Added an `Invoices` tab in `LeadDrawer.jsx` showing all linked invoices, their status badges, and an external link to open the public invoice view.
* **Folders in Invoice Manager:** Split the Saved Invoices screen in `InvoiceGenerator.jsx` into two folders: **Active Invoices** and **Drafts**. Changing status from `Draft` to `Sent` automatically moves the invoice to the Active folder.
* **Toast Notification:** Added a short-lived toast notification using design tokens in the bottom-right corner when a draft invoice is generated for a lead: `"Draft invoice generated for {Lead Name}"`.
* **Untouched 30-Day Auto-Delete Edge Function:**
  * Created the `cleanup-draft-invoices` Supabase Edge Function that runs Deno code to invoke the database `delete_old_draft_invoices` RPC via service role credentials.
  * Scheduled it as a daily cron job (`cleanup-draft-invoices-daily`) at `0 3 * * *` (3 AM UTC) using `cron.schedule()` in Postgres.
  * Removed all legacy/temporary frontend self-cleaning logic from `App.jsx`.

---

## 2. Verification Results
* **Instant Auto-Draft Test:** Confirmed that changing lead status to `Booked` immediately generates the draft invoice row synchronously in the database `invoices` table without delay.
* **Vite Compilation Success:** Running `npm run build` compiled the entire project successfully in **7.30 seconds** without any errors.
