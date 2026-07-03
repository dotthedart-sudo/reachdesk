-- SQL migration to add admin SELECT policies on tables queried by admin panel

-- 1. leads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leads' AND policyname = 'Admins can view all leads'
    ) THEN
        CREATE POLICY "Admins can view all leads" ON public.leads 
        FOR SELECT TO authenticated USING (get_my_role() = 'admin'::text);
    END IF;
END
$$;

-- 2. custom_statuses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'custom_statuses' AND policyname = 'Admins can view all custom_statuses'
    ) THEN
        CREATE POLICY "Admins can view all custom_statuses" ON public.custom_statuses 
        FOR SELECT TO authenticated USING (get_my_role() = 'admin'::text);
    END IF;
END
$$;

-- 3. templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'templates' AND policyname = 'Admins can view all templates'
    ) THEN
        CREATE POLICY "Admins can view all templates" ON public.templates 
        FOR SELECT TO authenticated USING (get_my_role() = 'admin'::text);
    END IF;
END
$$;

-- 4. revenue_entries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'revenue_entries' AND policyname = 'Admins can view all revenue'
    ) THEN
        CREATE POLICY "Admins can view all revenue" ON public.revenue_entries 
        FOR SELECT TO authenticated USING (get_my_role() = 'admin'::text);
    END IF;
END
$$;

-- 5. invoices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'invoices' AND policyname = 'Admins can view all invoices'
    ) THEN
        CREATE POLICY "Admins can view all invoices" ON public.invoices 
        FOR SELECT TO authenticated USING (get_my_role() = 'admin'::text);
    END IF;
END
$$;
