
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "club_id": string | null,"created_at": string,"id": number,"new_data": Json | null,"old_data": Json | null,"operation": string,"row_id": string | null,"table_name": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "club_id"?: string | null,"created_at"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"operation": string,"row_id"?: string | null,"table_name": string,"user_id"?: string | null
                  }
                  Update: {
                    "club_id"?: string | null,"created_at"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"operation"?: string,"row_id"?: string | null,"table_name"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    }
                  ]
                },"club_invitations": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"club_id": string,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string | null,"revoked_at": string | null,"role": Database["public"]['Enums']["club_role"],"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"club_id": string,"created_at"?: string,"email": string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"revoked_at"?: string | null,"role": Database["public"]['Enums']["club_role"],"token"?: string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"club_id"?: string,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"revoked_at"?: string | null,"role"?: Database["public"]['Enums']["club_role"],"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "club_invitations_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    }
                  ]
                },"club_members": {
                  Row: {
                    "club_id": string,"created_at": string,"role": Database["public"]['Enums']["club_role"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "club_id": string,"created_at"?: string,"role": Database["public"]['Enums']["club_role"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "club_id"?: string,"created_at"?: string,"role"?: Database["public"]['Enums']["club_role"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "club_members_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    }
                  ]
                },"club_settings": {
                  Row: {
                    "club_id": string,"created_at": string,"currency": string,"enabled_entry_types": (string)[],"pix_key": string | null,"pix_receiver_city": string | null,"pix_receiver_name": string | null,"receipt_printer_width_mm": number,"require_open_cash_session": boolean,"time_zone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "club_id": string,"created_at"?: string,"currency"?: string,"enabled_entry_types"?: (string)[],"pix_key"?: string | null,"pix_receiver_city"?: string | null,"pix_receiver_name"?: string | null,"receipt_printer_width_mm"?: number,"require_open_cash_session"?: boolean,"time_zone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "club_id"?: string,"created_at"?: string,"currency"?: string,"enabled_entry_types"?: (string)[],"pix_key"?: string | null,"pix_receiver_city"?: string | null,"pix_receiver_name"?: string | null,"receipt_printer_width_mm"?: number,"require_open_cash_session"?: boolean,"time_zone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "club_settings_club_id_fkey"
      columns: ["club_id"]
isOneToOne: true
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    }
                  ]
                },"clubs": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"players": {
                  Row: {
                    "active": boolean,"birth_date": string | null,"club_id": string,"cpf": string | null,"created_at": string,"created_by": string | null,"email": string | null,"full_name": string,"id": string,"nickname": string | null,"normalized_name": string | null,"notes": string | null,"phone": string | null,"search_text": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"birth_date"?: string | null,"club_id": string,"cpf"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"full_name": string,"id"?: string,"nickname"?: string | null,"normalized_name"?: never,"notes"?: string | null,"phone"?: string | null,"search_text"?: never,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"birth_date"?: string | null,"club_id"?: string,"cpf"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"full_name"?: string,"id"?: string,"nickname"?: string | null,"normalized_name"?: never,"notes"?: string | null,"phone"?: string | null,"search_text"?: never,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "players_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string,"id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name"?: string,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_club_invitation":
{ Args: { "invite_token": string }; Returns: string
                           },
"can_manage_players":
{ Args: { "target_club_id": string }; Returns: boolean
                           },
"create_club":
{ Args: { "club_name": string }; Returns: string
                           },
"create_club_invitation":
{ Args: { "invite_email": string,"invite_role": Database["public"]['Enums']["club_role"],"target_club_id": string }; Returns: {
              "accepted_at": string | null,
"accepted_by": string | null,
"club_id": string,
"created_at": string,
"email": string,
"expires_at": string,
"id": string,
"invited_by": string | null,
"revoked_at": string | null,
"role": Database["public"]['Enums']["club_role"],
"token": string
            }
                          SetofOptions: {
        from: "*"
        to: "club_invitations"
        isOneToOne: true
        isSetofReturn: false
      } },
"delete_player":
{ Args: { "target_player_id": string }; Returns: undefined
                           },
"get_invitation_by_token":
{ Args: { "invite_token": string }; Returns: {
              "club_name": string,"email": string,"role": Database["public"]['Enums']["club_role"],"status": string
            }[]
                           },
"has_club_role":
{ Args: { "roles": (Database["public"]['Enums']["club_role"])[],"target_club_id": string }; Returns: boolean
                           },
"is_club_member":
{ Args: { "target_club_id": string }; Returns: boolean
                           },
"list_club_members":
{ Args: { "target_club_id": string }; Returns: {
              "email": string,"full_name": string,"joined_at": string,"role": Database["public"]['Enums']["club_role"],"user_id": string
            }[]
                           },
"normalize_text":
{ Args: { "value": string }; Returns: string
                           },
"remove_club_member":
{ Args: { "target_club_id": string,"target_user_id": string }; Returns: undefined
                           },
"require_club_owner":
{ Args: { "target_club_id": string }; Returns: undefined
                           },
"revoke_club_invitation":
{ Args: { "invitation_id": string }; Returns: undefined
                           },
"upcoming_birthdays":
{ Args: { "days_ahead"?: number,"reference_date"?: string,"target_club_id": string }; Returns: {
              "birth_date": string,"full_name": string,"next_birthday": string,"nickname": string,"player_id": string,"turning_age": number
            }[]
                           },
"update_club_member_role":
{ Args: { "new_role": Database["public"]['Enums']["club_role"],"target_club_id": string,"target_user_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "club_role": "owner"|"manager"|"cashier"|"director"|"dealer"|"waiter"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "club_role": ["owner", "manager", "cashier", "director", "dealer", "waiter"]
          }
        }
} as const
