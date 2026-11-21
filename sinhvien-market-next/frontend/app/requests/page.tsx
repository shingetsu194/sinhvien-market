import { redirect } from "next/navigation";

// The prototype REQUEST page (with a model picker) is retired: students post
// needs from the AI search box on /products ("Lưu nhu cầu"); model comparison
// lives in the admin page "So sánh mô hình AI".
export default function RequestsRedirect() {
  redirect("/products");
}
