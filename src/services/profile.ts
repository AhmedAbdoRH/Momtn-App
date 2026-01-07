import { supabase } from './supabase';

export interface Profile {
  id: string;
  full_name: string | null;
  user_welcome_message?: string | null;
  avatar_url?: string | null;
  updated_at: string | null;
}

export class ProfileService {
  static async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      // الحصول على الرسالة الترحيبية والصورة من user_metadata
      const { data: { user } } = await supabase.auth.getUser();
      const welcomeMessage = user?.user_metadata?.greeting_message || 'لحظاتك السعيدة، والنعم الجميلة في حياتك ✨';
      const avatarUrl = user?.user_metadata?.avatar_url || null;

      return {
        ...data,
        user_welcome_message: welcomeMessage,
        avatar_url: avatarUrl
      };
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }

  static async createProfile(userId: string): Promise<Profile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fullName = user?.user_metadata?.full_name || null;
      const email = user?.email || '';
      const welcomeMessage = user?.user_metadata?.greeting_message || 'لحظاتك السعيدة، والنعم الجميلة في حياتك ✨';
      const avatarUrl = user?.user_metadata?.avatar_url || null;

      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          full_name: fullName,
          email: email,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        user_welcome_message: welcomeMessage,
        avatar_url: avatarUrl
      };
    } catch (error) {
      console.error('Error creating profile:', error);
      return null;
    }
  }

  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
    try {
      const { user_welcome_message, avatar_url, ...dbUpdates } = updates;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('users')
          .update({
            ...dbUpdates,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) throw error;
      }

      // تحديث metadata في Auth
      const metadataUpdates: any = {};

      if (user_welcome_message !== undefined) {
        metadataUpdates.greeting_message = user_welcome_message;
      }

      if (avatar_url !== undefined) {
        metadataUpdates.avatar_url = avatar_url;
      }

      if (Object.keys(metadataUpdates).length > 0) {
        const { error } = await supabase.auth.updateUser({
          data: metadataUpdates
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }
}
