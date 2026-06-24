"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const pullDistance = isPulling ? Math.max(0, currentY - startY) : 0;
  // Limit the maximum pull distance visually
  const maxPullDistance = 80;
  const visualPullDistance = Math.min(pullDistance * 0.4, maxPullDistance); // Add resistance
  const threshold = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow pull to refresh if we are at the very top of the scroll container
    if (window.scrollY <= 10) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const y = e.touches[0].clientY;
    
    // Only set current Y if pulling down
    if (y > startY) {
      setCurrentY(y);
    } else {
      setIsPulling(false);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (visualPullDistance > threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        // Add a minimum delay so the spinner is visible
        const minDelay = new Promise(resolve => setTimeout(resolve, 800));
        await Promise.all([onRefresh(), minDelay]);
      } catch (error) {
        console.error("Failed to refresh:", error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setStartY(0);
    setCurrentY(0);
  };

  return (
    <div 
      className={cn("relative min-h-screen", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh Indicator */}
      <div 
        className={cn(
          "absolute top-0 left-0 w-full flex justify-center items-center overflow-hidden transition-all duration-300 z-50 pointer-events-none",
          isRefreshing ? "opacity-100" : isPulling && visualPullDistance > 10 ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: isRefreshing ? threshold : visualPullDistance,
          transform: `translateY(${isRefreshing ? 16 : Math.max(0, visualPullDistance - 30)}px)`
        }}
      >
        <div className={cn(
          "bg-background/95 backdrop-blur shadow-md rounded-full p-2.5 flex items-center justify-center transition-transform",
          isRefreshing ? "animate-spin" : "",
          isPulling && visualPullDistance > threshold && !isRefreshing ? "bg-primary/10" : ""
        )}
        style={{ transform: `rotate(${isPulling && !isRefreshing ? visualPullDistance * 4 : 0}deg)` }}
        >
          <RefreshCw className={cn(
            "w-5 h-5", 
            isRefreshing ? "text-primary" : "text-muted-foreground",
            isPulling && visualPullDistance > threshold && !isRefreshing ? "text-primary" : ""
          )} />
        </div>
      </div>

      {/* Content */}
      <div 
        ref={contentRef}
        className={cn("transition-transform duration-300 w-full")}
        style={{ transform: `translateY(${isRefreshing ? threshold : visualPullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
