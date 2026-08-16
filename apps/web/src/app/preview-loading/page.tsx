import RecordsLoading from "../(app)/records/loading";
import DashboardLoading from "../(app)/dashboard/loading";
import AccountsLoading from "../(app)/accounts/loading";
import AnalysisLoading from "../(app)/analysis/loading";
import PlanningLoading from "../(app)/planning/loading";
import SettingsLoading from "../(app)/settings/loading";

const SCREENS = [
  ["Dashboard", <DashboardLoading key="d" />],
  ["Records", <RecordsLoading key="r" />],
  ["Accounts", <AccountsLoading key="a" />],
  ["Analysis", <AnalysisLoading key="n" />],
  ["Planning", <PlanningLoading key="p" />],
  ["Settings", <SettingsLoading key="s" />],
] as const;

export default function PreviewLoading() {
  return (
    <div className="flex flex-col">
      {SCREENS.map(([name, node]) => (
        <section key={name} className="border-b-4 border-primary">
          <p className="bg-primary px-4 py-1 text-xs text-primary-foreground uppercase">
            {name}
          </p>
          <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">{node}</div>
        </section>
      ))}
    </div>
  );
}
