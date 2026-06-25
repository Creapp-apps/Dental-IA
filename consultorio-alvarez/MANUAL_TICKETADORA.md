# Manual de Configuración y Uso de Ticketadora Hasar 181
**Modelo:** Hasar 181 USB / Serie / Ethernet (P-HAS-181 Negro)  
**Objetivo:** Imprimir tickets/comprobantes de turnos desde el sistema web en el equipo Windows del consultorio.

---

## 1. Conexión Física y Encendido
La ticketadora Hasar 181 admite tres tipos de conexión. Se detalla la configuración para las dos más recomendadas:

### Opción A: Conexión USB (Recomendada si la ticketadora está al lado de la PC)
1. Conecte el cable de alimentación a la ticketadora y luego a la corriente.
2. Conecte el cable USB provisto a un puerto USB libre de la PC con Windows.
3. Encienda la ticketadora utilizando el interruptor de encendido.

### Opción B: Conexión Ethernet/Red (Recomendada para imprimir desde múltiples PCs)
1. Conecte un cable de red (RJ45) desde la ticketadora a su router o switch.
2. Encienda la ticketadora manteniendo presionado el botón **FEED** para imprimir la página de autodiagnóstico (Self-Test). En el ticket impreso figurará la dirección IP asignada por defecto (ej. `192.168.1.150`).
3. Para cambiar la IP a una fija en el rango de su red local, use la herramienta de configuración de Hasar provista en el CD/descargas oficiales.

---

## 2. Instalación de Controladores (Drivers) en Windows
Para que Windows reconozca correctamente el formato de corte de papel y los comandos de impresión:

1. **Descargar los Drivers:** Descargue el driver oficial de la Hasar 181 (o el driver genérico de impresora térmica ESC/POS de 80mm) desde el sitio de soporte de Hasar o del fabricante original.
2. **Instalar el Driver:**
   - Ejecute el instalador del driver en Windows como Administrador.
   - Si se conecta por USB, seleccione **USB** como puerto durante la instalación.
   - Si se conecta por Red, seleccione **Ethernet** y configure el puerto TCP/IP correspondiente con la IP de la ticketadora.
3. **Nombre de la Impresora:** Recomendamos nombrar la impresora en Windows como `Hasar 181` o `Ticketadora Turnos` para identificarla rápidamente.

---

## 3. Configuración de Formato en Windows (Paso Crítico)
Para evitar que se desperdicie papel o salgan tickets extremadamente largos:

1. Vaya a **Inicio > Configuración > Dispositivos > Impresoras y escáneres**.
2. Seleccione su impresora `Hasar 181` y haga clic en **Administrar**.
3. Haga clic en **Propiedades de la impresora** (Printer Properties).
4. En la pestaña **General**, haga clic en **Preferencias de impresión** (Printing Preferences):
   - En la opción de tamaño de papel, asegúrese de seleccionar **80mm x Receipt** (o el equivalente a bobina de 80mm).
   - Asegúrese de que el corte de papel automático al finalizar la impresión esté activado (opción *Cut after print* o similar).
5. Vaya a la pestaña **Opciones avanzadas** (Advanced):
   - Haga clic en **Valores predeterminados de impresión** (Printing Defaults) y verifique que esté configurado el mismo tamaño de papel (80mm).
6. Aplique los cambios y haga clic en **Aceptar**.

---

## 4. Configuración del Navegador Web (Chrome o Microsoft Edge)
El sistema utiliza la interfaz de impresión del navegador. Debe configurarse una única vez de la siguiente manera:

### Paso 1: Permitir Ventanas Emergentes (Popups) en el Sistema
Al presionar el botón de **Ticket**, el sistema abre temporalmente una ventana pequeña para mandar la orden de impresión y cerrarse sola. Si no se abre, debe habilitarla:
1. En la barra de direcciones del navegador (donde escribe la URL del sistema), haga clic en el icono del **candado** o del **escudo** a la izquierda.
2. Busque la opción **Permiso de Ventanas Emergentes / Redirecciones** (Pop-ups and redirects) y cámbiela a **Permitir** (Allow).
3. Recargue la página del sistema.

### Paso 2: Configuración de la Ventana de Impresión
La primera vez que imprima un ticket, configure lo siguiente en el cuadro de diálogo de Chrome/Edge:
1. **Destino (Printer):** Seleccione `Hasar 181` (o el nombre que le dio).
2. Haga clic en **Más opciones** (More Settings) para expandir los parámetros:
   - **Tamaño de papel:** Seleccione **80mm** o **Roll paper 80 x 297mm** (o similar).
   - **Márgenes:** Seleccione **Ninguno** (None) o **Mínimo**. Esto maximiza el ancho imprimible y evita márgenes en blanco innecesarios.
   - **Escala:** Déjelo en **100%** (o *Predeterminado*).
   - **Opciones de encabezados y pies de página (Headers and footers):** **DESACTIVAR (Uncheck)**. Si lo deja activo, se imprimirá la fecha, hora y URL del sistema en los bordes del ticket.
3. Presione **Imprimir**. El navegador recordará esta configuración para las próximas impresiones de tickets.

---

## 5. Instrucciones de Uso desde la Agenda
Una vez configurado el equipo:

1. Ingrese a la **Agenda** del consultorio.
2. Haga clic sobre el turno del paciente del cual desea emitir el comprobante.
3. En el detalle del turno (abajo a la derecha), verá el botón verde **Ticket** junto al botón de *Editar*.
4. Haga clic en **Ticket**. Se abrirá una ventana emergente por menos de un segundo, se lanzará la pantalla de impresión del navegador y, tras confirmar, el ticket se imprimirá de forma inmediata.

---

## 6. Resolución de Problemas Comunes

* **El ticket se imprime en blanco o sin texto:**
  * La bobina de papel térmico podría estar colocada al revés. El papel térmico solo tiene una cara sensible al calor. Dé vuelta el rollo e intente nuevamente.
* **El botón "Ticket" no hace nada:**
  * Verifique que el navegador no haya bloqueado la ventana emergente. Busque una alerta con una "X" roja en el extremo derecho de la barra de direcciones y seleccione "Permitir siempre ventanas emergentes de este sitio".
* **El ticket sale muy largo o con mucho espacio vacío al final:**
  * Verifique la configuración en Windows (Punto 3). El tamaño de papel debe ser de bobina (Receipt/Roll) y no de hoja A4 o Carta.
* **La impresora no corta el papel al finalizar:**
  * Ingrese a las propiedades de la impresora en Windows, pestaña *Configuración del Dispositivo* (Device Settings) y asegúrese de que la opción de corte de papel (Cutter) esté seteada en *Document Cut* o *Page Cut*.
