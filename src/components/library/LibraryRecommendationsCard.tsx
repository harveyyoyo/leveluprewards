import React from 'react';
import { BookOpen, Compass, MapPin, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BookRecommendation } from '@/lib/library/libraryRecommendations';
import { LibraryBookCover } from './LibraryBookCover';
import { cn } from '@/lib/utils';

export function LibraryRecommendationsCard({
  recommendations,
  className,
}: {
  recommendations: BookRecommendation[];
  className?: string;
}) {
  if (!recommendations.length) return null;

  return (
    <Card className={cn('w-full overflow-hidden border-2 border-primary/20 bg-card/80 shadow-md backdrop-blur-sm', className)}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5 text-foreground">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />
            <span>Recommended for You</span>
          </CardTitle>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Available Now
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="flex w-44 shrink-0 flex-col justify-between rounded-xl border border-border/80 bg-background/90 p-3 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-bold text-primary border-primary/30">
                    {rec.reason}
                  </Badge>
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                </div>
                <div className="flex gap-2 items-start pt-1">
                  <LibraryBookCover
                    coverUrl={rec.coverUrl}
                    title={rec.name}
                    author={rec.author}
                    aspect="thumb"
                    className="h-14 w-10 shrink-0 rounded border shadow-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="line-clamp-2 text-xs font-bold text-foreground leading-snug" title={rec.name}>
                      {rec.name}
                    </h4>
                    <p className="line-clamp-1 text-[11px] text-muted-foreground mt-0.5" title={rec.author}>
                      {rec.author}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                {rec.category ? (
                  <span className="truncate max-w-[80px]">{rec.category}</span>
                ) : (
                  <span>Library</span>
                )}
                {rec.shelfLocation ? (
                  <span className="inline-flex items-center gap-0.5 text-foreground font-semibold bg-muted/50 px-1 py-0.5 rounded">
                    <MapPin className="h-2.5 w-2.5 text-primary" aria-hidden />
                    {rec.shelfLocation}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
