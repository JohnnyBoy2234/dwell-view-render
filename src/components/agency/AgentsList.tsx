// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, User, Phone, Mail, Building2 } from "lucide-react";

interface Agent {
  user_id: string;
  display_name: string;
  email: string;
  mobile: string | null;
  status: string;
  avatar_url: string | null;
  property_count?: number;
}

interface AgentsListProps {
  agencyId: string;
}

export function AgentsList({ agencyId }: AgentsListProps) {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, [agencyId]);

  const fetchAgents = async () => {
    try {
      // Get all agents for this agency
      const { data: agentProfiles, error } = await supabase
        .from("agent_profiles")
        .select("*")
        .eq("agency_id", agencyId);

      if (error) throw error;

      // Get property counts for each agent
      const agentsWithCounts = await Promise.all(
        (agentProfiles || []).map(async (agent) => {
          const { count } = await supabase
            .from("properties")
            .select("*", { count: "exact", head: true })
            .eq("agent_id", agent.user_id);

          return {
            ...agent,
            property_count: count || 0,
          };
        })
      );

      setAgents(agentsWithCounts);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading agents",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (agentUserId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("agent_profiles")
        .update({ status: newStatus })
        .eq("user_id", agentUserId)
        .eq("agency_id", agencyId);

      if (error) throw error;

      setAgents((prev) =>
        prev.map((agent) =>
          agent.user_id === agentUserId ? { ...agent, status: newStatus } : agent
        )
      );

      toast({
        title: "Agent updated",
        description: `Agent status changed to ${newStatus}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating agent",
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-blue" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No agents yet</h3>
        <p className="text-muted-foreground">
          Add your first agent to start managing your team.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Properties</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => (
          <TableRow key={agent.user_id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={agent.avatar_url || undefined} />
                  <AvatarFallback>
                    {agent.display_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "A"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{agent.display_name}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {agent.email}
                </div>
                {agent.mobile && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {agent.mobile}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {agent.property_count}
              </div>
            </TableCell>
            <TableCell>
              <Badge
                variant={agent.status === "active" ? "default" : "secondary"}
              >
                {agent.status}
              </Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {agent.status === "active" ? (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(agent.user_id, "inactive")}
                    >
                      Deactivate Agent
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(agent.user_id, "active")}
                    >
                      Activate Agent
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
