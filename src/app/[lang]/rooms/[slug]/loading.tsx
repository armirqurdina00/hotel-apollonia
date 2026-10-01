import { RoomPageSkeleton } from "@/components/skeletons";

// Shown at once when a room is opened, while its prices and availability load.
export default function Loading() {
  return <RoomPageSkeleton />;
}
