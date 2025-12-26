
import React from "react";
import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

export const SettingsDropdown = () => {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-10 h-10 p-0 rounded-full">
          <Settings className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-black/50 backdrop-blur-md shadow-xl border-white/10 mt-1 z-50">
        <DropdownMenuItem 
          onClick={() => navigate("/settings")} 
          className="cursor-pointer text-right py-2 px-4 hover:bg-white/10 text-gray-200"
        >
          الإعدادات
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
