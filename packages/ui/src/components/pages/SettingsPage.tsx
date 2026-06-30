import { useState, useEffect } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
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
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';
import { User, Key, Trash2, Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name, phone, bio')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName((data as any).display_name || '');
          setPhone((data as any).phone || '');
          setBio((data as any).bio || '');
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), phone: phone.trim(), bio: bio.trim(), updated_at: new Date().toISOString() } as any)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Your details have been updated.' });
    }
    setSaving(false);
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email sent', description: 'Check your inbox for a password reset link.' });
    }
    setResetting(false);
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
      await signOut();
      navigate('/');
      toast({ title: 'Account deleted', description: 'Your account has been permanently deleted.' });
    } catch (err: any) {
      toast({ title: 'Failed to delete account', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 p-4 pb-24">

      {/* Profile details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled className="bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+27 12 345 6789"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="A short bio"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4" /> Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            We'll send a password reset link to <strong>{user?.email}</strong>.
          </p>
          <Button variant="outline" onClick={handlePasswordReset} disabled={resetting} className="w-full">
            {resetting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {resetting ? 'Sending…' : 'Send Password Reset Email'}
          </Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="h-4 w-4" /> Delete Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">Delete My Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account, profile, and all your data. This action <strong>cannot be undone</strong>.
                  <br /><br />
                  Type your email address to confirm:
                  <strong className="block mt-1">{user?.email}</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={user?.email || ''}
                className="mt-1"
              />
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
