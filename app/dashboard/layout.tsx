import DashboardChrome from "@/components/admin/DashboardChrome"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardChrome>{children}</DashboardChrome>
}