import { Injectable, Logger } from '@nestjs/common';

export interface AddressSuggestion {
  label: string;
  road?: string;
  neighborhood?: string;
  district?: string;
  province?: string;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Sugestões de endereço via Nominatim (OpenStreetMap), restritas a Moçambique (countrycodes=mz).
 * Serviço gratuito e sem chave de API — respeita a política de uso identificando-se com User-Agent.
 */
@Injectable()
export class AddressLookupService {
  private readonly logger = new Logger(AddressLookupService.name);
  private readonly cache = new Map<string, { at: number; data: AddressSuggestion[] }>();

  async search(query: string): Promise<AddressSuggestion[]> {
    const q = query.trim();
    if (q.length < 3) return [];

    const cacheKey = q.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('countrycodes', 'mz');
    url.searchParams.set('limit', '6');
    url.searchParams.set('accept-language', 'pt');
    url.searchParams.set('q', q);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'AgenciaFunerariaEspiritoSanto/1.0 (sistema interno de adesao)',
        },
      });
      if (!response.ok) return [];

      const results = (await response.json()) as any[];
      const suggestions: AddressSuggestion[] = results.map((r) => {
        const addr = r.address ?? {};
        return {
          label: r.display_name,
          road: addr.road,
          neighborhood: addr.suburb || addr.neighbourhood || addr.quarter || addr.village,
          district: addr.county || addr.city_district || addr.municipality || addr.town || addr.city,
          province: addr.state,
        };
      });

      this.cache.set(cacheKey, { at: Date.now(), data: suggestions });
      return suggestions;
    } catch (err) {
      this.logger.warn(`Falha ao consultar API de endereços: ${(err as Error).message}`);
      return [];
    }
  }
}
