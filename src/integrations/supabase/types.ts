export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ConsolidadoPerformance: {
        Row: {
          Competencia: string | null
          created_at: string
          Data: string | null
          "Ganho Financeiro": number | null
          id: number
          Impostos: number | null
          Instituicao: string | null
          Moeda: string | null
          Movimentação: number | null
          Nome: string | null
          nomeConta: string | null
          "Patrimonio Final": number | null
          "Patrimonio Inicial": number | null
          Rendimento: number | null
        }
        Insert: {
          Competencia?: string | null
          created_at?: string
          Data?: string | null
          "Ganho Financeiro"?: number | null
          id?: number
          Impostos?: number | null
          Instituicao?: string | null
          Moeda?: string | null
          Movimentação?: number | null
          Nome?: string | null
          nomeConta?: string | null
          "Patrimonio Final"?: number | null
          "Patrimonio Inicial"?: number | null
          Rendimento?: number | null
        }
        Update: {
          Competencia?: string | null
          created_at?: string
          Data?: string | null
          "Ganho Financeiro"?: number | null
          id?: number
          Impostos?: number | null
          Instituicao?: string | null
          Moeda?: string | null
          Movimentação?: number | null
          Nome?: string | null
          nomeConta?: string | null
          "Patrimonio Final"?: number | null
          "Patrimonio Inicial"?: number | null
          Rendimento?: number | null
        }
        Relationships: []
      }
      DadosPerformance: {
        Row: {
          Ativo: string | null
          "Classe do ativo": string | null
          Competencia: string | null
          created_at: string
          Data: string | null
          Emissor: string | null
          id: number
          Instituicao: string | null
          Moeda: string | null
          Nome: string | null
          nomeConta: string | null
          Posicao: number | null
          Rendimento: number | null
          rentabilidade_validada: boolean | null
          Taxa: string | null
          Vencimento: string | null
        }
        Insert: {
          Ativo?: string | null
          "Classe do ativo"?: string | null
          Competencia?: string | null
          created_at?: string
          Data?: string | null
          Emissor?: string | null
          id?: number
          Instituicao?: string | null
          Moeda?: string | null
          Nome?: string | null
          nomeConta?: string | null
          Posicao?: number | null
          Rendimento?: number | null
          rentabilidade_validada?: boolean | null
          Taxa?: string | null
          Vencimento?: string | null
        }
        Update: {
          Ativo?: string | null
          "Classe do ativo"?: string | null
          Competencia?: string | null
          created_at?: string
          Data?: string | null
          Emissor?: string | null
          id?: number
          Instituicao?: string | null
          Moeda?: string | null
          Nome?: string | null
          nomeConta?: string | null
          Posicao?: number | null
          Rendimento?: number | null
          rentabilidade_validada?: boolean | null
          Taxa?: string | null
          Vencimento?: string | null
        }
        Relationships: []
      }
      extrato_status_log: {
        Row: {
          cliente: string
          competencia: string
          created_at: string | null
          detalhes: Json | null
          id: string
          instituicao: string
          ip_origem: string | null
          mensagem: string | null
          sistema_origem: string | null
          status: string
          submission_id: string | null
          tipo_extrato: string | null
          webhook_timestamp: string | null
        }
        Insert: {
          cliente: string
          competencia: string
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          instituicao: string
          ip_origem?: string | null
          mensagem?: string | null
          sistema_origem?: string | null
          status: string
          submission_id?: string | null
          tipo_extrato?: string | null
          webhook_timestamp?: string | null
        }
        Update: {
          cliente?: string
          competencia?: string
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          instituicao?: string
          ip_origem?: string | null
          mensagem?: string | null
          sistema_origem?: string | null
          status?: string
          submission_id?: string | null
          tipo_extrato?: string | null
          webhook_timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extrato_status_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          created_at: string
          default_currency: string | null
          id: string
          name: string
          requires_additional_file: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_currency?: string | null
          id?: string
          name: string
          requires_additional_file?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_currency?: string | null
          id?: string
          name?: string
          requires_additional_file?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      keepalive: {
        Row: {
          alive: boolean | null
          created_at: string
          id: number
        }
        Insert: {
          alive?: boolean | null
          created_at?: string
          id?: number
        }
        Update: {
          alive?: boolean | null
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      PoliticaInvestimentos: {
        Row: {
          "Ações - Ativos": number | null
          "Ações - ETFs": number | null
          "Ações - Fundos": number | null
          "Ações - Long Biased": number | null
          "CDI - Fundos": number | null
          "CDI - Liquidez": number | null
          "CDI - Titulos": number | null
          Cliente: string | null
          COE: number | null
          created_at: string
          Criptoativos: number | null
          "Exterior - Ações": number | null
          "Exterior - Renda Fixa": number | null
          id: number
          "Imobiliário - Ativos": number | null
          "Imobiliário - Fundos": number | null
          "Inflação - Fundos": number | null
          "Inflação - Titulos": number | null
          "Meta de Retorno": string | null
          Multimercado: number | null
          Ouro: number | null
          "Pré Fixado - Fundos": number | null
          "Pré Fixado - Titulos": number | null
          "Private Equity/Venture Capital/Special Sits": number | null
        }
        Insert: {
          "Ações - Ativos"?: number | null
          "Ações - ETFs"?: number | null
          "Ações - Fundos"?: number | null
          "Ações - Long Biased"?: number | null
          "CDI - Fundos"?: number | null
          "CDI - Liquidez"?: number | null
          "CDI - Titulos"?: number | null
          Cliente?: string | null
          COE?: number | null
          created_at?: string
          Criptoativos?: number | null
          "Exterior - Ações"?: number | null
          "Exterior - Renda Fixa"?: number | null
          id?: number
          "Imobiliário - Ativos"?: number | null
          "Imobiliário - Fundos"?: number | null
          "Inflação - Fundos"?: number | null
          "Inflação - Titulos"?: number | null
          "Meta de Retorno"?: string | null
          Multimercado?: number | null
          Ouro?: number | null
          "Pré Fixado - Fundos"?: number | null
          "Pré Fixado - Titulos"?: number | null
          "Private Equity/Venture Capital/Special Sits"?: number | null
        }
        Update: {
          "Ações - Ativos"?: number | null
          "Ações - ETFs"?: number | null
          "Ações - Fundos"?: number | null
          "Ações - Long Biased"?: number | null
          "CDI - Fundos"?: number | null
          "CDI - Liquidez"?: number | null
          "CDI - Titulos"?: number | null
          Cliente?: string | null
          COE?: number | null
          created_at?: string
          Criptoativos?: number | null
          "Exterior - Ações"?: number | null
          "Exterior - Renda Fixa"?: number | null
          id?: number
          "Imobiliário - Ativos"?: number | null
          "Imobiliário - Fundos"?: number | null
          "Inflação - Fundos"?: number | null
          "Inflação - Titulos"?: number | null
          "Meta de Retorno"?: string | null
          Multimercado?: number | null
          Ouro?: number | null
          "Pré Fixado - Fundos"?: number | null
          "Pré Fixado - Titulos"?: number | null
          "Private Equity/Venture Capital/Special Sits"?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      RAG_Processador: {
        Row: {
          Ativo: string | null
          Classificacao: string | null
          created_at: string
          id: number
        }
        Insert: {
          Ativo?: string | null
          Classificacao?: string | null
          created_at?: string
          id?: number
        }
        Update: {
          Ativo?: string | null
          Classificacao?: string | null
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      submissions: {
        Row: {
          cliente: string
          competencia: string
          created_at: string
          id: string
          instituicao: string
          moeda: string
          nome_conta: string | null
          status: string | null
          tipos: Json
          ultimo_status: string | null
          ultimo_status_at: string | null
          user_id: string
          webhook_response: Json | null
        }
        Insert: {
          cliente: string
          competencia: string
          created_at?: string
          id?: string
          instituicao: string
          moeda: string
          nome_conta?: string | null
          status?: string | null
          tipos: Json
          ultimo_status?: string | null
          ultimo_status_at?: string | null
          user_id: string
          webhook_response?: Json | null
        }
        Update: {
          cliente?: string
          competencia?: string
          created_at?: string
          id?: string
          instituicao?: string
          moeda?: string
          nome_conta?: string | null
          status?: string | null
          tipos?: Json
          ultimo_status?: string | null
          ultimo_status_at?: string | null
          user_id?: string
          webhook_response?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          created_at: string
          id: number
          nome: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          nome?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      verification_settings: {
        Row: {
          correct_threshold: number
          id: number
          tolerance_value: number
          updated_at: string
        }
        Insert: {
          correct_threshold?: number
          id?: never
          tolerance_value?: number
          updated_at?: string
        }
        Update: {
          correct_threshold?: number
          id?: never
          tolerance_value?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_extrato_logs: { Args: never; Returns: undefined }
      get_unique_clients: {
        Args: never
        Returns: {
          Cliente: string
          "Meta de Retorno": string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      tipo: "Supermarcado" | "Diversão" | "Saúde" | "Educação"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      tipo: ["Supermarcado", "Diversão", "Saúde", "Educação"],
    },
  },
} as const
