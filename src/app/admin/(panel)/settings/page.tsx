import { getAdminI18n, requireAdmin } from "@/lib/admin";
import { DEFAULT_IMAGES, getSiteSettings } from "@/lib/settings";
import { listPhotos } from "@/lib/photos";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";

export async function generateMetadata() {
  const { t } = await getAdminI18n();
  return { title: t.settings.title };
}
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();
  const { t } = await getAdminI18n();
  const [{ contact, images }, photos] = await Promise.all([getSiteSettings(), listPhotos()]);
  return (
    <div className="max-w-5xl">
      <h1 className="text-4xl">{t.settings.title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{t.settings.lead}</p>
      <SiteSettingsForm contact={contact} images={images} defaults={DEFAULT_IMAGES} photos={photos} />
    </div>
  );
}
