
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
                },"cash_movements": {
                  Row: {
                    "amount_cents": number,"cash_session_id": string,"club_id": string,"created_at": string,"created_by": string | null,"id": string,"kind": Database["public"]['Enums']["cash_movement_kind"],"note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"cash_session_id": string,"club_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["cash_movement_kind"],"note"?: string | null
                  }
                  Update: {
                    "amount_cents"?: number,"cash_session_id"?: string,"club_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["cash_movement_kind"],"note"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cash_movements_cash_session_id_fkey"
      columns: ["cash_session_id"]
isOneToOne: false
      referencedRelation: "cash_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_movements_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    }
                  ]
                },"cash_sessions": {
                  Row: {
                    "closed_at": string | null,"closed_by": string | null,"closing_note": string | null,"club_id": string,"counted_cents": number | null,"difference_cents": number | null,"expected_cash_cents": number | null,"id": string,"opened_at": string,"opened_by": string | null,"opening_cents": number,"status": Database["public"]['Enums']["cash_session_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"closed_by"?: string | null,"closing_note"?: string | null,"club_id": string,"counted_cents"?: number | null,"difference_cents"?: number | null,"expected_cash_cents"?: number | null,"id"?: string,"opened_at"?: string,"opened_by"?: string | null,"opening_cents": number,"status"?: Database["public"]['Enums']["cash_session_status"]
                  }
                  Update: {
                    "closed_at"?: string | null,"closed_by"?: string | null,"closing_note"?: string | null,"club_id"?: string,"counted_cents"?: number | null,"difference_cents"?: number | null,"expected_cash_cents"?: number | null,"id"?: string,"opened_at"?: string,"opened_by"?: string | null,"opening_cents"?: number,"status"?: Database["public"]['Enums']["cash_session_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "cash_sessions_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    }
                  ]
                },"cash_table_entries": {
                  Row: {
                    "amount_cents": number,"club_id": string,"created_at": string,"created_by": string | null,"id": string,"kind": Database["public"]['Enums']["cash_table_entry_kind"],"note": string | null,"reverses_id": string | null,"table_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"club_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["cash_table_entry_kind"],"note"?: string | null,"reverses_id"?: string | null,"table_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"club_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["cash_table_entry_kind"],"note"?: string | null,"reverses_id"?: string | null,"table_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cash_table_entries_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_table_entries_reverses_id_fkey"
      columns: ["reverses_id"]
isOneToOne: true
      referencedRelation: "cash_table_entries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_table_entries_table_id_fkey"
      columns: ["table_id"]
isOneToOne: false
      referencedRelation: "cash_tables"
      referencedColumns: ["id"]
    }
                  ]
                },"cash_table_seats": {
                  Row: {
                    "club_id": string,"id": string,"left_at": string | null,"left_by": string | null,"player_id": string,"seated_at": string,"seated_by": string | null,"table_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "club_id": string,"id"?: string,"left_at"?: string | null,"left_by"?: string | null,"player_id": string,"seated_at"?: string,"seated_by"?: string | null,"table_id": string
                  }
                  Update: {
                    "club_id"?: string,"id"?: string,"left_at"?: string | null,"left_by"?: string | null,"player_id"?: string,"seated_at"?: string,"seated_by"?: string | null,"table_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cash_table_seats_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_table_seats_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "player_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_table_seats_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_table_seats_table_id_fkey"
      columns: ["table_id"]
isOneToOne: false
      referencedRelation: "cash_tables"
      referencedColumns: ["id"]
    }
                  ]
                },"cash_tables": {
                  Row: {
                    "big_blind_cents": number | null,"closed_at": string | null,"closed_by": string | null,"closing_note": string | null,"club_id": string,"id": string,"max_players": number | null,"name": string,"note": string | null,"opened_at": string,"opened_by": string | null,"small_blind_cents": number | null,"status": Database["public"]['Enums']["cash_table_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "big_blind_cents"?: number | null,"closed_at"?: string | null,"closed_by"?: string | null,"closing_note"?: string | null,"club_id": string,"id"?: string,"max_players"?: number | null,"name": string,"note"?: string | null,"opened_at"?: string,"opened_by"?: string | null,"small_blind_cents"?: number | null,"status"?: Database["public"]['Enums']["cash_table_status"]
                  }
                  Update: {
                    "big_blind_cents"?: number | null,"closed_at"?: string | null,"closed_by"?: string | null,"closing_note"?: string | null,"club_id"?: string,"id"?: string,"max_players"?: number | null,"name"?: string,"note"?: string | null,"opened_at"?: string,"opened_by"?: string | null,"small_blind_cents"?: number | null,"status"?: Database["public"]['Enums']["cash_table_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "cash_tables_club_id_fkey"
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
                },"ledger_entries": {
                  Row: {
                    "amount_cents": number,"cash_flow_cents": number,"cash_session_id": string | null,"club_id": string,"created_at": string,"created_by": string | null,"effect_cents": number,"id": string,"kind": Database["public"]['Enums']["ledger_entry_kind"],"note": string | null,"paid_upfront": boolean,"payment_method": Database["public"]['Enums']["payment_method"] | null,"payment_method_id": string | null,"player_id": string,"reverses_id": string | null,"session_id": string | null,"table_id": string | null,"tournament_id": string | null,"reversed_by_id": string | null
                  }
                  ComputedFields: "reversed_by_id"
                  Insert: {
                    "amount_cents": number,"cash_flow_cents"?: number,"cash_session_id"?: string | null,"club_id": string,"created_at"?: string,"created_by"?: string | null,"effect_cents": number,"id"?: string,"kind": Database["public"]['Enums']["ledger_entry_kind"],"note"?: string | null,"paid_upfront"?: boolean,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"payment_method_id"?: string | null,"player_id": string,"reverses_id"?: string | null,"session_id"?: string | null,"table_id"?: string | null,"tournament_id"?: string | null
                  }
                  Update: {
                    "amount_cents"?: number,"cash_flow_cents"?: number,"cash_session_id"?: string | null,"club_id"?: string,"created_at"?: string,"created_by"?: string | null,"effect_cents"?: number,"id"?: string,"kind"?: Database["public"]['Enums']["ledger_entry_kind"],"note"?: string | null,"paid_upfront"?: boolean,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"payment_method_id"?: string | null,"player_id"?: string,"reverses_id"?: string | null,"session_id"?: string | null,"table_id"?: string | null,"tournament_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ledger_entries_cash_session_fkey"
      columns: ["cash_session_id"]
isOneToOne: false
      referencedRelation: "cash_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_payment_method_id_fkey"
      columns: ["payment_method_id"]
isOneToOne: false
      referencedRelation: "payment_methods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "player_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_reverses_id_fkey"
      columns: ["reverses_id"]
isOneToOne: true
      referencedRelation: "ledger_entries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "player_overview"
      referencedColumns: ["open_session_id"]
    },{
      foreignKeyName: "ledger_entries_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "player_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_entries_table_fkey"
      columns: ["table_id"]
isOneToOne: false
      referencedRelation: "cash_tables"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_methods": {
                  Row: {
                    "active": boolean,"club_id": string,"created_at": string,"id": string,"kind": Database["public"]['Enums']["payment_method"],"name": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"club_id": string,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["payment_method"],"name": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"club_id"?: string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["payment_method"],"name"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_methods_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    }
                  ]
                },"player_sessions": {
                  Row: {
                    "closed_at": string | null,"closed_by": string | null,"club_id": string,"id": string,"last_reopened_at": string | null,"last_reopened_by": string | null,"opened_at": string,"opened_by": string | null,"player_id": string,"reopened_count": number,"result_cents": number | null,"status": Database["public"]['Enums']["player_session_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"closed_by"?: string | null,"club_id": string,"id"?: string,"last_reopened_at"?: string | null,"last_reopened_by"?: string | null,"opened_at"?: string,"opened_by"?: string | null,"player_id": string,"reopened_count"?: number,"result_cents"?: number | null,"status"?: Database["public"]['Enums']["player_session_status"]
                  }
                  Update: {
                    "closed_at"?: string | null,"closed_by"?: string | null,"club_id"?: string,"id"?: string,"last_reopened_at"?: string | null,"last_reopened_by"?: string | null,"opened_at"?: string,"opened_by"?: string | null,"player_id"?: string,"reopened_count"?: number,"result_cents"?: number | null,"status"?: Database["public"]['Enums']["player_session_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "player_sessions_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_sessions_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "player_overview"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_sessions_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
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
            "cash_table_activity": {
                  Row: {
                    "amount_cents": number | null,"club_id": string | null,"created_at": string | null,"id": string | null,"is_reversed": boolean | null,"kind": string | null,"method_name": string | null,"note": string | null,"paid_upfront": boolean | null,"player_id": string | null,"player_name": string | null,"reversed_kind": string | null,"reverses_id": string | null,"source": string | null,"table_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"player_overview": {
                  Row: {
                    "active": boolean,"balance_cents": number | null,"birth_date": string | null,"club_id": string,"cpf": string | null,"created_at": string,"email": string | null,"full_name": string,"id": string,"nickname": string | null,"normalized_name": string | null,"notes": string | null,"open_result_cents": number | null,"open_session_id": string | null,"phone": string | null,"search_text": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "players_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "accept_club_invitation":
{ Args: { "invite_token": string }; Returns: string
                           },
"can_manage_players":
{ Args: { "target_club_id": string }; Returns: boolean
                           },
"can_operate_cash":
{ Args: { "target_club_id": string }; Returns: boolean
                           },
"can_operate_cash_game":
{ Args: { "target_club_id": string }; Returns: boolean
                           },
"can_operate_ledger":
{ Args: { "target_club_id": string }; Returns: boolean
                           },
"cash_game_require_operator":
{ Args: { "target_club_id": string }; Returns: undefined
                           },
"cash_register_movement":
{ Args: { "amount_cents": number,"movement_kind": Database["public"]['Enums']["cash_movement_kind"],"movement_note": string,"target_session_id": string }; Returns: string
                           },
"cash_require_open_session":
{ Args: { "target_club_id": string }; Returns: string
                           },
"cash_require_operator":
{ Args: { "target_club_id": string }; Returns: undefined
                           },
"cash_resolve_method":
{ Args: { "method_id": string,"target_club_id": string }; Returns: Database["public"]['Enums']["payment_method"]
                           },
"cash_session_summary":
{ Args: { "target_session_id": string }; Returns: {
              "by_method": Json,"cash_in_cents": number,"cash_out_cents": number,"deposits_cents": number,"expected_cash_cents": number,"opening_cents": number,"withdrawals_cents": number
            }[]
                           },
"cash_table_chips":
{ Args: { "target_table_id": string }; Returns: number
                           },
"cash_table_lock_open":
{ Args: { "target_table_id": string }; Returns: {
              "big_blind_cents": number | null,
"closed_at": string | null,
"closed_by": string | null,
"closing_note": string | null,
"club_id": string,
"id": string,
"max_players": number | null,
"name": string,
"note": string | null,
"opened_at": string,
"opened_by": string | null,
"small_blind_cents": number | null,
"status": Database["public"]['Enums']["cash_table_status"]
            }
                          SetofOptions: {
        from: "*"
        to: "cash_tables"
        isOneToOne: true
        isSetofReturn: false
      } },
"cash_table_lock_player":
{ Args: { "require_active": boolean,"target": Omit<Database["public"]['Tables']["cash_tables"]['Row'], Database["public"]['Tables']["cash_tables"]['ComputedFields']>,"target_player_id": string }; Returns: undefined
                           },
"cash_table_players":
{ Args: { "target_table_id": string }; Returns: {
              "buy_in_cents": number,"cash_out_cents": number,"completed_seconds": number,"first_seated_at": string,"full_name": string,"nickname": string,"player_id": string,"seat_id": string,"seated_at": string
            }[]
                           },
"cash_table_require_seated":
{ Args: { "target_player_id": string,"target_table_id": string }; Returns: undefined
                           },
"cash_table_summary":
{ Args: { "target_table_id": string }; Returns: {
              "chips_cents": number,"expenses_cents": number,"purchases_cents": number,"rake_cents": number,"returns_cents": number,"seated_count": number,"tips_cents": number
            }[]
                           },
"close_all_sessions":
{ Args: { "target_club_id": string }; Returns: number
                           },
"close_cash_session":
{ Args: { "counted_cents": number,"note"?: string,"target_session_id": string }; Returns: number
                           },
"close_cash_table":
{ Args: { "closing_note"?: string,"target_table_id": string }; Returns: undefined
                           },
"close_player_session":
{ Args: { "target_session_id": string }; Returns: number
                           },
"close_session_internal":
{ Args: { "target_session_id": string }; Returns: number
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
"create_default_payment_methods":
{ Args: { "target_club_id": string }; Returns: undefined
                           },
"delete_player":
{ Args: { "target_player_id": string }; Returns: undefined
                           },
"deposit":
{ Args: { "amount_cents": number,"movement_note"?: string,"target_session_id": string }; Returns: string
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
"ledger_cash_flow":
{ Args: { "amount": number,"entry_kind": Database["public"]['Enums']["ledger_entry_kind"],"paid": boolean,"reversed_flow"?: number }; Returns: number
                           },
"ledger_effect":
{ Args: { "amount": number,"entry_kind": Database["public"]['Enums']["ledger_entry_kind"],"paid": boolean,"reversed_effect"?: number }; Returns: number
                           },
"ledger_insert_game_entry":
{ Args: { "amount_cents": number,"entry_kind": Database["public"]['Enums']["ledger_entry_kind"],"entry_note": string,"method_id": string,"paid_upfront": boolean,"target_club_id": string,"target_player_id": string,"target_table_id": string,"target_tournament_id": string }; Returns: string
                           },
"ledger_lock_player":
{ Args: { "require_active": boolean,"target_player_id": string }; Returns: string
                           },
"ledger_open_session_id":
{ Args: { "create_if_missing": boolean,"target_player_id": string }; Returns: string
                           },
"ledger_require_operator":
{ Args: { "target_club_id": string }; Returns: undefined
                           },
"list_club_members":
{ Args: { "target_club_id": string }; Returns: {
              "email": string,"full_name": string,"joined_at": string,"role": Database["public"]['Enums']["club_role"],"user_id": string
            }[]
                           },
"normalize_text":
{ Args: { "value": string }; Returns: string
                           },
"open_cash_session":
{ Args: { "opening_cents": number,"target_club_id": string }; Returns: string
                           },
"open_cash_table":
{ Args: { "big_blind_cents"?: number,"max_players"?: number,"small_blind_cents"?: number,"table_name": string,"table_note"?: string,"target_club_id": string }; Returns: string
                           },
"record_cash_out":
{ Args: { "amount_cents": number,"entry_note"?: string,"target_player_id": string,"target_table_id"?: string }; Returns: string
                           },
"record_entry":
{ Args: { "amount_cents": number,"entry_kind": Database["public"]['Enums']["ledger_entry_kind"],"entry_note"?: string,"method_id"?: string,"paid_upfront"?: boolean,"target_player_id": string,"target_table_id"?: string,"target_tournament_id"?: string }; Returns: string
                           },
"record_payment":
{ Args: { "amount_cents": number,"entry_kind": Database["public"]['Enums']["ledger_entry_kind"],"entry_note"?: string,"method_id": string,"target_player_id": string }; Returns: string
                           },
"record_table_entry":
{ Args: { "amount_cents": number,"entry_kind": Database["public"]['Enums']["cash_table_entry_kind"],"entry_note"?: string,"target_table_id": string }; Returns: string
                           },
"remove_club_member":
{ Args: { "target_club_id": string,"target_user_id": string }; Returns: undefined
                           },
"reopen_session":
{ Args: { "target_session_id": string }; Returns: undefined
                           },
"require_club_owner":
{ Args: { "target_club_id": string }; Returns: undefined
                           },
"reverse_entry":
{ Args: { "entry_note"?: string,"target_entry_id": string }; Returns: string
                           },
"reverse_table_entry":
{ Args: { "entry_note"?: string,"target_entry_id": string }; Returns: string
                           },
"reversed_by_id":
{ Args: { "entry": Omit<Database["public"]['Tables']["ledger_entries"]['Row'], Database["public"]['Tables']["ledger_entries"]['ComputedFields']> }; Returns: string
                           },
"revoke_club_invitation":
{ Args: { "invitation_id": string }; Returns: undefined
                           },
"seat_player":
{ Args: { "buy_in_cents"?: number,"entry_note"?: string,"method_id"?: string,"paid_upfront"?: boolean,"target_player_id": string,"target_table_id": string }; Returns: string
                           },
"table_buy_in":
{ Args: { "amount_cents": number,"entry_note"?: string,"method_id"?: string,"paid_upfront"?: boolean,"target_player_id": string,"target_table_id": string }; Returns: string
                           },
"table_cash_out":
{ Args: { "amount_cents": number,"entry_note"?: string,"leave_table"?: boolean,"target_player_id": string,"target_table_id": string }; Returns: string
                           },
"unseat_player":
{ Args: { "target_seat_id": string }; Returns: undefined
                           },
"upcoming_birthdays":
{ Args: { "days_ahead"?: number,"reference_date"?: string,"target_club_id": string }; Returns: {
              "birth_date": string,"full_name": string,"next_birthday": string,"nickname": string,"player_id": string,"turning_age": number
            }[]
                           },
"update_club_member_role":
{ Args: { "new_role": Database["public"]['Enums']["club_role"],"target_club_id": string,"target_user_id": string }; Returns: undefined
                           },
"withdraw":
{ Args: { "amount_cents": number,"movement_note"?: string,"target_session_id": string }; Returns: string
                           }
          }
          Enums: {
            "cash_movement_kind": "withdrawal"|"deposit","cash_session_status": "open"|"closed","cash_table_entry_kind": "rake"|"tip"|"expense","cash_table_status": "open"|"closed","club_role": "owner"|"manager"|"cashier"|"director"|"dealer"|"waiter","ledger_entry_kind": "buy_in"|"tournament_entry"|"cash_out"|"payment_in"|"payout"|"bar_charge"|"reversal","payment_method": "cash"|"pix"|"debit_card"|"credit_card"|"other","player_session_status": "open"|"closed"
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
            "cash_movement_kind": ["withdrawal", "deposit"],"cash_session_status": ["open", "closed"],"cash_table_entry_kind": ["rake", "tip", "expense"],"cash_table_status": ["open", "closed"],"club_role": ["owner", "manager", "cashier", "director", "dealer", "waiter"],"ledger_entry_kind": ["buy_in", "tournament_entry", "cash_out", "payment_in", "payout", "bar_charge", "reversal"],"payment_method": ["cash", "pix", "debit_card", "credit_card", "other"],"player_session_status": ["open", "closed"]
          }
        }
} as const
