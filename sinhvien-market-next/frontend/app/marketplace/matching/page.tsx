import { redirect } from "next/navigation";

// The separate "Ghép nối" page was merged into the AI search box on /products;
// old links and bookmarks land there instead of on a second, older search.
export default function MarketplaceMatchingRedirect() {
  redirect("/products");
}
