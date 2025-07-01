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
  phone: string | null;
  years_experience: number;
  specialties: string[] | null;
  stripe_account_id: string | null;
  created_at: string;
  updated_at: string | null;
  rating: number | null;
  vendor_services: VendorService[] | null;
  vendor_reviews: VendorReview[] | null;
  vendor_service_packages: VendorServicePackage[] | null;
  states: string[];
  profile?: string | null;
  profile_photo?: string | null;
  vendor_service_areas?: { id: string; state: string; region: string | null }[];
}
