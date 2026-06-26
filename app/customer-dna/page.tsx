import { CustomerDnaTable } from "@/components/customer-dna/CustomerDnaTable";
import { h1Style, pageStyle } from "@/components/ui/layoutStyles";
import { getCustomerDnaPageData } from "@/lib/domain/customerDna/customerDnaQueries";
import { getServerLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/dictionaries";
import {
  createCustomerDna,
  deleteCustomerDna,
  updateCustomerDna,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function CustomerDnaPage() {
  const locale = await getServerLocale();
  const data = await getCustomerDnaPageData();

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "customerDna.title")}</h1>
      <CustomerDnaTable
        items={data.items}
        projects={data.projects}
        users={data.users}
        createCustomerDna={createCustomerDna}
        updateCustomerDna={updateCustomerDna}
        deleteCustomerDna={deleteCustomerDna}
      />
    </main>
  );
}
