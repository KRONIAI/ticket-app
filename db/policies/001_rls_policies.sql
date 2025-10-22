-- Abilita RLS su tutte le tabelle
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Funzione helper per ottenere il ruolo dell'utente
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID, org_uuid UUID DEFAULT NULL)
RETURNS membership_role AS $$
DECLARE
    user_role membership_role;
BEGIN
    -- Prima controlla se è SUPER_ADMIN (può gestire tutte le org)
    SELECT role INTO user_role
    FROM memberships m
    JOIN profiles p ON p.id = m.user_id
    WHERE p.user_id = auth.uid()
    AND m.role = 'SUPER_ADMIN'
    AND m.is_active = true
    LIMIT 1;
    
    IF user_role = 'SUPER_ADMIN' THEN
        RETURN user_role;
    END IF;
    
    -- Altrimenti controlla il ruolo per l'organizzazione specifica
    IF org_uuid IS NOT NULL THEN
        SELECT role INTO user_role
        FROM memberships m
        JOIN profiles p ON p.id = m.user_id
        WHERE p.user_id = auth.uid()
        AND m.org_id = org_uuid
        AND m.is_active = true
        LIMIT 1;
    END IF;
    
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per ottenere l'ID del profilo dall'auth.uid()
CREATE OR REPLACE FUNCTION get_profile_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM profiles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLICIES per ORGANIZATIONS
CREATE POLICY "Super admin può vedere tutte le organizzazioni" ON organizations
    FOR ALL USING (get_user_role(auth.uid()) = 'SUPER_ADMIN');

CREATE POLICY "Utenti possono vedere le proprie organizzazioni" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT m.org_id 
            FROM memberships m 
            JOIN profiles p ON p.id = m.user_id 
            WHERE p.user_id = auth.uid() AND m.is_active = true
        )
    );

CREATE POLICY "Solo super admin può modificare organizzazioni" ON organizations
    FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'SUPER_ADMIN');

CREATE POLICY "Solo super admin può aggiornare organizzazioni" ON organizations
    FOR UPDATE USING (get_user_role(auth.uid()) = 'SUPER_ADMIN');

-- POLICIES per PROFILES
CREATE POLICY "Utenti possono vedere i profili della propria org" ON profiles
    FOR SELECT USING (
        get_user_role(auth.uid()) = 'SUPER_ADMIN' OR
        id IN (
            SELECT DISTINCT p.id
            FROM profiles p
            JOIN memberships m1 ON m1.user_id = p.id
            JOIN memberships m2 ON m2.org_id = m1.org_id
            JOIN profiles p2 ON p2.id = m2.user_id
            WHERE p2.user_id = auth.uid() AND m1.is_active = true AND m2.is_active = true
        )
    );

CREATE POLICY "Utenti possono aggiornare il proprio profilo" ON profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Nuovi utenti possono creare il proprio profilo" ON profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- POLICIES per MEMBERSHIPS
CREATE POLICY "Super admin può gestire tutte le membership" ON memberships
    FOR ALL USING (get_user_role(auth.uid()) = 'SUPER_ADMIN');

CREATE POLICY "Admin azienda può vedere membership della propria org" ON memberships
    FOR SELECT USING (
        org_id IN (
            SELECT m.org_id 
            FROM memberships m 
            JOIN profiles p ON p.id = m.user_id 
            WHERE p.user_id = auth.uid() 
            AND m.role IN ('ADMIN_AZIENDA', 'SUPER_ADMIN') 
            AND m.is_active = true
        )
    );

CREATE POLICY "Admin azienda può gestire utenti della propria org" ON memberships
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT m.org_id 
            FROM memberships m 
            JOIN profiles p ON p.id = m.user_id 
            WHERE p.user_id = auth.uid() 
            AND m.role IN ('ADMIN_AZIENDA', 'SUPER_ADMIN') 
            AND m.is_active = true
        ) AND role = 'UTENTE'
    );

-- POLICIES per SERVICES
CREATE POLICY "Super admin può gestire tutti i servizi" ON services
    FOR ALL USING (get_user_role(auth.uid()) = 'SUPER_ADMIN');

CREATE POLICY "Tutti possono vedere i servizi attivi" ON services
    FOR SELECT USING (is_active = true);

-- POLICIES per ORG_SERVICES
CREATE POLICY "Utenti possono vedere i servizi della propria org" ON org_services
    FOR SELECT USING (
        org_id IN (
            SELECT m.org_id 
            FROM memberships m 
            JOIN profiles p ON p.id = m.user_id 
            WHERE p.user_id = auth.uid() AND m.is_active = true
        )
    );

CREATE POLICY "Admin può gestire servizi della propria org" ON org_services
    FOR ALL USING (
        get_user_role(auth.uid(), org_id) IN ('ADMIN_AZIENDA', 'SUPER_ADMIN')
    );

-- POLICIES per TICKETS
CREATE POLICY "Utenti possono vedere i ticket della propria org" ON tickets
    FOR SELECT USING (
        org_id IN (
            SELECT m.org_id 
            FROM memberships m 
            JOIN profiles p ON p.id = m.user_id 
            WHERE p.user_id = auth.uid() AND m.is_active = true
        )
    );

CREATE POLICY "Utenti possono creare ticket nella propria org" ON tickets
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT m.org_id 
            FROM memberships m 
            JOIN profiles p ON p.id = m.user_id 
            WHERE p.user_id = auth.uid() AND m.is_active = true
        ) AND created_by = get_profile_id()
    );

CREATE POLICY "Admin e assegnatari possono aggiornare ticket" ON tickets
    FOR UPDATE USING (
        get_user_role(auth.uid(), org_id) IN ('ADMIN_AZIENDA', 'SUPER_ADMIN') OR
        assigned_to = get_profile_id() OR
        created_by = get_profile_id()
    );

-- POLICIES per TICKET_MESSAGES
CREATE POLICY "Utenti possono vedere messaggi dei ticket della propria org" ON ticket_messages
    FOR SELECT USING (
        org_id IN (
            SELECT m.org_id 
            FROM memberships m 
            JOIN profiles p ON p.id = m.user_id 
            WHERE p.user_id = auth.uid() AND m.is_active = true
        ) AND (
            is_internal = false OR 
            get_user_role(auth.uid(), org_id) IN ('ADMIN_AZIENDA', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Utenti possono creare messaggi nei ticket della propria org" ON ticket_messages
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT m.org_id 
            FROM memberships m 
            JOIN profiles p ON p.id = m.user_id 
            WHERE p.user_id = auth.uid() AND m.is_active = true
        ) AND author_id = get_profile_id()
    );

-- POLICIES per ATTACHMENTS
CREATE POLICY "Utenti possono vedere allegati dei ticket della propria org" ON attachments
    FOR SELECT USING (
        org_id IN (
            SELECT m.org_id 
            FROM memberships m 
            JOIN profiles p ON p.id = m.user_id 
            WHERE p.user_id = auth.uid() AND m.is_active = true
        )
    );

CREATE POLICY "Utenti possono caricare allegati nei ticket della propria org" ON attachments
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT m.org_id 
            FROM memberships m 
            JOIN profiles p ON p.id = m.user_id 
            WHERE p.user_id = auth.uid() AND m.is_active = true
        ) AND created_by = get_profile_id()
    );

-- POLICIES per SHIFTS
CREATE POLICY "Utenti possono vedere i turni della propria org" ON shifts
    FOR SELECT USING (
        org_id IN (
            SELECT m.org_id 
            FROM memberships m 
            JOIN profiles p ON p.id = m.user_id 
            WHERE p.user_id = auth.uid() AND m.is_active = true
        )
    );

CREATE POLICY "Utenti possono creare i propri turni" ON shifts
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT m.org_id 
            FROM memberships m 
            JOIN profiles p ON p.id = m.user_id 
            WHERE p.user_id = auth.uid() AND m.is_active = true
        ) AND user_id = get_profile_id()
    );

CREATE POLICY "Utenti possono aggiornare i propri turni" ON shifts
    FOR UPDATE USING (
        user_id = get_profile_id() OR
        get_user_role(auth.uid(), org_id) IN ('ADMIN_AZIENDA', 'SUPER_ADMIN')
    );

-- POLICIES per AUDIT_LOGS
CREATE POLICY "Admin possono vedere i log della propria org" ON audit_logs
    FOR SELECT USING (
        get_user_role(auth.uid(), org_id) IN ('ADMIN_AZIENDA', 'SUPER_ADMIN')
    );

CREATE POLICY "Sistema può creare log di audit" ON audit_logs
    FOR INSERT WITH CHECK (true);
