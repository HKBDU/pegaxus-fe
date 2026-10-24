import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
export function InfoBlock({
  title,
  data,
}: {
  title: string;
  data?: Record<string, unknown>;
}) {
  const entries = Object.entries(data ?? {}).filter(
    ([, value]) => value !== null && value !== undefined,
  );
  return (
    <Card className="rounded-[2px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2 sm:grid-cols-2">
          {entries.length ? (
            entries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {key.replaceAll(/([A-Z])/g, " $1")}
                </dt>
                <dd className="break-words text-sm text-slate-800">
                  {typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
                </dd>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No records available.</p>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
