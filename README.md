# Vesto Catálogo

White-label de catálogo digital para atacado de moda. Painel admin com preview interativo, publicação por subdomínio e painel super admin para gerenciar lojistas.

## Stack

- Next.js (App Router)
- Tailwind CSS
- TypeScript
- Supabase (Auth + Postgres)

## Local

1. Copie `.env.example` para `.env.local` e preencha as chaves do Supabase.
2. Aplique o schema e migrations:

```bash
npm install
npm run db:apply
```

3. Crie um usuário no Supabase (Authentication → Users) ou use o painel super admin após o primeiro login.
4. Defina `SUPER_ADMIN_EMAIL` com o e-mail do seu usuário admin.
5. Rode:

```bash
npm run dev
```

- Admin: `http://localhost:3000/admin`
- Catálogo publicado (local): `http://localhost:3000/catalog/{slug}`

## Painel Super Admin

Após login com o e-mail configurado em `SUPER_ADMIN_EMAIL`:

- `/admin/super` — listar usuários, criar lojistas, ativar/desativar contas
- Cada lojista recebe um **slug** fixo (ex.: `baseset`) que vira o subdomínio do catálogo

## Publicação do catálogo

1. O lojista edita marca e produtos em `/admin`
2. Clica em **Publicar**
3. O catálogo fica visível em `{slug}.{NEXT_PUBLIC_ROOT_DOMAIN}` (ex.: `baseset.catalogo.vercel.app`)

Enquanto não publicado, a URL retorna 404 para visitantes.

## Deploy na Vercel

### 1. Variáveis de ambiente

Em **Settings → Environment Variables** (Production, Preview e Development):

| Nome | Descrição |
|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publishable (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (somente servidor) |
| `SUPER_ADMIN_EMAIL` | Seu e-mail de super admin |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Domínio raiz, ex.: `catalogo.vercel.app` |

### 2. Subdomínios wildcard

Para URLs como `baseset.catalogo.vercel.app`:

1. Na Vercel, em **Settings → Domains**, adicione `catalogo.vercel.app` (ou seu domínio customizado)
2. Adicione também `*.catalogo.vercel.app` (wildcard)
3. Configure `NEXT_PUBLIC_ROOT_DOMAIN=catalogo.vercel.app`

O middleware reescreve `{slug}.catalogo.vercel.app` → catálogo publicado do slug.

### 3. Supabase Auth

Em **Authentication → URL Configuration**:

- **Site URL**: `https://catalogo.vercel.app` (ou seu domínio)
- **Redirect URLs**: `https://catalogo.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`

### 4. Deploy

Faça push para o repositório ou importe na Vercel. Após alterar env vars, rode **Redeploy**.

## Estrutura de rotas

| Rota | Descrição |
|------|-----------|
| `/admin/login` | Login |
| `/admin` | Painel do lojista |
| `/admin/super` | Painel super admin |
| `/catalog/[slug]` | Catálogo público (também via subdomínio) |
