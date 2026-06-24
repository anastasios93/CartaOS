/**
 * Spain AEMPS CIMA (Centro de Información de Medicamentos) REST client.
 * Spanish national medicines registry — keyless, the cleanest EU national API.
 * Docs: https://cima.aemps.es/cima/rest/
 * Auth: none.
 */

import { fetchJSON } from "./http";

const BASE_URL = "https://cima.aemps.es/cima/rest/medicamentos";

export interface CimaMedicine {
  nregistro: string;
  nombre: string;
  labTitular: string;
  comercializado: boolean;
  generico: boolean;
}

interface CimaRaw {
  resultados?: {
    nregistro?: string;
    nombre?: string;
    labtitular?: string;
    comerc?: boolean;
    generico?: boolean;
    receta?: boolean;
  }[];
  totalFilas?: number;
}

/**
 * Search the Spanish CIMA registry for medicines by (partial) name.
 *
 * @param name   Medicine name fragment.
 * @param limit  Max results to return (default 10).
 */
export async function searchCima(name: string, limit = 10): Promise<CimaMedicine[]> {
  const url = `${BASE_URL}?nombre=${encodeURIComponent(name)}`;
  const data = await fetchJSON<CimaRaw>(url);

  const resultados = data.resultados ?? [];
  return resultados.slice(0, limit).map((r) => ({
    nregistro: r.nregistro ?? "",
    nombre: r.nombre ?? "",
    labTitular: r.labtitular ?? "",
    comercializado: Boolean(r.comerc),
    generico: Boolean(r.generico),
  }));
}
