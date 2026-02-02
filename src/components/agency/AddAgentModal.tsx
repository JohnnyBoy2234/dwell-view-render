import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, UserPlus } from "lucide-react";

interface AddAgentModalProps {
  open: boolean;
  onClose: () => void;
  agencyId: string;
  onSuccess: () => void;
}

export function AddAgentModal({ open, onClose, agencyId, onSuccess }: AddAgentModalProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    mobile: "",
    password: "",
    licenseNumber: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.displayName.trim() || !formData.email.trim() || !formData.password) {
      toast({
        variant: "destructive",
        title: "Required fields missing",
        description: "Please fill in name, email, and password.",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    setBusy(true);

    try {
      // Call edge function to create agent account
      const { data, error } = await supabase.functions.invoke("create-agency-agent", {
        body: {
          agency_id: agencyId,
          email: formData.email.trim(),
          password: formData.password,
          display_name: formData.displayName.trim(),
          mobile: formData.mobile.trim() || null,
          license_number: formData.licenseNumber.trim() || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Agent created",
        description: `${formData.displayName} has been added to your agency. They can now sign in with their email and password.`,
      });

      // Reset form
      setFormData({
        displayName: "",
        email: "",
        mobile: "",
        password: "",
        licenseNumber: "",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create agent",
        description: error.message,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Agent
          </DialogTitle>
          <DialogDescription>
            Create a sub-account for your agent. They'll receive login credentials to access the platform.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Full Name *</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => handleChange("displayName", e.target.value)}
              placeholder="Agent's full name"
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="agent@agency.com"
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              type="tel"
              value={formData.mobile}
              onChange={(e) => handleChange("mobile", e.target.value)}
              placeholder="+27 XX XXX XXXX"
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="Create a password for the agent"
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 6 characters. Share this password securely with the agent.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseNumber">License Number (Optional)</Label>
            <Input
              id="licenseNumber"
              value={formData.licenseNumber}
              onChange={(e) => handleChange("licenseNumber", e.target.value)}
              placeholder="FFC or EAAB number"
              disabled={busy}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Agent"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
