declare module "shapefile" {
  interface Source {
    read(): Promise<{
      done: boolean;
      value: {
        properties: Record<string, string | number | null>;
        geometry: { type: string; coordinates: unknown } | null;
      };
    }>;
  }
  export function open(shp: Uint8Array, dbf: Uint8Array, options?: { encoding?: string }): Promise<Source>;
}
