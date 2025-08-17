import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation criteria
const PASSWORD_CRITERIA = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /\d/,
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/
};

// Validate email format
const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true };
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
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailValidation, setEmailValidation] = useState({ isValid: true, error: '' });
  const [passwordValidation, setPasswordValidation] = useState({ isValid: true, errors: [] as string[] });
  const [activeTab, setActiveTab] = useState('signin');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // Real-time email validation
  const validateEmailInput = (email: string, isSignUp: boolean = false) => {
    const validation = validateEmail(email);
    if (isSignUp) {
      setEmailValidation({ isValid: validation.isValid, error: validation.error || '' });
    }
    return validation;
  };

  // Real-time password validation for signup
  const validatePasswordInput = (password: string) => {
    const validation = validatePassword(password);
    setPasswordValidation(validation);
    return validation;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpLoading(true);

    // Validate email
    const emailValid = validateEmailInput(signUpData.email, true);
    if (!emailValid.isValid) {
      setSignUpLoading(false);
      return;
    }

    // Validate password
    const passwordValid = validatePasswordInput(signUpData.password);
    if (!passwordValid.isValid) {
      toast({
        variant: "destructive",
        title: "Password Requirements",
        description: "Please meet all password requirements",
      });
      setSignUpLoading(false);
      return;
    }

    // Check password confirmation
    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "Passwords do not match",
      });
      setSignUpLoading(false);
      return;
    }

    const { error, isNewUser } = await signUp(signUpData.email, signUpData.password, signUpData.role as 'tenant' | 'landlord');
    
    if (error) {
      let errorMessage = 'An error occurred during signup';
      
      if (error.message?.includes('already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.message?.includes('Password')) {
        errorMessage = 'Password does not meet security requirements';
      } else if (error.message?.includes('email')) {
        errorMessage = 'Please enter a valid email address';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: errorMessage,
      });
      setSignUpLoading(false);
      return;
    }

    if (isNewUser) {
      toast({
        title: "Account Created!",
        description: "You can now sign in to your account.",
        duration: 5000,
      });
      setActiveTab('signin');
    }
    
    setSignUpLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInLoading(true);

    // Basic validation
    const emailValid = validateEmailInput(signInData.email);
    if (!emailValid.isValid) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: emailValid.error,
      });
      setSignInLoading(false);
      return;
    }

    if (!signInData.password) {
      toast({
        variant: "destructive",
        title: "Password Required",
        description: "Please enter your password",
      });
      setSignInLoading(false);
      return;
    }

    const { error } = await signIn(signInData.email, signInData.password);
    
    if (error) {
      let errorMessage = 'Invalid email or password';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a moment before trying again.';
      } else if (error.message?.includes('User not found')) {
        errorMessage = 'No account found with this email address.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: errorMessage,
      });
      setSignInLoading(false);
      return;
    }

    toast({
      title: "Welcome back!",
      description: "You've been signed in successfully.",
    });
    navigate('/dashboard');
    setSignInLoading(false);
  };

  const handleGoogleSignIn = async (role: 'tenant' | 'landlord') => {
    const { error } = await signInWithGoogle(role);
    if (error) {
      toast({
        variant: "destructive",
        title: "Google Sign In Failed",
        description: error.message || "Failed to sign in with Google. Please try again.",
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const emailValid = validateEmail(forgotPasswordEmail);
    if (!emailValid.isValid) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: emailValid.error,
      });
      return;
    }

    setForgotPasswordLoading(true);
    
    try {
      const { error } = await resetPassword(forgotPasswordEmail);
      
      if (error) {
        // Handle rate limiting specifically
        if (error.message?.includes('rate') || error.message?.includes('too many') || error.message?.includes('seconds')) {
          toast({
            variant: "destructive",
            title: "Too Many Requests",
            description: "Please wait a moment before requesting another reset email. For security, there's a limit on how often reset emails can be sent.",
          });
        } else if (error.message?.includes('User not found')) {
          // Still show success message for security (don't reveal if email exists)
          setResetEmailSent(true);
          toast({
            title: "Reset Email Sent!",
            description: "If an account with that email exists, we have sent a password reset link. Please check your email and spam folder.",
            duration: 7000,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Failed to Send Reset Email",
            description: error.message || "Unable to send password reset email. Please try again.",
          });
        }
      } else {
        setResetEmailSent(true);
        toast({
          title: "Reset Email Sent!",
          description: "If an account with that email exists, we have sent a password reset link. Please check your email and spam folder.",
          duration: 7000,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
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

  // Show forgot password form if needed
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">SwiftRent</h1>
            <p className="text-muted-foreground mt-2">Reset Your Password</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>{resetEmailSent ? "Check Your Email" : "Forgot Password?"}</CardTitle>
              <CardDescription>
                {resetEmailSent 
                  ? "If an account with that email exists, we have sent you a password reset link."
                  : "Enter your email address and we'll send you a link to reset your password."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {resetEmailSent ? (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Please check your email for a password reset link. The link will expire in 1 hour for security.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={() => setResetEmailSent(false)}
                      variant="outline" 
                      className="w-full"
                    >
                      Send Another Reset Link
                    </Button>
                    
                    <Button 
                      onClick={resetForgotPasswordState}
                      variant="ghost" 
                      className="w-full"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Sign In
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email Address</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        required
                        placeholder="Enter your email address"
                        disabled={forgotPasswordLoading}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={forgotPasswordLoading}
                    >
                      {forgotPasswordLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
                    </Button>
                  </form>
                  
                  <Button 
                    onClick={resetForgotPasswordState}
                    variant="ghost" 
                    className="w-full"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SwiftRent</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account or create a new one</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <div className="space-y-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => handleGoogleSignIn('tenant')}
                    disabled={signInLoading}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with email
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={signInData.email}
                        onChange={(e) => setSignInData({...signInData, email: e.target.value})}
                        required
                        placeholder="Enter your email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          value={signInData.password}
                          onChange={(e) => setSignInData({...signInData, password: e.target.value})}
                          required
                          placeholder="Enter your password"
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
                    </div>
                    <Button type="submit" className="w-full" disabled={signInLoading}>
                      {signInLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                  
                  <div className="text-center">
                    <Button 
                      type="button"
                      variant="link" 
                      className="text-sm text-primary hover:underline p-0"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot your password?
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => handleGoogleSignIn('tenant')}
                    disabled={signUpLoading}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with email
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={signUpData.email}
                        onChange={(e) => {
                          setSignUpData({...signUpData, email: e.target.value});
                          validateEmailInput(e.target.value, true);
                        }}
                        required
                        placeholder="Enter your email"
                        className={!emailValidation.isValid ? "border-destructive" : ""}
                      />
                      {!emailValidation.isValid && emailValidation.error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{emailValidation.error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          value={signUpData.password}
                          onChange={(e) => {
                            setSignUpData({...signUpData, password: e.target.value});
                            validatePasswordInput(e.target.value);
                          }}
                          required
                          placeholder="Enter a secure password"
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
                          {signUpData.password.length >= PASSWORD_CRITERIA.minLength ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className={signUpData.password.length >= PASSWORD_CRITERIA.minLength ? "text-green-600" : "text-muted-foreground"}>
                            At least {PASSWORD_CRITERIA.minLength} characters
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {PASSWORD_CRITERIA.hasUppercase.test(signUpData.password) ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className={PASSWORD_CRITERIA.hasUppercase.test(signUpData.password) ? "text-green-600" : "text-muted-foreground"}>
                            One uppercase letter
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {PASSWORD_CRITERIA.hasLowercase.test(signUpData.password) ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className={PASSWORD_CRITERIA.hasLowercase.test(signUpData.password) ? "text-green-600" : "text-muted-foreground"}>
                            One lowercase letter
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {PASSWORD_CRITERIA.hasNumber.test(signUpData.password) ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className={PASSWORD_CRITERIA.hasNumber.test(signUpData.password) ? "text-green-600" : "text-muted-foreground"}>
                            One number
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {PASSWORD_CRITERIA.hasSpecialChar.test(signUpData.password) ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className={PASSWORD_CRITERIA.hasSpecialChar.test(signUpData.password) ? "text-green-600" : "text-muted-foreground"}>
                            One special character
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={signUpData.confirmPassword}
                          onChange={(e) => setSignUpData({...signUpData, confirmPassword: e.target.value})}
                          required
                          placeholder="Confirm your password"
                          className={signUpData.confirmPassword && signUpData.password !== signUpData.confirmPassword ? "border-destructive" : ""}
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
                      {signUpData.confirmPassword && signUpData.password !== signUpData.confirmPassword && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>Passwords don't match</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label>Account Type</Label>
                      <RadioGroup 
                        value={signUpData.role} 
                        onValueChange={(value) => setSignUpData({...signUpData, role: value as 'tenant' | 'landlord'})}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="tenant" id="tenant" />
                          <Label htmlFor="tenant">Tenant - Looking for property</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="landlord" id="landlord" />
                          <Label htmlFor="landlord">Landlord - Listing property</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <Button type="submit" className="w-full" disabled={signUpLoading}>
                      {signUpLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}