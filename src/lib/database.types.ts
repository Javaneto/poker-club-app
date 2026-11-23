// Arquivo gerado — não editar à mão.
// Regenerar com: pnpm supabase gen types typescript --local > src/lib/database.types.ts
// Placeholder até a primeira migration (Fase 2): esquema público vazio.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
