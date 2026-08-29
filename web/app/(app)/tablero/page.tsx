import { redirect } from "next/navigation";

// El tablero pasó a ser el inicio — ver docs/decisiones.md D-21.
export default function TableroRedirect() {
  redirect("/");
}
