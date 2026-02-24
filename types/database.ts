export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: 'ADMIN' | 'DISPATCHER' | 'COURIER';
          pin_hash: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role: 'ADMIN' | 'DISPATCHER' | 'COURIER';
          pin_hash?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          role?: 'ADMIN' | 'DISPATCHER' | 'COURIER';
          pin_hash?: string | null;
          active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      devices: {
        Row: {
          id: string;
          asset_tag: string;
          type: 'PDA' | 'MOBILE_PRINTER';
          description: string | null;
          status: 'AVAILABLE' | 'ISSUED' | 'LOST' | 'BROKEN' | 'IN_SERVICE';
          current_holder_id: string | null;
          sim_card_id: string | null;
          phone_number: string | null;
          is_damaged: boolean;
          damage_note: string | null;
          is_faulty: boolean;
          fault_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          asset_tag: string;
          type: 'PDA' | 'MOBILE_PRINTER';
          description?: string | null;
          status?: 'AVAILABLE' | 'ISSUED' | 'LOST' | 'BROKEN' | 'IN_SERVICE';
          current_holder_id?: string | null;
          sim_card_id?: string | null;
          phone_number?: string | null;
          is_damaged?: boolean;
          damage_note?: string | null;
          is_faulty?: boolean;
          fault_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          asset_tag?: string;
          type?: 'PDA' | 'MOBILE_PRINTER';
          description?: string | null;
          status?: 'AVAILABLE' | 'ISSUED' | 'LOST' | 'BROKEN' | 'IN_SERVICE';
          current_holder_id?: string | null;
          sim_card_id?: string | null;
          phone_number?: string | null;
          is_damaged?: boolean;
          damage_note?: string | null;
          is_faulty?: boolean;
          fault_note?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'devices_current_holder_id_fkey';
            columns: ['current_holder_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      handover_batches: {
        Row: {
          id: string;
          action_type: 'ISSUE' | 'RETURN';
          courier_id: string;
          dispatcher_id: string;
          signature_path: string;
          courier_signature_path: string | null;
          dispatcher_signature_path: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          action_type: 'ISSUE' | 'RETURN';
          courier_id: string;
          dispatcher_id: string;
          signature_path: string;
          courier_signature_path?: string | null;
          dispatcher_signature_path?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          notes?: string | null;
          courier_signature_path?: string | null;
          dispatcher_signature_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'handover_batches_courier_id_fkey';
            columns: ['courier_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'handover_batches_dispatcher_id_fkey';
            columns: ['dispatcher_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      handover_logs: {
        Row: {
          id: string;
          device_id: string;
          from_profile_id: string | null;
          to_profile_id: string | null;
          action_type: 'ISSUE' | 'RETURN';
          timestamp: string;
          batch_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          device_id: string;
          from_profile_id?: string | null;
          to_profile_id?: string | null;
          action_type: 'ISSUE' | 'RETURN';
          timestamp?: string;
          batch_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'handover_logs_device_id_fkey';
            columns: ['device_id'];
            referencedRelation: 'devices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'handover_logs_batch_id_fkey';
            columns: ['batch_id'];
            referencedRelation: 'handover_batches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'handover_logs_from_profile_id_fkey';
            columns: ['from_profile_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'handover_logs_to_profile_id_fkey';
            columns: ['to_profile_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      device_flag_definitions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      device_flag_values: {
        Row: {
          device_id: string;
          flag_id: string;
          value: boolean;
          updated_at: string;
          note: string | null;
        };
        Insert: {
          device_id: string;
          flag_id: string;
          value?: boolean;
          updated_at?: string;
          note?: string | null;
        };
        Update: {
          value?: boolean;
          updated_at?: string;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'device_flag_values_device_id_fkey';
            columns: ['device_id'];
            referencedRelation: 'devices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'device_flag_values_flag_id_fkey';
            columns: ['flag_id'];
            referencedRelation: 'device_flag_definitions';
            referencedColumns: ['id'];
          }
        ];
      };
      device_history: {
        Row: {
          id: string;
          device_id: string;
          field: string;
          old_value: string | null;
          new_value: string | null;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'device_history_device_id_fkey';
            columns: ['device_id'];
            referencedRelation: 'devices';
            referencedColumns: ['id'];
          }
        ];
      };
      device_flag_history: {
        Row: {
          id: string;
          device_id: string;
          flag_id: string;
          old_value: boolean | null;
          new_value: boolean | null;
          old_note: string | null;
          new_note: string | null;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'device_flag_history_device_id_fkey';
            columns: ['device_id'];
            referencedRelation: 'devices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'device_flag_history_flag_id_fkey';
            columns: ['flag_id'];
            referencedRelation: 'device_flag_definitions';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Enums: {
      profile_role: 'ADMIN' | 'DISPATCHER' | 'COURIER';
      device_type: 'PDA' | 'MOBILE_PRINTER';
      device_status: 'AVAILABLE' | 'ISSUED' | 'LOST' | 'BROKEN' | 'IN_SERVICE';
      handover_action: 'ISSUE' | 'RETURN';
    };
    Functions: Record<string, never>;
  };
};
