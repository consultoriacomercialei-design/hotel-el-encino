@AGENTS.md

## Reglas de trabajo (siempre activas)

- Piensa antes de actuar — lee archivos existentes antes de escribir código
- Sé conciso en el output pero exhaustivo en el razonamiento
- Prefiere editar sobre reescribir archivos completos
- No vuelvas a leer archivos que ya leíste a menos que el archivo pueda haber cambiado
- Prueba el código antes de declararlo terminado
- Sin openers ni cierres aduladores — ir directo al punto
- Mantén las soluciones simples y directas
- Las instrucciones del usuario siempre tienen prioridad sobre este archivo

## Deploy

```bash
cd /Users/consultoriacomercial/hotel-landing
vercel link --project hotel-encino --yes
npx next build && npx vercel deploy --prod
```

- **Siempre** vincular al proyecto `hotel-encino`, nunca a `hotel-landing`
- Agregar env vars con `printf 'valor' | vercel env add NOMBRE production`
