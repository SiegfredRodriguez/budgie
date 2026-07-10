# Budgie — Local Dev

## Supabase edge functions

Before testing any edge-function-dependent feature locally, ensure the functions runtime is running:

```bash
supabase functions serve
```

Keep this running in a separate terminal while developing. Otherwise `fetch()` calls to `/functions/v1/*` will fail with "invalid response from upstream server".

## Migrations

After creating a migration file, apply it locally:

```bash
supabase migration up
```

If you need to re-apply a modified migration (e.g. adding a grant), use:

```bash
supabase db query "SQL statement;"
```
