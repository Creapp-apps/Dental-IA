# Reintentos del outbox de sincronización — Diseño

**Fecha:** 2026-10-08
**Estado:** diseño aprobado en conversación, pendiente de plan de implementación.

Este documento es el diseño, no el plan. Describe qué se construye y por qué.
El plan paso a paso se escribe después, a partir de acá.

---

## 1. El problema

La app guarda local-first: toda mutación se escribe primero en IndexedDB y se
encola en `sync_outbox` para subirla a Supabase. Lo usan turnos, pacientes y
evoluciones. La subida tiene tres agujeros encadenados.

**Un cambio que falla una vez no se reintenta nunca más.** `synchronize()`
levanta únicamente los items en estado `PENDIENTE`
(`src/lib/offline/sync-manager.ts:310`). Cuando el push falla, el item pasa a
`ERROR` (`sync-manager.ts:323`) y queda fuera de toda sincronización futura,
manual o automática.

**Nadie se entera.** El widget de sincronización cuenta sólo los `PENDIENTE`
(`sync-manager.ts:113`, consumido en
`src/components/offline/OfflineSyncWidget.tsx:124`). Un item que pasa a `ERROR`
desaparece de la cuenta: el indicador vuelve a verde y dice "0 cambios sin
subir" mientras el dato está varado en esa computadora.

**El contador de intentos nunca existió.** `SyncOutboxItem.attempts`
(`src/lib/offline/db.ts:110`) se inicializa en `0` (`sync-manager.ts:393`) y no
se incrementa en ningún lado. El campo estaba previsto para esto y quedó sin
cablear.

El efecto combinado es el peor posible para una historia clínica: una evolución
puede quedar sólo en una computadora, indefinidamente, mientras la interfaz
afirma que está todo sincronizado.

### Qué causa realmente un `ERROR`

`pushOutboxChangesAction` es una server action. Si la computadora está sin
internet, la llamada tira excepción, cae en el `catch` general de
`synchronize()` y los items **quedan en `PENDIENTE`**. Eso ya funciona bien y no
hay que tocarlo.

`ERROR` sólo ocurre cuando el servidor **sí** respondió y Supabase rechazó la
operación. Ahí se mezclan dos situaciones que exigen respuestas opuestas:

- **Transitorias:** Supabase caído, timeout, pool de conexiones agotado.
  Reintentar las resuelve.
- **Permanentes:** clave duplicada, el paciente ya no existe, RLS rechaza.
  Reintentar no cambia nada.

Hoy las dos terminan igual: muertas y mudas. Distinguirlas es el núcleo de este
diseño.

## 2. Objetivo y criterios de éxito

Que ningún cambio hecho en una computadora del consultorio se pierda en
silencio.

1. Un fallo transitorio se reintenta solo, con espera creciente, sin que el
   usuario haga nada.
2. Un fallo permanente deja de consumir reintentos y queda visible como algo
   que requiere una decisión humana.
3. El indicador de sincronización nunca muestra verde habiendo cambios sin
   subir.
4. Nada se descarta automáticamente. Descartar es siempre una acción explícita
   del usuario, informada de su consecuencia.

## 3. Fuera de alcance

- Resolución de conflictos entre puestos. El modelo sigue siendo el actual: la
  última escritura que llega, gana.
- Cola durable del lado del servidor. Se evaluó y se descartó: cuando la
  conexión falla, el pedido no llega al servidor, así que una cola allá no ve
  nada. Sólo ayudaría con la minoría de fallos posteriores a la llegada.
- Cambios en el pull incremental o en el snapshot completo.

## 4. Máquina de estados del outbox

`SyncOutboxItem.status` (`db.ts:111`) tiene hoy tres valores y dos no se usan:
`EN_PROCESO` nunca se asigna y `ERROR` es un callejón sin salida. Quedan dos
estados reales:

- **`PENDIENTE`** — esperando subir. Es elegible cuando `next_attempt_at` está
  vacío o su momento ya pasó.
- **`ATASCADO`** — agotó los reintentos o falló por algo permanente. No se
  reintenta solo; espera decisión del usuario.

`EN_PROCESO` se elimina por muerto. `ERROR` se renombra a `ATASCADO`, que dice
lo que el estado realmente significa.

### Campos nuevos en `SyncOutboxItem`

| Campo | Tipo | Para qué |
|---|---|---|
| `next_attempt_at` | `string \| null` (ISO) | Momento a partir del cual el item vuelve a ser elegible |
| `last_error_code` | `string \| undefined` | Código de Postgres del último fallo, para clasificar y para mostrar |

`attempts` por fin se incrementa. `error_message` ya existe y se conserva.

### Escalera de espera

Cada fallo transitorio incrementa `attempts` y fija `next_attempt_at` según el
valor nuevo:

| `attempts` tras el fallo | Espera hasta el próximo intento |
|---|---|
| 1 | 5 s |
| 2 | 15 s |
| 3 | 1 m |
| 4 | 5 m |
| 5 | 15 m |
| 6 | 1 h |
| 7 | no hay próximo intento: pasa a `ATASCADO` |

Es decir, seis esperas y un máximo de siete intentos de subida antes de pedir
intervención humana.

### Al volver la conexión

En el evento `online` se limpia el `next_attempt_at` de los items `PENDIENTE`,
pero **no** el contador de `attempts`. La espera se calculó contra una condición
que acaba de cambiar, así que sostenerla no tiene sentido; conservar `attempts`
evita que reconectar varias veces convierta la escalera en infinita.

### Orden de la cola

Hoy `synchronize()` hace `.where('status').equals('PENDIENTE').toArray()`, que
devuelve en orden del índice, no de inserción. Pasa a ordenarse por `id`
ascendente antes de empujar: dos operaciones sobre la misma fila tienen que
aplicarse en el orden en que las hizo el odontólogo.

### Bloqueo por entidad

Si un item de una fila queda `ATASCADO`, los items posteriores **de esa misma
fila** (mismo `entity` y `entity_id`) se saltean y esperan. Aplicar una
modificación encima de una creación que nunca entró deja la base inconsistente.
Los cambios de otras filas siguen subiendo normalmente.

### Migración de las bases locales existentes

Dexie `version(4)`. Los items que hoy están en `ERROR` pasan a `PENDIENTE` con
`attempts` en `0`. Son datos que ahora mismo están varados en las computadoras
del consultorio: con esto se les da la escalera nueva y, si el fallo era
permanente, terminan en `ATASCADO` y por fin se ven. Hoy no se ven ni se
recuperan.

## 5. Clasificación del error

La decisión de si algo se reintenta se toma **en el servidor**, dentro de
`pushOutboxChangesAction`, que es el único lugar donde existe el error real de
Postgres con su código. El cliente no interpreta mensajes: recibe el veredicto y
obedece.

`PushResultItem` (`src/lib/actions/offline-sync.ts:26`) pasa de
`{ outbox_id, success, error }` a sumar `error_code?: string` y
`retriable: boolean`.

### Permanentes

Van directo a `ATASCADO` sin gastar reintentos.

| Código | Qué pasó |
|---|---|
| `23505` | Clave duplicada (DNI o N° de historia clínica repetido) |
| `23503` | La fila referenciada ya no existe (el paciente fue borrado) |
| `23502` | Falta un dato obligatorio |
| `23514` | Viola una regla de la tabla |
| `22P02` | Valor con formato inválido (UUID o número mal formado) |
| `42501` | RLS rechazó la operación |
| `42703`, `42P01`, `PGRST204` | La app quedó vieja respecto del esquema de la base |

También es permanente la discrepancia de tenant que ya detecta
`pushOutboxChangesAction`.

### Transitorios

Reintentan con la escalera: `57014` (timeout de consulta), `53300` y `53400`
(límites del pooler), `08000`, `08003` y `08006` (fallos de conexión), `40001`
(serialización), `40P01` (deadlock), `XX000` (error interno, que en Supabase
suele ser el pooler), y cualquier 5xx o excepción de red.

### Código desconocido

Se trata como **transitorio**. Es la decisión discutible de esta sección, así
que queda escrito el razonamiento: marcar atascado al primer error raro avisa
antes, pero llena el widget de rojo por hipos que se arreglaban solos, y un
indicador que alarma de más se vuelve ruido que nadie mira. Como el tope son
seis intentos, un error desconocido que sea permanente igual termina visible en
poco más de una hora. El costo de esperar está acotado; el de gritar en falso,
no.

## 6. Dos prerrequisitos que esto destapa

### Idempotencia: `insert` pasa a `upsert`

Reintentar exige que repetir una operación sea inofensivo. Si el push llega a
Supabase pero la respuesta se pierde en el camino, el item queda en `PENDIENTE`
y se reintenta. Hoy turnos y pacientes usan `.insert()`
(`offline-sync.ts`, ramas `turnos` y `pacientes`), así que ese reintento falla
con clave duplicada: un error permanente, que marcaría como atascado un dato que
**en realidad ya está en la nube**. El usuario vería un problema falso y podría
descartar un registro que estaba bien.

Las dos ramas pasan a `upsert`, como ya quedó la de evoluciones. Sin esto, la
clasificación de `23505` como permanente es incorrecta y los reintentos crean un
bug peor que el que arreglan.

### Sesión vencida

Si `getAuthenticatedTenantId()` devuelve `null`, `pushOutboxChangesAction`
responde `[]` y los items se quedan pendientes para siempre sin que nadie se
entere. Con la lista de entrada no vacía, un `[]` de vuelta pasa a interpretarse
como fallo de autenticación: se expone en `SyncStatus.authError` y el widget lo
dice en texto ("La sesión venció, volvé a iniciar sesión").

## 7. Lo que ve el usuario

`SyncStatus` suma `atascadosCount` y `authError`.

### Indicador contraído

Por prioridad:

1. **Rojo** si hay atascados: "2 cambios con problema". El rojo gana sobre el
   ámbar, porque un pendiente normal puede esperar y un atascado no se va a
   resolver solo.
2. **Rojo con texto propio** si la sesión venció.
3. **Ámbar** si hay pendientes, como hoy.
4. **Verde** sólo si no hay nada de lo anterior. Hoy el verde miente cuando hay
   un `ERROR`; con esto deja de mentir.

El estado desconectado se mantiene como está.

### Panel abierto

Sección nueva, "Cambios con problema". Cada item muestra tres cosas:

1. **Qué es, en castellano.** "Paciente Ana Gómez — modificación", "Turno del
   12/10 — alta", "Evolución del 08/10 — alta". Se arma resolviendo `entity_id`
   contra la tabla local correspondiente; si la fila ya no está, se cae al
   `payload` guardado en el propio item.
2. **Cuándo se hizo**, con el `created_at` del item.
3. **Por qué falló**, traducido. Un diccionario de código a frase, en un solo
   lugar:

   - `23505` → "Ya existe otro registro con ese dato, por ejemplo el mismo DNI o
     número de historia clínica."
   - `23503` → "El paciente al que pertenece este cambio ya no existe en la
     nube."
   - `42501` → "Tu usuario no tiene permiso para hacer este cambio."
   - `42703`, `42P01`, `PGRST204` → "La aplicación quedó desactualizada.
     Recargá la página."
   - Sin código conocido, el mensaje técnico tal cual, que es mejor que nada.

Dos botones por item, **Reintentar** y **Descartar**. Con varios atascados, un
**Reintentar todos** en la cabecera de la sección.

Reintentar devuelve el item a `PENDIENTE` con `attempts` en `0` y
`next_attempt_at` vacío.

### Descartar no es "dejarlo acá"

Descartar borra el item de la cola, pero la fila sigue en IndexedDB. Como ya no
queda nada pendiente para esa fila, la próxima sincronización la va a borrar del
equipo: el snapshot completo limpia pacientes y turnos, y
`reconciliarEvolucionesLocal` borra las evoluciones locales que el server no
tiene y que no tienen operaciones pendientes.

Por eso el modal de confirmación no pregunta "¿seguro?". Muestra el contenido
del cambio que se va a tirar —qué paciente, qué texto, qué fecha— y avisa en una
línea: **este cambio no se va a guardar en la nube y va a desaparecer de esta
computadora en la próxima sincronización.** Que el odontólogo pueda copiarlo a
mano antes de aceptar, si era una evolución que escribió.

## 8. Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/lib/offline/db.ts` | `version(4)`, estados nuevos, campos `next_attempt_at` y `last_error_code`, migración de los `ERROR` existentes |
| `src/lib/offline/sync-manager.ts` | Escalera de espera, incremento de `attempts`, orden por `id`, bloqueo por entidad, limpieza del backoff al reconectar, `atascadosCount` y `authError` en `SyncStatus`, acciones de reintentar y descartar |
| `src/lib/actions/offline-sync.ts` | Clasificación transitorio/permanente, `error_code` y `retriable` en `PushResultItem`, `insert` a `upsert` en turnos y pacientes |
| `src/components/offline/OfflineSyncWidget.tsx` | Estado rojo, sección de atascados, diccionario de mensajes, modal de confirmación de descarte |

## 9. Verificación

El proyecto no tiene suite de tests, así que la prueba es manual y necesita
provocar los dos tipos de fallo a propósito.

1. **Permanente:** crear un paciente con un DNI que ya existe estando sin
   conexión, reconectar, y confirmar que va directo a `ATASCADO` con `attempts`
   en `1`, sin recorrer la escalera, y con el mensaje de DNI duplicado.
2. **Transitorio:** cortar la red a mitad del push y verificar que reintenta con
   la escalera, que `attempts` sube, y que al reconectar arranca sin esperar el
   backoff.
3. **Idempotencia:** forzar el reintento de algo que ya subió y confirmar que el
   `upsert` no lo marca atascado.
4. **Bloqueo por entidad:** dejar atascada la creación de un paciente, editarlo
   después, y ver que la edición espera en vez de subir sola.
5. **Sesión vencida:** invalidar la sesión y confirmar que el widget lo dice en
   lugar de quedarse pendiente en silencio.
6. **Migración:** con una base local que tenga items en `ERROR`, abrir la app y
   verificar que pasan a `PENDIENTE` y se reintentan.
7. **Descartar:** confirmar que el modal muestra el contenido real del cambio y
   que, tras descartar y sincronizar, la fila desaparece del equipo.

Además, `npx tsc --noEmit` y `npm run build` sin errores.
