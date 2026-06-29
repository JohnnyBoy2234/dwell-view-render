import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft, Mail, Home } from 'lucide-react';
import EmailVerification from '@/components/auth/EmailVerification';
import { supabase } from '@mzanzihomes/supabase/client';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_CRITERIA = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /\d/,
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/
};

const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) return { isValid: false, error: 'Email is required' };
  if (!EMAIL_REGEX.test(email)) return { isValid: false, error: 'Please enter a valid email address' };
  return { isValid: true };
};

const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (password.length < PASSWORD_CRITERIA.minLength) errors.push(`At least ${PASSWORD_CRITERIA.minLength} characters`);
  if (!PASSWORD_CRITERIA.hasUppercase.test(password)) errors.push('At least one uppercase letter');
  if (!PASSWORD_CRITERIA.hasLowercase.test(password)) errors.push('At least one lowercase letter');
  if (!PASSWORD_CRITERIA.hasNumber.test(password)) errors.push('At least one number');
  if (!PASSWORD_CRITERIA.hasSpecialChar.test(password)) errors.push('At least one special character');
  return { isValid: errors.length === 0, errors };
};

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function Auth() {
  const { user, signUp, signIn, signInWithGoogle, resetPassword, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'tenant' as 'tenant' | 'landlord'
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailValidation, setEmailValidation] = useState({ isValid: true, error: '' });
  const [passwordValidation, setPasswordValidation] = useState({ isValid: true, errors: [] as string[] });
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    if (user && !loading) {
      const returnTo = sessionStorage.getItem('returnTo');
      if (returnTo) {
        sessionStorage.removeItem('returnTo');
        navigate(returnTo);
        return;
      }
      navigate('/');
    }
  }, [user, loading, navigate]);

  const validateEmailInput = (email: string, isSignUp: boolean = false) => {
    const validation = validateEmail(email);
    if (isSignUp) setEmailValidation({ isValid: validation.isValid, error: validation.error || '' });
    return validation;
  };

  const validatePasswordInput = (password: string) => {
    const validation = validatePassword(password);
    setPasswordValidation(validation);
    return validation;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpLoading(true);

    const emailValid = validateEmailInput(signUpData.email, true);
    if (!emailValid.isValid) { setSignUpLoading(false); return; }

    const passwordValid = validatePasswordInput(signUpData.password);
    if (!passwordValid.isValid) {
      toast({ variant: "destructive", title: "Password Requirements", description: "Please meet all password requirements" });
      setSignUpLoading(false);
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      toast({ variant: "destructive", title: "Password Mismatch", description: "Passwords do not match" });
      setSignUpLoading(false);
      return;
    }

    const { error, isNewUser } = await signUp(signUpData.email, signUpData.password, signUpData.role as 'tenant' | 'landlord');

    if (error) {
      let errorMessage = 'An error occurred during signup';
      if (error.message?.includes('already registered')) errorMessage = 'This email is already registered. Please sign in instead.';
      else if (error.message?.includes('Password')) errorMessage = 'Password does not meet security requirements';
      else if (error.message?.includes('email')) errorMessage = 'Please enter a valid email address';
      else if (error.message) errorMessage = error.message;
      toast({ variant: "destructive", title: "Signup Failed", description: errorMessage });
      setSignUpLoading(false);
      return;
    }

    if (isNewUser) {
      setPendingEmail(signUpData.email);
      setShowEmailVerification(true);
    }
    setSignUpLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInLoading(true);

    const emailValid = validateEmailInput(signInData.email);
    if (!emailValid.isValid) {
      toast({ variant: "destructive", title: "Invalid Email", description: emailValid.error });
      setSignInLoading(false);
      return;
    }

    if (!signInData.password) {
      toast({ variant: "destructive", title: "Password Required", description: "Please enter your password" });
      setSignInLoading(false);
      return;
    }

    const { error } = await signIn(signInData.email, signInData.password);

    if (error) {
      let errorMessage = 'Invalid email or password';
      if (error.message?.includes('Invalid login credentials')) errorMessage = 'Invalid email or password. Please check your credentials.';
      else if (error.message?.includes('Too many requests')) errorMessage = 'Too many login attempts. Please wait a moment.';
      else if (error.message?.includes('User not found')) errorMessage = 'No account found with this email address.';
      else if (error.message) errorMessage = error.message;
      toast({ variant: "destructive", title: "Sign In Failed", description: errorMessage });
      setSignInLoading(false);
      return;
    }

    toast({ title: "Welcome back!", description: "You've been signed in successfully." });
    const returnTo = sessionStorage.getItem('returnTo');
    if (returnTo) { sessionStorage.removeItem('returnTo'); navigate(returnTo); }
    else navigate('/');
    setSignInLoading(false);
  };

  const handleGoogleSignIn = async (role: 'tenant' | 'landlord') => {
    const { error } = await signInWithGoogle(role);
    if (error) toast({ variant: "destructive", title: "Google Sign In Failed", description: error.message || "Failed to sign in with Google." });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailValid = validateEmail(forgotPasswordEmail);
    if (!emailValid.isValid) {
      toast({ variant: "destructive", title: "Invalid Email", description: emailValid.error });
      return;
    }
    setForgotPasswordLoading(true);
    try {
      const { error } = await resetPassword(forgotPasswordEmail);
      if (error) {
        if (error.message?.includes('rate') || error.message?.includes('too many') || error.message?.includes('seconds')) {
          toast({ variant: "destructive", title: "Too Many Requests", description: "Please wait before requesting another reset email." });
        } else {
          setResetEmailSent(true);
        }
      } else {
        setResetEmailSent(true);
        toast({ title: "Reset Email Sent!", description: "If an account with that email exists, we've sent a password reset link.", duration: 7000 });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred. Please try again." });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const resetForgotPasswordState = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setResetEmailSent(false);
    setForgotPasswordLoading(false);
  };

  const handleEmailVerified = () => {
    setShowEmailVerification(false);
    setPendingEmail('');
    toast({ title: "Email Verified!", description: "Your account is ready. Please sign in.", duration: 5000 });
    setActiveTab('signin');
  };

  const handleResendVerificationEmail = async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail });
    if (error) throw new Error(error.message || "Failed to resend verification email");
  };

  const handleBackToSignUp = () => {
    setShowEmailVerification(false);
    setPendingEmail('');
  };

  if (showEmailVerification) {
    return (
      <EmailVerification
        email={pendingEmail}
        onVerified={handleEmailVerified}
        onBack={handleBackToSignUp}
        onResendEmail={handleResendVerificationEmail}
      />
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/5 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/50">
            <div className="bg-ocean-blue px-8 py-7 text-white text-center">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold">
                {resetEmailSent ? 'Check Your Email' : 'Reset Password'}
              </h1>
              <p className="text-white/70 text-sm mt-1">
                {resetEmailSent
                  ? 'A reset link is on its way'
                  : 'We\'ll send you a reset link'}
              </p>
            </div>

            <div className="bg-background px-6 py-6 space-y-4">
              {resetEmailSent ? (
                <>
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Check your inbox for a password reset link. It expires in 1 hour.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={() => setResetEmailSent(false)} variant="outline" className="w-full">
                    Send Another Link
                  </Button>
                  <Button onClick={resetForgotPasswordState} variant="ghost" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Sign In
                  </Button>
                </>
              ) : (
                <>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="forgot-email">Email Address</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        disabled={forgotPasswordLoading}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={forgotPasswordLoading}>
                      {forgotPasswordLoading ? 'Sending…' : 'Send Reset Link'}
                    </Button>
                  </form>
                  <Button onClick={resetForgotPasswordState} variant="ghost" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Floating card */}
        <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/50">

          {/* Branded header */}
          <div className="bg-ocean-blue px-8 py-7 text-white text-center">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Home className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold">MzanziHomes</h1>
            <p className="text-white/70 text-sm mt-0.5">Your home, simplified</p>
          </div>

          {/* Card body */}
          <div className="bg-background px-6 py-5">

            {/* iOS-style pill tab switcher */}
            <div className="flex bg-muted rounded-xl p-1 mb-5">
              <button
                type="button"
                onClick={() => setActiveTab('signin')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'signin'
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'signup'
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Sign In tab */}
            {activeTab === 'signin' && (
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleGoogleSignIn('tenant')}
                  disabled={signInLoading}
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <form onSubmit={handleSignIn} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      required
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        required
                        placeholder="••••••••"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={signInLoading}>
                    {signInLoading ? 'Signing in…' : 'Sign In'}
                  </Button>
                </form>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground hover:text-primary p-0 h-auto"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot your password?
                  </Button>
                </div>
              </div>
            )}

            {/* Sign Up tab */}
            {activeTab === 'signup' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => handleGoogleSignIn('tenant')}
                    disabled={signUpLoading}
                  >
                    <GoogleIcon />
                    Tenant
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => handleGoogleSignIn('landlord')}
                    disabled={signUpLoading}
                  >
                    <GoogleIcon />
                    Landlord
                  </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground -mt-2">Continue with Google as…</p>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or email</span>
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signUpData.email}
                      onChange={(e) => {
                        setSignUpData({ ...signUpData, email: e.target.value });
                        validateEmailInput(e.target.value, true);
                      }}
                      required
                      placeholder="you@example.com"
                      className={!emailValidation.isValid ? 'border-destructive' : ''}
                    />
                    {!emailValidation.isValid && emailValidation.error && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />{emailValidation.error}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        value={signUpData.password}
                        onChange={(e) => {
                          setSignUpData({ ...signUpData, password: e.target.value });
                          validatePasswordInput(e.target.value);
                        }}
                        required
                        placeholder="Min. 8 characters"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {signUpData.password && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1">
                        {[
                          { label: `${PASSWORD_CRITERIA.minLength}+ chars`, pass: signUpData.password.length >= PASSWORD_CRITERIA.minLength },
                          { label: 'Uppercase', pass: PASSWORD_CRITERIA.hasUppercase.test(signUpData.password) },
                          { label: 'Lowercase', pass: PASSWORD_CRITERIA.hasLowercase.test(signUpData.password) },
                          { label: 'Number', pass: PASSWORD_CRITERIA.hasNumber.test(signUpData.password) },
                          { label: 'Special char', pass: PASSWORD_CRITERIA.hasSpecialChar.test(signUpData.password) },
                        ].map(({ label, pass }) => (
                          <div key={label} className="flex items-center gap-1">
                            {pass
                              ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                              : <AlertCircle className="h-3 w-3 text-muted-foreground shrink-0" />}
                            <span className={`text-xs ${pass ? 'text-green-600' : 'text-muted-foreground'}`}>{label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={signUpData.confirmPassword}
                        onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                        required
                        placeholder="Repeat your password"
                        className={signUpData.confirmPassword && signUpData.password !== signUpData.confirmPassword ? 'border-destructive' : ''}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {signUpData.confirmPassword && signUpData.password !== signUpData.confirmPassword && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />Passwords don't match
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>I am a…</Label>
                    <RadioGroup
                      value={signUpData.role}
                      onValueChange={(value) => setSignUpData({ ...signUpData, role: value as 'tenant' | 'landlord' })}
                      className="flex gap-3"
                    >
                      <label className={`flex-1 flex items-center gap-2 border rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${signUpData.role === 'tenant' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}>
                        <RadioGroupItem value="tenant" id="tenant" />
                        <div>
                          <p className="text-sm font-medium">Tenant</p>
                          <p className="text-xs text-muted-foreground">Find a home</p>
                        </div>
                      </label>
                      <label className={`flex-1 flex items-center gap-2 border rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${signUpData.role === 'landlord' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}>
                        <RadioGroupItem value="landlord" id="landlord" />
                        <div>
                          <p className="text-sm font-medium">Landlord</p>
                          <p className="text-xs text-muted-foreground">List a property</p>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={e => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-primary"
                    />
                    <span className="text-xs text-muted-foreground leading-snug">
                      I have read and agree to the{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
                        Privacy Policy
                      </a>
                    </span>
                  </label>

                  <Button type="submit" className="w-full" disabled={signUpLoading || !termsAccepted}>
                    {signUpLoading ? 'Creating account…' : 'Create Account'}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By signing in you agree to our{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy-policy/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
