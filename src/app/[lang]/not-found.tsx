import Link from "next/link";
import en from "@/i18n/en";

// not-found receives no params, so it shows English; the header and footer
// around it are still in the visitor's language.
export default function NotFound() {
  return (
    <div className="wrap pt-20 prose-measure">
      <h1 className="text-4xl sm:text-5xl">{en.notFound.title}</h1>
      <p className="mt-4 text-muted">{en.notFound.lead}</p>
      <Link href="/" className="btn btn-primary mt-8">
        {en.notFound.home}
      </Link>
    </div>
  );
}
