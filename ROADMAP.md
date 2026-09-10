# Roadmap de dockdi

Documento de seguimiento manual y local del progreso de desarrollo de `dockdi`. Cada fase contiene su objetivo central, criterios de éxito y la lista detallada de tareas con casillas de verificación (`- [ ]`) para el control de avance.

---

## Estado General del Proyecto

| Fase | Descripción | Estado |
|---|---|---|
| **Fase 0** | Mecanismo central y validación (Constructor ↔ Tokens) | 🟢 Completada |
| **Fase 1** | Core container & Resolución unificada (`bind`, `resolve`, `get`, Transient, sync/async) | ⚪ Pendiente |
| **Fase 2** | Ciclo de vida y Scopes (Singleton con deduplicación de promesas, Resolution Scope) | ⚪ Pendiente |
| **Fase 3** | DX de errores (Ciclos con traza completa sync/async y sugerencias) | ⚪ Pendiente |
| **Fase 4** | Utilidades de testing (Mocking y Overrides) | ⚪ Pendiente |
| **Fase 5** | Empaquetado y publicación (Dual ESM/CJS, npm) | ⚪ Pendiente |
| **Fase 6** | Extensiones futuras (Child containers, integraciones) | ⚪ Futuro |

---

## Fase 0 — Mecanismo Central y Validación

**Objetivo**: Prototipar el branded token y resolver el desafío arquitectónico más crítico de `dockdi`: asociar los parámetros del constructor de una clase con sus respectivos tokens de inyección sin recurrir a decoradores (`@inject`), `reflect-metadata` ni configuración en `tsconfig.json`, superando la fragilidad de orden de Brandi.

- **Criterio de éxito**: Un prototipo ejecutable y validado con tests en Bun (`bun test`) que demuestre que el compilador de TypeScript valida los tipos de los tokens frente a los parámetros del constructor y que un resolver mínimo instancia la clase correctamente.

### Tareas
- [x] **Diseño del Branded Token (`Token<T>`)**
  - [x] Definir el tipo phantom sobre `symbol` (`unique symbol` brand no exportado a runtime).
  - [x] Implementar la función creadora `token<T>(description?: string): Token<T>`.
  - [x] Escribir tests de tipado estático verificando que dos tokens con tipos incompatibles (`Token<A>` vs `Token<B>`) no sean asignables entre sí a nivel de TypeScript.
- [x] **Investigación y prototipado del mapeo Constructor ↔ Tokens**
  - [x] Explorar enfoques de asociación: tupla tipada vinculada a la clase vs. helper constructor tipado vs. inferencia por función factoría.
  - [x] Evaluar seguridad frente al gap de Brandi (garantizar en compile-time que el orden y tipo de los tokens correspondan exactamente a los parámetros del constructor).
  - [x] Prototipar la sintaxis elegida en un archivo de prueba en `libraries/dockdi-ts`.
- [x] **Resolver y validación mínima en Bun**
  - [x] Implementar un resolver mínimo que tome el constructor y la tupla de tokens y resuelva las dependencias instanciando con `new`.
  - [x] Validar ejecución exitosa con `bun test` y `bun x tsc --noEmit`.
  - [x] Documentar formalmente la decisión de diseño acordada como base para la Fase 1.

---

## Fase 1 — Core Container & Resolución Unificada

**Objetivo**: Construir el contenedor básico de inyección de dependencias con soporte nativo y unificado para factorías síncronas y asíncronas bajo scope `transient`, ofreciendo `container.resolve()` como método de resolución universal y `container.get()` para resoluciones sincrónicas garantizadas.

- **Criterio de éxito**: Contenedor funcional con API pública de registro (`bind`, `toValue`, `toClass`, `toFactory` unificado para sync/async) y resolución (`resolve` y `get`), que resuelva árboles de dependencias mixtos y falle con errores claros cuando falte un token o se intente resolver una dependencia asíncrona mediante `get()`.

### Tareas
- [ ] **Estructura del Container y Registro Unificado**
  - [ ] Implementar la clase `Container` con almacenamiento interno de bindings (`Map<Token<unknown>, Binding<unknown>>`).
  - [ ] Diseñar e implementar la API fluida de registro `container.bind(token)`.
  - [ ] Soportar binding a valor constante (`toValue(value)`).
  - [ ] Soportar binding a clase (`toClass(Constructor, tokens)`).
  - [ ] Soportar binding a factoría polimórfica (`toFactory(factoryFn, tokens)`), aceptando retornos tanto síncronos (`T`) como asíncronos (`Promise<T>`) de forma transparente sin métodos separados.
- [ ] **Motor de Resolución Unificada (`resolve` y `get`)**
  - [ ] Implementar `container.resolve(token): Promise<T>` como método universal capaz de resolver dependencias de forma recursiva, esperando promesas en cualquier punto del árbol y ejecutando clases y factorías.
  - [ ] Implementar `container.get(token): T` síncrono para grafos estrictamente síncronos; lanza `AsyncBindingError` con sugerencia clara de usar `resolve()` si se detecta una factoría asíncrona.
  - [ ] Aplicar scope `transient` por defecto (cada resolución crea una instancia nueva e independiente).
  - [ ] Manejar tokens no registrados lanzando `MissingTokenError` con el nombre/descripción del token faltante.
- [ ] **Suite de Pruebas de la Fase 1**
  - [ ] Tests de resolución de dependencias lineales sincrónicas (`A -> B -> C`).
  - [ ] Tests de resolución con factorías asíncronas mediante `container.resolve()`.
  - [ ] Tests de resolución mixta (clases síncronas que dependen de factorías asíncronas).
  - [ ] Tests validando que múltiples llamadas con scope transient devuelven referencias distintas (`instance1 !== instance2`).
  - [ ] Tests verificando que `container.get()` sobre un árbol asíncrono lanza `AsyncBindingError`.
  - [ ] Tests de fallo al solicitar tokens inexistentes.

---

## Fase 2 — Ciclo de Vida y Scopes

**Objetivo**: Incorporar políticas de ciclo de vida de instancias (`singleton` y `resolution-scope`) con soporte transparente para factorías asíncronas mediante deduplicación de promesas concurrentes en vuelo.

- **Criterio de éxito**: Pruebas unitarias que demuestren la preservación exacta de referencias para singletons (tanto síncronos como asíncronos), deduplicación de promesas concurrentes y aislamiento entre llamadas para transient/resolution-scope.

### Tareas
- [ ] **Scope Singleton con Manejo Asíncrono**
  - [ ] Extender la API de binding para especificar scope: `.inSingletonScope()`.
  - [ ] Implementar la caché de instancias singleton dentro del contenedor.
  - [ ] Implementar deduplicación de promesas en vuelo (*in-flight promise deduplication*) para factorías asíncronas en singleton scope: resoluciones concurrentes comparten la misma promesa.
  - [ ] Asegurar que resoluciones concurrentes o dependencias compartidas reutilicen la misma instancia (`instance1 === instance2`).
- [ ] **Scope Resolution (Contextual)**
  - [ ] Implementar contexto de resolución efímero que comparta instancias solo durante el ciclo de ejecución de un único `container.resolve()` o `container.get()`.
- [ ] **Limpieza de Caché**
  - [ ] Implementar `container.reset()` para purgar singletons cacheados y promesas pendientes sin alterar los bindings registrados.
- [ ] **Suite de Pruebas de Ciclo de Vida**
  - [ ] Tests de identidad referencial en grafos diamante (ej. `A` depende de `B` y `C`, ambos dependen del singleton `D`).
  - [ ] Tests de concurrencia para singletons asíncronos verificando que la factoría se ejecuta exactamente una vez.
  - [ ] Tests de resolution scope y tests de `container.reset()`.

---

## Fase 3 — Experiencia de Desarrollo (DX) y Diagnóstico de Errores

**Objetivo**: Convertir el manejo de errores en un factor diferenciador clave de `dockdi`: detectar dependencias circulares antes de desbordar el stack en resoluciones síncronas y asíncronas, y ofrecer mensajes detallados con trazas completas y sugerencias.

- **Criterio de éxito**: Ningún ciclo produce `Maximum call stack size exceeded` ni `UnhandledPromiseRejection`; en su lugar, se lanza un error descriptivo con la secuencia completa del ciclo (ej. `A -> B -> C -> A`).

### Tareas
- [ ] **Detección de Dependencias Circulares (Sync y Async)**
  - [ ] Implementar pila de resolución activa (`resolutionStack`) durante la invocación recursiva de `resolve` y `get`.
  - [ ] Detectar presencia de un token en la pila antes de intentar resolverlo en ambos pipelines.
  - [ ] Interrumpir la ejecución inmediatamente lanzando `CircularDependencyError`.
- [ ] **Formateo de Errores y Diagnóstico**
  - [ ] Formatear el mensaje de ciclo mostrando la ruta completa: `Token[A] -> Token[B] -> Token[C] -> Token[A]`.
  - [ ] En errores de token faltante (`MissingTokenError`), inspeccionar el registro y sugerir tokens con descripciones similares (cálculo de distancia Levenshtein).
- [ ] **Suite de Pruebas de Diagnóstico**
  - [ ] Tests de ciclos directos (`A -> B -> A`) e indirectos (`A -> B -> C -> D -> B`) en `resolve()` y `get()`.
  - [ ] Tests verificando el texto exacto y las sugerencias de tokens similares.

---

## Fase 4 — Utilidades de Testing

**Objetivo**: Proporcionar a los consumidores de `dockdi` facilidades ergonómicas y declarativas para sobrescribir dependencias (mocks/stubs) en suites de pruebas unitarias.

- **Criterio de éxito**: Los desarrolladores pueden crear snapshots, clonar contenedores o sobrescribir bindings puntuales de forma aislada por test sin contaminar el contenedor original.

### Tareas
- [ ] **Mecanismo de Overrides / Mocks**
  - [ ] Diseñar API de sobreescritura (ej. `container.override(token).toValue(mock)` o `container.createChild()` acotado a pruebas).
  - [ ] Implementar restauración de bindings (`restore()` o `snapshot()`).
  - [ ] Garantizar que las sobreescrituras invaliden adecuadamente las cachés de singleton afectadas.
- [ ] **Suite de Pruebas para Testing Utilities**
  - [ ] Tests de aislamiento verificando que un override en un test no afecte a resoluciones en tests posteriores.
  - [ ] Tests de sustitución de dependencias anidadas profundas por un mock.

---

## Fase 5 — Empaquetado, Optimización y Publicación

**Objetivo**: Preparar el paquete para su distribución en el ecosistema npm con presupuesto estricto de bundle size, cero dependencias de producción y compatibilidad universal ESM/CJS.

- **Criterio de éxito**: Paquete publicado en npm con artefactos `.mjs`, `.cjs` y `.d.ts`, validado en proyectos cliente puros en Node.js, Bun y navegadores.

### Tareas
- [ ] **Configuración de Build Dual**
  - [ ] Configurar script de compilación para emitir ESM y CommonJS.
  - [ ] Generar mapas de declaración TypeScript (`.d.ts` y `.d.cts`).
  - [ ] Configurar `exports`, `main`, `module` y `types` en `package.json`.
- [ ] **Auditoría de Invariantes**
  - [ ] Verificar que `dependencies` en `package.json` permanezca vacío (`0` dependencias en runtime).
  - [ ] Medir y documentar el tamaño del bundle (< 3 KB minified).
- [ ] **Documentación y Ejemplos**
  - [ ] Redactar `README.md` público con guía de inicio rápido y ejemplos de uso (sync y async).
  - [ ] Crear ejemplos funcionales listos para ejecutar.
- [ ] **Publicación**
  - [ ] Configurar pipeline de CI/CD para pruebas y publicación automatizada.
  - [ ] Publicar versión `1.0.0` en npm.

---

## Fase 6 — Extensiones Futuras (Fuera del Alcance Inicial)

**Objetivo**: Evaluar e incorporar características avanzadas tras la estabilización de la versión 1.0.

- [ ] **Contenedores Jerárquicos (Child Containers)**: Árboles de contenedores con herencia de bindings y fallback hacia el contenedor padre.
- [ ] **Integración Nativa con Frameworks**: Adaptadores específicos para inyección contextual en frameworks web (ej. Elysia en Bun, Express, Fastify).
- [ ] **Plugins / Middleware de Resolución**: Hooks para instrumentación, telemetría y logging de resoluciones.
