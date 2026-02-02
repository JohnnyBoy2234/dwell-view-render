// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingLogo } from "@/components/ui/LoadingLogo";
import { AgentsList } from "@/components/agency/AgentsList";
import { AddAgentModal } from "@/components/agency/AddAgentModal";
import { AgencyPropertiesList } from "@/components/agency/AgencyPropertiesList";
import { ArrowLeft, Users, Building2, Plus, Home, Settings } from "lucide-react";

interface Agency {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export default function AgencyDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("agents");

  useEffect(() => {
    if (!authLoading && user) {
      fetchAgency();
    }
  }, [user, authLoading]);

  const fetchAgency = async () => {
    if (!user) return;

    try {
      // Get agency where user is admin
      const { data: membership, error: memberError } = await supabase
        .from("agency_members")
        .select("agency_id, role")
        .eq("user_id", user.id)
        .eq("role", "agency_admin")
        .single();

      if (memberError || !membership) {
        toast({
          variant: "destructive",
          title: "Access denied",
          description: "You don't have agency admin access.",
        });
        navigate("/");
        return;
      }

      const { data: agencyData, error: agencyError } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", membership.agency_id)
        .single();

      if (agencyError) throw agencyError;

      setAgency(agencyData);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading agency",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingLogo size="lg" />
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No Agency Found</h2>
          <p className="text-muted-foreground mb-4">
            You don't have an agency account. Would you like to register one?
          </p>
          <Button onClick={() => navigate("/agency/onboarding")}>
            Register Agency
          </Button>
        </Card>
      </div>
    );
  }

  const isApproved = agency.status === "approved";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{agency.name}</h1>
              <p className="text-muted-foreground">Agency Dashboard</p>
            </div>
          </div>
          <Badge 
            variant={agency.status === "approved" ? "default" : agency.status === "declined" ? "destructive" : "secondary"}
            className="text-sm"
          >
            {agency.status.charAt(0).toUpperCase() + agency.status.slice(1)}
          </Badge>
        </div>

        {!isApproved && (
          <Card className="mb-6 border-warning bg-warning/10">
            <CardContent className="py-4">
              <p className="text-warning-foreground">
                {agency.status === "submitted" 
                  ? "Your agency is under review. You'll be able to add agents and list properties once approved."
                  : agency.status === "draft"
                    ? "Please complete your agency registration to get started."
                    : "Your agency registration was declined. Please contact support."}
              </p>
              {agency.status === "draft" && (
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => navigate("/agency/onboarding")}
                >
                  Complete Registration
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        {isApproved && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Button 
              onClick={() => setAddAgentOpen(true)}
              className="h-auto py-4 flex flex-col items-center gap-2 bg-ocean-blue hover:bg-ocean-blue-dark"
            >
              <Plus className="h-6 w-6" />
              <span>Add Agent</span>
            </Button>
            <Button 
              onClick={() => navigate("/agency/list-for-sale")}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-ocean-blue text-ocean-blue hover:bg-ocean-blue/10"
            >
              <Home className="h-6 w-6" />
              <span>List Property for Sale</span>
            </Button>
            <Button 
              onClick={() => navigate("/list-property")}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-ocean-blue text-ocean-blue hover:bg-ocean-blue/10"
            >
              <Building2 className="h-6 w-6" />
              <span>List Property for Rent</span>
            </Button>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Properties
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Agency Agents</CardTitle>
                    <CardDescription>Manage your team members</CardDescription>
                  </div>
                  {isApproved && (
                    <Button onClick={() => setAddAgentOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Agent
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <AgentsList agencyId={agency.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Agency Properties</CardTitle>
                    <CardDescription>All properties managed by your agency</CardDescription>
                  </div>
                  {isApproved && (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => navigate("/list-property")}>
                        <Plus className="h-4 w-4 mr-2" />
                        List Rental
                      </Button>
                      <Button onClick={() => navigate("/agency/list-for-sale")}>
                        <Plus className="h-4 w-4 mr-2" />
                        List for Sale
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <AgencyPropertiesList agencyId={agency.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Agency Settings</CardTitle>
                <CardDescription>Manage your agency profile and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Agency Name</h4>
                    <p className="text-muted-foreground">{agency.name}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Status</h4>
                    <Badge variant={agency.status === "approved" ? "default" : "secondary"}>
                      {agency.status}
                    </Badge>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Member Since</h4>
                    <p className="text-muted-foreground">
                      {new Date(agency.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Agent Modal */}
        <AddAgentModal
          open={addAgentOpen}
          onClose={() => setAddAgentOpen(false)}
          agencyId={agency.id}
          onSuccess={() => {
            setAddAgentOpen(false);
            // Refresh agents list
            setActiveTab("agents");
          }}
        />
      </div>
    </div>
  );
}
