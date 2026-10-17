# MatchLab v0.4 — partidos reales (GitHub Pages)

Web móvil/PWA estática con partidos, escudos, fechas y clasificación de **football-data.org**. No hay datos ficticios. Los datos aparecen **después de configurar** una cuenta gratuita y ejecutar GitHub Actions. No necesita servidor propio ni mostrar la clave API en la web.

## Instalación y actualización del repositorio

1. Descomprime este ZIP y sube **todo su contenido** a la raíz de tu repositorio existente en GitHub. `index.html`, `app.js`, `data/` y `.github/` deben quedar en la raíz. Si GitHub pregunta, confirma la sustitución de los archivos anteriores.
2. Crea una cuenta gratuita en https://www.football-data.org/client/register y obtén tu token.
3. En tu repositorio de GitHub abre **Settings → Secrets and variables → Actions → New repository secret**. Nombre exacto: `FOOTBALL_DATA_TOKEN`. Pega el token como valor. **Nunca** lo pegues en `app.js`, en un issue ni en archivos públicos.
4. Abre **Actions → Actualizar datos de fútbol → Run workflow → Run workflow**. Espera a que la ejecución termine en verde. Se creará/actualizará `data/football.json` con partidos reales.
5. Mantén GitHub Pages en **Settings → Pages → Deploy from a branch → main / (root)**. Recarga tu URL publicada en Safari. Las actualizaciones se programan aproximadamente dos veces al día (GitHub puede retrasar ejecuciones).
6. Si GitHub Actions falla con `403` al intentar hacer push: **Settings → Actions → General → Workflow permissions → Read and write permissions**. En repositorios u organizaciones con políticas restrictivas, el propietario debe permitirlo.

**Importante para iPhone:** GitHub puede ocultar carpetas que comienzan con punto, como `.github`, al elegir archivos desde Safari. Si no se sube `.github/workflows/update-football.yml`, el workflow no aparecerá en Actions. En ese caso crea el archivo desde GitHub (Add file → Create new file) con la ruta `.github/workflows/update-football.yml` y copia el contenido del ZIP, o realiza la subida desde un ordenador.

## Cobertura y limitaciones

| Competición | Gratis |
|---|---|
| LaLiga (PD) | Sí |
| Premier League (PL) | Sí |
| Championship (ELC) | Sí |
| Champions League (CL) | Sujeto a disponibilidad de la cuenta gratuita |
| Serie A (SA) | Sujeto a disponibilidad de la cuenta gratuita |
| Eredivisie (DED) | Sujeto a disponibilidad de la cuenta gratuita |

- **Sí:** próximos encuentros (14 días), escudos cuando los suministre la API, resultados si están disponibles, clasificación y totales de temporada.
- **No:** directo fiable, cuotas, noticias, alineaciones, córners, tarjetas, tiros, estadísticas individuales ni predicciones validadas. Los datos del plan gratuito pueden ir retrasados.
- **Cuota:** 10 solicitudes/minuto. El script realiza hasta doce solicitudes (partidos + clasificación por seis competiciones) con pausas.
- **Privacidad:** el token se guarda en GitHub Actions Secrets; el JSON público no lo contiene.
- **Transparencia:** si no hay sincronización, la web muestra una explicación, **no partidos inventados**. Una liga que falle se señala; nunca se sustituye por datos simulados.
- **Fuentes:** https://www.football-data.org/pricing ; https://www.football-data.org/coverage ; https://www.football-data.org/documentation/quickstart

Data provided by football-data.org

**Nota sobre Champions League:** la clasificación y el formato de fases pueden diferir de una liga doméstica; si el proveedor no devuelve una tabla TOTAL, se mostrará sin clasificación. Las competiciones no habilitadas por el plan gratuito generarán una advertencia visible en la app, sin datos ficticios.
