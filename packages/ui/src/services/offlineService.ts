// @ts-nocheck
import { supabase } from "@mzanzihomes/supabase/client";

interface CachedData {
  properties: any[];
  conversations: any[];
  notifications: any[];
  lastUpdated: number;
}

class OfflineService {
  private static CACHE_KEY = "MzanziHomes_offline_cache";
  private static CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Cache critical data for offline access
  static async cacheEssentialData(userId: string) {
    try {
      const [properties, conversations, notifications] = await Promise.all([
        supabase.from("properties").select("*").eq("landlord_id", userId),
        supabase
          .from("conversations")
          .select("*")
          .or(`landlord_id.eq.${userId},tenant_id.eq.${userId}`),
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .limit(50),
      ]);

      const cacheData: CachedData = {
        properties: properties.data || [],
        conversations: conversations.data || [],
        notifications: notifications.data || [],
        lastUpdated: Date.now(),
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      console.log("Essential data cached for offline access");
    } catch (error) {
      console.error("Failed to cache essential data:", error);
    }
  }

  // Get cached data when offline
  static getCachedData(): CachedData | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const data: CachedData = JSON.parse(cached);

      // Check if cache is still valid
      if (Date.now() - data.lastUpdated > this.CACHE_DURATION) {
        this.clearCache();
        return null;
      }

      return data;
    } catch (error) {
      console.error("Failed to get cached data:", error);
      return null;
    }
  }

  // Clear offline cache
  static clearCache() {
    localStorage.removeItem(this.CACHE_KEY);
  }

  // Queue actions for when back online
  static queueAction(action: any) {
    const QUEUE_KEY = "MzanziHomes_offline_queue";
    try {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      queue.push({
        ...action,
        timestamp: Date.now(),
      });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error("Failed to queue action:", error);
    }
  }

  // Process queued actions when back online
  static async processQueuedActions() {
    const QUEUE_KEY = "MzanziHomes_offline_queue";
    try {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");

      for (const action of queue) {
        try {
          await this.executeAction(action);
        } catch (error) {
          console.error("Failed to execute queued action:", error);
        }
      }

      // Clear processed queue
      localStorage.removeItem(QUEUE_KEY);
    } catch (error) {
      console.error("Failed to process queued actions:", error);
    }
  }

  private static async executeAction(action: any) {
    switch (action.type) {
      case "create_message":
        return supabase.from("messages").insert(action.data);
      case "update_property":
        return supabase
          .from("properties")
          .update(action.data)
          .eq("id", action.id);
      case "create_maintenance_request":
        return supabase.from("maintenance_requests").insert(action.data);
      default:
        console.log("Unknown action type:", action.type);
    }
  }

  // Check if specific data is available offline
  static hasOfflineProperties(): boolean {
    const cached = this.getCachedData();
    return cached?.properties && cached.properties.length > 0;
  }

  static hasOfflineConversations(): boolean {
    const cached = this.getCachedData();
    return cached?.conversations && cached.conversations.length > 0;
  }

  // Get offline-specific data
  static getOfflineProperties() {
    return this.getCachedData()?.properties || [];
  }

  static getOfflineConversations() {
    return this.getCachedData()?.conversations || [];
  }

  static getOfflineNotifications() {
    return this.getCachedData()?.notifications || [];
  }
}

export { OfflineService };

