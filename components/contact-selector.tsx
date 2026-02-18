"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddContactDialog } from "@/components/add-contact-dialog";

interface ContactSelectorProps {
  value: Id<"contacts"> | null;
  onChange: (contactId: Id<"contacts">) => void;
  disabled?: boolean;
}

export function ContactSelector({ value, onChange, disabled }: ContactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const contacts = useQuery(api.contacts.search, { query: search });

  const selectedContact = contacts?.find((c) => c._id === value);

  return (
    <div className="flex gap-2">
      <Popover open={disabled ? false : open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="flex-1 justify-between font-normal"
          >
            {selectedContact ? selectedContact.name : "Select a contact..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search contacts..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No contacts found.</CommandEmpty>
              <CommandGroup>
                {contacts?.map((contact) => (
                  <CommandItem
                    key={contact._id}
                    value={contact._id}
                    onSelect={() => {
                      onChange(contact._id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === contact._id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm">{contact.name}</span>
                      {contact.email && (
                        <span className="text-xs text-muted-foreground">
                          {contact.email}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <AddContactDialog
        onCreated={(id) => onChange(id as Id<"contacts">)}
        trigger={
          <Button variant="outline" size="icon" title="Add new contact">
            <UserPlus className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );
}
