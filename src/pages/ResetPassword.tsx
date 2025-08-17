import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Password validation criteria
const PASSWORD_CRITERIA = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /\d/,
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/
};

// Validate password security
const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_CRITERIA.minLength) {
    errors.push(`At least ${PASSWORD_CRITERIA.minLength} characters`);
  }
  if (!PASSWORD_CRITERIA.hasUppercase.test(password)) {
    errors.push('At least one uppercase letter');
  }
  if (!PASSWORD_CRITERIA.hasLowercase.test(password)) {
    errors.push('At least one lowercase letter');
  }
  if (!PASSWORD_CRITERIA.hasNumber.test(password)) {
    errors.push('At least one number');
  }
  if (!PASSWORD_CRITERIA.hasSpecialChar.test(password)) {
    errors.push('At least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have the required tokens for password reset
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      toast({
        variant: "destructive",
        title: "Invalid reset link",
        description: "This password reset link is invalid or has expired."
      });
      navigate('/auth');
    }
  }, [searchParams, navigate, toast]);

  // Real-time password validation
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const validation = validatePassword(value);
    setPasswordErrors(validation.errors);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate password security
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast({
        variant: "destructive",
        title: "Password doesn't meet requirements",
        description: `Password must have: ${passwordValidation.errors.join(', ')}`
      });
      setLoading(false);
      return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please ensure both password fields are the same"
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Password reset failed",
          description: error.message
        });
      } else {
        toast({
          title: "Password updated successfully",
          description: "You can now sign in with your new password."
        });
        navigate('/auth');
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Password reset failed",
        description: "An unexpected error occurred. Please try again."
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  required
                  className={passwordErrors.length > 0 ? "border-destructive" : ""}
                  placeholder="Enter your new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {/* Password criteria display */}
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {password.length >= PASSWORD_CRITERIA.minLength ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={password.length >= PASSWORD_CRITERIA.minLength ? "text-green-600" : "text-muted-foreground"}>
                    At least {PASSWORD_CRITERIA.minLength} characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {PASSWORD_CRITERIA.hasUppercase.test(password) ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={PASSWORD_CRITERIA.hasUppercase.test(password) ? "text-green-600" : "text-muted-foreground"}>
                    One uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {PASSWORD_CRITERIA.hasLowercase.test(password) ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={PASSWORD_CRITERIA.hasLowercase.test(password) ? "text-green-600" : "text-muted-foreground"}>
                    One lowercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {PASSWORD_CRITERIA.hasNumber.test(password) ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={PASSWORD_CRITERIA.hasNumber.test(password) ? "text-green-600" : "text-muted-foreground"}>
                    One number
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {PASSWORD_CRITERIA.hasSpecialChar.test(password) ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={PASSWORD_CRITERIA.hasSpecialChar.test(password) ? "text-green-600" : "text-muted-foreground"}>
                    One special character
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={confirmPassword && password !== confirmPassword ? "border-destructive" : ""}
                  placeholder="Confirm your new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Passwords don't match</AlertDescription>
                </Alert>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || passwordErrors.length > 0 || password !== confirmPassword}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}