import React, { useState } from 'react';
import { Settings, Database } from 'lucide-react';
import { SidebarContent, SidebarHeader, SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { RightSidebar as RightSidebarWrapper } from './RightSidebarProvider';
import { EntityAttributePanelContainer } from './entity-attributes/EntityAttributePanelContainer';
import { ConnectionsPanelContainer } from './ConnectionsPanelContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
const RightSidebar = () => {
  return <RightSidebarWrapper className="border-l border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary bg-inherit" />
          <h2 className="text-lg font-semibold text-foreground">Note Details</h2>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden p-0">
        <Tabs defaultValue="entities" className="h-full flex flex-col">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entities">Entities</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="entities" className="flex-1 mt-0 overflow-hidden">
            <EntityAttributePanelContainer />
          </TabsContent>
          
          <TabsContent value="connections" className="flex-1 mt-0 overflow-hidden">
            <ConnectionsPanelContainer isOpen={true} onToggle={() => {}} />
          </TabsContent>
        </Tabs>
      </SidebarContent>
    </RightSidebarWrapper>;
};
export default RightSidebar;