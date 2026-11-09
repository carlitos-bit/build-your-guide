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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      biblioteca: {
        Row: {
          autor_id: string | null
          autor_nome: string | null
          created_at: string
          descricao: string | null
          id: string
          tema: string | null
          tipo: string
          titulo: string
          url: string
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          tema?: string | null
          tipo?: string
          titulo: string
          url: string
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          tema?: string | null
          tipo?: string
          titulo?: string
          url?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          updated_at: string
          valor: Json
        }
        Insert: {
          chave: string
          updated_at?: string
          valor?: Json
        }
        Update: {
          chave?: string
          updated_at?: string
          valor?: Json
        }
        Relationships: []
      }
      correcoes: {
        Row: {
          created_at: string
          feedback_ia: Json
          feedback_professor: string | null
          id: string
          liberada: boolean
          nota_c1: number
          nota_c2: number
          nota_c3: number
          nota_c4: number
          nota_c5: number
          nota_total: number
          recompensa_processada: boolean
          redacao_id: string
          revisada_em: string | null
          revisada_por: string | null
        }
        Insert: {
          created_at?: string
          feedback_ia?: Json
          feedback_professor?: string | null
          id?: string
          liberada?: boolean
          nota_c1?: number
          nota_c2?: number
          nota_c3?: number
          nota_c4?: number
          nota_c5?: number
          nota_total?: number
          recompensa_processada?: boolean
          redacao_id: string
          revisada_em?: string | null
          revisada_por?: string | null
        }
        Update: {
          created_at?: string
          feedback_ia?: Json
          feedback_professor?: string | null
          id?: string
          liberada?: boolean
          nota_c1?: number
          nota_c2?: number
          nota_c3?: number
          nota_c4?: number
          nota_c5?: number
          nota_total?: number
          recompensa_processada?: boolean
          redacao_id?: string
          revisada_em?: string | null
          revisada_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "correcoes_redacao_id_fkey"
            columns: ["redacao_id"]
            isOneToOne: true
            referencedRelation: "redacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          bonus_cash: number
          created_at: string
          criado_por: string | null
          duracao_min: number
          id: string
          inicia_em: string
          tema_titulo: string
          titulo: string
        }
        Insert: {
          bonus_cash?: number
          created_at?: string
          criado_por?: string | null
          duracao_min?: number
          id?: string
          inicia_em: string
          tema_titulo: string
          titulo: string
        }
        Update: {
          bonus_cash?: number
          created_at?: string
          criado_por?: string | null
          duracao_min?: number
          id?: string
          inicia_em?: string
          tema_titulo?: string
          titulo?: string
        }
        Relationships: []
      }
      perfil_gamificacao: {
        Row: {
          aluno_id: string
          cash_atual: number
          created_at: string
          id: string
          nivel: number
          sequencia_quinzenas: number
          xp_atual: number
        }
        Insert: {
          aluno_id: string
          cash_atual?: number
          created_at?: string
          id?: string
          nivel?: number
          sequencia_quinzenas?: number
          xp_atual?: number
        }
        Update: {
          aluno_id?: string
          cash_atual?: number
          created_at?: string
          id?: string
          nivel?: number
          sequencia_quinzenas?: number
          xp_atual?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: Json
          created_at: string
          email: string | null
          id: string
          nome: string
          perfil: string
          turma_id: string | null
        }
        Insert: {
          avatar?: Json
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          perfil?: string
          turma_id?: string | null
        }
        Update: {
          avatar?: Json
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          perfil?: string
          turma_id?: string | null
        }
        Relationships: []
      }
      redacoes: {
        Row: {
          aluno_id: string
          created_at: string
          id: string
          status: string
          tema_id: string | null
          tema_titulo: string
          tempo_gasto_seg: number | null
          texto: string
          tipo: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          id?: string
          status?: string
          tema_id?: string | null
          tema_titulo?: string
          tempo_gasto_seg?: number | null
          texto: string
          tipo?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          id?: string
          status?: string
          tema_id?: string | null
          tema_titulo?: string
          tempo_gasto_seg?: number | null
          texto?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "redacoes_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
        ]
      }
      temas: {
        Row: {
          area: string | null
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          titulo: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          titulo: string
        }
        Update: {
          area?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          titulo?: string
        }
        Relationships: []
      }
      trofeus: {
        Row: {
          codigo: string
          descricao: string
          icone: string
          id: string
          nome: string
        }
        Insert: {
          codigo: string
          descricao: string
          icone?: string
          id?: string
          nome: string
        }
        Update: {
          codigo?: string
          descricao?: string
          icone?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      trofeus_aluno: {
        Row: {
          aluno_id: string
          created_at: string
          id: string
          trofeu_codigo: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          id?: string
          trofeu_codigo: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          id?: string
          trofeu_codigo?: string
        }
        Relationships: []
      }
      turmas: {
        Row: {
          created_at: string
          escola: string | null
          id: string
          nome: string
          professor_id: string | null
        }
        Insert: {
          created_at?: string
          escola?: string | null
          id?: string
          nome: string
          professor_id?: string | null
        }
        Update: {
          created_at?: string
          escola?: string | null
          id?: string
          nome?: string
          professor_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_definir_papel: {
        Args: {
          _ativo: boolean
          _papel: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      pode_revisar_redacao: { Args: { _id: string }; Returns: boolean }
      professor_do_aluno: { Args: { _aluno: string }; Returns: boolean }
      registrar_correcao_ia: {
        Args: {
          _c1: number
          _c2: number
          _c3: number
          _c4: number
          _c5: number
          _feedback: Json
          _redacao_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "aluno" | "professor" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["aluno", "professor", "admin"],
    },
  },
} as const
