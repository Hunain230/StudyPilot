import { useEffect, useState } from "react";
import { streakService, type StreakData } from "../services/streak.service";

export function useStreak(): StreakData {
  const [streak, setStreak] = useState<StreakData>(() => streakService.get());

  useEffect(() => {
    // Check for expiry/rollover on mount
    const currentStreak = streakService.checkExpiry();
    setStreak(currentStreak);

    // Subscribe to real-time updates (e.g. from user activity)
    const unsubscribe = streakService.subscribe((updatedStreak) => {
      setStreak(updatedStreak);
    });

    // Set up midnight rollover check
    let timeoutId: number;

    const setupRolloverTimer = () => {
      const ms = streakService.msUntilMidnight();
      
      // Schedule check just after midnight (add 1000ms buffer)
      timeoutId = window.setTimeout(() => {
        const afterMidnightStreak = streakService.checkExpiry();
        setStreak(afterMidnightStreak);
        
        // Re-schedule for the next midnight
        setupRolloverTimer();
      }, ms + 1000);
    };

    setupRolloverTimer();

    return () => {
      unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, []);

  return streak;
}
