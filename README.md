# Vesto Catálogo

White-label de catálogo digital para atacado de moda. Painel admin com preview interativo do catálogo.

## Stack

- Next.js (App Router)
- Tailwind CSS
- TypeScript
- Supabase (Postgres)

## Local

1. Copie `.env.example` para `.env.local` e preencha as chaves do Supabase.
2. Garanta que o schema em `supabase/schema.sql` já foi executado no SQL Editor do projeto.
3. Rode:

```bash
npm install
npm run dev
```

## Deploy na Vercel (manual)

### 1. Suba o código no GitHub

No repositório `https://github.com/Leonardotrentini/catalogo.git`, faça commit e push da branch `main` (incluindo `@supabase/supabase-js`, `src/lib/supabase/`, `supabase/schema.sql` e `.env.example`).

**Não** envie `.env.local` (já está no `.gitignore`).

### 2. Crie o projeto na Vercel

1. Em [vercel.com](https://vercel.com) → **Add New…** → **Project**
2. Importe o repositório `Leonardotrentini/catalogo`
3. Framework: **Next.js** (detectado automaticamente)
4. Root Directory: `.` (padrão)
5. Build Command: `npm run build`
6. Output: deixe o padrão do Next.js

### 3. Variáveis de ambiente (obrigatório)

Em **Settings → Environment Variables**, adicione para **Production**, **Preview** e **Development**:

| Nome | Valor |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://olzgxpzhtipugyovivwv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sua chave `sb_publishable_…` |

Sem essas variáveis o app sobe, mas não conecta no banco.

### 4. Deploy

Clique em **Deploy**. Depois de publicar, se alterar as env vars, faça um **Redeploy**.

### 5. Conferir

Abra a URL da Vercel, edite a marca ou um produto, recarregue a página — os dados devem permanecer (mesmo banco do local).
