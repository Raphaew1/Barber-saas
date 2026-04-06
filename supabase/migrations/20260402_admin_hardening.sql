drop policy if exists "admin_manage_access_audit_logs" on public.access_audit_logs;
create policy "admin_manage_access_audit_logs"
  on public.access_audit_logs
  for all
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

create index if not exists access_audit_logs_target_email_idx
  on public.access_audit_logs (lower(target_email));

create index if not exists access_audit_logs_performed_by_email_idx
  on public.access_audit_logs (lower(performed_by_email));
