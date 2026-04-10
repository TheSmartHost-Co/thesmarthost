export interface ClientPortalProperty {
  id: string;
  listingName: string;
  listingId?: string;
  externalName?: string;
  internalName?: string;
  address?: string;
  postalCode?: string;
  province?: string;
  propertyType?: string;
  commissionRate?: number | null;
  numBeds?: number;
  numBedrooms?: number;
  numBathrooms?: number;
  wifiSsid?: string;
  wifiPassword?: string;
  accessCodes?: string;
  defaultCheckoutTime?: string;
  defaultCheckinTime?: string;
  isActive: boolean;
  isPrimary?: boolean;
  commissionRateOverride?: number | null;
  channels?: { id: string; channelName: string; publicUrl?: string; isActive: boolean }[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientPortalBooking {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyAddress?: string;
  guestName?: string;
  reservationCode?: string;
  checkInDate: string;
  checkOutDate: string;
  numNights?: number;
  numGuests?: number;
  hasPets?: boolean;
  platform?: string;
  listingName?: string;
  bookingStatus?: string;
  nightlyRate?: number | null;
  extraGuestFees?: number | null;
  cleaningFee?: number | null;
  bedLinenFee?: number | null;
  gst?: number | null;
  qst?: number | null;
  lodgingTax?: number | null;
  salesTax?: number | null;
  channelFee?: number | null;
  stripeFee?: number | null;
  mgmtFee?: number | null;
  cohostFee?: number | null;
  totalPayout?: number | null;
  netEarnings?: number | null;
  rentCollected?: number | null;
  taxesCollected?: number | null;
  createdAt: string;
}

export interface ClientPortalCleaningProject {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyAddress?: string;
  cleanerId?: string;
  cleanerName?: string;
  checklistName?: string;
  projectDate: string;
  projectStartTime?: string;
  projectEndTime?: string;
  estimatedDurationMinutes?: number;
  actualStart?: string;
  actualEnd?: string;
  status: string;
  cleanerAccepted?: boolean;
  pmNotes?: string;
  source?: string;
  guestName?: string;
  previousBookingCheckOut?: string;
  nextBookingCheckIn?: string;
  nextBookingGuestName?: string;
  createdAt: string;
}

export interface ClientPortalChecklist {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyAddress?: string;
  name: string;
  isDefault: boolean;
  itemCount: number;
  items?: ClientPortalChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientPortalIssue {
  id: string;
  issueType: string;
  description: string;
  photoUrls: string[];
  status: string;
  pmNotes?: string;
  createdAt: string;
  resolvedAt?: string;
  reporterName?: string;
  projectDate: string;
  propertyId: string;
  propertyName: string;
  propertyAddress?: string;
}

export interface ClientPortalIssuesResponse {
  status: string;
  data: ClientPortalIssue[];
}

export interface ClientPortalChecklistItem {
  id: string;
  roomName: string;
  taskDescription: string;
  requiresPhoto: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ClientPortalDashboardStats {
  propertyCount: number;
  upcomingBookings: number;
  activeCleaningProjects: number;
  openIssues: number;
  bookingsThisMonth: number;
  bookingsLastMonth: number;
  revenueThisMonth?: number;
  revenueLastMonth?: number;
  totalRevenue?: number;
  totalNights?: number;
}

export interface ClientPortalBookingSummary {
  id: string;
  propertyId: string;
  propertyName: string;
  guestName?: string;
  checkInDate: string;
  checkOutDate: string;
  numNights?: number;
  platform?: string;
  totalPayout?: number | null;
  bookingStatus?: string;
}

export interface ClientPortalCleaningSummary {
  id: string;
  propertyId: string;
  propertyName: string;
  projectDate: string;
  projectStartTime?: string;
  status: string;
  cleanerAccepted?: boolean;
  cleanerName?: string;
}

export interface ClientPortalMeResponse {
  status: string;
  data: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    companyName?: string;
    portalStatus: string;
    createdAt: string;
    properties: ClientPortalProperty[];
  };
}

export interface ClientPortalDashboardResponse {
  status: string;
  data: {
    stats: ClientPortalDashboardStats;
    recentBookings: ClientPortalBookingSummary[];
    upcomingCleaning: ClientPortalCleaningSummary[];
  };
}

export interface ClientPortalPropertiesResponse {
  status: string;
  data: ClientPortalProperty[];
}

export interface ClientPortalPropertyResponse {
  status: string;
  data: ClientPortalProperty;
}

export interface ClientPortalBookingsResponse {
  status: string;
  data: ClientPortalBooking[];
}

export interface ClientPortalCleaningProjectsResponse {
  status: string;
  data: ClientPortalCleaningProject[];
}

export interface ClientPortalChecklistsResponse {
  status: string;
  data: ClientPortalChecklist[];
}

export interface ClientPortalChecklistResponse {
  status: string;
  data: ClientPortalChecklist;
}

// Project detail types (for GET /client-portal/cleaning-projects/:id)

export interface ClientPortalProjectChecklistItem {
  id: string;
  projectId: string;
  checklistItemId: string;
  isCompleted: boolean;
  completedAt?: string | null;
  photoUrl?: string | null;
  photoTakenAt?: string | null;
  photoUploadedAt?: string | null;
  notes?: string | null;
  roomName: string;
  taskDescription: string;
  requiresPhoto: boolean;
  sortOrder: number;
}

export interface ClientPortalChecklistProgress {
  totalItems: number;
  completedItems: number;
  photoRequired: number;
  photosUploaded: number;
  completionPercentage: number;
}

export interface ClientPortalWalkthroughPhoto {
  id: string;
  projectId: string;
  groupId: string | null;
  itemId: string | null;
  groupNameSnapshot: string | null;
  itemNameSnapshot: string | null;
  photoUrl: string;
  storagePath?: string;
  photoTakenAt?: string | null;
  photoUploadedAt?: string | null;
  createdAt: string;
}

export interface ClientPortalWalkthroughItem {
  id: string;
  groupId: string;
  name: string;
  sortOrder: number;
  photos: ClientPortalWalkthroughPhoto[];
}

export interface ClientPortalWalkthroughGroup {
  id: string;
  templateId: string;
  name: string;
  sortOrder: number;
  items: ClientPortalWalkthroughItem[];
  photos: ClientPortalWalkthroughPhoto[];
}

export interface ClientPortalEffectiveTemplate {
  id: string;
  name: string;
  description: string | null;
  source: 'assigned' | 'default';
  requiresCompletion: boolean;
  groups: ClientPortalWalkthroughGroup[];
}

export interface ClientPortalOrphanedGroup {
  groupNameSnapshot: string;
  photos: ClientPortalWalkthroughPhoto[];
}

export interface ClientPortalWalkthrough {
  effectiveTemplate: ClientPortalEffectiveTemplate;
  orphanedGroups: ClientPortalOrphanedGroup[];
  freeformPhotos: ClientPortalWalkthroughPhoto[];
  isComplete: boolean;
}

export interface ClientPortalProjectIssue {
  id: string;
  issueType: string;
  description: string;
  photoUrls: string[];
  status: string;
  pmNotes?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  reporterName?: string;
  projectDate: string;
  propertyId: string;
  propertyName: string;
  propertyAddress?: string;
}

export interface ClientPortalProjectDetail {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyAddress?: string;
  cleanerId?: string;
  cleanerName?: string;
  checklistId?: string | null;
  checklistName?: string | null;
  projectDate: string;
  projectStartTime?: string;
  projectEndTime?: string;
  estimatedDurationMinutes?: number;
  actualStart?: string | null;
  actualEnd?: string | null;
  status: string;
  cleanerAccepted?: boolean;
  pmNotes?: string | null;
  source?: string;
  guestName?: string;
  previousBookingCheckOut?: string;
  nextBookingCheckIn?: string;
  nextBookingGuestName?: string;
  createdAt: string;
  checklist: {
    items: ClientPortalProjectChecklistItem[];
    progress: ClientPortalChecklistProgress | null;
  };
  walkthrough: ClientPortalWalkthrough | null;
  issues: ClientPortalProjectIssue[];
}

export interface ClientPortalProjectDetailResponse {
  status: string;
  data: ClientPortalProjectDetail;
}

// ============ Client Portal Reports ============

export interface ClientPortalReport {
  id: string;
  sentAt: string;
  sentBy: string;
  message?: string;
  reportId: string;
  startDate: string;
  endDate: string;
  properties: Array<{
    id: string;
    listingName: string;
    address: string;
  }>;
  files: Array<{
    format: string;
    downloadUrl: string;
    fileName: string;
  }>;
}

export interface ClientPortalReportsResponse {
  status: 'success' | 'failed';
  data: ClientPortalReport[];
}
