import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format, isSameDay, subDays } from "date-fns";

interface ReportDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function ReportDatePicker({ selectedDate, onDateChange }: ReportDatePickerProps) {
  const [open, setOpen] = useState(false);

  // Format date label for button display
  const formatDateLabel = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, today)) return "Today";
    if (isSameDay(date, yesterday)) return "Yesterday";
    return format(date, "MMM d"); // e.g., "Dec 13"
  };

  // Calculate date range (today and past 7 days)
  const today = new Date();
  const sevenDaysAgo = subDays(today, 7);

  // Disable dates outside the valid range
  const disabledDays = [
    { after: today }, // No future dates
    { before: sevenDaysAgo }, // No dates older than 7 days
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between bg-white border-2 border-black hover:bg-gray-50 px-4 py-3 h-auto font-bold uppercase text-sm text-black"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span>{formatDateLabel(selectedDate)}</span>
          <CalendarIcon className="h-4 w-4 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-2 border-black" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              onDateChange(date);
              setOpen(false);
            }
          }}
          disabled={disabledDays}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
