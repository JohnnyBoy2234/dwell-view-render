import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApplicationInvites } from "@/hooks/useApplicationInvites";
import { useTenantApplications } from "@/hooks/useTenantApplications";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, FileText, Clock } from 'lucide-react';

export const TenantApplicationsSection = () => {
  const { invites, loading: invitesLoading } = useApplicationInvites();
  const { applications, loading: applicationsLoading } = useTenantApplications();
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'invited':
        return <Badge variant="secondary">Invited</Badge>;
      case 'submitted':
        return <Badge variant="outline">Under Review</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const loading = invitesLoading || applicationsLoading;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">My Applications</h2>
      
      <Tabs defaultValue="invites" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invites" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Invitations {invites.length > 0 && `(${invites.length})`}
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Active Applications {applications.length > 0 && `(${applications.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invites" className="mt-4">
          {invitesLoading ? (
            <Card>
              <CardContent className="py-8 text-sm text-muted-foreground">Loading invitations…</CardContent>
            </Card>
          ) : invites.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Invitations Yet</CardTitle>
                <CardDescription>When a landlord invites you to apply, it will appear here.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invites.map((inv) => {
                const photo = inv.property?.images?.[0] || "/placeholder.svg";
                return (
                  <Card key={inv.id} className="overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3">
                      <div className="md:col-span-1 h-40 md:h-full">
                        <img
                          src={photo}
                          alt={`Primary photo of ${inv.property?.title || 'property'}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{inv.property?.title || 'Property'}</CardTitle>
                              <CardDescription>{inv.property?.location}</CardDescription>
                              <div className="mt-2">
                                <span className="text-sm text-muted-foreground">Landlord:</span>{' '}
                                <span className="text-sm font-medium">{inv.landlord?.display_name || 'Landlord'}</span>
                              </div>
                            </div>
                            <Badge variant="secondary">Invitation Received</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Valid until {new Date(inv.expires_at).toLocaleDateString()}</p>
                            <Button onClick={() => navigate(`/apply/invite/${inv.token}`)}>Start Application</Button>
                          </div>
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications" className="mt-4">
          {applicationsLoading ? (
            <Card>
              <CardContent className="py-8 text-sm text-muted-foreground">Loading applications…</CardContent>
            </Card>
          ) : applications.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Active Applications</CardTitle>
                <CardDescription>Your submitted applications will appear here.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {applications.map((app) => {
                const photo = app.property?.images?.[0] || "/placeholder.svg";
                return (
                  <Card key={app.id} className="overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3">
                      <div className="md:col-span-1 h-40 md:h-full">
                        <img
                          src={photo}
                          alt={`Primary photo of ${app.property?.title || 'property'}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{app.property?.title || 'Property'}</CardTitle>
                              <CardDescription>R{app.property?.price?.toLocaleString()}/month • {app.property?.location}</CardDescription>
                              <div className="mt-2">
                                <span className="text-sm text-muted-foreground">Landlord:</span>{' '}
                                <span className="text-sm font-medium">{app.landlord?.display_name || 'Landlord'}</span>
                              </div>
                            </div>
                            {getStatusBadge(app.status)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              Applied on {new Date(app.created_at).toLocaleDateString()}
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={() => navigate(`/application/${app.id}`)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Application
                            </Button>
                          </div>
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
