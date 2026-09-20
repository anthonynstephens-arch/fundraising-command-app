"use client";
import { isDmdOrganization } from "@/lib/branding/dmd";
import {
  CampaignStorefront as BaseStore,
  StorefrontProductPage as BaseProduct,
} from "./BaseStorefront";
import type { Campaign } from "./BaseStorefront";
import type { StoreProduct } from "@/lib/public/storefront";
import dynamic from "next/dynamic";
const DmdStorefront = dynamic(() => import("./DmdStorefront").then(module => module.DmdStorefront));
export function CampaignStorefront({ campaign }: { campaign: Campaign }) {
  return isDmdOrganization(campaign.organization) ? (
    <DmdStorefront key={campaign.id} campaign={campaign} />
  ) : (
    <BaseStore campaign={campaign} />
  );
}
export function StorefrontProductPage({
  campaign,
  product,
}: {
  campaign: Campaign;
  product: StoreProduct;
}) {
  return isDmdOrganization(campaign.organization) ? (
    <DmdStorefront key={campaign.id} campaign={campaign} product={product} />
  ) : (
    <BaseProduct campaign={campaign} product={product} />
  );
}
