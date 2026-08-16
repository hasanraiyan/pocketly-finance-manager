import { Bell, Download } from "lucide-react";
import {
  Blank,
  LoadingHeading,
  TextBlank,
  rows,
} from "@/components/loading-skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Card titles are short and stable, so they print for real. The blurbs are
 * long enough that duplicating them here would just invite drift, so those
 * stay blank until the page itself renders them.
 */
const SECTIONS: Array<{ title: React.ReactNode; lines: number }> = [
  { title: "Profile", lines: 2 },
  { title: "Categories", lines: 2 },
  {
    title: (
      <>
        <Download className="size-4" />
        Export Financial Data
      </>
    ),
    lines: 3,
  },
  {
    title: (
      <>
        <Bell className="size-4" />
        Notifications &amp; Reminders
      </>
    ),
    lines: 2,
  },
  { title: "Connected apps", lines: 2 },
  { title: "Danger zone", lines: 2 },
];

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <LoadingHeading
        title="Settings"
        description="Your profile, categories, and account."
      />

      {SECTIONS.map((section, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {section.title}
            </CardTitle>
            <CardDescription className="flex flex-col gap-1">
              {rows(section.lines).map((line) => (
                <TextBlank
                  key={line}
                  size="xs"
                  className={line === section.lines - 1 ? "w-1/2" : "w-full"}
                />
              ))}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Blank className="h-9 w-full max-w-sm" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
