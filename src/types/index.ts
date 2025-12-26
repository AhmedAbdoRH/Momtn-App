// تعريفات الأنواع الأساسية للتطبيق
// Basic type definitions for the app

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string;
  created_at?: string;
  tutorial_dismissed?: boolean;
}

export interface Photo {
  id: string;
  imageUrl: string;
  uri: string;
  content: string | null;
  caption: string | null;
  author: string;
  timestamp: string;
  likes: number;
  hashtags: string[];
  ownerId: string;
  photoOwnerId: string;
  userEmail?: string;
  userDisplayName?: string | null;
  comments: any[];
  user_id?: string;
  group_id?: string | null;
}

export interface Comment {
  id: string;
  photo_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  likes?: number;
  liked_by?: string;
  user: CommentUser;
}

export interface CommentUser {
  email: string;
  full_name: string | null;
}

export interface PhotoUser {
  id?: string;
  email: string;
  full_name: string | null;
}

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  created_by: string;
  created_at: string;
  members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  users?: User;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Settings: undefined;
  Profile: undefined;
  Appearance: undefined;
  Notifications: undefined;
  NotificationsList: undefined;
  Privacy: undefined;
  GroupsManagement: undefined;
  About: undefined;
  EmailVerification: undefined;
  ResetPassword: undefined;
  CreateNew: {
    selectedGroupId?: string | null;
    onPhotoAdded?: () => void;
  };
  Contributors: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Groups: undefined;
  Profile: undefined;
};