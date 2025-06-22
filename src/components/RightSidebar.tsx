
import React from 'react';
import { Settings } from 'lucide-react';
import { SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { RightSidebar as RightSidebarWrapper } from './RightSidebarProvider';
import { EntityAttributePanelContainer } from './entity-attributes/EntityAttributePanelContainer';

const RightSidebar = () => {
  return (
    <RightSidebarWrapper className="border-l border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary bg-inherit" />
          <h2 className="text-lg font-semibold text-foreground">Note Details</h2>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden p-0">
        <div className="h-full flex flex-col">
          <EntityAttributePanelContainer />
        </div>
      </SidebarContent>
    </RightSidebarWrapper>
  );
};

export default RightSidebar;
