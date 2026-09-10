# Roadmap de dockdi

Documento de seguimiento manual y local del progreso de desarrollo de `dockdi`. Cada fase contiene su objetivo central, criterios de éxito y la lista detallada de tareas con casillas de verificación (`- [ ]`) para el control de avance.

---

## Estado General del Proyecto

| Fase | Descripción | Estado |
|---|---|---|
| **Fase 0** | Mecanismo central y validación (Constructor ↔ Tokens) | 🟢 Completada |
| **Fase 1** | Core container & Resolución unificada (`bind`, `resolve`, Transient, sync/async) | 🟢 Completada |
| **Fase 2** | Ciclo de vida y Scopes (Singleton con deduplicación de promesas, Resolution Scope) | 🟢 Completada |
| **Fase 3** | DX de errores (Ciclos con traza completa sync/async y sugerencias) | 🟢 Completada |
| **Fase 4** | Utilidades de testing (Mocking y Overrides) | 🟢 Completada |
| **Fase 5** | Empaquetado y publicación (Dual ESM/CJS, npm) | ⚪ Pendiente |
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

## Fase 1 — Core Container & Resolución Unificada

**Objetivo**: Construir el contenedor básico de inyección de dependencias con soporte nativo y unificado para factorías síncronas y asíncronas bajo scope `transient`, ofreciendo `container.resolve()` como método de resolución universal.

- **Criterio de éxito**: Contenedor funcional con API pública de registro (`bind`, `toValue`, `toClass`, `toFactory` unificado para sync/async) y resolución (`resolve`), que resuelva árboles de dependencias mixtos y falle con errores claros cuando falte un token o se detecte una dependencia circular.

### Tareas
- [x] **Estructura del Registro Unificado (Completada en `source/service/builder.ts`)**
  - [x] Diseñar e implementar la API fluida de registro `RegistryBuilder<T>` (`source/service/builder.ts`).
  - [x] Soportar binding a valor constante (`toValue(value)`).
  - [x] Soportar binding a clase (`toClass(Constructor, tokens)`).
  - [x] Soportar binding a factoría polimórfica (`toFactory(factoryFn, tokens)`), aceptando retornos tanto síncronos (`T`) como asíncronos (`Promise<T>`) de forma transparente sin métodos separados.
  - [x] Prevención de re-binding lanzando `BindingConflictError` al duplicar registro de un token.
- [x] **Fachada del Container y Motor de Resolución (`container.ts` y `resolver.ts`)**
  - [x] Implementar la clase fachada `Container` con almacenamiento interno de bindings (`Map<Token<unknown>, Binding<unknown>>`).
  - [x] Implementar `container.resolve(token): Promise<T>` como método universal capaz de resolver dependencias de forma recursiva, esperando promesas en cualquier punto del árbol y ejecutando clases y factorías.
  - [x] Aplicar scope `transient` por defecto (cada resolución crea una instancia nueva e independiente).
  - [x] Manejar tokens no registrados lanzando `MissingTokenError` con sugerencias de tokens similares.
- [x] **Suite de Pruebas de la Fase 1**
  - [x] Tests de resolución de dependencias lineales sincrónicas (`A -> B -> C`).
  - [x] Tests de resolución con factorías asíncronas mediante `container.resolve()`.
  - [x] Tests de resolución mixta (clases síncronas que dependen de factorías asíncronas).
  - [x] Tests validando que múltiples llamadas con scope transient devuelven referencias distintas (`instance1 !== instance2`).
  - [x] Tests de fallo al solicitar tokens inexistentes.

---

## Fase 2 — Ciclo de Vida y Scopes

**Objetivo**: Incorporar políticas de ciclo de vida de instancias (`singleton` y `resolution-scope`) con soporte transparente para factorías asíncronas mediante deduplicación de promesas concurrentes en vuelo.

- **Criterio de éxito**: Pruebas unitarias que demuestren la preservación exacta de referencias para singletons (tanto síncronos como asíncronos), deduplicación de promesas concurrentes y aislamiento entre llamadas para transient/resolution-scope.

### Tareas
- [x] **Scope Singleton con Manejo Asíncrono**
  - [x] Extender la API de binding para encadenar scopes: `.inSingletonScope()`, `.inTransientScope()`, `.inResolutionScope()` (`BindingRecord` en `source/service/builder.ts`).
  - [x] Implementar la caché de instancias singleton dentro del contenedor (`singletonCache`).
  - [x] Implementar deduplicación de promesas en vuelo (*in-flight promise deduplication*) para factorías asíncronas en singleton scope: resoluciones concurrentes comparten la misma promesa.
  - [x] Asegurar que resoluciones concurrentes o dependencias compartidas reutilicen la misma instancia (`instance1 === instance2`).
- [x] **Scope Resolution (Contextual)**
  - [x] Implementar contexto de resolución efímero que comparta instancias solo durante el ciclo de ejecución de un único `container.resolve()`.
- [x] **Limpieza de Caché**
  - [x] Implementar `container.reset()` para purgar singletons cacheados y promesas pendientes sin alterar los bindings registrados.
- [x] **Suite de Pruebas de Ciclo de Vida**
  - [x] Tests de identidad referencial en grafos diamante (ej. `A` depende de `B` y `C`, ambos dependen del singleton `D`).
  - [x] Tests de concurrencia para singletons asíncronos verificando que la factoría se ejecuta exactamente una vez.
  - [x] Tests de resolution scope y tests de `container.reset()`.

---

## Fase 3 — Experiencia de Desarrollo (DX) y Diagnóstico de Errores

**Objetivo**: Convertir el manejo de errores en un factor diferenciador clave de `dockdi`: detectar dependencias circulares antes de desbordar el stack en resoluciones asíncronas, y ofrecer mensajes detallados con trazas completas y sugerencias.

- **Criterio de éxito**: Ningún ciclo produce `Maximum call stack size exceeded` ni `UnhandledPromiseRejection`; en su lugar, se lanza un error descriptivo con la secuencia completa del ciclo (ej. `A -> B -> C -> A`).

### Tareas
- [x] **Jerarquía y Utilidades de Diagnóstico (Completada en `source/errors/`)**
  - [x] Crear jerarquía de clases de error dedicadas (`DockdiError`, `BindingConflictError`, `CircularDependencyError`, `MissingTokenError`, `AsyncBindingError` en `source/errors/catalog.ts`).
  - [x] Formatear el mensaje de ciclo mostrando la ruta completa: `Token[A] -> Token[B] -> Token[C] -> Token[A]` (`source/errors/helpers.ts`).
  - [x] En errores de token faltante (`MissingTokenError`), inspeccionar el registro y sugerir tokens con descripciones similares mediante cálculo de distancia Levenshtein (`source/errors/suggest.ts`).
- [x] **Integración en Motor de Resolución**
  - [x] Implementar pila de resolución activa (`activeStack`) durante la invocación recursiva de `resolve`.
  - [x] Detectar presencia de un token en la pila antes de intentar resolverlo en el pipeline.
  - [x] Interrumpir la ejecución inmediatamente lanzando `CircularDependencyError`.
- [x] **Suite de Pruebas de Diagnóstico**
  - [x] Tests de ciclos directos (`A -> B -> A`) e indirectos (`A -> B -> C -> NodeA`).
  - [x] Tests verificando el texto exacto y las sugerencias de tokens similares (Levenshtein).

---

## Fase 4 — Utilidades de Testing

**Objetivo**: Proporcionar a los consumidores de `dockdi` facilidades ergonómicas y declarativas para sobrescribir dependencias (mocks/stubs) en suites de pruebas unitarias.

- **Criterio de éxito**: Los desarrolladores pueden crear snapshots, clonar contenedores o sobrescribir bindings puntuales de forma aislada por test sin contaminar el contenedor original.

### Tareas
- [x] **Mecanismo de Overrides / Mocks**
  - [x] Diseñar API de sobreescritura (ej. `container.override(token).toValue(mock)` o `container.createChild()` acotado a pruebas).
  - [x] Implementar restauración de bindings (`restore()` o `snapshot()`).
  - [x] Garantizar que las sobreescrituras invaliden adecuadamente las cachés de singleton afectadas.
- [x] **Suite de Pruebas para Testing Utilities**
  - [x] Tests de aislamiento verificando que un override en un test no afecte a resoluciones en tests posteriores.
  - [x] Tests de sustitución de dependencias anidadas profundas por un mock.

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
