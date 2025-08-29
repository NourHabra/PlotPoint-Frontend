"use client";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardApi } from "@/lib/api";

export function SectionCards() {
  const [counts, setCounts] = useState<{ draft: number; underReview: number; submitted: number; total?: number }>({ draft: 0, underReview: 0, submitted: 0, total: 0 });

  useEffect(() => {
    (async () => {
      try {
        const data = await dashboardApi.getSummary();
        setCounts(data as any);
      } catch { }
    })();
  }, []);

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-4">
      <Card className="@container/card justify-between">
        <CardHeader>
          <CardDescription>Draft Reports</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{counts.draft}</CardTitle>
          {/* <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              +12.5%
            </Badge>
          </CardAction> */}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground text-xs">Your reports still in Draft</div>
        </CardFooter>
      </Card>
      <Card className="@container/card justify-between">
        <CardHeader>
          <CardDescription>Under Review Reports</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{counts.underReview}</CardTitle>
          {/* <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              +12.5%
            </Badge>
          </CardAction> */}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground text-xs">Initial + Final Review</div>
        </CardFooter>
      </Card>
      <Card className="@container/card justify-between">
        <CardHeader>
          <CardDescription>Submitted Reports</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{counts.submitted}</CardTitle>
          {/* <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              +12.5%
            </Badge>
          </CardAction> */}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground text-xs">Reports marked Submitted</div>
        </CardFooter>
      </Card>
      <Card className="@container/card justify-between">
        <CardHeader>
          <CardDescription>Total Reports</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{counts.total ?? (counts.draft + counts.underReview + counts.submitted)}</CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground text-xs">All your reports</div>
        </CardFooter>
      </Card>
    </div>
  );
}
