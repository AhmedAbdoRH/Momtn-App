import { supabase } from './supabase';
import { NotificationsService } from './notifications';
import { ProfileService } from './profile';

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  created_by: string;
  is_private: boolean;
  invite_code: string | null;
  created_at: string;
  updated_at: string;
  welcome_message?: string | null;
  member_count?: number;
  user_role?: string;
  latest_photo_url?: string | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  users: {
    email: string;
    full_name?: string | null;
  };
}

export class GroupsService {
  // إنشاء مجموعة جديدة في قاعدة البيانات الحقيقية
  static async createGroup(name: string, description?: string, isPrivate: boolean = false): Promise<Group> {
    try {
      // التحقق من صحة البيانات
      if (!name || name.trim().length < 2) {
        throw new Error('اسم المجموعة يجب أن يكون حرفين على الأقل');
      }

      if (name.trim().length > 50) {
        throw new Error('اسم المجموعة يجب ألا يتجاوز 50 حرف');
      }

      // الحصول على المستخدم الحالي
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      // التحقق من عدم وجود مجموعة بنفس الاسم للمستخدم نفسه
      const { data: existingGroup, error: checkError } = await supabase
        .from('groups')
        .select('id')
        .eq('name', name.trim())
        .eq('created_by', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`خطأ في التحقق من المجموعات: ${checkError.message}`);
      }

      if (existingGroup) {
        throw new Error('لديك مجموعة بنفس الاسم بالفعل');
      }

      // إنشاء المجموعة الجديدة
      const { data, error } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          created_by: user.id,
          is_private: isPrivate
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // duplicate key error
          throw new Error('اسم المجموعة موجود بالفعل');
        }
        throw new Error(`خطأ في إنشاء المجموعة: ${error.message}`);
      }

      if (!data) {
        throw new Error('فشل في إنشاء المجموعة');
      }

      // إعادة جلب المجموعة مع معلومات العضوية
      const { data: groupWithRole, error: roleError } = await supabase
        .from('groups')
        .select(`
          *,
          group_members!inner(role)
        `)
        .eq('id', data.id)
        .single();

      if (roleError) {
        console.warn('Warning: Could not fetch group role:', roleError.message);
      }

      return {
        ...data,
        user_role: groupWithRole?.group_members?.[0]?.role || 'admin'
      };

    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  // الحصول على مجموعات المستخدم
  static async getUserGroups(): Promise<Group[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      const { data, error } = await supabase
        .from('group_members')
        .select(`
          role,
          groups (
            id,
            name,
            description,
            created_by,
            is_private,
            invite_code,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(`خطأ في جلب المجموعات: ${error.message}`);
      }

      const groups = data
        .map(item => {
          const groupRow = Array.isArray(item.groups) ? item.groups[0] : item.groups;
          if (!groupRow) {
            return null;
          }

          return {
            ...groupRow,
            user_role: item.role,
          } as Group;
        })
        .filter((g): g is Group => Boolean(g));

      if (!groups.length) {
        return groups;
      }

      const groupIds = groups.map(g => g.id);

      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('group_id, image_url, created_at')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false });

      if (photosError) {
        console.warn('Error fetching latest photos for groups:', photosError.message);
        return groups;
      }

      const latestPhotoByGroup = new Map<string, string | null>();

      photosData?.forEach(photo => {
        if (!photo.group_id) {
          return;
        }
        if (!latestPhotoByGroup.has(photo.group_id)) {
          latestPhotoByGroup.set(photo.group_id, photo.image_url || null);
        }
      });

      return groups.map(group => ({
        ...group,
        latest_photo_url: latestPhotoByGroup.get(group.id) ?? null,
      }));
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw error;
    }
  }

  // الانضمام لمجموعة بكود الدعوة مع معالجة محسّنة للأخطاء
  static async joinGroupByInviteCode(inviteCode: string): Promise<Group> {
    try {
      // التحقق من صحة كود الدعوة أولاً
      if (!inviteCode || inviteCode.trim().length < 6) {
        throw new Error('كود الدعوة يجب أن يكون 6 أحرف على الأقل');
      }

      // الحصول على المستخدم الحالي
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      // البحث عن المجموعة بكود الدعوة (حساس لحالة الأحرف لأن الكود قد يكون Base64)
      const cleanCode = inviteCode.trim();
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('invite_code', cleanCode)
        .single();

      if (groupError) {
        if (groupError.code === 'PGRST116') {
          throw new Error('كود الدعوة غير صحيح أو المجموعة غير موجودة');
        }
        throw new Error(`خطأ في البحث عن المجموعة: ${groupError.message}`);
      }

      if (!group) {
        throw new Error('كود الدعوة غير صحيح أو المجموعة غير موجودة');
      }

      // التحقق من عدم الانضمام مسبقاً
      const { data: existingMember, error: memberError } = await supabase
        .from('group_members')
        .select('id, role')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .single();

      if (memberError && memberError.code !== 'PGRST116') {
        throw new Error(`خطأ في التحقق من العضوية: ${memberError.message}`);
      }

      if (existingMember) {
        // إذا كان العضو موجود، إرجاع معلومات المجموعة مع دور العضو
        return {
          ...group,
          user_role: existingMember.role
        };
      }

      // الانضمام للمجموعة كعضو جديد
      const { error: joinError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'member'
        });

      if (joinError) {
        if (joinError.code === '23505') { // duplicate key error
          throw new Error('أنت عضو في هذه المجموعة بالفعل');
        }
        throw new Error(`خطأ في الانضمام للمجموعة: ${joinError.message}`);
      }

      // إرجاع معلومات المجموعة مع دور العضو الجديد
      return {
        ...group,
        user_role: 'member'
      };

    } catch (error) {
      console.error('Error joining group in database:', error);

      // معالجة أنواع مختلفة من الأخطاء
      if (error instanceof Error) {
        throw error; // إعادة إلقاء الخطأ كما هو للتعامل معه في المكون
      }

      throw new Error('حدث خطأ غير متوقع أثناء الانضمام للمجموعة');
    }
  }

  // الحصول على معلومات المجموعة بكود الدعوة (للمعاينة قبل الانضمام)
  static async getGroupByInviteCode(inviteCode: string): Promise<Group | null> {
    try {
      const cleanCode = inviteCode.trim();
      const { data: group, error } = await supabase
        .from('groups')
        .select('*')
        .eq('invite_code', cleanCode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // المجموعة غير موجودة
        }
        throw new Error(`خطأ في البحث عن المجموعة: ${error.message}`);
      }

      return group;
    } catch (error) {
      console.error('Error getting group by invite code:', error);
      return null;
    }
  }

  // الحصول على أعضاء المجموعة
  static async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          id,
          group_id,
          user_id,
          role,
          joined_at,
          users (
            email,
            full_name
          )
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error) {
        throw new Error(`خطأ في جلب أعضاء المجموعة: ${error.message}`);
      }

      return (data || []).map((row: any) => {
        const userRow = Array.isArray(row.users) ? row.users[0] : row.users;
        return {
          ...row,
          users: {
            email: userRow?.email || '',
            full_name: userRow?.full_name ?? null,
          },
        } as GroupMember;
      });
    } catch (error) {
      console.error('Error fetching group members:', error);
      throw error;
    }
  }

  // الحصول على صور المجموعة من قاعدة البيانات الحقيقية
  static async getGroupPhotos(groupId: string): Promise<any[]> {
    try {
      // التحقق من صحة معرف المجموعة
      if (!groupId) {
        return [];
      }

      // الحصول على المستخدم الحالي للتحقق من الصلاحيات
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      // التحقق من أن المستخدم عضو في المجموعة أو أن المجموعة عامة
      const { error: membershipError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (membershipError && membershipError.code !== 'PGRST116') {
        throw new Error(`خطأ في التحقق من العضوية: ${membershipError.message}`);
      }

      // جلب الصور مع معلومات المستخدمين
      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          users (
            email,
            full_name
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`خطأ في جلب صور المجموعة: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching group photos:', error);
      return [];
    }
  }

  // إضافة صورة للمجموعة في قاعدة البيانات الحقيقية
  static async addPhotoToGroup(groupId: string, photoData: any): Promise<any> {
    try {
      // التحقق من صحة البيانات
      if (!groupId) {
        throw new Error('معرف المجموعة مطلوب');
      }

      if (!photoData || (!photoData.caption && !photoData.content)) {
        throw new Error('الوصف (caption) مطلوب');
      }

      // الحصول على المستخدم الحالي
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      // التحقق من أن المستخدم عضو في المجموعة
      const { error: membershipError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (membershipError) {
        if (membershipError.code === 'PGRST116') {
          throw new Error('أنت لست عضواً في هذه المجموعة');
        }
        throw new Error(`خطأ في التحقق من العضوية: ${membershipError.message}`);
      }

      // إنشاء الصورة مع البيانات المطلوبة
      const resolvedCaption = (photoData.caption || photoData.content || '').trim();
      
      const photoPayload = {
        caption: resolvedCaption,
        hashtags: photoData.hashtags || [],
        image_url: photoData.image_url || '', // استخدام سلسلة فارغة بدلاً من null لتجنب قيود قاعدة البيانات
        group_id: groupId,
        user_id: user.id
      };

      // إضافة الصورة لقاعدة البيانات
      const { data, error } = await supabase
        .from('photos')
        .insert(photoPayload)
        .select('*')
        .single();

      if (error) {
        if (error.code === '23503') { // foreign key constraint error
          throw new Error('المجموعة غير موجودة أو ليس لديك صلاحية للنشر فيها');
        }
        throw new Error(`خطأ في إضافة الصورة: ${error.message}`);
      }

      if (!data) {
        throw new Error('فشل في إضافة الصورة');
      }

      // إرسال إشعارات لأعضاء المجموعة
      try {
        const profile = await ProfileService.getProfile(user.id);
        const senderName = profile?.full_name || user.email?.split('@')[0] || 'مستخدم';
        
        // جلب اسم المجموعة
        const { data: group } = await supabase
          .from('groups')
          .select('name')
          .eq('id', groupId)
          .single();

        await NotificationsService.notifyGroupMembers(
          groupId,
          user.id,
          senderName,
          'new_photo',
          'صورة جديدة في المجموعة',
          `قام ${senderName} بإضافة صورة جديدة في مجموعة ${group?.name || ''}`,
          { photo_id: data.id }
        );
      } catch (notifyError) {
        console.warn('Could not send notifications for new photo:', notifyError);
      }

      return data;
    } catch (error) {
      console.error('Error adding photo to group:', error);
      throw error;
    }
  }

  // إضافة صورة شخصية (ليست في مجموعة)
  static async addPersonalPhoto(photoData: any): Promise<any> {
    try {
      if (!photoData || (!photoData.caption && !photoData.content)) {
        throw new Error('الوصف (caption) مطلوب');
      }

      // الحصول على المستخدم الحالي
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      // إنشاء الصورة مع البيانات المطلوبة
      const resolvedCaption = (photoData.caption || photoData.content || '').trim();
      
      const photoPayload = {
        caption: resolvedCaption,
        hashtags: photoData.hashtags || [],
        image_url: photoData.image_url || '', // استخدام سلسلة فارغة بدلاً من null لتجنب قيود قاعدة البيانات
        group_id: null,
        user_id: user.id
      };

      // إضافة الصورة لقاعدة البيانات
      const { data, error } = await supabase
        .from('photos')
        .insert(photoPayload)
        .select('*')
        .single();

      if (error) {
        throw new Error(`خطأ في إضافة الصورة الشخصية: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error adding personal photo:', error);
      throw error;
    }
  }

  // مغادرة المجموعة
  static async leaveGroup(groupId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw new Error(`خطأ في مغادرة المجموعة: ${error.message}`);
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }

  // حذف المجموعة (للمسؤول فقط)
  static async deleteGroup(groupId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');

      // التحقق من أن المستخدم هو منشئ المجموعة
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('created_by')
        .eq('id', groupId)
        .single();

      if (groupError || !group) throw new Error('المجموعة غير موجودة');
      if (group.created_by !== user.id) throw new Error('فقط منشئ المجموعة يمكنه حذفها');

      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw new Error(`خطأ في حذف المجموعة: ${error.message}`);
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }
}






