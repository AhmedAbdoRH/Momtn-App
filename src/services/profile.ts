import { supabase } from './supabase';

export interface Profile {
  id: string;
  full_name: string | null;
  user_welcome_message?: string | null;
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

      // الحصول على الرسالة الترحيبية من user_metadata بدلاً من الجدول
      const { data: { user } } = await supabase.auth.getUser();
      const welcomeMessage = user?.user_metadata?.greeting_message || 'لحظاتك السعيدة، والنعم الجميلة في حياتك ✨';

      return {
        ...data,
        user_welcome_message: welcomeMessage
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
        user_welcome_message: welcomeMessage
      };
    } catch (error) {
      console.error('Error creating profile:', error);
      return null;
    }
  }

  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
    try {
      const { user_welcome_message, ...dbUpdates } = updates;

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

      // إذا كان هناك تحديث للرسالة الترحيبية، يتم تحديثها في user_metadata
      if (user_welcome_message !== undefined) {
        const { error } = await supabase.auth.updateUser({
          data: { greeting_message: user_welcome_message }
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }
}
