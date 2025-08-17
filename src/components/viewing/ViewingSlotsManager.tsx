import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Clock, PlusCircle, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ViewingSlotsManagerProps {
  propertyId: string;
}

interface Slot {
  id: string;
  property_id: string;
  landlord_id: string;
  start_time: string;
  end_time: string;
  status: "available" | "booked" | "completed";
  booked_by_tenant_id: string | null;
}

export function ViewingSlotsManager({ propertyId }: ViewingSlotsManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  // Realtime updates for bookings
  useEffect(() => {
    if (!user) return;
    const channel = (supabase as any)
      .channel(`viewing-slots-${propertyId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'viewing_slots', filter: `property_id=eq.${propertyId}` },
        (payload: any) => {
          const newRow = payload.new as Slot;
          const oldRow = payload.old as Slot | undefined;

          // Update local state
          setSlots((prev) => prev.map((s) => (s.id === newRow.id ? { ...s, ...newRow } as Slot : s)));

          // Notify landlord when a slot becomes booked
          if (oldRow?.status !== 'booked' && newRow.status === 'booked') {
            toast({
              title: 'New viewing booked',
              description: `${format(new Date(newRow.start_time), 'PPP p')} is now booked`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [propertyId, user]);

  const fetchSlots = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("viewing_slots")
        .select("*")
        .eq("property_id", propertyId)
        .eq("landlord_id", user.id)
        .order("start_time", { ascending: true });
      if (error) throw error;
      setSlots((data as any as Slot[]) || []);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load viewing slots", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDate(undefined);
    setStartTime("");
    setEndTime("");
  };

  const handleCreateSlot = async () => {
    if (!user || !date || !startTime || !endTime) {
      toast({ title: "Missing info", description: "Please select date and times" });
      return;
    }

    const start = new Date(date);
    const [sh, sm] = startTime.split(":").map(Number);
    start.setHours(sh, sm || 0, 0, 0);

    const end = new Date(date);
    const [eh, em] = endTime.split(":").map(Number);
    end.setHours(eh, em || 0, 0, 0);

    if (end <= start) {
      toast({ title: "Invalid time range", description: "End time must be after start time", variant: "destructive" });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("viewing_slots")
        .insert({
          property_id: propertyId,
          landlord_id: user.id,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          status: "available",
        });
      if (error) throw error;
      toast({ title: "Slot added", description: "Viewing slot created successfully" });
      setOpen(false);
      resetForm();
      await fetchSlots();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to create viewing slot", variant: "destructive" });
    }
  };

  const handleMarkCompleted = async (slotId: string) => {
    try {
      const slot = slots.find((s) => s.id === slotId);
      const { error } = await (supabase as any)
        .from("viewing_slots")
        .update({ status: "completed" })
        .eq("id", slotId);
      if (error) throw error;

      // Notify landlord and tenant
      if (slot) {
        try {
          await (supabase as any).functions.invoke('notify-viewing-booked', {
            body: {
              property_id: slot.property_id,
              landlord_id: slot.landlord_id,
              tenant_id: slot.booked_by_tenant_id,
              slot_id: slot.id,
              action: 'completed'
            }
          });
        } catch {}
      }

      toast({ title: "Viewing marked as completed" });
      await fetchSlots();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to mark as completed", variant: "destructive" });
    }
  };

  const handleInvite = async (slot: Slot) => {
    if (!user || !slot.booked_by_tenant_id) return;
    try {
      const token = crypto.randomUUID();
      const { data: invite, error } = await (supabase as any)
        .from("application_invites")
        .insert({
          token,
          property_id: propertyId,
          landlord_id: user.id,
          tenant_id: slot.booked_by_tenant_id,
          status: "invited",
        })
        .select("*")
        .single();
      if (error) throw error;

      // Try to notify via messages if a conversation exists
      const { data: conv } = await (supabase as any)
        .from("conversations")
        .select("id")
        .eq("property_id", propertyId)
        .eq("landlord_id", user.id)
        .eq("tenant_id", slot.booked_by_tenant_id)
        .maybeSingle();

      const link = `${window.location.origin}/apply/invite/${token}`;
      if (conv?.id) {
        await (supabase as any).from("messages").insert({
          conversation_id: conv.id,
          sender_id: user.id,
          content: `You've been invited to apply for this property. Click here to start: ${link}`,
          message_type: "text",
        });
      }

      toast({ title: "Invite sent", description: "We notified the tenant with an application link." });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to send invite", variant: "destructive" });
    }
  };

  const groupedSlots = useMemo(() => {
    const byDay: Record<string, Slot[]> = {};
    for (const s of slots) {
      const key = format(new Date(s.start_time), "yyyy-MM-dd");
      byDay[key] = byDay[key] || [];
      byDay[key].push(s);
    }
    return byDay;
  }, [slots]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Viewing Availability</h3>
          <p className="text-sm text-muted-foreground">Add and manage viewing times for this property</p>
        </div>

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Viewing Slot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a viewing slot</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start font-normal", !date && "text-muted-foreground")}> 
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar 
                      mode="single" 
                      selected={date} 
                      onSelect={setDate} 
                      initialFocus 
                      className={cn("p-3 pointer-events-auto")} 
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start time</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>End time</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateSlot}>Save Slot</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5" /> Schedule</CardTitle>
          <CardDescription>All slots for this property</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slots yet. Create your first slot.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSlots).map(([day, items]) => (
                <div key={day} className="space-y-2">
                  <div className="text-sm font-medium">{format(new Date(day), "PPP")}</div>
                  <div className="grid gap-2">
                    {items.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between rounded-md border p-3">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(new Date(slot.start_time), "p")} – {format(new Date(slot.end_time), "p")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs px-2 py-1 rounded-full border", slot.status === "booked" ? "bg-primary/10 text-primary" : "text-muted-foreground")}> 
                            {slot.status === "booked" ? "Booked" : slot.status === "completed" ? "Completed" : "Available"}
                          </span>
                          {slot.status === "booked" && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>Booked</span>
                              <Button
                                size="sm"
                                className="ml-2"
                                onClick={async () => {
                                  await handleMarkCompleted(slot.id);
                                  await handleInvite(slot);
                                }}
                              >
                                Viewing Completed
                              </Button>
                            </div>
                          )}
                          {slot.status === "completed" && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>Completed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
