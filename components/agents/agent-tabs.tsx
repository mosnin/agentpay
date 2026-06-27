"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface AgentTab {
  value: string;
  /** Server-rendered trigger label (icon + text + count) passed from the page. */
  trigger: React.ReactNode;
  /** Server-rendered content passed in from the page (Server Component as prop). */
  content: React.ReactNode;
}

export function AgentTabs({ tabs }: { tabs: AgentTab[] }) {
  return (
    <Tabs defaultValue={tabs[0]?.value} className="w-full">
      <div className="-mx-1 overflow-x-auto px-1 pb-1 no-scrollbar">
        <TabsList className="h-auto w-max gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-1.5 rounded-lg px-3 py-1.5 data-[state=active]:bg-background"
            >
              {tab.trigger}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {tabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className="mt-6 animate-fade-in focus-visible:outline-none"
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
