// Genera un archivo en el navegador a partir de texto ya armado (CSV o
// JSON) y dispara su descarga, sin pasar por el servidor — los datos ya
// están cargados en la pantalla para pintarla, así que exportarlos no
// cuesta una segunda consulta.
export function descargar(nombre: string, contenido: string, tipo: string) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}
