import type { Config } from "tailwindcss";

// Paleta e identidad visual de Volkswagen de México. Deep Space Blue domina
// (~50% del peso visual), Vivid Green para subtítulos y acentos, Electric
// Neon únicamente sobre fondo oscuro. Ver el lineamiento de marca interno
// para el detalle completo; aquí sólo se declaran los tokens que la app usa.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "vw-deep-space": "#002733",
        "vw-vivid-green": "#008C82",
        "vw-electric-neon": "#C2FE06",
        "vw-dsb-90": "#193D47",
        "vw-dsb-60": "#667D85",
        "vw-dsb-20": "#CCD4D6",
        "vw-dsb-10": "#E5E9EB",
        "vw-vg-80": "#33A39B",
        "vw-vg-40": "#99D1CD",
        "vw-vg-10": "#E5F3F2",
        "vw-red": "#DA0C1F",
        "vw-amber": "#FCCD22",
        "vw-green": "#64A844",
      },
      fontFamily: {
        // La tipografía corporativa "The Group" es un activo con licencia
        // restringida; no se distribuye en un despliegue público. Esta
        // pila reproduce el mismo carácter geométrico y sobrio.
        head: ["Century Gothic", "Avenir Next", "system-ui", "sans-serif"],
        text: ["Segoe UI", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        // La marca no usa esquinas redondeadas en tarjetas ni controles.
        // Se conserva 'full' para los pocos elementos legítimamente
        // circulares (indicadores de estado).
        none: "0px",
        DEFAULT: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        "3xl": "0px",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
