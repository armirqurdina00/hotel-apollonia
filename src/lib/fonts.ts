import { Hanken_Grotesk, Marcellus } from "next/font/google";

/** Marcellus is modelled on Roman inscriptions, like the lettering in the hotel's logo. */
export const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-marcellus",
  display: "swap",
});

export const hanken = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-hanken",
  display: "swap",
});
