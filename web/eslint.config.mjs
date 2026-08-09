import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next 16 exporta configuración plana nativa: no hace falta
// (ni conviene) pasarla por FlatCompat, que está pensado para paquetes
// legados con el formato .eslintrc y aquí produce un objeto circular.
const eslintConfig = [...nextCoreWebVitals, ...nextTypescript];

export default eslintConfig;
