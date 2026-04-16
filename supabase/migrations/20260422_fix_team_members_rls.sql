-- Fix infinite recursion: team_members SELECT policy was querying itself.

DROP POLICY IF EXISTS "Members view team membership" ON public.team_members;
DROP POLICY IF EXISTS "Team admins manage members" ON public.team_members;

-- Members can see rows in teams they belong to (no self-referencing subquery).
CREATE POLICY "Members view team membership" ON public.team_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())
  );

-- Team owners and team admins can manage members.
CREATE POLICY "Team admins manage members" ON public.team_members FOR ALL
  USING (
    team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid()) OR
    (user_id = auth.uid() AND role = 'admin')
  );
