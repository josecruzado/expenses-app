# 📱 CSS Architecture - Expenses App

## 🎯 Estructura Homologada

La nueva arquitectura CSS está organizada de forma modular y escalable, siguiendo las mejores prácticas de desarrollo y el sistema de diseño iOS 18.

## 📁 Estructura de Archivos

```
src/
├── styles/
│   ├── base/
│   │   ├── tokens.css      # Variables CSS y Design Tokens
│   │   ├── reset.css       # Reset del navegador y configuración base
│   │   └── typography.css  # Sistema tipográfico
│   ├── components/
│   │   ├── base.css        # Componentes base reutilizables
│   │   └── expenses.css    # Componentes específicos de la app
│   ├── layout/
│   │   └── navigation.css  # Navegación, modales, alerts
│   └── utilities/
│       └── helpers.css     # Clases utilitarias
└── app.css            # Archivo principal que importa todo
```

## 🎨 Convención de Nomenclatura

### Variables CSS (Design Tokens)
```css
--color-{categoria}-{variante}
--font-size-{escala-ios}
--font-weight-{peso}
--spacing-{tamaño}
--radius-{tamaño}
```

### Clases CSS
```css
/* Componentes */
.component-name
.component-name__element
.component-name--modifier

/* Estados */
.is-active
.is-loading
.is-disabled

/* Utilidades */
.u-{propiedad}-{valor}
```

## 🧩 Componentes Base

### Botones
```css
.btn                  /* Base */
.btn-primary         /* Variante azul */
.btn-secondary       /* Variante gris */
.btn-destructive     /* Variante roja */
.btn-ghost           /* Transparente */
.btn-sm              /* Pequeño */
.btn-lg              /* Grande */
```

### Cards
```css
.card                /* Card base */
.card-interactive    /* Card clickeable */
.card-sm             /* Card pequeña */
.card-lg             /* Card grande */
```

### Inputs
```css
.input               /* Input base */
.textarea            /* Textarea */
.select              /* Select */
```

### Lists
```css
.list                /* Lista base */
.list-item           /* Item de lista */
.list-item-icon      /* Ícono del item */
.list-item-content   /* Contenido principal */
.list-item-title     /* Título del item */
.list-item-subtitle  /* Subtítulo */
.list-item-meta      /* Información adicional */
.list-item-trailing  /* Contenido al final */
```

## 💼 Componentes Específicos de Expenses

### Stats
```css
.stats-grid          /* Grid de estadísticas */
.stat-card           /* Card individual de stat */
.stat-icon           /* Ícono de la stat */
.stat-content        /* Contenido de la stat */
.stat-value          /* Valor numérico */
.stat-label          /* Etiqueta descriptiva */
```

### Transactions/Expenses
```css
.expense-item        /* Item de gasto */
.expense-icon        /* Ícono del gasto */
.expense-details     /* Detalles del gasto */
.expense-title       /* Título/categoría */
.expense-date        /* Fecha */
.expense-note        /* Nota opcional */
.expense-amount      /* Monto */

.transaction-item    /* Item de transacción */
.transaction-icon    /* Ícono de transacción */
.transaction-details /* Detalles de transacción */
.transaction-title   /* Título */
.transaction-date    /* Fecha */
.transaction-amount  /* Monto */
.transaction-note    /* Nota */
```

### Filters
```css
.filters-section     /* Contenedor de filtros */
.search-box          /* Contenedor de búsqueda */
.search-input        /* Input de búsqueda */
.filter-controls     /* Controles de filtro */
.filter-select       /* Select de filtro */
```

## 🎯 Layout Components

### Navigation
```css
.nav-bar             /* Barra de navegación */
.nav-content         /* Contenido de navegación */
.nav-title           /* Título de navegación */
.nav-actions         /* Acciones de navegación */

.tab-bar             /* Barra de tabs inferior */
.tab-content         /* Contenido de tabs */
.tab-item            /* Item individual de tab */
.tab-icon            /* Ícono del tab */
.tab-label           /* Label del tab */
```

### Modals & Alerts
```css
.modal-overlay       /* Overlay del modal */
.modal               /* Modal */
.modal-header        /* Header del modal */
.modal-title         /* Título del modal */
.modal-close         /* Botón de cierre */
.modal-body          /* Cuerpo del modal */
.modal-footer        /* Footer del modal */

.alert               /* Alert base */
.alert-error         /* Alert de error */
.alert-warning       /* Alert de advertencia */
.alert-success       /* Alert de éxito */
.alert-header        /* Header del alert */
.alert-icon          /* Ícono del alert */
.alert-title         /* Título del alert */
.alert-message       /* Mensaje del alert */
.alert-actions       /* Acciones del alert */
```

## 🛠️ Utilities

### Layout
```css
.flex, .flex-col, .flex-row
.items-center, .items-start, .items-end
.justify-center, .justify-between, .justify-around
.w-full, .h-full, .flex-1
```

### Spacing
```css
.m-{size}, .mt-{size}, .mb-{size}, .ml-{size}, .mr-{size}
.mx-{size}, .my-{size}
.p-{size}, .pt-{size}, .pb-{size}, .pl-{size}, .pr-{size}
.px-{size}, .py-{size}
.gap-{size}

/* Tamaños: 0, xs, sm, md, lg, xl, 2xl */
```

### Visual
```css
.rounded-{size}      /* Border radius */
.opacity-{value}     /* Opacidad */
.scale-{value}       /* Transform scale */
.transition-{speed}  /* Transiciones */
```

### iOS Specific
```css
.ios-blur            /* Backdrop blur iOS */
.ios-safe-top        /* Safe area top */
.ios-safe-bottom     /* Safe area bottom */
.ios-safe-x          /* Safe area horizontal */
.ios-safe-y          /* Safe area vertical */
.momentum-scroll     /* Scroll momentum iOS */
.tap-highlight-none  /* Sin highlight en tap */
```

## 🎨 Design Tokens

### Colores
```css
/* Backgrounds */
--color-bg-primary
--color-bg-secondary
--color-bg-tertiary

/* Text */
--color-text-primary
--color-text-secondary
--color-text-tertiary

/* UI Elements */
--color-fill-primary
--color-fill-secondary
--color-separator

/* Semantic Colors */
--color-blue
--color-green
--color-red
--color-orange
--color-purple
```

### Tipografía
```css
/* iOS Font Sizes */
--font-size-large-title
--font-size-title-1
--font-size-title-2
--font-size-title-3
--font-size-headline
--font-size-body
--font-size-footnote
--font-size-caption-1

/* Font Weights */
--font-weight-regular
--font-weight-medium
--font-weight-semibold
--font-weight-bold
```

### Spacing
```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px
--spacing-2xl: 48px
```

### Border Radius
```css
--radius-sm: 6px
--radius-md: 10px
--radius-lg: 14px
--radius-xl: 20px
--radius-2xl: 28px
```

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First (default) 0px - 479px */
@media (min-width: 480px)  /* Large Mobile */
@media (min-width: 768px)  /* Tablet */
@media (min-width: 1024px) /* Desktop */
@media (min-width: 1440px) /* Large Desktop */
```

## 🔄 Migración

### Pasos para migrar
1. **Reemplazar** `app.css` por `app-new.css`
2. **Actualizar** clases en componentes Svelte:
   - `.primary-button` → `.btn.btn-primary`
   - `.stat-card` → `.stat-card` (sin cambios)
   - `.expense-item` → `.expense-item` (sin cambios)
3. **Aprovechar** las nuevas utilidades para simplificar CSS
4. **Eliminar** CSS duplicado en componentes

### Ejemplo de migración en componente:
```html
<!-- Antes -->
<button class="primary-button">
  <span class="button-icon">➕</span>
  <span>Add Expense</span>
</button>

<!-- Después -->
<button class="btn btn-primary">
  <span class="button-icon">➕</span>
  <span>Add Expense</span>
</button>
```

## ✅ Beneficios

1. **Consistencia**: Todos los componentes usan las mismas variables
2. **Mantenibilidad**: Cambios centralizados en design tokens
3. **Escalabilidad**: Fácil agregar nuevos componentes
4. **Performance**: CSS optimizado y sin duplicaciones
5. **Developer Experience**: Nomenclatura clara y predecible
6. **iOS Native Feel**: Perfecta integración con Dynamic Island
7. **Responsive**: Mobile-first con breakpoints consistentes
8. **Accessibility**: Focus states y utilidades de accesibilidad

## 📚 Referencias

- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [BEM Methodology](https://bem.info/)
- [Utility-First CSS](https://tailwindcss.com/docs/utility-first)
