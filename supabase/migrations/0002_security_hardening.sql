-- Correções apontadas pelo verificador de segurança do Supabase (já aplicadas no projeto)
alter function public.set_updated_at() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;
