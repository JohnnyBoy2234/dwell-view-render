import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Mail, MessageCircle, Building2 } from "lucide-react";

interface AgentContactCardProps {
  agent: {
    display_name: string;
    email: string;
    mobile?: string | null;
    avatar_url?: string | null;
    license_number?: string | null;
  };
  agency?: {
    name: string;
    logo_url?: string | null;
  } | null;
  onContact?: () => void;
}

export function AgentContactCard({ agent, agency, onContact }: AgentContactCardProps) {
  const initials = agent.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "A";

  const handleCall = () => {
    if (agent.mobile) {
      window.location.href = `tel:${agent.mobile}`;
    }
  };

  const handleEmail = () => {
    window.location.href = `mailto:${agent.email}`;
  };

  const handleWhatsApp = () => {
    if (agent.mobile) {
      const phone = agent.mobile.replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${phone}`, "_blank");
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card via-card to-ocean-blue/5 border-ocean-blue/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border-2 border-ocean-blue/20">
            <AvatarImage src={agent.avatar_url || undefined} />
            <AvatarFallback className="bg-ocean-blue text-white text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-foreground">
              {agent.display_name}
            </h3>
            
            {agency && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Building2 className="h-4 w-4" />
                <span>{agency.name}</span>
              </div>
            )}
            
            {agent.license_number && (
              <p className="text-xs text-muted-foreground mt-1">
                License: {agent.license_number}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {agent.mobile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{agent.mobile}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span className="truncate">{agent.email}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {agent.mobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCall}
              className="text-ocean-blue border-ocean-blue/30 hover:bg-ocean-blue/10"
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleEmail}
            className="text-ocean-blue border-ocean-blue/30 hover:bg-ocean-blue/10"
          >
            <Mail className="h-4 w-4" />
          </Button>
          {agent.mobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              className="text-success-green border-success-green/30 hover:bg-success-green/10"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        {onContact && (
          <Button
            className="w-full mt-4 bg-ocean-blue hover:bg-ocean-blue-dark"
            onClick={onContact}
          >
            Send Message
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
