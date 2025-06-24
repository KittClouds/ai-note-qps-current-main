export type ActivityType = 'write' | 'read' | 'user_interaction' | 'navigation';

export interface ActivityEvent {
  type: ActivityType;
  timestamp: number;
  details?: Record<string, any>;
}

export class ActivityTracker {
  private activities: ActivityEvent[] = [];
  private listeners: Array<(event: ActivityEvent) => void> = [];
  private maxHistorySize = 100;

  constructor() {
    this.setupGlobalListeners();
  }

  private setupGlobalListeners(): void {
    // Track user interactions
    const interactionEvents = ['click', 'keydown', 'scroll', 'mousemove'];
    
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.recordActivity('user_interaction', { eventType });
      }, { passive: true });
    });

    // Track navigation changes
    window.addEventListener('popstate', () => {
      this.recordActivity('navigation', { url: window.location.href });
    });
  }

  public recordActivity(type: ActivityType, details?: Record<string, any>): void {
    const event: ActivityEvent = {
      type,
      timestamp: Date.now(),
      details
    };

    this.activities.push(event);
    
    // Keep only recent activities
    if (this.activities.length > this.maxHistorySize) {
      this.activities = this.activities.slice(-this.maxHistorySize);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(event));
  }

  public getLastActivity(): ActivityEvent | null {
    return this.activities.length > 0 ? this.activities[this.activities.length - 1] : null;
  }

  public getActivitiesSince(timestamp: number): ActivityEvent[] {
    return this.activities.filter(activity => activity.timestamp >= timestamp);
  }

  public subscribe(listener: (event: ActivityEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getIdleTime(): number {
    const lastActivity = this.getLastActivity();
    return lastActivity ? Date.now() - lastActivity.timestamp : 0;
  }
}
