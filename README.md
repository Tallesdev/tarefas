# To-Do List (PWA)

React + TypeScript + Vite, instalável como app (PWA), com Supabase no backend.

## Rodar localmente
npm install
npm run dev

## Variáveis de ambiente (Vercel → Settings → Environment Variables)
VITE_SUPABASE_URL  = URL do projeto Supabase
VITE_SUPABASE_KEY  = publishable key (sb_publishable_...) — chave pública; a proteção vem do RLS

Sem as variáveis, o app usa os valores padrão do projeto em src/lib/supabase.ts.

## Deploy
Importar o repositório na Vercel (framework: Vite). O vercel.json já cuida das rotas e dos headers de segurança.

Depois do primeiro deploy, no Supabase: Authentication → URL Configuration → Site URL = endereço da Vercel.
