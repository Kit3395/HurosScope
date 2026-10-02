/**
 * HorusScope - Expanded Business Categories & Industry Directory
 * 
 * Provides 45+ high-value commercial lead prospecting categories
 * structured by industry groups for agency acquisition targeting.
 */

export interface BusinessCategoryDefinition {
  id: string;
  label: string;
  industryGroup: string;
  defaultKeywords: string;
  highOpportunityNiche: boolean;
  opportunityPitch: string;
}

export interface IndustryGroupDefinition {
  id: string;
  label: string;
  iconName: string;
  description: string;
}

export const INDUSTRY_GROUPS: IndustryGroupDefinition[] = [
  {
    id: 'food_beverage',
    label: 'Food, Dining & Hospitality',
    iconName: 'Utensils',
    description: 'Restaurants, cafes, bakeries, bars, and catering services.',
  },
  {
    id: 'health_wellness',
    label: 'Healthcare, Dental & Wellness',
    iconName: 'Stethoscope',
    description: 'Dental clinics, medical practices, physical therapy, optometry.',
  },
  {
    id: 'beauty_spas',
    label: 'Beauty, Hair & Day Spas',
    iconName: 'Sparkles',
    description: 'Hair salons, esthetics, medical spas, nail studios, barbershops.',
  },
  {
    id: 'home_contractors',
    label: 'Home Services & Contractors',
    iconName: 'Hammer',
    description: 'Roofing, HVAC, plumbing, electrical, solar, landscaping, remodeling.',
  },
  {
    id: 'legal_financial',
    label: 'Legal, Financial & Accounting',
    iconName: 'Scale',
    description: 'Law firms, CPA accountants, tax specialists, financial advisory.',
  },
  {
    id: 'real_estate',
    label: 'Real Estate & Property',
    iconName: 'Building',
    description: 'Real estate agencies, commercial brokerages, property management.',
  },
  {
    id: 'automotive',
    label: 'Automotive & Marine Services',
    iconName: 'Car',
    description: 'Auto repair, collision body shops, detailing, tire & wheel service.',
  },
  {
    id: 'fitness_sports',
    label: 'Fitness, Gyms & Athletics',
    iconName: 'Dumbbell',
    description: 'Gyms, CrossFit boxes, yoga studios, personal training, martial arts.',
  },
  {
    id: 'professional_b2b',
    label: 'Professional & B2B Services',
    iconName: 'Briefcase',
    description: 'Consulting, marketing agencies, IT support, architecture, security.',
  },
  {
    id: 'pet_veterinary',
    label: 'Pet Care & Veterinary',
    iconName: 'HeartHandshake',
    description: 'Animal hospitals, veterinary clinics, pet grooming, dog boarding.',
  },
  {
    id: 'education_care',
    label: 'Childcare & Education',
    iconName: 'GraduationCap',
    description: 'Daycares, preschools, tutoring academies, specialized schools.',
  },
];

export const EXPANDED_CATEGORIES: BusinessCategoryDefinition[] = [
  // 1. Food, Dining & Hospitality
  {
    id: 'Restaurants',
    label: 'Restaurants & Dining',
    industryGroup: 'food_beverage',
    defaultKeywords: 'restaurant, dining, food',
    highOpportunityNiche: true,
    opportunityPitch: 'Direct online ordering, table reservations, and mobile menu speed.',
  },
  {
    id: 'Cafes & Bakeries',
    label: 'Cafes & Artisan Bakeries',
    industryGroup: 'food_beverage',
    defaultKeywords: 'coffee, cafe, bakery, pastries',
    highOpportunityNiche: true,
    opportunityPitch: 'Loyalty programs, catering inquiry portals, and local SEO.',
  },
  {
    id: 'Bars & Breweries',
    label: 'Bars, Lounges & Breweries',
    industryGroup: 'food_beverage',
    defaultKeywords: 'craft beer, cocktail bar, brewery, lounge',
    highOpportunityNiche: false,
    opportunityPitch: 'Event calendars, tap list menus, and private party bookings.',
  },
  {
    id: 'Catering Services',
    label: 'Catering & Event Food',
    industryGroup: 'food_beverage',
    defaultKeywords: 'catering, wedding catering, event buffet',
    highOpportunityNiche: true,
    opportunityPitch: 'High-ticket lead generation forms and date availability checkers.',
  },

  // 2. Healthcare, Dental & Wellness
  {
    id: 'Dentists',
    label: 'Dental & Orthodontic Clinics',
    industryGroup: 'health_wellness',
    defaultKeywords: 'dentist, dental clinic, orthodontist, teeth whitening',
    highOpportunityNiche: true,
    opportunityPitch: 'Online patient booking, smile makeover galleries, and emergency intake.',
  },
  {
    id: 'Medical Clinics',
    label: 'Medical & Healthcare Clinics',
    industryGroup: 'health_wellness',
    defaultKeywords: 'doctor, medical clinic, family doctor, pediatric clinic',
    highOpportunityNiche: true,
    opportunityPitch: 'HIPAA-compliant appointment booking and telemedicine portal integration.',
  },
  {
    id: 'Chiropractors & PT',
    label: 'Chiropractic & Physical Therapy',
    industryGroup: 'health_wellness',
    defaultKeywords: 'chiropractor, physical therapy, sports rehab, back pain',
    highOpportunityNiche: true,
    opportunityPitch: 'Pain assessment quizzes and direct insurance verification funnels.',
  },
  {
    id: 'Optometry & Eye Care',
    label: 'Optometry & Eye Care Centers',
    industryGroup: 'health_wellness',
    defaultKeywords: 'eye doctor, optometrist, eyewear, contact lenses',
    highOpportunityNiche: false,
    opportunityPitch: 'Annual exam reminders and frame collection showcase.',
  },
  {
    id: 'Mental Health & Counseling',
    label: 'Psychology & Counseling Practices',
    industryGroup: 'health_wellness',
    defaultKeywords: 'therapist, counseling, mental health, psychologist',
    highOpportunityNiche: true,
    opportunityPitch: 'Confidential consultation scheduling and therapist matching.',
  },

  // 3. Beauty, Hair & Day Spas
  {
    id: 'Salons & Spas',
    label: 'Beauty Salons & Day Spas',
    industryGroup: 'beauty_spas',
    defaultKeywords: 'hair salon, day spa, facial, hair stylist',
    highOpportunityNiche: true,
    opportunityPitch: 'Automated stylist booking, Instagram portfolio feeds, and gift cards.',
  },
  {
    id: 'Med Spas & Aesthetics',
    label: 'Medical Spas & Esthetics',
    industryGroup: 'beauty_spas',
    defaultKeywords: 'medspa, botox, laser hair removal, skincare clinic',
    highOpportunityNiche: true,
    opportunityPitch: 'High-ticket treatment packages and before/after transformation galleries.',
  },
  {
    id: 'Barbershops',
    label: 'Barbershops & Grooming Lounges',
    industryGroup: 'beauty_spas',
    defaultKeywords: 'barbershop, haircut, beard trim, fades',
    highOpportunityNiche: false,
    opportunityPitch: 'Mobile walk-in queue management and recurring membership plans.',
  },
  {
    id: 'Nail Salons',
    label: 'Nail Salons & Lash Studios',
    industryGroup: 'beauty_spas',
    defaultKeywords: 'nail salon, manicure, lash extensions, pedicure',
    highOpportunityNiche: false,
    opportunityPitch: 'Group booking tools and digital appointment confirmations.',
  },

  // 4. Home Services & Contractors
  {
    id: 'Contractors',
    label: 'General Contractors & Remodeling',
    industryGroup: 'home_contractors',
    defaultKeywords: 'general contractor, home remodeling, kitchen renovation, builder',
    highOpportunityNiche: true,
    opportunityPitch: 'Project estimate calculators, photo portfolios, and financing options.',
  },
  {
    id: 'Roofing Services',
    label: 'Roofing & Siding Specialists',
    industryGroup: 'home_contractors',
    defaultKeywords: 'roofing contractor, roof repair, roof replacement, gutters',
    highOpportunityNiche: true,
    opportunityPitch: 'Storm damage inspection funnels and drone estimate forms.',
  },
  {
    id: 'HVAC Services',
    label: 'HVAC Heating & Air Conditioning',
    industryGroup: 'home_contractors',
    defaultKeywords: 'hvac repair, ac repair, furnace installation, heat pump',
    highOpportunityNiche: true,
    opportunityPitch: '24/7 emergency dispatch buttons and seasonal tune-up memberships.',
  },
  {
    id: 'Plumbing Services',
    label: 'Plumbing & Drain Services',
    industryGroup: 'home_contractors',
    defaultKeywords: 'emergency plumber, water heater, drain cleaning, leak detection',
    highOpportunityNiche: true,
    opportunityPitch: 'Click-to-call mobile CTAs and instant service quote forms.',
  },
  {
    id: 'Electricians',
    label: 'Electrical Contractors',
    industryGroup: 'home_contractors',
    defaultKeywords: 'licensed electrician, panel upgrade, ev charger, wiring',
    highOpportunityNiche: true,
    opportunityPitch: 'EV charger installation funnels and commercial safety compliance.',
  },
  {
    id: 'Solar Energy',
    label: 'Solar & Clean Energy Installers',
    industryGroup: 'home_contractors',
    defaultKeywords: 'solar panel installation, solar energy, battery backup',
    highOpportunityNiche: true,
    opportunityPitch: 'Solar savings calculator with utility bill upload funnels.',
  },
  {
    id: 'Landscaping Services',
    label: 'Landscaping & Tree Services',
    industryGroup: 'home_contractors',
    defaultKeywords: 'lawn care, landscaping, tree removal, hardscaping, patio',
    highOpportunityNiche: false,
    opportunityPitch: 'Recurring service subscription packages and seasonal cleanup bookings.',
  },
  {
    id: 'Painting Contractors',
    label: 'Painting & Drywall Contractors',
    industryGroup: 'home_contractors',
    defaultKeywords: 'house painter, commercial painting, interior paint, drywall',
    highOpportunityNiche: false,
    opportunityPitch: 'Color visualizer tools and instant room square-footage estimators.',
  },
  {
    id: 'Pest Control',
    label: 'Pest Control & Exterminators',
    industryGroup: 'home_contractors',
    defaultKeywords: 'pest control, termite treatment, bed bugs, rodent exterminator',
    highOpportunityNiche: true,
    opportunityPitch: 'Free inspection booking funnels and quarterly protection plans.',
  },
  {
    id: 'Cleaning Services',
    label: 'Commercial & House Cleaning',
    industryGroup: 'home_contractors',
    defaultKeywords: 'maid service, office cleaning, commercial janitorial, deep clean',
    highOpportunityNiche: false,
    opportunityPitch: 'Instant bedroom/bathroom quote calculator and automated rebooking.',
  },

  // 5. Legal, Financial & Accounting
  {
    id: 'Lawyers',
    label: 'Law Firms & Attorneys',
    industryGroup: 'legal_financial',
    defaultKeywords: 'attorney, law firm, personal injury, criminal defense, family lawyer',
    highOpportunityNiche: true,
    opportunityPitch: 'High-intent case evaluation forms and 24/7 intake chat.',
  },
  {
    id: 'Accounting & CPA',
    label: 'CPA, Tax & Accounting Firms',
    industryGroup: 'legal_financial',
    defaultKeywords: 'cpa, tax preparation, bookkeeping, corporate accountant',
    highOpportunityNiche: true,
    opportunityPitch: 'Tax deadline lead magnets and client document portal onboarding.',
  },
  {
    id: 'Financial Advisors',
    label: 'Financial Advisors & Wealth Planning',
    industryGroup: 'legal_financial',
    defaultKeywords: 'wealth management, financial planner, retirement planning',
    highOpportunityNiche: true,
    opportunityPitch: 'Retirement readiness assessments and fiduciary authority positioning.',
  },
  {
    id: 'Insurance Agencies',
    label: 'Independent Insurance Agencies',
    industryGroup: 'legal_financial',
    defaultKeywords: 'insurance broker, auto insurance, commercial liability, home insurance',
    highOpportunityNiche: false,
    opportunityPitch: 'Multi-carrier comparative quote widgets and policy review funnels.',
  },

  // 6. Real Estate & Property
  {
    id: 'Real Estate',
    label: 'Real Estate Agencies & Realtors',
    industryGroup: 'real_estate',
    defaultKeywords: 'real estate agent, homes for sale, realtor, luxury real estate',
    highOpportunityNiche: true,
    opportunityPitch: 'Automated home valuation reports and neighborhood guide funnels.',
  },
  {
    id: 'Property Management',
    label: 'Property Management Companies',
    industryGroup: 'real_estate',
    defaultKeywords: 'property manager, rental management, tenant screening, hoa management',
    highOpportunityNiche: true,
    opportunityPitch: 'Landlord rent estimator and rental vacancy guarantee pitch.',
  },

  // 7. Automotive & Marine Services
  {
    id: 'Auto Repair',
    label: 'Automotive & Repair Shops',
    industryGroup: 'automotive',
    defaultKeywords: 'auto repair, mechanic, brake repair, oil change, transmission',
    highOpportunityNiche: true,
    opportunityPitch: 'Online service scheduler, diagnostic booking, and SMS inspection reports.',
  },
  {
    id: 'Auto Body & Detailing',
    label: 'Auto Body & Ceramic Detailing',
    industryGroup: 'automotive',
    defaultKeywords: 'collision repair, paint protection film, car detailing, ceramic coating',
    highOpportunityNiche: true,
    opportunityPitch: 'Insurance collision claim guidance and luxury vehicle portfolio showcase.',
  },
  {
    id: 'Tire & Wheel Centers',
    label: 'Tire & Wheel Centers',
    industryGroup: 'automotive',
    defaultKeywords: 'tire shop, wheel alignment, new tires, flat repair',
    highOpportunityNiche: false,
    opportunityPitch: 'Tire size selector and online appointment booking.',
  },

  // 8. Fitness, Gyms & Athletics
  {
    id: 'Fitness Centers',
    label: 'Gyms & Fitness Centers',
    industryGroup: 'fitness_sports',
    defaultKeywords: 'gym, fitness club, 24 hour gym, personal training',
    highOpportunityNiche: true,
    opportunityPitch: 'Free trial pass opt-in funnels and automated member signup flows.',
  },
  {
    id: 'Yoga & Pilates',
    label: 'Yoga, Pilates & Barre Studios',
    industryGroup: 'fitness_sports',
    defaultKeywords: 'yoga studio, reformer pilates, barre, hot yoga',
    highOpportunityNiche: true,
    opportunityPitch: 'Introductory week trial offers and class schedule integration.',
  },
  {
    id: 'Martial Arts Academies',
    label: 'Martial Arts & BJJ Academies',
    industryGroup: 'fitness_sports',
    defaultKeywords: 'bjj, martial arts, karate, boxing gym, kickboxing',
    highOpportunityNiche: true,
    opportunityPitch: 'Kids trial uniform programs and adult self-defense funnels.',
  },

  // 9. Professional & B2B Services
  {
    id: 'Architecture & Design',
    label: 'Architecture & Interior Design',
    industryGroup: 'professional_b2b',
    defaultKeywords: 'architect, interior designer, commercial architecture, residential design',
    highOpportunityNiche: true,
    opportunityPitch: 'Immersive visual lookbooks, project case studies, and fee estimation.',
  },
  {
    id: 'IT & Managed Services',
    label: 'IT Support & Managed Service Providers',
    industryGroup: 'professional_b2b',
    defaultKeywords: 'it support, msp, cybersecurity, network maintenance, cloud migration',
    highOpportunityNiche: true,
    opportunityPitch: 'Dark web scan audit lead magnets and cybersecurity vulnerability reviews.',
  },
  {
    id: 'Marketing Agencies',
    label: 'Marketing & Creative Studios',
    industryGroup: 'professional_b2b',
    defaultKeywords: 'marketing agency, seo agency, digital marketing, web design',
    highOpportunityNiche: false,
    opportunityPitch: 'White-label partnerships, audit tools, and case study authority.',
  },

  // 10. Pet Care & Veterinary
  {
    id: 'Veterinary Clinics',
    label: 'Veterinary Clinics & Animal Hospitals',
    industryGroup: 'pet_veterinary',
    defaultKeywords: 'veterinarian, animal hospital, vet clinic, emergency pet care',
    highOpportunityNiche: true,
    opportunityPitch: 'Online pet health portals, puppy wellness plans, and emergency directions.',
  },
  {
    id: 'Pet Grooming & Boarding',
    label: 'Pet Grooming, Boarding & Daycare',
    industryGroup: 'pet_veterinary',
    defaultKeywords: 'dog grooming, pet boarding, dog daycare, pet resort',
    highOpportunityNiche: true,
    opportunityPitch: 'Kennel availability booking system and vaccine record upload portals.',
  },

  // 11. Childcare & Education
  {
    id: 'Daycares & Preschools',
    label: 'Daycares & Early Learning Centers',
    industryGroup: 'education_care',
    defaultKeywords: 'daycare, preschool, childcare, infant care, nursery',
    highOpportunityNiche: true,
    opportunityPitch: 'Parent tour scheduling funnels, tuition rate guides, and safety credentials.',
  },
  {
    id: 'Tutoring Centers',
    label: 'Tutoring & Test Prep Centers',
    industryGroup: 'education_care',
    defaultKeywords: 'tutoring, math tutor, sat prep, reading specialist',
    highOpportunityNiche: false,
    opportunityPitch: 'Diagnostic learning assessment funnels and score guarantee promos.',
  },
];

/**
 * Backward-compatible category lookup
 */
export function getCategoryById(id: string): BusinessCategoryDefinition | undefined {
  return EXPANDED_CATEGORIES.find((c) => c.id.toLowerCase() === id.toLowerCase() || c.label.toLowerCase() === id.toLowerCase());
}

/**
 * Get all categories grouped by industry
 */
export function getCategoriesGrouped(): Record<string, BusinessCategoryDefinition[]> {
  const grouped: Record<string, BusinessCategoryDefinition[]> = {};
  for (const group of INDUSTRY_GROUPS) {
    grouped[group.id] = EXPANDED_CATEGORIES.filter((c) => c.industryGroup === group.id);
  }
  return grouped;
}
