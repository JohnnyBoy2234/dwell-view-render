import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Switch } from '@mzanzihomes/ui/components/switch';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Separator } from '@mzanzihomes/ui/components/separator';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
} from '@mzanzihomes/ui/components/alert-dialog';
import {
  Camera,
  Shield,
  User,
  Mail,
  Phone,
  Key,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Edit2,
  ArrowLeft,
  Trash2
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  email_verified: boolean;
  id_verified: boolean;
  is_tenant_screened: boolean;
  paystack_subaccount_code: string | null;
  id_verification_status: string | null;
  notification_prefs: NotificationPreferences | null;
}

interface NotificationPreferences {
  email_notifications: boolean;
  app_notifications: boolean;
  whatsapp_notifications: boolean;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    email_notifications: true,
    app_notifications: true,
    whatsapp_notifications: false
  });

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const p = data as any;
      setProfile(p || null);
      setDisplayName(p?.display_name || '');
      setPhone(p?.phone || '');
      setBio(p?.bio || '');

      if (p?.notification_prefs) {
        setNotificationPrefs({
          email_notifications: p.notification_prefs.email_notifications ?? true,
          app_notifications: p.notification_prefs.app_notifications ?? true,
          whatsapp_notifications: p.notification_prefs.whatsapp_notifications ?? false,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!user || !profile) return;
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast({ title: 'Display name required', description: 'Please enter a display name.', variant: 'destructive' });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: trimmedName,
          phone: phone.trim(),
          bio: bio.trim(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Profile updated', description: 'Your profile has been successfully updated.' });
      fetchProfile();
    } catch (error) {
      toast({ title: 'Error updating profile', description: 'Failed to update your profile. Please try again.', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const saveNotificationPrefs = async () => {
    if (!user) return;
    setSavingPrefs(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_prefs: notificationPrefs } as any)
        .eq('user_id', user.id);

      if (error) throw error;
      toast({ title: 'Preferences saved', description: 'Your notification preferences have been updated.' });
    } catch (error) {
      toast({ title: 'Error saving preferences', description: 'Failed to save preferences. Please try again.', variant: 'destructive' });
    } finally {
      setSavingPrefs(false);
    }
  };

  const uploadImage = async (file: File, type: 'avatar' | 'cover') => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${type}-${Date.now()}.${fileExt}`;
    const filePath = `${type}s/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('branding')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleImageUpload = async (file: File, type: 'avatar' | 'cover') => {
    try {
      const imageUrl = await uploadImage(file, type);
      if (!imageUrl) return;

      const updateData = type === 'avatar' 
        ? { avatar_url: imageUrl }
        : { /* Add cover_url field to database if needed */ };

      const { error } = await supabase
        .from('profiles')
        .update(updateData as any)
        .filter('user_id', 'eq', user!.id);

      if (error) throw error;

      toast({
        title: `${type === 'avatar' ? 'Profile' : 'Cover'} image updated`,
        description: "Your image has been uploaded successfully."
      });

      fetchProfile();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast({
        title: "Password reset sent",
        description: "Check your email for password reset instructions."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email.",
        variant: "destructive"
      });
    }
  };


  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.email) {
      toast({ title: 'Email does not match', description: 'Type your email exactly to confirm.', variant: 'destructive' });
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err: any) {
      toast({ title: 'Failed to delete account', description: err.message, variant: 'destructive' });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-blue"></div>
      </div>
    );
  }

  // Check if user is landlord to show back button
  const isLandlord = user?.user_metadata?.role === 'landlord';
  const propertyId = searchParams.get('property');

  const handleBackToDashboard = () => {
    if (isLandlord) {
      navigate(`/enhancedlandlorddashboard${propertyId ? '?property=' + propertyId : ''}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Back Button for Landlords */}
      {isLandlord && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToDashboard}
          className="flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Button>
      )}
      
      {/* Cover Image Section */}
      <Card className="relative overflow-hidden">
        <div className="h-48 bg-ocean-blue/20 relative">
          <div className="absolute inset-0 bg-black/10"></div>
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm"
            onClick={() => document.getElementById('cover-upload')?.click()}
          >
            <Camera className="h-4 w-4 mr-2" />
            Change Cover
          </Button>
          <input
            id="cover-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file, 'cover');
            }}
          />
        </div>

        {/* Profile Avatar */}
        <div className="relative -mt-16 ml-6 mb-4">
          <div className="relative w-32 h-32">
            <div className="w-32 h-32 rounded-full bg-ocean-blue p-1">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <User className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0"
              onClick={() => document.getElementById('avatar-upload')?.click()}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, 'avatar');
              }}
            />
          </div>
        </div>

        <CardContent className="pt-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{profile?.display_name || 'User'}</h1>
          </div>
          <p className="text-muted-foreground">{user?.email}</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="flex-1"
                />
                <Badge variant={user?.email_confirmed_at ? 'default' : 'destructive'}>
                  {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
              />
            </div>
            <Button onClick={updateProfile} disabled={updating} className="w-full">
              {updating ? 'Updating...' : 'Update Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Verification Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>Email Verification</span>
              </div>
              <Badge variant={user?.email_confirmed_at ? 'default' : 'destructive'}>
                {user?.email_confirmed_at ? 'Verified' : 'Pending'}
              </Badge>
            </div>
            
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="font-medium">Password</div>
                <div className="text-sm text-muted-foreground">Last updated: Never</div>
              </div>
              <Button variant="outline" size="sm" onClick={handlePasswordReset}>
                Reset Password
              </Button>
            </div>
            
            <Separator />
            
            <div className="text-sm text-muted-foreground">
              We'll send a password reset link to your email address.
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">App Notifications</div>
                <div className="text-sm text-muted-foreground">Receive notifications in the app</div>
              </div>
              <Switch
                checked={notificationPrefs.app_notifications}
                onCheckedChange={(checked) => 
                  setNotificationPrefs(prev => ({ ...prev, app_notifications: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-muted-foreground">Receive notifications via email</div>
              </div>
              <Switch
                checked={notificationPrefs.email_notifications}
                onCheckedChange={(checked) => 
                  setNotificationPrefs(prev => ({ ...prev, email_notifications: checked }))
                }
              />
            </div>
            
            <Button variant="outline" className="w-full mt-4" onClick={saveNotificationPrefs} disabled={savingPrefs}>
              {savingPrefs ? 'Saving…' : 'Save Preferences'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">Delete My Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div>
                    <p>This will permanently delete your account, profile, and all your data. This <strong>cannot be undone</strong>.</p>
                    <p className="mt-3">Type your email to confirm:</p>
                    <p className="font-semibold mt-1">{user?.email}</p>
                    <Input
                      value={deleteConfirm}
                      onChange={e => setDeleteConfirm(e.target.value)}
                      placeholder={user?.email || ''}
                      className="mt-3"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirm('')}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirm !== user?.email}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete my account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}