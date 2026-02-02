// @ts-nocheck
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight } from "lucide-react";

const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

interface AgencySignupFormProps {
  onSuccess?: () => void;
}

export function AgencySignupForm({ onSuccess }: AgencySignupFormProps) {
  const { user, redirectAfterAuth } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [busy, setBusy] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    mobile: "",
    email: "",
    agencyName: "",
    province: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim() || !formData.mobile.trim() || !formData.email.trim() || !formData.agencyName.trim() || !formData.province) {
      toast({
        variant: "destructive",
        title: "Required fields missing",
        description: "Please fill in all fields to continue.",
      });
      return;
    }

    // If not logged in, require password
    if (!user) {
      if (!formData.password || formData.password.length < 6) {
        toast({
          variant: "destructive",
          title: "Password required",
          description: "Please create a password with at least 6 characters.",
        });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({
          variant: "destructive",
          title: "Passwords don't match",
          description: "Please confirm your password.",
        });
        return;
      }
    }

    setBusy(true);

    try {
      let userId = user?.id;

      // Create account if not logged in
      if (!user) {
        redirectAfterAuth("/agency/onboarding");
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: { 
              display_name: formData.fullName.trim(),
              role: "tenant" 
            },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });

        if (authError) throw authError;
        userId = authData.user?.id;

        if (!userId) {
          toast({
            title: "Account created",
            description: "Please verify your email and sign in to continue the agency onboarding.",
          });
          navigate("/auth");
          return;
        }
      }

      // Create agency draft
      const { data: agencyData, error: agencyError } = await supabase
        .from("agencies")
        .insert({
          name: formData.agencyName.trim(),
          created_by: userId,
          status: "draft",
        })
        .select("id")
        .single();

      if (agencyError) throw agencyError;

      // Create agency membership
      await supabase.from("agency_members").insert({
        agency_id: agencyData.id,
        user_id: userId,
        role: "agency_admin",
      });

      // Update profile with additional info
      await supabase.from("profiles").upsert({
        user_id: userId,
        display_name: formData.fullName.trim(),
        phone: formData.mobile.trim(),
        email: formData.email.trim(),
      });

      toast({
        title: "Agency registered!",
        description: "Please upload your agency documents to complete registration.",
      });

      onSuccess?.();
      
      // Redirect to document upload step
      navigate("/agency/onboarding");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
        <Input
          id="fullName"
          value={formData.fullName}
          onChange={(e) => handleChange("fullName", e.target.value)}
          placeholder="Your full name"
          disabled={busy}
          className="bg-background border-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobile" className="text-foreground">Mobile Number</Label>
        <Input
          id="mobile"
          type="tel"
          value={formData.mobile}
          onChange={(e) => handleChange("mobile", e.target.value)}
          placeholder="+27 XX XXX XXXX"
          disabled={busy}
          className="bg-background border-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="you@agency.com"
          disabled={busy}
          className="bg-background border-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="agencyName" className="text-foreground">Agency Name</Label>
        <Input
          id="agencyName"
          value={formData.agencyName}
          onChange={(e) => handleChange("agencyName", e.target.value)}
          placeholder="Your agency name"
          disabled={busy}
          className="bg-background border-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="province" className="text-foreground">Province</Label>
        <Select
          value={formData.province}
          onValueChange={(value) => handleChange("province", value)}
          disabled={busy}
        >
          <SelectTrigger className="bg-background border-input">
            <SelectValue placeholder="Select province" />
          </SelectTrigger>
          <SelectContent>
            {SA_PROVINCES.map((province) => (
              <SelectItem key={province} value={province}>
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!user && (
        <>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="Create a password"
              disabled={busy}
              className="bg-background border-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              placeholder="Confirm password"
              disabled={busy}
              className="bg-background border-input"
            />
          </div>
        </>
      )}

      <Button
        type="submit"
        className="w-full bg-success-green hover:bg-success-green-dark text-white font-semibold py-3"
        disabled={busy}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Get Started
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        By signing up, you agree to our Terms of Service and Privacy Policy
      </p>
    </form>
  );
}
