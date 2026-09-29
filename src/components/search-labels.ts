import type { Dictionary } from "@/i18n";
import type { SearchLabels } from "./search-panel";

export function searchLabels(t: Dictionary, submit = t.search.submit): SearchLabels {
  return {
    checkIn: t.search.checkIn,
    checkOut: t.search.checkOut,
    adults: t.search.adults,
    children: t.search.children,
    rooms: t.search.rooms,
    submit,
    nights: t.search.nights,
    directPerk: t.search.directPerk,
    pickCheckIn: t.search.pickCheckIn,
    pickCheckOut: t.search.pickCheckOut,
    clear: t.search.clear,
    done: t.search.done,
    placeholder: t.search.placeholder,
  };
}

export function formLabels(t: Dictionary, sent: string) {
  return {
    name: t.forms.name,
    phone: t.forms.phone,
    emailOptional: t.forms.emailOptional,
    date: t.forms.date,
    time: t.forms.time,
    people: t.forms.people,
    message: t.forms.message,
    send: t.forms.send,
    sending: t.forms.sending,
    sent,
    pickDate: t.forms.pickDate,
    pickTime: t.forms.pickTime,
    errors: t.errors as Record<string, string>,
  };
}
