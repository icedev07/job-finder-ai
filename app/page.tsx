import { redirect } from "next/navigation";

// The job list now lives in the admin (/admin/jobs), behind the sign-in.
export default function Home() {
  redirect("/admin/jobs");
}
