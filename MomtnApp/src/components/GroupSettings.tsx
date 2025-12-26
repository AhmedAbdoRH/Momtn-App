import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Users, Edit2, Trash2, UserPlus, Settings } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useToast } from "../hooks/use-toast";
import { supabase } from "../integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string | null;
  welcome_message: string | null;
  created_at: string;
  is_private: boolean;
  created_by: string;
  member_count?: number;
}

export const GroupSettings = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingWelcomeMessage, setEditingWelcomeMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUserGroups();
    }
  }, [user]);

  const fetchUserGroups = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch groups where user is creator or member
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          invite_code,
          welcome_message,
          created_at,
          is_private,
          created_by
        `)
        .or(`created_by.eq.${user.id},id.in.(select group_id from group_members where user_id = '${user.id}')`);

      if (groupsError) {
        console.error('Error fetching groups:', groupsError);
        toast({
          title: "خطأ في تحميل المجموعات",
          description: "لم نتمكن من تحميل مجموعاتك",
          variant: "destructive"
        });
        return;
      }

      // Get member count for each group
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group: any) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            ...group,
            welcome_message: group.welcome_message || null,
            member_count: count || 0
          } as Group & { member_count: number };
        })
      );

      setGroups(groupsWithCounts);
    } catch (err) {
      console.error('Exception fetching groups:', err);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء تحميل المجموعات",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group.id);
    setEditingName(group.name);
    setEditingDescription(group.description || '');
    setEditingWelcomeMessage(group.welcome_message || 'مرحباً بكم في مجموعتنا');
  };

  const handleCancelEdit = () => {
    setEditingGroup(null);
    setEditingName('');
    setEditingDescription('');
    setEditingWelcomeMessage('');
  };

  const handleUpdateGroup = async (groupId: string) => {
    if (!user || !editingName.trim()) {
      toast({
        title: "خطأ",
        description: "يجب كتابة اسم المجموعة",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUpdating(true);

      const { error } = await supabase
        .from('groups')
        .update({
          name: editingName.trim(),
          description: editingDescription.trim() || null,
          welcome_message: editingWelcomeMessage.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupId)
        .eq('created_by', user.id); // Only allow creator to update

      if (error) {
        console.error('Error updating group:', error);
        toast({
          title: "خطأ في التحديث",
          description: "لم نتمكن من تحديث المجموعة",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setGroups(prev => prev.map(group =>
        group.id === groupId
          ? {
              ...group,
              name: editingName.trim(),
              description: editingDescription.trim() || null,
              welcome_message: editingWelcomeMessage.trim() || null
            }
          : group
      ));

      setEditingGroup(null);
      setEditingName('');
      setEditingDescription('');
      setEditingWelcomeMessage('');

      toast({
        title: "تم التحديث",
        description: "تم تحديث المجموعة بنجاح",
        className: "border-green-400/50 bg-green-900/80"
      });
    } catch (err) {
      console.error('Exception updating group:', err);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء تحديث المجموعة",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!user) return;

    try {
      setIsDeleting(groupId);
      
      // First delete all group members
      const { error: membersError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);

      if (membersError) {
        console.error('Error deleting group members:', membersError);
        throw membersError;
      }

      // Then delete the group
      const { error: groupError } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)
        .eq('created_by', user.id); // Only allow creator to delete

      if (groupError) {
        console.error('Error deleting group:', groupError);
        throw groupError;
      }

      // Update local state
      setGroups(prev => prev.filter(group => group.id !== groupId));

      toast({
        title: "تم الحذف",
        description: "تم حذف المجموعة بنجاح",
        className: "border-green-400/50 bg-green-900/80"
      });
    } catch (err) {
      console.error('Exception deleting group:', err);
      toast({
        title: "خطأ في الحذف",
        description: "لم نتمكن من حذف المجموعة",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const copyInviteCode = (inviteCode: string) => {
    navigator.clipboard.writeText(inviteCode);
    toast({
      title: "تم النسخ",
      description: "تم نسخ كود الدعوة للحافظة",
      className: "border-green-400/50 bg-green-900/80"
    });
  };

  const isCreator = (group: Group) => group.created_by === user?.id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <span className="mr-3 text-white">جاري تحميل المجموعات...</span>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-xl text-gray-300 mb-2">لا توجد مجموعات حالياً</p>
        <p className="text-gray-400">قم بإنشاء مجموعة جديدة للبدء</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-white" />
        <h2 className="text-2xl font-semibold text-white">إعدادات المجموعات</h2>
      </div>

      {groups.map((group) => (
        <Card key={group.id} className="bg-black/40 border-white/10 backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-white text-right">
                  {editingGroup === group.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="bg-white/10 border-white/20 text-white w-64"
                      dir="rtl"
                      placeholder="اسم المجموعة"
                    />
                  ) : (
                    group.name
                  )}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {isCreator(group) && (
                  <>
                    {editingGroup === group.id ? (
                      <>
                        <Button
                          onClick={() => handleUpdateGroup(group.id)}
                          disabled={isUpdating}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isUpdating ? "جاري الحفظ..." : "حفظ"}
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          إلغاء
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleEditGroup(group)}
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:bg-blue-400/20"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:bg-red-400/20"
                              disabled={isDeleting === group.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-black/90 border-white/20">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white text-right">
                                تأكيد حذف المجموعة
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-300 text-right">
                                هل أنت متأكد من حذف مجموعة "{group.name}"؟ هذا الإجراء لا يمكن التراجع عنه.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-gray-600 hover:bg-gray-700 text-white">
                                إلغاء
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteGroup(group.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {isDeleting === group.id ? "جاري الحذف..." : "حذف"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <CardDescription className="text-gray-400 text-right">
              {editingGroup === group.id ? (
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-sm text-gray-300 block mb-1">وصف المجموعة (اختياري)</Label>
                    <Input
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      className="bg-white/10 border-white/20 text-white w-full"
                      dir="rtl"
                      placeholder="وصف المجموعة"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-300 block mb-1">رسالة الترحيب</Label>
                    <Input
                      value={editingWelcomeMessage}
                      onChange={(e) => setEditingWelcomeMessage(e.target.value)}
                      className="bg-white/10 border-white/20 text-white w-full"
                      dir="rtl"
                      placeholder="رسالة ترحيب تظهر لأعضاء المجموعة"
                    />
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      هذه الرسالة تظهر في أعلى صفحة المجموعة
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>{group.description || "لا يوجد وصف للمجموعة"}</div>
                  {group.welcome_message && (
                    <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-sm text-gray-300 mb-1">رسالة الترحيب:</div>
                      <div className="text-white">{group.welcome_message}</div>
                    </div>
                  )}
                </div>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">عدد الأعضاء: {group.member_count}</span>
                <span className="text-gray-400">
                  {isCreator(group) ? "مؤسس المجموعة" : "عضو"}
                </span>
              </div>

              {group.invite_code && (
                <div className="flex items-center gap-2">
                  <Label className="text-gray-300 text-sm">كود الدعوة:</Label>
                  <code className="bg-white/10 px-2 py-1 rounded text-white text-sm font-mono">
                    {group.invite_code}
                  </code>
                  <Button
                    onClick={() => copyInviteCode(group.invite_code!)}
                    variant="ghost"
                    size="sm"
                    className="text-blue-400 hover:bg-blue-400/20"
                  >
                    نسخ
                  </Button>
                </div>
              )}

              <div className="text-xs text-gray-500 text-right">
                تم الإنشاء: {new Date(group.created_at).toLocaleDateString('ar-SA')}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
