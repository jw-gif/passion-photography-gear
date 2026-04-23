import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Camera, Check, ArrowLeft } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  COMPANIES,
  PCC_TEAMS,
  EVENT_LOCATIONS,
  COVERAGE_TYPES,
  REQUEST_TYPES,
  PHOTO_RATE_CARD,
  type RequestType,
  type CoverageType,
} from "@/lib/orgs";

export const Route = createFileRoute("/request-photography")({
  head: () => ({
    meta: [
      { title: "Photography Team Request · Passion" },
      {
        name: "description",
        content:
          "Submit a request for the Passion Photography team — bookings, shot list additions, and photoshoots.",
      },
    ],
  }),
  component: RequestPhotographyPage,
});

const schema = z
  .object({
    company: z.string().min(1, "Required"),
    team: z.string().optional(),
    firstName: z.string().trim().min(1, "Required").max(100),
    lastName: z.string().trim().min(1, "Required").max(100),
    email: z.string().trim().email("Invalid email").max(255),
    requestTypes: z.array(z.string()).min(1, "Choose at least one"),
    eventName: z.string().trim().max(200).optional(),
    eventLocation: z.string().optional(),
    eventDate: z.date().optional(),
    spansMultipleDays: z.boolean(),
    eventEndDate: z.date().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    contactName: z.string().trim().max(100).optional(),
    contactPhone: z.string().trim().max(30).optional(),
    coverageTypes: z.array(z.string()),
    coverageOther: z.string().trim().max(500).optional(),
    budget: z.string().trim().max(200).optional(),
    concurApprover: z.string().trim().max(200).optional(),
    concurCompany: z.string().trim().max(200).optional(),
    concurClass: z.string().trim().max(200).optional(),
    concurDepartment: z.string().trim().max(200).optional(),
    concurExpenseCategory: z.string().trim().max(200).optional(),
    concurProject: z.string().trim().max(200).optional(),
    concurPeopleResource: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(4000).optional(),
  })
  .refine(
    (v) =>
      v.company !== "Passion City Church" || (v.team && v.team.length > 0),
    { path: ["team"], message: "Required for Passion City Church" }
  );

function RequestPhotographyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [company, setCompany] = useState<string>("");
  const [team, setTeam] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);

  const [eventName, setEventName] = useState("");
  const [eventLocation, setEventLocation] = useState<string>("");
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [spansMultipleDays, setSpansMultipleDays] = useState(false);
  const [eventEndDate, setEventEndDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [coverageTypes, setCoverageTypes] = useState<CoverageType[]>([]);
  const [coverageOther, setCoverageOther] = useState("");

  const [budget, setBudget] = useState("");
  const [concurApprover, setConcurApprover] = useState("");
  const [concurCompany, setConcurCompany] = useState("");
  const [concurClass, setConcurClass] = useState("");
  const [concurDepartment, setConcurDepartment] = useState("");
  const [concurExpenseCategory, setConcurExpenseCategory] = useState("");
  const [concurProject, setConcurProject] = useState("");
  const [concurPeopleResource, setConcurPeopleResource] = useState("");

  const [notes, setNotes] = useState("");

  const showPccTeam = company === "Passion City Church";
  const showEventDetails = useMemo(
    () => requestTypes.includes("photography_team"),
    [requestTypes]
  );
  const showShotListNotes = requestTypes.includes("shot_list_addition");

  function toggleRequestType(t: RequestType) {
    setRequestTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function toggleCoverage(c: CoverageType) {
    setCoverageTypes((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = schema.safeParse({
      company,
      team: showPccTeam ? team : undefined,
      firstName,
      lastName,
      email,
      requestTypes,
      eventName: eventName || undefined,
      eventLocation: eventLocation || undefined,
      eventDate,
      spansMultipleDays,
      eventEndDate,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      contactName: contactName || undefined,
      contactPhone: contactPhone || undefined,
      coverageTypes,
      coverageOther: coverageOther || undefined,
      budget: budget || undefined,
      concurApprover: concurApprover || undefined,
      concurCompany: concurCompany || undefined,
      concurClass: concurClass || undefined,
      concurDepartment: concurDepartment || undefined,
      concurExpenseCategory: concurExpenseCategory || undefined,
      concurProject: concurProject || undefined,
      concurPeopleResource: concurPeopleResource || undefined,
      notes: notes || undefined,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      toast.error(firstError?.message ?? "Please complete required fields");
      return;
    }

    if (showEventDetails) {
      if (!eventName) return toast.error("Event name is required");
      if (!eventLocation) return toast.error("Event location is required");
      if (!eventDate) return toast.error("Event date is required");
      if (!startTime) return toast.error("Start time is required");
      if (!endTime) return toast.error("End time is required");
      if (!contactName) return toast.error("On-site contact name is required");
      if (!contactPhone) return toast.error("On-site contact phone is required");
      if (coverageTypes.length === 0)
        return toast.error("Choose at least one coverage type");
      if (coverageTypes.includes("other") && !coverageOther.trim())
        return toast.error("Describe the 'Other' coverage type");
    }

    setSubmitting(true);
    const { error } = await supabase.from("photo_requests").insert({
      company,
      team: showPccTeam ? team : null,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      request_types: requestTypes,
      event_name: eventName || null,
      event_location: eventLocation || null,
      event_date: eventDate ? format(eventDate, "yyyy-MM-dd") : null,
      spans_multiple_days: spansMultipleDays,
      event_end_date:
        spansMultipleDays && eventEndDate
          ? format(eventEndDate, "yyyy-MM-dd")
          : null,
      start_time: startTime || null,
      end_time: endTime || null,
      on_site_contact_name: contactName || null,
      on_site_contact_phone: contactPhone || null,
      coverage_types: coverageTypes,
      coverage_other: coverageOther || null,
      budget: budget || null,
      concur_budget_approver: concurApprover || null,
      concur_company: concurCompany || null,
      concur_class: concurClass || null,
      concur_department: concurDepartment || null,
      concur_expense_category: concurExpenseCategory || null,
      concur_project: concurProject || null,
      concur_people_resource_type: concurPeopleResource || null,
      notes: notes || null,
    });
    setSubmitting(false);

    if (error) {
      toast.error(`Submit failed: ${error.message}`);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto size-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Check className="size-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">
            Request submitted
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanks{firstName ? `, ${firstName}` : ""}! The Photography team will
            review your request and follow up by email.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild variant="outline">
              <Link to="/">Home</Link>
            </Button>
            <Button
              onClick={() => {
                setSubmitted(false);
                setRequestTypes([]);
                setEventName("");
                setEventDate(undefined);
                setEventEndDate(undefined);
                setSpansMultipleDays(false);
                setStartTime("");
                setEndTime("");
                setContactName("");
                setContactPhone("");
                setCoverageTypes([]);
                setCoverageOther("");
                setNotes("");
              }}
            >
              Submit another
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="size-8 rounded-full bg-primary flex items-center justify-center">
            <Camera className="size-4" />
          </div>
          <span className="font-semibold tracking-tight group-hover:underline">
            Passion Photography
          </span>
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight uppercase">
            Photography Team Request
          </h1>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            Tell us about your event or shoot. The Photography team will review
            and follow up with next steps.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION: Who you are */}
          <Section title="Tell us about you">
            <Field label="Please tell us what team you're on" required>
              <Select value={company} onValueChange={(v) => { setCompany(v); setTeam(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {showPccTeam && (
              <Field label="Which team are you on?" required>
                <Select value={team} onValueChange={setTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {PCC_TEAMS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name" required>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={100}
                />
              </Field>
              <Field label="Last Name" required>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={100}
                />
              </Field>
            </div>

            <Field label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                placeholder="you@passioncitychurch.com"
              />
            </Field>
          </Section>

          {/* SECTION: Request type */}
          <Section title="I want to request a…" required>
            <div className="space-y-3">
              {REQUEST_TYPES.map((t) => {
                const checked = requestTypes.includes(t.value);
                return (
                  <label
                    key={t.value}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-foreground/30"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleRequestType(t.value)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{t.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {t.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </Section>

          {/* SECTION: Event details */}
          {showEventDetails && (
            <Section title="Event details">
              <Field label="Event Name" required>
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  maxLength={200}
                />
              </Field>

              <Field label="Event Location" required>
                <Select value={eventLocation} onValueChange={setEventLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_LOCATIONS.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Event Date" required>
                  <DatePicker date={eventDate} onChange={setEventDate} />
                </Field>
                <div className="flex items-end">
                  <label className="flex items-start gap-2 pb-2 cursor-pointer">
                    <Checkbox
                      checked={spansMultipleDays}
                      onCheckedChange={(v) => setSpansMultipleDays(!!v)}
                      className="mt-0.5"
                    />
                    <span className="text-sm leading-tight">
                      This request spans multiple concurrent days
                    </span>
                  </label>
                </div>
              </div>

              {spansMultipleDays && (
                <Field label="Last day of event">
                  <DatePicker date={eventEndDate} onChange={setEventEndDate} />
                </Field>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Start Time (photographer(s) on site)"
                  required
                >
                  <TimePicker value={startTime} onChange={setStartTime} />
                </Field>
                <Field label="End Time (photographer(s) released)" required>
                  <TimePicker value={endTime} onChange={setEndTime} />
                </Field>
              </div>

              <Field label="On-Site Point of Contact Name" required>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  maxLength={100}
                />
              </Field>

              <Field label="On-Site Point of Contact Phone Number" required>
                <Input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  maxLength={30}
                  placeholder="(555) 555-5555"
                />
              </Field>

              <Field label="What type of coverage are you requesting?" required>
                <div className="space-y-2">
                  {COVERAGE_TYPES.map((c) => {
                    const checked = coverageTypes.includes(c.value);
                    return (
                      <label
                        key={c.value}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleCoverage(c.value)}
                        />
                        <span>{c.label}</span>
                      </label>
                    );
                  })}
                </div>
                {coverageTypes.includes("other") && (
                  <Input
                    className="mt-3"
                    placeholder="Describe other coverage type"
                    value={coverageOther}
                    onChange={(e) => setCoverageOther(e.target.value)}
                    maxLength={500}
                  />
                )}
              </Field>
            </Section>
          )}

          {/* SECTION: Shot list details */}
          {showShotListNotes && (
            <Section title="Shot list details">
              <Field label="Describe the shots you'd like added">
                <Textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={4000}
                  placeholder="e.g. wide shot of the worship team during the bridge of the closing song; candid of leadership greeting people in the lobby; etc."
                />
              </Field>
            </Section>
          )}

          {/* SECTION: Budget / Concur (only for paid bookings) */}
          {showEventDetails && (
            <Section title="Budget & Concur details">
              <p className="text-sm text-muted-foreground -mt-2">
                Required for Photography Team bookings and Photoshoots. See the
                rate card for budget categories.
              </p>

              <Field label="What is your budget? See rate card for categories">
                <Input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  maxLength={200}
                />
              </Field>
              <Field label="Concur Budget Approver">
                <Input
                  value={concurApprover}
                  onChange={(e) => setConcurApprover(e.target.value)}
                  maxLength={200}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Company">
                  <Input
                    value={concurCompany}
                    onChange={(e) => setConcurCompany(e.target.value)}
                    maxLength={200}
                  />
                </Field>
                <Field label="Class">
                  <Input
                    value={concurClass}
                    onChange={(e) => setConcurClass(e.target.value)}
                    maxLength={200}
                  />
                </Field>
                <Field label="Department">
                  <Input
                    value={concurDepartment}
                    onChange={(e) => setConcurDepartment(e.target.value)}
                    maxLength={200}
                  />
                </Field>
                <Field label="Expense Category">
                  <Input
                    value={concurExpenseCategory}
                    onChange={(e) => setConcurExpenseCategory(e.target.value)}
                    maxLength={200}
                  />
                </Field>
                <Field label="Project">
                  <Input
                    value={concurProject}
                    onChange={(e) => setConcurProject(e.target.value)}
                    maxLength={200}
                  />
                </Field>
                <Field label="People/Resource Type">
                  <Input
                    value={concurPeopleResource}
                    onChange={(e) => setConcurPeopleResource(e.target.value)}
                    maxLength={200}
                  />
                </Field>
              </div>
            </Section>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button asChild variant="outline" type="button">
              <Link to="/">Cancel</Link>
            </Button>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Section({
  title,
  required,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">
        {title}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </h2>
      {children}
    </Card>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

function DatePicker({
  date,
  onChange,
}: {
  date: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="size-4 mr-2" />
          {date ? format(date, "PPP") : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onChange}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
