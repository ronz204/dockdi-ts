# Roadmap de dockdi

Documento de seguimiento manual y local del progreso de desarrollo de `dockdi`. Cada fase contiene su objetivo central, criterios de éxito y la lista detallada de tareas con casillas de verificación (`- [ ]`) para el control de avance.

---

## Estado General del Proyecto

| Fase | Descripción | Estado |
|---|---|---|
| **Fase 0** | Mecanismo central y validación (Constructor ↔ Tokens) | 🟢 Completada |
| **Fase 1** | Core container & Resolución síncrona (`bind`, `resolve`, Transient, clases, factorías y valores) | 🟢 Completada |
| **Fase 2** | Ciclo de vida y Scopes (Singleton síncrono, Resolution Scope) | 🟢 Completada |
| **Fase 3** | DX de errores (Ciclos con traza completa síncrona y ruta de resolución) | 🟢 Completada |
| **Fase 4** | Utilidades de testing (Mocking y Overrides) | 🟢 Completada |
| **Fase 5** | Empaquetado y publicación (Dual ESM/CJS, npm) | 🟡 En progreso |
| **Fase 6** | Extensiones futuras (Child containers, integraciones) | ⚪ Futuro |

---

## Fase 0 — Mecanismo Central y Validación

**Objetivo**: Prototipar el branded token y resolver el desafío arquitectónico más crítico de `dockdi`: asociar los parámetros del constructor de una clase con sus respectivos tokens de inyección sin recurrir a decoradores (`@inject`), `reflect-metadata` ni configuración en `tsconfig.json`, superando la fragilidad de orden de Brandi.

- **Criterio de éxito**: Un prototipo ejecutable y validado con tests en Bun (`bun test`) que demuestre que el compilador de TypeScript valida los tipos de los tokens frente a los parámetros del constructor y que un resolver mínimo instancia la clase correctamente.

### Tareas
- [x] **Diseño del Branded Token (`Token<T>`)**
  - [x] Definir el tipo phantom sobre `symbol` (`unique symbol` brand no exportado a runtime en `source/core/token.ts`).
  - [x] Implementar la función creadora `token<T>(description?: string): Token<T>`.
  - [x] Validar tipado estático verificando que dos tokens con tipos incompatibles (`Token<A>` vs `Token<B>`) no sean asignables entre sí a nivel de TypeScript.
- [x] **Investigación y prototipado del mapeo Constructor ↔ Tokens**
  - [x] Explorar enfoques de asociación: tupla tipada vinculada a la clase vs. helper constructor tipado vs. inferencia por función factoría.
  - [x] Evaluar seguridad frente al gap de Brandi (garantizar en compile-time que el orden y tipo de los tokens correspondan exactamente a los parámetros del constructor).
  - [x] Implementar función de ensamblaje tipado `instantiate(target, tokens, resolve)` en `source/core/assembler.ts`.
- [x] **Resolver y validación mínima en Bun**
  - [x] Implementar resolver funcional que tome constructor y tupla de tokens y resuelva dependencias instanciando con `new`.
  - [x] Validar ejecución exitosa con `bun x tsc --noEmit`.
  - [x] Documentar formalmente la decisión de diseño acordada como base para la Fase 1.

---

## Fase 1 — Core Container & Resolución Síncrona

**Objetivo**: Construir el contenedor básico de inyección de dependencias con soporte síncrono para clases, factorías y valores bajo scope `transient`, ofreciendo `container.resolve()` como método de resolución directo.

- **Criterio de éxito**: Contenedor funcional con API pública de registro (`bind`, `toValue`, `toClass`, `toFactory`) y resolución (`resolve`), que resuelva árboles de dependencias en nanosegundos y falle con errores claros cuando falte un token o se detecte una dependencia circular.

### Tareas
- [x] **Estructura del Registro (Completada en `source/service/builder.ts`)**
  - [x] Diseñar e implementar la API fluida de registro `RegistryBuilder<T>` (`source/service/builder.ts`).
  - [x] Soportar binding a valor constante (`toValue(value)`).
  - [x] Soportar binding a clase (`toClass(Constructor, tokens)`).
  - [x] Soportar binding a factoría síncrona (`toFactory(factoryFn, tokens)`).
  - [x] Prevención de re-binding lanzando `BindingConflictError` al duplicar registro de un token.
- [x] **Fachada del Container y Motor de Resolución (`container.ts` y `resolver.ts`)**
  - [x] Implementar la clase fachada `Container` con almacenamiento interno de bindings (`Map<Token<unknown>, Binding<unknown>>`).
  - [x] Implementar `container.resolve(token): T` como método de resolución síncrono recursivo en nanosegundos.
  - [x] Aplicar scope `transient` por defecto (cada resolución crea una instancia nueva e independiente).
  - [x] Manejar tokens no registrados lanzando `MissingTokenError` con la ruta completa de resolución.
- [x] **Suite de Pruebas de la Fase 1**
  - [x] Tests de resolución de dependencias lineales sincrónicas (`A -> B -> C`).
  - [x] Tests de resolución con factorías síncronas mediante `container.resolve()`.
  - [x] Tests validando que múltiples llamadas con scope transient devuelven referencias distintas (`instance1 !== instance2`).
  - [x] Tests de fallo al solicitar tokens inexistentes.

---

## Fase 2 — Ciclo de Vida y Scopes

**Objetivo**: Incorporar políticas de ciclo de vida de instancias (`singleton` y `resolution-scope`) con almacenamiento síncrono en memoria de alto rendimiento.

- **Criterio de éxito**: Pruebas unitarias que demuestren la preservación exacta de referencias para singletons, aislamiento entre llamadas para transient/resolution-scope y purga determinista con `reset()`.

### Tareas
- [x] **Scope Singleton Síncrono**
  - [x] Extender la API de binding para encadenar scopes: `.inSingletonScope()`, `.inTransientScope()`, `.inResolutionScope()` (`source/service/builder.ts`).
  - [x] Implementar la caché síncrona de instancias singleton dentro del almacenamiento (`SingletonStorage`).
  - [x] Asegurar que dependencias compartidas reutilicen la misma instancia (`instance1 === instance2`).
- [x] **Scope Resolution (Contextual)**
  - [x] Implementar contexto de resolución efímero que comparta instancias solo durante la ejecución de una llamada a `container.resolve()`.
- [x] **Limpieza de Caché**
  - [x] Implementar `container.reset()` para purgar singletons cacheados sin alterar los bindings registrados.
- [x] **Suite de Pruebas de Ciclo de Vida**
  - [x] Tests de identidad referencial en grafos diamante (ej. `A` depende de `B` y `C`, ambos comparten singleton `D`).
  - [x] Tests de resolution scope y tests de `container.reset()`.

---

## Fase 3 — Experiencia de Desarrollo (DX) y Diagnóstico de Errores

**Objetivo**: Convertir el manejo de errores en un factor diferenciador clave de `dockdi`: detectar dependencias circulares antes de desbordar el call stack, y ofrecer mensajes detallados con trazas completas y sugerencias.

- **Criterio de éxito**: Ningún ciclo produce `Maximum call stack size exceeded`; en su lugar, se lanza un error descriptivo inmediato con la secuencia completa del ciclo (ej. `A -> B -> C -> A`).

### Tareas
- [x] **Jerarquía y Utilidades de Diagnóstico (Completada en `source/errors/`)**
  - [x] Crear jerarquía de clases de error dedicadas (`DockdiError`, `BindingConflictError`, `CircularDependencyError`, `MissingTokenError`, `InstantiationError` en `source/errors/catalog.ts`).
  - [x] Formatear el mensaje de ciclo mostrando la ruta completa: `Token[A] -> Token[B] -> Token[C] -> Token[A]` (`source/errors/helpers.ts`).
  - [x] En errores de token faltante (`MissingTokenError`), formatear la traza de resolución identada jerárquicamente (`source/errors/helpers.ts`).
- [x] **Integración en Motor de Resolución**
  - [x] Implementar pila de resolución activa (`activeStack`) durante la invocación recursiva síncrona de `resolve`.
  - [x] Detectar presencia de un token en la pila antes de intentar resolverlo en el pipeline.
  - [x] Interrumpir la ejecución inmediatamente lanzando `CircularDependencyError`.
- [x] **Suite de Pruebas de Diagnóstico**
  - [x] Tests de ciclos directos (`A -> B -> A`) e indirectos (`A -> B -> C -> NodeA`).
  - [x] Tests verificando el formato de traza de resolución y mensajes de error.

---

## Fase 4 — Utilidades de Testing

**Objetivo**: Proporcionar a los consumidores de `dockdi` facilidades ergonómicas y declarativas para sobrescribir dependencias (mocks/stubs) en suites de pruebas unitarias.

- **Criterio de éxito**: Los desarrolladores pueden crear scopes aislados (`container.scope()`) o sobreescribir bindings puntuales (`container.override()`) de forma aislada por test sin contaminar el contenedor original.

### Tareas
- [x] **Mecanismo de Overrides y Scopes**
  - [x] Diseñar e implementar API de sobreescritura mutable (`container.override(token)`).
  - [x] Implementar aislamiento jerárquico mediante contenedores hijo (`container.scope()`).
  - [x] Garantizar que las sobreescrituras invaliden adecuadamente las cachés de singleton afectadas.
- [x] **Suite de Pruebas para Testing Utilities**
  - [x] Tests de aislamiento verificando que un override en un test o scope no afecte al contenedor original ni a otros tests.
  - [x] Tests de sustitución de dependencias anidadas profundas por un mock (`testing/app/service/overrides.test.ts`).

---

## Fase 5 — Empaquetado, Optimización y Publicación

**Objetivo**: Preparar el paquete para su distribución en el ecosistema npm con presupuesto estricto de bundle size, cero dependencias de producción y compatibilidad universal ESM/CJS.

- **Criterio de éxito**: Paquete publicado en npm con artefactos `.mjs`, `.cjs` y `.d.ts`, validado en proyectos cliente puros en Node.js, Bun y navegadores.

### Tareas
- [x] **Configuración de Build Dual**
  - [x] Configurar script de compilación para emitir ESM y CommonJS (`bunup.config.ts`, `format: ["esm", "cjs"]`; `bun run build` genera `dist/index.js` y `dist/index.cjs`).
  - [x] Generar mapas de declaración TypeScript (`.d.ts` y `.d.cts`) — presentes en `dist/` (`dts: true` en `bunup.config.ts`).
  - [x] Configurar `exports`, `main`, `module` y `types` en `package.json` — verificado, incluye subpath `./package.json`.
- [x] **Auditoría de Invariantes**
  - [x] Verificar que `dependencies` en `package.json` permanezca vacío (`0` dependencias en runtime) — confirmado, solo existe `devDependencies`.
  - [x] Medir y documentar el tamaño del bundle (< 3 KB minified) — `minify: true` en `bunup.config.ts`; ESM (`dist/index.js`) mide 443 B, raw, sin gzip (medido y documentado en `deltas/package-distribution.spec.md`).
  - [x] Agregar archivo `LICENSE` en la raíz (MIT, coincide con `package.json`).
  - [x] Documentar `.npmignore` como red de seguridad explícita junto al whitelist de `files` en `package.json` — verificado con `npm pack --dry-run` que solo se empaqueta `dist/`, `LICENSE` y `package.json`.
- [x] **Documentación y Ejemplos**
  - [x] Redactar `README.md` público con guía de inicio rápido y ejemplos de uso (sync y async).
  - [x] Crear ejemplos funcionales listos para ejecutar — `samples/` con 7 ejemplos en inglés cubriendo binding básico, los tres scopes, child containers, overrides de testing, módulos y manejo de errores; verificados con `bun run` uno por uno.
- [ ] **Publicación**
  - [ ] Configurar pipeline de CI/CD para pruebas y publicación automatizada.
  - [ ] Publicar versión `1.0.0` en npm.

---

## Fase 6 — Extensiones Futuras (Fuera del Alcance Inicial)

**Objetivo**: Evaluar e incorporar características avanzadas tras la estabilización de la versión 1.0.

- [ ] **Contenedores Jerárquicos (Child Containers)**: Árboles de contenedores con herencia de bindings y fallback hacia el contenedor padre.
- [ ] **Integración Nativa con Frameworks**: Adaptadores específicos para inyección contextual en frameworks web (ej. Elysia en Bun, Express, Fastify).
- [ ] **Plugins / Middleware de Resolución**: Hooks para instrumentación, telemetría y logging de resoluciones.
