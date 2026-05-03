# RF01 - Registro y Autenticacion Segura

## Cumple
- Politica de contrasenas robustas en frontend con Zod (mayuscula, minuscula, numero, especial, minimo 8). Ver [frontend/src/schemas/auth.schema.ts](frontend/src/schemas/auth.schema.ts#L1).
- Politica de contrasenas robustas en backend (validacion Pydantic). Ver [app/models/schemas.py](app/models/schemas.py#L1).
- Rate limiting aplicado al endpoint de registro del backend. Ver [app/api/routes/auth.py](app/api/routes/auth.py#L1) y [app/core/security.py](app/core/security.py#L1).
- El flujo real de registro usa Supabase Auth (hashing y salting lo maneja Supabase). Ver [frontend/src/app/register/page.tsx](frontend/src/app/register/page.tsx#L1).

## Falta / Riesgo
### Alto
- (Resuelto) El registro ahora se realiza en el backend via Supabase Auth, por lo que la trazabilidad del hashing queda clara. Ver [app/api/routes/auth.py](app/api/routes/auth.py#L1) y [frontend/src/app/register/page.tsx](frontend/src/app/register/page.tsx#L1).

### Medio
- No hay rate limiting para login ni proteccion explicita contra fuerza bruta en el flujo real (Supabase Auth desde el frontend). El limiter solo cubre el endpoint simulado de registro. Ver [frontend/src/app/login/page.tsx](frontend/src/app/login/page.tsx#L1) y [app/api/routes/auth.py](app/api/routes/auth.py#L1).
- No hay mitigacion clara de enumeracion de usuarios en el flujo real. El frontend muestra errores directos de Supabase (pueden variar). Ver [frontend/src/app/login/page.tsx](frontend/src/app/login/page.tsx#L1) y [frontend/src/app/register/page.tsx](frontend/src/app/register/page.tsx#L1).
- El endpoint de rol devuelve 404 cuando no existe el usuario, lo que puede habilitar enumeracion por ID si se expone. Ver [app/api/routes/auth.py](app/api/routes/auth.py#L16).

### Bajo
- La politica de contrasenas esta duplicada en frontend y backend, pero el registro real no usa el backend; esto puede causar desalineacion si se cambia una sola. Ver [frontend/src/schemas/auth.schema.ts](frontend/src/schemas/auth.schema.ts#L1) y [app/models/schemas.py](app/models/schemas.py#L1).

## Notas
- Hashing fuerte: Supabase Auth cumple hashing con salting por defecto, pero no esta documentado en el codigo. Para evidenciarlo en el informe, conviene mencionar que el registro real se delega a Supabase Auth.
