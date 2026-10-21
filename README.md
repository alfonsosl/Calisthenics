# Calistenia

App móvil (PWA) de entrenamiento de calistenia con poco material. Funciona sin conexión, se instala en la pantalla de inicio de Android/iOS y guarda los datos solo en el dispositivo.

## Funcionalidades

- **Cuestionario inicial**: datos básicos (peso, altura, IMC), fisionomía, hábitos (actividad, sueño, alimentación, estrés), test de nivel (flexiones, dominadas, sentadillas, plancha), objetivo, días disponibles, duración, material y lesiones.
- **Rutina personalizada** según los días elegidos:
  1 día cuerpo completo · 2-3 días cuerpo completo A/B/C · 4 días torso/pierna · 5 días empuje/tracción/pierna + torso/pierna · 6 días PPL ×2 · 7 días PPL ×2 + recuperación activa.
  Series, repeticiones y descansos según objetivo (fuerza, hipertrofia, resistencia, pérdida de grasa, habilidades, salud). Calentamiento y vuelta a la calma adaptados a cada sesión; finisher por intervalos si el objetivo lo pide.
- **85 ejercicios** (+17 de movilidad) en 12 familias de movimiento con niveles 1-10 (principiante → avanzado), filtrados por el material disponible y las limitaciones (muñecas, hombros, codos, rodillas, lumbar).
- **Figuras animadas con aspecto humano** de cada ejercicio (SVG con cinemática directa + IK), con los **puntos clave numerados sobre la figura** (articulaciones y líneas de alineación), postura correcta, pautas para no lesionarse, errores comunes y escalera de progresión.
- **Calentamiento (5-7 min) y estiramientos (4-6 min)** en cada sesión, adaptados a los músculos del día, cada uno con su figura animada.
- **Modo entrenamiento** (subaplicación a pantalla completa): cada ejercicio, calentamiento y estiramiento empieza parado y arranca con **▶ Empezar**; se puede pausar y reanudar. Botón **✋ Parar** siempre visible: detiene el tiempo (y la música) y permite continuar, pasar a una variante más fácil, saltar el ejercicio por molestias o terminar, con avisos de seguridad. Confirmación antes de saltar series o ejercicios. Cuenta atrás de descansos (±15 s), cronómetro para isométricos, finisher por intervalos, pitidos, vibración y pantalla siempre encendida.
- **Música con Spotify**: guarda tu playlist y ábrela con un toque; opcionalmente (Premium) controla la reproducción desde la app con la Web API oficial (OAuth PKCE, sin servidor), con pausa automática al pulsar «Parar».
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

**1. Publicar la app en GitHub Pages (una sola vez, desde github.com):**

1. GitHub Pages gratis solo funciona con repositorios públicos. Este repositorio es privado: o lo haces público (*Settings → General → Danger Zone → Change visibility*), o necesitas un plan de pago. Tus datos de entrenamiento no están en el código; se quedan en el móvil.
2. *Settings → Pages → Build and deployment → Source: Deploy from a branch*. Rama `claude/calistenia-mobile-app-s4iqy9` (o `main` cuando la fusiones), carpeta `/ (root)` → *Save*. Alternativa tras fusionar en `main`: *Source: GitHub Actions* y el workflow `.github/workflows/pages.yml` la publica en cada push.
3. En 1-2 minutos estará en `https://alfonsosl.github.io/Calisthenics/`.

**2. Instalar en el móvil:**

- **Android (Chrome)**: abre la dirección → menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari)**: abre la dirección → botón Compartir → *Añadir a pantalla de inicio* → *Añadir*.

La app también explica estos pasos en *Perfil → Instalación*.

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
js/keys.js            Postura correcta, puntos clave y prevención de lesiones
js/planner.js         Evaluación de nivel, generación de rutina, progresión y recomendaciones
js/app.js             Interfaz: cuestionario, inicio, rutina, progreso, biblioteca, perfil
js/workout.js         Modo entrenamiento con temporizadores y botón de parada
js/music.js           Integración con Spotify
```

> Aviso: la app ofrece recomendaciones generales y no sustituye el consejo de profesionales sanitarios.
