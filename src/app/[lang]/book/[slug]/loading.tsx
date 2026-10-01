import { CheckoutSkeleton } from "@/components/skeletons";

// Shown at once after "Book this room", while the stay is checked and priced.
export default function Loading() {
  return <CheckoutSkeleton />;
}
