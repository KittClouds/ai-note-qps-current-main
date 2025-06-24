import React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Icons } from "./icons"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Separator } from "@/components/ui/separator"
import { MergeVacuumStatus } from './MergeVacuumStatus';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setTheme } = useTheme()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>SC</AvatarFallback>
            </Avatar>
            <h4 className="font-semibold">
              shadcn
            </h4>
          </div>
          <p className="text-xs text-muted-foreground">
            shadcn@example.com
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="space-y-4 py-4">
          <div className="px-3 py-2 text-sm">
            <h4 className="mb-1 font-medium">
              Dashboards
            </h4>
            <ul className="mt-2 space-y-1">
              <li>
                <Button variant="ghost" className="justify-start">
                  <Icons.home className="mr-2 h-4 w-4" />
                  <span>
                    Home
                  </span>
                </Button>
              </li>
              <li>
                <Button variant="ghost" className="justify-start">
                  <Icons.settings className="mr-2 h-4 w-4" />
                  <span>
                    Settings
                  </span>
                </Button>
              </li>
              <li>
                <Button variant="ghost" className="justify-start">
                  <Icons.analytics className="mr-2 h-4 w-4" />
                  <span>
                    Analytics
                  </span>
                </Button>
              </li>
            </ul>
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2 space-y-2">
          <MergeVacuumStatus />
          <Separator />
          <div className="flex items-center space-x-2">
            <Switch
              id="theme"
              onClick={() => {
                setTheme(theme => (theme === "dark" ? "light" : "dark"))
              }}
            />
            <Label htmlFor="theme">
              Dark Mode
            </Label>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
