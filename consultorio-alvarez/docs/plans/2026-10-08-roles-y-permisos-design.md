# Roles y permisos — Diseño

**Fecha:** 2026-10-08
**Estado:** diseño aprobado en conversación, pendiente de plan de implementación.

Este documento es el diseño, no el plan. Describe qué se construye y por qué.

---

## 1. El problema

La app tiene una columna de rol y ninguna capa que haga cumplir un permiso.

**Existe el rol.** `public.usuarios.rol` admite `superadmin`, `admin`, `profesional` y
`secretaria` (`supabase/migrations/001_schema_completo.sql:44`, ampliado en
`017_add_superadmin_role.sql:4-9`). En producción hay 7 usuarios: 3 `admin` y 4
`profesional`, repartidos en dos consultorios. Ninguno es `secretaria`.

**No existe el control.** Tres agujeros encadenados:

1. **RLS no discrimina por rol.** Las políticas vivas son
   `FOR ALL USING (tenant_id = get_user_tenant_id())`
   (`001_schema_completo.sql:315-331`), sobre `usuarios`, `profesionales`, `pacientes`,
   `turnos`, `historial_clinico`, `cobros`, `presupuestos`, `odontograma_piezas` y más.
   A nivel base de datos, cualquier usuario autenticado del consultorio tiene CRUD
   completo sobre todo, incluida la tabla `usuarios`: un profesional puede cambiarse el
   rol a sí mismo.
2. **Las server actions saltean RLS.** Usan `createAdminClient()` (service_role) en 18
   archivos. `src/lib/actions/config.ts:7` lo dice: *"All config actions use the admin
   client (service_role key) to bypass RLS… Once Auth is implemented, we'll validate
   permissions here before executing"*. Esa validación nunca se escribió.
3. **El middleware no mira el rol.** `src/proxy.ts:171-175` sólo exige sesión, y
   `:26-32` deja pasar las Server Actions sin tocarlas, con el comentario de que
   "gestionan su propia autenticación y permisos internamente".

Lo único que existe hoy es cosmética: tres `redirect` en páginas
(`configuracion/page.tsx:9-12`, `cobros/page.tsx:11-14`, `mis-pagos/page.tsx:16-24`) y
el sidebar que oculta un grupo de links (`Sidebar.tsx:320`). Un profesional que invoque
`crearProfesional` o `eliminarProfesional` directamente lo logra.

**Storage está abierto.** El bucket `paciente_adjuntos` se creó con `public = true` y
política `FOR SELECT TO public` (`004_paciente_adjuntos.sql:24-30`): cualquiera con la
URL lee radiografías y estudios sin estar logueado. El bucket `avatars`, con fotos de
pacientes, igual (`003_pacientes_fotourl.sql:18-21`). El borrado acepta a cualquier
autenticado de cualquier consultorio, sin filtro de tenant
(`004_paciente_adjuntos.sql:35`).

## 2. Objetivo

Que el permiso lo haga cumplir la base de datos, no la buena memoria de quien escribe la
próxima server action. Y que un profesional externo no pueda llevarse la cartera de
pacientes del consultorio.

Criterios de éxito:

1. Un profesional no puede leer teléfono, email ni DNI de ningún paciente, ni desde la
   interfaz, ni desde la base local de su computadora, ni llamando una server action a
   mano.
2. Un profesional ve únicamente los turnos que tiene asignados.
3. Las operaciones administrativas (equipo, credenciales, configuración, cobros) fallan
   para un profesional aunque se invoquen salteando la interfaz.
4. Un usuario de un consultorio no puede leer ni borrar archivos de otro.

## 3. Fuera de alcance

- **Registro de auditoría** (quién vio o modificó qué y cuándo). Es un sub-proyecto
  propio, posterior a este.
- **Privacidad entre colegas del mismo consultorio** más allá de la agenda: un
  profesional sí ve las evoluciones que cargó otro sobre un paciente que ambos atienden.
  El aislamiento es contra el exterior y contra lo administrativo, no entre pares.
- **Cambiar el modelo de pertenencia del paciente.** Los pacientes siguen siendo del
  consultorio, no de un profesional.

## 4. Decisiones tomadas

| Decisión | Valor |
|---|---|
| Roles del consultorio | `admin` y `profesional`. `secretaria` se elimina. |
| Equipo y credenciales | Sólo `admin`. |
| Datos personales del paciente | El profesional ve nombre y apellido; nunca teléfono, email, DNI, CUIT ni dirección. |
| Agenda | El profesional ve sólo sus turnos asignados. |
| Pantalla Pacientes | Sólo `admin`. El profesional llega a una ficha desde su agenda. |
| Evoluciones | Crea y edita. Borra sólo las propias. |
| Cobros | No los ve. |
| Presupuestos | Los arma y los ve. |
| Asignación de turnos | La hace recepción/admin. |
| Selección de profesional en la web | Configurable por consultorio. |
| Turno sin asignar | `turnos.profesional_id` pasa a admitir `NULL`. |

## 5. Modelo de roles

`secretaria` se elimina del `CHECK` y el `DEFAULT` de la columna pasa de `'secretaria'` a
`'profesional'`, que es el valor menos peligroso si alguna vez se crea una fila sin rol
explícito. No hay filas que migrar.

`sendPushToRole` se invoca hoy con `'secretaria'` desde
`src/app/api/webhooks/whatsapp/route.ts:542,581`, `src/lib/whatsapp-auto-flow.ts:648,781`
y `src/lib/actions/reservas.ts:626`. Esos avisos **hoy no le llegan a nadie**, porque
ningún flujo asigna ese rol. Pasan a `'admin'`, que es quien atiende la recepción.

`src/types/index.ts:58` declara `export type Rol = 'admin' | 'profesional' | 'secretaria'`,
sin `superadmin`, que sí se usa en runtime. Queda
`'superadmin' | 'admin' | 'profesional'`.

## 6. El actor

Un único origen de identidad: `getActor()` devuelve
`{ userId, tenantId, rol, profesionalId }`, cacheado por request.

Hoy esa información está dispersa entre `getTenantId()` y `getCurrentUsuario()`
(`src/lib/supabase/queries.ts:51,62`), cada una con su propio cache y ambas leyendo con
el cliente admin. Todo el resto del diseño cuelga de este helper: las server actions lo
llaman para autorizar, y el `profesionalId` es lo que acota la agenda y el borrado de
evoluciones.

En SQL, la contraparte es `get_user_rol()`, análoga a la `get_user_tenant_id()` que ya
existe (`001_schema_completo.sql:302-306`): `STABLE`, `SECURITY DEFINER`, lee
`public.usuarios` por `auth.uid()`. Se agrega también `get_user_profesional_id()`.

## 7. RLS deja de ser decorativa

Este es el núcleo del trabajo y su mayor riesgo.

Supabase tiene dos clientes: uno lleva la sesión del usuario y sus consultas pasan por
RLS; el otro usa la `service_role` key e ignora RLS por completo. Hoy las server actions
usan el segundo para casi todo, así que **cualquier política que se escriba no se evalúa
nunca** en esos caminos.

Las lecturas y escrituras de la app pasan al cliente con sesión. `service_role` queda
únicamente donde no hay usuario detrás:

- `src/app/api/webhooks/whatsapp/route.ts` y `src/app/api/webhooks/mercadopago/route.ts`
- los cron de `src/app/api/cron/*`
- `src/lib/actions/superadmin.ts` (opera cruzando consultorios, por diseño)
- la reserva pública de `src/lib/actions/reservas.ts`, que corre sin sesión

En esos lugares el aislamiento por consultorio sigue dependiendo del código, y conviene
saberlo: el webhook de WhatsApp resuelve el tenant por número de teléfono, y un error ahí
cruza consultorios sin que RLS lo vea.

Las políticas pasan de `FOR ALL` a una por operación:

| Tabla | SELECT | INSERT / UPDATE | DELETE |
|---|---|---|---|
| `pacientes` | sólo `admin` sobre la tabla base; el profesional usa la vista (§8) | sólo `admin` directo; el profesional edita lo clínico por una acción acotada (§8) | `admin` |
| `turnos` | `admin` todos; profesional sólo los suyos (§9) | `admin`; el profesional sólo el `estado` de los suyos | `admin` |
| `historial_clinico` | tenant | tenant | `admin`, o el profesional sobre las propias |
| `odontograma_piezas`, `paciente_adjuntos`, `escaneos_3d` | tenant | tenant | `admin`, o el profesional sobre las propias |
| `presupuestos`, `presupuesto_items` | tenant | tenant | `admin` |
| `cobros` | sólo `admin` | sólo `admin` | sólo `admin` |
| `usuarios` | el propio registro; `admin` todo el consultorio | sólo `admin` | sólo `admin` |
| `profesionales`, `tipos_tratamiento`, `obras_sociales`, `tenants` | tenant | sólo `admin` | sólo `admin` |

## 8. Ocultar los datos de contacto

**El punto que define esta sección:** la app es local-first. `fetchFullSnapshotAction`
baja los pacientes completos a IndexedDB de esa computadora
(`src/lib/actions/offline-sync.ts`). Enmascarar sólo en pantalla no sirve de nada: el
teléfono quedaría en la máquina del profesional, legible con F12. **El filtro va en el
origen.**

Tres piezas:

1. **Vista `pacientes_clinico`.** Expone `id`, `tenant_id`, `nro_historia_clinica`,
   `nombre`, `apellido`, `fecha_nacimiento`, `genero`, `obra_social_id`,
   `motivo_consulta`, `alergias`, `medicacion_actual`, `antecedentes`, `created_at`,
   `updated_at`. Deja afuera `telefono`, `email`, `dni`, `cuit`, `direccion`, `ciudad`,
   `n_afiliado` y `notas_internas`. La vista corre con privilegios de su dueño, así que
   filtra `WHERE tenant_id = get_user_tenant_id()` ella misma.
2. **RLS en la tabla base** le niega `SELECT` al profesional, de modo que la vista sea su
   único camino.
3. **El snapshot y el pull incremental** eligen origen según el rol del actor: `pacientes`
   para `admin`, `pacientes_clinico` para `profesional`. La copia local de un profesional
   nunca contiene un teléfono.

**Editar lo clínico.** Una vista no es actualizable sin reglas ni triggers, y RLS no sabe
restringir columnas. Para que el profesional pueda corregir alergias, medicación,
antecedentes y motivo de consulta sin tocar los datos de contacto, va una server action
acotada, `actualizarDatosClinicosPaciente`, que valida el rol con `getActor()` y escribe
únicamente esas cuatro columnas. Es el único lugar donde un profesional modifica la tabla
`pacientes`, y la lista blanca de columnas vive ahí, en un solo archivo revisable.

Consecuencia que hay que aceptar: si un usuario cambia de rol, su base local queda con
datos de más o de menos. El cambio de rol invalida la base local y fuerza un snapshot
nuevo.

## 9. Alcance de la agenda

Política en `turnos`: el profesional ve sólo las filas con
`profesional_id = get_user_profesional_id()`. Eso acota la agenda y también la ficha del
paciente, donde verá únicamente sus propios turnos con esa persona.

El profesional puede cambiar el `estado` de sus turnos (`EN_SALA`, `ATENDIDO`), que es
parte de atender. No puede crear, reprogramar ni reasignar: eso es de recepción.

La pantalla `/pacientes` pasa a ser de `admin`. El profesional llega a una ficha haciendo
clic en un turno de su agenda. Es la decisión que más protege la cartera de pacientes: sin
listado no hay nada que exportar.

## 10. Reserva online

Columna nueva `tenants.reserva_web_elige_profesional BOOLEAN NOT NULL DEFAULT true`. En
`true` no cambia nada, que es lo que necesita Consultorio Alvarez, donde el paciente elige
entre padre e hijo. Curadent la pone en `false`.

Con la selección oculta, el paciente elige tratamiento y horario, y el turno entra **sin
profesional**, en estado `PENDIENTE`, para que recepción lo asigne.

Eso exige que `turnos.profesional_id` admita `NULL`, que hoy es `NOT NULL`
(`001_schema_completo.sql:127`). El cambio repercute en:

- la agenda, que agrupa por profesional y necesita una columna o carril "Sin asignar";
- los recordatorios, que nombran al profesional en el mensaje;
- `LocalTurno` en `src/lib/offline/db.ts`, donde el campo es obligatorio;
- `getTurnosAgendaLocal`, que filtra por `profesional_id`.

**Interfaz:** sección nueva "Reservas online" en el grupo *Operación y Turnos* de
Configuración, junto a Horarios de Atención. No va en "Mi Portal Web", que es marca y
textos de la landing, ni dentro de Horarios, que es días hábiles e intervalos. La sección
nueva deja lugar para las reglas de reserva que vengan después.

## 11. Storage

Los dos buckets pasan a privados y las políticas derivan el consultorio de la ruta del
archivo, que ya incluye el `tenant_id` en las subidas actuales.

- `paciente_adjuntos`: `public = false`. `SELECT`, `INSERT` y `DELETE` exigen que el
  primer segmento de `storage.objects.name` sea el `tenant_id` del usuario. `DELETE`
  exige además `admin`.
- `avatars`: igual, salvo que las fotos de profesionales que la landing pública muestra
  siguen siendo legibles sin sesión. Conviene separarlas en un bucket propio
  (`perfiles_publicos`) en vez de dejar abierto el bucket que también guarda fotos de
  pacientes.
- Donde hoy se arma una URL pública se pasa a URL firmada con vencimiento corto.

Esta sección arregla una exposición que es anterior a este trabajo y no depende del resto:
puede salir antes que todo lo demás.

## 12. Código e interfaz

Cada server action abre con `getActor()` y declara lo que exige: `requireAdmin()` o
`requireRol('admin')`. Esa capa existe para dar errores claros y para que la interfaz
pueda esconder lo que no corresponde; la base de datos es la que realmente frena.

En la interfaz:

- El sidebar ya deriva `isProfesional` (`Sidebar.tsx:190`). Se le suma ocultar Pacientes.
- Los tabs de la ficha se arman según rol: el profesional no ve Cobros y sí Presupuestos.
- La ficha del paciente, para un profesional, no renderiza el bloque de contacto, porque
  no tiene esos campos.
- Configuración gana la sección "Reservas online".

## 13. Migraciones

1. `019_roles_sin_secretaria.sql` — nuevo `CHECK`, `DEFAULT 'profesional'`.
2. `020_helpers_rol.sql` — `get_user_rol()`, `get_user_profesional_id()`.
3. `021_rls_por_rol.sql` — reemplaza las políticas `FOR ALL` por las de §7.
4. `022_vista_pacientes_clinico.sql` — la vista y la negación de la tabla base.
5. `023_turnos_profesional_nullable.sql` — `DROP NOT NULL`.
6. `024_reserva_web_elige_profesional.sql` — columna en `tenants`.
7. `025_storage_privado.sql` — buckets privados y políticas por ruta.

## 14. Riesgos y orden

El riesgo real es salir de `service_role`: hoy esos 18 archivos pueden todo, y con RLS
cualquier política de más rompe una pantalla que funcionaba. No se hace de una.

Orden propuesto, cada paso desplegable y verificable por separado:

1. Storage (§11). Independiente y urgente.
2. Roles y helpers (§5, §6). No cambia comportamiento todavía.
3. `requireAdmin()` en las server actions administrativas (§12). Cierra el agujero más
   grande sin tocar RLS.
4. RLS por rol (§7), módulo por módulo, pasando cada uno al cliente con sesión y
   verificando sus pantallas.
5. Vista de contacto y snapshot por rol (§8).
6. Agenda acotada y `/pacientes` sólo admin (§9).
7. Reserva online y turno sin asignar (§10).

## 15. Verificación

El proyecto tiene Vitest sólo para lógica pura. Lo testeable automáticamente acá es el
mapa de rol a capacidades, si se lo extrae a un módulo puro. El resto es manual.

Pruebas, cada una con una cuenta `profesional` real:

1. Invocar `crearProfesional` y `eliminarProfesional` directamente: deben fallar.
2. Leer `cobros` con el cliente de sesión: debe devolver vacío.
3. Abrir la ficha de un paciente y buscar teléfono, email o DNI en el HTML y en IndexedDB:
   no deben estar.
4. Abrir la agenda: sólo turnos propios.
5. Borrar una evolución de un colega: debe fallar. Borrar una propia: debe funcionar.
6. Entrar a `/pacientes` por URL directa: debe redirigir.
7. Con un usuario de un consultorio, pedir un archivo de otro: debe fallar.
8. Cambiar el rol de un usuario y confirmar que su base local se rehace.
9. Con `reserva_web_elige_profesional = false`, reservar desde la web y confirmar que el
   turno entra sin profesional y aparece para asignar.
10. Con `true`, confirmar que Alvarez sigue funcionando igual que hoy.
