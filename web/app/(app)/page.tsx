import { createClient } from "@/lib/supabase/server";
import {
  type ElementoTablero,
  obtenerCicloAbierto,
  obtenerElementosTablero,
  obtenerEntradaPendiente,
  obtenerPlantilla,
  obtenerSistemas,
} from "@/lib/datos";
import { SinCiclo } from "@/components/SinCiclo";
import { Tablero } from "./Tablero";

const MS_POR_DIA = 86_400_000;

// El inicio es el tablero — antes era un menú de seis tarjetas y el
// tablero vivía aparte en /tablero. Ver docs/decisiones.md D-21.
export default async function InicioPage() {
  const supabase = await createClient();
  const ciclo = await obtenerCicloAbierto(supabase);

  if (!ciclo) {
    return (
      <SinCiclo>
        No hay ningún ciclo abierto todavía. Abrir uno nuevo —clonando el catálogo del anterior—
        todavía se hace con <code className="bg-white px-1 py-0.5">scripts/cargar_catalogo.py --confirmar</code>.
      </SinCiclo>
    );
  }

  const todosLosSistemas = await obtenerSistemas(supabase);
  const clavesCaptura = ciclo.config.captura_directa ?? [];
  const sistemasActivos = todosLosSistemas.filter((s) => ciclo.config.sistemas_activos?.includes(s.clave));

  const porSistema = await Promise.all(
    sistemasActivos.map(async (sistema) => {
      const [elementos, plantilla] = await Promise.all([
        obtenerElementosTablero(supabase, ciclo.id, sistema.id),
        obtenerPlantilla(supabase, ciclo.id, sistema.id),
      ]);
      return { sistema, elementos, plantilla };
    }),
  );

  const entradaPendiente = await obtenerEntradaPendiente(supabase, ciclo.id);

  // --- Mi captura: total/completo/parcial por sistema + siguiente pendiente ---
  const captura = porSistema
    .filter(({ sistema }) => clavesCaptura.includes(sistema.clave))
    .map(({ sistema, elementos }) => {
      const total = elementos.length;
      const completo = elementos.filter((e) => e.registro?.estado === "completo").length;
      const parcial = elementos.filter((e) => e.registro?.estado === "parcial").length;
      const siguiente = elementos.find((e) => e.registro?.estado !== "completo") ?? null;
      return {
        clave: sistema.clave,
        nombre: sistema.nombre,
        rag: sistema.rag,
        total,
        completo,
        parcial,
        pendiente: total - completo,
        siguientePendiente: siguiente && { id: siguiente.id, nombre: siguiente.nombre },
      };
    });

  const pendientesCaptura = captura.reduce((acc, s) => acc + s.pendiente, 0);
  const ritmo = calcularRitmo(pendientesCaptura, ciclo.config.fechas?.ejecucion_fin);

  // --- Recepción: avance por responsable ---
  const elementosRecepcion = porSistema
    .filter(({ sistema }) => !clavesCaptura.includes(sistema.clave))
    .flatMap(({ elementos }) => elementos);
  const responsables = agruparPorResponsable(elementosRecepcion);

  // --- Tabla detallada: todos los sistemas activos ---
  const momentosPorSistema: Record<string, { id: string; etiqueta: string }[]> = {};
  for (const { sistema, plantilla } of porSistema) {
    momentosPorSistema[sistema.clave] = (plantilla?.fotos ?? []).map((f) => ({ id: f.id, etiqueta: f.etiqueta }));
  }

  const filas = porSistema.flatMap(({ sistema, elementos }) =>
    elementos.map((e) => ({
      elementoId: e.id,
      sistemaClave: sistema.clave,
      sistemaNombre: sistema.nombre,
      codigo: e.codigo,
      nombre: e.nombre,
      ubicacion: e.ubicacion,
      responsable: e.responsable,
      estado: e.registro?.estado ?? ("sin_iniciar" as const),
      fotosPorMomento: e.fotosPorMomento,
      capturadoPor: e.registro?.capturado_por ?? null,
      actualizado: e.registro?.actualizado ?? null,
    })),
  );

  return (
    <Tablero
      ciclo={{ clave: ciclo.clave, nombre: ciclo.nombre }}
      sistemas={porSistema.map(({ sistema }) => ({ clave: sistema.clave, nombre: sistema.nombre }))}
      captura={captura}
      ritmo={ritmo}
      responsables={responsables}
      entradaPendienteCount={entradaPendiente.length}
      momentosPorSistema={momentosPorSistema}
      filas={filas}
    />
  );
}

function calcularRitmo(pendientes: number, ejecucionFin: string | undefined) {
  if (!ejecucionFin) return { disponible: false as const };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(`${ejecucionFin}T00:00:00`);
  const diasRestantes = Math.ceil((fin.getTime() - hoy.getTime()) / MS_POR_DIA);

  return { disponible: true as const, pendientes, diasRestantes, ejecucionFin };
}

function agruparPorResponsable(elementos: ElementoTablero[]) {
  const grupos = new Map<string, ElementoTablero[]>();
  for (const e of elementos) {
    const clave = e.responsable ?? "Sin responsable asignado";
    const grupo = grupos.get(clave);
    if (grupo) grupo.push(e);
    else grupos.set(clave, [e]);
  }

  return [...grupos.entries()]
    .map(([responsable, els]) => {
      const total = els.length;
      const llegaron = els.filter((e) => e.registro?.estado === "completo").length;
      const ultimaActividad = els
        .map((e) => e.registro?.actualizado)
        .filter((f): f is string => Boolean(f))
        .sort()
        .at(-1);
      const diasSinReportar = ultimaActividad
        ? Math.floor((Date.now() - new Date(ultimaActividad).getTime()) / MS_POR_DIA)
        : null;
      return { responsable, total, llegaron, faltan: total - llegaron, diasSinReportar };
    })
    .sort((a, b) => a.responsable.localeCompare(b.responsable, "es"));
}
