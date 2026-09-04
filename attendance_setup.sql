-- SHEKINAH PHARMACY - STAFF ATTENDANCE ADMIN SETUP
-- Run this in Supabase SQL Editor.

create table if not exists public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete restrict,
  attendance_date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  status text not null default 'pending' check (status in ('pending','present','late','absent','leave','missing_time','off_day','rejected')),
  reason text,
  source text not null default 'staff' check (source in ('staff','admin')),
  submitted_at timestamptz not null default now(),
  approved_by uuid references public.staff(id) on delete set null,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, attendance_date)
);

create index if not exists idx_staff_attendance_date on public.staff_attendance(attendance_date desc);
create index if not exists idx_staff_attendance_staff_date on public.staff_attendance(staff_id, attendance_date desc);
create index if not exists idx_staff_attendance_status on public.staff_attendance(status);

insert into public.permissions(permission_name, description) values
('view_attendance','View staff attendance records'),
('manage_attendance','Approve, correct and record staff attendance')
on conflict (permission_name) do nothing;

-- Give both CEO and admin the attendance permissions.
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.role_name in ('ceo','admin')
  and p.permission_name in ('view_attendance','manage_attendance')
on conflict do nothing;

alter table public.staff_attendance enable row level security;

drop policy if exists attendance_read_authorized on public.staff_attendance;
create policy attendance_read_authorized on public.staff_attendance
for select to authenticated
using (private.has_effective_permission('view_attendance'));

drop policy if exists attendance_manage_authorized on public.staff_attendance;
create policy attendance_manage_authorized on public.staff_attendance
for all to authenticated
using (private.has_effective_permission('manage_attendance'))
with check (private.has_effective_permission('manage_attendance'));

-- Staff-side policies for submitting their own attendance.
drop policy if exists attendance_staff_read_own on public.staff_attendance;
create policy attendance_staff_read_own on public.staff_attendance
for select to authenticated
using (staff_id = (select s.id from public.staff s where s.auth_user_id=auth.uid() and s.account_status='active' limit 1));

drop policy if exists attendance_staff_insert_own on public.staff_attendance;
create policy attendance_staff_insert_own on public.staff_attendance
for insert to authenticated
with check (staff_id = (select s.id from public.staff s where s.auth_user_id=auth.uid() and s.account_status='active' limit 1));

-- Staff can submit/update their pending record, but cannot approve it or mark absence.
drop policy if exists attendance_staff_update_own_pending on public.staff_attendance;
create policy attendance_staff_update_own_pending on public.staff_attendance
for update to authenticated
using (staff_id = (select s.id from public.staff s where s.auth_user_id=auth.uid() and s.account_status='active' limit 1) and status='pending')
with check (staff_id = (select s.id from public.staff s where s.auth_user_id=auth.uid() and s.account_status='active' limit 1) and status='pending' and source='staff');

-- Admin/CEO only should perform approval and status changes. Staff policy above only allows pending updates.

-- Optional helper view: approved days worked per staff.
create or replace view public.staff_days_worked as
select
  s.id as staff_id,
  s.staff_id as employee_number,
  s.full_name,
  count(*) filter (where a.status in ('present','late') and a.clock_in is not null) as days_worked
from public.staff s
left join public.staff_attendance a on a.staff_id=s.id
  and a.approved_at is not null
  and a.status in ('present','late')
group by s.id, s.staff_id, s.full_name;

-- NOTE: For stricter security, grant the view only to authenticated users through your existing role model.
