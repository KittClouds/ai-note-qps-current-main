
export interface ActivityState {
  lastActivity: number;
  isIdle: boolean;
  idleThreshold: number;
}

export class ActivityTracker {
  private lastActivity = Date.now();
  private idleThreshold = 10000; // 10 seconds
  private listeners: Array<(state: ActivityState) => void> = [];
  private checkInterval: number | null = null;

  constructor(idleThreshold = 10000) {
    this.idleThreshold = idleThreshold;
    this.startTracking();
  }

  recordActivity(): void {
    this.lastActivity = Date.now();
    this.notifyListeners();
  }

  isCurrentlyIdle(): boolean {
    return Date.now() - this.lastActivity >= this.idleThreshold;
  }

  getIdleTime(): number {
    return Date.now() - this.lastActivity;
  }

  subscribe(listener: (state: ActivityState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private startTracking(): void {
    // Check idle state every 2 seconds
    this.checkInterval = window.setInterval(() => {
      this.notifyListeners();
    }, 2000);

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, this.handleActivity, true);
    });
  }

  private handleActivity = (): void => {
    this.recordActivity();
  };

  private notifyListeners(): void {
    const state: ActivityState = {
      lastActivity: this.lastActivity,
      isIdle: this.isCurrentlyIdle(),
      idleThreshold: this.idleThreshold
    };
    this.listeners.forEach(listener => listener(state));
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.removeEventListener(event, this.handleActivity, true);
    });
  }
}
