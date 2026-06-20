import EntryExperience from "@/components/EntryExperience";
import { getSafeNextPath } from "@/lib/routeAccess";

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: Readonly<LoginPageProps>) {
  const params = await searchParams;
  const requestedNext = Array.isArray(params.next) ? params.next[0] : params.next;

  return <EntryExperience nextPath={getSafeNextPath(requestedNext)} />;
}
