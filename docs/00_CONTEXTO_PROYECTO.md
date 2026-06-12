# 00 — Contexto del proyecto

## Nombre y propósito

**Polla Mundialista 2026** es una aplicación web recreativa para pronósticos deportivos de la **fase de grupos** del Mundial de Fútbol 2026.

Los participantes crean cartillas, pronostican resultados de partidos antes de que inicien, acumulan puntos según resultados reales cargados por un administrador y compiten en un ranking general informal.

> **Alcance actual:** solo fase de grupos (`GROUP_STAGE`). La segunda etapa por llaves fue analizada pero **no forma parte del alcance implementado ni autorizado** sin solicitud explícita.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS |
| Backend | Supabase (Auth, PostgreSQL, RLS, RPC, vistas) |
| Despliegue | Vercel |
| Entorno de desarrollo | Cursor |

### Dependencias principales (frontend)

- `next` — framework y enrutamiento
- `react` / `react-dom` — UI
- `@supabase/supabase-js` — cliente Supabase

### Variables de entorno

Archivo local: `.env.local` (no commitear).

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima del cliente |

---

## Estructura del repositorio

**No se usa carpeta `src/`.**

```
polla-mundialista/
├── app/              # Rutas Next.js (App Router)
├── components/       # Componentes React reutilizables
├── lib/              # Cliente Supabase, tipos, utilidades
├── public/           # Assets estáticos
├── docs/             # Documentación interna (este directorio)
├── AGENTS.md         # Reglas estrictas para agentes de IA
├── CLAUDE.md         # Referencia a AGENTS.md
└── package.json
```

### Alias de imports

Usar `@/` para rutas absolutas desde la raíz del proyecto:

```ts
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
```

---

## Convenciones generales

- **Idioma de la UI:** español.
- **Zona horaria de negocio:** Perú (`America/Lima`, offset `-05:00`).
- **Fechas de partidos:** `match_date` almacenado como `timestamp with time zone` en Supabase; mostrado al usuario en hora Perú.
- **Diseño:** Tailwind CSS, paleta emerald, responsive.
- **IDs:** UUID en base de datos y URLs (no índices numéricos de interfaz).

---

## Roles de usuario

| Rol (`profiles.role`) | Descripción |
|-----------------------|-------------|
| `participant` | Usuario estándar: cartillas, pronósticos, ranking, vista pública |
| `admin` | Administración: resultados, cartillas, configuración global |

---

## Documentación interna (índice)

| Archivo | Contenido |
|---------|-----------|
| [00_CONTEXTO_PROYECTO.md](./00_CONTEXTO_PROYECTO.md) | Este documento |
| [01_REGLAS_NEGOCIO.md](./01_REGLAS_NEGOCIO.md) | Reglas de negocio y puntaje |
| [02_BASE_DATOS_SUPABASE.md](./02_BASE_DATOS_SUPABASE.md) | Esquema, vistas, RPC, RLS |
| [03_FLUJOS_FUNCIONALES.md](./03_FLUJOS_FUNCIONALES.md) | Flujos por pantalla y actor |
| [04_PENDIENTES_Y_CAMBIOS.md](./04_PENDIENTES_Y_CAMBIOS.md) | Pendientes y restricciones futuras |

---

## Scripts npm

| Comando | Uso |
|---------|-----|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación y verificación TypeScript |
| `npm run lint` | ESLint |
| `npm run start` | Servidor de producción (post-build) |
