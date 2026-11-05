-- Keep updated_at honest: the columns default to now() on insert, but nothing
-- moved them on update, so a patched alert rule or profile kept its creation
-- time.

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'layouts', 'alert_rules', 'wall_packs', 'desk_packs'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
