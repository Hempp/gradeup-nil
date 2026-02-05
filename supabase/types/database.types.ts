// GradeUp NIL Database Types
// Auto-generated from schema - update using `supabase gen types typescript`

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================================
// ENUMS
// ============================================================================

export type UserRole = 'athlete' | 'brand' | 'athletic_director' | 'admin'
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired'
export type DealStatus = 'draft' | 'pending' | 'negotiating' | 'accepted' | 'active' | 'completed' | 'cancelled' | 'expired'
export type DealType = 'social_post' | 'appearance' | 'endorsement' | 'autograph' | 'camp' | 'merchandise' | 'other'
export type AthleticDivision = 'D1' | 'D2' | 'D3' | 'NAIA' | 'JUCO' | 'other'
export type AcademicYear = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'graduate' | 'other'

// ============================================================================
// DATABASE TABLES
// ============================================================================

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string
          name: string
          short_name: string | null
          city: string | null
          state: string | null
          division: AthleticDivision
          conference: string | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          website_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          short_name?: string | null
          city?: string | null
          state?: string | null
          division?: AthleticDivision
          conference?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          website_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          short_name?: string | null
          city?: string | null
          state?: string | null
          division?: AthleticDivision
          conference?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          website_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sports: {
        Row: {
          id: string
          name: string
          category: string | null
          gender: string | null
          icon_name: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
          gender?: string | null
          icon_name?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
          gender?: string | null
          icon_name?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          role: UserRole
          first_name: string | null
          last_name: string | null
          phone: string | null
          avatar_url: string | null
          bio: string | null
          is_active: boolean
          is_verified: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: UserRole
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          is_active?: boolean
          is_verified?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: UserRole
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          is_active?: boolean
          is_verified?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      athletes: {
        Row: {
          id: string
          profile_id: string
          school_id: string | null
          sport_id: string | null
          major: string | null
          minor: string | null
          gpa: number | null
          academic_year: AcademicYear | null
          expected_graduation: string | null
          position: string | null
          jersey_number: string | null
          height_inches: number | null
          weight_lbs: number | null
          hometown: string | null
          high_school: string | null
          instagram_handle: string | null
          instagram_followers: number
          twitter_handle: string | null
          twitter_followers: number
          tiktok_handle: string | null
          tiktok_followers: number
          total_followers: number
          nil_valuation: number
          total_earnings: number
          deals_completed: number
          avg_deal_rating: number
          gradeup_score: number
          enrollment_verified: boolean
          enrollment_verified_at: string | null
          sport_verified: boolean
          sport_verified_at: string | null
          grades_verified: boolean
          grades_verified_at: string | null
          identity_verified: boolean
          identity_verified_at: string | null
          is_searchable: boolean
          show_gpa: boolean
          accepting_deals: boolean
          min_deal_amount: number | null
          featured: boolean
          featured_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          school_id?: string | null
          sport_id?: string | null
          major?: string | null
          minor?: string | null
          gpa?: number | null
          academic_year?: AcademicYear | null
          expected_graduation?: string | null
          position?: string | null
          jersey_number?: string | null
          height_inches?: number | null
          weight_lbs?: number | null
          hometown?: string | null
          high_school?: string | null
          instagram_handle?: string | null
          instagram_followers?: number
          twitter_handle?: string | null
          twitter_followers?: number
          tiktok_handle?: string | null
          tiktok_followers?: number
          nil_valuation?: number
          total_earnings?: number
          deals_completed?: number
          avg_deal_rating?: number
          enrollment_verified?: boolean
          enrollment_verified_at?: string | null
          sport_verified?: boolean
          sport_verified_at?: string | null
          grades_verified?: boolean
          grades_verified_at?: string | null
          identity_verified?: boolean
          identity_verified_at?: string | null
          is_searchable?: boolean
          show_gpa?: boolean
          accepting_deals?: boolean
          min_deal_amount?: number | null
          featured?: boolean
          featured_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          school_id?: string | null
          sport_id?: string | null
          major?: string | null
          minor?: string | null
          gpa?: number | null
          academic_year?: AcademicYear | null
          expected_graduation?: string | null
          position?: string | null
          jersey_number?: string | null
          height_inches?: number | null
          weight_lbs?: number | null
          hometown?: string | null
          high_school?: string | null
          instagram_handle?: string | null
          instagram_followers?: number
          twitter_handle?: string | null
          twitter_followers?: number
          tiktok_handle?: string | null
          tiktok_followers?: number
          nil_valuation?: number
          total_earnings?: number
          deals_completed?: number
          avg_deal_rating?: number
          enrollment_verified?: boolean
          enrollment_verified_at?: string | null
          sport_verified?: boolean
          sport_verified_at?: string | null
          grades_verified?: boolean
          grades_verified_at?: string | null
          identity_verified?: boolean
          identity_verified_at?: string | null
          is_searchable?: boolean
          show_gpa?: boolean
          accepting_deals?: boolean
          min_deal_amount?: number | null
          featured?: boolean
          featured_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athletes_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_school_id_fkey"
            columns: ["school_id"]
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_sport_id_fkey"
            columns: ["sport_id"]
            referencedRelation: "sports"
            referencedColumns: ["id"]
          }
        ]
      }
      brands: {
        Row: {
          id: string
          profile_id: string
          company_name: string
          company_type: string | null
          industry: string | null
          website_url: string | null
          logo_url: string | null
          contact_name: string | null
          contact_title: string | null
          contact_email: string | null
          contact_phone: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string
          total_spent: number
          deals_completed: number
          avg_deal_rating: number
          active_campaigns: number
          preferred_sports: string[] | null
          preferred_schools: string[] | null
          preferred_divisions: AthleticDivision[] | null
          min_gpa: number | null
          min_followers: number | null
          budget_range_min: number | null
          budget_range_max: number | null
          is_verified: boolean
          verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          company_name: string
          company_type?: string | null
          industry?: string | null
          website_url?: string | null
          logo_url?: string | null
          contact_name?: string | null
          contact_title?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string
          total_spent?: number
          deals_completed?: number
          avg_deal_rating?: number
          active_campaigns?: number
          preferred_sports?: string[] | null
          preferred_schools?: string[] | null
          preferred_divisions?: AthleticDivision[] | null
          min_gpa?: number | null
          min_followers?: number | null
          budget_range_min?: number | null
          budget_range_max?: number | null
          is_verified?: boolean
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          company_name?: string
          company_type?: string | null
          industry?: string | null
          website_url?: string | null
          logo_url?: string | null
          contact_name?: string | null
          contact_title?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string
          total_spent?: number
          deals_completed?: number
          avg_deal_rating?: number
          active_campaigns?: number
          preferred_sports?: string[] | null
          preferred_schools?: string[] | null
          preferred_divisions?: AthleticDivision[] | null
          min_gpa?: number | null
          min_followers?: number | null
          budget_range_min?: number | null
          budget_range_max?: number | null
          is_verified?: boolean
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      athletic_directors: {
        Row: {
          id: string
          profile_id: string
          school_id: string
          title: string | null
          department: string | null
          office_phone: string | null
          can_verify_enrollment: boolean
          can_verify_sport: boolean
          can_verify_grades: boolean
          can_manage_athletes: boolean
          is_primary_contact: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          school_id: string
          title?: string | null
          department?: string | null
          office_phone?: string | null
          can_verify_enrollment?: boolean
          can_verify_sport?: boolean
          can_verify_grades?: boolean
          can_manage_athletes?: boolean
          is_primary_contact?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          school_id?: string
          title?: string | null
          department?: string | null
          office_phone?: string | null
          can_verify_enrollment?: boolean
          can_verify_sport?: boolean
          can_verify_grades?: boolean
          can_manage_athletes?: boolean
          is_primary_contact?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athletic_directors_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletic_directors_school_id_fkey"
            columns: ["school_id"]
            referencedRelation: "schools"
            referencedColumns: ["id"]
          }
        ]
      }
      deals: {
        Row: {
          id: string
          opportunity_id: string | null
          athlete_id: string
          brand_id: string
          title: string
          description: string | null
          deal_type: DealType
          status: DealStatus
          amount: number
          payment_terms: string | null
          deliverables: Json | null
          start_date: string | null
          end_date: string | null
          contract_url: string | null
          contract_signed_athlete_at: string | null
          contract_signed_brand_at: string | null
          completed_at: string | null
          athlete_rating: number | null
          athlete_review: string | null
          brand_rating: number | null
          brand_review: string | null
          compliance_approved: boolean
          compliance_approved_by: string | null
          compliance_approved_at: string | null
          compliance_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          opportunity_id?: string | null
          athlete_id: string
          brand_id: string
          title: string
          description?: string | null
          deal_type: DealType
          status?: DealStatus
          amount: number
          payment_terms?: string | null
          deliverables?: Json | null
          start_date?: string | null
          end_date?: string | null
          contract_url?: string | null
          contract_signed_athlete_at?: string | null
          contract_signed_brand_at?: string | null
          completed_at?: string | null
          athlete_rating?: number | null
          athlete_review?: string | null
          brand_rating?: number | null
          brand_review?: string | null
          compliance_approved?: boolean
          compliance_approved_by?: string | null
          compliance_approved_at?: string | null
          compliance_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          opportunity_id?: string | null
          athlete_id?: string
          brand_id?: string
          title?: string
          description?: string | null
          deal_type?: DealType
          status?: DealStatus
          amount?: number
          payment_terms?: string | null
          deliverables?: Json | null
          start_date?: string | null
          end_date?: string | null
          contract_url?: string | null
          contract_signed_athlete_at?: string | null
          contract_signed_brand_at?: string | null
          completed_at?: string | null
          athlete_rating?: number | null
          athlete_review?: string | null
          brand_rating?: number | null
          brand_review?: string | null
          compliance_approved?: boolean
          compliance_approved_by?: string | null
          compliance_approved_at?: string | null
          compliance_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_athlete_id_fkey"
            columns: ["athlete_id"]
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          }
        ]
      }
      opportunities: {
        Row: {
          id: string
          brand_id: string
          title: string
          description: string | null
          deal_type: DealType
          compensation_amount: number | null
          compensation_type: string | null
          compensation_details: string | null
          required_sports: string[] | null
          required_schools: string[] | null
          required_divisions: AthleticDivision[] | null
          min_gpa: number | null
          min_followers: number | null
          min_gradeup_score: number | null
          required_academic_years: AcademicYear[] | null
          deliverables: Json | null
          start_date: string | null
          end_date: string | null
          application_deadline: string | null
          max_athletes: number | null
          athletes_selected: number
          status: string
          is_featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          title: string
          description?: string | null
          deal_type: DealType
          compensation_amount?: number | null
          compensation_type?: string | null
          compensation_details?: string | null
          required_sports?: string[] | null
          required_schools?: string[] | null
          required_divisions?: AthleticDivision[] | null
          min_gpa?: number | null
          min_followers?: number | null
          min_gradeup_score?: number | null
          required_academic_years?: AcademicYear[] | null
          deliverables?: Json | null
          start_date?: string | null
          end_date?: string | null
          application_deadline?: string | null
          max_athletes?: number | null
          athletes_selected?: number
          status?: string
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          title?: string
          description?: string | null
          deal_type?: DealType
          compensation_amount?: number | null
          compensation_type?: string | null
          compensation_details?: string | null
          required_sports?: string[] | null
          required_schools?: string[] | null
          required_divisions?: AthleticDivision[] | null
          min_gpa?: number | null
          min_followers?: number | null
          min_gradeup_score?: number | null
          required_academic_years?: AcademicYear[] | null
          deliverables?: Json | null
          start_date?: string | null
          end_date?: string | null
          application_deadline?: string | null
          max_athletes?: number | null
          athletes_selected?: number
          status?: string
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          related_type: string | null
          related_id: string | null
          action_url: string | null
          action_label: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          related_type?: string | null
          related_id?: string | null
          action_url?: string | null
          action_label?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          related_type?: string | null
          related_id?: string | null
          action_url?: string | null
          action_label?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      calculate_gradeup_score: {
        Args: {
          p_gpa: number
          p_total_followers: number
          p_deals_completed: number
          p_avg_rating: number
          p_enrollment_verified: boolean
          p_sport_verified: boolean
          p_grades_verified: boolean
        }
        Returns: number
      }
      get_user_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      get_athlete_id: {
        Args: Record<string, never>
        Returns: string
      }
      get_brand_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      user_role: UserRole
      verification_status: VerificationStatus
      deal_status: DealStatus
      deal_type: DealType
      athletic_division: AthleticDivision
      academic_year: AcademicYear
    }
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Shorthand types
export type School = Tables<'schools'>
export type Sport = Tables<'sports'>
export type Profile = Tables<'profiles'>
export type Athlete = Tables<'athletes'>
export type Brand = Tables<'brands'>
export type AthleticDirector = Tables<'athletic_directors'>
export type Deal = Tables<'deals'>
export type Opportunity = Tables<'opportunities'>
export type Notification = Tables<'notifications'>

// Extended types with relations
export interface AthleteWithRelations extends Athlete {
  profile: Profile
  school: School | null
  sport: Sport | null
}

export interface DealWithRelations extends Deal {
  athlete: AthleteWithRelations
  brand: Brand
  opportunity: Opportunity | null
}

// GradeUp Score breakdown
export interface GradeUpScoreBreakdown {
  gpa_score: number
  social_score: number
  experience_score: number
  rating_score: number
  verification_bonus: number
  total_score: number
}
