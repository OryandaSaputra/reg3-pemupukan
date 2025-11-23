// NO "use client" di file ini
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/login");
}
