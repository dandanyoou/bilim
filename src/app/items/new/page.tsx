import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ItemForm } from "@/components/items/ItemForm";

export default async function NewItemPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold text-ink">물품 등록</h1>
      <ItemForm />
    </div>
  );
}
