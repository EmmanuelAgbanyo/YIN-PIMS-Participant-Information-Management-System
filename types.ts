// Fix: Replaced circular import with direct type definition for UUID.
export type UUID = string;

export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other',
}

export enum Region {
  Ashanti = 'Ashanti',
  GreaterAccra = 'Greater Accra',
  Volta = 'Volta',
  Western = 'Western',
  Eastern = 'Eastern',
  Central = 'Central',
}

export type UserRole = 'Super Admin' | 'Admin' | 'Organizer' | 'Club Executive' | 'Volunteer Coordinator' | 'Viewer';

export interface User {
  id: UUID;
  email: string;
  password?: string; // For seed data, should not be exposed in app state
  role: UserRole;
  createdAt: Date;
  assignedClubId?: UUID;
}

export interface Participant {
  id: UUID;
  name: string;
  gender: Gender;
  institution: string;
  region: Region;
  contact: string;
  membershipStatus: boolean;
  certificateIssued: boolean;
  isContestant?: boolean;
  notes: string;
  createdAt: Date;
  membershipId: string;
  ghanaCardNumber?: string;
  engagementScore?: number;
  lastMembershipCardGeneratedAt?: Date;
  photoUrl?: string; // For membership card
}

export interface Event {
  id: UUID;
  title: string;
  date: Date;
  year: number;
  location: string;
  category: string;
}

export interface Participation {
  id?: UUID; // To hold the firebase key
  participantId: UUID;
  eventId: UUID;
}

export interface Club {
  id: UUID;
  name: string;
  description: string;
  institution: string;
  createdAt: Date;
}

export interface ClubMembership {
  id?: UUID; // Firebase key
  participantId: UUID;
  clubId: UUID;
  joinDate: Date;
}

export type VolunteerRole = 'Event Staff' | 'Mentor' | 'Logistics' | 'Administrative' | 'Fundraising';
export type VolunteerStatus = 'Active' | 'Inactive' | 'Pending';

export interface Volunteer {
    id: UUID;
    participantId: UUID;
    role: VolunteerRole;
    status: VolunteerStatus;
    startDate: Date;
}

export interface Activity {
    id: UUID;
    volunteerId: UUID; // Links to Volunteer.id
    eventId?: UUID; // Optional, links to a specific event
    description: string;
    hours: number;
    date: Date;
}


export interface KPIs {
  totalParticipants: number;
  activeMembers: number;
  totalEvents: number;
  averageParticipationRate: number;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

export type AppView =
  | 'dashboard'
  | 'participants'
  | 'events'
  | 'clubs'
  | 'volunteers'
  | 'registrations'
  | 'reports'
  | 'certificates'
  | 'verification'
  | 'settings'
  | 'profile';