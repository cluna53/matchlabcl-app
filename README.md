# MatchLab — versión 0.2 (nombre provisional)

Web app móvil lista para publicar como **sitio estático en GitHub Pages**. Sin build, sin dependencias y sin claves API.

## Novedades
- Filtros multiselección de **4 ligas** y **6 mercados** en la pantalla de inicio.
- Selecciones persistentes en `localStorage` del navegador.
- Escudos remotos de varios clubes de ejemplo, con insignias de iniciales cuando el escudo no está disponible. Los escudos son propiedad de sus respectivos titulares y se descargan de un proveedor externo; para un producto público habrá que revisar sus condiciones de uso.
- El detalle de cada partido muestra únicamente los mercados seleccionados.
- PWA para añadir a la pantalla de inicio del móvil.

## Subir a GitHub Pages
1. Crea un repositorio **público** nuevo en GitHub, por ejemplo `matchlab-app`.
2. En **Add file → Upload files**, sube **el contenido de esta carpeta**, no el ZIP ni una carpeta contenedora. `index.html` debe quedar en la raíz del repositorio.
3. En el repositorio, abre **Settings → Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**, rama **main**, carpeta **/(root)** y pulsa **Save**.
5. Cuando GitHub termine la publicación, abre `https://TU-USUARIO.github.io/matchlab-app/` (sustituye el usuario y nombre del repositorio).
6. En iPhone: Safari → Compartir → **Añadir a pantalla de inicio**.

Si editas archivos después, súbelos con el mismo nombre y espera la actualización de Pages. El service worker usa caché y puede tardar unos segundos en refrescar.

## Aviso importante
**Todo el calendario y todos los porcentajes son ficticios.** Esta versión NO consulta partidos reales, noticias, cuotas, ni bases de datos. Los escudos que se cargan no prueban que esos clubes jueguen esos encuentros o competiciones. No utilizar para apostar.

Para la siguiente fase: conectar un backend y un proveedor de datos, validar cobertura de LaLiga, Segunda, Premier y Championship y licencias de escudos. **No incluyas claves privadas en `app.js` ni en un repositorio público.**
