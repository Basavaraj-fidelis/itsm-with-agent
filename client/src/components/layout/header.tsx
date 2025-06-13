import { useLocation } from "wouter";
import { Settings, User, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/protected-route";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/agents": "Agents",
  "/alerts": "Alerts",
  "/reports": "Reports",
  "/settings": "Settings",
};

export default function Header() {
  return (
    <header className="bg-white dark:bg-[#201F1E] shadow-sm border-b border-[#F3F2F1] dark:border-[#323130]">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Empty header */}
        </div>
      </div>
    </header>
  );
}