// src/types/types.ts
export interface VendorService {
    id: string
    vendor_id: string
    service_type: string
    is_active: boolean
    package_status: string
    created_at: string
    updated_at: string
  }
  
  export interface ServicePackage {
    id: string
    service_type: string
    name: string
    description: string | null
    price: number
    features: string[] | null
    coverage: any
    hour_amount: number | null
    event_type: string | null
    status: string
    created_at: string
    updated_at: string
  }
  
  export interface VendorServicePackage {
    id: string
    vendor_id: string
    service_package_id: string
    service_type: string
    status: string
    created_at: string
    updated_at: string
    service_packages?: ServicePackage
  }
  
  export interface VendorReview {
    id: string
    vendor_id: string
    couple_id: string | null
    rating: number
    review_text: string
    vendor_response: string | null
    created_at: string
    updated_at: string
  }
  
  export interface Vendor {
    id: string;
    user_id: string;
    name: string;
    profile: string | null;
    gear_list: string[] | null;
    rating: number | null;
    stripe_account_id: string | null;
    created_at: string | null;
    updated_at: string | null;
    profile_photo: string | null;
    intro_video: string | null;
    years_experience: number | null;
    phone: string | null;
    phone_number: string | null; // Added for schema compatibility
    portfolio_photos: string[] | null;
    portfolio_videos: string[] | null;
    specialties: string[] | null;
    awards: string[] | null;
    education: string | null;
    equipment: any | null;
    social_media: any | null;
    business_hours: any | null;
    languages: string[] | null;
    service_areas: string[] | null;
    insurance_info: string | null;
    business_license: string | null;
    service_types: string[] | null;
    google_calendar_token: any | null;
    ical_feed_token: string | null;
    google_refresh_token: string | null;
    google_account_email: string | null;
    calcom_api_key: string | null;
    google_access_token: string | null;
    outlook_access_token: string | null;
    auth_id: string | null;
    stripe_status: string | null;
    stripe_customer_id: string | null;
    vendor_services?: VendorService[];
    vendor_service_packages?: VendorServicePackage[];
    vendor_reviews?: VendorReview[];
    vendor_service_areas?: VendorServiceArea[];
    vendor_languages?: VendorLanguage[];
  }

export interface VendorServiceArea {
  id: string;
  vendor_id: string;
  service_area_id: string;
  state: string;
  region: string;
}

export interface VendorLanguage {
  id: string;
  vendor_id: string;
  language_id: string;
  language: string;
}

export interface VendorGear {
  id: string;
  vendor_id: string;
  gear_type: string;
  brand: string;
  model: string;
  year: number | null;
  condition: string;
  submitted_at: string;
  gear_rating: string | null;
  review_notes: string;
}

export interface StyleTag {
  id: number;
  label: string;
  description?: string;
}

export interface VendorStyleTag {
  id: string;
  vendor_id: string;
  style_id: number;
  label: string;
  description?: string;
}

export interface VibeTag {
  id: number;
  label: string;
  description?: string;
}

export interface VendorVibeTag {
  id: string;
  vendor_id: string;
  vibe_id: number;
  label: string;
  description?: string;
}