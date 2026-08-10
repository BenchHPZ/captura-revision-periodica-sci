// NFD separa cada letra acentuada en la letra base + una marca combinante
// (bloque Unicode U+0300-U+036F); quitar esa marca permite comparar "á"
// con "a" al buscar. Se arma con new RegExp(...) y no con un /literal/
// porque el caracter combinante en crudo se renderiza pegado al vecino en
// cualquier editor y es fácil copiarlo mal sin notarlo.
const MARCA_DIACRITICA = new RegExp("[̀-ͯ]", "g");

export function normaliza(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(MARCA_DIACRITICA, "");
}
