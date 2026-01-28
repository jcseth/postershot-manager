# Integración del Dashboard - Instrucciones

## 1. Instalar dependencias

Ejecuta en tu terminal:

```bash
npm install @supabase/supabase-js xlsx recharts lucide-react
```

## 2. Estructura de archivos

Crea estas carpetas y archivos en tu proyecto:

```
tu-proyecto/
├── app/
│   └── page.tsx                    ← REEMPLAZAR
├── lib/
│   └── supabase.ts                 ← CREAR
├── types/
│   └── database.ts                 ← CREAR
├── hooks/
│   └── useFinancialData.ts         ← CREAR
├── components/
│   ├── dashboard/
│   │   └── PosterShotDashboard.tsx ← CREAR
│   ├── finances/
│   │   └── FinancesView.tsx        ← CREAR
│   └── kpis/
│       └── KPIsView.tsx            ← CREAR
└── .env.local                      ← Ya tienes las vars en Vercel
```

## 3. Configurar tsconfig.json

Asegúrate de que tu `tsconfig.json` tenga el path alias `@`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## 4. Orden de integración

1. **Primero**: Crea `lib/supabase.ts`
2. **Segundo**: Crea `types/database.ts`
3. **Tercero**: Crea `hooks/useFinancialData.ts`
4. **Cuarto**: Crea los componentes en `components/`
5. **Quinto**: Actualiza `app/page.tsx`

## 5. Verificar Supabase

Antes de probar, verifica que:
- El schema se ejecutó correctamente en Supabase
- Las variables de entorno están en Vercel
- Hay datos en las tablas `planes_suscripcion`, `productos`, `cuotas_mensuales`

## 6. Probar localmente (opcional)

Si quieres probar en local:

```bash
# Crear .env.local con tus credenciales
echo "NEXT_PUBLIC_SUPABASE_URL=tu_url" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key" >> .env.local

# Ejecutar
npm run dev
```

## 7. Deploy

Una vez que subas los cambios a GitHub:

```bash
git add .
git commit -m "feat: nuevo dashboard con Supabase"
git push
```

Vercel detectará los cambios y hará deploy automáticamente.

---

## Troubleshooting

### Error: "supabase is not defined"
- Verifica que `lib/supabase.ts` existe y exporta correctamente

### Error: "Cannot find module '@/...'"
- Verifica que `tsconfig.json` tiene el path alias configurado

### No se cargan datos
- Revisa la consola del navegador (F12)
- Verifica que las tablas en Supabase tienen datos
- Confirma que las variables de entorno están correctas

### El Excel no se procesa
- Usa las plantillas oficiales que te di
- Verifica que el archivo tiene las hojas correctas

---

## Archivos incluidos

| Archivo | Descripción |
|---------|-------------|
| `lib/supabase.ts` | Cliente de Supabase |
| `types/database.ts` | Tipos TypeScript |
| `hooks/useFinancialData.ts` | Hooks para cargar datos |
| `components/dashboard/PosterShotDashboard.tsx` | Dashboard principal |
| `components/finances/FinancesView.tsx` | Vista de finanzas y carga Excel |
| `components/kpis/KPIsView.tsx` | KPIs detallados |
| `app/page.tsx` | Página principal |
