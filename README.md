# Un universo para ti 🌌

Una experiencia web interactiva y narrativa: un cielo estrellado, una constelación en forma de corazón, un pequeño planeta y un jardín de flores cósmicas que florecen escena a escena.

## Estructura del proyecto

```
Flower_CRRR/
├── index.html        # marcado de la página
├── css/
│   └── styles.css    # paleta, capas del cielo, UI y animaciones
├── js/
│   ├── starfield.js  # cielo estrellado multicapa, nebulosas, estrellas fugaces y partículas doradas
│   ├── flowers.js     # generación de flores cósmicas (SVG) y sus variantes de color
│   └── main.js        # configuración, guion de las escenas y director de la experiencia
└── README.md
```

## Cómo personalizarlo

1. Abre `js/main.js` y edita el nombre al inicio del archivo:

   ```js
   const CONFIG = {
     name: "Andrea", // ← pon aquí el nombre de tu persona
   };
   ```

2. (Opcional) Cambia los textos de cada escena dentro de las funciones `sceneNoche`, `sceneLuz`, `sceneLugar`, `sceneFlorece`, `sceneTodo` y `sceneFinal` en `js/main.js`.

3. (Opcional) Ajusta la paleta de colores en `:root` dentro de `css/styles.css` (variables `--gold`, `--bloom-*`, etc.).

## Cómo verlo

Al ser un sitio 100% estático, basta con abrir `index.html` en el navegador, o servirlo con cualquier servidor estático:

```bash
python3 -m http.server 8080
# luego visita http://localhost:8080
```

También funciona directamente con **GitHub Pages** apuntando a la raíz del repositorio.

## Detalles de diseño

- **Cielo multicapa**: tres capas de estrellas con distinta profundidad, tamaño y velocidad de parpadeo, más un ligero efecto de paralaje al mover el cursor.
- **Nebulosas y vía láctea**: manchas de color difuminadas y una banda diagonal sutil que enriquecen el fondo sin distraer del texto.
- **Estrellas fugaces**: cruzan el cielo de forma aleatoria y poco frecuente.
- **Flores cósmicas**: en vez de una sola flor genérica, hay cuatro variantes (dorada, rosa, violeta y cian) con pétalos en forma de llama estelar, doble capa de pétalos, centro luminoso en forma de estrella de 4 puntas y chispas que orbitan lentamente alrededor de cada flor.
- **Planeta vivo**: una barrida de luz cónica muy sutil da sensación de rotación constante.
- **Constelación**: un cometa recorre el contorno del corazón mientras se dibujan las líneas que unen cada estrella.

## Accesibilidad

El sitio respeta `prefers-reduced-motion`: si el sistema del visitante lo solicita, las animaciones y transiciones se reducen al mínimo.
