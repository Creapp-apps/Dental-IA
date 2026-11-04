# Plan · Rediseño de la agenda mobile (vista lista)

Referencia visual: `docs/spike-agenda-mobile.html`
Pedido original (Eduardo, 55): la vista mobile del día es ruidosa; que los turnos
se vean como renglones completos con nombre, hora, tratamiento y estado de un
vistazo, sin clickear tarjeta por tarjeta.

## 1. Diagnóstico

La vista mobile (`block md:hidden`, ~línea 2023 de
`src/components/agenda/AgendaView.tsx`) renderiza una **grilla de calendario con
una columna por profesional** (`mobileColumns`). En el ancho de un teléfono las
columnas se encogen a chips diminutos que se superponen → ilegible.

El reemplazo es una **lista vertical cronológica de tarjetas** para la vista Día.

## 2. Alcance

- **Fase 1 (núcleo):** vista **Día** (`vistaActiva === 'hoy'`) → lista de tarjetas.
  Resuelve el pedido de Eduardo.
- **Sin tocar:** desktop (`hidden md:flex`), y en mobile las vistas
  `semana` / `15dias` (grilla por día) y `mes` (grilla mensual) quedan igual en
  Fase 1.
- **Fase 2 (opcional, luego):** `3dias` y `semana` como listas agrupadas por día;
  huecos "Libre"; swipe para cambiar de día.

## 3. Diseño de la tarjeta (del spike, ya aprobado)

Dos filas, aprovechando el ancho:

```
┌──────┬──────────────────────────────────────┐
│08:30 │ Ricardo Gómez            [Pendiente]  │  fila 1: nombre + estado
│30 min│ ● Dr. Eduardo · ▪ Control            │  fila 2: profesional · tratamiento
└──────┴──────────────────────────────────────┘
 └ borde izquierdo = color del profesional (color_agenda)
```

- Columna hora (~60px): `HH:MM` grande + duración (`fecha_fin - fecha_inicio`).
- Fila 1: `paciente_apellido, paciente_nombre` (bold, truncate) + pill de estado.
- Fila 2: punto color profesional + `Dr. {nombre}` · cuadradito color tratamiento
  (`tipo_tratamiento.color`) + `tipo_tratamiento.nombre`.
- Borde izquierdo de acento con `color_agenda` del profesional.

## 4. Componentes y cambios

### 4.1 Nuevo componente `AgendaMobileList`
Archivo: `src/components/agenda/AgendaMobileList.tsx`

Props:
- `turnos: any[]` → se pasa `turnosMobileFiltrados` (ya ordenado por hora).
- `diaSeleccionado: Date`
- `isLoading: boolean`
- `onSelectTurno: (t) => void` → se pasa `setSelectedTurnoDetail`.

Responsabilidades:
- Resumen del día arriba: `N turnos · X confirmados · Y pendientes` (centrado).
- Separadores de franja (Mañana < 12 / Mediodía 12–14 / Tarde ≥ 14) por hora de
  `fecha_inicio`.
- Línea "Ahora · HH:MM" cuando `isToday(diaSeleccionado)`, ubicada entre el turno
  previo y el siguiente según la hora actual.
- Render de cada turno con `onClick={() => onSelectTurno(turno)}`.
- Estado vacío: "No hay turnos para este día".

### 4.2 Mapa de estilos de estado (dark)
`ESTADO_TURNO_COLOR` en `src/types/index.ts` es de tema claro
(`bg-yellow-100 …`). Definir en el nuevo componente un mapa dark:

| Estado      | Pill                                  |
|-------------|---------------------------------------|
| CONFIRMADO  | verde  (bg verde translúcido)         |
| PENDIENTE   | ámbar                                 |
| EN_SALA     | azul, punto con pulso                 |
| ATENDIDO    | slate/apagado                         |
| AUSENTE     | rojo tenue                            |
| CANCELADO   | rojo + nombre tachado, tarjeta atenuada |

Label desde `ESTADO_TURNO_LABEL` (ya existe).

### 4.3 Integración en `AgendaView.tsx`
En el bloque mobile, rama `else` (no-mes), **antes** del `vistaActiva === '3dias'
|| semana || 15dias` seguir usando la grilla; para `vistaActiva === 'hoy'`
renderizar `<AgendaMobileList … />` en lugar de la grilla de columnas.

Estructura objetivo:
```
{vistaActiva === 'mes' ? ( …grilla mes… )
 : vistaActiva === 'hoy' ? ( <AgendaMobileList … /> )
 : ( …grilla de columnas para 3dias/semana/15dias… )}
```

### 4.4 FAB (botón "+")
**Decidido:** ocultar el FAB solo para rol profesional. El `motion.button` FAB
está en ~línea 2469 (`fixed bottom-6 right-5 … md:hidden`). Envolver su render en
`{!isProfesional && ( … )}` (la flag `isProfesional` ya existe en el componente).
Admin/secretaría lo siguen viendo.

## 5. Accesibilidad (objetivo del pedido)

- Tipografía: nombre 16px bold, hora 18px bold; mínimos legibles.
- Contraste alto sobre fondo oscuro; objetivos táctiles ≥ 42px.
- `prefers-reduced-motion`: desactivar el pulso de "En sala".
- Cero superposición; todo visible sin interacción.

## 6. Verificación

- Playwright (skill `webapp-testing`) a 390px de ancho: la vista Día muestra la
  lista, sin scroll horizontal, sin chips superpuestos.
- Tap en tarjeta abre el detalle existente (`setSelectedTurnoDetail`).
- Filtro por profesional y "Todos" funcionan (la fila 2 muestra el profesional).
- Estados variados (confirmado/pendiente/en sala/cancelado) se ven correctos.
- Desktop (`md:`) sin cambios.
- Build/lint OK.

## 7. Decisiones (resueltas)

1. **Alcance:** ✅ Solo vista **Día** (Fase 1). `3dias`/`semana`/`15dias`/`mes`
   quedan con la grilla actual.
2. **FAB "+":** ✅ Ocultar solo para rol **profesional** (`!isProfesional`);
   admin/secretaría lo mantienen. Ver §4.4.
3. **Huecos "Libre":** ✅ Fuera de Fase 1 (no cruzar `horarios` todavía).
   Queda para Fase 2.

## 8. Riesgos

- No romper desktop ni las vistas semana/15dias/mes.
- Mantener acciones del detalle (confirmar, WhatsApp, editar) vía el modal actual.
- `turnosMobileFiltrados` depende de `diaSeleccionado`: confirmar que coincide con
  el día mostrado en el header.
- Archivo grande (3476 líneas): extraer a componente nuevo para no inflarlo más.
