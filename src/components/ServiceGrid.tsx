import { 
  Phone, 
  Wifi, 
  GraduationCap, 
  Printer, 
  Tv, 
  Lightbulb, 
  Repeat, 
  MessageSquare, 
  Trophy 
} from "lucide-react";
import { Link } from "react-router-dom";
import { serviceProviders } from "@/data/providers";
import { cn } from "@/lib/utils";

const services = [
  { id: "airtime", icon: Phone, label: "Airtime", color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40" },
  { id: "data", icon: Wifi, label: "Data", color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40" },
  { id: "exams", icon: GraduationCap, label: "Exams Pins", color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40" },
  { id: "airtime-print", icon: Printer, label: "Airtime Print", color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40" },
  { id: "data-print", icon: Printer, label: "Data Print", color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40" },
  { id: "cables", icon: Tv, label: "Cables", color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40" },
  { id: "electricity", icon: Lightbulb, label: "Electricity", color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40" },
  { id: "airtime2cash", icon: Repeat, label: "Airtime2Cash", color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40" },
  { id: "bulk-sms", icon: MessageSquare, label: "Bulk SMS", color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40" },
  { id: "betting", icon: Trophy, label: "Betting", color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40" },
];

export function ServiceGrid() {
  const electricityProviders = serviceProviders.electricity.slice(0, 4); // Show top 4

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-1">Services</h3>
      <div className="grid grid-cols-4 gap-y-6 gap-x-4">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <Link key={service.id} to={`/service/${service.id}`} className="flex flex-col items-center gap-2 group">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white shadow-xs ${service.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                {service.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Electricity Providers</h3>
          <Link to="/service/electricity" className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline">View All</Link>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {electricityProviders.map((provider) => (
            <Link 
              key={provider.id} 
              to={`/service/electricity`}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-transform group-hover:scale-105", provider.color, provider.textColor)}>
                {provider.shortName.substring(0, 3).toUpperCase()}
              </div>
              <span className="text-[9px] font-medium text-gray-600 dark:text-gray-400 text-center leading-tight truncate w-full">
                {provider.shortName}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
