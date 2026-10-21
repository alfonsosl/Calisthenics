# Calistenia

App móvil (PWA) de entrenamiento de calistenia con poco material. Funciona sin conexión, se instala en la pantalla de inicio de Android/iOS y guarda los datos solo en el dispositivo.

## Funcionalidades

- **Cuestionario inicial**: datos básicos (peso, altura, IMC), fisionomía, hábitos (actividad, sueño, alimentación, estrés), test de nivel (flexiones, dominadas, sentadillas, plancha), objetivo, días disponibles, duración, material y lesiones.
- **Rutina personalizada** según los días elegidos:
  1 día cuerpo completo · 2-3 días cuerpo completo A/B/C · 4 días torso/pierna · 5 días empuje/tracción/pierna + torso/pierna · 6 días PPL ×2 · 7 días PPL ×2 + recuperación activa.
  Series, repeticiones y descansos según objetivo (fuerza, hipertrofia, resistencia, pérdida de grasa, habilidades, salud). Calentamiento y vuelta a la calma adaptados a cada sesión; finisher por intervalos si el objetivo lo pide.
- **85 ejercicios** (+17 de movilidad) en 12 familias de movimiento con niveles 1-10 (principiante → avanzado), filtrados por el material disponible y las limitaciones (muñecas, hombros, codos, rodillas, lumbar).
- **Figuras animadas** de cada ejercicio (muñeco articulado en SVG con cinemática directa + IK), técnica, errores comunes y escalera de progresión.
- **Modo entrenamiento** (subaplicación a pantalla completa): calentamiento guiado, registro de cada serie, cuenta atrás de descansos (±15 s, pausa, saltar), cronómetro para ejercicios isométricos, finisher por intervalos, pitidos, vibración y pantalla siempre encendida. Si sales, puedes retomarlo después.
- **Progresión automática** (doble progresión): al completar todas las series en el máximo del rango sube a la siguiente variante; dos sesiones muy por debajo del objetivo bajan un nivel.
- **Progreso**: sesiones por semana, evolución por ejercicio, récords, peso corporal e historial.
- **Recomendaciones**: energía (Mifflin-St Jeor), proteína, hidratación, sueño, estrés, volumen, material que conviene comprar, lesiones y avisos según el historial (estancamiento, descarga, inactividad).
- Exportar/importar copia de seguridad en JSON. Tema claro/oscuro.

## Probarla

Es una web estática sin dependencias ni compilación:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

### Instalar en el móvil

1. Publicarla en GitHub Pages: en el repositorio, *Settings → Pages → Source: GitHub Actions*. El workflow `.github/workflows/pages.yml` la despliega en cada push a `main`.
2. Abrir la URL en el móvil:
   - **Android (Chrome)**: menú ⋮ → *Instalar aplicación*.
   - **iOS (Safari)**: Compartir → *Añadir a pantalla de inicio*.

### Generar un APK (opcional)

Con [Capacitor](https://capacitorjs.com/) se puede empaquetar la misma web como app nativa:

```bash
npm init -y && npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init Calistenia com.tuusuario.calistenia --web-dir .
npx cap add android && npx cap open android   # compilar desde Android Studio
```

## Estructura

```
index.html            Punto de entrada
manifest.webmanifest  Metadatos de instalación (PWA)
sw.js                 Service worker (uso sin conexión)
css/styles.css        Estilos (móvil primero, claro/oscuro)
js/figures.js         Motor de figuras animadas (SVG, FK + IK)
js/poses.js           Pose de cada ejercicio
js/exercises.js       Base de datos de ejercicios, material y movilidad
js/planner.js         Evaluación de nivel, generación de rutina, progresión y recomendaciones
js/app.js             Interfaz: cuestionario, inicio, rutina, progreso, biblioteca, perfil
js/workout.js         Modo entrenamiento con temporizadores
```

> Aviso: la app ofrece recomendaciones generales y no sustituye el consejo de profesionales sanitarios.
